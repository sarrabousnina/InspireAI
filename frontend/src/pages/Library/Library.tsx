import { useEffect, useMemo, useState } from "react";
import { getItems, deleteItem, duplicateItem, updateItem } from "../../lib/api";
import "./Library.css";

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
  images?: string[];
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// Helper to clean markdown bold syntax (remove **)
const cleanMarkdown = (text: string) => {
  return text.replace(/\*\*/g, "");
};

export default function Library() {
  const userIdRaw = localStorage.getItem("user_id");
  const userId = userIdRaw === null ? undefined : userIdRaw;
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<string>("all");
  const [tone, setTone] = useState<string>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const user_id = userIdRaw && userIdRaw !== "undefined" && userIdRaw !== "null" ? userIdRaw : undefined;

  const filters = useMemo(() => {
    const f: Record<string, any> = { q, platform, tone, page, pageSize: 20 };
    if (user_id) f.user_id = user_id;
    return f;
  }, [q, platform, tone, page, user_id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getItems(filters).then((res) => {
      if (!alive) return;
      setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
      setHasMore(res.items.length === 20);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [filters, page]);

  const resetAndSearch = () => setPage(1);

  async function onDelete(id: string) {
    await deleteItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function onDuplicate(id: string) {
    const newItem = await duplicateItem(id);
    setItems((prev) => [newItem, ...prev]);
  }

  async function onTogglePin(id: string, pinned: boolean) {
    const updated = await updateItem(id, { pinned: !pinned });
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }

  const pinned = items.filter((i) => i.pinned);
  const regular = items.filter((i) => !i.pinned);

  return (
    <div className="lib">
      <h1>Library</h1>

      <div className="lib-filters">
        <input
          className="lib-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && resetAndSearch()}
          placeholder="Search by idea, text, tag…"
        />
        <select
          className="lib-select"
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            resetAndSearch();
          }}
        >
          <option value="all">All platforms</option>
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="blog">Blog</option>
        </select>
        <select
          className="lib-select"
          value={tone}
          onChange={(e) => {
            setTone(e.target.value);
            resetAndSearch();
          }}
        >
          <option value="all">All tones</option>
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="witty">Witty</option>
          <option value="persuasive">Persuasive</option>
        </select>
      </div>

      {pinned.length > 0 && (
        <section className="lib-section">
          <h2>Pinned</h2>
          <div className="lib-grid">
            {pinned.map((i) => (
              <Card
                key={`pin-${i.id}`}
                item={i}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onTogglePin={onTogglePin}
              />
            ))}
          </div>
        </section>
      )}

      <div className="lib-grid">
        {regular.map((i) => (
          <Card
            key={i.id}
            item={i}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>

      <div className="lib-more">
        {hasMore && (
          <button
            className="lib-btn primary"
            disabled={loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}

function Card({
  item,
  onDelete,
  onDuplicate,
  onTogglePin,
}: {
  item: Item;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  const cleanedTitle = cleanMarkdown(item.title || "(Untitled)");
  const cleanedContent = cleanMarkdown(item.content);

  return (
    <article className="lib-card">
      <div className="lib-meta">
        <span className="lib-chip brand">{item.platform}</span>
        <span className="lib-chip tone">{item.tone}</span>
        <span className="lib-chip small">{item.words}w</span>
        <span className="lib-chip small">{item.model}</span>
        <span className="right muted">{fmtDate(item.created_at)}</span>
      </div>

      <h3 className="lib-title">{cleanedTitle}</h3>

      <div className="lib-content">
        {/* For blog posts, you might want to render as HTML later */}
        <p>{cleanedContent}</p>
      </div>

      {(item.images?.length ?? 0) > 0 && (
        <div className="lib-media">
          {item.images!.slice(0, 3).map((src, idx) => {
            const remaining = item.images!.length - 3;
            const showMore = idx === 2 && remaining > 0;
            return (
              <a
                key={src + idx}
                className="lib-thumb"
                href={src}
                target="_blank"
                rel="noreferrer"
                title="Open image"
              >
                <img src={src} alt={`image ${idx + 1}`} loading="lazy" />
                {showMore && <span className="lib-more-badge">+{remaining}</span>}
              </a>
            );
          })}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="lib-tags">
          {item.tags.map((t) => (
            <span key={t} className="lib-tag">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="lib-actions">
        <button
          className="lib-btn"
          onClick={() => onTogglePin(item.id, item.pinned)}
          title={item.pinned ? "Unpin" : "Pin"}
        >
          {item.pinned ? "📌 Unpin" : "📌 Pin"}
        </button>
        <button
          className="lib-btn"
          onClick={() => navigator.clipboard.writeText(cleanedContent)}
        >
          📋 Copy
        </button>
        <a
          className="lib-btn"
          download={`${(cleanedTitle || "content").replace(/[^\w\-]+/g, "_")}.txt`}
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(cleanedContent)}`}
        >
          ⬇️ Download
        </a>
        <button className="lib-btn" onClick={() => onDuplicate(item.id)}>
          🔄 Duplicate
        </button>
        <span className="spacer" />
        <button className="lib-btn danger" onClick={() => onDelete(item.id)}>
          ❌ Delete
        </button>
      </div>
    </article>
  );
}