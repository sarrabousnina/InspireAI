import { useState } from "react";
import { generateContent } from "./lib/api";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<"linkedin"|"instagram"|"facebook"|"blog">("linkedin");
  const [tone, setTone] = useState<"professional"|"friendly"|"witty"|"persuasive">("professional");
  const [audience, setAudience] = useState("SMBs / startups");
  const [wordCount, setWordCount] = useState(120);
  const [mode, setMode] = useState<"social"|"blog">("social");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true); setOut("");
    try {
      const result = await generateContent({
        prompt, platform, tone, audience,
        word_count: wordCount, mode,
        temperature: mode==="social" ? 0.7 : 0.6,
      });
      setOut(result);
    } catch (e:any) { setOut(e.message || "Error"); }
    finally { setLoading(false); }
  }

  return (
    <main style={{maxWidth:900,margin:"2rem auto",padding:"1rem"}}>
      <h1>InspireAI — Content Studio</h1>

      <div style={{display:"grid",gap:12,gridTemplateColumns:"1fr 1fr"}}>
        <label>Platform
          <select value={platform} onChange={e=>setPlatform(e.target.value as any)}>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="blog">Blog</option>
          </select>
        </label>

        <label> Tone
          <select value={tone} onChange={e=>setTone(e.target.value as any)}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="witty">Witty</option>
            <option value="persuasive">Persuasive</option>
          </select>
        </label>

        <label> Mode
          <select value={mode} onChange={e=>setMode(e.target.value as any)}>
            <option value="social">Social (8B fast)</option>
            <option value="blog">Blog (70B quality)</option>
          </select>
        </label>

        <label> Word count
          <input type="number" value={wordCount}
            onChange={e=>setWordCount(Number(e.target.value))}
            min={60} max={1200}/>
        </label>
      </div>

      <label style={{display:"block",marginTop:12}}>Audience
        <input style={{width:"100%"}} value={audience} onChange={e=>setAudience(e.target.value)} />
      </label>

      <textarea
        style={{width:"100%",height:160,marginTop:12}}
        placeholder="Describe what you want to write…"
        value={prompt} onChange={e=>setPrompt(e.target.value)}
      />

      <button onClick={go} disabled={loading} style={{marginTop:12}}>
        {loading ? "Generating…" : "Generate"}
      </button>

      <div style={{marginTop:16}}>
        <button onClick={()=>navigator.clipboard.writeText(out)} disabled={!out}>Copy</button>
      </div>

      <pre style={{whiteSpace:"pre-wrap",marginTop:12}}>{out}</pre>
    </main>
  );
}
