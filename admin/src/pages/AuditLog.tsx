import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './AuditLog.css'

interface AuditEntry {
  id: number
  admin_email: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

const ACTION_OPTIONS = [
  '', 'player_banned', 'player_unbanned', 'player_edited',
  'config_changed', 'config_reset',
  'ticket_status_changed', 'ticket_priority_changed',
  'ticket_assigned', 'ticket_note_added',
]

const TARGET_TYPE_OPTIONS = ['', 'player', 'config', 'ticket']

const PAGE_SIZE = 50

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [adminFilter, setAdminFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [targetTypeFilter, setTargetTypeFilter] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (adminFilter) params.set('admin', adminFilter)
      if (actionFilter) params.set('action', actionFilter)
      if (targetTypeFilter) params.set('target_type', targetTypeFilter)

      const res = await api.get(`/api/admin/audit-log?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEntries(data.entries || [])
      setTotal(data.total || 0)
    } catch {
      setError('Failed to load audit log.')
    } finally {
      setLoading(false)
    }
  }, [offset, adminFilter, actionFilter, targetTypeFilter])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    fetchEntries()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="audit-page">
      <header className="audit-header">
        <h1>Audit Log</h1>
        <p className="audit-subtitle">Immutable record of all admin actions</p>
      </header>

      {/* Filters */}
      <form className="audit-filters" onSubmit={handleFilterSubmit}>
        <input
          className="audit-input"
          type="text"
          placeholder="Admin email…"
          value={adminFilter}
          onChange={e => setAdminFilter(e.target.value)}
        />
        <select
          className="audit-select"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
        >
          {ACTION_OPTIONS.map(a => (
            <option key={a} value={a}>{a || 'All Actions'}</option>
          ))}
        </select>
        <select
          className="audit-select"
          value={targetTypeFilter}
          onChange={e => setTargetTypeFilter(e.target.value)}
        >
          {TARGET_TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>{t || 'All Target Types'}</option>
          ))}
        </select>
        <button type="submit" className="audit-btn">Apply</button>
        <button
          type="button"
          className="audit-btn secondary"
          onClick={() => {
            setAdminFilter('')
            setActionFilter('')
            setTargetTypeFilter('')
            setOffset(0)
          }}
        >
          Clear
        </button>
      </form>

      {error && <div className="audit-error">{error}</div>}

      <div className="audit-meta">
        {total.toLocaleString()} total entries
        {totalPages > 1 && ` — Page ${currentPage} of ${totalPages}`}
      </div>

      {loading ? (
        <div className="audit-loading">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="audit-empty">No audit log entries match the current filters.</div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target Type</th>
                <th>Target ID</th>
                <th>IP</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <>
                  <tr
                    key={entry.id}
                    className="audit-row"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <td className="audit-time">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="audit-admin">{entry.admin_email}</td>
                    <td>
                      <span className={`audit-badge action-${entry.action.replace(/_/g, '-')}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="audit-target-type">{entry.target_type}</td>
                    <td className="audit-target-id">{entry.target_id}</td>
                    <td className="audit-ip">{entry.ip_address || '—'}</td>
                    <td className="audit-details-toggle">
                      {entry.details ? (expandedId === entry.id ? '▲' : '▼') : '—'}
                    </td>
                  </tr>
                  {expandedId === entry.id && entry.details && (
                    <tr key={`${entry.id}-detail`} className="audit-detail-row">
                      <td colSpan={7}>
                        <pre className="audit-detail-json">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="audit-pagination">
          <button
            className="audit-btn"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            ← Prev
          </button>
          <span className="audit-page-info">Page {currentPage} / {totalPages}</span>
          <button
            className="audit-btn"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
