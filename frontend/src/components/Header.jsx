import './Header.css'

function Header({ onDashboardClick, darkMode, onToggleTheme }) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="header-logo">
          <img src="/logo.png" alt="Cognida" />
        </div>
      </div>
      <div className="header-center">
        <h1 className="header-title">Cognida.ai IT Help Desk Chatbot</h1>
        <p className="header-tagline">Powered by RAG &amp; Groq LLM</p>
      </div>
      <div className="header-right flex items-center gap-2">
        {/* Dark / Light toggle */}
        <button
          onClick={onToggleTheme}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="theme-toggle-btn"
        >
          {darkMode ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              Light Mode
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              Dark Mode
            </>
          )}
        </button>
        <button className="dashboard-btn" onClick={onDashboardClick}>
          📊 Ticket Dashboard
        </button>
      </div>
    </div>
  )
}


export default Header
