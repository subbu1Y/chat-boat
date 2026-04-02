/**
 * Dashboard.jsx – Modern SaaS IT Helpdesk Dashboard
 * Tabs: Overview | Tickets | Analytics | Activity
 * Features: collapsible sidebar, KPI cards, SLA rings, charts, paginated table,
 *           activity timeline, notifications, dark-mode, closing-resolution modal.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { getDashboardStats, getAllTickets, updateTicketStatus } from '../services/api'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import './Dashboard.css'

// ─── Constants ───────────────────────────────────────────────────────────────
const SLA_TARGETS = { High: 4, Medium: 24, Low: 72 }
const STATUSES    = ['Open', 'Pending', 'Resolved', 'Closed']
const PRIORITIES  = ['High', 'Medium', 'Low']
const PAGE_SIZE   = 10

const PIE_COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#f97316']

const PRIORITY_STYLE = {
  High:   { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
  Medium: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  Low:    { bg: 'rgba(34,197,94,0.12)',   text: '#22c55e' },
}
const STATUS_STYLE = {
  Open:     { bg: 'rgba(59,130,246,0.13)',  text: '#3b82f6' },
  Pending:  { bg: 'rgba(245,158,11,0.13)', text: '#d97706' },
  Resolved: { bg: 'rgba(34,197,94,0.13)',  text: '#16a34a' },
  Closed:   { bg: 'rgba(100,116,139,0.13)', text: '#94a3b8' },
}

// ─── SLA Utilities ────────────────────────────────────────────────────────────
function getSLAInfo(ticket) {
  const resolved = ['Resolved', 'Closed'].includes(ticket.status)
  const created  = new Date(ticket.created_at)
  const elapsed  = (Date.now() - created) / 3_600_000
  const target   = SLA_TARGETS[ticket.priority] || 24
  const pct      = Math.min((elapsed / target) * 100, 100)

  if (resolved)  return { status: 'met',      label: 'Met',      pct: 100, color: '#22c55e' }
  if (pct >= 100) return { status: 'breached', label: 'Breached', pct: 100, color: '#ef4444', overBy: elapsed - target }
  if (pct >= 75)  return { status: 'at-risk',  label: 'At Risk',  pct,      color: '#f97316', remaining: target - elapsed }
  return               { status: 'on-track',  label: 'On Track', pct,      color: '#6366f1', remaining: target - elapsed }
}

function fmtHours(h) {
  if (h == null) return '—'
  if (h < 1)     return `${Math.round(h * 60)}m`
  if (h < 24)    return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

function computeSLAStats(tickets) {
  let met = 0, breached = 0, atRisk = 0, onTrack = 0
  tickets.forEach(t => {
    const s = getSLAInfo(t).status
    if      (s === 'met')      met++
    else if (s === 'breached') breached++
    else if (s === 'at-risk')  atRisk++
    else                       onTrack++
  })
  const total      = tickets.length
  const compliance = total > 0 ? Math.round((met / total) * 100) : 100
  return { met, breached, atRisk, onTrack, compliance }
}

// ─── Trend & Activity ─────────────────────────────────────────────────────────
function buildTrendData(tickets) {
  const days = 14
  const data = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      _key:     d.toISOString().slice(0, 10),
      date:     d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      Created:  0,
      Resolved: 0,
      Closed:   0,
    }
  })
  tickets.forEach(t => {
    const key   = t.created_at?.slice(0, 10)
    const entry = data.find(d => d._key === key)
    if (entry) {
      entry.Created++
      if (t.status === 'Resolved') entry.Resolved++
      if (t.status === 'Closed')   entry.Closed++
    }
  })
  return data.map(({ _key, ...rest }) => rest)
}

function buildActivity(tickets) {
  const sorted = [...tickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const events = []
  sorted.slice(0, 20).forEach(t => {
    events.push({ id: t.id + '_c', icon: '🎫', color: '#3b82f6', text: `Ticket ${t.id} created`, sub: t.subject?.slice(0, 55), time: t.created_at })
    if (t.status === 'Closed')   events.push({ id: t.id + '_cl', icon: '✅', color: '#22c55e', text: `Ticket ${t.id} closed`,   sub: t.resolution || t.subject?.slice(0, 55), time: t.created_at })
    if (t.status === 'Resolved') events.push({ id: t.id + '_r',  icon: '🔧', color: '#06b6d4', text: `Ticket ${t.id} resolved`, sub: t.subject?.slice(0, 55), time: t.created_at })
  })
  return events.slice(0, 18)
}

function fmtRelative(iso) {
  try {
    const diff = (Date.now() - new Date(iso)) / 60000
    if (diff < 1)    return 'just now'
    if (diff < 60)   return `${Math.round(diff)}m ago`
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`
    return new Date(iso).toLocaleDateString()
  } catch { return '' }
}

// ─── Small reusable UI ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Open
  return <span className="db-badge" style={{ background: s.bg, color: s.text }}><span className="db-dot" style={{ background: s.text }} />{status}</span>
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLE[priority] || PRIORITY_STYLE.Medium
  return <span className="db-badge" style={{ background: p.bg, color: p.text }}><span className="db-dot" style={{ background: p.text }} />{priority}</span>
}

function SLAMini({ ticket }) {
  const sla = getSLAInfo(ticket)
  return (
    <div className="sla-mini">
      <div className="sla-mini-track"><div className="sla-mini-fill animated-bar" style={{ '--tw': sla.pct + '%', background: sla.color }} /></div>
      <span style={{ fontSize: 11, fontWeight: 700, color: sla.color }}>{sla.label}</span>
    </div>
  )
}

function AssigneePill({ email }) {
  if (!email) return <span className="db-dim">—</span>
  const parts    = email.split('@')[0].split('.')
  const name     = parts.map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
  const initials = parts.map(w => w[0]?.toUpperCase()).join('').slice(0, 2)
  const COLS     = ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#22c55e']
  const bg       = COLS[email.length % COLS.length]
  return (
    <div className="assignee-pill">
      <span className="assignee-av" style={{ background: bg }}>{initials}</span>
      <span className="db-dim">{parts[0]?.slice(0,10)}</span>
    </div>
  )
}

// ─── Closing Resolution Modal ─────────────────────────────────────────────────
function ClosingResolutionModal({ ticket, onConfirm, onCancel }) {
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const ref = useRef(null)

  useEffect(() => { setTimeout(() => ref.current?.focus(), 80) }, [])

  const handleSubmit = async () => {
    if (!resolution.trim()) { ref.current?.focus(); return }
    setSubmitting(true)
    await onConfirm(resolution.trim())
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-hdr">
          <span className="modal-icon-wrap">✅</span>
          <div>
            <h3>Close Ticket</h3>
            <p className="modal-sub">{ticket.id} — {ticket.subject?.slice(0, 48)}{ticket.subject?.length > 48 ? '…' : ''}</p>
          </div>
        </div>
        <div className="modal-bod">
          <label>Closing Resolution <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea ref={ref} rows={4} value={resolution} onChange={e => setResolution(e.target.value)}
            placeholder="Describe how this issue was resolved…" />
          {!resolution.trim() && <p className="modal-warn">⚠️ Resolution note is required before closing.</p>}
          <div className="modal-info">ℹ️ This note will be saved as the official resolution for auditing.</div>
        </div>
        <div className="modal-ftr">
          <button className="btn-ghost" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !resolution.trim()}>
            {submitting ? <><span className="spin-sm" /> Closing…</> : '✅ Close Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ ticket, onChange }) {
  const [loading, setLoading]     = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [pending, setPending]     = useState(null)

  const applyStatus = async (status, resolution) => {
    setLoading(true)
    try {
      await updateTicketStatus(ticket.id, status, resolution)
      onChange(ticket.id, status, resolution)
    } catch (err) {
      alert('Failed: ' + (err?.response?.data?.detail || err.message))
    } finally { setLoading(false) }
  }

  const handle = e => {
    const s = e.target.value
    if (s === 'Closed') { setPending(s); setShowModal(true) }
    else applyStatus(s, null)
  }

  return (
    <>
      <select value={ticket.status} onChange={handle} disabled={loading} className="status-sel">
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      {showModal && (
        <ClosingResolutionModal
          ticket={ticket}
          onConfirm={async res => { setShowModal(false); await applyStatus(pending, res); setPending(null) }}
          onCancel={() => { setShowModal(false); setPending(null) }}
        />
      )}
    </>
  )
}

// ─── Recharts tooltip style factory ──────────────────────────────────────────
const ttStyle = (darkMode) => ({
  background:   darkMode ? '#1e2a45' : '#fff',
  border:       '1px solid rgba(99,102,241,0.2)',
  borderRadius: 10,
  color:        darkMode ? '#e2e8f0' : '#1e293b',
  fontSize:     12,
})

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ stats, tickets, darkMode }) {
  const sla = useMemo(() => computeSLAStats(tickets), [tickets])

  const kpis = [
    { label: 'Total Tickets', value: stats.all,       icon: '🎫', color: '#6366f1', trend: null    },
    { label: 'Open',          value: stats.open,      icon: '📬', color: '#3b82f6', trend: 'open'  },
    { label: 'On Hold',       value: stats.on_hold,   icon: '⏸️',  color: '#f59e0b', trend: 'warn'  },
    { label: 'Overdue',       value: stats.overdue,   icon: '🔴', color: '#ef4444', trend: 'bad'   },
    { label: 'SLA Breached',  value: sla.breached,    icon: '⚠️',  color: '#f97316', trend: 'bad'   },
    { label: 'Compliance',    value: sla.compliance + '%', icon: '✅', color: '#22c55e', trend: 'good' },
  ]

  const priorityData = Object.entries(stats.by_priority).map(([name, value]) => ({ name, value }))
  const statusData   = Object.entries(stats.by_status).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

  const slaByPriority = PRIORITIES.map(p => {
    const pts  = tickets.filter(t => t.priority === p)
    const info = pts.map(getSLAInfo)
    const met  = info.filter(s => s.status === 'met').length
    const pct  = pts.length > 0 ? Math.round((met / pts.length) * 100) : 100
    return { priority: p, count: pts.length, pct, color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }
  })

  const CIRC = 2 * Math.PI * 50   // circumference for r=50
  const dash = (sla.compliance / 100) * CIRC

  return (
    <div className="tab-content fade-in">
      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card glass-card">
            <div className="kpi-top">
              <span className="kpi-icon" style={{ background: k.color + '1a' }}>{k.icon}</span>
              {k.trend && (
                <span className={`kpi-trend kpi-trend--${k.trend}`}>
                  {k.trend === 'good' ? '↑' : k.trend === 'bad' ? '↑' : '→'}
                </span>
              )}
            </div>
            <span className="kpi-value" style={{ color: k.color }}>{k.value}</span>
            <span className="kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      {/* SLA + Status grid */}
      <div className="grid-2">
        {/* SLA Card */}
        <div className="glass-card">
          <div className="card-hdr">
            <span>🎯</span>
            <div>
              <h3>SLA Compliance</h3>
              <p>High ≤4h · Medium ≤24h · Low ≤72h</p>
            </div>
          </div>

          <div className="sla-ring-row">
            <svg viewBox="0 0 120 120" className="ring-svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none" stroke="#6366f1" strokeWidth="12"
                strokeDasharray={`${dash} ${CIRC}`}
                strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1.2s ease' }} />
              <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="800" fill={darkMode ? '#e2e8f0' : '#1e293b'}>{sla.compliance}%</text>
              <text x="60" y="72" textAnchor="middle" fontSize="9"  fill={darkMode ? '#94a3b8' : '#64748b'}>compliance</text>
            </svg>
            <div className="ring-legend">
              {[
                { label: 'SLA Met',   value: sla.met,      color: '#22c55e' },
                { label: 'On Track',  value: sla.onTrack,  color: '#6366f1' },
                { label: 'At Risk',   value: sla.atRisk,   color: '#f97316' },
                { label: 'Breached',  value: sla.breached, color: '#ef4444' },
              ].map(it => (
                <div key={it.label} className="ring-item">
                  <span className="ring-dot" style={{ background: it.color }} />
                  <span className="ring-lbl">{it.label}</span>
                  <span className="ring-val" style={{ color: it.color }}>{it.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sla-bars">
            {slaByPriority.map(({ priority, count, pct, color }) => (
              <div key={priority} className="sla-bar-row">
                <span className="sla-bar-lbl">{priority}</span>
                <div className="sla-bar-track">
                  <div className="sla-bar-fill animated-bar" style={{ '--tw': pct + '%', background: color }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                <span className="db-dim" style={{ fontSize: 11 }}>({count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Pie */}
        <div className="glass-card">
          <div className="card-hdr"><span>🥧</span><h3>Tickets by Status</h3></div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={105}
                paddingAngle={4} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle(darkMode)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Bar */}
      <div className="glass-card">
        <div className="card-hdr"><span>📊</span><h3>Tickets by Priority</h3></div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={priorityData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: darkMode ? '#94a3b8' : '#64748b' }} allowDecimals={false} />
            <Tooltip contentStyle={ttStyle(darkMode)} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {priorityData.map((_, i) => (
                <Cell key={i} fill={['#ef4444','#f59e0b','#22c55e'][i] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TicketsTab({ tickets, onStatusChange, externalSearch }) {
  const [search,   setSearch]   = useState(externalSearch || '')
  const [priority, setPriority] = useState('')
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const [sortCol,  setSortCol]  = useState('created_at')
  const [sortDir,  setSortDir]  = useState('desc')

  useEffect(() => { setSearch(externalSearch || '') }, [externalSearch])
  useEffect(() => { setPage(1) }, [search, priority, status])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return tickets
      .filter(t =>
        (!q || t.id.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q)) &&
        (!priority || t.priority === priority) &&
        (!status || t.status === status)
      )
      .sort((a, b) => {
        let av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
        if (sortCol === 'created_at') { av = new Date(av); bv = new Date(bv) }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [tickets, search, priority, status, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(1)
  }

  const SortArr = ({ col }) => (
    <span className="sort-arr">{sortCol !== col ? '⇅' : sortDir === 'asc' ? '↑' : '↓'}</span>
  )

  const COLS = [
    { key: 'id',          label: 'ID',         s: true  },
    { key: 'subject',     label: 'Subject',     s: true  },
    { key: 'category',    label: 'Category',    s: false },
    { key: 'priority',    label: 'Priority',    s: true  },
    { key: 'status',      label: 'Status',      s: true  },
    { key: 'assigned_to', label: 'Assigned To', s: false },
    { key: 'created_at',  label: 'Created',     s: true  },
    { key: 'sla',         label: 'SLA',         s: false },
    { key: 'action',      label: 'Update',      s: false },
    { key: 'resolution',  label: 'Resolution',  s: false },
  ]

  // page number list (max 7 buttons)
  const pageNums = useMemo(() => {
    const nums = []
    const half = 3
    let start  = Math.max(1, page - half)
    let end    = Math.min(totalPages, page + half)
    if (end - start < 6) {
      start = Math.max(1, end - 6)
      end   = Math.min(totalPages, start + 6)
    }
    for (let i = start; i <= end; i++) nums.push(i)
    return nums
  }, [page, totalPages])

  return (
    <div className="tab-content fade-in">
      {/* Filter bar */}
      <div className="glass-card filter-bar">
        <div className="srch-wrap">
          <span>🔍</span>
          <input type="text" placeholder="Search by ID or subject…" value={search}
            onChange={e => setSearch(e.target.value)} className="db-input" />
        </div>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="db-select">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="db-select">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="db-dim ml-auto" style={{ fontSize: 12 }}>{filtered.length} tickets</span>
      </div>

      {/* Table */}
      <div className="glass-card tbl-card">
        <div className="tbl-scroll">
          <table className="db-tbl">
            <thead>
              <tr>
                {COLS.map(c => (
                  <th key={c.key} onClick={c.s ? () => toggleSort(c.key) : undefined}
                    className={c.s ? 'sortable' : ''}>
                    {c.label}{c.s && <SortArr col={c.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} className="empty-cell">No tickets found.</td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className={t.status === 'Closed' ? 'row-closed' : ''}>
                  <td><span className="ticket-id">{t.id}</span></td>
                  <td className="subj-cell" title={t.subject}>{t.subject}</td>
                  <td className="db-dim">{t.category || '—'}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td><AssigneePill email={t.assigned_to} /></td>
                  <td className="db-dim">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td><SLAMini ticket={t} /></td>
                  <td><StatusDropdown ticket={t} onChange={onStatusChange} /></td>
                  <td className="res-cell">
                    {t.resolution
                      ? <span className="res-text" title={t.resolution}>✅ {t.resolution.slice(0, 40)}{t.resolution.length > 40 ? '…' : ''}</span>
                      : <span className="db-dim">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button className="pg-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
          <div className="pg-nums">
            {pageNums.map(n => (
              <button key={n} className={`pg-num ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
          </div>
          <button className="pg-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
          <span className="db-dim ml-auto" style={{ fontSize: 12 }}>Page {page} / {totalPages}</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsTab({ stats, tickets, darkMode }) {
  const trendData    = useMemo(() => buildTrendData(tickets), [tickets])
  const categoryData = Object.entries(stats.by_category).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

  const slaByPri = useMemo(() => PRIORITIES.map(p => {
    const pts  = tickets.filter(t => t.priority === p)
    const info = pts.map(getSLAInfo)
    return {
      priority: p,
      count:    pts.length,
      met:      info.filter(s => s.status === 'met').length,
      onTrack:  info.filter(s => s.status === 'on-track').length,
      atRisk:   info.filter(s => s.status === 'at-risk').length,
      breached: info.filter(s => s.status === 'breached').length,
    }
  }), [tickets])

  const tt = ttStyle(darkMode)
  const gridStroke = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const tickFill   = darkMode ? '#94a3b8' : '#64748b'

  return (
    <div className="tab-content fade-in">
      {/* Trend chart */}
      <div className="glass-card">
        <div className="card-hdr">
          <span>📉</span>
          <div><h3>Ticket Trend — Last 14 Days</h3><p>Created, Resolved & Closed over time</p></div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
            <defs>
              {[['cr','#6366f1'],['re','#22c55e'],['cl','#94a3b8']].map(([id, c]) => (
                <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={c} stopOpacity={0}    />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickFill }} />
            <YAxis tick={{ fontSize: 11, fill: tickFill }} allowDecimals={false} />
            <Tooltip contentStyle={tt} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="Created"  stroke="#6366f1" fill="url(#g-cr)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Resolved" stroke="#22c55e" fill="url(#g-re)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="Closed"   stroke="#94a3b8" fill="url(#g-cl)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        {/* Category bar */}
        <div className="glass-card">
          <div className="card-hdr"><span>🗂️</span><h3>Tickets by Category</h3></div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: tickFill }} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SLA stacked by priority */}
        <div className="glass-card">
          <div className="card-hdr"><span>🎯</span><h3>SLA Detail by Priority</h3></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 8 }}>
            {slaByPri.map(({ priority, count, met, onTrack, atRisk, breached }) => {
              const bars = [
                { key: 'Met',      val: met,      color: '#22c55e' },
                { key: 'On Track', val: onTrack,  color: '#6366f1' },
                { key: 'At Risk',  val: atRisk,   color: '#f97316' },
                { key: 'Breached', val: breached, color: '#ef4444' },
              ].filter(b => b.val > 0)
              return (
                <div key={priority}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <PriorityBadge priority={priority} />
                    <span className="db-dim" style={{ fontSize: 11 }}>{count} tickets · Target: {SLA_TARGETS[priority]}h</span>
                  </div>
                  <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
                    {bars.map(b => (
                      <div key={b.key} style={{ flex: b.val, background: b.color, minWidth: 2 }} title={`${b.key}: ${b.val}`} />
                    ))}
                    {bars.length === 0 && <div style={{ flex: 1, background: 'var(--db-border)' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    {bars.map(b => (
                      <span key={b.key} style={{ fontSize: 11, color: b.color, fontWeight: 600 }}>{b.key}: {b.val}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TAB
// ─────────────────────────────────────────────────────────────────────────────
function ActivityTab({ tickets }) {
  const events = useMemo(() => buildActivity(tickets), [tickets])

  return (
    <div className="tab-content fade-in">
      <div className="glass-card">
        <div className="card-hdr">
          <span>🕐</span>
          <div><h3>Recent Activity</h3><p>Latest ticket events and status updates</p></div>
        </div>
        <div className="activity-list">
          {events.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '36px 0', color: 'var(--db-dim-color)' }}>No activity yet.</p>
          ) : events.map((ev, i) => (
            <div key={ev.id} className={`act-item ${i < events.length - 1 ? 'has-line' : ''}`}>
              <div className="act-dot" style={{ background: ev.color + '20', border: `2px solid ${ev.color}` }}>
                <span style={{ fontSize: 15 }}>{ev.icon}</span>
              </div>
              <div className="act-body">
                <p className="act-text">{ev.text}</p>
                {ev.sub && <p className="act-sub">{ev.sub}</p>}
              </div>
              <span className="act-time">{fmtRelative(ev.time)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'overview',  icon: '🏠', label: 'Overview'  },
  { key: 'tickets',   icon: '🎫', label: 'Tickets'   },
  { key: 'analytics', icon: '📊', label: 'Analytics' },
  { key: 'activity',  icon: '🕐', label: 'Activity'  },
]

export default function Dashboard({ onBack, darkMode }) {
  const [stats,     setStats]     = useState(null)
  const [tickets,   setTickets]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [topSearch, setTopSearch] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [lastRef,   setLastRef]   = useState(new Date())

  useEffect(() => { loadDashboard() }, [])

  const loadDashboard = async () => {
    setError(null)
    setLoading(true)
    try {
      const [s, t] = await Promise.all([getDashboardStats(), getAllTickets()])
      setStats(s)
      setTickets(t)
      setLastRef(new Date())
    } catch (err) {
      const msg  = err?.response?.data?.detail || err?.message || String(err)
      const hint = err?.code === 'ERR_NETWORK'
        ? 'Ensure FastAPI is running: uvicorn backend_api:app --port 8001'
        : null
      setError({ message: msg, hint })
    } finally { setLoading(false) }
  }

  const handleStatusChange = useCallback((ticketId, newStatus, resolution) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: newStatus, ...(resolution ? { resolution } : {}) } : t
    ))
  }, [])

  const handleTopSearch = val => {
    setTopSearch(val)
    if (val) setActiveTab('tickets')
  }

  const sla = useMemo(() => stats ? computeSLAStats(tickets) : null, [tickets, stats])

  const notifs = useMemo(() => sla && stats ? [
    sla.breached > 0  && { icon: '🔴', text: `${sla.breached} SLA breached`,  color: '#ef4444' },
    stats.overdue > 0 && { icon: '⚠️',  text: `${stats.overdue} overdue`,      color: '#f97316' },
    stats.open    > 0 && { icon: '📬', text: `${stats.open} open tickets`,     color: '#3b82f6' },
  ].filter(Boolean) : [], [sla, stats])

  // ── Loading ──
  if (loading) return (
    <div className={`db-shell ${darkMode ? 'dark' : 'light'}`}>
      <div className="db-center">
        <div className="db-spinner" />
        <span>Loading dashboard…</span>
      </div>
    </div>
  )

  // ── Error ──
  if (error) return (
    <div className={`db-shell ${darkMode ? 'dark' : 'light'}`}>
      <div className="db-center">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: 420, padding: '32px 28px' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h3 style={{ margin: '12px 0 6px' }}>Failed to load dashboard</h3>
          <p style={{ color: '#ef4444', fontSize: 13 }}>{error.message}</p>
          {error.hint && <p className="db-dim" style={{ fontSize: 12, marginTop: 4 }}>{error.hint}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn-primary" onClick={loadDashboard}>Retry</button>
            <button className="btn-ghost"   onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`db-shell ${darkMode ? 'dark' : 'light'}`}>

      {/* ── Sidebar ── */}
      <aside className={`db-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sb-top">
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '›' : '‹'}
          </button>
          {!collapsed && <span className="sb-title">Helpdesk</span>}
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.key} className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)} title={collapsed ? item.label : undefined}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <><span className="nav-lbl">{item.label}</span>{activeTab === item.key && <span className="nav-pip" />}</>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="sb-foot">
            <div className="sb-av">IT</div>
            <div>
              <p className="sb-user">IT Admin</p>
              <p className="sb-role">Helpdesk</p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="db-main">

        {/* Topbar */}
        <header className="db-topbar">
          <div className="tb-left">
            <h1 className="tb-title">
              {NAV_ITEMS.find(n => n.key === activeTab)?.icon}&nbsp;
              {NAV_ITEMS.find(n => n.key === activeTab)?.label}
            </h1>
            <span className="tb-sub">Updated {lastRef.toLocaleTimeString()}</span>
          </div>

          <div className="tb-right">
            <div className="tb-search">
              <span>🔍</span>
              <input type="text" placeholder="Quick search tickets…" value={topSearch}
                onChange={e => handleTopSearch(e.target.value)} className="tb-input" />
            </div>

            <div className="notif-wrap">
              <button className="icon-btn" onClick={() => setShowNotif(n => !n)}>
                🔔
                {notifs.length > 0 && <span className="notif-pip">{notifs.length}</span>}
              </button>
              {showNotif && (
                <div className="notif-panel glass-card" onClick={() => setShowNotif(false)}>
                  <p className="notif-ttl">Notifications</p>
                  {notifs.length === 0
                    ? <p className="db-dim">All clear!</p>
                    : notifs.map((n, i) => (
                      <div key={i} className="notif-item">
                        <span>{n.icon}</span>
                        <span style={{ color: n.color, fontSize: 13 }}>{n.text}</span>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            <button className="icon-btn" onClick={loadDashboard} title="Refresh">🔄</button>
            <button className="btn-ghost back-btn" onClick={onBack}>← Chat</button>
          </div>
        </header>

        {/* Content */}
        <div className="db-body">
          {activeTab === 'overview'  && <OverviewTab  stats={stats}   tickets={tickets} darkMode={darkMode} />}
          {activeTab === 'tickets'   && <TicketsTab   tickets={tickets} onStatusChange={handleStatusChange} externalSearch={topSearch} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats}   tickets={tickets} darkMode={darkMode} />}
          {activeTab === 'activity'  && <ActivityTab  tickets={tickets} />}
        </div>
      </div>
    </div>
  )
}
