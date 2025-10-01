// src/pages/Library.tsx
import { useEffect, useMemo, useState } from "react";
import { getItems, deleteItem, duplicateItem, updateItem } from "../lib/api";

type Item = {
  id: string;
  title: string;
  content: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
  tone: "professional" | "friendly" | "witty" | "persuasive";
  mode: "social" | "blog";
  words: number;
  model: string;
  tags: string[];
  pinned: boolean;
  created_at: string; // ISO
};

export default function Library() {
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [tone, setTone] = useState<string>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const filters = useMemo(() => ({ q, platform, tone, page, pageSize: 20 }), [q, platform, tone, page]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getItems(filters).then(res => {
      if (!alive) return;
      setItems(prev => page === 1 ? res.items : [...prev, ...res.items]);
      setHasMore(res.items.length === 20);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [filters, page]);

  function resetAndSearch() { setPage(1); }

  async function onDelete(id: string) {
    await deleteItem(id);
    setItems(prev => prev.filter(it => it.id !== id));
  }
  async function onDuplicate(id: string) {
    const newItem = await duplicateItem(id);
    setItems(prev => [newItem, ...prev]);
  }
  async function onTogglePin(id: string, pinned: boolean) {
    const updated = await updateItem(id, { pinned: !pinned });
    setItems(prev => prev.map(it => it.id === id ? updated : it));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Library</h1>
        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && resetAndSearch()}
            placeholder="Search by idea, text, tag…"
            className="w-72 rounded-xl border border-white/10 bg-white/5 px-4 py-2 outline-none"
          />
          <select className="rounded-xl bg-white/5 px-3 py-2" value={platform} onChange={e => { setPlatform(e.target.value); resetAndSearch(); }}>
            <option value="all">All platforms</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="blog">Blog</option>
          </select>
          <select className="rounded-xl bg-white/5 px-3 py-2" value={tone} onChange={e => { setTone(e.target.value); resetAndSearch(); }}>
            <option value="all">All tones</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="witty">Witty</option>
            <option value="persuasive">Persuasive</option>
          </select>
        </div>
      </div>

      {/* Pinned row */}
      {items.some(i => i.pinned) && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold opacity-80">Pinned</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {items.filter(i => i.pinned).map(i => (
              <Card key={`pin-${i.id}`} item={i} onDelete={onDelete} onDuplicate={onDuplicate} onTogglePin={onTogglePin}/>
            ))}
          </div>
        </div>
      )}

      {/* All items */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.filter(i => !i.pinned).map(i => (
          <Card key={i.id} item={i} onDelete={onDelete} onDuplicate={onDuplicate} onTogglePin={onTogglePin}/>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center">
        {hasMore && (
          <button disabled={loading} onClick={() => setPage(p => p + 1)} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ item, onDelete, onDuplicate, onTogglePin }:{
  item: Item; onDelete:(id:string)=>void; onDuplicate:(id:string)=>void; onTogglePin:(id:string,pinned:boolean)=>void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm opacity-80">{item.platform} • {item.tone} • {item.words}w • {new Date(item.created_at).toLocaleString()}</div>
        <button onClick={() => onTogglePin(item.id, item.pinned)} className="text-xs opacity-80 hover:opacity-100">
          {item.pinned ? "Unpin" : "Pin"}
        </button>
      </div>
      <h3 className="mb-2 line-clamp-1 text-lg font-semibold">{item.title || "(Untitled)"}</h3>
      <p className="line-clamp-4 whitespace-pre-wrap opacity-90">{item.content}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.map(t => <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{t}</span>)}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => navigator.clipboard.writeText(item.content)}
          className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm">Copy</button>
        <a
          download={`${item.title || "content"}.txt`}
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.content)}`}
          className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm">Download</a>
        <button onClick={() => onDuplicate(item.id)} className="rounded-xl bg-slate-700 px-3 py-1.5 text-sm">Duplicate</button>
        <button onClick={() => onDelete(item.id)} className="ml-auto rounded-xl bg-rose-600 px-3 py-1.5 text-sm text-white">Delete</button>
      </div>
    </div>
  );
}
