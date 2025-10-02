import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar/Sidebar";
import "./sidebar/Sidebar.css";

export default function RootLayout() {
  return (
    <>
      <Sidebar />
      <main className="sb-main">
        {/* This wrapper constrains page width nicely */}
        <div className="page">
          <Outlet />
        </div>
      </main>
    </>
  );
}

