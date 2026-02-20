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
      <button className="dashboard-btn" onClick={onDashboardClick}>
        📊 Ticket Dashboard
      </button>
    </div>
  )
}

export default Header
