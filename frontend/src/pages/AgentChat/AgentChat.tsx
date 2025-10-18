// frontend/src/pages/AgentChat/AgentChat.tsx
import React from 'react';
import AgentChatPanel from '../../components/AgentChat/AgentChat';
import './AgentChat.css';


const AgentChatPage = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">AI Content Agent</h1>
      <p className="text-gray-600 mb-8">
        Ask me to find or reuse your past content. Examples:
        <br />
        • “Find my post about AI pricing”
        <br />
        • “Turn that into a LinkedIn post”
      </p>
      <AgentChatPanel />
    </div>
  );
};

export default AgentChatPage;