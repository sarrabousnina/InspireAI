export default function App() {
  return (
    <div className="container">
      <div className="card" style={{ marginTop: 24 }}>
        <span className="badge">InspireAI · MVP</span>
        <h1 style={{ margin: '12px 0 8px', fontSize: 32 }}>
          InspireAI — AI Content Studio
        </h1>
        <p style={{ marginTop: 0, color: 'var(--muted)' }}>
          React + Vite + CSS • FastAPI backend coming next
        </p>

        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>What you’ll do here</h2>
            <ul>
              <li>Generate posts, blogs, and product copy</li>
              <li>OCR images to extract text</li>
              <li>Chat with a brand-aware assistant</li>
              <li>Search your history with embeddings</li>
            </ul>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>API Status</h2>
            <p id="api-status">Backend not connected yet</p>
            <button className="btn" onClick={checkHealth}>
              Check API
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// we'll use this after we add FastAPI
async function checkHealth() {
  const el = document.getElementById('api-status')!
  try {
    const r = await fetch('http://localhost:8000/health')
    const data = await r.json()
    el.textContent = `API: ${data.ok ? 'OK' : 'Not OK'}`
  } catch {
    el.textContent = 'API: not reachable'
  }
}
