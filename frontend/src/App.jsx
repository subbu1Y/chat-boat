import { useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import TicketForm from './components/TicketForm'
import HelpdeskPortal from './pages/HelpdeskPortal'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
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

const ADMIN_ROLES = ['admin', 'super-admin']

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#040D2C' }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#4361EE' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/auth/login" replace />
  return <Navigate to={ADMIN_ROLES.includes(user.role) ? '/dashboard' : '/helpdesk'} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Public auth routes */}
      <Route path="/auth/login"    element={<SignIn />} />
      <Route path="/auth/register" element={<SignUp />} />

      {/* Role-protected routes */}
      <Route
        path="/helpdesk"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <HelpdeskPortal />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={ADMIN_ROLES}>
            <ChatApp />
          </ProtectedRoute>
        }
      />

      {/* Legacy redirect — keep /userhelpdesk working */}
      <Route path="/userhelpdesk" element={<Navigate to="/helpdesk" replace />} />

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}

export default App
