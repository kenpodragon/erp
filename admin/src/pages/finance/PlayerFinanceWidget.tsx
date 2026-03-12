import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './MarketplaceDisputes.css'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShardSummary {
  player_id: number
  player_name: string
  shard_balance: number
  total_earned: number
  total_spent: number
  recent_transactions: RecentTransaction[]
  has_subscription: boolean
  marketplace_trades_count: number
  donations_count: number
}

interface RecentTransaction {
  id: number
  type: string
  amount: number
  balance_after: number
  description: string
  created_at: string
}

interface Props {
  playerId: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatShards(n: number): string {
  return n.toLocaleString('en-US')
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlayerFinanceWidget({ playerId }: Props) {
  const [summary, setSummary] = useState<ShardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Adjustment form
  const [showAdjust, setShowAdjust] = useState<'grant' | 'debit' | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/finance/player-shard-summary/${playerId}`)
      if (!res.ok) throw new Error('Failed to load shard summary')
      setSummary(await res.json())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [playerId])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const handleAdjust = async () => {
    if (!showAdjust || !adjustAmount || !adjustReason.trim()) return
    const amt = parseInt(adjustAmount, 10)
    if (isNaN(amt) || amt <= 0) return

    setAdjustLoading(true)
    try {
      const res = await api.post('/api/admin/finance/shard-adjust', {
        player_id: playerId,
        amount: showAdjust === 'debit' ? -amt : amt,
        reason: adjustReason,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to adjust shards')
      }
      setShowAdjust(null)
      setAdjustAmount('')
      setAdjustReason('')
      fetchSummary()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Adjustment failed')
    } finally {
      setAdjustLoading(false)
    }
  }

  const previewBalance = (): number | null => {
    if (!summary || !adjustAmount) return null
    const amt = parseInt(adjustAmount, 10)
    if (isNaN(amt) || amt <= 0) return null
    return showAdjust === 'debit'
      ? summary.shard_balance - amt
      : summary.shard_balance + amt
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (loading) return <div className="pfw-loading">Loading finance data...</div>
  if (error) return <div className="pfw-error">{error}</div>
  if (!summary) return null

  const preview = previewBalance()

  return (
    <div className="pfw-widget">
      {/* Balance header */}
      <div className="pfw-balance-row">
        <div className="pfw-balance">
          <span className="pfw-balance-label">Shard Balance</span>
          <span className="pfw-balance-value">{formatShards(summary.shard_balance)}</span>
        </div>
        <div className="pfw-balance-actions">
          <button
            className="mkt-btn mkt-btn-sm mkt-btn-success"
            onClick={() => { setShowAdjust(showAdjust === 'grant' ? null : 'grant'); setAdjustAmount(''); setAdjustReason('') }}
          >
            {showAdjust === 'grant' ? 'Cancel' : 'Grant'}
          </button>
          <button
            className="mkt-btn mkt-btn-sm mkt-btn-warn"
            onClick={() => { setShowAdjust(showAdjust === 'debit' ? null : 'debit'); setAdjustAmount(''); setAdjustReason('') }}
          >
            {showAdjust === 'debit' ? 'Cancel' : 'Debit'}
          </button>
        </div>
      </div>

      {/* Inline adjustment form */}
      {showAdjust && (
        <div className={`pfw-adjust-form ${showAdjust}`}>
          <div className="pfw-adjust-header">
            {showAdjust === 'grant' ? 'Grant Shards' : 'Debit Shards'}
          </div>
          <div className="pfw-adjust-fields">
            <input
              type="number"
              min="1"
              placeholder="Amount"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="Reason (required)"
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
            />
          </div>
          {preview !== null && (
            <div className={`pfw-preview ${preview < 0 ? 'negative' : ''}`}>
              New balance: {formatShards(preview)} shards
              {preview < 0 && <span className="pfw-preview-warn"> (negative balance!)</span>}
            </div>
          )}
          <button
            className={`mkt-btn mkt-btn-sm ${showAdjust === 'grant' ? 'mkt-btn-success' : 'mkt-btn-warn'}`}
            disabled={!adjustAmount || parseInt(adjustAmount, 10) <= 0 || adjustReason.trim().length < 3 || adjustLoading}
            onClick={handleAdjust}
          >
            {adjustLoading ? 'Processing...' : `Confirm ${showAdjust === 'grant' ? 'Grant' : 'Debit'}`}
          </button>
        </div>
      )}

      {/* Quick stats */}
      <div className="pfw-quick-stats">
        <div className="pfw-stat">
          <span className="pfw-stat-label">Total Earned</span>
          <span className="pfw-stat-value positive">{formatShards(summary.total_earned)}</span>
        </div>
        <div className="pfw-stat">
          <span className="pfw-stat-label">Total Spent</span>
          <span className="pfw-stat-value negative">{formatShards(summary.total_spent)}</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="pfw-links">
        {summary.has_subscription && <span className="pfw-link-badge">Active Subscription</span>}
        {summary.marketplace_trades_count > 0 && (
          <span className="pfw-link-badge">{summary.marketplace_trades_count} Marketplace Trades</span>
        )}
        {summary.donations_count > 0 && (
          <span className="pfw-link-badge">{summary.donations_count} Donations</span>
        )}
      </div>

      {/* Recent transactions */}
      <div className="pfw-recent">
        <h4>Recent Transactions</h4>
        {summary.recent_transactions.length === 0 ? (
          <p className="pfw-empty">No recent transactions.</p>
        ) : (
          <div className="pfw-txn-list">
            {summary.recent_transactions.map(txn => (
              <div key={txn.id} className="pfw-txn">
                <div className="pfw-txn-left">
                  <span className={`pfw-txn-type ${txn.type}`}>{txn.type}</span>
                  <span className="pfw-txn-desc">{txn.description}</span>
                </div>
                <div className="pfw-txn-right">
                  <span className={`pfw-txn-amount ${txn.amount >= 0 ? 'positive' : 'negative'}`}>
                    {txn.amount >= 0 ? '+' : ''}{formatShards(txn.amount)}
                  </span>
                  <span className="pfw-txn-date">{new Date(txn.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
