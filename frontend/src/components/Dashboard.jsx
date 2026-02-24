import { useState, useEffect } from 'react'
import { getDashboardStats, getAllTickets } from '../services/api'
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import './Dashboard.css'

const COLORS = ['#1e3a5f', '#3f51b5', '#5c6bc0', '#9fa8da']

function Dashboard({ onBack }) {
  const [stats, setStats] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setError(null)
    try {
      const [statsData, ticketsData] = await Promise.all([
        getDashboardStats(),
        getAllTickets()
      ])
      setStats(statsData)
      setTickets(ticketsData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      const msg = err?.response?.data?.detail || err?.message || String(err)
      const isNetwork = err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')
      setError({
        message: msg,
        hint: isNetwork ? 'Make sure the FastAPI backend is running: python backend/api.py' : null
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>
  }

  if (!stats) {
    return (
      <div className="dashboard-error">
        <h3>Failed to load dashboard data</h3>
        {error && (
          <>
            <p className="error-detail">{error.message}</p>
            {error.hint && <p className="error-hint">{error.hint}</p>}
            {!error.hint && <p className="error-hint">Check browser console (F12) for details.</p>}
          </>
        )}
        <button className="retry-btn" onClick={() => { setLoading(true); loadDashboard(); }}>
          Retry
        </button>
        <button className="back-btn" onClick={onBack} style={{ marginLeft: 8 }}>
          ← Back to chat
        </button>
      </div>
    )
  }

  const priorityData = Object.entries(stats.by_priority).map(([key, value]) => ({
    name: key,
    value: value
  }))

  const statusData = Object.entries(stats.by_status).map(([key, value]) => ({
    name: key,
    value: value
  })).filter(item => item.value > 0)

  const categoryData = Object.entries(stats.by_category).map(([key, value]) => ({
    name: key,
    value: value
  })).filter(item => item.value > 0)

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Helpdesk Ticket Management System Dashboard</h1>
        <p className="dashboard-subtitle">
          This dashboard illustrates facts and figures related to ticket management.
          It includes overdue tasks, tickets due today, open tickets, tickets on hold, unassigned tickets, and more.
        </p>
      </div>

      <div className="kpi-cards">
        <div className="kpi-card">
          <div className="kpi-header">Overdue Tasks</div>
          <div className="kpi-value">{stats.overdue}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">Tickets Due Today</div>
          <div className="kpi-value">{stats.due_today}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">Open Tickets</div>
          <div className="kpi-value">{stats.open}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">Tickets on Hold</div>
          <div className="kpi-value">{stats.on_hold}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">Unassigned Tickets</div>
          <div className="kpi-value">{stats.unassigned}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header">All Tickets</div>
          <div className="kpi-value">{stats.all}</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-panel">
          <div className="chart-header">Unresolved Tickets by Priority</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-header">Unresolved Tickets by Status</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3f51b5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel">
          <div className="chart-header">New & Open Tickets Category-wise</div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#5c6bc0" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <h2 className="tickets-title">Ticket List</h2>
      {tickets.length === 0 ? (
        <p className="no-tickets">No tickets have been raised yet.</p>
      ) : (
        <div className="tickets-list">
          {tickets.map((ticket) => (
            <details key={ticket.id} className="ticket-item">
              <summary>
                <strong>{ticket.id}</strong> — {ticket.subject} ({ticket.priority})
              </summary>
              <div className="ticket-details">
                <p><strong>Subject:</strong> {ticket.subject}</p>
                <p><strong>Description:</strong> {ticket.description}</p>
                <p><strong>Priority:</strong> {ticket.priority} | <strong>Status:</strong> {ticket.status}</p>
                <p className="ticket-date">Created: {new Date(ticket.created_at).toLocaleString()}</p>
              </div>
            </details>
          ))}
        </div>
      )}

      <button className="back-btn" onClick={onBack}>← Back to chat</button>
    </div>
  )
}

export default Dashboard
