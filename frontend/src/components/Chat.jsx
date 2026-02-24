import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../services/api'
import './Chat.css'

function Chat({ messages, setMessages, onCreateTicket }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Check for ticket creation intent
    const ticketPhrases = ['create a ticket', 'create ticket', 'raise a ticket', 'submit a ticket', 'open a ticket', 'new ticket']
    if (ticketPhrases.some(phrase => input.toLowerCase().includes(phrase))) {
      onCreateTicket()
      setLoading(false)
      return
    }

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const response = await sendChatMessage(input.trim(), history)
      
      const assistantMessage = { 
        role: 'assistant', 
        content: response.response,
        sources: response.sources 
      }
      setMessages([...newMessages, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      let errText = 'Sorry, I encountered an error processing your request. Please try again.'
      if (error?.response?.data?.detail) {
        errText = String(error.response.data.detail)
      } else if (error?.response?.status === 503) {
        errText = 'Backend is still loading. Please wait a moment and try again.'
      } else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
        errText = 'Cannot reach the backend. Make sure the API is running: python backend/api.py'
      }
      setMessages([...newMessages, { role: 'assistant', content: errText }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-section-title">💬 Chat-Interface view</div>
      
      {messages.length === 0 ? (
        <div className="welcome-card">
          <div className="welcome-icon">🤖</div>
          <h2 className="welcome-title">Welcome to Cognida.ai IT Help Desk</h2>
          <p className="welcome-subtitle">Your intelligent IT support assistant — available 24/7</p>
          <div className="welcome-divider"></div>
          <div className="welcome-features">
            <div className="welcome-feature-item">
              <span className="feature-icon">💬</span>
              <div>
                <strong>Ask IT Questions</strong>
                <p>Get instant answers on passwords, VPN, email, hardware and more</p>
              </div>
            </div>
            <div className="welcome-feature-item">
              <span className="feature-icon">🎫</span>
              <div>
                <strong>Raise a Ticket</strong>
                <p>Can't find your answer? Create a support ticket in seconds</p>
              </div>
            </div>
            <div className="welcome-feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <strong>Track Your Tickets</strong>
                <p>View all tickets and their status from the dashboard</p>
              </div>
            </div>
          </div>
          <p className="welcome-hint">Type a question below or click <strong>Create a ticket</strong> to get started</p>
          <button className="create-ticket-btn" onClick={onCreateTicket}>
            Create a ticket
          </button>
        </div>
      ) : (
        <div className="messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}-message`}>
              <strong>{msg.role === 'user' ? '👤' : '🤖'} {msg.role === 'user' ? 'User' : 'Assistant'}:</strong>
              <br />
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant-message typing-indicator">
              <strong>🤖 Assistant:</strong>
              <span className="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything"
          className="chat-input"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          Send
        </button>
      </form>
    </div>
  )
}

export default Chat
