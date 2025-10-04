  import React, { useState, type JSX } from "react";
  import ReactDOM from "react-dom/client";
  import { createBrowserRouter, RouterProvider, Navigate, useLocation } from "react-router-dom";

  import RootLayout from "./components/RootLayout";
  import Home from "./App";
  import Library from "./pages/Library/Library"; // your real page or stub
  import Login from "./pages/Login/Login";
  import "./app.css";
import SignUp from "./pages/SignUp/SignUp";

  // Auth wrapper component to protect routes
  function RequireAuth({ children }: { children: JSX.Element }) {
    const token = localStorage.getItem("token");
    const location = useLocation();

    if (!token) {
      // Redirect unauthenticated user to login, saving current location
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  }

  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />, // sidebar + main wrapper
      children: [
        { index: true, element: <Home /> },
        {
          path: "library",
          element: (
            <RequireAuth>
              <Library />
            </RequireAuth>
          ),
        },
        { path: "login", element: <Login /> },
        { path: "signup", element: <SignUp /> },
      ],
    },
  ]);

  // Main render - you can add logout UI inside RootLayout or elsewhere
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
