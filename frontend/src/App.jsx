import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import TicketForm from './components/TicketForm'
import HelpdeskPortal from './pages/HelpdeskPortal'
import './App.css'

function generateSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function ChatApp() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(() => generateSessionId())
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('appTheme')
    return saved !== 'light'
  })

  const toggleTheme = () => setDarkMode(d => {
    const next = !d
    localStorage.setItem('appTheme', next ? 'dark' : 'light')
    return next
  })

  const handleNewChat = useCallback(() => {
    setMessages([])
    setSessionId(generateSessionId())
    setShowDashboard(false)
    setShowTicketForm(false)
  }, [])

  const handleDashboardToggle = () => {
    setShowDashboard(!showDashboard)
    setShowTicketForm(false)
  }

  const handleTicketFormToggle = () => {
    setShowTicketForm(!showTicketForm)
    setShowDashboard(false)
  }

  return (
    <div className={`app${darkMode ? '' : ' light-mode'}`}>
      <Header
        onDashboardClick={handleDashboardToggle}
        darkMode={darkMode}
        onToggleTheme={toggleTheme}
        showDashboard={showDashboard}
      />
      <div className="app-container">
        <Sidebar
          messages={messages}
          onNewChat={handleNewChat}
          onCreateTicket={handleTicketFormToggle}
          showTicketForm={showTicketForm}
        />
        <div className="main-content">
          {showDashboard ? (
            <Dashboard onBack={() => setShowDashboard(false)} darkMode={darkMode} />
          ) : showTicketForm ? (
            <TicketForm onClose={() => setShowTicketForm(false)} />
          ) : (
            <Chat
              darkMode={darkMode}
              messages={messages}
              setMessages={setMessages}
              onCreateTicket={handleTicketFormToggle}
              sessionId={sessionId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/"          element={<HelpdeskPortal />} />
      <Route path="/userhelpdesk"  element={<HelpdeskPortal />} />
      <Route path="/dashboard" element={<ChatApp />} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
