import React, { useState, useMemo } from 'react';
import GoldOdometer from './GoldOdometer';
import HeroStats from './HeroStats';
import UpgradeMenu from './UpgradeMenu';
import SkillsHotbar from './SkillsHotbar';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';
import './StoryModeDashboard.css';

export interface SkillTreeEntry {
  skill_id: number;
  name: string;
  display_name: string;
  category: string;
  description: string | null;
  is_class_exclusive: boolean;
  effect_type: string | null;
  idle_level: number;
  idle_xp: number;
  max_session_level: number;
  prerequisites_met: boolean;
  prerequisites: Array<{
    type: string;
    ref_id: number;
    required: number;
    current: number;
    met: boolean;
    hint: string | null;
  }>;
  at_level_0: boolean;
  level_0_xp_requirement: number;
  idle_level_scaling: Record<string, Record<string, number>> | null;
}

interface Props {
  session: StorySession;
  gameConfigs: Record<string, any>;
  skillTree: SkillTreeEntry[];
  onPlayerUpdate: () => void;
  uiScale: number;
  gameTextScale: number;
  onSettingsChange: (settings: any) => void;
  cpsValid?: boolean;
  reduceMotion?: boolean;
}

const StoryModeDashboard: React.FC<Props> = ({
  session,
  gameConfigs,
  skillTree,
  onPlayerUpdate,
  uiScale,
  gameTextScale,
  onSettingsChange,
  cpsValid = true,
  reduceMotion = false,
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

  // Split skill tree into universal and class-exclusive active skills
  const universalActiveSkills = useMemo(() =>
    skillTree.filter(s => s.category === 'active' && !s.is_class_exclusive),
    [skillTree]
  );
  const classActiveSkills = useMemo(() =>
    skillTree.filter(s => s.category === 'active' && s.is_class_exclusive),
    [skillTree]
  );

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
         <GoldOdometer gold={session.sessionGold} cpsValid={cpsValid} reduceMotion={reduceMotion} />
         <div className="dashboard-settings">
           <div className="setting-item">
             <label>TEXT SCALE: {gameTextScale.toFixed(1)}x</label>
             <input type="range" min="1.0" max="5.0" step="0.1" value={gameTextScale} onChange={handleTextScaleChange} />
           </div>
         </div>
      </div>
        <div className="dashboard-main-grid">
           <div className="dashboard-col stats-col">
             <HeroStats session={session} />
           </div>
           <div className="dashboard-col upgrades-col">
             <UpgradeMenu session={session} gameConfigs={gameConfigs} skillTree={skillTree} />
           </div>
           <div className="dashboard-col skills-col">
             <SkillsHotbar session={session} gameConfigs={gameConfigs} classSkills={classActiveSkills} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default StoryModeDashboard;
