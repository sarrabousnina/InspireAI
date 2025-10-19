# backend/agent.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from groq import Groq, GroqError

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

@router.post("/chat")
async def chat_with_agent(request: ChatRequest):
    if not client:
        raise HTTPException(status_code=500, detail="AI service not configured")

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful, friendly AI assistant for InspireAI. Answer conversationally and helpfully."
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ],
            temperature=0.7,
            max_tokens=1024,
            top_p=1,
            stream=False,
        )

        return {"response": completion.choices[0].message.content.strip()}
    
    except GroqError as e:
        print(f"❌ Groq API Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong")