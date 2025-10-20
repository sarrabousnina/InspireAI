// src/pages/SignUp.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register, googleLogin } from "../../api/auth";
import "./SignUp.css";

declare global {
  interface Window {
    google: any;
  }
}

export default function SignUp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // Initialize Google Sign-In button
  useEffect(() => {
    const initializeGoogle = () => {
      if (!window.google) return;

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
      });

      // Wait for the container to exist
      const interval = setInterval(() => {
        const container = document.getElementById("google-signup-button");
        if (container) {
          clearInterval(interval);
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: "100%",
          });
        }
      }, 100);
    };

    if (typeof window !== "undefined") {
      if (window.google) {
        initializeGoogle();
      } else {
        // Fallback: try again after script loads
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = initializeGoogle;
        document.head.appendChild(script);
      }
    }
  }, []);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setError("");
    setSuccess("");
    try {
      // Google login will create the user if not exists (handled on backend)
      await googleLogin(response.credential);
      setSuccess("Account created with Google! Redirecting...");
      setTimeout(() => navigate("/"), 1200);
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Google sign-up failed. Please try again.";
      setError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await register(username, password);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Sign up failed. Username may already be taken.";
      setError(message);
    }
  };

  return (
    <div className="signup-page">
      <form onSubmit={handleSubmit} aria-label="SignUp form" className="signup-card">
        <h1 className="signup-title">
          Join <span>InspireAI</span>
        </h1>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          placeholder="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />

        <button type="submit">Sign Up</button>

        {/* Google Sign-In Button */}
        <div id="google-signup-button" style={{ margin: "1rem 0" }}></div>

        <Link to="/login" className="back-to-signin">
          ← Go back to Sign In
        </Link>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </form>
    </div>
  );
}