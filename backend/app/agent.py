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

    items = []
    thinking_steps = []

    if not is_greeting:
        # ✅ Fetch ALL content for user (social + blog), PostgreSQL-safe
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
                    {"user_id": user_id}  # plain string
                ).mappings().all()
                items = [dict(row) for row in result]
                logger.info(f"Fetched {len(items)} items for user {user_id}")
                thinking_steps.append(f"✅ Found {len(items)} recent item(s)")
        except Exception as e:
            logger.error(f"DB error fetching items: {e}")
            thinking_steps.append("⚠️ Could not load your content history")

    # Build clean plain-text context (no Markdown)
    content_context = ""
    if items:
        content_context = "📝 Here's what you've written recently:\n\n"
        for i, item in enumerate(items, 1):
            kind = "Blog" if item['mode'] == 'blog' else "Social Post"
            title = item.get('title') or 'Untitled'
            preview = item['content'][:200].replace('\n', ' ').replace('"', '').replace("'", "")
            content_context += (
                f"{i}. {title}\n"
                f"   Type: {kind}\n"
                f"   Preview: {preview}...\n"
            )
            if item.get('created_at'):
                try:
                    date_str = item['created_at'].strftime('%b %d, %Y at %I:%M %p')
                    content_context += f"   Created: {date_str}\n"
                except:
                    pass
            content_context += "\n"
    else:
        content_context = "You haven't written anything yet. Start creating content to see it here!"

    # System prompt with ReAct transparency
    system_msg = (
        "You are a helpful AI assistant for InspireAI. "
        "Be transparent: show your reasoning before your final answer. Format:\n"
        "🤔 [Your internal thought]\n"
        "🔍 [Any action taken]\n"
        "✅ Final Answer: [Your helpful response]\n\n"
    )

    if is_greeting:
        system_msg += "This is a greeting. Respond briefly and warmly. Do not mention content."
    else:
        system_msg += f"Use this context:\n{content_context}"

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

        # Split thinking steps from final answer
        if "✅ Final Answer:" in raw:
            parts = raw.split("✅ Final Answer:", 1)
            thinking_part = parts[0].strip()
            final_answer = parts[1].strip()
        else:
            thinking_part = raw
            final_answer = ""

        # Return both parts separately
        return {
            "thinking": thinking_part,
            "final_answer": final_answer
        }

    except Exception as e:
        logger.error(f"Agent LLM error: {e}")
        raise HTTPException(status_code=500, detail="Agent failed")