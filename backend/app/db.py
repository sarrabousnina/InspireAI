# backend/app/db.py
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load .env that sits next to this file (backend/app/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing in backend/app/.env")

# Global engine (connection pool)
ENGINE = create_engine(DATABASE_URL, future=True)

def init_db() -> None:
    """Create required extensions/tables if they don't exist."""
    with ENGINE.begin() as c:
        # UUID generator for primary keys
        c.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        # Main table for the Library page
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
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """))
