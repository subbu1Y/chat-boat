import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../services/api'

const BOT_AVATAR = (
  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow"
    style={{ background: 'linear-gradient(135deg,#5a67d8,#6b46c1)' }}>
    AI
  </div>
)

const USER_AVATAR = (
  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold shadow"
    style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)' }}>
    U
  </div>
)

const QUICK_PROMPTS = [
  { icon: '🔑', text: 'Reset my password' },
  { icon: '🌐', text: 'VPN not connecting' },
  { icon: '💻', text: 'Laptop won\'t turn on' },
  { icon: '📧', text: 'Email not working' },
  { icon: '🖨️', text: 'Printer issue' },
  { icon: '📶', text: 'Slow internet' },
]

function TypingBubble() {
  return (
    <div className="flex items-end gap-2 mb-4">
      {BOT_AVATAR}
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1"
        style={{ background: 'var(--bubble-bot)', border: '1px solid var(--bubble-bot-border)' }}>
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  )
}

function MessageBubble({ msg, isLast }) {
  const isUser = msg.role === 'user'
  const time = msg.time || ''

  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {isUser ? USER_AVATAR : BOT_AVATAR}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div
          className={`px-4 py-3 shadow-sm text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'rounded-2xl rounded-br-sm text-white'
              : 'rounded-2xl rounded-bl-sm'
            }`}
          style={isUser
            ? { background: 'linear-gradient(135deg,#5a67d8,#6b46c1)', color: '#fff' }
            : { background: 'var(--bubble-bot)', border: '1px solid var(--bubble-bot-border)', color: 'var(--text-main)' }
          }
        >
          {msg.content}
        </div>
        {time && (
          <span className="text-xs mt-1 px-1 opacity-50" style={{ color: 'var(--text-muted)' }}>{time}</span>
        )}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {msg.sources.slice(0, 3).map((src, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--source-bg)', color: 'var(--source-text)', border: '1px solid var(--source-border)' }}>
                📄 {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WelcomeScreen({ onCreateTicket, onQuickPrompt }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
      {/* Bot avatar hero */}
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-5 shadow-lg"
        style={{ background: 'linear-gradient(135deg,#5a67d8,#6b46c1)' }}>
        🤖
      </div>
      <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>
        Welcome to Cognida.ai IT Help Desk
      </h2>
      <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
        Your intelligent IT support assistant — available 24/7
      </p>
      <div className="w-12 h-0.5 rounded-full my-4" style={{ background: 'linear-gradient(90deg,#5a67d8,#6b46c1)' }} />

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-6 max-w-lg">
        {[
          { icon: '💬', label: 'Ask IT Questions' },
          { icon: '🎫', label: 'Raise a Ticket' },
          { icon: '📊', label: 'Track Tickets' },
        ].map(f => (
          <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm"
            style={{ background: 'var(--pill-bg)', border: '1px solid var(--pill-border)', color: 'var(--text-main)' }}>
            <span>{f.icon}</span> {f.label}
          </div>
        ))}
      </div>

      {/* Quick prompt chips */}
      <p className="text-xs mb-3 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Common issues — tap to ask
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-7 max-w-xl">
        {QUICK_PROMPTS.map(p => (
          <button key={p.text} onClick={() => onQuickPrompt(p.text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all hover:scale-105 hover:shadow-md"
            style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)', color: 'var(--text-main)' }}>
            <span>{p.icon}</span> {p.text}
          </button>
        ))}
      </div>

      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
        Or raise a support ticket directly
      </p>
      <button onClick={onCreateTicket}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
        style={{ background: 'linear-gradient(135deg,#5a67d8,#6b46c1)' }}>
        🎫 Create a Ticket
      </button>
    </div>
  )
}

function Chat({ messages, setMessages, onCreateTicket, sessionId }) {
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef      = useRef(null)
  const inputRef            = useRef(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages, loading])

  const sendMessage = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = { role: 'user', content: trimmed, time: now }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    inputRef.current?.focus()

    const ticketPhrases = ['create a ticket', 'create ticket', 'raise a ticket', 'submit a ticket', 'open a ticket', 'new ticket']
    if (ticketPhrases.some(p => trimmed.toLowerCase().includes(p))) {
      onCreateTicket()
      setLoading(false)
      return
    }

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const response = await sendChatMessage(trimmed, history, sessionId)
      const botMsg = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages([...updated, botMsg])
    } catch (error) {
      let errText = 'Sorry, I encountered an error. Please try again.'
      if (error?.response?.data?.detail)         errText = String(error.response.data.detail)
      else if (error?.response?.status === 503)  errText = 'Backend is still loading. Please wait a moment and try again.'
      else if (error?.code === 'ERR_NETWORK')    errText = 'Cannot reach the backend. Make sure the API is running.'
      setMessages([...updated, { role: 'assistant', content: errText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input) }
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }

  return (
    <div className="chat-root" style={{ position: 'relative' }}>

      {/* Floating Raise a Ticket button */}
      <button
        onClick={onCreateTicket}
        title="Raise a Ticket"
        className="fab-ticket"
      >
        🎫
        <span className="fab-label">Raise a Ticket</span>
      </button>

      {/* Messages area */}
      <div className="chat-messages">
        {messages.length === 0
          ? <WelcomeScreen onCreateTicket={onCreateTicket} onQuickPrompt={sendMessage} />
          : (
            <div className="px-4 py-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} isLast={i === messages.length - 1} />
              ))}
              {loading && <TypingBubble />}
              <div ref={messagesEndRef} />
            </div>
          )
        }
        {messages.length > 0 && <div ref={messagesEndRef} />}
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about IT…"
            disabled={loading}
            className="chat-input-field"
          />
          <button type="submit" disabled={loading}
            className="send-btn"
            title="Send message">
            {loading
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </form>
        <p className="text-center text-xs mt-2 opacity-40" style={{ color: 'var(--text-muted)' }}>
          Press <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--chip-bg)' }}>Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded text-xs" style={{ background: 'var(--chip-bg)' }}>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}

export default Chat
