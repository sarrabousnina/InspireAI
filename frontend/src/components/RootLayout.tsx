import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar/Sidebar"; // ✅ from components/ to components/sidebar/Sidebar
import "./sidebar/Sidebar.css";

export default function RootLayout() {
  return (
    <>
      <Sidebar />
      <div className="sb-main">
        {/* Your page content renders here */}
        <div style={{ padding: 24, minHeight: "100vh", background: "#0b1220" }}>
          <Outlet />
        </div>
      </div>
    </>
  );
}
