import { useEffect, useState } from "react";
import { NavLink, type NavLinkRenderProps, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function cx(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // restore persisted collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sb-collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  // persist + toggle body class for collapsed tooltips
  useEffect(() => {
    localStorage.setItem("sb-collapsed", collapsed ? "1" : "0");
    document.body.classList.toggle("sb-collapsed", collapsed);
  }, [collapsed]);

  const navClass = ({ isActive }: NavLinkRenderProps) =>
    cx("sb-link", isActive ? "sb-active" : "");

  const closeMobile = () => setOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
      <aside className={cx("sb-sidebar", open ? "sb-open" : "")}>
        <div className="sb-brand">
          <span className="sb-brand-logo">⚡</span>
          <span className="sb-brand-text">InspireAI</span>

          <button
            className="sb-collapse-icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
            onClick={() => setCollapsed(v => !v)}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="sb-nav">
          <NavLink
            to="/"
            end
            className={navClass}
            onClick={closeMobile}
            data-tip="Home"
          >
            <span className="sb-link-icon">🏠</span>
            <span className="sb-link-label">Home</span>
          </NavLink>

          <NavLink
            to="/library"
            className={navClass}
            onClick={closeMobile}
            data-tip="Library"
          >
            <span className="sb-link-icon">📚</span>
            <span className="sb-link-label">Library</span>
          </NavLink>
        </nav>

        {/* Logout button at the bottom */}
        <div className="sb-footer">
          <button
            className="sb-logout-btn"
            onClick={handleLogout}
            data-tip="Logout"
          >
            <span className="sb-link-icon">🚪</span>
            <span className="sb-link-label">Logout</span>
          </button>
          <span className="sb-version">v1.0.0</span>
        </div>
      </aside>
      
      {open && <div className="sb-backdrop" onClick={closeMobile} />}
    </>
  );
}