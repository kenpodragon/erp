/**
 * CharacterStatPanel — Displays STR/AGI/INT computed stats.
 *
 * Fetches from GET /api/game/character/stats and shows each stat
 * with a tooltip breakdown of sources (class base, idle, lore, level, equipment).
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import './CharacterStatPanel.css';

interface StatData {
  name: string;
  display_name: string;
  total: number;
}

interface CharacterStats {
  character_id: number;
  level: number;
  stats: StatData[];
}

const STAT_ICONS: Record<string, string> = {
  strength: 'STR',
  agility: 'AGI',
  intelligence: 'INT',
};

const CharacterStatPanel: React.FC = () => {
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/api/game/character/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setStats(data);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error || !stats) return null;

  return (
    <div className="char-stat-panel">
      <div className="char-stat-panel-title">CHARACTER STATS</div>
      <div className="char-stat-list">
        {stats.stats.map(stat => (
          <div key={stat.name} className="char-stat-row" title={`${stat.display_name}: ${stat.total}`}>
            <span className="char-stat-abbr">{STAT_ICONS[stat.name] || stat.name.slice(0, 3).toUpperCase()}</span>
            <div className="char-stat-bar-track">
              <div
                className="char-stat-bar-fill"
                style={{ width: `${Math.min(100, (stat.total / 100) * 100)}%` }}
              />
            </div>
            <span className="char-stat-value">{stat.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CharacterStatPanel;
