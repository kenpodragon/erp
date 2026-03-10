import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../../api';
import './PaymentStatus.css';

interface PaymentStatusProps {
  sessionId: string;
  onComplete: (shards: number, balance: number) => void;
  onTimeout: () => void;
}

type StatusState = 'polling' | 'success' | 'timeout' | 'error';

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 3000;

const PaymentStatus: React.FC<PaymentStatusProps> = ({ sessionId, onComplete, onTimeout }) => {
  const [status, setStatus] = useState<StatusState>('polling');
  const [shardsGained, setShardsGained] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let attemptCount = 0;

    const poll = async () => {
      try {
        const res = await api.get(`/api/payments/status/${sessionId}`);
        if (!mountedRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' || data.status === 'paid') {
            setStatus('success');
            setShardsGained(data.shards_granted || 0);
            if (pollRef.current) clearInterval(pollRef.current);
            // Auto-dismiss after showing success
            setTimeout(() => {
              if (mountedRef.current) {
                onComplete(data.shards_granted || 0, data.new_balance || 0);
              }
            }, 2500);
            return;
          }
        }
      } catch {
        // Network error, keep polling
      }

      attemptCount++;
      setAttempts(attemptCount);
      if (attemptCount >= MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        if (mountedRef.current) {
          setStatus('timeout');
        }
      }
    };

    // Start polling
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, onComplete]);

  const handleDismiss = () => {
    if (status === 'timeout') {
      onTimeout();
    }
  };

  return (
    <div className="ps-overlay">
      <div className="ps-modal">
        {status === 'polling' && (
          <>
            <div className="ps-spinner"></div>
            <h2 className="ps-title">Payment Processing...</h2>
            <p className="ps-subtitle">Please wait while we confirm your purchase.</p>
            <div className="ps-progress">
              <div
                className="ps-progress-bar"
                style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
              ></div>
            </div>
          </>
        )}

        {status === 'success' && (
          <div className="ps-success">
            <div className="ps-shard-burst">
              <span className="ps-shard-icon">&#9670;</span>
            </div>
            <h2 className="ps-title ps-title-success">Payment Successful!</h2>
            <div className="ps-gained">
              +{shardsGained.toLocaleString()} Shards
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <>
            <h2 className="ps-title ps-title-warning">Still Processing</h2>
            <p className="ps-subtitle">
              Your payment is still processing. Your shards will appear shortly.
              If they do not appear within a few minutes, please contact support.
            </p>
            <button className="ps-dismiss-btn" onClick={handleDismiss}>
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentStatus;
