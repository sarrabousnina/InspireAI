// src/layouts/RootLayout.tsx (or wherever it is)
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./sidebar/Sidebar";
import "./sidebar/Sidebar.css";

export default function RootLayout() {
  const location = useLocation();

  // Hide sidebar on auth pages
  const hideSidebar = ["/login", "/signup"].includes(location.pathname);

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