import { useState, useEffect } from 'react'
import { api } from '../api'
import './SupportTickets.css'

interface Ticket {
  id: number
  player_id: number
  category: string
  priority: string
  subject: string
  status: string
  assigned_admin: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  closed_at: string | null
  player_alias: string | null
  player_email: string | null
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

const CATEGORY_LABELS: Record<string, string> = {
  bug_report: 'Bug Report',
  account_issue: 'Account Issue',
  payment_issue: 'Billing',
  feedback: 'Feedback',
  other: 'Other',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
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

export default function SupportTickets() {
  const [view, setView] = useState<'queue' | 'detail'>('queue')

  // Queue state
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  // Detail state
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replies, setReplies] = useState<Reply[]>([])
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  // Quick action: resolve + reply
  const [resolveReplyText, setResolveReplyText] = useState('')
  const [showResolveReply, setShowResolveReply] = useState(false)

  const fetchTickets = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      params.set('limit', '50')
      params.set('sort_by', 'updated_at')
      params.set('sort_order', 'desc')
      const res = await api.get(`/api/admin/support/tickets?${params}`)
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
    if (view === 'queue') fetchTickets()
  }, [view, statusFilter, categoryFilter, priorityFilter])

  const openDetail = async (ticketId: number) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/admin/support/tickets/${ticketId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedTicket(data.ticket)
        setReplies(data.replies)
        setView('detail')
        setReplyText('')
        setNoteText('')
        setActionError('')
        setShowResolveReply(false)
        setResolveReplyText('')
      } else {
        setError('Failed to load ticket')
      }
    } catch {
      setError('Could not reach server')
    } finally {
      setLoading(false)
    }
  }

  const updateTicket = async (updates: Record<string, string>) => {
    if (!selectedTicket) return
    setSaving(true)
    setActionError('')
    try {
      const res = await api.patch(`/api/admin/support/tickets/${selectedTicket.id}`, updates)
      if (res.ok) {
        await openDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setActionError(data.detail || 'Update failed')
      }
    } catch {
      setActionError('Could not reach server')
    } finally {
      setSaving(false)
    }
  }

  const sendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSaving(true)
    setActionError('')
    try {
      const res = await api.post(`/api/admin/support/tickets/${selectedTicket.id}/replies`, {
        content: replyText.trim(),
      })
      if (res.ok) {
        setReplyText('')
        await openDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setActionError(data.detail || 'Failed to send reply')
      }
    } catch {
      setActionError('Could not reach server')
    } finally {
      setSaving(false)
    }
  }

  const sendNote = async () => {
    if (!selectedTicket || !noteText.trim()) return
    setSaving(true)
    setActionError('')
    try {
      const res = await api.post(`/api/admin/support/tickets/${selectedTicket.id}/notes`, {
        content: noteText.trim(),
      })
      if (res.ok) {
        setNoteText('')
        await openDetail(selectedTicket.id)
      } else {
        const data = await res.json()
        setActionError(data.detail || 'Failed to add note')
      }
    } catch {
      setActionError('Could not reach server')
    } finally {
      setSaving(false)
    }
  }

  const resolveAndReply = async () => {
    if (!selectedTicket || !resolveReplyText.trim()) return
    setSaving(true)
    setActionError('')
    try {
      // Send reply first, then update status
      const replyRes = await api.post(`/api/admin/support/tickets/${selectedTicket.id}/replies`, {
        content: resolveReplyText.trim(),
      })
      if (!replyRes.ok) {
        const data = await replyRes.json()
        setActionError(data.detail || 'Failed to send reply')
        setSaving(false)
        return
      }
      const statusRes = await api.patch(`/api/admin/support/tickets/${selectedTicket.id}`, {
        status: 'resolved',
      })
      if (statusRes.ok) {
        setResolveReplyText('')
        setShowResolveReply(false)
        await openDetail(selectedTicket.id)
      } else {
        const data = await statusRes.json()
        setActionError(data.detail || 'Failed to resolve')
      }
    } catch {
      setActionError('Could not reach server')
    } finally {
      setSaving(false)
    }
  }

  // ── Ticket Queue View ──
  if (view === 'queue') {
    return (
      <div className="st-container">
        <div className="st-header">
          <h2>Support Tickets</h2>
          <span className="st-total">{total} total</span>
        </div>

        <div className="st-filters">
          <select className="st-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select className="st-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="bug_report">Bug Report</option>
            <option value="account_issue">Account Issue</option>
            <option value="payment_issue">Billing</option>
            <option value="feedback">Feedback</option>
            <option value="other">Other</option>
          </select>
          <select className="st-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {error && <p className="st-error">{error}</p>}
        {loading && <p className="st-loading">Loading...</p>}

        {!loading && tickets.length === 0 && (
          <p className="st-empty">No tickets match the current filters.</p>
        )}

        {tickets.length > 0 && (
          <table className="st-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Player</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} onClick={() => openDetail(t.id)} className={`st-row-clickable ${t.has_new_activity ? 'st-row-new' : ''}`}>
                  <td className="st-id">
                    {t.has_new_activity && <span className="st-new-dot" title="New activity">●</span>}
                    #{t.id}
                  </td>
                  <td className="st-player">{t.player_alias || t.player_email || `Player #${t.player_id}`}</td>
                  <td className="st-subject">{t.subject}</td>
                  <td><span className="st-cat-badge">{CATEGORY_LABELS[t.category] || t.category}</span></td>
                  <td><span className={`st-pri-badge pri-${t.priority}`}>{PRIORITY_LABELS[t.priority] || t.priority}</span></td>
                  <td><span className={`st-status-badge sts-${t.status}`}>{STATUS_LABELS[t.status] || t.status}</span></td>
                  <td className="st-date">{formatDate(t.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  // ── Ticket Detail View ──
  if (view === 'detail' && selectedTicket) {
    return (
      <div className="st-container">
        <div className="st-header">
          <h2>Ticket #{selectedTicket.id}</h2>
          <button className="st-btn-back" onClick={() => setView('queue')}>Back to Queue</button>
        </div>

        {/* Meta + Controls */}
        <div className="st-detail-grid">
          <div className="st-detail-meta">
            <div className="st-meta-item">
              <span className="st-meta-label">Player</span>
              <span>{selectedTicket.player_alias || selectedTicket.player_email || `#${selectedTicket.player_id}`}</span>
            </div>
            <div className="st-meta-item">
              <span className="st-meta-label">Subject</span>
              <span>{selectedTicket.subject}</span>
            </div>
            <div className="st-meta-item">
              <span className="st-meta-label">Category</span>
              <span className="st-cat-badge">{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
            </div>
            <div className="st-meta-item">
              <span className="st-meta-label">Created</span>
              <span>{formatDate(selectedTicket.created_at)}</span>
            </div>
          </div>

          <div className="st-detail-controls">
            <div className="st-control-row">
              <label>Priority</label>
              <select
                className="st-select"
                value={selectedTicket.priority}
                onChange={(e) => updateTicket({ priority: e.target.value })}
                disabled={saving}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="st-control-row">
              <label>Status</label>
              <select
                className="st-select"
                value={selectedTicket.status}
                onChange={(e) => updateTicket({ status: e.target.value })}
                disabled={saving}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="st-control-row">
              <label>Assigned</label>
              <input
                className="st-input"
                type="text"
                value={selectedTicket.assigned_admin || ''}
                placeholder="admin@email.com"
                onBlur={(e) => {
                  if (e.target.value !== (selectedTicket.assigned_admin || '')) {
                    updateTicket({ assigned_admin: e.target.value })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
              />
            </div>
          </div>
        </div>

        {actionError && <p className="st-error">{actionError}</p>}

        {/* Quick Actions */}
        <div className="st-quick-actions">
          {!showResolveReply ? (
            <>
              <button
                className="st-btn-action st-btn-resolve"
                onClick={() => setShowResolveReply(true)}
                disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
              >
                Resolve + Reply
              </button>
              <button
                className="st-btn-action st-btn-close"
                onClick={() => updateTicket({ status: 'closed' })}
                disabled={selectedTicket.status === 'closed' || saving}
              >
                Close Ticket
              </button>
            </>
          ) : (
            <div className="st-resolve-form">
              <textarea
                className="st-textarea"
                value={resolveReplyText}
                onChange={(e) => setResolveReplyText(e.target.value)}
                placeholder="Write your resolution reply..."
              />
              <div className="st-resolve-actions">
                <button className="st-btn-action st-btn-resolve" onClick={resolveAndReply} disabled={!resolveReplyText.trim() || saving}>
                  {saving ? 'Sending...' : 'Resolve + Send'}
                </button>
                <button className="st-btn-back" onClick={() => { setShowResolveReply(false); setResolveReplyText('') }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Reply Chain */}
        <div className="st-replies">
          <h3>Conversation</h3>
          {replies.map((r) => (
            <div
              key={r.id}
              className={`st-reply ${r.author_type === 'admin' ? 'st-reply-admin' : 'st-reply-player'} ${r.is_internal_note ? 'st-reply-note' : ''}`}
            >
              <div className="st-reply-header">
                <span className="st-reply-author">
                  {r.is_internal_note ? '[Internal Note] ' : ''}
                  {r.author_type === 'admin' ? (r.author_email || 'Admin') : 'Player'}
                </span>
                <span className="st-reply-time">{formatDate(r.created_at)}</span>
              </div>
              <div className="st-reply-content">{r.content}</div>
            </div>
          ))}
        </div>

        {/* Admin Reply */}
        <div className="st-action-forms">
          <div className="st-form-section">
            <h4>Reply to Player</h4>
            <textarea
              className="st-textarea"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply visible to the player..."
            />
            <button className="st-btn-action st-btn-reply" onClick={sendReply} disabled={!replyText.trim() || saving}>
              {saving ? 'Sending...' : 'Send Reply'}
            </button>
          </div>

          <div className="st-form-section">
            <h4>Internal Note</h4>
            <textarea
              className="st-textarea"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write an internal note (not visible to player)..."
            />
            <button className="st-btn-action st-btn-note" onClick={sendNote} disabled={!noteText.trim() || saving}>
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
