// src/main.tsx
import React, { type JSX } from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from "react-router-dom";

import RootLayout from "./components/RootLayout";
import Home from "./App";
import Library from "./pages/Library/Library";
import AgentChatPage from "./pages/AgentChat/AgentChat";
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import HomePage from "./pages/Homepage";
import "./app.css";

// Protect routes: redirect to /login if not authenticated
function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Redirect away from auth pages if already logged in
function AuthRedirect({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
            {
        path: "homepage",
        element: (
            <HomePage />
        ),
      },



      {
        index: true,
        element: (
          <RequireAuth>
            <Home />
          </RequireAuth>
        ),
      },
      {
        path: "library",
        element: (
          <RequireAuth>
            <Library />
          </RequireAuth>
        ),
      },
      {
        path: "agent",
        element: (
          <RequireAuth>
            <AgentChatPage />
          </RequireAuth>
        ),
      },
      // 🔒 Redirect logged-in users away from login/signup
      {
        path: "login",
        element: (
          <AuthRedirect>
            <Login />
          </AuthRedirect>
        ),
      },
      {
        path: "signup",
        element: (
          <AuthRedirect>
            <SignUp />
          </AuthRedirect>
        ),
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);