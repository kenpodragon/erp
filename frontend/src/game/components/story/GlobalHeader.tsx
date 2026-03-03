import React, { useEffect, useState } from 'react';
import { api } from '../../../api';
import type { ActiveBuff } from '../../GameContext';
import AudioPlayerCompact from './AudioPlayerCompact';
import './GlobalHeader.css';

interface Props {
  chapterId: number;
  sceneId: number;
  darkRitualMultiplier: number;
  activeBuffs: ActiveBuff[];
}

const GlobalHeader: React.FC<Props> = ({ chapterId, sceneId, darkRitualMultiplier, activeBuffs }) => {
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
        <AudioPlayerCompact chapterId={chapterId} />
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
