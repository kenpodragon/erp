import { useState } from 'react'
import { api } from '../../api'

interface RecentTransaction {
  order_id: number
  order_type: string
  shards_amount: number
  created_at: string
}

interface PlayerSearchResult {
  player_id: number
  alias: string
  shard_balance: number
  recent_transactions: RecentTransaction[]
}

interface ShardAdjustModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ShardAdjustModal({ onClose, onSuccess }: ShardAdjustModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [player, setPlayer] = useState<PlayerSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [mode, setMode] = useState<'grant' | 'debit'>('grant')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError(null)
    setPlayer(null)

    try {
      const res = await api.get(`/api/admin/finance/player-lookup?q=${encodeURIComponent(searchQuery.trim())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Player not found')
      }
      const data: PlayerSearchResult = await res.json()
      setPlayer(data)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const parsedAmount = parseInt(amount, 10) || 0
  const newBalance = player
    ? mode === 'grant'
      ? player.shard_balance + parsedAmount
      : player.shard_balance - parsedAmount
    : 0

  const handleSubmit = async () => {
    if (!player) return
    if (parsedAmount <= 0) {
      setError('Amount must be a positive integer.')
      return
    }
    if (!reason.trim()) {
      setError('Reason is required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const body = {
        player_id: player.player_id,
        mode,
        amount: parsedAmount,
        reason: reason.trim(),
      }

      const res = await api.post('/api/admin/finance/shard-adjust', body)

      if (res.ok) {
        const data = await res.json()
        setSuccess(data.message || 'Shard adjustment applied successfully.')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.detail || `Adjustment failed: ${res.statusText}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fin-modal-overlay" onClick={onClose}>
      <div className="fin-modal" onClick={e => e.stopPropagation()}>
        <h2>Manual Shard Adjustment</h2>

        {error && <div className="fin-modal-error">{error}</div>}
        {success && <div className="fin-modal-success">{success}</div>}

        {/* Player Search */}
        <div className="fin-modal-field">
          <label>Search Player (ID or Name)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Player ID or alias..."
              style={{ flex: 1 }}
            />
            <button
              className="fin-btn fin-btn-primary fin-btn-sm"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchError && (
            <span style={{ fontSize: '0.8rem', color: '#f44336', marginTop: '0.3rem', display: 'block' }}>
              {searchError}
            </span>
          )}
        </div>

        {/* Player Info */}
        {player && (
          <>
            <div className="fin-section" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <div className="fin-row-detail-grid">
                <div className="fin-detail-item">
                  <span className="fin-detail-label">Player</span>
                  <span className="fin-detail-value">{player.alias} (#{player.player_id})</span>
                </div>
                <div className="fin-detail-item">
                  <span className="fin-detail-label">Current Shard Balance</span>
                  <span className="fin-detail-value" style={{ fontWeight: 'bold', color: 'var(--color-warning)' }}>
                    {player.shard_balance.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Recent Transactions */}
              {player.recent_transactions.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <span className="fin-detail-label">Recent Transactions</span>
                  <div style={{ marginTop: '0.3rem' }}>
                    {player.recent_transactions.map(tx => (
                      <div key={tx.order_id} style={{
                        fontSize: '0.8rem',
                        color: '#888',
                        padding: '0.2rem 0',
                        display: 'flex',
                        gap: '0.75rem',
                      }}>
                        <span>{tx.order_type}</span>
                        <span>{tx.shards_amount > 0 ? '+' : ''}{tx.shards_amount}</span>
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Grant/Debit Toggle */}
            <div className="fin-modal-field">
              <label>Action</label>
              <div className="fin-radio-group">
                <label className="fin-radio-label">
                  <input
                    type="radio"
                    name="shardMode"
                    checked={mode === 'grant'}
                    onChange={() => setMode('grant')}
                  />
                  Grant Shards
                </label>
                <label className="fin-radio-label">
                  <input
                    type="radio"
                    name="shardMode"
                    checked={mode === 'debit'}
                    onChange={() => setMode('debit')}
                  />
                  Debit Shards
                </label>
              </div>
            </div>

            {/* Amount */}
            <div className="fin-modal-field">
              <label>Amount (shards)</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>

            {/* Balance Preview */}
            {parsedAmount > 0 && (
              <div className="fin-balance-preview" style={{ marginBottom: '1rem' }}>
                <div className="fin-balance-old">
                  {player.shard_balance.toLocaleString()} shards
                </div>
                <div className="fin-balance-arrow">
                  {mode === 'grant' ? '+' : '-'} {parsedAmount.toLocaleString()}
                </div>
                <div className={`fin-balance-new ${newBalance < 0 ? 'negative' : 'positive'}`}>
                  {newBalance.toLocaleString()} shards
                </div>
              </div>
            )}

            {/* Warnings */}
            {mode === 'debit' && newBalance < 0 && (
              <div className="fin-modal-error">
                Warning: This debit will result in a negative shard balance ({newBalance.toLocaleString()}).
              </div>
            )}
            {parsedAmount > 10000 && (
              <div className="fin-modal-warning">
                Large adjustment: {parsedAmount.toLocaleString()} shards. Please double-check before confirming.
              </div>
            )}

            {/* Reason */}
            <div className="fin-modal-field">
              <label>Reason (required)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe the reason for this adjustment..."
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="fin-modal-actions">
          <button className="fin-btn fin-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          {player && (
            <button
              className={`fin-btn ${mode === 'debit' ? 'fin-btn-danger' : 'fin-btn-primary'}`}
              onClick={handleSubmit}
              disabled={loading || !!success || parsedAmount <= 0}
            >
              {loading
                ? 'Processing...'
                : `${mode === 'grant' ? 'Grant' : 'Debit'} ${parsedAmount.toLocaleString()} Shards`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
