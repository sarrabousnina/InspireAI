// src/lib/apis.ts

const API_URL = import.meta.env.VITE_API_URL as string;

// Utility to get only valid string-valued headers
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

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
  return json.result as string;
}

export async function getItems(params: { q?: string; platform?: string; tone?: string; page?: number; pageSize?: number; user_id?: string }) {
   const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "all") as any
  );
  const res: Response = await fetch(`/api/items?${qs.toString()}`);
  if (!res.ok) throw new Error("Failed to load items");
  return res.json();
}


export async function deleteItem(id: string) {
  const res: Response = await fetch(`/api/items/${id}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Delete failed");
}

export async function duplicateItem(id: string) {
  const res: Response = await fetch(`/api/items/${id}/duplicate`, {
    method: "POST",
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error("Duplicate failed");
  return res.json();
}

export async function updateItem(id: string, body: any) {
  const res: Response = await fetch(`/api/items/${id}`, {
    method: "PATCH",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
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
}) {
  const res: Response = await fetch(`/api/items`, {
    method: "POST",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function analyzeImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
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

export async function addImageForItem(
  itemId: string,
  data: { url?: string; caption: string; tags: string[] }
) {
  const res = await fetch(`/api/images/attach/${itemId}`, {
    method: "POST",
    headers: { ...getAuthHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
