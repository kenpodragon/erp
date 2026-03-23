import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { api } from '../../api';
import MusicManager from './story/MusicManager';
import EntityRenderer from './shared/EntityRenderer';
import type { EnemyVisualData } from './shared/EntityRenderer';
import PaperDollRenderer from './shared/PaperDollRenderer';
import type { CharacterVisualData } from './shared/PaperDollRenderer';
import './ActiveTrainingSimulator.css';

extend({ Container, Graphics, Text });

interface SkillStatus {
  skill_id: number;
  skill_name: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  active_action: {
    id: number;
    name: string;
    display_name: string;
    interval_ms: number;
    xp_per_action: number;
  } | null;
  affinity_multiplier: number;
}

interface Props {
  skill: SkillStatus;
  effectiveBaseXp: number;
  potentialBaseXp: number;
  onExit: (xpEarned: number) => void;
}

// Skill-based enemy visual templates for training constructs
const SKILL_ENEMY_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Attack':    { primary: '#4a2a2a', secondary: '#cc4444' },
  'Magic':     { primary: '#2a2a4a', secondary: '#8844cc' },
  'Lore':      { primary: '#2a3a2a', secondary: '#44cc88' },
  'Precision': { primary: '#3a3a2a', secondary: '#cccc44' },
};

function makeTrainingEntityVisual(skillName: string, wave: number, mob: number, isBoss: boolean): EnemyVisualData {
  const colors = SKILL_ENEMY_COLORS[skillName] ?? SKILL_ENEMY_COLORS['Attack'];
  return {
    entity_id: wave * 100 + mob,
    name: isBoss ? 'ZONE GUARDIAN' : 'TRAINING CONSTRUCT',
    sprite_key: null,
    base_hp: 100,
    base_gold: 0,
    color_primary: colors.primary,
    color_secondary: colors.secondary,
    movement: { name: 'hover', y_offset_min: -5, y_offset_max: 5, bob_amplitude: isBoss ? 4 : 2, bob_frequency: 1, speed_multiplier: 0, trail_effect: null },
    size: { name: isBoss ? 'large' : 'medium', scale_min: isBoss ? 1.6 : 0.9, scale_max: isBoss ? 1.8 : 1.1, width_base: 36, height_base: 55, hitbox_radius: isBoss ? 40 : 22, hp_bar_width: isBoss ? 120 : 80 },
    animation: { name: 'construct', idle_scale_x: 0.03, idle_scale_y: 0.03, idle_cycle_ms: 1200, idle_translate_x: 0, idle_translate_y: 0, attack_recoil: 4, death_style: isBoss ? 'explode' : 'fade', death_duration_ms: 600, death_particle_count: isBoss ? 16 : 10 },
    silhouette: { name: 'construct', body_shape: isBoss ? 'biped' : 'rect', body_ratio_w: 1, body_ratio_h: 1, corner_radius: 4, has_limbs: isBoss, limb_count: isBoss ? 2 : 0, has_head: true, has_wings: false, has_weapon_slot: false, has_eye_glow: true, sub_unit_count: 1 },
    primary_attack: null, secondary_attack: null, tertiary_attack: null,
  };
}

// Default character visual for training
const DEFAULT_TRAINING_CHARACTER: CharacterVisualData = {
  character_id: 0,
  level: 1,
  aura_tier: null,
  equipped_layers: [],
  unequipped_layers: [],
};

const SIM_CANVAS_WIDTH = 320;
const SIM_CANVAS_HEIGHT = 200;

const ActiveTrainingSimulator: React.FC<Props> = ({ skill, effectiveBaseXp, potentialBaseXp, onExit }) => {
  const [enemyHp, setEnemyHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [wave, setWave] = useState(1);
  const [mobsInWave, setMobsInWave] = useState(1); // 1-10 are mobs, 11 is boss
  const [totalXp, setTotalXp] = useState(0);
  const [logs, setLogs] = useState<string[]>(["SIMULATOR INITIALIZED.", `TARGET SKILL: ${skill.skill_name}`, `STABILITY RATE: ${(effectiveBaseXp / potentialBaseXp * 100).toFixed(0)}%`]);
  const [popups, setXpPopups] = useState<{ id: number, x: number, y: number, val: number }[]>([]);
  const [isBoss, setIsBoss] = useState(false);
  const [characterVisual, setCharacterVisual] = useState<CharacterVisualData>(DEFAULT_TRAINING_CHARACTER);

  const lastClickRef = useRef(0);

  // Fetch character visual data
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/game/character/visuals');
        if (res.ok) {
          setCharacterVisual(await res.json());
        }
      } catch { /* use default */ }
    })();
  }, []);

  const spawnEnemy = useCallback((w: number, m: number) => {
    const isB = m > 10;
    setIsBoss(isB);

    // HP scaling matches story mode formula:
    //   level_scale = 1.012^(skillLevel - 1)  — same as scene_hp_scaling_base
    //   wave_scale  = 1.08^(wave - 1)         — progression within session
    //   boss multiplier = 8x
    const baseHp = 100;
    const levelScale = Math.pow(1.012, skill.level - 1);
    const waveScale = Math.pow(1.08, w - 1);
    const hp = Math.floor(baseHp * levelScale * waveScale * (isB ? 8 : 1));
    setEnemyHp(hp);
    setMaxHp(hp);
    
    if (isB) {
      addLog(`WARNING: WAVE ${w} GUARDIAN DETECTED!`);
    } else {
      addLog(`WAVE ${w} [${m}/10]: TARGET ACQUIRED.`);
    }
  }, []);

  useEffect(() => {
    spawnEnemy(1, 1);
  }, [spawnEnemy]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 20));
  };

  const handleEnemyClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickRef.current < 100) return; // throttle
    lastClickRef.current = now;

    const dmg = 25; // player damage
    setEnemyHp(prev => {
      const next = prev - dmg;
      if (next <= 0) {
        // Kill
        const actualXp = isBoss ? effectiveBaseXp * wave * 5 : effectiveBaseXp * wave;
        const possibleXp = isBoss ? potentialBaseXp * wave * 5 : potentialBaseXp * wave;
        
        setTotalXp(x => x + actualXp);
        setXpPopups(p => [...p, { id: now, x: e.clientX, y: e.clientY, val: Number(actualXp.toFixed(1)) }]);
        setTimeout(() => setXpPopups(p => p.filter(item => item.id !== now)), 1000);
        
        addLog(`WAVE ${wave} (${isBoss ? 'BOSS' : `${mobsInWave}/10`}) Target Killed +${actualXp.toFixed(1)} XP (+${possibleXp.toFixed(1)} possible due to essence stability)`);

        let nextWave = wave;
        let nextMob = mobsInWave + 1;
        
        if (nextMob > 11) {
          nextMob = 1;
          nextWave += 1;
          addLog(`ZONE ${wave} CLEARED. ADVANCING TO WAVE ${nextWave}.`);
        }
        
        setWave(nextWave);
        setMobsInWave(nextMob);
        spawnEnemy(nextWave, nextMob);
        return 0;
      }
      return next;
    });
  };

  const enemyVisual = makeTrainingEntityVisual(skill.skill_name, wave, mobsInWave, isBoss);

  return (
    <div className="training-simulator-overlay">
      <MusicManager musicState="combat" sceneId={null} archetype="training_grounds" />
      <div className="scanline" />

      <div className="simulator-header">
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ACTIVE_TRAINING_SIMULATOR_v1.1</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SKILL: {skill.skill_name}</div>
          <div style={{ fontSize: '0.8rem', color: '#00ff41' }}>CALIBRATING: {skill.active_action?.display_name}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>TOTAL XP ACCRUED</div>
          <div style={{ fontSize: '1.5rem', color: '#ffff00' }}>+{totalXp.toLocaleString()} XP</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>WAVE {wave} [{isBoss ? 'BOSS' : `${mobsInWave}/10`}]</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>UNIT XP: {effectiveBaseXp * wave}{isBoss ? ' (x5 BOSS)' : ''}</div>
        </div>
      </div>

      <div className="simulator-main">
        <div className="combat-area" onClick={handleEnemyClick}>
          <div className="sim-stats">
            <div>SESSION_TIME: {new Date().toLocaleTimeString()}</div>
            <div>STABILITY_ADJUSTED_BASE: {effectiveBaseXp}</div>
          </div>

          {isBoss && <div className="boss-warning">BOSS WAVE</div>}

          {/* PixiJS canvas with EntityRenderer + PaperDollRenderer */}
          <div className="enemy-container">
            <Application
              width={SIM_CANVAS_WIDTH}
              height={SIM_CANVAS_HEIGHT}
              background={0x0a0a0f}
              antialias
            >
              {/* Player character on the left */}
              <PaperDollRenderer
                character={characterVisual}
                x={80}
                y={SIM_CANVAS_HEIGHT - 30}
                state="fighting"
                facingRight={true}
                scale={1.2}
              />
              {/* Enemy on the right */}
              <EntityRenderer
                entity={enemyVisual}
                x={SIM_CANVAS_WIDTH - 100}
                y={SIM_CANVAS_HEIGHT - 30}
                state={enemyHp <= 0 ? 'dying' : 'idle'}
                hp={enemyHp}
                maxHp={maxHp}
                showHpBar={true}
                showName={true}
              />
            </Application>
          </div>

          <div style={{ marginTop: '10px', fontSize: '0.8rem', textAlign: 'center' }}>
            {isBoss ? 'ZONE GUARDIAN' : 'TRAINING CONSTRUCT'} [HP: {Math.max(0, enemyHp)}/{maxHp}]
          </div>

          {popups.map(p => (
            <div key={p.id} className="xp-popup" style={{ left: p.x, top: p.y }}>
              +{p.val} XP
            </div>
          ))}
        </div>

        <div className="log-area">
          {logs.map((log, i) => (
            <div key={i} style={{ opacity: 1 - (i * 0.05), marginBottom: '4px' }}>
              {`> ${log}`}
            </div>
          ))}
        </div>
      </div>

      <div className="sim-exit-container">
        <button className="sim-exit-btn" onClick={() => onExit(totalXp)}>
          TERMINATE SIMULATION & SYNC XP
        </button>
        <div style={{ fontSize: '0.7rem', marginTop: '10px', opacity: 0.6 }}>
          ALL ACCRUED XP WILL BE APPLIED TO YOUR CHARACTER ONCE SYNCED.
        </div>
      </div>
    </div>
  );
};

export default ActiveTrainingSimulator;
