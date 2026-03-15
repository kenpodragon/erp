import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../api'

interface OverviewData {
  revenue_today: number
  revenue_this_week: number
  revenue_this_month: number
  active_subscribers: number
  shards_in_circulation: number
  marketplace_volume_7d: number
}

interface RevenuePoint {
  date: string
  purchases: number
  subscriptions: number
  donations: number
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

interface OverviewTabProps {
  onSwitchTab: (tab: string) => void
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function OverviewTab({ onSwitchTab }: OverviewTabProps) {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [chartData, setChartData] = useState<RevenuePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    api.get('/api/admin/finance/overview')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load overview')
        return r.json()
      })
      .then(d => setOverview(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get('/api/admin/finance/revenue-chart?days=30')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load chart')
        return r.json()
      })
      .then(d => setChartData(d.data || []))
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false))
  }, [])

  const handleQuickAction = async (action: string, label: string) => {
    setActionLoading(action)
    try {
      let res: Response
      switch (action) {
        case 'reconciliation':
          res = await api.post('/api/admin/payments/reconcile')
          break
        case 'poll-refunds':
          res = await api.post('/api/admin/payments/poll-refunds')
          break
        case 'check-balances':
          res = await api.post('/api/admin/payments/check-balances')
          break
        default:
          return
      }
      if (res.ok) {
        const data = await res.json()
        showToast(`${label}: ${data.message || 'Completed successfully'}`, 'success')
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(`${label} failed: ${errData.detail || res.statusText}`, 'error')
      }
    } catch (e) {
      showToast(`${label} failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="fin-loading">Loading overview...</div>
  if (error) return <div className="fin-error">{error}</div>

  return (
    <div>
      {/* Revenue Summary Cards */}
      <div className="fin-metrics">
        <div className="fin-metric-card">
          <span className="fin-metric-label">Revenue Today</span>
          <span className="fin-metric-value success">
            {overview ? formatCurrency(overview.revenue_today) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Revenue This Week</span>
          <span className="fin-metric-value success">
            {overview ? formatCurrency(overview.revenue_this_week) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Revenue This Month</span>
          <span className="fin-metric-value success">
            {overview ? formatCurrency(overview.revenue_this_month) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Active Subscribers</span>
          <span className="fin-metric-value info">
            {overview ? formatNumber(overview.active_subscribers) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Shards in Circulation</span>
          <span className="fin-metric-value warning">
            {overview ? formatNumber(overview.shards_in_circulation) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Marketplace Vol (7d)</span>
          <span className="fin-metric-value">
            {overview ? formatNumber(overview.marketplace_volume_7d) : '--'}
          </span>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Daily Revenue (30 days)</h3>
        </div>
        <div className="fin-chart-container">
          {chartLoading ? (
            <div className="fin-chart-empty">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="fin-chart-empty">No revenue data available yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#555', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  tick={{ fill: '#555', fontSize: 11 }}
                  tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Legend />
                <Bar dataKey="purchases" fill="#4caf50" name="Purchases" stackId="revenue" />
                <Bar dataKey="subscriptions" fill="#2196f3" name="Subscriptions" stackId="revenue" />
                <Bar dataKey="donations" fill="#ff9800" name="Donations" stackId="revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="fin-quick-actions">
          <button
            className="fin-btn fin-btn-secondary"
            onClick={() => handleQuickAction('reconciliation', 'Reconciliation')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'reconciliation' ? 'Running...' : 'Run Reconciliation'}
          </button>
          <button
            className="fin-btn fin-btn-secondary"
            onClick={() => handleQuickAction('poll-refunds', 'Poll Refunds/Disputes')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'poll-refunds' ? 'Polling...' : 'Poll Refunds/Disputes'}
          </button>
          <button
            className="fin-btn fin-btn-secondary"
            onClick={() => handleQuickAction('check-balances', 'Balance Integrity')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'check-balances' ? 'Checking...' : 'Check Balance Integrity'}
          </button>
          <button
            className="fin-btn fin-btn-warning"
            onClick={() => onSwitchTab('Dispute Queue')}
          >
            View Dispute Queue
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fin-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
