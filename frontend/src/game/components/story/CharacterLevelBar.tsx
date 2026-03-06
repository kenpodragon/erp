/**
 * CharacterLevelBar — Level display with XP progress bar.
 *
 * Fetches from GET /api/game/character/level and shows current level,
 * XP progress to next level, and total XP.
 */
import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import { formatNumber } from '../../utils/numbers';
import './CharacterLevelBar.css';

interface LevelData {
  level: number;
  character_xp: number;
  xp_to_next_level: number;
  xp_for_current_level: number;
  xp_for_next_level: number;
  level_cap: number;
}

const CharacterLevelBar: React.FC = () => {
  const [data, setData] = useState<LevelData | null>(null);

  useEffect(() => {
    api.get('/api/game/character/level')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const atCap = data.level >= data.level_cap;
  const xpInLevel = data.character_xp - data.xp_for_current_level;
  const xpNeeded = data.xp_for_next_level - data.xp_for_current_level;
  const pct = atCap ? 100 : xpNeeded > 0 ? Math.min(100, (xpInLevel / xpNeeded) * 100) : 0;

  return (
    <div className="char-level-bar">
      <div className="char-level-badge">Lv {data.level}</div>
      <div className="char-level-track">
        <div className="char-level-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="char-level-xp">
        {atCap ? 'MAX' : `${formatNumber(data.xp_to_next_level)} to next`}
      </div>
    </div>
  );
};

export default CharacterLevelBar;
