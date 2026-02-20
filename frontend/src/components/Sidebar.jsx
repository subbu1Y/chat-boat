import { useState, useEffect } from 'react'
import { getTickets } from '../services/api'

function Sidebar({ messages, onNewChat, onDashboardClick, onCreateTicket, showDashboard, showTicketForm }) {
  const [recentTickets, setRecentTickets] = useState([])

  useEffect(() => {
    loadRecentTickets()
  }, [])

  const loadRecentTickets = async () => {
    try {
      const tickets = await getTickets(5)
      setRecentTickets(tickets)
    } catch (error) {
      console.error('Failed to load tickets:', error)
    }
  }

  const userMessages = messages.filter(m => m.role === 'user')

  return (
    <div className="sidebar">
      <button onClick={onNewChat}>✨ New chat</button>
      
      <hr />
      
      <h3>📋 Conversation view</h3>
      <p className="caption">Your questions to the chatbot</p>
      
      <button onClick={() => { onNewChat(); }}>🗑️ Clear conversation</button>
      
      <hr />
      
      <button onClick={onDashboardClick}>📊 Dashboard</button>
      
      {showTicketForm && (
        <button onClick={() => onCreateTicket()}>✖ Cancel</button>
      )}
      
      {showDashboard && (
        <button onClick={() => onDashboardClick()}>← Back to chat</button>
      )}
      
      <hr />
      
      <h3>📌 My tickets</h3>
      {recentTickets.length === 0 ? (
        <p className="caption">No tickets yet.</p>
      ) : (
        recentTickets.map((ticket) => (
          <p key={ticket.id} className="caption">
            <strong>{ticket.id}</strong> — {ticket.subject.substring(0, 40)}
            {ticket.subject.length > 40 ? '…' : ''}
          </p>
        ))
      )}
      
      <hr />
      
      {userMessages.length === 0 ? (
        <p className="caption">No messages yet. Start by typing a question below.</p>
      ) : (
        userMessages.map((msg, i) => (
          <div key={i} className="message-preview">
            <strong>{i + 1}.</strong> {msg.content.substring(0, 60)}
            {msg.content.length > 60 ? '…' : ''}
          </div>
        ))
      )}
    </div>
  )
}

export default Sidebar
