import React, { useState } from "react";
import { analyzeImage } from "../../lib/api";
import "./ImageUploader.css";

type Props = {
  onResult: (r: { caption: string; tags: string[]; model: string }) => void;
  className?: string;
};

// ...imports unchanged
export default function ImageUploader({ onResult, className = "" }: Props) {
  const [previews, setPreviews] = useState<string[]>([]);          // ← multiple
  const [fileNames, setFileNames] = useState<string[]>([]);        // ← multiple
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    // basic validation
    for (const f of arr) {
      if (!f.type.startsWith("image/")) {
        setError("All files must be images.");
        return;
      }
      if (f.size > 12 * 1024 * 1024) {
        setError(`"${f.name}" is larger than 12MB.`);
        return;
      }
    }

    setError(null);
    setFileNames(arr.map(f => f.name));
    setPreviews(arr.map(f => URL.createObjectURL(f)));
    setBusy(true);

    try {
      // Call your existing /api/images/analyze for each file in parallel
      const results = await Promise.all(arr.map(analyzeImage));
      // Emit each result upward (keeps your current onResult signature)
      for (const r of results) onResult(r);
    } catch (e: any) {
      setError(e.message || "Failed to analyze one or more images");
    } finally {
      setBusy(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className={`uploader ${className}`}>
      <span className="uploader-label">Images (optional)</span>

      <label
        className={`uploader-dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {/* ↓↓↓ allow multiple */}
        <input type="file" accept="image/*" multiple onChange={onInputChange} />
        <button type="button" className="uploader-button">Choose files</button>
        <div className="uploader-filename">
          {fileNames.length
            ? `${fileNames.length} file(s) selected`
            : "Click to choose or drag & drop multiple images"}
        </div>
      </label>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="uploader-grid">
          {previews.map((src, i) => (
            <div className="uploader-thumb" key={i}>
              <img src={src} alt={`preview-${i}`} />
            </div>
          ))}
        </div>
      )}

      {busy && <div className="uploader-status">Analyzing images…</div>}
      {error && <div className="uploader-error">{error}</div>}
    </div>
  );
}
