import { useState } from 'react'
import { api } from '../../api'

interface TransactionSummary {
  order_id: number
  player_alias: string | null
  player_id: number
  amount_cents: number
  shards_amount: number
  order_type: string
  status: string
  stripe_charge_id: string | null
}

interface RefundModalProps {
  transaction: TransactionSummary
  onClose: () => void
  onSuccess: () => void
}

export default function RefundModal({ transaction, onClose, onSuccess }: RefundModalProps) {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [partialAmount, setPartialAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Reason is required.')
      return
    }

    if (refundType === 'partial') {
      const amt = parseInt(partialAmount, 10)
      if (isNaN(amt) || amt <= 0) {
        setError('Partial amount must be a positive number (in cents).')
        return
      }
      if (amt >= transaction.amount_cents) {
        setError('Partial amount must be less than the original amount. Use Full refund instead.')
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const body = {
        order_id: transaction.order_id,
        amount_cents: refundType === 'partial' ? parseInt(partialAmount, 10) : null,
        reason: reason.trim(),
      }

      const res = await api.post('/api/admin/finance/initiate-refund', body)

      if (res.ok) {
        const data = await res.json()
        setSuccess(data.message || 'Refund initiated successfully.')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.detail || `Refund failed: ${res.statusText}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refundAmountCents = refundType === 'partial' ? (parseInt(partialAmount, 10) || 0) : transaction.amount_cents

  return (
    <div className="fin-modal-overlay" onClick={onClose}>
      <div className="fin-modal" onClick={e => e.stopPropagation()}>
        <h2>Initiate Refund</h2>

        {error && <div className="fin-modal-error">{error}</div>}
        {success && <div className="fin-modal-success">{success}</div>}

        {/* Transaction Summary */}
        <div className="fin-section" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
          <div className="fin-row-detail-grid">
            <div className="fin-detail-item">
              <span className="fin-detail-label">Order ID</span>
              <span className="fin-detail-value">#{transaction.order_id}</span>
            </div>
            <div className="fin-detail-item">
              <span className="fin-detail-label">Player</span>
              <span className="fin-detail-value">
                {transaction.player_alias || `Player #${transaction.player_id}`}
              </span>
            </div>
            <div className="fin-detail-item">
              <span className="fin-detail-label">Amount</span>
              <span className="fin-detail-value">${(transaction.amount_cents / 100).toFixed(2)}</span>
            </div>
            <div className="fin-detail-item">
              <span className="fin-detail-label">Shards</span>
              <span className="fin-detail-value">{transaction.shards_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Refund Type */}
        <div className="fin-modal-field">
          <label>Refund Type</label>
          <div className="fin-radio-group">
            <label className="fin-radio-label">
              <input
                type="radio"
                name="refundType"
                checked={refundType === 'full'}
                onChange={() => setRefundType('full')}
              />
              Full Refund (${(transaction.amount_cents / 100).toFixed(2)})
            </label>
            <label className="fin-radio-label">
              <input
                type="radio"
                name="refundType"
                checked={refundType === 'partial'}
                onChange={() => setRefundType('partial')}
              />
              Partial Refund
            </label>
          </div>
        </div>

        {/* Partial Amount */}
        {refundType === 'partial' && (
          <div className="fin-modal-field">
            <label>Partial Amount (cents)</label>
            <input
              type="number"
              min="1"
              max={transaction.amount_cents - 1}
              value={partialAmount}
              onChange={e => setPartialAmount(e.target.value)}
              placeholder="e.g. 500 for $5.00"
            />
            {partialAmount && (
              <span style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.3rem', display: 'block' }}>
                = ${(parseInt(partialAmount, 10) / 100).toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="fin-modal-field">
          <label>Reason (required)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Describe the reason for this refund..."
          />
        </div>

        {/* Warning */}
        <div className="fin-modal-warning">
          This will issue a Stripe refund of ${(refundAmountCents / 100).toFixed(2)} and debit the
          corresponding shards from the player&apos;s balance. This action cannot be undone.
        </div>

        {/* Actions */}
        <div className="fin-modal-actions">
          <button className="fin-btn fin-btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="fin-btn fin-btn-danger"
            onClick={handleSubmit}
            disabled={loading || !!success}
          >
            {loading ? 'Processing...' : `Refund $${(refundAmountCents / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
