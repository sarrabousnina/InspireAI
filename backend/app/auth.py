# backend/app/auth.py
from jose import jwt as jose_jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
import os
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from google.auth import jwt as google_jwt
from google.auth.transport import requests as google_requests

from .db import SessionLocal
from . import models  # ← Make sure you have a User model

# --- Existing auth utilities ---
SECRET_KEY = os.getenv("JWT_SECRET")  # Match your .env key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    return jose_jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# --- New: Google Sign-In utilities ---
def verify_google_token(id_token: str) -> dict:
    """Verify Google ID token and return user info."""
    try:
        request = google_requests.Request()
        id_info = google_jwt.verify_oauth2_token(
            id_token,
            request,
            audience=os.getenv("GOOGLE_CLIENT_ID")
        )

        # Verify issuer
        if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid issuer")

        # Return verified claims
        return {
            "email": id_info["email"],
            "name": id_info.get("name", ""),
            "picture": id_info.get("picture", ""),
            "email_verified": id_info.get("email_verified", False)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid Google token")

def get_or_create_google_user(db: Session, email: str, name: str = "", picture: str = "") -> models.User:
    """Find existing user or create new one from Google profile."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create new user (no password needed for Google users)
        user = models.User(
            email=email,
            username=email.split("@")[0],  # or generate unique username
            full_name=name,
            avatar_url=picture,
            is_google_user=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Optionally update name/picture on every login
        updated = False
        if name and user.full_name != name:
            user.full_name = name
            updated = True
        if picture and user.avatar_url != picture:
            user.avatar_url = picture
            updated = True
        if updated:
            db.commit()
    return user

# --- JWT auth dependency ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        return {"user_id": user_id, "token": token}
    except JWTError:
        raise credentials_exception

# --- DB session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

