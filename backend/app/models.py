from sqlalchemy import Column, Integer, String, DateTime, Text, ARRAY, Boolean
from sqlalchemy.sql import func
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=func.now())

    def verify_password(self, pwd):
        return auth.verify_password(pwd, self.hashed_password)

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    content = Column(Text)  # Use Text for longer content
    platform = Column(String)  # e.g., "linkedin", "instagram"
    tone = Column(String)      # e.g., "professional", "friendly"
    mode = Column(String)      # e.g., "social", "blog"
    words = Column(Integer)
    model = Column(String, nullable=True)
    tags = Column(String)      # Store as JSON string or use postgres JSONB
    pinned = Column(Boolean, default=False)
    user_id = Column(Integer, nullable=False)  # This was missing!
    created_at = Column(DateTime, default=func.now())