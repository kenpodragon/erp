import React from 'react';

interface LeaderboardEntry {
  rank: number;
  player_alias: string;
  patron_tier: string | null;
  diamond_stars: number;
}

interface Props {
  entries: LeaderboardEntry[];
}

const TIER_BADGE: Record<string, string> = {
  bronze: '\u{1F949}',
  silver: '\u{1F948}',
  gold: '\u{1F947}',
  diamond: '\u{1F48E}',
};

const DonorLeaderboard: React.FC<Props> = ({ entries }) => {
  if (entries.length === 0) return null;

  return (
    <div className="donor-leaderboard-section">
      <h3>Donor Hall of Honor</h3>
      <div className="donor-leaderboard-list">
        {entries.map((entry) => {
          const badge = entry.patron_tier ? (TIER_BADGE[entry.patron_tier] || '') : '';
          const stars = entry.diamond_stars > 0 ? '\u2605'.repeat(entry.diamond_stars) : '';
          const tierLabel = entry.patron_tier
            ? `${entry.patron_tier.charAt(0).toUpperCase() + entry.patron_tier.slice(1)} Patron`
            : '';
          return (
            <div key={entry.rank} className="donor-leaderboard-row">
              <span className="donor-rank">#{entry.rank}</span>
              <span className="donor-badge">{badge}{stars && ` ${stars}`}</span>
              <span className="donor-alias">{entry.player_alias}</span>
              <span className="donor-tier">{tierLabel}{stars && ` ${stars}`}</span>
            </div>
          );
        })}
      </div>
      <p className="donor-leaderboard-footer">
        Showing {entries.length} patron{entries.length !== 1 ? 's' : ''} who chose to be recognized.
      </p>
    </div>
  );
};

export default DonorLeaderboard;
