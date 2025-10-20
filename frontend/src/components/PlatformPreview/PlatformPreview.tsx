// src/components/PlatformPreview.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import pdp from "/pdp.png"; // ✅ Correct import
import "./PlatformPreview.css"; // Assuming you have some CSS for styling

interface PlatformPreviewProps {
  content: string;
  platform: "linkedin" | "instagram" | "facebook" | "blog";
}

const PlatformPreview: React.FC<PlatformPreviewProps> = ({ content, platform }) => {
  if (platform === "linkedin") {
    return (
      <div className="linkedin-post-card">
        {/* Post Header */}
        <div className="post-header ">
          <img
            src={pdp}
            alt="Sarah Bousnina"
            className="author-avatar"
          />
          <div className="author-info">
            <strong>Sarah Bousnina</strong>
            <span className="author-title">IT Engineering Student at ESPRIT</span>
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