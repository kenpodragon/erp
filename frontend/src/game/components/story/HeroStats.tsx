/**
 * HeroStats — Character combat stat panel.
 *
 * Displays current session stats: click damage, auto-DPS, gold rate,
 * and Dark Ritual multiplier. Updates live from session context.
 */
import React from 'react';
import type { StorySession } from '../../GameContext';
import { formatNumber, calculateUpgradeDamage } from '../../utils/numbers';
import './HeroStats.css';

interface Props {
  session: StorySession;
}

const HeroStats: React.FC<Props> = ({ session }) => {
  const baseClick = session.characterStrength + calculateUpgradeDamage(session.clickUpgradeLevel);
  const clickDmg = baseClick
    * session.clickDmgMultiplier
    * session.darkRitualMultiplier;

  const baseAuto = session.autoDpsPerSecond + calculateUpgradeDamage(session.autoUpgradeLevel);
  const autoDps = baseAuto
    * session.autoDpsMultiplier
    * session.darkRitualMultiplier;

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Click Dmg',  value: formatNumber(clickDmg) },
    { label: 'Auto DPS',   value: `${formatNumber(autoDps)}/s` },
    { label: 'Gold Rate',  value: `×${session.goldDropMultiplier.toFixed(2)}` },
    {
      label: 'Dark Ritual',
      value: `×${session.darkRitualMultiplier.toFixed(3)}`,
      highlight: session.darkRitualMultiplier > 1,
    },
  ];

  return (
    <div className="hero-stats">
      <div className="hero-stats-title">HERO STATS</div>
      {rows.map(row => (
        <div key={row.label} className={`hero-stats-row ${row.highlight ? 'hero-stats-row--highlight' : ''}`}>
          <span className="hero-stats-label">{row.label}</span>
          <span className="hero-stats-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
};

export default HeroStats;
