# backend/app/routes/images.py
"""
Image analysis endpoints for Inspire AI (OpenRouter Vision).
- Accepts an image upload (multipart/form-data)
- Sends it to a vision model via OpenRouter
- Returns structured { caption, tags[] } JSON for your generator

Env required:
  OPENROUTER_API_KEY=or-xxxxxxxx
Optional:
  OPENROUTER_VISION_MODEL=qwen/qwen2.5-vl-72b-instruct:free
  OPENROUTER_REFERER=https://inspire-ai.local
  OPENROUTER_APP_TITLE=Inspire AI
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List
from PIL import Image, UnidentifiedImageError
import io
import os
import base64
import imghdr
import json
import requests

router = APIRouter(prefix="/api/images", tags=["images"])

# ---------- Models ----------

class AnalysisResp(BaseModel):
    caption: str = Field("", description="Short human caption (<= 20 words)")
    tags: List[str] = Field(default_factory=list, description="3–8 lowercase tags without #")
    model: str = Field(..., description="Vision model used")


# ---------- Helpers ----------

def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise HTTPException(status_code=500, detail=f"Missing environment variable: {name}")
    return v

def _validate_and_open_image(raw: bytes) -> None:
    """Validate the image quickly (format + basic decode)."""
    # Fast header check
    kind = imghdr.what(None, raw)
    if kind not in {"png", "jpeg", "gif", "bmp", "tiff", "webp"}:
        # allow some types even if imghdr fails; PIL will decide
        pass
    # Try decoding with PIL (raises if bad/corrupted)
    try:
        Image.open(io.BytesIO(raw)).verify()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Unsupported or corrupted image.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

def _to_data_url(image_bytes: bytes, filename: str | None) -> str:
    ext = (filename or "image.png").split(".")[-1].lower()
    kind = imghdr.what(None, image_bytes) or ext or "png"
    if kind in ("jpg", "jpeg"):
        kind = "jpeg"
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/{kind};base64,{b64}"

def _call_openrouter_vision(data_url: str) -> dict:
    api_key = _require_env("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_VISION_MODEL", "qwen/qwen2.5-vl-72b-instruct:free")
    referer = os.getenv("OPENROUTER_REFERER", "https://inspire-ai.local")
    app_title = os.getenv("OPENROUTER_APP_TITLE", "Inspire AI")

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # (Optional but recommended) helps with routing/quotas
        "HTTP-Referer": referer,
        "X-Title": app_title,
    }
    body = {
        "model": model,
        "messages": [{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "You are a vision assistant. Analyze the image and respond ONLY as JSON with:\n"
                        '{ "caption": "<<=20 words>", "tags": ["tag1","tag2","tag3"] }\n'
                        "- caption: concise, natural, NO line breaks, NO quotes.\n"
                        "- tags: 3-8 lowercase single-word hints, NO '#', NO spaces inside a tag."
                    )
                },
                { "type": "image_url", "image_url": { "url": data_url } },
            ],
        }],
        "temperature": 0.2,
        "max_tokens": 200,
        "response_format": {"type": "json_object"},
    }

    try:
        resp = requests.post(url, headers=headers, data=json.dumps(body), timeout=60)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter network error: {e}")

    if resp.status_code != 200:
        # Bubble up OpenRouter's error body for easier debugging
        raise HTTPException(status_code=502, detail=f"OpenRouter error: {resp.text}")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Malformed OpenRouter response.")

    # Should already be JSON due to response_format, but guard anyway
    try:
        parsed = json.loads(content)
    except Exception:
        parsed = {"caption": content.strip(), "tags": []}

    # Normalize
    caption = (parsed.get("caption") or "").strip()
    tags = parsed.get("tags") or []
    # sanitize tags (lowercase, no #, no spaces)
    norm_tags = []
    for t in tags:
        if not isinstance(t, str):
            continue
        t2 = t.strip().lower().replace("#", "")
        if " " in t2 or not t2:
            continue
        if t2 not in norm_tags:
            norm_tags.append(t2)
    # keep 3–8 if possible
    if len(norm_tags) < 3 and caption:
        # fallback: derive a few naive tags from caption words
        for w in caption.lower().replace(",", " ").split():
            w = "".join(ch for ch in w if ch.isalnum())
            if len(w) >= 3 and w not in norm_tags:
                norm_tags.append(w)
            if len(norm_tags) >= 5:
                break

    return {
        "caption": caption[:200].strip(),
        "tags": norm_tags[:8],
        "model": model,
    }


# ---------- Routes ----------

@router.post("/analyze", response_model=AnalysisResp)
async def analyze_image(file: UploadFile = File(...)):
    """
    Upload one image (form-data 'file') and get a caption + tags from a Vision model.
    Returns: { caption, tags[], model }
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    raw = await file.read()
    if len(raw) > 12 * 1024 * 1024:  # 12MB limit (adjust as needed)
        raise HTTPException(status_code=413, detail="Image too large (limit 12 MB).")

    _validate_and_open_image(raw)
    data_url = _to_data_url(raw, file.filename)

    vision_result = _call_openrouter_vision(data_url)

    return AnalysisResp(
        caption=vision_result["caption"],
        tags=vision_result["tags"],
        model=vision_result["model"],
    )
