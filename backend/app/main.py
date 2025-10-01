# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from sqlalchemy import text
from dotenv import load_dotenv
import os

# --- DB helpers ---
from .db import ENGINE, init_db

# --- Groq LLM client ---
from groq import Groq

# Load env near this file (GROQ keys, model names, DB URL already loaded in db.py)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="InspireAI API", version="1.0.0")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Groq config ----
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama-3.1-8b-instant")
BLOG_MODEL = os.getenv("BLOG_MODEL", "llama-3.1-70b-versatile")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ---- Startup: ensure DB schema exists ----
@app.on_event("startup")
def on_startup():
    init_db()

# ------------------- Schemas -------------------
class GenerateIn(BaseModel):
    prompt: str = Field(..., description="User idea or topic")
    platform: Literal["linkedin", "instagram", "facebook", "blog"] = "linkedin"
    tone: Literal["professional", "friendly", "witty", "persuasive"] = "professional"
    audience: Optional[str] = "SMBs / startups"
    word_count: int = 120
    mode: Literal["social", "blog"] = "social"
    temperature: float = 0.7

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
SYSTEM = "You are a helpful content writer. Be clear, on-brand, and practical. No fluff."

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
    created_at: datetime

# ------------------- Health / Diag -------------------
@app.get("/api/health")
def health():
    with ENGINE.begin() as c:
        c.execute(text("SELECT 1"))
    return {"ok": True, "has_groq_key": bool(GROQ_API_KEY)}

@app.get("/api/diag")
def diag():
    k = GROQ_API_KEY or ""
    return {"has_key": bool(k), "prefix": k[:4] if k else None, "len": len(k)}

# ------------------- Generate -------------------
@app.post("/api/generate")
def generate(data: GenerateIn):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not loaded")

    model = DEFAULT_MODEL if data.mode == "social" else BLOG_MODEL
    wc = max(60, min(data.word_count, 1200 if data.mode == "blog" else 220))
    base = PLAT_TEMPLATES["blog" if data.platform == "blog" else data.platform]
    user_prompt = base.format(wc=wc, topic=data.prompt, audience=data.audience, tone=data.tone)

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

# ------------------- Library CRUD -------------------
@app.get("/api/items")
def list_items(q: Optional[str] = None,
               platform: Optional[str] = None,
               tone: Optional[str] = None,
               page: int = 1,
               pageSize: int = 20):
    off = (page - 1) * pageSize
    where, params = [], {}
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
      SELECT id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, created_at
      FROM items
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT :lim OFFSET :off"

    with ENGINE.begin() as c:
        rows = c.execute(text(sql), {**params, "lim": pageSize, "off": off}).mappings().all()
    return {"items": rows}

# Register both forms to avoid trailing-slash issues for POST
@app.post("/api/items", response_model=Item)
@app.post("/api/items/", response_model=Item)
def create_item(body: ItemIn):
    with ENGINE.begin() as c:
        row = c.execute(text("""
          INSERT INTO items (title, content, platform, tone, mode, words, model, tags, pinned)
          VALUES (:title, :content, :platform, :tone, :mode, :words, :model, :tags, :pinned)
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, created_at
        """), body.model_dump()).mappings().first()
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
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, created_at
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
          INSERT INTO items (title, content, platform, tone, mode, words, model, tags, pinned)
          SELECT title, content, platform, tone, mode, words, model, tags, FALSE
          FROM items WHERE id = :id
          RETURNING id::text AS id, title, content, platform, tone, mode, words, model, tags, pinned, created_at
        """), {"id": id}).mappings().first()
    if not row:
        raise HTTPException(404, "Not found")
    return row
