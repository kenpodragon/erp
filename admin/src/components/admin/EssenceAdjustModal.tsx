import { useState, useEffect } from 'react'
import { api } from '../../api'
import './EssenceAdjustModal.css'

interface RecentAdjustment {
  id: number
  amount: number
  direction: string
  reason: string
  admin_email: string
  created_at: string
}

interface EssenceHistory {
  current_balance: number
  adjustments: RecentAdjustment[]
}

interface EssenceAdjustModalProps {
  characterId: number
  characterName: string
  onClose: () => void
  onSave: () => void
}

export default function EssenceAdjustModal({
  characterId,
  characterName,
  onClose,
  onSave,
}: EssenceAdjustModalProps) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [currentBalance, setCurrentBalance] = useState(0)
  const [recentAdjustments, setRecentAdjustments] = useState<RecentAdjustment[]>([])

  const [direction, setDirection] = useState<'grant' | 'debit'>('grant')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  // Large adjustment confirmation: requires a second click
  const [largeConfirmPending, setLargeConfirmPending] = useState(false)

  const parsedAmount = parseInt(amount, 10) || 0
  const previewBalance =
    direction === 'grant'
      ? currentBalance + parsedAmount
      : currentBalance - parsedAmount

  const isDebitExceedsBalance = direction === 'debit' && parsedAmount > currentBalance
  const isLargeAdjustment = parsedAmount > 10000
  const isReasonValid = reason.trim().length >= 10

  useEffect(() => {
    fetchHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/admin/characters/${characterId}/essence/history`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to fetch essence history')
      }
      const data: EssenceHistory = await res.json()
      setCurrentBalance(data.current_balance)
      setRecentAdjustments(data.adjustments)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load essence data')
    } finally {
      setLoading(false)
    }
  }

  // Reset large-confirm whenever amount or direction changes
  useEffect(() => {
    setLargeConfirmPending(false)
  }, [amount, direction])

  const handleSubmit = async () => {
    // Validation
    if (parsedAmount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (!isReasonValid) {
      setError('Reason must be at least 10 characters.')
      return
    }
    if (isDebitExceedsBalance) {
      setError('Debit amount cannot exceed current balance.')
      return
    }

    // Large adjustment gate: first click shows warning, second click confirms
    if (isLargeAdjustment && !largeConfirmPending) {
      setLargeConfirmPending(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await api.post(`/api/admin/characters/${characterId}/essence`, {
        amount: parsedAmount,
        direction,
        reason: reason.trim(),
      })

      if (res.ok) {
        setSuccess('Essence adjustment applied successfully.')
        setTimeout(() => {
          onSave()
          onClose()
        }, 1500)
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.detail || `Adjustment failed: ${res.statusText}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSubmitting(false)
      setLargeConfirmPending(false)
    }
  }

  return (
    <div className="ea-modal-overlay" onClick={onClose}>
      <div className="ea-modal" onClick={e => e.stopPropagation()}>
        <h3>Adjust Essence &mdash; &ldquo;{characterName}&rdquo;</h3>

        {error && <div className="ea-error">{error}</div>}
        {success && <div className="ea-success">{success}</div>}

        {loading ? (
          <div className="ea-loading">Loading essence data...</div>
        ) : (
          <>
            {/* Current Balance */}
            <div className="ea-balance-row">
              <span className="ea-balance-label">Current Balance:</span>
              <span className="ea-balance-value">
                {currentBalance.toLocaleString()} Essence
              </span>
            </div>

            {/* Direction */}
            <div className="ea-field">
              <label>Direction</label>
              <div className="ea-radio-group">
                <label className="ea-radio-label">
                  <input
                    type="radio"
                    name="essenceDirection"
                    checked={direction === 'grant'}
                    onChange={() => setDirection('grant')}
                  />
                  Grant
                </label>
                <label className="ea-radio-label">
                  <input
                    type="radio"
                    name="essenceDirection"
                    checked={direction === 'debit'}
                    onChange={() => setDirection('debit')}
                  />
                  Debit
                </label>
              </div>
            </div>

            {/* Amount */}
            <div className="ea-field">
              <label>Amount</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>

            {/* Reason */}
            <div className="ea-field">
              <label>Reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe the reason for this adjustment..."
                rows={3}
              />
              <span className="ea-hint">
                {reason.trim().length < 10
                  ? `(min 10 characters — ${10 - reason.trim().length} more needed)`
                  : ''}
              </span>
            </div>

            {/* Preview */}
            {parsedAmount > 0 && (
              <div className="ea-preview">
                <span className="ea-preview-label">Preview:</span>
                <span className="ea-preview-old">
                  {currentBalance.toLocaleString()}
                </span>
                <span className="ea-preview-arrow">&rarr;</span>
                <span
                  className={`ea-preview-new ${
                    isDebitExceedsBalance ? 'ea-preview-new--negative' : ''
                  }`}
                >
                  {previewBalance.toLocaleString()} Essence
                </span>
              </div>
            )}

            {/* Debit exceeds balance warning */}
            {isDebitExceedsBalance && (
              <div className="ea-error">
                Debit amount exceeds current balance ({currentBalance.toLocaleString()}).
              </div>
            )}

            {/* Large adjustment warning */}
            {isLargeAdjustment && largeConfirmPending && (
              <div className="ea-warning">
                Large adjustment: {parsedAmount.toLocaleString()} Essence.
                Click &ldquo;Confirm Adjustment&rdquo; again to proceed.
              </div>
            )}

            {/* Recent Admin Adjustments */}
            {recentAdjustments.length > 0 && (
              <div className="ea-history">
                <div className="ea-history-title">Recent Admin Adjustments</div>
                <div className="ea-history-list">
                  {recentAdjustments.map(adj => (
                    <div key={adj.id} className="ea-history-row">
                      <span className="ea-history-date">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={`ea-history-amount ${
                          adj.direction === 'grant'
                            ? 'ea-history-amount--grant'
                            : 'ea-history-amount--debit'
                        }`}
                      >
                        {adj.direction === 'grant' ? '+' : '-'}
                        {adj.amount.toLocaleString()}
                      </span>
                      <span className="ea-history-reason">&ldquo;{adj.reason}&rdquo;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="ea-actions">
              <button
                className="ea-btn ea-btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={`ea-btn ${
                  direction === 'debit' ? 'ea-btn-danger' : 'ea-btn-primary'
                } ${largeConfirmPending ? 'ea-btn-pulse' : ''}`}
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !!success ||
                  parsedAmount <= 0 ||
                  !isReasonValid ||
                  isDebitExceedsBalance
                }
              >
                {submitting
                  ? 'Processing...'
                  : largeConfirmPending
                  ? 'Click Again to Confirm'
                  : 'Confirm Adjustment'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
