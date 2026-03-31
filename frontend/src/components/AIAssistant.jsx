import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai/ask';

export default function AIAssistant({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(API_URL, { prompt: input });
      const assistantMessage = { role: 'assistant', text: response.data.answer };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Sorry, I encountered an error. Please check your OpenAI API key in the server configuration.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h2>AI Assistant</h2>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="chat-content">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="message assistant loading">
            <p>Thinking...</p>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="chat-form">
        <input 
          type="text" 
          placeholder="Ask something..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  );
}
