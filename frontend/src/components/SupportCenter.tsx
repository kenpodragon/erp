import { useState, useEffect } from 'react'
import { api } from '../api'
import './SupportCenter.css'

interface Ticket {
  id: number
  category: string
  priority: string
  subject: string
  status: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
  has_new_activity?: boolean
}

interface Reply {
  id: number
  ticket_id: number
  author_type: string
  author_id: number | null
  author_email: string | null
  content: string
  is_internal_note: boolean
  created_at: string
}

type View = 'list' | 'new' | 'detail'

const CATEGORY_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  account_issue: 'Account Issue',
  payment_issue: 'Billing Issue',
  feedback: 'Feedback',
  other: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function SupportCenter() {
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Detail view state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')
  const [replySending, setReplySending] = useState(false)

  // New ticket form state
  const [newCategory, setNewCategory] = useState('bug_report')
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reopen state
  const [reopenReason, setReopenReason] = useState('')
  const [showReopen, setShowReopen] = useState(false)

  // Close state
  const [closeNote, setCloseNote] = useState('')
  const [showClose, setShowClose] = useState(false)

  const fetchTickets = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('limit', '50')
      const res = await api.get(`/api/support/tickets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets)
        setTotal(data.total)
      } else {
        setError('Failed to load tickets')
      }
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'list') fetchTickets()
  }, [view, statusFilter])

  const openTicketDetail = async (ticketId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/support/tickets/${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
        setReplies(data.replies)
        setView('detail')
        setReplyText('')
        setReplyError('')
        setShowReopen(false)
        setReopenReason('')
        setShowClose(false)
        setCloseNote('')
      } else {
        setError('Failed to load ticket')
      }
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await api.post('/api/support/tickets', {
        category: newCategory,
        subject: newSubject.trim(),
        description: newDescription.trim(),
      })
      if (res.ok) {
        setNewCategory('bug_report')
        setNewSubject('')
        setNewDescription('')
        setView('list')
      } else {
        const data = await res.json()
        setSubmitError(data.detail || 'Failed to submit ticket')
      }
    } catch {
      setSubmitError('Could not reach server')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async () => {
    if (!selectedTicket) return
    setReplyError('')
    setReplySending(true)
    try {
      const res = await api.post(`/api/support/tickets/${selectedTicket.id}/replies`, {
        content: replyText.trim(),
      })
      if (res.ok) {
        setReplyText('')
        await openTicketDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setReplyError(data.detail || 'Failed to send reply')
      }
    } catch {
      setReplyError('Could not reach server')
    } finally {
      setReplySending(false)
    }
  }

  const handleReopen = async () => {
    if (!selectedTicket) return
    setReplyError('')
    try {
      const res = await api.patch(`/api/support/tickets/${selectedTicket.id}/reopen`, {
        reason: reopenReason.trim(),
      })
      if (res.ok) {
        setReopenReason('')
        setShowReopen(false)
        await openTicketDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setReplyError(data.detail || 'Failed to reopen ticket')
      }
    } catch {
      setReplyError('Could not reach server')
    }
  }

  const handleClose = async () => {
    if (!selectedTicket) return
    setReplyError('')
    try {
      const res = await api.patch(`/api/support/tickets/${selectedTicket.id}/close`, {
        note: closeNote.trim(),
      })
      if (res.ok) {
        setCloseNote('')
        setShowClose(false)
        await openTicketDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setReplyError(data.detail || 'Failed to close ticket')
      }
    } catch {
      setReplyError('Could not reach server')
    }
  }

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="support-container">
        <div className="support-header">
          <h2>My Support Tickets</h2>
          <button className="btn-primary" onClick={() => setView('new')}>New Ticket</button>
        </div>

        <div className="support-filters">
          <select
            className="form-control support-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <span className="support-count">{total} ticket{total !== 1 ? 's' : ''}</span>
        </div>

        {error && <p className="support-error">{error}</p>}
        {loading && <p className="support-loading">Loading...</p>}

        {!loading && tickets.length === 0 && (
          <div className="support-empty">
            <p>No tickets found. Need help? Submit a new ticket.</p>
          </div>
        )}

        {tickets.length > 0 && (
          <div className="ticket-list">
            {tickets.map((t) => (
              <div key={t.id} className={`ticket-row ${t.has_new_activity ? 'ticket-row-new' : ''}`} onClick={() => openTicketDetail(t.id)}>
                <div className="ticket-row-main">
                  {t.has_new_activity && <span className="new-activity-dot" title="New activity">●</span>}
                  <span className={`ticket-status-badge status-${t.status}`}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span className="ticket-subject">{t.subject}</span>
                </div>
                <div className="ticket-row-meta">
                  <span className="ticket-category-badge">{CATEGORY_LABELS[t.category] || t.category}</span>
                  <span className="ticket-date">{formatDate(t.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── New Ticket Form ──
  if (view === 'new') {
    return (
      <div className="support-container">
        <div className="support-header">
          <h2>Submit a Ticket</h2>
          <button className="btn-secondary" onClick={() => setView('list')}>Back to Tickets</button>
        </div>

        <form className="ticket-form" onSubmit={handleSubmitTicket}>
          <div className="form-group">
            <label>Category</label>
            <select className="form-control" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="bug_report">Bug Report</option>
              <option value="account_issue">Account Issue</option>
              <option value="payment_issue">Billing Issue</option>
              <option value="feedback">Feedback / Suggestion</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Subject <span className="char-count">({newSubject.length}/100)</span></label>
            <input
              type="text"
              className="form-control"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              maxLength={100}
              minLength={5}
              required
              placeholder="Brief summary of your issue"
            />
          </div>

          <div className="form-group">
            <label>Description <span className="char-count">({newDescription.length}/5000)</span></label>
            <textarea
              className="form-control ticket-textarea"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              maxLength={5000}
              minLength={20}
              required
              placeholder="Please describe your issue in detail (minimum 20 characters)"
            />
          </div>

          {submitError && <p className="support-error">{submitError}</p>}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    )
  }

  // ── Ticket Detail View ──
  if (view === 'detail' && selectedTicket) {
    const canReply = selectedTicket.status === 'open' || selectedTicket.status === 'in_progress'
    const canReopen = selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'
    const canClose = selectedTicket.status !== 'closed'

    return (
      <div className="support-container">
        <div className="support-header">
          <h2>Ticket #{selectedTicket.id}</h2>
          <button className="btn-secondary" onClick={() => setView('list')}>Back to Tickets</button>
        </div>

        <div className="ticket-detail-meta">
          <div className="meta-row">
            <span className="meta-label">Status:</span>
            <span className={`ticket-status-badge status-${selectedTicket.status}`}>
              {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Category:</span>
            <span className="ticket-category-badge">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Subject:</span>
            <span>{selectedTicket.subject}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Created:</span>
            <span>{formatDate(selectedTicket.created_at)}</span>
          </div>
        </div>

        <div className="reply-chain">
          <h3>Conversation</h3>
          {replies.map((r) => (
            <div key={r.id} className={`reply-bubble ${r.author_type === 'admin' ? 'reply-admin' : 'reply-player'}`}>
              <div className="reply-header">
                <span className="reply-author">
                  {r.author_type === 'admin' ? 'Support Team' : 'You'}
                </span>
                <span className="reply-time">{formatDate(r.created_at)}</span>
              </div>
              <div className="reply-content">{r.content}</div>
            </div>
          ))}
        </div>

        {canReply && (
          <div className="reply-form">
            <textarea
              className="form-control ticket-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply (minimum 20 characters)"
              maxLength={5000}
            />
            {replyError && <p className="support-error">{replyError}</p>}
            <button
              className="btn-primary"
              onClick={handleReply}
              disabled={replySending || replyText.trim().length < 20}
            >
              {replySending ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        )}

        {canClose && (
          <div className="close-section">
            {!showClose ? (
              <button className="btn-close-ticket" onClick={() => setShowClose(true)}>
                Close Ticket
              </button>
            ) : (
              <div className="close-form">
                <textarea
                  className="form-control"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="Optional closing note (max 500 characters)"
                  maxLength={500}
                />
                {replyError && <p className="support-error">{replyError}</p>}
                <div className="close-actions">
                  <button className="btn-close-ticket" onClick={handleClose}>
                    Confirm Close
                  </button>
                  <button className="btn-secondary" onClick={() => { setShowClose(false); setCloseNote('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {canReopen && (
          <div className="reopen-section">
            {!showReopen ? (
              <button className="btn-secondary" onClick={() => setShowReopen(true)}>
                Reopen Ticket
              </button>
            ) : (
              <div className="reopen-form">
                <textarea
                  className="form-control"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Why are you reopening this ticket? (10-500 characters)"
                  maxLength={500}
                />
                {replyError && <p className="support-error">{replyError}</p>}
                <div className="reopen-actions">
                  <button
                    className="btn-primary"
                    onClick={handleReopen}
                    disabled={reopenReason.trim().length < 10}
                  >
                    Confirm Reopen
                  </button>
                  <button className="btn-secondary" onClick={() => { setShowReopen(false); setReopenReason('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}
