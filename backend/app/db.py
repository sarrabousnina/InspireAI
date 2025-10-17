# backend/app/db.py
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load .env from backend/app/.env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing in backend/app/.env")

# Global engine and sessionmaker (pooling enabled by default)
ENGINE = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=ENGINE, autocommit=False, autoflush=False)

def init_db() -> None:
    """Create required extensions/tables if they don't exist."""
    with ENGINE.begin() as c:
        # PostgreSQL UUID support
        c.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        
        # Users table for JWT auth
        c.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """))
        
        # Items table for Library page
        c.execute(text("""
        CREATE TABLE IF NOT EXISTS items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT,
            content TEXT NOT NULL,
            platform TEXT NOT NULL,
            tone TEXT NOT NULL,
            mode TEXT NOT NULL,
            words INT NOT NULL,
            model TEXT,
            tags TEXT[] NOT NULL DEFAULT '{}',
            pinned BOOLEAN NOT NULL DEFAULT FALSE,
            user_id UUID NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """))
        
        # Images table for vision analysis attached to posts
        c.execute(text("""
        CREATE TABLE IF NOT EXISTS images (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            item_id UUID NOT NULL,
            url TEXT,
            caption TEXT NOT NULL,
            tags TEXT[] NOT NULL DEFAULT '{}',
            model TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );
        """))