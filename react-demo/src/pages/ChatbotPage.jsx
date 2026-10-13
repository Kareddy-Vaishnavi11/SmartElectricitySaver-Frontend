// AI Chatbot page — message history, typing indicator, LLM API via backend (Week 7–8)
import { useState, useRef, useEffect } from 'react';
import api from '../api';

const WELCOME = {
  role: 'bot',
  text: '👋 Hi! I\'m your Smart Electricity AI assistant. Ask me anything about your electricity bills, appliances, or energy-saving tips.',
};

export default function ChatbotPage() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setTyping(true);

    try {
      // Build conversation history for context injection (Week 7–8 RAG)
      const history = messages
        .filter((m) => m.role !== 'bot' || m !== WELCOME)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await api.post('/api/chat', {
        message: text,
        history,
      });

      const botReply = res.data?.reply || res.data?.message || 'Sorry, I could not process that.';
      setMessages((prev) => [...prev, { role: 'bot', text: botReply }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Could not reach AI service.';
      setMessages((prev) => [...prev, { role: 'bot', text: `⚠️ ${errMsg}` }]);
    } finally {
      setTyping(false);
    }
  }

  function clearChat() {
    setMessages([WELCOME]);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🤖 AI Assistant</h1>
        <button className="btn-secondary" onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={'chat-bubble ' + msg.role}>
              {msg.text}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="chat-bubble bot typing">
              AI is thinking…
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-row" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your electricity usage, bills, or tips…"
            disabled={typing}
          />
          <button type="submit" className="btn-primary" disabled={typing || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: '#78857d' }}>
        💡 Try: "What appliance uses the most power?" · "How do I reduce my bill?" · "Compare my last two months."
      </p>
    </div>
  );
}
