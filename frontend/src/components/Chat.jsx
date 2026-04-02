import { useState, useRef, useEffect, useCallback } from 'react'
import { sendChatMessage } from '../services/api'
import './Chat.css'

/* ─── Quick suggestion chips ─────────────────────────────────── */
const SUGGESTIONS = [
  { icon: '🔑', text: 'Reset my password' },
  { icon: '🌐', text: 'VPN not connecting' },
  { icon: '💻', text: "Laptop won't turn on" },
  { icon: '📧', text: 'Email not working' },
  { icon: '🖨️', text: 'Printer issue' },
  { icon: '📶', text: 'Slow internet' },
]

/* ─── Avatars ─────────────────────────────────────────────────── */
function BotAvatar() {
  return (
    <div className="avatar avatar-bot" aria-label="AI assistant">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <line x1="12" y1="3" x2="12" y2="7"/>
        <circle cx="9" cy="15" r="1" fill="currentColor"/>
        <circle cx="15" cy="15" r="1" fill="currentColor"/>
      </svg>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="avatar avatar-user" aria-label="You">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
      </svg>
    </div>
  )
}

/* ─── Typing indicator ────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="msg-row msg-row--bot">
      <BotAvatar />
      <div className="bubble bubble--bot typing-bubble">
        <span className="dot" /><span className="dot" /><span className="dot" />
      </div>
    </div>
  )
}

/* ─── Single message bubble ───────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg-row ${isUser ? 'msg-row--user' : 'msg-row--bot'}`}>
      {!isUser && <BotAvatar />}
      <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--bot'}`}>
        <p className="bubble-text">{msg.content}</p>
        {msg.sources && msg.sources.length > 0 && (
          <div className="source-chips">
            {msg.sources.slice(0, 3).map((s, i) => (
              <span key={i} className="source-chip">📄 {s}</span>
            ))}
          </div>
        )}
        {msg.time && <span className="bubble-time">{msg.time}</span>}
      </div>
      {isUser && <UserAvatar />}
    </div>
  )
}

/* ─── Error banner ────────────────────────────────────────────── */
function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-icon">⚠️</span>
      <span className="error-text">{message}</span>
      <button className="error-close" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}

/* ─── Welcome / empty state ───────────────────────────────────── */
function WelcomeScreen({ onSuggestion, onCreateTicket }) {
  return (
    <div className="welcome">
      {/* Glow orb */}
      <div className="welcome-orb" aria-hidden="true" />

      <div className="welcome-card">
        <div className="welcome-icon-wrap">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            <line x1="12" y1="3" x2="12" y2="7"/>
            <circle cx="9" cy="15" r="1" fill="white"/>
            <circle cx="15" cy="15" r="1" fill="white"/>
          </svg>
        </div>

        <h1 className="welcome-title">Cognida.ai IT Help Desk</h1>
        <p className="welcome-sub">Your intelligent IT assistant — available 24/7</p>

        <div className="welcome-divider" />

        {/* Feature badges */}
        <div className="feature-badges">
          {[
            { icon: '⚡', text: 'Instant answers' },
            { icon: '🛡️', text: 'Secure & private' },
            { icon: '🎫', text: 'Ticket support' },
          ].map(b => (
            <div key={b.text} className="feature-badge">
              <span>{b.icon}</span> {b.text}
            </div>
          ))}
        </div>

        {/* Suggestion chips */}
        <p className="chips-label">Common issues — tap to ask</p>
        <div className="chips-grid">
          {SUGGESTIONS.map(s => (
            <button key={s.text} className="chip" onClick={() => onSuggestion(s.text)}>
              <span className="chip-icon">{s.icon}</span>
              <span>{s.text}</span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <p className="cta-hint">Need hands-on support?</p>
        <button className="cta-btn" onClick={onCreateTicket}>
          🎫 Create a Support Ticket
        </button>
      </div>
    </div>
  )
}

/* ─── Main Chat component ─────────────────────────────────────── */
export default function Chat({ darkMode, messages, setMessages, onCreateTicket, sessionId }) {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const bottomRef             = useRef(null)
  const inputRef              = useRef(null)
  const textareaRef           = useRef(null)

  /* Auto-scroll on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Auto-resize textarea */
  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [])

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    setError(null)
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg = { role: 'user', content: trimmed, time: now }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)
    inputRef.current?.focus()

    /* Ticket intent detection */
    const ticketPhrases = ['create a ticket', 'create ticket', 'raise a ticket', 'submit a ticket', 'open a ticket', 'new ticket']
    if (ticketPhrases.some(p => trimmed.toLowerCase().includes(p))) {
      onCreateTicket()
      setLoading(false)
      return
    }

    try {
      const history  = messages.map(m => ({ role: m.role, content: m.content }))
      const response = await sendChatMessage(trimmed, history, sessionId)
      const botMsg   = {
        role: 'assistant',
        content: response.response,
        sources: response.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages([...updated, botMsg])
    } catch (err) {
      let msg = 'Sorry, something went wrong. Please try again.'
      if (err?.response?.data?.detail)        msg = String(err.response.data.detail)
      else if (err?.response?.status === 503) msg = 'Backend is still loading. Please wait a moment.'
      else if (err?.code === 'ERR_NETWORK')   msg = 'Cannot reach the server. Make sure the backend is running.'
      else if (err?.code === 'ECONNABORTED')  msg = 'Request timed out. The backend may be busy.'
      setError(msg)
      /* Still show error as bot message so it's in the thread */
      setMessages([...updated, {
        role: 'assistant', content: msg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, setMessages, onCreateTicket, sessionId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className={`chat-shell ${darkMode ? 'dark' : 'light'}`}>

      {/* Error banner */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* ── FAB: Raise Ticket ── */}
      <button className="fab" onClick={onCreateTicket} title="Raise a Ticket" aria-label="Raise a Ticket">
        🎫
        <span className="fab-text">Raise Ticket</span>
      </button>

      {/* ── Messages area ── */}
      <div className="chat-body" role="log" aria-live="polite">
        {messages.length === 0
          ? <WelcomeScreen onSuggestion={sendMessage} onCreateTicket={onCreateTicket} />
          : (
            <div className="messages-list">
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )
        }
      </div>

      {/* ── Input bar ── */}
      <div className="chat-footer">

        <div className="input-box">
          <textarea
            ref={el => { textareaRef.current = el; inputRef.current = el }}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about IT support…"
            disabled={loading}
            className="input-field"
            aria-label="Message input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="send-btn"
            aria-label="Send message"
          >
            {loading
              ? <span className="spinner" />
              : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )
            }
          </button>
        </div>

        <p className="input-hint">
          Press <kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
