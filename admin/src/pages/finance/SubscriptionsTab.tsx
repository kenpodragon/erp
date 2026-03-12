import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CsvExportButton from './CsvExportButton'
import './FinanceTabs.css'

/* ── Types ── */

interface SubscriptionMetrics {
  active_subscribers: number
  monthly_count: number
  annual_count: number
  past_due_count: number
  voluntary_churn_30d: number
  involuntary_churn_30d: number
  total_churn_30d: number
  conversion_rate: number
  mrr_cents: number
}

interface Subscriber {
  id: number
  player_id: number
  player_name: string
  plan: 'monthly' | 'annual'
  status: string
  cancel_at_period_end: boolean
  started_at: string
  current_period_end: string
  streak_months: number
  cumulative_months: number
  loyalty_tier: string
}

interface SubscriberPage {
  items: Subscriber[]
  total: number
  page: number
  page_size: number
}

/* ── Helpers ── */

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatPct(val: number): string {
  return `${(val * 100).toFixed(1)}%`
}

function fmtDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}

const STATUS_OPTIONS = ['active', 'past_due', 'canceled', 'trialing', 'expired']
const PLAN_OPTIONS = ['', 'monthly', 'annual']

/* ── Component ── */

export default function SubscriptionsTab() {
  // Metrics
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  // Gift
  const [giftPlayerId, setGiftPlayerId] = useState('')
  const [giftDays, setGiftDays] = useState('30')
  const [giftBusy, setGiftBusy] = useState(false)
  const [giftMsg, setGiftMsg] = useState('')

  // Table
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [planFilter, setPlanFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Inline actions
  const [actionTarget, setActionTarget] = useState<Subscriber | null>(null)
  const [actionType, setActionType] = useState<'extend' | 'cancel' | 'streak' | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  // Action form fields
  const [extendDays, setExtendDays] = useState('7')
  const [cancelReason, setCancelReason] = useState('')
  const [newStreak, setNewStreak] = useState('')
  const [newCumulative, setNewCumulative] = useState('')

  const PAGE_SIZE = 20

  /* ── Data fetching ── */

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const res = await api.get('/api/admin/finance/subscription-metrics')
      if (res.ok) setMetrics(await res.json())
    } catch { /* ignore */ }
    setMetricsLoading(false)
  }, [])

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(PAGE_SIZE))
      if (statusFilters.length > 0) params.set('status', statusFilters.join(','))
      if (planFilter) params.set('plan', planFilter)
      if (searchText) params.set('search', searchText)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const res = await api.get(`/api/admin/subscriptions/?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SubscriberPage = await res.json()
      setSubs(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscriptions')
    }
    setLoading(false)
  }, [page, statusFilters, planFilter, searchText, dateFrom, dateTo])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])
  useEffect(() => { fetchSubs() }, [fetchSubs])

  /* ── Gift action ── */

  const handleGift = async () => {
    if (!giftPlayerId.trim()) return
    setGiftBusy(true)
    setGiftMsg('')
    try {
      const res = await api.post(`/api/admin/subscriptions/${giftPlayerId.trim()}/gift`, {
        days: parseInt(giftDays) || 30,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `HTTP ${res.status}`)
      }
      setGiftMsg('Subscription gifted successfully')
      setGiftPlayerId('')
      fetchSubs()
      fetchMetrics()
    } catch (e) {
      setGiftMsg(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
    setGiftBusy(false)
  }

  /* ── Row actions ── */

  const openAction = (sub: Subscriber, type: 'extend' | 'cancel' | 'streak') => {
    setActionTarget(sub)
    setActionType(type)
    setActionMsg('')
    if (type === 'streak') {
      setNewStreak(String(sub.streak_months))
      setNewCumulative(String(sub.cumulative_months))
    }
  }

  const closeAction = () => {
    setActionTarget(null)
    setActionType(null)
    setActionMsg('')
  }

  const executeAction = async () => {
    if (!actionTarget || !actionType) return
    setActionBusy(true)
    setActionMsg('')
    try {
      let res: Response
      switch (actionType) {
        case 'extend':
          res = await api.post(`/api/admin/subscriptions/${actionTarget.id}/extend`, {
            days: parseInt(extendDays) || 7,
          })
          break
        case 'cancel':
          res = await api.post(`/api/admin/subscriptions/${actionTarget.id}/force-cancel`, {
            reason: cancelReason || undefined,
          })
          break
        case 'streak':
          res = await api.patch(`/api/admin/subscriptions/${actionTarget.id}/streak`, {
            streak_months: parseInt(newStreak),
            cumulative_months: parseInt(newCumulative),
          })
          break
        default:
          return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `HTTP ${res.status}`)
      }
      setActionMsg('Success')
      fetchSubs()
      fetchMetrics()
      setTimeout(closeAction, 1200)
    } catch (e) {
      setActionMsg(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    }
    setActionBusy(false)
  }

  /* ── Status filter toggle ── */

  const toggleStatus = (s: string) => {
    setStatusFilters(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  /* ── Render ── */

  return (
    <div>
      <h2 className="ftab-section-title">Subscriptions</h2>

      {/* Metrics cards */}
      {metricsLoading ? (
        <div className="ftab-loading">Loading metrics...</div>
      ) : metrics ? (
        <div className="ftab-metrics">
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Active Subscribers</span>
            <span className="ftab-metric-value">{metrics.active_subscribers.toLocaleString()}</span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Monthly / Annual</span>
            <span className="ftab-metric-value">
              {metrics.monthly_count.toLocaleString()} / {metrics.annual_count.toLocaleString()}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Past Due</span>
            <span className={`ftab-metric-value ${metrics.past_due_count > 0 ? 'ftab-metric-value--amber' : ''}`}>
              {metrics.past_due_count.toLocaleString()}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Voluntary Churn 30d</span>
            <span className={`ftab-metric-value ${metrics.voluntary_churn_30d > 0 ? 'ftab-metric-value--red' : ''}`}>
              {formatPct(metrics.voluntary_churn_30d)}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Involuntary Churn 30d</span>
            <span className={`ftab-metric-value ${metrics.involuntary_churn_30d > 0 ? 'ftab-metric-value--red' : ''}`}>
              {formatPct(metrics.involuntary_churn_30d)}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Total Churn 30d</span>
            <span className={`ftab-metric-value ${metrics.total_churn_30d > 0 ? 'ftab-metric-value--red' : ''}`}>
              {formatPct(metrics.total_churn_30d)}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">Conversion Rate</span>
            <span className="ftab-metric-value ftab-metric-value--green">
              {formatPct(metrics.conversion_rate)}
            </span>
          </div>
          <div className="ftab-metric-card">
            <span className="ftab-metric-label">MRR</span>
            <span className="ftab-metric-value ftab-metric-value--green">
              {formatCurrency(metrics.mrr_cents)}
            </span>
          </div>
        </div>
      ) : null}

      {/* Gift subscription */}
      <div className="ftab-gift-box">
        <div>
          <label>Player ID</label>
          <input
            className="ftab-input"
            value={giftPlayerId}
            onChange={e => setGiftPlayerId(e.target.value)}
            placeholder="Player ID"
          />
        </div>
        <div>
          <label>Duration (days)</label>
          <input
            className="ftab-input ftab-input--sm"
            type="number"
            min="1"
            value={giftDays}
            onChange={e => setGiftDays(e.target.value)}
          />
        </div>
        <button className="ftab-btn ftab-btn-success" onClick={handleGift} disabled={giftBusy}>
          {giftBusy ? 'Gifting...' : 'Gift Subscription'}
        </button>
        {giftMsg && (
          <span className={giftMsg.startsWith('Error') ? 'ftab-error' : 'ftab-success'} style={{ padding: '6px 10px' }}>
            {giftMsg}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="ftab-toolbar">
        <input
          className="ftab-input"
          placeholder="Search player..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1) }}
        />
        <select
          className="ftab-select"
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.filter(Boolean).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              className={`ftab-btn ftab-btn-sm ${statusFilters.includes(s) ? 'ftab-btn-primary' : ''}`}
              onClick={() => toggleStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          className="ftab-input ftab-input--date"
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          title="From date"
        />
        <input
          className="ftab-input ftab-input--date"
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          title="To date"
        />
        <div className="ftab-toolbar-right">
          <CsvExportButton
            data={subs as unknown as Record<string, unknown>[]}
            filename="subscriptions_export"
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="ftab-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="ftab-loading">Loading subscriptions...</div>
      ) : subs.length === 0 ? (
        <div className="ftab-empty">No subscriptions found.</div>
      ) : (
        <>
          <div className="ftab-table-wrap">
            <table className="ftab-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Cancel Pending</th>
                  <th>Started</th>
                  <th>Period End</th>
                  <th>Streak</th>
                  <th>Cumulative</th>
                  <th>Loyalty Tier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map(sub => (
                  <tr key={sub.id}>
                    <td>{sub.player_name || `#${sub.player_id}`}</td>
                    <td>{sub.plan}</td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${sub.status}`}>{sub.status}</span>
                    </td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${sub.cancel_at_period_end ? 'yes' : 'no'}`}>
                        {sub.cancel_at_period_end ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{fmtDate(sub.started_at)}</td>
                    <td>{fmtDate(sub.current_period_end)}</td>
                    <td>{sub.streak_months}</td>
                    <td>{sub.cumulative_months}</td>
                    <td>{sub.loyalty_tier}</td>
                    <td style={{ display: 'flex', gap: '4px' }}>
                      <button className="ftab-btn ftab-btn-sm" onClick={() => openAction(sub, 'extend')}>
                        Extend
                      </button>
                      <button className="ftab-btn ftab-btn-sm ftab-btn-danger" onClick={() => openAction(sub, 'cancel')}>
                        Cancel
                      </button>
                      <button className="ftab-btn ftab-btn-sm ftab-btn-amber" onClick={() => openAction(sub, 'streak')}>
                        Streak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ftab-pagination">
            <button className="ftab-btn ftab-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span>Page {page} of {totalPages} ({total} total)</span>
            <button className="ftab-btn ftab-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}

      {/* Inline action modal */}
      {actionTarget && actionType && (
        <div className="ftab-modal-overlay" onClick={closeAction}>
          <div className="ftab-modal" onClick={e => e.stopPropagation()}>
            <h3>
              {actionType === 'extend' && `Extend Subscription — ${actionTarget.player_name || `#${actionTarget.player_id}`}`}
              {actionType === 'cancel' && `Force Cancel — ${actionTarget.player_name || `#${actionTarget.player_id}`}`}
              {actionType === 'streak' && `Override Streak — ${actionTarget.player_name || `#${actionTarget.player_id}`}`}
            </h3>

            {actionType === 'extend' && (
              <div className="ftab-form-row">
                <label>Days to extend</label>
                <input
                  type="number"
                  min="1"
                  value={extendDays}
                  onChange={e => setExtendDays(e.target.value)}
                />
              </div>
            )}

            {actionType === 'cancel' && (
              <div className="ftab-form-row">
                <label>Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Admin cancellation reason..."
                  rows={3}
                />
              </div>
            )}

            {actionType === 'streak' && (
              <>
                <div className="ftab-form-row">
                  <label>New Streak Months</label>
                  <input
                    type="number"
                    min="0"
                    value={newStreak}
                    onChange={e => setNewStreak(e.target.value)}
                  />
                </div>
                <div className="ftab-form-row">
                  <label>New Cumulative Months</label>
                  <input
                    type="number"
                    min="0"
                    value={newCumulative}
                    onChange={e => setNewCumulative(e.target.value)}
                  />
                </div>
              </>
            )}

            {actionMsg && (
              <div className={actionMsg.startsWith('Error') ? 'ftab-error' : 'ftab-success'}>
                {actionMsg}
              </div>
            )}

            <div className="ftab-modal-actions">
              <button className="ftab-btn" onClick={closeAction}>Cancel</button>
              <button
                className={`ftab-btn ${actionType === 'cancel' ? 'ftab-btn-danger' : 'ftab-btn-primary'}`}
                onClick={executeAction}
                disabled={actionBusy}
              >
                {actionBusy ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
