import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import RefundModal from './RefundModal'
import CsvExportButton from './CsvExportButton'

interface Transaction {
  order_id: number
  player_id: number
  player_alias: string | null
  order_type: string
  amount_cents: number
  shards_amount: number
  status: string
  stripe_charge_id: string | null
  stripe_refund_id: string | null
  package_key: string | null
  created_at: string
  updated_at: string | null
}

interface WebhookEvent {
  id: number
  event_type: string
  stripe_event_id: string
  payload_summary: string | null
  processed: boolean
  created_at: string
}

interface TransactionsResponse {
  transactions: Transaction[]
  total: number
  page: number
  page_size: number
}

const ORDER_TYPES = ['purchase', 'subscription', 'donation']
const STATUSES = ['completed', 'pending', 'failed', 'refunded', 'partial_refund', 'cancelled']

export default function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set())
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  // Expanded row
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Refund modal
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)

  // Webhook events
  const [showWebhooks, setShowWebhooks] = useState(false)
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [webhooksLoading, setWebhooksLoading] = useState(false)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      if (search) params.set('search', search)
      if (typeFilters.size > 0) params.set('type', Array.from(typeFilters).join(','))
      if (statusFilters.size > 0) params.set('status', Array.from(statusFilters).join(','))
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (amountMin) params.set('amount_min', amountMin)
      if (amountMax) params.set('amount_max', amountMax)

      const res = await api.get(`/api/admin/finance/transactions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load transactions')
      const data: TransactionsResponse = await res.json()
      setTransactions(data.transactions || [])
      setTotal(data.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setTransactions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, typeFilters, statusFilters, dateFrom, dateTo, amountMin, amountMax])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    if (!showWebhooks) return
    setWebhooksLoading(true)
    api.get('/api/admin/payments/webhook-events')
      .then(r => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then(d => setWebhookEvents(d.events || d || []))
      .catch(() => setWebhookEvents([]))
      .finally(() => setWebhooksLoading(false))
  }, [showWebhooks])

  const toggleType = (t: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
    setPage(1)
  }

  const toggleStatus = (s: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchTransactions()
  }

  const truncateChargeId = (id: string | null) => {
    if (!id) return '--'
    if (id.length <= 20) return id
    return `${id.slice(0, 10)}...${id.slice(-6)}`
  }

  const csvData = transactions.map(t => ({
    order_id: t.order_id,
    player: t.player_alias || `#${t.player_id}`,
    type: t.order_type,
    amount: `$${(t.amount_cents / 100).toFixed(2)}`,
    shards: t.shards_amount,
    status: t.status,
    stripe_charge: t.stripe_charge_id || '',
    date: new Date(t.created_at).toLocaleString(),
  }))

  return (
    <div>
      {error && <div className="fin-error">{error}</div>}

      {/* Filters */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Filters</h3>
          <CsvExportButton
            data={csvData}
            filename={`transactions-${new Date().toISOString().slice(0, 10)}`}
            columns={[
              { key: 'order_id', label: 'Order ID' },
              { key: 'player', label: 'Player' },
              { key: 'type', label: 'Type' },
              { key: 'amount', label: 'Amount' },
              { key: 'shards', label: 'Shards' },
              { key: 'status', label: 'Status' },
              { key: 'stripe_charge', label: 'Stripe Charge' },
              { key: 'date', label: 'Date' },
            ]}
          />
        </div>
        <form onSubmit={handleSearchSubmit}>
          <div className="fin-filters">
            <div className="fin-filter-group">
              <label>Search</label>
              <input
                className="fin-input"
                type="text"
                placeholder="Player name or order ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '200px' }}
              />
            </div>
            <div className="fin-filter-group">
              <label>Type</label>
              <div className="fin-checkbox-group">
                {ORDER_TYPES.map(t => (
                  <label key={t} className="fin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={typeFilters.has(t)}
                      onChange={() => toggleType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div className="fin-filter-group">
              <label>Status</label>
              <div className="fin-checkbox-group">
                {STATUSES.map(s => (
                  <label key={s} className="fin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={statusFilters.has(s)}
                      onChange={() => toggleStatus(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="fin-filter-group">
              <label>Date From</label>
              <input
                className="fin-input"
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="fin-filter-group">
              <label>Date To</label>
              <input
                className="fin-input"
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <div className="fin-filter-group">
              <label>Amount Min ($)</label>
              <input
                className="fin-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amountMin}
                onChange={e => { setAmountMin(e.target.value); setPage(1) }}
                style={{ width: '90px' }}
              />
            </div>
            <div className="fin-filter-group">
              <label>Amount Max ($)</label>
              <input
                className="fin-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="999.99"
                value={amountMax}
                onChange={e => { setAmountMax(e.target.value); setPage(1) }}
                style={{ width: '90px' }}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Payment Orders ({total})</h3>
          <div className="fin-toggle-row" style={{ marginBottom: 0 }}>
            <button
              className={`fin-toggle-btn ${showWebhooks ? 'active' : ''}`}
              onClick={() => setShowWebhooks(!showWebhooks)}
            >
              {showWebhooks ? 'Hide Webhooks' : 'Show Webhooks'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="fin-loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="fin-chart-empty">No transactions found matching your filters.</div>
        ) : (
          <>
            <div className="fin-table-wrapper">
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Player</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Shards</th>
                    <th>Status</th>
                    <th>Stripe Charge</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(txn => (
                    <>
                      <tr
                        key={txn.order_id}
                        className={expandedId === txn.order_id ? 'expanded' : ''}
                        onClick={() => setExpandedId(expandedId === txn.order_id ? null : txn.order_id)}
                      >
                        <td>#{txn.order_id}</td>
                        <td>{txn.player_alias || `#${txn.player_id}`}</td>
                        <td style={{ textTransform: 'capitalize' }}>{txn.order_type}</td>
                        <td>${(txn.amount_cents / 100).toFixed(2)}</td>
                        <td>{txn.shards_amount.toLocaleString()}</td>
                        <td>
                          <span className={`fin-status ${txn.status}`}>{txn.status}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                          {truncateChargeId(txn.stripe_charge_id)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(txn.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                      {expandedId === txn.order_id && (
                        <tr key={`detail-${txn.order_id}`}>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="fin-row-detail">
                              <div className="fin-row-detail-grid">
                                <div className="fin-detail-item">
                                  <span className="fin-detail-label">Full Stripe Charge ID</span>
                                  <span className="fin-detail-value">
                                    {txn.stripe_charge_id || 'N/A'}
                                  </span>
                                </div>
                                <div className="fin-detail-item">
                                  <span className="fin-detail-label">Stripe Refund ID</span>
                                  <span className="fin-detail-value">
                                    {txn.stripe_refund_id || 'N/A'}
                                  </span>
                                </div>
                                <div className="fin-detail-item">
                                  <span className="fin-detail-label">Package</span>
                                  <span className="fin-detail-value">
                                    {txn.package_key || 'N/A'}
                                  </span>
                                </div>
                                <div className="fin-detail-item">
                                  <span className="fin-detail-label">Last Updated</span>
                                  <span className="fin-detail-value">
                                    {txn.updated_at
                                      ? new Date(txn.updated_at).toLocaleString()
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              {txn.status !== 'refunded' && txn.status !== 'cancelled' && (
                                <button
                                  className="fin-btn fin-btn-danger fin-btn-sm"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setRefundTarget(txn)
                                  }}
                                >
                                  Initiate Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="fin-pagination">
              <span className="fin-pagination-info">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="fin-pagination-controls">
                <button
                  className="fin-btn fin-btn-secondary fin-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="fin-btn fin-btn-secondary fin-btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Webhook Events */}
      {showWebhooks && (
        <div className="fin-section">
          <div className="fin-section-header">
            <h3>Recent Webhook Events</h3>
          </div>
          {webhooksLoading ? (
            <div className="fin-loading">Loading webhook events...</div>
          ) : webhookEvents.length === 0 ? (
            <div className="fin-chart-empty">No webhook events found.</div>
          ) : (
            <div className="fin-table-wrapper">
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Event Type</th>
                    <th>Stripe Event ID</th>
                    <th>Processed</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map(ev => (
                    <tr key={ev.id} style={{ cursor: 'default' }}>
                      <td>#{ev.id}</td>
                      <td>{ev.event_type}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                        {ev.stripe_event_id}
                      </td>
                      <td>
                        <span className={`fin-status ${ev.processed ? 'completed' : 'pending'}`}>
                          {ev.processed ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Refund Modal */}
      {refundTarget && (
        <RefundModal
          transaction={{
            order_id: refundTarget.order_id,
            player_alias: refundTarget.player_alias,
            player_id: refundTarget.player_id,
            amount_cents: refundTarget.amount_cents,
            shards_amount: refundTarget.shards_amount,
            order_type: refundTarget.order_type,
            status: refundTarget.status,
            stripe_charge_id: refundTarget.stripe_charge_id,
          }}
          onClose={() => setRefundTarget(null)}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  )
}
