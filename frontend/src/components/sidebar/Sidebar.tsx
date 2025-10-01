import { useEffect, useState } from "react";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import "./Sidebar.css";

function cn(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export default function Sidebar() {
  // desktop collapsed state (remembered)
  const [collapsed, setCollapsed] = useState(false);
  // mobile drawer open
  const [open, setOpen] = useState(false);

  // Load/save collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sb-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("sb-collapsed", collapsed ? "1" : "0");
    document.body.classList.toggle("sb-collapsed", collapsed);
  }, [collapsed]);

  // Toggle handlers
  const toggleCollapsed = () => setCollapsed((v) => !v);
  const closeMobile = () => setOpen(false);

  // helper for TS on NavLink className
  const navClass = ({ isActive }: NavLinkRenderProps) =>
    cn("sb-link", isActive ? "sb-active" : "");

  return (
    <>
      {/* Mobile top bar */}
      <div className="sb-topbar">
        <button
          className="sb-burger"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
        <span className="sb-logo">InspireAI</span>
      </div>

      {/* Sidebar */}
      <aside className={cn("sb-sidebar", open ? "sb-open" : "")}>
        <div className="sb-brand">
          <span className="sb-brand-logo">⚡</span>
          <span className="sb-brand-text">InspireAI</span>
        </div>

        <nav className="sb-nav">
          <NavLink to="/" end className={navClass} onClick={closeMobile} data-tip="Home">
            <span className="sb-link-icon">🏠</span>
            <span className="sb-link-label">Home</span>
          </NavLink>

          <NavLink to="/library" className={navClass} onClick={closeMobile} data-tip="Library">
            <span className="sb-link-icon">📚</span>
            <span className="sb-link-label">Library</span>
          </NavLink>
        </nav>

        <div className="sb-footer">
          <button
            className="sb-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "»" : "«"}
          </button>
          <span className="sb-version">v1.0.0</span>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && <div className="sb-backdrop" onClick={closeMobile} />}
    </>
  );
}
