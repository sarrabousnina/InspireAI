import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar/Sidebar";
import "./sidebar/Sidebar.css";

export default function RootLayout() {
  return (
    <>
      <Sidebar />
      <div className="sb-main">
        <Outlet />
      </div>
    </>
  );
}
