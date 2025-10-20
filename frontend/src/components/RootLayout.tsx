// src/layouts/RootLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./sidebar/Sidebar";
import "./sidebar/Sidebar.css";

export default function RootLayout() {
  const location = useLocation();

  // Hide sidebar on auth pages and homepage
  const hideSidebar = ["/login", "/signup", "/homepage"].some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <>
      {!hideSidebar && <Sidebar />}
      <main className={`sb-main ${hideSidebar ? "full-width" : ""}`}>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </>
  );
}