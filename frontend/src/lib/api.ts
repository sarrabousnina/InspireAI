// src/lib/apis.ts

// existing code...
const API_URL = import.meta.env.VITE_API_URL as string;

export type GenPayload = {
  prompt: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
  tone: "professional" | "friendly" | "witty" | "persuasive";
  audience: string;
  word_count: number;
  mode: "social" | "blog";
  temperature?: number;
};

export async function generateContent(body: any) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  // backend returns { platform, mode, result }
  return json.result as string;
}

// ✅ Add your Library API functions here
export async function getItems(params: { q?: string; platform?: string; tone?: string; page?: number; pageSize?: number }) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "all") as any
  );
  const res: Response = await fetch(`/api/items?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to load items");
  return res.json(); // { items: Item[] }
}

export async function deleteItem(id: string) {
  const res: Response = await fetch(`/api/items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export async function duplicateItem(id: string) {
  const res: Response = await fetch(`/api/items/${id}/duplicate`, { method: "POST" });
  if (!res.ok) throw new Error("Duplicate failed");
  return res.json();
}

export async function updateItem(id: string, body: any) {
  const res: Response = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

// src/lib/api.ts
export async function createItem(body: {
  title?: string;
  content: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
  tone: "professional" | "friendly" | "witty" | "persuasive";
  mode: "social" | "blog";
  words: number;
  model?: string;
  tags?: string[];
  pinned?: boolean;
}) 


{
  const res: Response = await fetch(`/api/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

//images upload
export async function analyzeImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);

  // If you set a Vite dev proxy (step 4), use the relative path:
  const res = await fetch("/api/images/analyze", {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Image analysis failed");
  }
  return (await res.json()) as { caption: string; tags: string[]; model: string };
}

// frontend/src/lib/api.ts

export async function addImageForItem(
  itemId: string,
  data: { url?: string; caption: string; tags: string[] }
) {
  const res = await fetch(`/api/images/attach/${itemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
