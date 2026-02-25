import { useState, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
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
    <div className="app">
      <Header onDashboardClick={handleDashboardToggle} />
      <div className="app-container">
        <Sidebar
          messages={messages}
          onNewChat={handleNewChat}
          onCreateTicket={handleTicketFormToggle}
          showTicketForm={showTicketForm}
        />
        <div className="main-content">
          {showDashboard ? (
            <Dashboard onBack={() => setShowDashboard(false)} />
          ) : showTicketForm ? (
            <TicketForm onClose={() => setShowTicketForm(false)} />
          ) : (
            <Chat
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
      <Route path="/" element={<ChatApp />} />
      <Route path="/helpdesk" element={<HelpdeskPortal />} />
    </Routes>
  )
}

export default App
