// src/components/ChatWindow.tsx
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'thinking' | 'final'; // 👈 Add type for better rendering
}

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'You must be logged in to chat with the agent.' },
      ]);
      return;
    }

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: trimmedInput }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ✅ Now authenticated!
        },
        body: JSON.stringify({ message: trimmedInput }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add thinking steps first
        if (data.thinking) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.thinking, type: 'thinking' }
          ]);
        }

        // Then add final answer
        if (data.final_answer) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.final_answer, type: 'final' }
          ]);
        }
      } else {
        throw new Error(data.detail || 'Failed to get response from agent');
      }
    } catch (err) {
      console.error('Agent chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Please try again or check your connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="chat-container"
      style={{
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1rem',
        backgroundColor: '#fff',
      }}
    >
      <div
        className="chat-messages"
        style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.role === 'user' ? 'right' : 'left',
              margin: '0.5rem 0',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? '#e3f2fd' : (
                msg.type === 'thinking' ? '#fffacd' : '#f5f5f5'
              ),
              maxWidth: '80%',
              wordBreak: 'break-word',
              fontSize: msg.type === 'thinking' ? '0.9rem' : '1rem',
              fontStyle: msg.type === 'thinking' ? 'italic' : 'normal',
              borderLeft: msg.type === 'thinking' ? '4px solid #ffc107' : 'none',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{ textAlign: 'left', padding: '0.75rem', fontStyle: 'italic', color: '#666' }}>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '1rem',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoading || !input.trim() ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;