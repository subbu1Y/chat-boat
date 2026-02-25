import { useState } from 'react'
import { createTicket } from '../services/api'

const PRIORITIES  = ['Low', 'Medium', 'High']
const CATEGORIES  = ['Network', 'Software', 'Hardware', 'Other']

export default function TicketForm({ onClose }) {
  const [formData, setFormData] = useState({
    subject: '', description: '', priority: 'Medium', category: ''
  })
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [createdTicket, setCreatedTicket] = useState(null)

  const handleChange = e =>
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.subject.trim()) { setError('Subject is required.'); return }
    setError('')
    setLoading(true)
    try {
      const ticket = await createTicket({
        subject:     formData.subject.trim(),
        description: formData.description.trim() || '(No description)',
        priority:    formData.priority,
        category:    formData.category || null,
      })
      setCreatedTicket(ticket)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Success Screen ── */
  if (createdTicket) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Ticket Created!</h2>
          <p className="text-sm text-gray-500 mb-5">Your ticket has been submitted successfully.</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Ticket ID</span>
              <span className="font-mono font-semibold text-indigo-600">{createdTicket.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Subject</span>
              <span className="text-gray-700 max-w-48 text-right">{createdTicket.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Priority</span>
              <span className="text-gray-700">{createdTicket.priority}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Status</span>
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{createdTicket.status}</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setCreatedTicket(null); setFormData({ subject: '', description: '', priority: 'Medium', category: '' }) }}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="flex items-start justify-center bg-gray-50 p-6 h-full overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎫</span>
            <h2 className="text-lg font-bold text-gray-800">Create IT Ticket</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g., Cannot access company email"
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-300 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your issue in detail — what happened, when, and any error messages…"
              rows={5}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder:text-gray-300 disabled:opacity-50"
            />
          </div>

          {/* Priority + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating…
                </>
              ) : 'Submit Ticket'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
