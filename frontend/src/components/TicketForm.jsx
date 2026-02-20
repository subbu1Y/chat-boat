import { useState } from 'react'
import { createTicket } from '../services/api'
import './TicketForm.css'

function TicketForm({ onClose }) {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'Medium',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdTicket, setCreatedTicket] = useState(null)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject.trim()) {
      alert('Please enter a subject')
      return
    }

    setLoading(true)
    try {
      const ticket = await createTicket({
        subject: formData.subject.trim(),
        description: formData.description.trim() || '(No description)',
        priority: formData.priority,
        category: formData.category || null
      })
      
      setCreatedTicket(ticket)
      setSuccess(true)
      setFormData({ subject: '', description: '', priority: 'Medium', category: '' })
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert('Failed to create ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success && createdTicket) {
    return (
      <div className="ticket-form-container">
        <div className="success-message">
          <h2>✓ Ticket Created Successfully!</h2>
          <div className="ticket-info">
            <p><strong>Ticket ID:</strong> {createdTicket.id}</p>
            <p><strong>Subject:</strong> {createdTicket.subject}</p>
            <p><strong>Priority:</strong> {createdTicket.priority}</p>
            <p><strong>Status:</strong> {createdTicket.status}</p>
          </div>
          <div className="success-actions">
            <button onClick={() => { setSuccess(false); setCreatedTicket(null); }} className="another-btn">
              Create Another Ticket
            </button>
            <button onClick={onClose} className="close-btn">
              Back to Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-form-container">
      <div className="ticket-form-header">
        <h2>🎫 Create IT Ticket</h2>
        <button onClick={onClose} className="close-x-btn">✖</button>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-group">
          <label htmlFor="subject">Subject *</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="e.g., Cannot access email"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your issue in detail..."
            rows="5"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category (Optional)</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">Select a category</option>
            <option value="Network">Network</option>
            <option value="Software">Software</option>
            <option value="Hardware">Hardware</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Submit Ticket'}
          </button>
          <button type="button" onClick={onClose} disabled={loading} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default TicketForm
