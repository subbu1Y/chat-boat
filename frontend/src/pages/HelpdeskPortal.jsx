import { useState, useRef, useCallback } from 'react'
import { createHelpdeskTicket, getMyTickets, trackTicket } from '../services/api'

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const PRIORITY_INFO = {
  Low:      { color: 'border-green-400 bg-green-50 text-green-700',   icon: '🟢', desc: 'Non-urgent, no work impact' },
  Medium:   { color: 'border-yellow-400 bg-yellow-50 text-yellow-700', icon: '🟡', desc: 'Minor impact, can wait a day' },
  High:     { color: 'border-orange-400 bg-orange-50 text-orange-700', icon: '🟠', desc: 'Work impacted, needs attention' },
  Critical: { color: 'border-red-500 bg-red-50 text-red-700',          icon: '🔴', desc: 'Work completely blocked' },
}

const ASSIGNMENT_MAP = {
  'Network & Connectivity':  'aditya.kovoor@cognida.ai',
  'Server & Infrastructure': 'aditya.kovoor@cognida.ai',
  'Security':                'aditya.kovoor@cognida.ai',
  'Hardware & Devices':      'aditya.kovoor@cognida.ai',
}
const ASSIGNEE_NAMES = {
  'aditya.kovoor@cognida.ai':             'Aditya Kovoor',
  'subrahmanyam.pillalamarri@cognida.ai': 'Subrahmanyam Pillalamarri',
}
const getAssignee = (cat) => ASSIGNMENT_MAP[cat] || 'subrahmanyam.pillalamarri@cognida.ai'

const INCIDENT_CATALOG = {
  'Network & Connectivity': ['No internet access','Slow internet / poor connection','VPN not connecting','Wi-Fi not working','Ethernet / LAN issue','Remote desktop not connecting','Firewall / port blocking','Other network issue'],
  'Server & Infrastructure': ['Server not responding','SSH / remote access issue','Database connection failure','Cloud service issue','Backup / restore issue','Storage / disk full','Service / process down','Other server issue'],
  'Hardware & Devices': ['Laptop / Desktop not turning on','Screen / display issue','Keyboard or mouse not working','Printer not printing','USB / peripheral not detected','Battery / charging issue','Other hardware issue'],
  'Email & Communication': ['Cannot send or receive emails','Outlook not opening','Teams / Slack not working','Video call / audio issue','Other email issue'],
  'Security': ['Suspected malware / virus','Phishing email received','Data loss / accidental deletion','Suspicious activity on account','Other security issue'],
  'Software & Applications': ['Application crashing / freezing','Software not opening','Error message in application','Browser issue','Other software issue'],
  'Access & Permissions': ['Password reset required','Account locked out','Cannot access shared drive','Permission denied','MFA / 2FA issue','Other access issue'],
  'Other': ['Other (describe below)'],
}

const SERVICE_CATALOG = {
  'New Equipment Request': ['New laptop / desktop','New monitor / peripheral','New mobile device','Office equipment setup'],
  'Software Installation': ['New software license request','Install / upgrade application','Browser extension / plugin'],
  'Account & Access Setup': ['New employee onboarding','Create new user account','Grant access to system / drive','VPN / remote access setup','Email account creation'],
  'Network Setup': ['New office Wi-Fi setup','Network point installation','VPN configuration'],
  'Procurement Request': ['Hardware procurement','Software procurement','IT accessories'],
  'IT Consultation': ['IT policy / compliance query','Security awareness query','General IT guidance'],
  'Other': ['Other service request (describe below)'],
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
  topbar:       '#0B1854',
  text:         '#E8EEFF',
  muted:        '#7EA6FF',
  dim:          '#3B5299',
  accent:       '#4361EE',
  navHover:     '#0F1F6B',
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
  sidebar:      '#FFFFFF',
  sideBorder:   '#E2E8F0',
  topbar:       '#FFFFFF',
  text:         '#1E293B',
  muted:        '#4361EE',
  dim:          '#64748B',
  accent:       '#4361EE',
  navHover:     '#EEF2FF',
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
  toggleBg:     '#EEF2FF',
  toggleBorder: '#C7D7FF',
  toggleText:   '#4361EE',
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
  const fileInputRef                  = useRef(null)
  const MAX_FILES = 5

  const IS = { background: C.inputBg, borderColor: C.inputBorder, color: C.inputText }

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
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
    <div className="p-6">
      {/* Step indicator */}
      <div className="w-full mb-6">
        <div className="flex items-center rounded-2xl px-8 py-4" style={{background: C.stepBg}}>
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
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👤</span>
              <h3 style={{color: C.text}} className="text-2xl font-bold">Your Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label style={{color: C.label}} className="block text-base font-semibold mb-2">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Subrahmanyam P"
                  style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label style={{color: C.label}} className="block text-base font-semibold mb-2">Work Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@cognida.ai"
                  style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
            <div>
              <label style={{color: C.label}} className="block text-base font-semibold mb-2">Department <span className="font-normal text-sm" style={{color: C.dim}}>(optional)</span></label>
              <input type="text" value={form.department} onChange={e=>set('department',e.target.value)} placeholder="e.g. Engineering, QA, Sales"
                style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex justify-end">
              <button onClick={()=>{if(v1())nextStep()}} className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700 transition-colors">Next →</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{ticketType === 'incident' ? '🚨' : '🔧'}</span>
              <h3 style={{color: C.text}} className="text-2xl font-bold">Issue Details</h3>
            </div>
            <div>
              <label style={{color: C.label}} className="block text-base font-semibold mb-2">Subject <span className="text-red-500">*</span></label>
              <input type="text" value={form.subject} onChange={e=>set('subject',e.target.value)} placeholder="Brief summary of the issue"
                style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label style={{color: C.label}} className="block text-base font-semibold mb-2">Category <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={e=>{set('category',e.target.value);set('issue_type','')}}
                  style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select category</option>
                  {categories.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{color: C.label}} className="block text-base font-semibold mb-2">Priority</label>
                <select value={form.priority} onChange={e=>set('priority',e.target.value)}
                  style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            {form.category && (
              <div>
                <label style={{color: C.label}} className="block text-base font-semibold mb-2">Issue Type <span className="text-red-500">*</span></label>
                <select value={form.issue_type} onChange={e=>set('issue_type',e.target.value)}
                  style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Select issue type</option>
                  {(catalog[form.category]||[]).map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {form.priority && (
              <div className={`flex items-center gap-3 rounded-xl p-4 border text-base ${PRIORITY_INFO[form.priority]?.color}`}>
                <span className="text-xl">{PRIORITY_INFO[form.priority]?.icon}</span>
                <span>{PRIORITY_INFO[form.priority]?.desc}</span>
              </div>
            )}
            <div>
              <label style={{color: C.label}} className="block text-base font-semibold mb-2">Description <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={5}
                placeholder="Describe in detail — what happened, when, any error messages…"
                style={IS} className="w-full border rounded-xl px-5 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            {/* Screenshot upload */}
            <div>
              <label style={{color: C.label}} className="block text-base font-semibold mb-2">
                Screenshots <span className="font-normal text-sm" style={{color: C.dim}}>(optional · max 5 · 5MB each)</span>
              </label>
              <div onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(e.dataTransfer.files)}}
                onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
                onClick={()=>fileInputRef.current?.click()}
                style={{
                  background: dragOver ? 'rgba(99,102,241,0.08)' : C.dragBg,
                  borderColor: dragOver ? '#6366F1' : C.dragBorder,
                }}
                className="border-2 border-dashed rounded-xl px-6 py-7 text-center cursor-pointer transition-all hover:border-indigo-400">
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>addFiles(e.target.files)} />
                <svg className="w-9 h-9 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p style={{color: C.dim}} className="text-base"><span className="text-indigo-500 font-semibold">Click</span> or drag &amp; drop screenshots</p>
              </div>
              {screenshots.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {screenshots.map((s,i)=>(
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                      <img src={s.preview} alt={s.name} className="w-full h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={e=>{e.stopPropagation();removeShot(i)}} className="w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600">✕</button>
                      </div>
                      <p style={{color: C.dim}} className="text-xs px-1 py-0.5 truncate">{s.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && <ErrorBox msg={error} />}
            <div className="flex justify-between">
              <button onClick={prevStep} style={{background: C.inputBg, color: C.text, borderColor: C.inputBorder}} className="px-8 py-3.5 border rounded-xl text-base font-semibold hover:opacity-80 transition-opacity">← Back</button>
              <button onClick={()=>{if(v2())nextStep()}} className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700">Review →</button>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="p-10 space-y-8">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✅</span>
              <h3 style={{color: C.text}} className="text-2xl font-bold">Review & Submit</h3>
            </div>
            <div style={{background: C.rvBg, borderColor: C.rvBorder}} className="rounded-2xl p-6 space-y-4 text-base border">
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
              <button onClick={prevStep} disabled={loading} style={{background: C.inputBg, color: C.text, borderColor: C.inputBorder}} className="px-8 py-3.5 border rounded-xl text-base font-semibold hover:opacity-80 transition-opacity disabled:opacity-50">← Edit</button>
              <button onClick={handleSubmit} disabled={loading} className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
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
              <h1 className="font-bold text-base leading-tight" style={{color: C.text}}>Cognida.ai</h1>
              <p className="text-xs" style={{color: C.muted}}>IT Helpdesk Portal</p>
            </div>
          </div>
          {/* Theme toggle in sidebar top-left area */}
          <div className="flex justify-center mb-2">
            <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} C={C} />
          </div>
          <p className="text-xs text-center leading-relaxed px-1" style={{color: C.dim}}>
            Raise tickets, track incidents and service requests — all in one place.
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.id}
              onClick={() => { setView(item.id); setSuccessData(null) }}
              className="w-full text-left px-3 py-3 rounded-xl transition-all focus:outline-none"
              style={view === item.id
                ? {background: C.accent, boxShadow: '0 2px 8px rgba(67,97,238,0.4)'}
                : {background: 'transparent'}
              }
              onMouseEnter={e => { if(view!==item.id) e.currentTarget.style.background=C.navHover }}
              onMouseLeave={e => { if(view!==item.id) e.currentTarget.style.background='transparent' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold leading-tight" style={{color: view===item.id ? '#fff' : C.text}}>{item.label}</p>
                  <p className="text-xs leading-tight mt-0.5" style={{color: view===item.id ? 'rgba(255,255,255,0.7)' : C.dim}}>{item.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{borderTop: `1px solid ${C.sideBorder}`}}>
          <p className="text-xs text-center" style={{color: C.footer}}>© 2026 Cognida.ai</p>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={{background: C.topbar, borderBottom: `1px solid ${C.sideBorder}`}}>
          <div>
            <h2 className="text-base font-bold" style={{color: C.text}}>{activeNav?.icon} {activeNav?.label}</h2>
            <p className="text-xs" style={{color: C.muted}}>{activeNav?.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{background: C.badgeBg, color: C.badgeText, border: `1px solid ${C.badgeBorder}`}}>
              🏠 Cognida.ai Helpdesk Portal
            </div>
            {/* Theme toggle in top-right corner */}
            <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} C={C} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderMain()}
        </div>
      </div>
    </div>
  )
}
