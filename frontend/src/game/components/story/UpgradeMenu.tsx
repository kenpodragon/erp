/**
 * UpgradeMenu — Click damage, auto-DPS, and active skill upgrade panel.
 *
 * Features:
 *  - Global quantity toggle: x1 / x10 / x100 / MAX
 *  - Click Damage and Auto-DPS upgrade tracks
 *  - Active skill upgrades from skill tree (prerequisite-gated)
 *  - Cost formula: base × 1.07^level  (per unit)
 *  - Grey-out when unaffordable or prerequisites not met
 *  - "Big Bonus" label at levels 200+ every 25 levels
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useGame } from '../../GameContext';
import type { StorySession } from '../../GameContext';
import type { SkillTreeEntry } from './StoryModeDashboard';
import { api } from '../../../api';
import { formatGold, upgradeCost, maxAffordable, calculateUpgradeDamage } from '../../utils/numbers';
import './UpgradeMenu.css';

type Qty = 1 | 10 | 100 | 'MAX';

interface UpgradeTrack {
  type: 'click_dmg' | 'auto_dps';
  label: string;
  shortLabel: string;
  level: number;
  baseCost: number;
}

interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  skillTree: SkillTreeEntry[];
}

const UpgradeMenu: React.FC<Props> = ({ session, gameConfigs, skillTree }) => {
  const { updateStorySession } = useGame();
  const [qty, setQty] = useState<Qty>(1);

  // Sync constants from gameConfigs
  const COST_SCALING = Number(gameConfigs['upgrade_cost_scaling'] ?? 1.07);
  const BASE_CLICK_COST = Number(gameConfigs['base_click_upgrade_cost'] ?? 10.0);
  const BASE_DPS_COST = Number(gameConfigs['base_auto_dps_upgrade_cost'] ?? 25.0);
  const MILESTONE_INTERVAL = Number(gameConfigs['milestone_interval'] ?? 25);
  const MILESTONE_START = Number(gameConfigs['milestone_start'] ?? 200);

  // Maintain local level state, but sync from session props
  const [clickLvl, setClickLvl] = useState(isNaN(session.clickUpgradeLevel) ? 1 : session.clickUpgradeLevel);
  const [autoLvl, setAutoLvl] = useState(isNaN(session.autoUpgradeLevel) ? 1 : session.autoUpgradeLevel);

  useEffect(() => {
    if (!isNaN(session.clickUpgradeLevel)) setClickLvl(session.clickUpgradeLevel);
    if (!isNaN(session.autoUpgradeLevel)) setAutoLvl(session.autoUpgradeLevel);
  }, [session.clickUpgradeLevel, session.autoUpgradeLevel]);

  // Filter active skills from skill tree (visible = not class-exclusive or matching class)
  const activeSkills = useMemo(() =>
    skillTree.filter(s => s.category === 'active' && !s.is_class_exclusive),
    [skillTree]
  );

  const handleUpgrade = useCallback(async (trackType: 'click_dmg' | 'auto_dps', currentLevel: number, baseCost: number) => {
    const safeLevel = isNaN(currentLevel) ? 1 : currentLevel;
    let n = qty === 'MAX' ? maxAffordable(baseCost, safeLevel, session.sessionGold, COST_SCALING) : qty;
    if (n < 1 || isNaN(n)) return;

    const cost = upgradeCost(baseCost, safeLevel, n, COST_SCALING);
    if (session.sessionGold < cost) return;

    try {
      const res = await api.post(`/api/game/story/session/${session.sessionId}/upgrade`, {
        upgrade_type: trackType,
        quantity: n,
      });

      if (res.ok) {
        const data = await res.json();
        updateStorySession({
          sessionGold: data.session_gold ?? session.sessionGold,
          clickDmgMultiplier: data.click_dmg_multiplier ?? session.clickDmgMultiplier,
          autoDpsMultiplier: data.auto_dps_multiplier ?? session.autoDpsMultiplier,
          clickUpgradeLevel: data.click_upgrade_level ?? session.clickUpgradeLevel,
          autoUpgradeLevel: data.auto_upgrade_level ?? session.autoUpgradeLevel,
        });
      }
    } catch (err) {
      console.error('Upgrade failed', err);
    }
  }, [qty, session, updateStorySession, COST_SCALING]);

  const tracks: UpgradeTrack[] = [
    {
      type: 'click_dmg',
      label: 'Click Damage',
      shortLabel: 'CLK',
      level: clickLvl,
      baseCost: BASE_CLICK_COST,
    },
    {
      type: 'auto_dps',
      label: 'Auto-DPS',
      shortLabel: 'DPS',
      level: autoLvl,
      baseCost: BASE_DPS_COST,
    }
  ];

  if (isNaN(clickLvl) || isNaN(autoLvl)) {
    return (
      <div className="upgrade-menu upgrade-menu--error">
        <p>Data corruption detected.</p>
        <button onClick={() => window.location.reload()}>Fix and Refresh</button>
      </div>
    );
  }

  return (
    <div className="upgrade-menu">
      <div className="upgrade-qty-row">
        <span className="upgrade-qty-label">Buy:</span>
        {( [1, 10, 100, 'MAX'] as Qty[]).map(v => (
          <button
            key={v}
            className={`upgrade-qty-btn ${qty === v ? 'upgrade-qty-btn--active' : ''}`}
            onClick={() => setQty(v)}
          >
            {v === 'MAX' ? 'MAX' : `×${v}`}
          </button>
        ))}
      </div>

      {tracks.map(track => {
        let n = qty === 'MAX' ? maxAffordable(track.baseCost, track.level, session.sessionGold, COST_SCALING) : qty;
        const cost = upgradeCost(track.baseCost, track.level, n, COST_SCALING);
        const disabled = session.sessionGold < cost || n === 0;

        const nextLevel = track.level + n;
        const isMilestone = nextLevel >= MILESTONE_START && (nextLevel % MILESTONE_INTERVAL === 0);

        const currentDmg = calculateUpgradeDamage(track.level);
        const unitLabel = track.type === 'click_dmg' ? 'click damage bonus' : 'auto-DPS bonus';

        return (
          <div
            key={track.type}
            className={`upgrade-row ${disabled ? 'upgrade-row--disabled' : ''} ${isMilestone ? 'upgrade-row--spike' : ''}`}
            onClick={() => !disabled && handleUpgrade(track.type, track.level, track.baseCost)}
          >
            <div className="upgrade-row-left">
              <div className="upgrade-short">{track.shortLabel}</div>
              <div className="upgrade-info">
                <div className="upgrade-name">{track.label}</div>
                <div className="upgrade-level">Level {track.level} — +{currentDmg} {unitLabel}</div>
                {isMilestone && (
                  <div className="upgrade-milestone">BIG BONUS!</div>
                )}
              </div>
            </div>

            <div className="upgrade-row-right">
              <div className="upgrade-cost">★ {formatGold(cost)}</div>
              {n > 1 && (
                <span className="upgrade-qty-badge">×{n}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Active Skill Upgrades — prerequisite-gated */}
      {activeSkills.length > 0 && (
        <>
          <div className="upgrade-section-label">ACTIVE SKILLS</div>
          {activeSkills.map(skill => {
            const locked = !skill.prerequisites_met || skill.at_level_0;
            const firstUnmetPrereq = skill.prerequisites.find(p => !p.met);

            return (
              <div
                key={skill.skill_id}
                className={`upgrade-row upgrade-row--skill ${locked ? 'upgrade-row--locked' : ''}`}
                title={locked && firstUnmetPrereq?.hint
                  ? firstUnmetPrereq.hint
                  : skill.description || skill.display_name}
              >
                <div className="upgrade-row-left">
                  <div className="upgrade-short upgrade-short--skill">
                    {skill.effect_type ? skill.effect_type.slice(0, 3).toUpperCase() : '???'}
                  </div>
                  <div className="upgrade-info">
                    <div className="upgrade-name">{skill.display_name}</div>
                    <div className="upgrade-level">
                      Idle Lv {skill.idle_level}
                      {skill.max_session_level > 0 && ` | Session Lv ${skill.max_session_level}`}
                    </div>
                    {locked && firstUnmetPrereq && (
                      <div className="upgrade-prereq-hint">
                        {firstUnmetPrereq.hint || `Requires: ${firstUnmetPrereq.type} ≥ ${firstUnmetPrereq.required}`}
                      </div>
                    )}
                    {skill.at_level_0 && (
                      <div className="upgrade-prereq-hint">
                        XP: {skill.idle_xp}/{skill.level_0_xp_requirement} to unlock
                      </div>
                    )}
                  </div>
                </div>

                <div className="upgrade-row-right">
                  {locked ? (
                    <div className="upgrade-locked-badge">LOCKED</div>
                  ) : (
                    <div className="upgrade-ready-badge">READY</div>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default UpgradeMenu;
