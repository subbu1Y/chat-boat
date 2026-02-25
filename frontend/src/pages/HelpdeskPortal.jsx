import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createHelpdeskTicket } from '../services/api'

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const CATEGORIES = ['Network', 'Software', 'Hardware', 'Email', 'Access & Permissions', 'Other']

const PRIORITY_INFO = {
  Low:      { color: 'border-green-400  bg-green-50  text-green-700',  icon: '🟢', desc: 'Non-urgent, no work impact' },
  Medium:   { color: 'border-yellow-400 bg-yellow-50 text-yellow-700', icon: '🟡', desc: 'Minor impact, can wait a day' },
  High:     { color: 'border-orange-400 bg-orange-50 text-orange-700', icon: '🟠', desc: 'Work impacted, needs attention' },
  Critical: { color: 'border-red-500    bg-red-50    text-red-700',    icon: '🔴', desc: 'Work completely blocked' },
}

function StepBadge({ n, active, done }) {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all'
  if (done)   return <div className={`${base} bg-indigo-600 text-white`}>✓</div>
  if (active) return <div className={`${base} bg-indigo-600 text-white ring-4 ring-indigo-200`}>{n}</div>
  return <div className={`${base} bg-gray-100 text-gray-400`}>{n}</div>
}

function StepLine({ done }) {
  return <div className={`flex-1 h-0.5 mx-1 transition-all ${done ? 'bg-indigo-600' : 'bg-gray-200'}`} />
}

export default function HelpdeskPortal() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', department: '',
    subject: '', description: '', priority: 'Medium', category: '',
    attachment_note: '',
  })
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [createdTicket, setCreatedTicket] = useState(null)

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }))

  const nextStep = () => { setError(''); setStep(s => s + 1) }
  const prevStep = () => { setError(''); setStep(s => s - 1) }

  const validateStep1 = () => {
    if (!form.name.trim())   { setError('Full name is required.'); return false }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required.'); return false }
    return true
  }
  const validateStep2 = () => {
    if (!form.subject.trim())  { setError('Subject is required.'); return false }
    if (!form.category)        { setError('Please select a category.'); return false }
    if (!form.description.trim()) { setError('Description is required.'); return false }
    return true
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const ticket = await createHelpdeskTicket({
        subject:     form.subject.trim(),
        description: `[Raised by: ${form.name} <${form.email}>]${form.department ? ` | Dept: ${form.department}` : ''}\n\n${form.description.trim()}${form.attachment_note ? `\n\nAttachment note: ${form.attachment_note}` : ''}`,
        priority:    form.priority,
        category:    form.category || null,
      })
      setCreatedTicket(ticket)
      setStep(4)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Success ── */
  if (step === 4 && createdTicket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-10 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ticket Submitted!</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Our IT team has been notified and will get back to you soon.
          </p>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 text-left space-y-3 mb-7 text-sm border border-indigo-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Ticket ID</span>
              <span className="font-mono font-bold text-indigo-600 text-base">{createdTicket.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Subject</span>
              <span className="text-gray-700 text-right max-w-56">{createdTicket.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Priority</span>
              <span className="text-gray-700">{createdTicket.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Status</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">{createdTicket.status}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            A confirmation will be sent to <strong>{form.email}</strong>
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setStep(1); setForm({ name:'',email:'',department:'',subject:'',description:'',priority:'Medium',category:'',attachment_note:'' }); setCreatedTicket(null) }}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Raise Another Ticket
            </button>
            <Link to="/" className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
              Go to Chat
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Cognida" className="h-9 w-auto" onError={e => e.target.style.display='none'} />
            <div>
              <h1 className="text-lg font-bold text-gray-800 leading-tight">Cognida.ai IT Helpdesk</h1>
              <p className="text-xs text-gray-400">Support Portal — Raise a Ticket</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
            >
              💬 Chat Assistant
            </Link>
            <span className="text-gray-200">|</span>
            <Link
              to="/helpdesk"
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              📊 Helpdesk Portal
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Page Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Submit a Support Ticket</h2>
          <p className="text-gray-500 text-sm">
            Fill in the details below and our IT team will respond as quickly as possible.
          </p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center mb-8">
          <StepBadge n={1} active={step === 1} done={step > 1} />
          <StepLine done={step > 1} />
          <StepBadge n={2} active={step === 2} done={step > 2} />
          <StepLine done={step > 2} />
          <StepBadge n={3} active={step === 3} done={step > 3} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mb-8 px-2">
          <span className={step >= 1 ? 'text-indigo-600 font-semibold' : ''}>Your Details</span>
          <span className={step >= 2 ? 'text-indigo-600 font-semibold' : ''}>Issue Details</span>
          <span className={step >= 3 ? 'text-indigo-600 font-semibold' : ''}>Review & Submit</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* ── Step 1: Your Details ── */}
          {step === 1 && (
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👤</span>
                <h3 className="text-lg font-bold text-gray-800">Your Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Subrahmanyam P"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Work Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="you@cognida.ai"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Department <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  placeholder="e.g. Engineering, Marketing, Sales"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                />
              </div>

              {error && <ErrorBox msg={error} />}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { if (validateStep1()) nextStep() }}
                  className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Issue Details ── */}
          {step === 2 && (
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔧</span>
                <h3 className="text-lg font-bold text-gray-800">Issue Details</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={e => set('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => set('priority', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Priority hint */}
              {form.priority && (
                <div className={`flex items-center gap-3 rounded-xl p-3 border text-sm ${PRIORITY_INFO[form.priority]?.color}`}>
                  <span className="text-lg">{PRIORITY_INFO[form.priority]?.icon}</span>
                  <span>{PRIORITY_INFO[form.priority]?.desc}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the issue in detail — what happened, when did it start, any error messages, steps already tried…"
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Attachment Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.attachment_note}
                  onChange={e => set('attachment_note', e.target.value)}
                  placeholder="e.g. Screenshot saved at \\shared\screenshots\error.png"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300"
                />
              </div>

              {error && <ErrorBox msg={error} />}

              <div className="flex justify-between pt-2">
                <button onClick={prevStep} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => { if (validateStep2()) nextStep() }}
                  className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Review & Submit ── */}
          {step === 3 && (
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="text-lg font-bold text-gray-800">Review & Submit</h3>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 space-y-3 text-sm border border-gray-100">
                <ReviewRow label="Name"        value={form.name} />
                <ReviewRow label="Email"       value={form.email} />
                {form.department && <ReviewRow label="Department" value={form.department} />}
                <div className="border-t border-gray-200 my-2" />
                <ReviewRow label="Subject"     value={form.subject} />
                <ReviewRow label="Category"    value={form.category} />
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Priority</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${PRIORITY_INFO[form.priority]?.color}`}>
                    {PRIORITY_INFO[form.priority]?.icon} {form.priority}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 font-medium">Description</span>
                  <span className="text-gray-700 bg-white border border-gray-100 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">{form.description}</span>
                </div>
                {form.attachment_note && <ReviewRow label="Attachment Note" value={form.attachment_note} />}
              </div>

              {error && <ErrorBox msg={error} />}

              <div className="flex justify-between pt-2">
                <button onClick={prevStep} disabled={loading} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
                  ← Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting…
                    </>
                  ) : '🎫 Submit Ticket'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Cognida.ai IT Helpdesk · Powered by RAG &amp; Groq LLM ·{' '}
          <Link to="/" className="text-indigo-500 hover:underline">Open Chat Assistant</Link>
        </p>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-500 font-medium flex-shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  )
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
