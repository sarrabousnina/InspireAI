import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./components/RootLayout";
import Home from "./App";
import Library from "./pages/Library"; // stub below or your real page
import "./app.css"; // page-level styles only

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,            // <- wraps all pages with Sidebar + .sb-main
    children: [
      { index: true, element: <Home /> },
      { path: "library", element: <Library /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
