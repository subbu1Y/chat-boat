import { Link } from 'react-router-dom'
import './Header.css'

function Header({ onDashboardClick }) {
  return (
    <div className="header">
      <div className="header-content">
        <div className="header-logo">
          <img src="/logo.png" alt="Cognida" />
        </div>
        <h1 className="header-title">Cognida.ai IT Help Desk Chatbot</h1>
        <p className="header-tagline">Powered by RAG & Groq LLM</p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/helpdesk"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors"
        >
          🎫 Raise a Ticket
        </Link>
        <button className="dashboard-btn" onClick={onDashboardClick}>
          📊 Ticket Dashboard
        </button>
      </div>
    </div>
  )
}

export default Header
