/**
 * HeroStats — Character combat stat panel.
 *
 * Displays current session stats: click damage, auto-DPS, gold rate,
 * and Dark Ritual multiplier. Updates live from session context.
 */
import React, { useState, useEffect } from 'react';
import type { StorySession } from '../../GameContext';
import { formatNumber, calculateUpgradeDamage } from '../../utils/numbers';
import { api } from '../../../api';
import CharacterStatPanel from './CharacterStatPanel';
import CharacterLevelBar from './CharacterLevelBar';
import './HeroStats.css';

interface Props {
  session: StorySession;
}

const STAT_LABELS: Record<string, string> = {
  strength: 'STR',
  agility: 'AGI',
  intelligence: 'INT',
  crit_chance_pct: 'CRIT%',
  crit_damage_pct: 'CRIT DMG',
};

const HeroStats: React.FC<Props> = ({ session }) => {
  const [relicStats, setRelicStats] = useState<Record<string, number> | null>(null);
  const [relicExpanded, setRelicExpanded] = useState(false);

  useEffect(() => {
    api.get('/api/game/home-base/artifacts')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.stat_total) setRelicStats(data.stat_total);
      })
      .catch(() => {});
  }, []);

  const relicTotal = relicStats
    ? Object.values(relicStats).reduce((sum, v) => sum + v, 0)
    : 0;

  const baseClick = (session.characterStrength || 0) + (session.clickUpgradeLevel || 0);
  const clickDmg = baseClick
    * (session.clickDmgMultiplier || 1)
    * (session.darkRitualMultiplier || 1);

  const baseAuto = (session.autoDpsPerSecond || 0) + (session.autoUpgradeLevel || 0);
  const autoDps = baseAuto
    * (session.autoDpsMultiplier || 1)
    * (session.darkRitualMultiplier || 1);

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
      <CharacterLevelBar />
      <div className="hero-stats-title">COMBAT STATS</div>
      {rows.map(row => (
        <div key={row.label} className={`hero-stats-row ${row.highlight ? 'hero-stats-row--highlight' : ''}`}>
          <span className="hero-stats-label">{row.label}</span>
          <span className="hero-stats-value">{row.value}</span>
        </div>
      ))}

      {relicTotal > 0 && (
        <div className="relic-power-section">
          <button
            className="relic-power-badge"
            onClick={() => setRelicExpanded(!relicExpanded)}
            title="Relic Power — click for details"
          >
            <span className="relic-gem">&#9670;</span>
            <span className="relic-power-value">+{relicTotal}</span>
          </button>
          {relicExpanded && relicStats && (
            <div className="relic-power-breakdown">
              {Object.entries(relicStats)
                .filter(([, v]) => v > 0)
                .map(([stat, value]) => (
                  <div key={stat} className="relic-stat-row">
                    <span className="relic-stat-label">{STAT_LABELS[stat] || stat}</span>
                    <span className="relic-stat-value">+{value}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <CharacterStatPanel />
    </div>
  );
};

export default HeroStats;
