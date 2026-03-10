import React, { useState } from 'react';
import { api } from '../../../api';
import './RefundRequestModal.css';

interface Transaction {
  id: number;
  created_at: string;
  source_type: string;
  description: string;
  shard_amount: number;
  balance_after: number;
  refund_eligible: boolean;
  stripe_payment_id?: string;
}

interface RefundRequestModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSubmit: () => void;
}

type RefundType = 'full' | 'partial';

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  transaction,
  onClose,
  onSubmit,
}) => {
  const [refundType, setRefundType] = useState<RefundType>('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        transaction_id: transaction.id,
        refund_type: refundType,
        reason: reason || 'No reason provided',
      };
      if (refundType === 'partial' && partialAmount) {
        const cents = Math.round(parseFloat(partialAmount) * 100);
        if (isNaN(cents) || cents <= 0) {
          setError('Please enter a valid refund amount.');
          setSubmitting(false);
          return;
        }
        body.partial_amount_cents = cents;
      }

      const res = await api.post('/api/payments/refund-request', body);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to submit refund request');
      }

      setSubmitted(true);
      setTimeout(() => onSubmit(), 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rrm-overlay" onClick={onClose}>
      <div className="rrm-modal" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="rrm-success">
            <h2>Request Submitted</h2>
            <p>Your refund request has been submitted. We will review it and respond within 48 hours.</p>
          </div>
        ) : (
          <>
            <h2 className="rrm-title">Request Refund</h2>
            <p className="rrm-transaction-info">
              Transaction: {transaction.description}
              <br />
              Amount: +{transaction.shard_amount.toLocaleString()} shards
            </p>

            {/* Refund type selection */}
            <div className="rrm-type-group">
              <label className={`rrm-type-option ${refundType === 'full' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="refundType"
                  value="full"
                  checked={refundType === 'full'}
                  onChange={() => setRefundType('full')}
                />
                <span className="rrm-radio-label">Full Refund</span>
              </label>
              <label className={`rrm-type-option ${refundType === 'partial' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="refundType"
                  value="partial"
                  checked={refundType === 'partial'}
                  onChange={() => setRefundType('partial')}
                />
                <span className="rrm-radio-label">Partial Refund</span>
              </label>
            </div>

            {refundType === 'full' && (
              <div className="rrm-warning">
                A full refund will deduct the shards from your account. If your balance goes negative, some features may be restricted until the balance is restored.
              </div>
            )}

            {refundType === 'partial' && (
              <div className="rrm-partial-input">
                <label>Refund Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </div>
            )}

            {/* Reason */}
            <div className="rrm-reason">
              <label>Reason (optional)</label>
              <textarea
                rows={3}
                placeholder="Why are you requesting a refund?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {error && <div className="rrm-error">{error}</div>}

            <div className="rrm-actions">
              <button
                className="rrm-btn rrm-btn-submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button className="rrm-btn rrm-btn-cancel" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RefundRequestModal;
