/**
 * SkillsHotbar — Active combat skills: 9 universal + class-exclusive row.
 *
 * Row 1: 9 universal skills (Clickstorm, Powersurge, etc.) — gated by Magic level
 * Row 2: Class-exclusive skills (Threshold Slip, Energy Shields, etc.) — gated by prerequisites
 *
 * Skill states: locked → ready → active (cooldown) → ready
 * GCD (global cooldown): 1s after any skill activation.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '../../GameContext';
import type { StorySession } from '../../GameContext';
import type { SkillTreeEntry } from './StoryModeDashboard';
import { api } from '../../../api';
import { formatGold, upgradeCost } from '../../utils/numbers';
import './SkillsHotbar.css';

interface SkillDef {
  id: number;
  name: string;
  shortLabel: string;
  description: string;
  baseCooldownSeconds: number;
  baseCostGold: number;
  benefits: Record<string, number>;
  cooldownType: 'individual' | 'global';
}

// Hotbar skill definitions (mirrors DB seeds from migration 015)
const HOTBAR_SKILLS: SkillDef[] = [
  { id: 1001, name: 'Clickstorm',    shortLabel: 'CS',   description: 'Auto 10 CPS for 30s',        baseCooldownSeconds: 45, baseCostGold: 50,  benefits: { click_storm_cps: 10, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1002, name: 'Powersurge',    shortLabel: 'PS',   description: '+100% DPS for 30s',          baseCooldownSeconds: 45, baseCostGold: 75,  benefits: { auto_dps_bonus: 1.0, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1003, name: 'Lucky Strikes', shortLabel: 'LS',   description: '+50% Crit for 30s',          baseCooldownSeconds: 45, baseCostGold: 100, benefits: { crit_chance_bonus: 0.5, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1004, name: 'Metal Detect',  shortLabel: 'MD',   description: '+100% Gold for 30s',         baseCooldownSeconds: 45, baseCostGold: 60,  benefits: { gold_drop_bonus: 1.0, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1005, name: 'Golden Clicks', shortLabel: 'GC',   description: '5% monster gold/click, 30s', baseCooldownSeconds: 60, baseCostGold: 80,  benefits: { golden_click_pct: 0.05, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1006, name: 'Dark Ritual',   shortLabel: 'DR',   description: '+1.05× perm DPS (chapter)',  baseCooldownSeconds: 90, baseCostGold: 500, benefits: { dark_ritual_multiplier: 1.05, duration_seconds: -1 }, cooldownType: 'individual' },
  { id: 1007, name: 'Super Clicks',  shortLabel: 'SC',   description: '+200% Click Dmg for 30s',    baseCooldownSeconds: 45, baseCostGold: 120, benefits: { click_damage_bonus: 2.0, duration_seconds: 30 }, cooldownType: 'individual' },
  { id: 1008, name: 'Energize',      shortLabel: 'EN',   description: 'META: Next skill used has 2x base effect. Does not stack with itself.',      baseCooldownSeconds: 60, baseCostGold: 150, benefits: { energize_multiplier: 2.0, duration_seconds: -1 }, cooldownType: 'global' },
  { id: 1009, name: 'Reload',        shortLabel: 'RL',   description: 'META: Reduces remaining cooldown of the previously used skill by 50%.',      baseCooldownSeconds: 30, baseCostGold: 100, benefits: { reload_pct: 0.5, duration_seconds: -1 }, cooldownType: 'global' },
];

interface SkillState {
  level: number;
  unlocked: boolean;
  cdEndsAt: number;    // epoch ms
  buffEndsAt: number;  // epoch ms
}

interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  classSkills?: SkillTreeEntry[];
}

const SkillsHotbar: React.FC<Props> = ({ session, gameConfigs, classSkills = [] }) => {
  const { updateStorySession, addBuff, removeBuff, playSFX } = useGame();

  // Driven by gameConfigs
  const GCD_MS = Number(gameConfigs['gcd_ms'] ?? 1000);
  const COST_SCALING = Number(gameConfigs['upgrade_cost_scaling'] ?? 1.07);
  const CD_REDUCTION_PER_LEVEL = Number(gameConfigs['cd_reduction_per_level'] ?? 0.05);
  const MAX_CD_REDUCTION = Number(gameConfigs['max_cd_reduction'] ?? 0.7);
  const BASE_UNLOCK_COST = Number(gameConfigs['base_skill_unlock_cost'] ?? 50.0);

  // Magic gates as per 2.3 spec §7
  const MAGIC_GATES: Record<string, number> = {
    'Clickstorm': 5, 'Powersurge': 10, 'Lucky Strikes': 18,
    'Metal Detect': 25, 'Golden Clicks': 35, 'Super Clicks': 45,
    'Energize': 58, 'Reload': 72, 'Dark Ritual': 87
  };

  const [skillStates, setSkillStates] = useState<Record<number, SkillState>>(() =>
    Object.fromEntries(HOTBAR_SKILLS.map(s => [s.id, { level: 0, unlocked: false, cdEndsAt: 0, buffEndsAt: 0 }]))
  );

  // Class skill states (keyed by skill_id from skill tree)
  const [classSkillStates, setClassSkillStates] = useState<Record<number, SkillState>>({});

  // Initialize class skill states when classSkills change
  useEffect(() => {
    if (classSkills.length === 0) return;
    setClassSkillStates(prev => {
      const next = { ...prev };
      for (const cs of classSkills) {
        if (!(cs.skill_id in next)) {
          next[cs.skill_id] = {
            level: cs.idle_level,
            unlocked: cs.prerequisites_met && !cs.at_level_0,
            cdEndsAt: 0,
            buffEndsAt: 0,
          };
        }
      }
      return next;
    });
  }, [classSkills]);

  const [gcdEndsAt, setGcdEndsAt] = useState(0);
  const [energizeActive, setEnergizeActive] = useState(false);
  const [lastUsedId, setLastUsedId] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick to update cooldown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const getEffectiveCd = (skill: SkillDef, level: number): number => {
    const reduction = Math.min(MAX_CD_REDUCTION, level * CD_REDUCTION_PER_LEVEL);
    return skill.baseCooldownSeconds * (1 - reduction) * 1000;
  };

  const getUnlockCost = (skill: SkillDef): number =>
    Math.ceil(upgradeCost(BASE_UNLOCK_COST + skill.baseCostGold, 0, 1, COST_SCALING));

  // ── Unlock skill (purchase with gold) ──────────────────────────────────
  const handleUnlock = useCallback(async (skill: SkillDef) => {
    const magicLvl = session.idle_bonuses?.magic_lvl ?? 1;
    const requiredMagic = MAGIC_GATES[skill.name];
    if (requiredMagic && magicLvl < requiredMagic) return;

    const cost = getUnlockCost(skill);
    if (session.sessionGold < cost) return;

    try {
      const res = await api.post(`/api/game/story/session/${session.sessionId}/upgrade`, {
        upgrade_type: 'skill_unlock',
        target_id: skill.id,
        quantity: 1,
      });
      if (!res.ok) return;
      updateStorySession({ sessionGold: session.sessionGold - cost });
      setSkillStates(prev => ({
        ...prev,
        [skill.id]: { ...prev[skill.id], unlocked: true, level: 1 },
      }));
    } catch { /* non-fatal */ }
  }, [session, updateStorySession, COST_SCALING, BASE_UNLOCK_COST]);

  // ── Activate skill ─────────────────────────────────────────────────────
  const handleActivate = useCallback(async (skill: SkillDef) => {
    const state = skillStates[skill.id];
    if (!state.unlocked || now < state.cdEndsAt || now < gcdEndsAt) return;

    try {
      const res = await api.post(`/api/game/story/session/${session.sessionId}/skill`, {
        skill_id: skill.id,
        energized: energizeActive,
      });

      if (res.ok) {
        playSFX('sfx_skill_activate', { pan: -0.5 });
        const data = await res.json();
        const duration = (skill.benefits.duration_seconds || 30) * 1000;
        const cdMs = getEffectiveCd(skill, state.level);

        setSkillStates(prev => ({
          ...prev,
          [skill.id]: { ...prev[skill.id], cdEndsAt: now + cdMs, buffEndsAt: now + duration },
        }));

        setGcdEndsAt(now + GCD_MS);

        // Meta logic
        if (skill.id === 1008) { // Energize
          setEnergizeActive(true);
        } else if (skill.id === 1009 && lastUsedId) { // Reload
          const lastCd = skillStates[lastUsedId].cdEndsAt;
          const remaining = Math.max(0, lastCd - now);
          setSkillStates(prev => ({
            ...prev,
            [lastUsedId]: { ...prev[lastUsedId], cdEndsAt: now + (remaining * 0.5) },
          }));
          setEnergizeActive(false);
        } else {
          setEnergizeActive(false);
        }

        setLastUsedId(skill.id);

        // Add client-side buff visual
        if (duration > 0) {
          addBuff({
            id: skill.id.toString(),
            label: skill.name,
            multiplier: (skill.benefits.auto_dps_bonus || 0) + 1,
            endsAt: now + duration,
          });
        }

        // Dark Ritual: update aggregate DR in session state
        if (data.dark_ritual_multiplier) {
          updateStorySession({ darkRitualMultiplier: data.dark_ritual_multiplier });
        }
      }
    } catch { /* non-fatal */ }
  }, [skillStates, now, gcdEndsAt, session, energizeActive, lastUsedId, addBuff, updateStorySession, GCD_MS]);

  // ── Activate class skill ───────────────────────────────────────────────
  const handleActivateClassSkill = useCallback(async (cs: SkillTreeEntry) => {
    const state = classSkillStates[cs.skill_id];
    if (!state?.unlocked || now < (state?.cdEndsAt || 0) || now < gcdEndsAt) return;

    try {
      const res = await api.post(`/api/game/story/session/${session.sessionId}/skill`, {
        skill_id: cs.skill_id,
        energized: energizeActive,
      });

      if (res.ok) {
        playSFX('sfx_skill_activate', { pan: -0.5 });
        const baseCd = 45; // Default class skill cooldown
        const cdMs = baseCd * (1 - Math.min(MAX_CD_REDUCTION, (state?.level || 0) * CD_REDUCTION_PER_LEVEL)) * 1000;

        setClassSkillStates(prev => ({
          ...prev,
          [cs.skill_id]: { ...prev[cs.skill_id], cdEndsAt: now + cdMs, buffEndsAt: now + 30000 },
        }));

        setGcdEndsAt(now + GCD_MS);
        setEnergizeActive(false);
        setLastUsedId(cs.skill_id);

        addBuff({
          id: cs.skill_id.toString(),
          label: cs.display_name,
          multiplier: 1,
          endsAt: now + 30000,
        });
      }
    } catch { /* non-fatal */ }
  }, [classSkillStates, now, gcdEndsAt, session, energizeActive, addBuff, GCD_MS, MAX_CD_REDUCTION, CD_REDUCTION_PER_LEVEL]);

  return (
    <div className="skills-hotbar-container">
      {/* Row 1: Universal skills */}
      <div className="skills-hotbar">
        {HOTBAR_SKILLS.map(skill => {
          const state = skillStates[skill.id];
          const onCd = now < state.cdEndsAt;
          const onGcd = now < gcdEndsAt;
          const cdProgress = onCd ? Math.max(0, (state.cdEndsAt - now) / getEffectiveCd(skill, state.level)) : 0;
          const buffProgress = now < state.buffEndsAt ? Math.max(0, (state.buffEndsAt - now) / ((skill.benefits.duration_seconds || 1) * 1000)) : 0;

          const magicLvl = session.idle_bonuses?.magic_lvl ?? 1;
          const requiredMagic = MAGIC_GATES[skill.name];
          const isMagicLocked = !state.unlocked && requiredMagic && magicLvl < requiredMagic;

          return (
            <div
              key={skill.id}
              className={`skill-slot ${state.unlocked ? '' : 'skill-slot--locked'} ${isMagicLocked ? 'skill-slot--hard-locked' : ''} ${onCd ? 'skill-slot--active' : ''} ${onGcd && state.unlocked && !onCd ? 'skill-slot--gcd' : ''}`}
              onClick={() => state.unlocked ? handleActivate(skill) : handleUnlock(skill)}
              title={state.unlocked ? `${skill.name}: ${skill.description}` : isMagicLocked ? `Requires Magic Level ${requiredMagic}` : `Unlock: ${getUnlockCost(skill)} gold`}
            >
              <span className="skill-short">{skill.shortLabel}</span>
              <span className="skill-name">{skill.name}</span>

              {isMagicLocked && (
                <span className="skill-gate-label">MAG {requiredMagic}</span>
              )}

              {state.unlocked && onCd && (
                <div className="skill-cd-overlay" style={{ height: `${cdProgress * 100}%` }} />
              )}
              {state.unlocked && onCd && (
                <span className="skill-cd-label">{((state.cdEndsAt - now) / 1000).toFixed(1)}s</span>
              )}

              {!state.unlocked && (
                <span className="skill-cost">{getUnlockCost(skill)}</span>
              )}

              {state.unlocked && buffProgress > 0 && (
                <div className="skill-buff-bar" style={{ width: `${buffProgress * 100}%` }} />
              )}

              {/* Energize pip */}
              {energizeActive && skill.id !== 1008 && state.unlocked && (
                <span className="skill-energize-pip">2×</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: Class-exclusive skills */}
      {classSkills.length > 0 && (
        <div className="skills-hotbar skills-hotbar--class">
          {classSkills.map(cs => {
            const state = classSkillStates[cs.skill_id];
            const isLocked = !cs.prerequisites_met || cs.at_level_0;
            const onCd = state ? now < state.cdEndsAt : false;
            const onGcd = now < gcdEndsAt;
            const cdProgress = onCd && state ? Math.max(0, (state.cdEndsAt - now) / 45000) : 0;
            const firstUnmetPrereq = cs.prerequisites.find(p => !p.met);

            return (
              <div
                key={cs.skill_id}
                className={`skill-slot skill-slot--class ${isLocked ? 'skill-slot--locked skill-slot--hard-locked' : ''} ${onCd ? 'skill-slot--active' : ''} ${onGcd && !isLocked && !onCd ? 'skill-slot--gcd' : ''}`}
                onClick={() => !isLocked && handleActivateClassSkill(cs)}
                title={isLocked
                  ? (firstUnmetPrereq?.hint || `Prerequisites not met`)
                  : `${cs.display_name}: ${cs.description || cs.effect_type || ''}`}
              >
                <span className="skill-short">{cs.name.slice(0, 2).toUpperCase()}</span>
                <span className="skill-name">{cs.display_name}</span>

                {isLocked && firstUnmetPrereq && (
                  <span className="skill-gate-label skill-gate-label--prereq">
                    {firstUnmetPrereq.hint
                      ? firstUnmetPrereq.hint.slice(0, 12)
                      : `${firstUnmetPrereq.type.slice(0, 4).toUpperCase()} ${firstUnmetPrereq.required}`}
                  </span>
                )}

                {!isLocked && onCd && state && (
                  <div className="skill-cd-overlay" style={{ height: `${cdProgress * 100}%` }} />
                )}
                {!isLocked && onCd && state && (
                  <span className="skill-cd-label">{((state.cdEndsAt - now) / 1000).toFixed(1)}s</span>
                )}

                {isLocked && (
                  <span className="skill-cost skill-cost--locked">LOCKED</span>
                )}

                {/* Energize pip */}
                {energizeActive && !isLocked && (
                  <span className="skill-energize-pip">2×</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SkillsHotbar;
