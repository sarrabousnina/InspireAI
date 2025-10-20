// src/components/PlatformPreview.tsx
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import pdp from "/pdp.png";
import "./PlatformPreview.css";

interface PlatformPreviewProps {
  content: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
}

interface User {
  name: string;
  title: string;
  avatarUrl?: string;
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({ content, platform }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Load user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({
          name: parsed.name || "Your Name",
          title: parsed.title || "Your Title",
          avatarUrl: parsed.avatarUrl || pdp,
        });
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
        // Fallback
        setUser({
          name: "Your Name",
          title: "Your Title",
          avatarUrl: pdp,
        });
      }
    } else {
      // Fallback if no user
      setUser({
        name: "Your Name",
        title: "Your Title",
        avatarUrl: pdp,
      });
    }
  }, []);

  if (platform === "linkedin") {
    return (
      <div className="linkedin-post-card">
        {/* Post Header */}
        <div className="post-header">
          <img
            src={user?.avatarUrl || pdp}
            alt={user?.name || "User"}
            className="author-avatar"
          />
          <div className="author-info">
            <strong>{user?.name || "Your Name"}</strong>
            <span className="author-title">{user?.title || "Your Title"}</span>
            <span className="post-time">• Posted now</span>
          </div>
        </div>

        {/* Post Content */}
        <div className="post-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Actions */}
        <div className="post-actions">
          <button className="action-btn">👍 Like</button>
          <button className="action-btn">💬 Comment</button>
          <button className="action-btn">↗️ Repost</button>
        </div>
      </div>
    );
  }

  // Fallback for other platforms
  return (
    <div className="generic-preview">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default PlatformPreview;