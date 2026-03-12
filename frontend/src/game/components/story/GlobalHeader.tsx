import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import type { ActiveBuff, ActiveBooster } from '../../GameContext';
import { useGame } from '../../GameContext';
import MusicManager from './MusicManager';
import './GlobalHeader.css';

type MusicState = 'explore' | 'combat' | 'boss' | 'mystery';

interface Props {
  chapterId: number;
  sceneId: number;
  darkRitualMultiplier: number;
  activeBuffs: ActiveBuff[];
  musicState: MusicState;
  bossEntityId?: number | null;
}

const BOOST_TYPE_LABELS: Record<string, string> = {
  xp: 'XP',
  essence: 'ESS',
  drop_rate: 'DROP',
};

function formatBoosterCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

const GlobalHeader: React.FC<Props> = ({ chapterId, sceneId, darkRitualMultiplier, activeBuffs, musicState, bossEntityId }) => {
  const { state } = useGame();
  const [chapterLabel, setChapterLabel] = useState('...');
  const [sceneLabel, setSceneLabel] = useState('...');

  useEffect(() => {
    api.get(`/api/game/scenes/${sceneId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setChapterLabel(`Chapter ${data.chapter?.chapter_number ?? chapterId}`);
          setSceneLabel(`Scene ${data.scene_number} — ${data.title ?? 'Unknown'}`);
        }
      })
      .catch(() => {});
  }, [sceneId, chapterId]);

  const darkRitualStacks = Math.max(0, Math.round((darkRitualMultiplier - 1) / 0.05));
  const darkRitualPct = Math.min(100, darkRitualStacks * 10);

  return (
    <header className="story-global-header">
      <div className="story-header-left">
        <div className="story-header-breadcrumb">
          <span className="breadcrumb-chapter">{chapterLabel}</span>
          <span className="breadcrumb-sep">|</span>
          <span className="breadcrumb-scene">{sceneLabel}</span>
        </div>
        <MusicManager musicState={musicState} sceneId={sceneId} bossEntityId={bossEntityId} />
      </div>

      {/* Active buff tray */}
      <div className="story-buff-tray">
        {activeBuffs.map(buff => {
          const remaining = buff.expiresAt < 0 ? -1 : Math.max(0, buff.expiresAt - Date.now());
          const remainingS = remaining < 0 ? '∞' : Math.ceil(remaining / 1000).toString();
          return (
            <div key={buff.skillId} className="buff-chip" title={buff.skillName}>
              <span className="buff-name">{buff.skillName}</span>
              <span className="buff-timer">{remainingS}s</span>
            </div>
          );
        })}
        {/* 3.3: Active shop boosters */}
        {state.activeBoosters.map(b => (
          <div key={b.boostType} className="buff-chip booster-buff" title={`${b.boostType.toUpperCase()} Booster ${b.magnitude}x`}>
            <span className="buff-name">{'\u26A1'} {BOOST_TYPE_LABELS[b.boostType] || b.boostType} {b.magnitude}x</span>
            <span className="buff-timer">{formatBoosterCountdown(b.remainingSeconds)}</span>
          </div>
        ))}
      </div>

      {/* Dark Ritual persistent bar */}
      {darkRitualMultiplier > 1 && (
        <div className="dark-ritual-bar-wrap" title={`Dark Ritual: ×${darkRitualMultiplier.toFixed(3)}`}>
          <span className="dark-ritual-label">DARK RITUAL ×{darkRitualMultiplier.toFixed(2)}</span>
          <div className="dark-ritual-track">
            <div className="dark-ritual-fill" style={{ width: `${darkRitualPct}%` }} />
          </div>
        </div>
      )}
    </header>
  );
};

export default GlobalHeader;
