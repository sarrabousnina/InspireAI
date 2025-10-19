// src/pages/AgentChat.tsx
import React from 'react';
import ChatWindow from '../../components/ChatWindow/ChatWindow';

const AgentChatPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a1a1a' }}>
          👋 Talk to Your AI Agent
        </h1>
        <p style={{ color: '#666', fontSize: '1rem' }}>
          Ask me anything — I’m here to help!
        </p>
      </div>
      <ChatWindow />
    </div>
  );
};

export default AgentChatPage;