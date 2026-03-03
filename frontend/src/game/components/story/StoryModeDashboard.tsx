import React, { useState, useMemo } from 'react';
import GoldOdometer from './GoldOdometer';
import HeroStats from './HeroStats';
import UpgradeMenu from './UpgradeMenu';
import SkillsHotbar from './SkillsHotbar';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';
import './StoryModeDashboard.css';

interface Props {
  session: StorySession;
  gameConfigs: Record<string, any>;
  onPlayerUpdate: () => void;
  uiScale: number;
  gameTextScale: number;
  onSettingsChange: (settings: any) => void;
}

const StoryModeDashboard: React.FC<Props> = ({ 
  session, 
  gameConfigs, 
  onPlayerUpdate,
  uiScale,
  gameTextScale,
  onSettingsChange
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const prospectEssence = useMemo(() => {
    const baseRate = Number(gameConfigs['gold_to_essence_base_rate'] ?? 1000);
    const growthFactor = Number(gameConfigs['gold_to_essence_growth_factor'] ?? 1.07);
    const effectiveRate = baseRate * Math.pow(growthFactor, Math.max(0, session.currentZone - 1));
    return session.sessionGold / Math.max(effectiveRate, 1.0);
  }, [session.sessionGold, session.currentZone, gameConfigs]);

  const handleUiScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSettingsChange({ ui_scale: val });
  };

  const handleTextScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSettingsChange({ game_text_scale: val });
  };

  return (
    <div className={`story-dashboard ${isCollapsed ? 'story-dashboard--collapsed' : 'story-dashboard--expanded'}`}>
      <div className="dashboard-toggle" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="toggle-handle">
          <span className="toggle-arrow">{isCollapsed ? '▲' : '▼'}</span>
          <div className="toggle-stats">
            <span className="prospect-essence">
              SESSION GOLD: <span className="gold-value">★ {session.sessionGold.toLocaleString()}</span>
            </span>
            <span className="prospect-essence">
              PROSPECT ESSENCE: <span className="essence-value">{prospectEssence.toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-top-row">
           <GoldOdometer gold={session.sessionGold} />
           <div className="dashboard-settings">
             <div className="setting-item">
               <label>UI SCALE: {uiScale.toFixed(1)}x</label>
               <input type="range" min="0.5" max="2.0" step="0.1" value={uiScale} onChange={handleUiScaleChange} />
             </div>
             <div className="setting-item">
               <label>TEXT SCALE: {gameTextScale.toFixed(1)}x</label>
               <input type="range" min="0.5" max="2.5" step="0.1" value={gameTextScale} onChange={handleTextScaleChange} />
             </div>
           </div>
        </div>

        <div className="dashboard-main-grid">
           <div className="dashboard-col stats-col">
             <HeroStats session={session} />
           </div>
           <div className="dashboard-col upgrades-col">
             <UpgradeMenu session={session} gameConfigs={gameConfigs} />
           </div>
           <div className="dashboard-col skills-col">
             <SkillsHotbar session={session} gameConfigs={gameConfigs} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default StoryModeDashboard;
