import { useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import TicketForm from './components/TicketForm'
import './App.css'

function App() {
  const [showDashboard, setShowDashboard] = useState(false)
  const [showTicketForm, setShowTicketForm] = useState(false)
  const [messages, setMessages] = useState([])

  const handleNewChat = () => {
    setMessages([])
    setShowDashboard(false)
    setShowTicketForm(false)
  }

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
          onDashboardClick={handleDashboardToggle}
          onCreateTicket={handleTicketFormToggle}
          showDashboard={showDashboard}
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
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
