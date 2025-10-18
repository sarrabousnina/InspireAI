# backend/app/agent.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import os
from groq import Groq

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from dotenv import load_dotenv
from passlib.context import CryptContext
from fastapi.staticfiles import StaticFiles
# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")
# --- Environment ---
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
SECRET_KEY = os.getenv("SECRET_KEY", "changeme")  # Set in backend/app/.env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
        # ✅ Return token too!
        return {"user_id": user_id, "token": token}
    except JWTError:
        raise credentials_exception

router = APIRouter()

# === GROQ SETUP ===
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)

class AgentRequest(BaseModel):
    message: str
    last_item_id: Optional[str] = None

class AgentResponse(BaseModel):
    response: str
    last_item_id: Optional[str] = None

def generate_with_groq(prompt: str, model: str = "llama-3.1-70b-versatile"):
    completion = groq_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
        stream=False,
    )
    return completion.choices[0].message.content.strip()

@router.post("/chat", response_model=AgentResponse)
def agent_chat(
    request: AgentRequest,
    current_user: dict = Depends(get_current_user),
):
    query = request.message.strip().lower()

    # === FIND INTENT ===
    if any(word in query for word in ["find", "show me", "search", "look for"]):
        search_text = query.replace("find", "").replace("show me", "").replace("search", "").replace("look for", "").strip()
        if not search_text:
            return AgentResponse(response="What would you like to find? Try: 'Find my post about AI'")

        try:
            resp = httpx.get(
                "http://localhost:8000/api/items",
                params={"q": search_text},
                headers={"Authorization": f"Bearer {current_user['token']}"}
            )
            if resp.status_code != 200:
                return AgentResponse(response="Sorry, I couldn’t access your content right now.")
            items = resp.json().get("items", [])
        except Exception as e:
            return AgentResponse(response="Sorry, I couldn’t access your content right now.")

        if not items:
            return AgentResponse(response="I couldn’t find any matching content in your history.")

        snippets = []
        last_id = None
        for item in items[:2]:
            snippet = f"📄 \"{item['content'][:100]}...\""
            snippets.append(snippet)
            last_id = item["id"]
        reply = "\n".join(snippets) + "\n\n✅ Say 'Use that to write a tweet' to reuse it!"
        return AgentResponse(response=reply, last_item_id=last_id)

    # === REUSE INTENT ===
    elif any(word in query for word in ["use that", "turn this", "make a", "create a"]):
        if not request.last_item_id:
            return AgentResponse(response="I don't know which content you're referring to. Please search first.")

        # Fetch the specific item
        try:
            resp = httpx.get(
                f"http://localhost:8000/api/items",
                params={"q": request.last_item_id},
                headers={"Authorization": f"Bearer {current_user['token']}"}
            )
            items = resp.json().get("items", [])
            item = next((i for i in items if i["id"] == request.last_item_id), None)
            if not item:
                raise HTTPException(status_code=404, detail="Item not found")
            original_text = item["content"]
        except Exception:
            return AgentResponse(response="Sorry, I couldn’t load that content.")

        # Determine platform
        platform = "any"
        if "tweet" in query or "twitter" in query:
            platform = "twitter"
            instruction = "Create a short, engaging tweet (max 240 characters) based on this text:"
        elif "linkedin" in query:
            platform = "linkedin"
            instruction = "Write a professional LinkedIn post based on this:"
        elif "instagram" in query:
            platform = "instagram"
            instruction = "Write a short Instagram caption (max 150 chars) with 1-2 emojis based on this:"
        elif "blog" in query:
            platform = "blog"
            instruction = "Expand this into a short blog draft (150-200 words):"
        else:
            instruction = "Rewrite this as a new piece of content:"

        prompt = f"""
You are an AI content assistant. Your job is to help users reuse their past content.

User’s request: "{query}"

Original text to reuse:
"{original_text}"

Instructions:
- Return ONLY the generated content.
- Do NOT add explanations, headers, or markdown.
- Keep tone neutral unless specified.
- For tweets: max 240 chars, include 1 emoji if natural.
- For LinkedIn: professional, 1-2 sentences, end with a question.
- For Instagram: short, punchy, 1-2 emojis.
- For blogs: expand to 150-200 words, use subheadings if needed.

Generated content:
"""
        try:
            rewritten = generate_with_groq(prompt)
        except Exception:
            return AgentResponse(response="Sorry, I couldn't generate that right now.")

        # Save new item via API
        try:
            new_item_data = {
                "content": rewritten,
                "platform": platform,
                "tone": "professional",
                "mode": "social" if platform in ["twitter", "linkedin", "instagram"] else "blog",
                "words": len(rewritten.split()),
                "tags": [],
                "pinned": False
            }
            httpx.post(
                "http://localhost:8000/api/items",
                json=new_item_data,
                headers={"Authorization": f"Bearer {current_user['token']}"}
            )
        except Exception:
            pass  # optional: log error

        return AgentResponse(
            response=f"✅ Done!\n\n{rewritten}\n\nSaved to your library.",
            last_item_id=None
        )

    # === FALLBACK ===
    else:
        return AgentResponse(response="I can help you find or reuse your past content. Try: 'Find my post about AI' or 'Turn that into a tweet'.")