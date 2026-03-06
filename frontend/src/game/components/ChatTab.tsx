import React, { useEffect, useRef, useState } from 'react';
import { chatClient, type ChatMessage } from '../services/chatClient';
import './ChatTab.css';

const ChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatClient.connect();

    const unsub = chatClient.onMessage((msg) => {
      if (msg.type === 'history' && msg.messages) {
        setMessages(msg.messages);
      } else if (msg.type === 'message' || msg.type === 'system') {
        setMessages(prev => [...prev.slice(-199), msg]);
      } else if (msg.type === 'system_broadcast') {
        setMessages(prev => [...prev.slice(-199), {
          ...msg, type: 'system_broadcast', content: msg.detail || msg.content, is_system: true,
        }]);
      } else if (msg.type === 'error') {
        setMessages(prev => [...prev, { type: 'system', content: msg.message || 'Error', is_system: true }]);
      }
      setConnected(chatClient.connected);
    });

    const connCheck = setInterval(() => setConnected(chatClient.connected), 3000);

    return () => {
      unsub();
      clearInterval(connCheck);
      chatClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    chatClient.send(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-tab">
      <div className="chat-header">
        <span>Global Chat</span>
        <span className={`chat-status ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="chat-messages" ref={containerRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.is_system ? 'system' : ''} ${msg.type === 'system_broadcast' ? 'broadcast' : ''}`}>
            {msg.type === 'system_broadcast' ? (
              <span className="chat-broadcast-text">⚡ {msg.content || msg.detail}</span>
            ) : msg.is_system ? (
              <span className="chat-system-text">{msg.content}</span>
            ) : (
              <>
                <span className="chat-sender">
                  [{msg.player_name} Lv.{msg.player_level}]
                </span>
                <span className="chat-content">{msg.content}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={500}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!connected}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatTab;
