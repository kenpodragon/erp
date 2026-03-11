import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import { SubscriptionCard } from './SubscriptionCard';
import { LoyaltyProgress } from './LoyaltyProgress';
import { BoostDisplay } from './BoostDisplay';
import { PaymentWarningBanner } from './PaymentWarningBanner';
import './SubscriptionPage.css';

interface SubscriptionData {
  id: number;
  plan_key: string;
  status: string;
  source: string;
  subscription_start_date: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  continuous_streak: number;
  grace_deadline: string | null;
}

interface Boosts {
  xp: number;
  essence: number;
  drop_rate: number;
  training_speed: number;
  stipend_shards: number;
  is_ascendant: boolean;
  continuous_streak: number;
  cumulative_months: number;
}

interface StipendEntry {
  period_key: string;
  shards_credited: number;
  created_at: string | null;
}

interface StatusResponse {
  subscribed: boolean;
  subscription: SubscriptionData | null;
  boosts: Boosts;
  stipend_history: StipendEntry[];
}

export function SubscriptionPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/subscriptions/status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      setError('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSubscribe = async (planKey: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/subscriptions/create', { plan_key: planKey });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.checkout_url;
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to create subscription');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/subscriptions/cancel');
      if (res.ok) {
        setShowCancelModal(false);
        await fetchStatus();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to cancel');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/api/subscriptions/reactivate');
      if (res.ok) {
        await fetchStatus();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to reactivate');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSwitch = async () => {
    if (!status?.subscription) return;
    const newPlan = status.subscription.plan_key === 'ascendant_monthly'
      ? 'ascendant_annual' : 'ascendant_monthly';
    setActionLoading(true);
    try {
      const res = await api.post('/api/subscriptions/switch', { new_plan_key: newPlan });
      if (res.ok) {
        setShowSwitchModal(false);
        await fetchStatus();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to switch plan');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="sub-page sub-loading">Loading...</div>;

  const sub = status?.subscription;
  const boosts = status?.boosts || { xp: 1, essence: 1, drop_rate: 1, training_speed: 1, stipend_shards: 0, is_ascendant: false, continuous_streak: 0, cumulative_months: 0 };

  return (
    <div className="sub-page">
      <h2 className="sub-title">
        <span className="sub-star">★</span> Elysium Ascendant
      </h2>

      {error && <div className="sub-error">{error}</div>}

      {sub?.status === 'past_due' && (
        <PaymentWarningBanner graceDeadline={sub.grace_deadline} />
      )}

      {!status?.subscribed ? (
        /* Non-subscriber view */
        <div className="sub-promo">
          <p className="sub-promo-text">Become an Ascendant and unlock:</p>
          <ul className="sub-benefits-list">
            <li>+15% XP &amp; Essence gains</li>
            <li>+10% Drop Rate &amp; Training Speed</li>
            <li>150 Shards every month</li>
            <li>Exclusive badge, title, and chat flair</li>
            <li>Loyalty streak bonuses</li>
          </ul>

          <div className="sub-cards-row">
            <SubscriptionCard
              planKey="ascendant_monthly"
              price="$1.99/mo"
              label="Monthly"
              onSubscribe={handleSubscribe}
              disabled={actionLoading}
            />
            <SubscriptionCard
              planKey="ascendant_annual"
              price="$19.90/yr"
              subPrice="~$1.66/mo"
              label="Annual"
              badge="2 months free!"
              onSubscribe={handleSubscribe}
              disabled={actionLoading}
            />
          </div>

          <LoyaltyProgress streak={0} cumulative={0} />
        </div>
      ) : (
        /* Active subscriber view */
        <div className="sub-active">
          <div className="sub-status-card">
            <div className="sub-status-row">
              <span className="sub-label">Plan:</span>
              <span>{sub?.plan_key === 'ascendant_annual' ? 'Annual ($19.90/yr)' : 'Monthly ($1.99/mo)'}</span>
            </div>
            <div className="sub-status-row">
              <span className="sub-label">Status:</span>
              <span className={`sub-status-badge sub-status-${sub?.status}`}>
                {sub?.status === 'canceling' ? 'Canceling' : sub?.status === 'past_due' ? 'Past Due' : 'Active'}
              </span>
            </div>
            {sub?.current_period_end && (
              <div className="sub-status-row">
                <span className="sub-label">
                  {sub.status === 'canceling' ? 'Ends:' : 'Next renewal:'}
                </span>
                <span>{new Date(sub.current_period_end).toLocaleDateString()}</span>
              </div>
            )}
            <div className="sub-status-row">
              <span className="sub-label">Streak:</span>
              <span>{boosts.continuous_streak} month{boosts.continuous_streak !== 1 ? 's' : ''} {'★'.repeat(Math.min(boosts.continuous_streak, 5))}</span>
            </div>
          </div>

          <BoostDisplay boosts={boosts} />

          <div className="sub-actions">
            {sub?.status === 'canceling' ? (
              <button className="sub-btn sub-btn-primary" onClick={handleReactivate} disabled={actionLoading}>
                Reactivate Subscription
              </button>
            ) : (
              <>
                <button className="sub-btn sub-btn-secondary" onClick={() => setShowSwitchModal(true)} disabled={actionLoading}>
                  Switch to {sub?.plan_key === 'ascendant_monthly' ? 'Annual' : 'Monthly'}
                </button>
                <button className="sub-btn sub-btn-danger" onClick={() => setShowCancelModal(true)} disabled={actionLoading}>
                  Cancel Subscription
                </button>
              </>
            )}
          </div>

          <LoyaltyProgress streak={boosts.continuous_streak} cumulative={boosts.cumulative_months} />

          {status?.stipend_history && status.stipend_history.length > 0 && (
            <div className="sub-stipend-history">
              <h3>Stipend History</h3>
              <div className="sub-stipend-list">
                {status.stipend_history.map((s, i) => (
                  <div key={i} className="sub-stipend-item">
                    <span>{s.period_key}</span>
                    <span>+{s.shards_credited} shards</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="sub-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="sub-modal" onClick={e => e.stopPropagation()}>
            <h3>Cancel Subscription</h3>
            <p>Your benefits will remain active until the end of your current billing period
              {sub?.current_period_end && ` (${new Date(sub.current_period_end).toLocaleDateString()})`}.
              No prorated refund will be issued.</p>
            <div className="sub-modal-actions">
              <button className="sub-btn sub-btn-secondary" onClick={() => setShowCancelModal(false)}>Keep Subscription</button>
              <button className="sub-btn sub-btn-danger" onClick={handleCancel} disabled={actionLoading}>
                {actionLoading ? 'Canceling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch Confirmation Modal */}
      {showSwitchModal && (
        <div className="sub-modal-overlay" onClick={() => setShowSwitchModal(false)}>
          <div className="sub-modal" onClick={e => e.stopPropagation()}>
            <h3>Switch Plan</h3>
            <p>Switch to {sub?.plan_key === 'ascendant_monthly' ? 'Annual ($19.90/yr — save 17%)' : 'Monthly ($1.99/mo)'}?
              Proration will be applied to your next bill. Benefits continue uninterrupted.</p>
            <div className="sub-modal-actions">
              <button className="sub-btn sub-btn-secondary" onClick={() => setShowSwitchModal(false)}>Cancel</button>
              <button className="sub-btn sub-btn-primary" onClick={handleSwitch} disabled={actionLoading}>
                {actionLoading ? 'Switching...' : 'Confirm Switch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
