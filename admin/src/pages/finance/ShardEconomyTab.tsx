import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../api'
import ShardAdjustModal from './ShardAdjustModal'

interface EconomyHealth {
  total_shards_in_circulation: number
  total_shards_granted: number
  total_shards_spent: number
  total_shards_purchased: number
  active_players_with_shards: number
  avg_shard_balance: number
  median_shard_balance: number
  top_holder_balance: number
  top_holder_alias: string | null
}

interface ShardFlowPoint {
  date: string
  granted: number
  spent: number
  purchased: number
  net: number
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function ShardEconomyTab() {
  const [economy, setEconomy] = useState<EconomyHealth | null>(null)
  const [flowData, setFlowData] = useState<ShardFlowPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [flowLoading, setFlowLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [checkingBalances, setCheckingBalances] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState(false)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchEconomy = useCallback(() => {
    setLoading(true)
    api.get('/api/admin/finance/shard-economy')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load economy data')
        return r.json()
      })
      .then(d => setEconomy(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchEconomy()
  }, [fetchEconomy])

  useEffect(() => {
    api.get('/api/admin/finance/shard-flow-chart?days=30')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load flow chart')
        return r.json()
      })
      .then(d => setFlowData(d.data || []))
      .catch(() => setFlowData([]))
      .finally(() => setFlowLoading(false))
  }, [])

  const handleCheckBalances = async () => {
    setCheckingBalances(true)
    try {
      const res = await api.post('/api/admin/payments/check-balances')
      if (res.ok) {
        const data = await res.json()
        showToast(data.message || 'Balance integrity check completed.', 'success')
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(`Check failed: ${errData.detail || res.statusText}`, 'error')
      }
    } catch (e) {
      showToast(`Check failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
    } finally {
      setCheckingBalances(false)
    }
  }

  if (loading) return <div className="fin-loading">Loading shard economy data...</div>
  if (error) return <div className="fin-error">{error}</div>

  return (
    <div>
      {/* Economy Health Metrics */}
      <div className="fin-metrics">
        <div className="fin-metric-card">
          <span className="fin-metric-label">Total in Circulation</span>
          <span className="fin-metric-value warning">
            {economy ? formatNumber(economy.total_shards_in_circulation) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Total Granted</span>
          <span className="fin-metric-value success">
            {economy ? formatNumber(economy.total_shards_granted) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Total Spent</span>
          <span className="fin-metric-value">
            {economy ? formatNumber(economy.total_shards_spent) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Total Purchased</span>
          <span className="fin-metric-value info">
            {economy ? formatNumber(economy.total_shards_purchased) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Players w/ Shards</span>
          <span className="fin-metric-value">
            {economy ? formatNumber(economy.active_players_with_shards) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Avg Balance</span>
          <span className="fin-metric-value">
            {economy ? formatNumber(Math.round(economy.avg_shard_balance)) : '--'}
          </span>
          <span className="fin-metric-sub">
            Median: {economy ? formatNumber(economy.median_shard_balance) : '--'}
          </span>
        </div>
        <div className="fin-metric-card">
          <span className="fin-metric-label">Top Holder</span>
          <span className="fin-metric-value warning">
            {economy ? formatNumber(economy.top_holder_balance) : '--'}
          </span>
          <span className="fin-metric-sub">
            {economy?.top_holder_alias || 'N/A'}
          </span>
        </div>
      </div>

      {/* Shard Flow Chart */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Shard Flow (30 days)</h3>
        </div>
        <div className="fin-chart-container">
          {flowLoading ? (
            <div className="fin-chart-empty">Loading chart...</div>
          ) : flowData.length === 0 ? (
            <div className="fin-chart-empty">No shard flow data available yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={flowData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#555', fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#555', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  labelFormatter={(label: string) => `Date: ${label}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="granted"
                  stroke="#4caf50"
                  fill="#4caf5020"
                  name="Granted"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="purchased"
                  stroke="#2196f3"
                  fill="#2196f320"
                  name="Purchased"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke="#f44336"
                  fill="#f4433620"
                  name="Spent"
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#ff9800"
                  fill="none"
                  strokeDasharray="5 5"
                  name="Net Flow"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Manual Shard Adjustment & Balance Integrity */}
      <div className="fin-section">
        <div className="fin-section-header">
          <h3>Shard Management</h3>
        </div>
        <div className="fin-quick-actions">
          <button
            className="fin-btn fin-btn-primary"
            onClick={() => setShowAdjustModal(true)}
          >
            Manual Shard Adjustment
          </button>
          <button
            className="fin-btn fin-btn-secondary"
            onClick={handleCheckBalances}
            disabled={checkingBalances}
          >
            {checkingBalances ? 'Checking...' : 'Check Balance Integrity'}
          </button>
        </div>
      </div>

      {/* Adjust Modal */}
      {showAdjustModal && (
        <ShardAdjustModal
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            setShowAdjustModal(false)
            fetchEconomy()
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fin-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
