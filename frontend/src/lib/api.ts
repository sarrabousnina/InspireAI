const API_URL = import.meta.env.VITE_API_URL as string;

export type GenPayload = {
  prompt: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
  tone: "professional" | "friendly" | "witty" | "persuasive";
  audience?: string;
  word_count: number;
  mode: "social" | "blog";
  temperature?: number;
};

export async function generateContent(payload: GenPayload) {
  const res = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.result as string;
}
