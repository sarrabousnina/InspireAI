# backend/app/routes/images.py
"""
Image endpoints for Inspire AI:
- Vision analysis via OpenRouter:  POST /api/images/analyze
- Attach analysis to a post (DB):  POST /api/images/attach/{item_id}
- List images for a post (DB):     GET  /api/images/by-item/{item_id}

Env required:
  OPENROUTER_API_KEY=or-xxxxxxxx
Optional:
  OPENROUTER_VISION_MODEL=qwen/qwen2.5-vl-72b-instruct:free
  OPENROUTER_REFERER=https://inspire-ai.local    
  OPENROUTER_APP_TITLE=Inspire AI
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from PIL import Image, UnidentifiedImageError
from sqlalchemy import text
from .db import ENGINE

import io
import os
import base64
import imghdr
import json
import requests

router = APIRouter(prefix="/api/images", tags=["images"])

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

# ---------- Models ----------

class AnalysisResp(BaseModel):
    caption: str = Field("", description="Short human caption (<= 20 words)")
    tags: List[str] = Field(default_factory=list, description="3–8 lowercase tags without #")
    model: str = Field(..., description="Vision model used")
    url: str = Field("", description="File path of saved image")  # ← Add this line

# DB payloads
class ImageIn(BaseModel):
    url: Optional[str] = None     # This will be the saved file path
    caption: str
    tags: List[str] = []

class ImageOut(ImageIn):
    id: str
    item_id: str
    created_at: str


# ---------- Helpers (vision) ----------

def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise HTTPException(status_code=500, detail=f"Missing environment variable: {name}")
    return v

def _validate_and_open_image(raw: bytes) -> None:
    """Validate the image quickly (format + basic decode)."""
    kind = imghdr.what(None, raw)
    if kind not in {"png", "jpeg", "gif", "bmp", "tiff", "webp"}:
        # allow some types even if imghdr fails; PIL will decide
        pass
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
        raise HTTPException(status_code=502, detail=f"OpenRouter error: {resp.text}")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        raise HTTPException(status_code=502, detail="Malformed OpenRouter response.")

    try:
        parsed = json.loads(content)
    except Exception:
        parsed = {"caption": content.strip(), "tags": []}

    caption = (parsed.get("caption") or "").strip()
    tags = parsed.get("tags") or []
    norm_tags: List[str] = []
    for t in tags:
        if not isinstance(t, str):
            continue
        t2 = t.strip().lower().replace("#", "")
        if " " in t2 or not t2:
            continue
        if t2 not in norm_tags:
            norm_tags.append(t2)
    if len(norm_tags) < 3 and caption:
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


# ---------- Routes: Vision ----------

@router.post("/analyze", response_model=AnalysisResp)
async def analyze_image(file: UploadFile = File(...)):
    """
    Upload one image (form-data 'file') and get a caption + tags from a Vision model.
    Returns: { caption, tags[], model, url }
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    raw = await file.read()
    if len(raw) > 12 * 1024 * 1024:  # 12MB limit
        raise HTTPException(status_code=413, detail="Image too large (limit 12 MB).")

    _validate_and_open_image(raw)
    data_url = _to_data_url(raw, file.filename)
    vision_result = _call_openrouter_vision(data_url)

    # Save the actual file
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{os.urandom(8).hex()}.{ext}"
    filepath = os.path.join("uploads", filename)
    
    with open(filepath, "wb") as f:
        f.write(raw)

    # Return analysis + file path
    return AnalysisResp(
        caption=vision_result["caption"],
        tags=vision_result["tags"],
        model=vision_result["model"],
        url=filename  # ← Add this line!
    )


# ---------- Routes: DB (attach/list) ----------
import json
import logging

logger = logging.getLogger(__name__)

@router.post("/attach/{item_id}", response_model=ImageOut)
def attach_image_to_item(item_id: str, body: ImageIn):
    """
    Attach a parsed image analysis (and optional URL) to an existing post (items.id).
    """

    # normalize payload from Pydantic v2 or v1
    if hasattr(body, "model_dump"):
        payload = body.model_dump()
    else:
        payload = body.dict()

    # ensure tags is a list
    tags_val = payload.get("tags") or []
    if isinstance(tags_val, str):
        try:
            tags_val = json.loads(tags_val)
        except Exception:
            tags_val = [tags_val]
    if not isinstance(tags_val, (list, tuple)):
        tags_val = [str(tags_val)]

    # Convert tags to PostgreSQL array format for TEXT[] column
    if tags_val:
        tags_array = "{" + ",".join([f'"{tag}"' for tag in tags_val]) + "}"
    else:
        tags_array = "{}"  # Empty array

    with ENGINE.begin() as c:
        exists = c.execute(text("SELECT 1 FROM items WHERE id = :id"), {"id": item_id}).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Item not found")

        try:
            row = c.execute(text("""
                INSERT INTO images (item_id, url, caption, tags)
                VALUES (:item_id, :url, :caption, :tags)
                RETURNING id::text AS id, item_id::text AS item_id, url, caption, tags, created_at
            """), {
                "item_id": item_id,
                "url": payload.get("url"),
                "caption": payload.get("caption"),
                "tags": tags_array  # Use PostgreSQL array format
            }).mappings().first()
        except Exception as e:
            logger.exception("Failed to insert image for item %s", item_id)
            raise HTTPException(status_code=500, detail=f"Insert failed: {e}")

    if not row:
        raise HTTPException(status_code=500, detail="Insert failed")

    # Normalize returned tags: could be PostgreSQL array string or JSON string
    returned_tags = row.get("tags")
    if isinstance(returned_tags, str):
        # Convert PostgreSQL array string to Python list
        if returned_tags.startswith('{') and returned_tags.endswith('}'):
            content = returned_tags[1:-1]
            if content:
                returned_tags = [tag.strip('" ') for tag in content.split(',')]
            else:
                returned_tags = []
        else:
            # Fallback: try JSON
            try:
                returned_tags = json.loads(returned_tags)
            except Exception:
                returned_tags = [returned_tags] if returned_tags else []
    elif returned_tags is None:
        returned_tags = []

    # Convert created_at to string (ISO format)
    created_at_str = row.get("created_at").isoformat() if row.get("created_at") else ""

    # Build a mapping that matches ImageOut model
    result = {
        "id": row["id"],
        "item_id": row["item_id"],
        "url": row.get("url"),
        "caption": row.get("caption") or "",
        "tags": returned_tags,
        "created_at": created_at_str,  # ← Convert to string!
    }
    return result

@router.get("/by-item/{item_id}", response_model=List[ImageOut])
def list_images_for_item(item_id: str):
    """
    List all image analyses linked to a specific post.
    """
    with ENGINE.begin() as c:
        rows = c.execute(text("""
            SELECT id::text AS id, item_id::text AS item_id, url, caption, tags, created_at
            FROM images
            WHERE item_id = :item_id
            ORDER BY created_at
        """), {"item_id": item_id}).mappings().all()

    # normalize tags on each row
    normalized = []
    for r in rows:
        tags = r.get("tags")
        if isinstance(tags, str):
            # Convert PostgreSQL array string to Python list
            if tags.startswith('{') and tags.endswith('}'):
                content = tags[1:-1]
                if content:
                    tags = [tag.strip('" ') for tag in content.split(',')]
                else:
                    tags = []
            else:
                # Fallback: try JSON
                try:
                    tags = json.loads(tags)
                except Exception:
                    tags = [tags] if tags else []
        elif tags is None:
            tags = []
        
        # Convert created_at to string
        created_at_str = r.get("created_at").isoformat() if r.get("created_at") else ""
        
        normalized.append({
            "id": r["id"],
            "item_id": r["item_id"],
            "url": r.get("url"),
            "caption": r.get("caption") or "",
            "tags": tags,
            "created_at": created_at_str,
        })
    return normalized