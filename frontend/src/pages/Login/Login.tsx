// src/pages/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login, googleLogin } from "../../api/auth";
import "./Login.css";

declare global {
  interface Window {
    google: any;
  }
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Initialize Google Sign-In button
  useEffect(() => {
    if (typeof window !== "undefined" && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, []);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setIsLoading(true);
    setError("");
    try {
      await googleLogin(response.credential);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Google sign-in failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.message ||
        "Invalid username or password.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} aria-label="Login form" className="login-card">
        <h1 className="login-title">
          Welcome to <span>InspireAI</span>
        </h1>

        <input
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
          required
        />
        <input
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>

        {/* Google Sign-In Button */}
        <div id="google-signin-button" style={{ margin: "1rem 0" }}></div>

        <Link to="/signup">Don’t have an account? Sign up</Link>

        {error && <div className="login-error">{error}</div>}
      </form>
    </div>
  );
}