// src/App.tsx
import { useState, useRef, useEffect } from "react";
import { generateContent, createItem, addImageForItem, analyzeImage } from "./lib/api";
import ImageUploader from "./components/ImageUploader/ImageUploader";
import "./app.css";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<"linkedin" | "instagram" | "facebook" | "blog">("linkedin");
  const [tone, setTone] = useState<"professional" | "friendly" | "witty" | "persuasive">("professional");
  const [audience, setAudience] = useState("SMBs / startups");
  const [wordCount, setWordCount] = useState(120);
  const [mode, setMode] = useState<"social" | "blog">("social");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  // Image state
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [imageTags, setImageTags] = useState<string[][]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const imgCounter = useRef(0);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  function makeTitle(text: string, fallback: string) {
    const t = text.split(/\n|\. |\?/)[0]?.trim() || fallback.trim();
    return t.length > 70 ? t.slice(0, 67) + "..." : t || "Untitled";
  }

  // ✅ This matches ImageUploader's expected type
  const handleImageAnalysisResult = async (analysis: { caption: string; tags: string[]; model: string }) => {
    try {
      setImageCaptions(prev => [...prev, analysis.caption]);
      setImageTags(prev => [...prev, analysis.tags]);

      imgCounter.current += 1;
      const n = imgCounter.current;
      setPrompt(prev =>
        [
          prev.trim(),
          `Image ${n}: ${analysis.caption}`,
          analysis.tags?.length ? `Tags: ${analysis.tags.join(", ")}` : "",
          "----",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (err) {
      console.error("Error handling image result:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  async function go() {
    if (!prompt.trim()) return;
    setLoading(true);
    setOut("");

    try {
      const result = await generateContent({
        prompt,
        platform,
        tone,
        audience,
        word_count: wordCount,
        mode,
        temperature: mode === "social" ? 0.7 : 0.6,
        image_captions: imageCaptions.length ? imageCaptions : undefined,
        image_tags: imageTags.length ? imageTags : undefined,
      });
      setOut(result);

      const saved = await createItem({
        title: makeTitle(result, prompt),
        content: result,
        platform,
        tone,
        mode,
        words: wordCount,
        model: mode === "social" ? "llama-3.1-8b" : "llama-3.1-70b",
        tags: [platform, tone],
        pinned: false,
      });

      if (imageCaptions.length) {
        const tasks = imageCaptions.map((cap, i) =>
          addImageForItem(saved.id, {
            caption: cap,
            tags: imageTags[i] || [],
          })
        );
        try {
          await Promise.all(tasks);
        } catch (err) {
          console.warn("Failed to attach one or more images:", err);
        }
      }
    } catch (e: any) {
      setOut(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  const wordPresets = mode === "blog" ? [400, 600, 900] : [80, 120, 180];

  return (
    <div className="grid">
      <header className="header">
        <h1 className="title">
          InspireAI <em>Content Studio</em>
        </h1>
        <p className="subtitle">Free • Fast • Groq-powered</p>
      </header>

      <section className="card controls">
        <div className="row two">
          <label className="field">
            <span>Platform</span>
            <select
              className="input"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as any)}
            >
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="blog">Blog</option>
            </select>
          </label>

          <label className="field">
            <span>Tone</span>
            <select
              className="input"
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="witty">Witty</option>
              <option value="persuasive">Persuasive</option>
            </select>
          </label>
        </div>

        <div className="row two">
          <label className="field">
            <span>Mode</span>
            <select
              className="input"
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
            >
              <option value="social">Social (8B fast)</option>
              <option value="blog">Blog (70B quality)</option>
            </select>
          </label>

          <label className="field">
            <span>Word count</span>
            <div className="inline">
              <input
                className="input"
                type="number"
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                min={60}
                max={1200}
              />
              <div className="chips">
                {wordPresets.map((n) => (
                  <button
                    key={n}
                    className={`chip ${n === wordCount ? "active" : ""}`}
                    onClick={() => setWordCount(n)}
                    type="button"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </label>
        </div>

        <label className="field">
          <span>Audience</span>
          <input
            className="input"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Your idea</span>
          <textarea
            className="input textarea"
            placeholder="Describe what you want to write…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
<div className="image-upload-minimal">
  {isAnalyzing && <div className="analyzing">Thinking...</div>}
<button
  className="upload-image-btn"
  onClick={() => document.getElementById("image-upload-input")?.click()}
>
  Upload images
</button>

  <input
    id="image-upload-input"
    type="file"
    multiple
    accept="image/*"
    style={{ display: "none" }}
    onChange={async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setIsAnalyzing(true);

      // Process each file
      for (const file of files) {
        try {
          const analysis = await analyzeImage(file);
          setImageCaptions(prev => [...prev, analysis.caption]);
          setImageTags(prev => [...prev, analysis.tags]);

          // Create preview URL
          const url = URL.createObjectURL(file);
          setImagePreviews(prev => [...prev, url]);

          imgCounter.current += 1;
          const n = imgCounter.current;
          setPrompt(prev =>
            [
              prev.trim(),
              `Image ${n}: ${analysis.caption}`,
              analysis.tags?.length ? `Tags: ${analysis.tags.join(", ")}` : "",
              "----",
            ]
              .filter(Boolean)
              .join("\n")
          );
        } catch (err) {
          console.error("Error analyzing image:", err);
        }
      }

      setIsAnalyzing(false);
      e.target.value = ""; // Allow re-selecting same file
    }}
  />

  {imagePreviews.length > 0 && (
    <div className="image-thumbnails">
      {imagePreviews.map((url, i) => (
        <div key={i} className="thumbnail">
          <img src={url} alt={`Preview ${i + 1}`} />
        </div>
      ))}
    </div>
  )}
</div>

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={go}
            disabled={loading || !prompt.trim()}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          <button
            className="btn"
            onClick={() => out && navigator.clipboard.writeText(out)}
            disabled={!out}
          >
            Copy
          </button>
          <button
            className="btn"
            onClick={() => {
              if (!out) return;
              const blob = new Blob([out], { type: "text/markdown" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `inspire-${platform}-${mode}.md`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            disabled={!out}
          >
            Download
          </button>
        </div>
      </section>

      <section className="card output">
        <div className="output-head">
          <div className="output-title">
            <h2>Output</h2>
            <small className="badge">
              {mode === "social" ? "Llama-3.1-8B" : "Llama-3.1-70B"}
            </small>
          </div>

          <div className="output-actions">
            <button
              className="btn btn-ghost"
              onClick={() => out && navigator.clipboard.writeText(out)}
              disabled={!out}
              title="Copy to clipboard"
            >
              Copy
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                if (!out) return;
                const blob = new Blob([out], { type: "text/markdown" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `inspire-${platform}-${mode}.md`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
              disabled={!out}
              title="Download .md"
            >
              Download
            </button>
          </div>
        </div>

        <div className={`output-body ${loading ? "loading" : ""}`}>
          {loading ? (
            <>
              <div className="skeleton" />
              <div className="skeleton w-80" />
              <div className="skeleton w-64" />
              <div className="skeleton w-56" />
            </>
          ) : (
            <pre className="out-pre">{out || "Your content will appear here…"}</pre>
          )}
        </div>
      </section>

      <footer className="footer">
        <span>© InspireAI — built with FastAPI + Vite + Groq</span>
        <a className="ml-2 underline opacity-80 hover:opacity-100" href="/library">
          Library →
        </a>
      </footer>
    </div>
  );
}