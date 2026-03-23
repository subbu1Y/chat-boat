import { useState, useRef, useCallback, useEffect } from 'react'
import { createHelpdeskTicket, getMyTickets, trackTicket, createQuickTicket } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { EMPLOYEE_DIRECTORY } from '../config/employees'

/** Normalize a string: lowercase, remove extra spaces */
const norm = s => s.trim().toLowerCase()
/** Normalize removing ALL spaces (for combined-word matching) */
const compact = s => s.trim().toLowerCase().replace(/\s+/g, '')

/** Return employees whose name starts with / contains the query (for dropdown suggestions) */
function searchEmployees(query) {
  if (!query.trim()) return []
  const q = norm(query)
  const qc = compact(query)
  return EMPLOYEE_DIRECTORY.filter(emp => {
    const n  = norm(emp.name)
    const nc = compact(emp.name)
    return nc.startsWith(qc) || n.startsWith(q) || n.includes(q)
  }).slice(0, 6)
}

/** Given a typed name, return the best-matching email or auto-generate one */
function resolveEmail(rawName) {
  const trimmed = rawName.trim()
  if (!trimmed) return ''
  const qc = compact(trimmed)
  const q  = norm(trimmed)

  // 1. Exact full-name match (no spaces) e.g. "pradeepyara" === "pradeepyara"
  for (const emp of EMPLOYEE_DIRECTORY) {
    if (compact(emp.name) === qc) return emp.email
  }
  // 2. Exact full-name match (with spaces) e.g. "Pradeep Yara"
  for (const emp of EMPLOYEE_DIRECTORY) {
    if (norm(emp.name) === q) return emp.email
  }
  // 3. Combined name starts with query (min 4 chars) e.g. "pradeepy" → "pradeepyara"
  if (qc.length >= 4) {
    for (const emp of EMPLOYEE_DIRECTORY) {
      if (compact(emp.name).startsWith(qc)) return emp.email
    }
  }
  // 4. First-name exact match (single word typed)
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    for (const emp of EMPLOYEE_DIRECTORY) {
      const parts = emp.name.toLowerCase().split(/\s+/)
      if (parts[0] === words[0]) return emp.email
    }
  }
  // 5. First + Last name typed with space e.g. "Pradeep Y" → "pradeep.yara@cognida.ai"
  if (words.length >= 2) {
    for (const emp of EMPLOYEE_DIRECTORY) {
      const parts = emp.name.toLowerCase().split(/\s+/)
      if (parts[0] === words[0] && parts[parts.length-1].startsWith(words[words.length-1])) return emp.email
    }
  }
  // Fallback: auto-generate firstname.lastname@cognida.ai
  if (words.length === 0) return ''
  if (words.length === 1) return words[0] + '@cognida.ai'
  return words[0] + '.' + words[words.length - 1] + '@cognida.ai'
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const PRIORITY_INFO = {
  Low:      { color: 'border-green-400 bg-green-50 text-green-700',   icon: '🟢', desc: 'Non-urgent, no work impact' },
  Medium:   { color: 'border-yellow-400 bg-yellow-50 text-yellow-700', icon: '🟡', desc: 'Minor impact, can wait a day' },
  High:     { color: 'border-orange-400 bg-orange-50 text-orange-700', icon: '🟠', desc: 'Work impacted, needs attention' },
  Critical: { color: 'border-red-500 bg-red-50 text-red-700',          icon: '🔴', desc: 'Work completely blocked' },
}

const ASSIGNMENT_MAP = {
  // → Aditya Kovoor
  '💻 Hardware Issues':                 'aditya.kovoor@cognida.ai',
  '🌐 Network & Internet':              'aditya.kovoor@cognida.ai',
  '🛡️ Security Issues':                'aditya.kovoor@cognida.ai',
  '🖨️ Printer & Scanning Issues':      'aditya.kovoor@cognida.ai',
  '🔧 IT Maintenance / System Updates': 'aditya.kovoor@cognida.ai',
  '📱 Mobile Device Issues':            'aditya.kovoor@cognida.ai',
  // → Subrahmanyam Pillalamarri
  '🖥️ Software Issues':                'subrahmanyam.pillalamarri@cognida.ai',
  '📧 Email & Collaboration':           'subrahmanyam.pillalamarri@cognida.ai',
  '☁️ Cloud Services':                  'subrahmanyam.pillalamarri@cognida.ai',
  '❓ Other / General IT Support':      'subrahmanyam.pillalamarri@cognida.ai',
  // Service Request categories
  '🆕 New Hardware Request':            'aditya.kovoor@cognida.ai',
  '💾 New Software Request':            'subrahmanyam.pillalamarri@cognida.ai',
  '🆔 New Email ID / Account Setup':    'subrahmanyam.pillalamarri@cognida.ai',
  '🔐 Access & Permission Requests':    'subrahmanyam.pillalamarri@cognida.ai',
  '🔑 Password & Account Management':   'subrahmanyam.pillalamarri@cognida.ai',
  '🌐 Network & Connectivity Setup':    'aditya.kovoor@cognida.ai',
  '🖥️ IT Onboarding / Offboarding':    'subrahmanyam.pillalamarri@cognida.ai',
  '🛒 Procurement Request':             'aditya.kovoor@cognida.ai',
  '💡 IT Consultation':                 'subrahmanyam.pillalamarri@cognida.ai',
  '❓ Other Service Request':           'subrahmanyam.pillalamarri@cognida.ai',
}
const ASSIGNEE_NAMES = {
  'aditya.kovoor@cognida.ai':             'Aditya Kovoor',
  'subrahmanyam.pillalamarri@cognida.ai': 'Subrahmanyam Pillalamarri',
}
const getAssignee = (cat) => ASSIGNMENT_MAP[cat] || 'subrahmanyam.pillalamarri@cognida.ai'

const INCIDENT_CATALOG = {
  '💻 Hardware Issues': [
    'Laptop / Desktop not working',
    'Slow system performance',
    'Keyboard / Mouse issue',
    'Monitor / Display issue',
    'Battery problem',
    'Charging issue',
    'Docking station issue',
    'Device overheating',
    'Hardware replacement request',
    'Other hardware issue',
  ],
  '🖥️ Software Issues': [
    'Application not opening',
    'Software installation request',
    'Software update issue',
    'Application crash',
    'License activation problem',
    'Compatibility issue (Excel / Word / Chrome)',
    'Error message in application',
    'Browser issue',
    'Other software issue',
  ],
  '📧 Email & Collaboration': [
    'Email not sending / receiving',
    'Mailbox full',
    'Calendar issue',
    'Shared mailbox access',
    'Meeting invite issue',
    'Email configuration (Outlook)',
    'Microsoft Teams issue',
    'Other email / collaboration issue',
  ],
  '🌐 Network & Internet': [
    'WiFi not connecting',
    'LAN network issue',
    'VPN connection problem',
    'Internet slow',
    'IP configuration issue',
    'Network printer connection',
    'Remote desktop not connecting',
    'Firewall / port blocking',
    'Other network issue',
  ],
  '🖨️ Printer & Scanning Issues': [
    'Printer not printing',
    'Printer offline',
    'Printer driver installation',
    'Scan not working',
    'Printer configuration',
    'HP printer issue',
    'Canon printer issue',
    'Other printer issue',
  ],
  '🛡️ Security Issues': [
    'Phishing email report',
    'Suspicious login activity',
    'Malware / virus alert',
    'Device security issue',
    'Account compromise',
    'Data loss / accidental deletion',
    'Other security issue',
  ],
  '☁️ Cloud Services': [
    'Cloud login issue',
    'Service access problem',
    'File sync issue (OneDrive / SharePoint)',
    'Cloud storage error',
    'Other cloud service issue',
  ],
  '🔧 IT Maintenance / System Updates': [
    'Patch update issue',
    'Device update request',
    'System restart required',
    'Upgrade notification',
    'Other maintenance issue',
  ],
  '📱 Mobile Device Issues': [
    'Mobile email configuration',
    'Device enrollment',
    'Mobile app not working',
    'Security policy issue',
    'Other mobile issue',
  ],
  '❓ Other / General IT Support': [
    'General IT help',
    'Consultation request',
    'Other technical issue',
  ],
}

const SERVICE_CATALOG = {
  '🆕 New Hardware Request': [
    'New laptop request',
    'New desktop request',
    'New monitor / peripheral',
    'New mobile device',
    'Hardware upgrade',
    'New peripheral / accessory',
    'Office equipment setup',
  ],
  '💾 New Software Request': [
    'New software license request',
    'Install / upgrade application',
    'Browser extension / plugin',
    'Software request (Microsoft Excel / Word)',
    'Software request (Google Chrome)',
    'Other software request',
  ],
  '🆔 New Email ID / Account Setup': [
    'New email ID creation',
    'New employee onboarding',
    'Create new user account',
    'Email account configuration',
    'Distribution list setup',
  ],
  '🔐 Access & Permission Requests': [
    'New user access request',
    'Application access request',
    'Folder / shared drive access',
    'VPN / remote access setup',
    'Permission change request',
    'MFA / 2FA setup',
    'Microsoft Azure access',
    'Google Cloud Platform access',
    'Other access request',
  ],
  '🔑 Password & Account Management': [
    'Password reset',
    'Account unlock',
    'Account locked out',
    'Username change request',
    'Account deactivation request',
  ],
  '🌐 Network & Connectivity Setup': [
    'New office Wi-Fi setup',
    'Network point installation',
    'VPN configuration',
    'IP configuration request',
  ],
  '🖥️ IT Onboarding / Offboarding': [
    'New employee IT setup',
    'Device provisioning',
    'Software setup for new joiner',
    'Exit / offboarding IT process',
    'Asset handover',
  ],
  '🛒 Procurement Request': [
    'Hardware procurement',
    'Software procurement',
    'IT accessories / consumables',
    'Vendor / vendor coordination',
  ],
  '💡 IT Consultation': [
    'IT policy / compliance query',
    'Security awareness query',
    'General IT guidance',
    'Technology recommendation',
  ],
  '❓ Other Service Request': [
    'Other service request (describe below)',
  ],
}

const STATUS_COLORS = {
  Open:     'bg-blue-100 text-blue-700',
  Pending:  'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-700',
  Closed:   'bg-gray-100 text-gray-600',
}
const PRIORITY_COLORS = {
  High:     'bg-red-100 text-red-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  Low:      'bg-green-100 text-green-700',
  Critical: 'bg-red-200 text-red-800',
}

// ─── Theme Palettes ──────────────────────────────────────────────────────────

const DARK = {
  page:         '#060E35',
  sidebar:      '#0B1854',
  sideBorder:   '#1E3799',
  topbar:       'linear-gradient(135deg, #0B1854 0%, #1E3799 100%)',
  topbarText:   '#E8EEFF',
  topbarMuted:  '#7EA6FF',
  text:         '#E8EEFF',
  muted:        '#7EA6FF',
  dim:          '#3B5299',
  accent:       '#4361EE',
  navHover:     '#0F1F6B',
  sideText:     '#E8EEFF',
  sideMuted:    '#7EA6FF',
  sideDim:      '#3B5299',
  sideAccent:   '#4361EE',
  sideNavHover: '#0F1F6B',
  sideFooter:   '#3B5299',
  card:         '#0B1A5C',
  cardBorder:   '#1E3799',
  label:        '#C7D7FF',
  inputBg:      '#071035',
  inputBorder:  '#1E3799',
  inputText:    '#E8EEFF',
  stepBg:       '#1E3799',
  stepOn:       '#60A5FA',
  stepOff:      '#3B5299',
  rvBg:         'rgba(14,26,96,0.6)',
  rvBorder:     '#1E3799',
  rvLabel:      '#7EA6FF',
  rvVal:        '#E8EEFF',
  rvSep:        '#1E3799',
  rvDescBg:     'rgba(6,14,53,0.9)',
  rvDescBorder: '#1E3799',
  badgeBg:      'rgba(67,97,238,0.2)',
  badgeText:    '#93C5FD',
  badgeBorder:  '#1E3799',
  footer:       '#3B5299',
  dragBorder:   '#1E3799',
  dragBg:       '#071035',
  trackBg:      'rgba(14,26,96,0.8)',
  trackBorder:  '#1E3799',
  toggleBg:     '#1E3799',
  toggleBorder: '#4361EE',
  toggleText:   '#E8EEFF',
}

const LIGHT = {
  page:         '#F0F4FF',
  sidebar:      'linear-gradient(180deg, #5a67d8 0%, #6b46c1 100%)',
  sideBorder:   'rgba(255,255,255,0.15)',
  topbar:       'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
  topbarText:   '#FFFFFF',
  topbarMuted:  'rgba(255,255,255,0.75)',
  text:         '#1E293B',
  muted:        '#4361EE',
  dim:          '#64748B',
  accent:       '#4361EE',
  navHover:     '#EEF2FF',
  sideText:     '#FFFFFF',
  sideMuted:    'rgba(255,255,255,0.8)',
  sideDim:      'rgba(255,255,255,0.65)',
  sideAccent:   'rgba(255,255,255,0.22)',
  sideNavHover: 'rgba(255,255,255,0.12)',
  sideFooter:   'rgba(255,255,255,0.5)',
  card:         '#FFFFFF',
  cardBorder:   '#E2E8F0',
  label:        '#374151',
  inputBg:      '#FFFFFF',
  inputBorder:  '#E2E8F0',
  inputText:    '#1E293B',
  stepBg:       '#4361EE',
  stepOn:       '#E8EEFF',
  stepOff:      'rgba(255,255,255,0.5)',
  rvBg:         '#F8FAFF',
  rvBorder:     '#E2E8F0',
  rvLabel:      '#64748B',
  rvVal:        '#1E293B',
  rvSep:        '#E2E8F0',
  rvDescBg:     '#FFFFFF',
  rvDescBorder: '#E2E8F0',
  badgeBg:      '#EEF2FF',
  badgeText:    '#4361EE',
  badgeBorder:  '#C7D7FF',
  footer:       '#94A3B8',
  dragBorder:   '#E2E8F0',
  dragBg:       '#FFFFFF',
  trackBg:      '#EEF2FF',
  trackBorder:  '#C7D7FF',
  toggleBg:     'rgba(255,255,255,0.18)',
  toggleBorder: 'rgba(255,255,255,0.35)',
  toggleText:   '#ffffff',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StepBadge({ n, active, done }) {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all'
  if (done)   return <div className={`${base} bg-white text-indigo-700`}>✓</div>
  if (active) return <div className={`${base} bg-white text-indigo-700 ring-4 ring-white/30`}>{n}</div>
  return <div className={`${base} bg-white/20 text-white/60`}>{n}</div>
}
function StepLine({ done }) {
  return <div className={`flex-1 h-0.5 mx-1 transition-all ${done ? 'bg-white' : 'bg-white/20'}`} />
}
function ErrorBox({ msg }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </div>
  )
}
function ReviewRow({ label, value, C }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span style={{color: C.rvLabel}} className="font-semibold flex-shrink-0 text-base">{label}</span>
      <span style={{color: C.rvVal}} className="text-right text-base">{value}</span>
    </div>
  )
}

// ─── TicketForm ──────────────────────────────────────────────────────────────
function TicketForm({ ticketType, catalog, onSuccess, C }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name:'', email:'', department:'', subject:'', description:'', priority:'Medium', category:'', issue_type:'' })
  const [screenshots, setScreenshots] = useState([])
  const [dragOver, setDragOver]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [emailEdited, setEmailEdited]       = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nameRef                             = useRef(null)
  const fileInputRef                        = useRef(null)
  const MAX_FILES = 5

  const IS = { background: C.inputBg, borderColor: C.inputBorder, color: C.inputText }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // Auto-detect email from directory or generate from name
  useEffect(() => {
    if (emailEdited) return
    set('email', resolveEmail(form.name))
  }, [form.name, emailEdited])
  const nextStep = () => { setError(''); setStep(s => s + 1) }
  const prevStep = () => { setError(''); setStep(s => s - 1) }

  const addFiles = useCallback((files) => {
    const ok = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5*1024*1024)
    setScreenshots(prev => [...prev, ...ok.map(f => ({ file:f, preview:URL.createObjectURL(f), name:f.name, size:(f.size/1024).toFixed(0)+' KB' }))].slice(0, MAX_FILES))
  }, [])

  const removeShot = (i) => setScreenshots(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_,j)=>j!==i) })

  const v1 = () => {
    if (!form.name.trim()) { setError('Full name is required.'); return false }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required.'); return false }
    return true
  }
  const v2 = () => {
    if (!form.subject.trim())     { setError('Subject is required.'); return false }
    if (!form.category)           { setError('Please select a category.'); return false }
    if (!form.issue_type)         { setError('Please select an issue type.'); return false }
    if (!form.description.trim()) { setError('Description is required.'); return false }
    return true
  }

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const screenshotNote = screenshots.length ? `\n\nScreenshots (${screenshots.length}): ${screenshots.map(s=>s.name).join(', ')}` : ''
      const ticket = await createHelpdeskTicket({
        subject:     form.subject.trim(),
        description: `[TYPE: ${ticketType}]\n[Raised by: ${form.name} <${form.email}>]${form.department ? ` | Dept: ${form.department}` : ''}\n[Issue Type: ${form.issue_type}]\n\n${form.description.trim()}${screenshotNote}`,
        priority:    form.priority,
        category:    form.category || null,
        ticket_type: ticketType,
      })
      onSuccess(ticket, form, screenshots)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const categories = Object.keys(catalog)

  return (
    <div className="rounded-2xl shadow-md border p-4" style={{background: C.card, borderColor: C.cardBorder}}>
      {/* Step indicator */}
      <div className="w-full mb-4">
        <div className="flex items-center rounded-xl px-6 py-3" style={{background: C.stepBg}}>
          <StepBadge n={1} active={step===1} done={step>1} />
          <StepLine done={step>1} />
          <StepBadge n={2} active={step===2} done={step>2} />
          <StepLine done={step>2} />
          <StepBadge n={3} active={step===3} done={step>3} />
        </div>
        <div className="flex justify-between text-sm mt-3 px-1">
          <span style={{color: step>=1 ? C.stepOn : C.stepOff}} className={step>=1?'font-semibold':''}>Your Details</span>
          <span style={{color: step>=2 ? C.stepOn : C.stepOff}} className={step>=2?'font-semibold':''}>Issue Details</span>
          <span style={{color: step>=3 ? C.stepOn : C.stepOff}} className={step>=3?'font-semibold':''}>Review & Submit</span>
        </div>
      </div>

      <div className="w-full rounded-2xl">

        {/* Step 1 */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">👤</span>
              <h3 style={{color: C.text}} className="text-lg font-bold">Your Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input
                  ref={nameRef}
                  type="text"
                  value={form.name}
                  onChange={e => { set('name', e.target.value); setShowSuggestions(true) }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Start typing your name…"
                  style={IS}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  autoComplete="off"
                />
                {/* Dropdown suggestions */}
                {showSuggestions && searchEmployees(form.name).length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 rounded-xl shadow-lg border overflow-hidden"
                    style={{ background: C.card, borderColor: C.cardBorder }}>
                    {searchEmployees(form.name).map(emp => (
                      <li key={emp.email}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            set('name', emp.name)
                            set('email', emp.email)
                            setEmailEdited(false)
                            setShowSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex justify-between items-center gap-2"
                          style={{ color: C.text }}
                        >
                          <span className="font-medium">{emp.name}</span>
                          <span className="text-xs truncate" style={{ color: C.dim }}>{emp.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">
                  Work Email <span className="text-red-500">*</span>
                  {!emailEdited && form.email && (() => {
                    const fromDir = EMPLOYEE_DIRECTORY.some(e => e.email === form.email)
                    return fromDir
                      ? <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">✓ matched from directory</span>
                      : <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">⚡ auto-generated</span>
                  })()}
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setEmailEdited(true); set('email', e.target.value) }}
                  onFocus={() => { if (!form.email) setEmailEdited(false) }}
                  placeholder="you@cognida.ai"
                  style={IS}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {emailEdited && (
                  <button
                    type="button"
                    onClick={() => setEmailEdited(false)}
                    className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 underline"
                  >
                    ↺ Reset to auto-detect
                  </button>
                )}
              </div>
            </div>
            <div>
              <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Department <span className="font-normal text-xs" style={{color: C.dim}}>(optional)</span></label>
              <input type="text" value={form.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. Engineering, QA, Sales"
                style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex justify-end">
              <button onClick={()=>{if(v1())nextStep()}} className="px-7 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">Next →</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{ticketType === 'incident' ? '🚨' : '🔧'}</span>
              <h3 style={{color: C.text}} className="text-lg font-bold">Issue Details</h3>
            </div>
            <div>
              <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Subject <span className="text-red-500">*</span></label>
              <input type="text" value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="Brief summary of the issue"
                style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Category <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={e=>{set('category',e.target.value);set('issue_type','')}}
                  style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select category</option>
                  {categories.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Priority</label>
                <select value={form.priority} onChange={e=>set('priority',e.target.value)}
                  style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {form.category && (
              <div>
                <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Issue Type <span className="text-red-500">*</span></label>
                <select value={form.issue_type} onChange={e=>set('issue_type',e.target.value)}
                  style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select issue type</option>
                  {(catalog[form.category]||[]).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {form.priority && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 border text-sm ${PRIORITY_INFO[form.priority]?.color}`}>
                <span className="text-base">{PRIORITY_INFO[form.priority]?.icon}</span>
                <span>{PRIORITY_INFO[form.priority]?.desc}</span>
              </div>
            )}
            <div>
              <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">Description <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={4}
                placeholder="Describe in detail — what happened, when, any error messages…"
                style={IS} className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            {/* Screenshot upload */}
            <div>
              <label style={{color: C.label}} className="block text-sm font-semibold mb-1.5">
                Screenshots <span className="font-normal text-xs" style={{color: C.dim}}>(optional · max 5 · 5MB each)</span>
              </label>
              <div onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}
                onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
                onClick={()=>fileInputRef.current?.click()}
                style={{
                  background: dragOver ? 'rgba(99,102,241,0.08)' : C.dragBg,
                  borderColor: dragOver ? '#6366F1' : C.dragBorder,
                }}
                className="border-2 border-dashed rounded-lg px-4 py-4 text-center cursor-pointer transition-all hover:border-indigo-400">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>addFiles(e.target.files)} />
                <svg className="w-7 h-7 text-gray-300 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p style={{color: C.dim}} className="text-sm"><span className="text-indigo-500 font-semibold">Click</span> or drag &amp; drop screenshots</p>
              </div>
              {screenshots.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {screenshots.map((s,i)=>(
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={s.preview} alt={s.name} className="w-full h-16 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={e=>{e.stopPropagation();removeShot(i)}} className="w-7 h-7 bg-red-500 text-white rounded-full text-xs hover:bg-red-600">✕</button>
                      </div>
                      <p style={{color: C.dim}} className="text-xs px-1 py-0.5 truncate">{s.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex justify-between">
              <button onClick={prevStep} style={{background: C.inputBg, color: C.text, borderColor: C.inputBorder}} className="px-6 py-2.5 border rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity">← Back</button>
              <button onClick={()=>{if(v2())nextStep()}} className="px-7 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Review →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">✅</span>
              <h3 style={{color: C.text}} className="text-lg font-bold">Review & Submit</h3>
            </div>
            <div style={{background: C.rvBg, borderColor: C.rvBorder}} className="rounded-xl p-4 space-y-3 text-sm border">
              <ReviewRow label="Name"        value={form.name} C={C} />
              <ReviewRow label="Email"       value={form.email} C={C} />
              {form.department && <ReviewRow label="Department" value={form.department} C={C} />}
              <div className="border-t my-1" style={{borderColor: C.rvSep}} />
              <ReviewRow label="Subject"     value={form.subject} C={C} />
              <ReviewRow label="Category"    value={form.category} C={C} />
              {form.issue_type && <ReviewRow label="Issue Type" value={form.issue_type} C={C} />}
              <div className="flex justify-between items-center">
                <span style={{color: C.rvLabel}} className="font-medium">Priority</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${PRIORITY_INFO[form.priority]?.color}`}>
                  {PRIORITY_INFO[form.priority]?.icon} {form.priority}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{color: C.rvLabel}} className="font-medium">Assigned To</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {getAssignee(form.category)==='aditya.kovoor@cognida.ai'?'AK':'SP'}
                  </span>
                  <span style={{color: C.rvVal}} className="text-sm font-medium">{ASSIGNEE_NAMES[getAssignee(form.category)]}</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span style={{color: C.rvLabel}} className="font-medium">Description</span>
                <span style={{background: C.rvDescBg, borderColor: C.rvDescBorder, color: C.rvVal}} className="border rounded-lg p-3 text-xs whitespace-pre-wrap">{form.description}</span>
              </div>
              {screenshots.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span style={{color: C.rvLabel}} className="font-medium">Screenshots ({screenshots.length})</span>
                  <div className="flex flex-wrap gap-2">
                    {screenshots.map((s,i)=><img key={i} src={s.preview} alt={s.name} title={s.name} className="h-12 w-16 object-cover rounded-lg border border-gray-200" />)}
                  </div>
                </div>
              )}
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex justify-between">
              <button onClick={prevStep} disabled={loading} style={{background: C.inputBg, color: C.text, borderColor: C.inputBorder}} className="px-6 py-2.5 border rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">← Edit</button>
              <button onClick={handleSubmit} disabled={loading} className="px-7 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {loading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Submitting…</>) : '🎫 Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ ticket, form, screenshots, onReset, C }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div style={{background: C.card, border: `1px solid ${C.cardBorder}`}} className="rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{color: C.text}} className="text-xl font-bold mb-1">Ticket Submitted!</h2>
        <p style={{color: C.dim}} className="text-sm mb-5">Your ticket has been raised and assigned.</p>
        <div style={{background: C.trackBg, border: `1px solid ${C.trackBorder}`}} className="rounded-2xl p-4 text-left space-y-2 mb-5 text-sm">
          <div className="flex justify-between">
            <span style={{color: C.rvLabel}} className="font-medium">Ticket ID</span>
            <span className="font-mono font-bold text-indigo-500 text-base">{ticket.id}</span>
          </div>
          <div className="flex justify-between">
            <span style={{color: C.rvLabel}} className="font-medium">Subject</span>
            <span style={{color: C.rvVal}} className="text-right max-w-48">{ticket.subject}</span>
          </div>
          <div className="flex justify-between">
            <span style={{color: C.rvLabel}} className="font-medium">Priority</span>
            <span style={{color: C.rvVal}}>{ticket.priority}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{color: C.rvLabel}} className="font-medium">Status</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">{ticket.status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span style={{color: C.rvLabel}} className="font-medium">Assigned To</span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                {ticket.assigned_to === 'aditya.kovoor@cognida.ai' ? 'AK' : 'SP'}
              </span>
              <span style={{color: C.rvVal}} className="font-medium">{ASSIGNEE_NAMES[ticket.assigned_to] || ticket.assigned_to}</span>
            </span>
          </div>
        </div>
        {screenshots.length > 0 && <p style={{color: C.dim}} className="text-xs mb-2">📎 {screenshots.length} screenshot(s) attached</p>}
        <p style={{color: C.dim}} className="text-xs mb-5">Note your ticket ID <strong className="text-indigo-500">{ticket.id}</strong> to track status later.</p>
        <button onClick={onReset} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Raise Another Ticket
        </button>
      </div>
    </div>
  )
}

// ─── My Tickets View ─────────────────────────────────────────────────────────
function MyTicketsView({ ticketType, title, C }) {
  const [email, setEmail]       = useState('')
  const [trackId, setTrackId]   = useState('')
  const [tickets, setTickets]   = useState([])
  const [tracked, setTracked]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [trackLoading, setTL]   = useState(false)
  const [error, setError]       = useState('')
  const [trackError, setTE]     = useState('')
  const [searched, setSearched] = useState(false)

  const IS = { background: C.inputBg, borderColor: C.inputBorder, color: C.inputText }

  const search = async () => {
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email.'); return }
    setError(''); setLoading(true); setSearched(false)
    try {
      const res = await getMyTickets(email.trim(), ticketType)
      setTickets(res); setSearched(true)
    } catch { setError('Failed to fetch tickets. Make sure the backend is running.') }
    finally { setLoading(false) }
  }

  const track = async () => {
    if (!trackId.trim()) { setTE('Enter a ticket ID (e.g. TKT-1000)'); return }
    setTE(''); setTL(true); setTracked(null)
    try {
      const res = await trackTicket(trackId.trim())
      setTracked(res)
    } catch (err) {
      setTE(err?.response?.status === 404 ? `Ticket "${trackId}" not found.` : 'Error fetching ticket.')
    }
    finally { setTL(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold" style={{color: C.text}}>{title}</h2>

      {/* Track by ticket ID */}
      <div style={{background: C.card, borderColor: C.cardBorder}} className="rounded-2xl shadow border p-5">
        <h3 style={{color: C.text}} className="text-sm font-bold mb-3">🔍 Track by Ticket ID</h3>
        <div className="flex gap-2">
          <input type="text" value={trackId} onChange={e=>setTrackId(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&track()}
            placeholder="e.g. TKT-1000"
            style={IS} className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
          <button onClick={track} disabled={trackLoading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {trackLoading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : null}
            Track
          </button>
        </div>
        {trackError && <p className="text-sm text-red-500 mt-2">{trackError}</p>}
        {tracked && (
          <div style={{background: C.trackBg, borderColor: C.trackBorder}} className="mt-4 border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold text-indigo-500 text-base">{tracked.id}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[tracked.status]||'bg-gray-100 text-gray-600'}`}>{tracked.status}</span>
            </div>
            <p style={{color: C.text}} className="font-medium">{tracked.subject}</p>
            <div className="flex gap-4 text-xs" style={{color: C.dim}}>
              <span>Priority: <strong className={`px-2 py-0.5 rounded-full ${PRIORITY_COLORS[tracked.priority]||''}`}>{tracked.priority}</strong></span>
              <span>Category: {tracked.category || '—'}</span>
            </div>
            {tracked.assigned_to && (
              <div className="flex items-center gap-1.5 text-xs" style={{color: C.dim}}>
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {tracked.assigned_to==='aditya.kovoor@cognida.ai'?'AK':'SP'}
                </span>
                Assigned to {ASSIGNEE_NAMES[tracked.assigned_to]||tracked.assigned_to}
              </div>
            )}
            <p className="text-xs" style={{color: C.dim}}>Raised: {new Date(tracked.created_at).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Search by email */}
      <div style={{background: C.card, borderColor: C.cardBorder}} className="rounded-2xl shadow border p-5">
        <h3 style={{color: C.text}} className="text-sm font-bold mb-3">📋 View All My {title}</h3>
        <div className="flex gap-2">
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&search()}
            placeholder="Enter your work email"
            style={IS} className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <button onClick={search} disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : null}
            Search
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

        {searched && tickets.length === 0 && (
          <div className="text-center py-10" style={{color: C.dim}}>
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No {title.toLowerCase()} found for this email.</p>
          </div>
        )}

        {tickets.length > 0 && (
          <div className="mt-4 space-y-3">
            {tickets.map(t => (
              <div key={t.id} style={{background: C.inputBg, borderColor: C.cardBorder}} className="border rounded-xl p-4 transition-colors cursor-default"
                onMouseEnter={e=>e.currentTarget.style.background=C.navHover}
                onMouseLeave={e=>e.currentTarget.style.background=C.inputBg}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-bold text-indigo-500">{t.id}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]||'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]||''}`}>{t.priority}</span>
                    </div>
                    <p style={{color: C.text}} className="text-sm font-medium truncate">{t.subject}</p>
                    <div className="flex gap-3 mt-1 text-xs" style={{color: C.dim}}>
                      <span>{t.category || '—'}</span>
                      <span>·</span>
                      <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      {t.assigned_to && <><span>·</span><span>→ {ASSIGNEE_NAMES[t.assigned_to]?.split(' ')[0] || t.assigned_to}</span></>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Portal ─────────────────────────────────────────────────────────────
const NAV = [
  { id: 'incident',         label: 'New Incident',               icon: '🚨', desc: 'Report a problem or outage' },
  { id: 'service',          label: 'New Service Request',         icon: '🔧', desc: 'Request IT equipment or access' },
  { id: 'my-incidents',     label: 'My Past Incidents',           icon: '🕐', desc: 'View and track your incidents' },
  { id: 'my-service',       label: 'My Past Service Requests',    icon: '📂', desc: 'View your service requests' },
]

// ─── QuickIncidentModal ───────────────────────────────────────────────────────
function QuickIncidentModal({ onClose, C }) {
  const auth = useAuth()
  const user = auth?.user
  const [name, setName]         = useState(user?.name  || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [desc, setDesc]         = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [ticket, setTicket]     = useState(null)

  // Collect device metadata silently
  const getMetadata = () => ({
    device:       navigator.platform || 'Unknown',
    browser:      navigator.userAgent.split(' ').slice(-1)[0] || 'Unknown',
    os:           navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || 'Unknown',
    submitted_at: new Date().toISOString(),
    url:          window.location.href,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim())  { setError('Please enter your full name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid work email.'); return }
    if (!desc.trim())  { setError('Please describe the issue.'); return }
    setError(''); setLoading(true)
    try {
      const meta = getMetadata()
      meta.name  = name.trim()
      meta.email = email.trim()
      const result = await createQuickTicket({
        description: desc.trim(),
        department:  user?.department || '',
        metadata:    meta,
      })
      setTicket(result)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit. Please try again.')
    } finally { setLoading(false) }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const IS = { background: C.inputBg, borderColor: C.inputBorder, color: C.inputText }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-white">Quick Incident</h2>
              <p className="text-xs text-red-100">High priority — submitted instantly</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none transition-colors">&times;</button>
        </div>

        {ticket ? (
          /* ── Success state ── */
          <div className="px-6 py-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-1" style={{ color: C.text }}>Ticket Raised!</h3>
            <p className="text-sm mb-4" style={{ color: C.dim }}>Your incident has been logged and assigned.</p>
            <div className="rounded-xl px-6 py-4 mb-6 inline-block"
              style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: C.dim }}>TICKET ID</p>
              <p className="text-2xl font-bold" style={{ color: C.accent !== 'rgba(255,255,255,0.22)' ? C.accent : '#4361EE' }}>
                {ticket.id}
              </p>
            </div>
            <p className="text-xs mb-6" style={{ color: C.dim }}>
              Priority: <span className="font-semibold text-red-500">High</span> · Status: <span className="font-semibold">{ticket.status}</span>
            </p>
            <button onClick={onClose}
              className="px-8 py-2.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#4361EE' }}>
              Close
            </button>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* User info — read-only if logged in, editable if not */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.label }}>
                  Full Name {!user && <span className="text-red-500">*</span>}
                </label>
                <input
                  readOnly={!!user}
                  value={name}
                  onChange={e => { if (!user) { setName(e.target.value); setError('') } }}
                  placeholder={user ? '' : 'Your full name'}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  style={{ ...IS, opacity: user ? 0.7 : 1, cursor: user ? 'not-allowed' : 'text' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: C.label }}>
                  Work Email {!user && <span className="text-red-500">*</span>}
                </label>
                <input
                  readOnly={!!user}
                  value={email}
                  onChange={e => { if (!user) { setEmail(e.target.value); setError('') } }}
                  placeholder={user ? '' : 'you@cognida.ai'}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  style={{ ...IS, opacity: user ? 0.7 : 1, cursor: user ? 'not-allowed' : 'text' }} />
              </div>
            </div>

            {/* Issue description */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: C.label }}>
                Issue Description <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                rows={5}
                value={desc}
                onChange={e => { setDesc(e.target.value); setError('') }}
                placeholder="Briefly describe what's happening… (e.g. 'Cannot connect to VPN since 9 AM')"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                style={IS}
              />
            </div>

            {/* Metadata note */}
            <p className="text-xs" style={{ color: C.dim }}>
              📎 Device info &amp; timestamp will be attached automatically.
            </p>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm text-red-500"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-80"
                style={{ background: C.inputBg, border: `1px solid ${C.inputBorder}`, color: C.dim }}>
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                {loading
                  ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg> Submitting…</>
                  : '⚡ Submit Incident'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function ThemeToggle({ darkMode, onToggle, C }) {
  return (
    <button
      onClick={onToggle}
      title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        background: C.toggleBg,
        border: `1px solid ${C.toggleBorder}`,
        color: C.toggleText,
        borderRadius: '999px',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.25s',
        flexShrink: 0,
      }}
    >
      {darkMode ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
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
  )
}

export default function HelpdeskPortal() {
  const [view, setView]               = useState('incident')
  const [successData, setSuccessData] = useState(null)
  const [formKey, setFormKey]         = useState(0)
  const [quickModal, setQuickModal]   = useState(false)
  const [darkMode, setDarkMode]       = useState(() => {
    const saved = localStorage.getItem('appTheme')
    return saved !== 'light'
  })

  const C = darkMode ? DARK : LIGHT

  const toggleTheme = () => setDarkMode(d => {
    const next = !d
    localStorage.setItem('appTheme', next ? 'dark' : 'light')
    return next
  })

  const handleSuccess = (ticket, form, screenshots) => setSuccessData({ ticket, form, screenshots })
  const handleReset   = () => { setSuccessData(null); setFormKey(k => k + 1) }

  const renderMain = () => {
    if (successData) return <SuccessScreen {...successData} onReset={handleReset} C={C} />
    switch (view) {
      case 'incident':     return <TicketForm key={formKey} ticketType="incident"        catalog={INCIDENT_CATALOG} onSuccess={handleSuccess} C={C} />
      case 'service':      return <TicketForm key={formKey} ticketType="service_request" catalog={SERVICE_CATALOG}  onSuccess={handleSuccess} C={C} />
      case 'my-incidents': return <MyTicketsView ticketType="incident"        title="Past Incidents" C={C} />
      case 'my-service':   return <MyTicketsView ticketType="service_request" title="Past Service Requests" C={C} />
      default:             return null
    }
  }

  const activeNav = NAV.find(n => n.id === view)

  return (
    <div className="flex h-screen overflow-hidden" style={{background: C.page}}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-56 flex-shrink-0 flex flex-col" style={{background: C.sidebar, borderRight: `1px solid ${C.sideBorder}`}}>

        {/* Logo + Theme Toggle */}
        <div className="px-5 py-6" style={{borderBottom: `1px solid ${C.sideBorder}`}}>
          <div className="flex flex-col items-center gap-2 mb-3">
            <img src="/logo.png" alt="Cognida" className="h-12 w-auto"
              onError={e => { e.target.style.display='none' }} />
            <div className="text-center">
              <h1 className="font-bold text-base leading-tight" style={{color: C.sideText}}>Cognida.ai</h1>
              <p className="text-xs" style={{color: C.sideMuted}}>IT Helpdesk Portal</p>
            </div>
          </div>
          {/* Theme toggle in sidebar top-left area */}
          <div className="flex justify-center mb-2">
            <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} C={C} />
          </div>
          <p className="text-xs text-center leading-relaxed px-1" style={{color: C.sideDim}}>
            Raise tickets, track incidents and service requests — all in one place.
          </p>
        </div>

        {/* ⚡ Quick Incident button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setQuickModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 14px rgba(239,68,68,0.45)' }}
          >
            ⚡ Quick Incident
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id}
              onClick={() => { setView(item.id); setSuccessData(null) }}
              className="w-full text-left px-3 py-3 rounded-xl transition-all focus:outline-none"
              style={view === item.id
                ? {background: C.sideAccent, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'}
                : {background: 'transparent'}
              }
              onMouseEnter={e => { if(view!==item.id) e.currentTarget.style.background=C.sideNavHover }}
              onMouseLeave={e => { if(view!==item.id) e.currentTarget.style.background='transparent' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold leading-tight" style={{color: C.sideText}}>{item.label}</p>
                  <p className="text-xs leading-tight mt-0.5" style={{color: C.sideDim}}>{item.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{borderTop: `1px solid ${C.sideBorder}`}}>
          <p className="text-xs text-center" style={{color: C.sideFooter}}>© 2026 Cognida.ai</p>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{background: C.topbar, borderBottom: `1px solid ${C.sideBorder}`}}>
          <div>
            <h2 className="text-base font-bold" style={{color: C.topbarText}}>{activeNav?.icon} {activeNav?.label}</h2>
            <p className="text-xs" style={{color: C.topbarMuted}}>{activeNav?.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)'}}>
              🏠 Cognida.ai Helpdesk Portal
            </div>
            {/* Theme toggle in top-right corner */}
            <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} C={C} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {renderMain()}
          </div>
        </div>
      </div>

      {/* ⚡ Quick Incident Modal */}
      {quickModal && <QuickIncidentModal onClose={() => setQuickModal(false)} C={C} />}
    </div>
  )
}
