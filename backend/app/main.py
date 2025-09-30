from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional
from groq import Groq
from dotenv import load_dotenv
import os

# --- Load env sitting next to this file ---
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# --- Create FastAPI app *before* any route decorators ---
app = FastAPI(title="InspireAI API")

# --- CORS for Vite dev server ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients & config ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama-3.1-8b-instant")
BLOG_MODEL = os.getenv("BLOG_MODEL", "llama-3.1-70b-versatile")

if not GROQ_API_KEY:
    # Fail loud at startup if key missing
    print("⚠️  GROQ_API_KEY not found in backend/app/.env or env vars.")
client = Groq(api_key=GROQ_API_KEY)

# ---- Schemas & templates ----
class GenerateIn(BaseModel):
    prompt: str = Field(..., description="User idea or topic")
    platform: Literal["linkedin", "instagram", "facebook", "blog"] = "linkedin"
    tone: Literal["professional", "friendly", "witty", "persuasive"] = "professional"
    audience: Optional[str] = "SMBs / startups"
    word_count: int = 120
    mode: Literal["social", "blog"] = "social"   # picks model
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

# ---- Routes ----
@app.get("/api/health")
def health():
    return {"ok": True, "model": DEFAULT_MODEL, "has_key": bool(GROQ_API_KEY)}

@app.get("/api/diag")
def diag():
    k = GROQ_API_KEY or ""
    return {"has_key": bool(k), "prefix": k[:4] if k else None, "len": len(k)}

@app.post("/api/generate")
def generate(data: GenerateIn):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not loaded")

    model = DEFAULT_MODEL if data.mode == "social" else BLOG_MODEL
    wc = max(60, min(data.word_count, 1200 if data.mode == "blog" else 220))
    base = PLAT_TEMPLATES["blog" if data.platform == "blog" else data.platform]
    user_prompt = base.format(wc=wc, topic=data.prompt, audience=data.audience, tone=data.tone)

    resp = client.chat.completions.create(
        model=model,
        temperature=data.temperature if data.mode == "social" else 0.6,
        max_tokens=1400 if data.mode == "blog" else 500,
        messages=[{"role": "system", "content": SYSTEM},
                  {"role": "user", "content": user_prompt}],
    )
    return {"platform": data.platform, "mode": data.mode,
            "result": resp.choices[0].message.content.strip()}
