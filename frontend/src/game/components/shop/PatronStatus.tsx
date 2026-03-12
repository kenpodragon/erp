import React from 'react';

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

interface Props {
  status: PatronStatusData;
}

const TIER_ICONS: Record<string, string> = {
  bronze: '\u{1F6E1}\uFE0F',
  silver: '\u{1F6E1}\uFE0F',
  gold: '\u{1F3C5}',
  diamond: '\u{1F48E}',
};

const PatronStatus: React.FC<Props> = ({ status }) => {
  const tierLabel = status.patron_tier
    ? `${status.patron_tier.charAt(0).toUpperCase() + status.patron_tier.slice(1)} Patron`
    : 'Not yet a Patron';

  const tierIcon = status.patron_tier ? (TIER_ICONS[status.patron_tier] || '') : '';
  const starsDisplay = status.patron_tier === 'diamond' && status.diamond_stars_display > 0
    ? ' ' + '\u2605'.repeat(status.diamond_stars_display)
    : '';

  return (
    <div className="patron-status-section">
      <h3>Your Patron Status</h3>
      <div className="patron-current">
        <span className="patron-icon">{tierIcon}</span>
        <span className="patron-tier-label">{tierLabel}{starsDisplay}</span>
        <span className="patron-cumulative">({status.cumulative_display} cumulative)</span>
      </div>
      {status.next_tier && status.remaining_display && (
        <p className="patron-next">
          Next tier: <strong>{status.next_tier}</strong> — {status.remaining_display} to go
        </p>
      )}
      <p className="patron-count">You've made {status.donation_count} donation{status.donation_count !== 1 ? 's' : ''}.</p>
    </div>
  );
};

export default PatronStatus;
