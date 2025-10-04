import os
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from jose import jwt, JWTError
from passlib.context import CryptContext
from . import images
import json

# --- DB helpers ---
from .db import ENGINE, SessionLocal, init_db

# --- Groq LLM client ---
from groq import Groq

# --- Environment ---
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SECRET_KEY = os.getenv("SECRET_KEY", "changeme")  # Set in backend/app/.env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="InspireAI API", version="1.0.0")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Groq config ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama-3.1-8b-instant")
BLOG_MODEL = os.getenv("BLOG_MODEL", "llama-3.1-70b-versatile")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# --- Startup: ensure DB schema exists ---
@app.on_event("startup")
def on_startup():
    init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --------- JWT User Dependency ---------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        return {"user_id": user_id, "username": payload.get("sub")}
    except JWTError:
        raise credentials_exception

# ------------------- Schemas -------------------
class GenerateIn(BaseModel):
    prompt: str = Field(..., description="User idea or topic")
    platform: Literal["linkedin", "instagram", "facebook", "blog"] = "linkedin"
    tone: Literal["professional", "friendly", "witty", "persuasive"] = "professional"
    audience: Optional[str] = "SMBs / startups"
    word_count: int = 120
    mode: Literal["social", "blog"] = "social"
    temperature: float = 0.7
    image_captions: Optional[List[str]] = None
    image_tags: Optional[List[List[str]]] = None

PLAT_TEMPLATES = {
    "linkedin": """Write a LinkedIn post ({wc} words) about: {topic}.
Audience: {audience}. Tone: {tone}.
Use max 3 short paragraphs and one bullet list (3 bullets). End with a single CTA.""",
    "instagram": """Write an Instagram caption ({wc} words) about: {topic}.
Audience: {audience}. Tone: {tone}. Use 1–2 relevant emojis and 3–5 hashtags at end.""",
    "facebook": """Write a Facebook post ({wc} words) about: {topic}.
Audience: {audience}. Tone: {tone}. Use 1–2 short paragraphs and 2 concise bullets. End with a question.""",
    "blog": """Write a blog draft (~{wc} words) about: {topic}.
Audience: {audience}. Tone: {tone}. Use H2/H3 headings, short paragraphs, and a 4-item checklist at the end."""
}
SYSTEM = "You are a helpful content writer. Be clear, on-brand, and practical. No fluff. Be short and concise. And use creative hooks."

class ItemIn(BaseModel):
    title: Optional[str] = None
    content: str
    platform: Literal["linkedin", "instagram", "facebook", "blog"]
    tone: Literal["professional", "friendly", "witty", "persuasive"]
    mode: Literal["social", "blog"]
    words: int
    model: Optional[str] = None
    tags: List[str] = []
    pinned: bool = False

class Item(ItemIn):
    id: str
    user_id: str
    created_at: datetime

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- image routes ---
app.include_router(images.router)

@app.get("/api/health")
def health():
    with ENGINE.begin() as c:
        c.execute(text("SELECT 1"))
    return {"ok": True, "has_groq_key": bool(GROQ_API_KEY)}

@app.get("/api/diag")
def diag():
    k = GROQ_API_KEY or ""
    return {"has_key": bool(k), "prefix": k[:4] if k else None, "len": len(k)}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/api/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    result = db.execute(
        text("SELECT id, username, hashed_password FROM users WHERE username = :u"),
        {"u": user.username}
    ).first()
    if not result or not verify_password(user.password, result.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": result.username, "user_id": str(result.id)})
    return {"access_token": token, "token_type": "bearer", "user_id": str(result.id)}  # <-- includes user_id!


import traceback

@app.post("/api/register")
def register(user: UserLogin, db: Session = Depends(get_db)):
    hashed = pwd_context.hash(user.password)
    try:
        row = db.execute(
            text("""
                INSERT INTO users (username, hashed_password)
                VALUES (:u, :h)
                RETURNING id, username, created_at
            """),
            {"u": user.username, "h": hashed}
        ).first()
        db.commit()
        return {"id": row.id, "username": row.username, "created_at": row.created_at}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/generate")
def generate(data: GenerateIn):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not loaded")
    model = DEFAULT_MODEL if data.mode == "social" else BLOG_MODEL
    wc = max(60, min(data.word_count, 1200 if data.mode == "blog" else 220))
    base = PLAT_TEMPLATES["blog" if data.platform == "blog" else data.platform]
    topic = data.prompt.strip()
    if data.image_captions and any(data.image_captions):
        captions_text = "\n".join([f"- {c}" for c in data.image_captions if c])
        topic += f"\n\nImages provided show:\n{captions_text}"
    if data.image_tags and any(data.image_tags):
        flat_tags = []
        for arr in data.image_tags:
            if not arr:
                continue
            flat_tags.extend(arr)
        tag_set = sorted({t.strip().lower() for t in flat_tags if t})
        if tag_set:
            topic += f"\n\nRelevant tags: {', '.join(tag_set)}"
    print(">>> Received prompt:", data.prompt)
    print(">>> Captions:", data.image_captions)
    print(">>> Tags:", data.image_tags)
    user_prompt = base.format(
        wc=wc,
        topic=topic,
        audience=data.audience,
        tone=data.tone
    )
    resp = client.chat.completions.create(
        model=model,
        temperature=data.temperature if data.mode == "social" else 0.6,
        max_tokens=1400 if data.mode == "blog" else 500,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user_prompt},
        ],
    )
    return {
        "platform": data.platform,
        "mode": data.mode,
        "result": resp.choices[0].message.content.strip(),
    }

@app.get("/api/items")
def list_items(q: Optional[str] = None,
               platform: Optional[str] = None,
               tone: Optional[str] = None,
               page: int = 1,
               pageSize: int = 20,
               user_id: Optional[str] = None):  # <-- add user_id param
    off = (page - 1) * pageSize
    where, params = [], {}
    if user_id:  # <-- add this filter
        where.append("user_id = :user_id")
        params["user_id"] = user_id
    if q:
        where.append("(title ILIKE :q OR content ILIKE :q)")
        params["q"] = f"%{q}%"
    if platform and platform != "all":
        where.append("platform = :platform")
        params["platform"] = platform
    if tone and tone != "all":
        where.append("tone = :tone")
        params["tone"] = tone
    sql = """
      SELECT id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, user_id, created_at
      FROM items
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT :lim OFFSET :off"
    with ENGINE.begin() as c:
        rows = c.execute(text(sql), {**params, "lim": pageSize, "off": off}).mappings().all()
    return {"items": rows}

@app.post("/api/items", response_model=Item)
@app.post("/api/items/", response_model=Item)
def create_item(body: ItemIn, user: dict = Depends(get_current_user)):
    if hasattr(body, "model_dump"):
        payload = body.model_dump()
    else:
        payload = body.dict()
    tags_val = payload.get("tags") or []
    if isinstance(tags_val, str):
        try:
            tags_val = json.loads(tags_val)
        except Exception:
            tags_val = [tags_val]
    if not isinstance(tags_val, (list, tuple)):
        tags_val = [str(tags_val)]
    payload["tags"] = tags_val  # Pass as a Python list, NOT a string!
    payload["user_id"] = user["user_id"]
    with ENGINE.begin() as c:
        row = c.execute(text("""
          INSERT INTO items (title, content, platform, tone, mode, words, model, tags, pinned, user_id)
          VALUES (:title, :content, :platform, :tone, :mode, :words, :model, :tags, :pinned, :user_id)
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, user_id, created_at
        """), payload).mappings().first()
    if row:
        rt = row.get("tags")
        if isinstance(rt, str):
            try:
                rt = json.loads(rt)
            except Exception:
                rt = [rt] if rt else []
        user_id_val = row.get("user_id")
        # Ensure tags is always a list and user_id is always a string for the response schema
        row = {**row, "tags": rt or [], "user_id": str(user_id_val) if user_id_val is not None else None}
    return row

@app.patch("/api/items/{id}", response_model=Item)
def update_item(id: str, body: Dict[str, Any]):
    allowed = {k: v for k, v in body.items() if k in {"title", "content", "tags", "pinned"}}
    if not allowed:
        raise HTTPException(400, "Nothing to update")
    sets = ", ".join([f"{k} = :{k}" for k in allowed])
    with ENGINE.begin() as c:
        row = c.execute(text(f"""
          UPDATE items SET {sets}
          WHERE id = :id
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, user_id, created_at
        """), {**allowed, "id": id}).mappings().first()
    if not row:
        raise HTTPException(404, "Not found")
    return row

@app.delete("/api/items/{id}")
def delete_item(id: str):
    with ENGINE.begin() as c:
        res = c.execute(text("DELETE FROM items WHERE id = :id"), {"id": id})
    if res.rowcount == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@app.post("/api/items/{id}/duplicate", response_model=Item)
def duplicate_item(id: str):
    with ENGINE.begin() as c:
        row = c.execute(text("""
          INSERT INTO items (title, content, platform, tone, mode, words, model, tags, pinned, user_id)
          SELECT title, content, platform, tone, mode, words, model, tags, FALSE, user_id
          FROM items WHERE id = :id
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, user_id, created_at
        """), {"id": id}).mappings().first()
    if not row:
        raise HTTPException(404, "Not found")
    return row
