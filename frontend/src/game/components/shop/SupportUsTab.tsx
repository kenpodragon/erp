import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api';
import RecentDonorsBanner from './RecentDonorsBanner';
import DonationConfirmModal from './DonationConfirmModal';
import PatronStatus from './PatronStatus';
import DonorLeaderboard from './DonorLeaderboard';
import './SupportUsTab.css';

interface PatronStatusData {
  cumulative_cents: number;
  cumulative_display: string;
  patron_tier: string | null;
  diamond_stars: number;
  diamond_stars_display: number;
  donor_visibility: boolean;
  donation_count: number;
  next_tier: string | null;
  next_threshold_cents: number | null;
  remaining_cents: number | null;
  remaining_display: string | null;
}

interface RecentDonor {
  player_alias: string;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  player_alias: string;
  patron_tier: string | null;
  diamond_stars: number;
}

const DONATION_TIERS = [100, 500, 1000, 2500, 5000, 10000]; // cents

const SupportUsTab: React.FC = () => {
  const [patronStatus, setPatronStatus] = useState<PatronStatusData | null>(null);
  const [recentDonors, setRecentDonors] = useState<RecentDonor[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Donation form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, recentRes, lbRes] = await Promise.all([
        api.get('/api/donations/status'),
        api.get('/api/donations/recent'),
        api.get('/api/donations/leaderboard'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setPatronStatus(data);
        setShowOnLeaderboard(data.donor_visibility ?? false);
      }
      if (recentRes.ok) setRecentDonors(await recentRes.json());
      if (lbRes.ok) setLeaderboard(await lbRes.json());
    } catch (err) {
      setError('Failed to load donation data.');
      console.error('Support tab fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDonationAmountCents = (): number | null => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) {
      const parsed = parseFloat(customAmount);
      if (!isNaN(parsed) && parsed >= 1) return Math.round(parsed * 100);
    }
    return null;
  };

  const handleTierSelect = (cents: number) => {
    setSelectedAmount(cents);
    setCustomAmount('');
    setCustomError(null);
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setCustomError(null);
    const parsed = parseFloat(value);
    if (value && (isNaN(parsed) || parsed < 1)) {
      setCustomError('Minimum donation is $1.00');
    }
  };

  const handleDonateClick = () => {
    const amount = getDonationAmountCents();
    if (!amount || amount < 100) {
      setCustomError('Please select or enter a donation amount (minimum $1.00).');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDonate = async () => {
    const amount = getDonationAmountCents();
    if (!amount) return;

    // Update visibility if changed
    if (showOnLeaderboard !== (patronStatus?.donor_visibility ?? false)) {
      await api.post('/api/donations/visibility', { visible: showOnLeaderboard });
    }

    try {
      const res = await api.post('/api/donations/create-session', { amount_cents: amount });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create donation session.');
      }
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout.');
    } finally {
      setShowConfirmModal(false);
    }
  };

  if (loading) {
    return (
      <div className="support-us-loading">
        <div className="shop-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="support-us-tab">
      {/* Recent Donors Banner */}
      {recentDonors.length > 0 && <RecentDonorsBanner donors={recentDonors} />}

      {/* Heartfelt Message */}
      <div className="support-message">
        <h2 className="support-heading">Support Elysium Rising</h2>
        <p>
          Elysium Rising is a labor of love. Your donation helps us continue building
          this world — from new chapters and features to keeping the servers running.
        </p>
        <p>Every contribution, big or small, makes a difference. Thank you for being part of this journey.</p>

        <div className="support-other-ways">
          <h4>Other Ways to Support</h4>
          <ul>
            <li>Listen on Eleven Reader (audiobook)</li>
            <li>Purchase the books on Amazon</li>
            <li>Gift the series to a friend or your local library</li>
          </ul>
        </div>
      </div>

      {/* Donation Form */}
      <div className="donation-section">
        <h3>Make a Donation</h3>

        <div className="donation-tiers">
          {DONATION_TIERS.map((cents) => (
            <button
              key={cents}
              className={`donation-tier-btn ${selectedAmount === cents ? 'selected' : ''}`}
              onClick={() => handleTierSelect(cents)}
            >
              ${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}
            </button>
          ))}
        </div>

        <div className="donation-custom">
          <label htmlFor="custom-amount">Or enter a custom amount:</label>
          <div className="custom-input-wrapper">
            <span className="dollar-sign">$</span>
            <input
              id="custom-amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
            />
          </div>
          {customError && <p className="donation-error">{customError}</p>}
        </div>

        <label className="leaderboard-opt-in">
          <input
            type="checkbox"
            checked={showOnLeaderboard}
            onChange={(e) => setShowOnLeaderboard(e.target.checked)}
          />
          Show my name on the donor leaderboard
        </label>

        <button
          className="donate-btn"
          onClick={handleDonateClick}
          disabled={!getDonationAmountCents() || (getDonationAmountCents() ?? 0) < 100}
        >
          Donate
        </button>
      </div>

      {error && <div className="support-error"><p>{error}</p></div>}

      {/* Patron Status */}
      {patronStatus && <PatronStatus status={patronStatus} />}

      {/* Donor Leaderboard */}
      <DonorLeaderboard entries={leaderboard} />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <DonationConfirmModal
          amountCents={getDonationAmountCents() ?? 0}
          onConfirm={handleConfirmDonate}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};

export default SupportUsTab;
