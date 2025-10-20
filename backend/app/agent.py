# backend/app/agent.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import logging
from groq import Groq, GroqError
from sqlalchemy import text
from typing import List, Dict, Any

# Import auth and DB engine
from .auth import get_current_user
from .db import ENGINE

router = APIRouter(prefix="/agent", tags=["agent"])

class ChatRequest(BaseModel):
    message: str

# Initialize Groq client
client = None
try:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set in environment")
    client = Groq(api_key=GROQ_API_KEY)
except Exception as e:
    print(f"⚠️ Groq client initialization failed: {e}")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.options("/chat")
async def options_chat():
    return {"ok": True}

@router.post("/chat")
async def chat_with_agent(
    request: ChatRequest,
    user: dict = Depends(get_current_user)  # Secure JWT auth
):
    if not client:
        raise HTTPException(status_code=500, detail="AI service not configured")

    user_id = user["user_id"]
    logger.info(f"Agent called by user: {user_id}")

    # Detect greeting
    msg_lower = request.message.strip().lower()
    is_greeting = msg_lower in ["hi", "hello", "hey", "yo", "hola", "bonjour", "greetings"]

    blogs = []
    thinking_steps = []

    if not is_greeting:
        # ✅ Fetch ALL content for user (not just blogs)
        try:
            with ENGINE.begin() as conn:
                result = conn.execute(
                    text("""
                        SELECT id, title, content, created_at, mode
                        FROM items
                        WHERE user_id = CAST(:user_id AS UUID)
                        ORDER BY created_at DESC
                        LIMIT 5
                    """),
                    {"user_id": user_id}
                ).mappings().all()
                blogs = [dict(row) for row in result]
                logger.info(f"Fetched {len(blogs)} items for user {user_id}")
                thinking_steps.append(f"✅ Found {len(blogs)} recent item(s)")
        except Exception as e:
            logger.error(f"DB error fetching items: {e}")
            thinking_steps.append("⚠️ Could not load your content history")

    # Build context
    blog_context = ""
    if blogs:
        blog_context = "Your recent content:\n"
        for b in blogs:
            kind = "Blog" if b['mode'] == 'blog' else "Social post"
            title = b.get('title') or 'Untitled'
            preview = b['content'][:180].replace('\n', ' ').replace('"', '').replace("'", "")
            blog_context += f"- [{kind}] '{title}': {preview}...\n"
    else:
        blog_context = "You have no content yet."

    # System prompt with ReAct transparency
    system_msg = (
        "You are a helpful AI assistant for InspireAI. "
        "Be transparent: show reasoning before final answer. Format:\n"
        "🤔 [thought]\n🔍 [action]\n✅ Final Answer: [...]\n\n"
    )

    if is_greeting:
        system_msg += "This is a greeting. Respond briefly and warmly. Do not mention content."
    else:
        system_msg += f"Use this context:\n{blog_context}"

    # Generate response
    try:
        completion = client.chat.completions.create(
            model=os.getenv("DEFAULT_MODEL", "llama-3.1-8b-instant"),
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
            max_tokens=1024,
            timeout=30,
        )

        raw = completion.choices[0].message.content.strip()

        if is_greeting:
            if "✅ Final Answer:" in raw:
                response = raw.split("✅ Final Answer:")[1].strip()
            else:
                response = raw
        else:
            response = "\n".join(thinking_steps) + "\n\n" + raw

        return {"response": response}

    except Exception as e:
        logger.error(f"Agent LLM error: {e}")
        raise HTTPException(status_code=500, detail="Agent failed")