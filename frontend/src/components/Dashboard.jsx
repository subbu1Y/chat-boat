import { useState, useEffect } from 'react'
import { getDashboardStats, getAllTickets, updateTicketStatus } from '../services/api'
import {
  PieChart, Pie, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const PIE_COLORS  = ['#4f46e5', '#5a67d8', '#818cf8', '#c7d2fe']
const BAR_COLORS  = { Priority: '#4f46e5', Status: '#5c6bc0', Category: '#818cf8' }
const STATUSES    = ['Open', 'Pending', 'Resolved', 'Closed']

// ── SLA ─────────────────────────────────────────────────────────────────────
// Resolution targets in hours per priority
const SLA_TARGETS = { High: 4, Medium: 24, Low: 72 }

function getSLAInfo(ticket) {
  const resolved = ['Resolved', 'Closed'].includes(ticket.status)
  const created  = new Date(ticket.created_at)
  const now      = new Date()
  const elapsed  = (now - created) / 3_600_000          // hours elapsed
  const target   = SLA_TARGETS[ticket.priority] || 24
  const pct      = Math.min((elapsed / target) * 100, 100)

  if (resolved) {
    return { status: 'met', label: 'SLA Met', pct: 100, remaining: null,
             barColor: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' }
  }
  if (pct >= 100) {
    const overBy = elapsed - target
    return { status: 'breached', label: 'Breached', pct: 100, remaining: null,
             overBy, barColor: '#ef4444', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
  }
  if (pct >= 75) {
    return { status: 'at-risk', label: 'At Risk', pct, remaining: target - elapsed,
             barColor: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-400' }
  }
  return { status: 'on-track', label: 'On Track', pct, remaining: target - elapsed,
           barColor: '#6366f1', bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-400' }
}

function fmtHours(h) {
  if (h == null) return '—'
  if (h < 1)    return `${Math.round(h * 60)} min`
  if (h < 24)   return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} d`
}

function computeSLAStats(tickets) {
  let met = 0, breached = 0, atRisk = 0, onTrack = 0
  const byPriority = {
    High:   { onTrack: 0, atRisk: 0, breached: 0, met: 0 },
    Medium: { onTrack: 0, atRisk: 0, breached: 0, met: 0 },
    Low:    { onTrack: 0, atRisk: 0, breached: 0, met: 0 },
  }
  tickets.forEach(t => {
    const sla = getSLAInfo(t)
    const p   = byPriority[t.priority] || byPriority.Medium
    if      (sla.status === 'met')      { met++;      p.met++ }
    else if (sla.status === 'breached') { breached++; p.breached++ }
    else if (sla.status === 'at-risk')  { atRisk++;   p.atRisk++ }
    else                                { onTrack++;  p.onTrack++ }
  })
  const compliance = tickets.length > 0 ? Math.round((met / tickets.length) * 100) : 100
  return { met, breached, atRisk, onTrack, compliance, byPriority }
}

function SLABadge({ ticket }) {
  const sla = getSLAInfo(ticket)
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sla.bg} ${sla.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sla.dot}`} />
        {sla.label}
      </span>
      {sla.status === 'breached' && sla.overBy != null && (
        <span className="text-xs text-red-400 pl-1">+{fmtHours(sla.overBy)} over</span>
      )}
      {(sla.status === 'on-track' || sla.status === 'at-risk') && sla.remaining != null && (
        <span className="text-xs text-gray-400 pl-1">{fmtHours(sla.remaining)} left</span>
      )}
    </div>
  )
}

function SLAProgressBar({ ticket }) {
  const sla = getSLAInfo(ticket)
  if (sla.status === 'met') return null
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all"
        style={{ width: `${sla.pct}%`, backgroundColor: sla.barColor }}
      />
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

const ASSIGNEES = {
  'aditya.kovoor@cognida.ai':              { name: 'Aditya',        initials: 'AK', color: 'bg-violet-100 text-violet-700' },
  'subrahmanyam.pillalamarri@cognida.ai':  { name: 'Subrahmanyam',  initials: 'SP', color: 'bg-blue-100 text-blue-700' },
}

function AssigneeBadge({ email }) {
  if (!email) return <span className="text-gray-300 text-xs">Unassigned</span>
  const a = ASSIGNEES[email]
  if (!a) return <span className="text-xs text-gray-500 truncate max-w-32" title={email}>{email.split('@')[0]}</span>
  return (
    <div className="flex items-center gap-1.5" title={email}>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${a.color}`}>
        {a.initials}
      </span>
      <span className="text-xs text-gray-700 font-medium">{a.name}</span>
    </div>
  )
}

const PRIORITY_BADGE = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-800',
  Low:    'bg-green-100 text-green-700',
}
const STATUS_BADGE = {
  Open:     'bg-blue-100 text-blue-800',
  Pending:  'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-700',
  Closed:   'bg-gray-100 text-gray-600',
}

function Badge({ label, palette }) {
  const cls = palette?.[label] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function KpiCard({ label, value, accent }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${accent} p-5 flex flex-col gap-1`}>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-3xl font-bold text-gray-800">{value}</span>
    </div>
  )
}

function StatusDropdown({ ticket, onChange }) {
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    const newStatus = e.target.value
    setLoading(true)
    try {
      await updateTicketStatus(ticket.id, newStatus)
      onChange(ticket.id, newStatus)
    } catch (err) {
      alert('Failed to update status: ' + (err?.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={ticket.status}
      onChange={handle}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 cursor-pointer"
    >
      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export default function Dashboard({ onBack }) {
  const [stats, setStats]     = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [search, setSearch]   = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus]     = useState('')

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setError(null)
    setLoading(true)
    try {
      const [s, t] = await Promise.all([getDashboardStats(), getAllTickets()])
      setStats(s)
      setTickets(t)
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || String(err)
      const hint = (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network'))
        ? 'Make sure the FastAPI backend is running: python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload'
        : (err?.code === 'ECONNABORTED'
          ? 'Request timed out. Backend may be busy; try Retry once.'
          : null)
      setError({ message: msg, hint })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (ticketId, newStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to load dashboard</h3>
          <p className="text-sm text-red-500 mb-1">{error.message}</p>
          {error.hint && <p className="text-xs text-gray-400 mb-4">{error.hint}</p>}
          <div className="flex gap-2 justify-center">
            <button onClick={loadDashboard} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              Retry
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  const priorityData  = Object.entries(stats.by_priority).map(([name, value]) => ({ name, value }))
  const statusData    = Object.entries(stats.by_status).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
  const categoryData  = Object.entries(stats.by_category).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

  const sla = computeSLAStats(tickets)
  const slaChartData = Object.entries(sla.byPriority).map(([priority, d]) => ({
    priority,
    'On Track': d.onTrack,
    'At Risk':  d.atRisk,
    'Breached': d.breached,
    'Met':      d.met,
  }))

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    const matchP = !filterPriority || t.priority === filterPriority
    const matchS = !filterStatus  || t.status === filterStatus
    return matchSearch && matchP && matchS
  })

  const kpis = [
    { label: 'Overdue',         value: stats.overdue,     accent: 'border-red-500' },
    { label: 'Due Today',       value: stats.due_today,   accent: 'border-orange-400' },
    { label: 'Open',            value: stats.open,        accent: 'border-blue-500' },
    { label: 'On Hold',         value: stats.on_hold,     accent: 'border-yellow-400' },
    { label: 'Unassigned',      value: stats.unassigned,  accent: 'border-purple-400' },
    { label: 'Total Tickets',   value: stats.all,         accent: 'border-indigo-500' },
  ]

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-gray-50">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Helpdesk Ticket Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Ticket analytics and management in real time</p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          ← Back to Chat
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── SLA Dashboard ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <h2 className="text-base font-bold text-gray-800">SLA Dashboard</h2>
            <p className="text-xs text-gray-400">High ≤ 4 h · Medium ≤ 24 h · Low ≤ 72 h</p>
          </div>
        </div>

        {/* SLA KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
          {/* Compliance */}
          <div className="flex flex-col items-center justify-center bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <span className="text-3xl font-extrabold text-indigo-600">{sla.compliance}%</span>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mt-1">SLA Compliance</span>
            <div className="w-full bg-indigo-100 rounded-full h-2 mt-3">
              <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${sla.compliance}%` }} />
            </div>
          </div>
          {/* Breached */}
          <div className="flex flex-col items-center justify-center bg-red-50 rounded-xl p-4 border border-red-100">
            <span className="text-3xl font-extrabold text-red-600">{sla.breached}</span>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide mt-1">Breached</span>
            <span className="text-xs text-gray-400 mt-1">Past deadline</span>
          </div>
          {/* At Risk */}
          <div className="flex flex-col items-center justify-center bg-orange-50 rounded-xl p-4 border border-orange-100">
            <span className="text-3xl font-extrabold text-orange-500">{sla.atRisk}</span>
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide mt-1">At Risk</span>
            <span className="text-xs text-gray-400 mt-1">≥ 75% of time used</span>
          </div>
          {/* On Track / Met */}
          <div className="flex flex-col items-center justify-center bg-green-50 rounded-xl p-4 border border-green-100">
            <span className="text-3xl font-extrabold text-green-600">{sla.onTrack + sla.met}</span>
            <span className="text-xs font-semibold text-green-500 uppercase tracking-wide mt-1">On Track / Met</span>
            <span className="text-xs text-gray-400 mt-1">{sla.met} resolved, {sla.onTrack} active</span>
          </div>
        </div>

        {/* SLA by priority chart */}
        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">SLA Status by Priority</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={slaChartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="priority" type="category" width={60} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="On Track" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="At Risk"  stackId="a" fill="#f97316" />
              <Bar dataKey="Breached" stackId="a" fill="#ef4444" />
              <Bar dataKey="Met"      stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">By Priority</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {priorityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">By Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BAR_COLORS.Status} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">By Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={BAR_COLORS.Category} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-base font-semibold text-gray-800 flex-1">All Tickets ({filtered.length})</h2>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by ID or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-full md:w-52"
          />

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">ID</th>
                  <th className="px-5 py-3 text-left font-semibold">Subject</th>
                  <th className="px-5 py-3 text-left font-semibold">Category</th>
                  <th className="px-5 py-3 text-left font-semibold">Priority</th>
                  <th className="px-5 py-3 text-left font-semibold">Assigned To</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Created</th>
                  <th className="px-5 py-3 text-left font-semibold">SLA</th>
                  <th className="px-5 py-3 text-left font-semibold">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-indigo-600 font-semibold">{ticket.id}</td>
                    <td className="px-5 py-3 text-gray-700 max-w-xs truncate" title={ticket.subject}>{ticket.subject}</td>
                    <td className="px-5 py-3 text-gray-500">{ticket.category || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge label={ticket.priority} palette={PRIORITY_BADGE} />
                    </td>
                    <td className="px-5 py-3">
                      <AssigneeBadge email={ticket.assigned_to} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={ticket.status} palette={STATUS_BADGE} />
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 min-w-[120px]">
                      <SLABadge ticket={ticket} />
                      <SLAProgressBar ticket={ticket} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusDropdown ticket={ticket} onChange={handleStatusChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
