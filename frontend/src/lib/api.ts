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

export async function generateContent(payload: GenPayload) {
  const res: Response = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result as string;
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
