/**
 * BossStage — Boss interstitial combat engine.
 *
 * Replaces CombatStage for chapter_boss / book_boss scenes.
 * Features:
 *  - Single large boss entity with high HP (hp_multiplier × zone baseline)
 *  - Countdown timer (replenished on successful interrupts)
 *  - Three random interrupt challenge types (one at a time):
 *      click_burst   — fill a progress bar by clicking fast
 *      target_zone   — click a glowing circle appearing at random position
 *      whack_sequence — click 3 sequential pop-up zones before they disappear
 *  - Auto-DPS tick (same logic as CombatStage)
 *  - No upgrade menu / no wave system
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { StorySession, BossConfig } from '../../GameContext';
import { zoneHp, formatNumber } from '../../utils/numbers';
import { useAssets } from '../../providers/AssetProvider';
import { assetRenderer } from '../../renderers/AssetRenderer';
import EntityRenderer from '../shared/EntityRenderer';
import type { EnemyVisualData } from '../shared/EntityRenderer';
import AttackRenderer from '../shared/AttackRenderer';
import type { AttackVisualData } from '../shared/AttackRenderer';
import './BossStage.css';

extend({ Container, Graphics, Text });

const AUTO_DPS_TICK_MS = 500;
const CANVAS_WIDTH  = 600;
const CANVAS_HEIGHT = 380;

// Boss entity centered on canvas
const BOSS_X = CANVAS_WIDTH / 2;
const BOSS_Y = CANVAS_HEIGHT / 2 - 20;
const BOSS_RADIUS = 60;
const CLICK_HITBOX = BOSS_RADIUS + 20;

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  alpha: number;
  vy: number;
  isCrit: boolean;
}

type InterruptType = 'click_burst' | 'target_zone' | 'whack_sequence';

interface TargetZone {
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

interface ActiveInterrupt {
  type: InterruptType;
  timeLeft: number;    // countdown in seconds
  progress: number;    // 0–100 for click_burst
  targetZone?: TargetZone;
  whackZones?: TargetZone[];
  whackIndex: number;  // which whack zone is currently active
}

interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  onEnemyClick: () => void;
  onGoldEarned: (amount: number) => void;
  onBossDefeated: (success: boolean) => void;
  textScale?: number;
  debugSuperClick?: boolean;
  playSFX?: (key: string, opts?: { pan?: number }) => void;
  reduceMotion?: boolean;
}

// ── Default boss visual data (fallback when no visual data from server) ──────
const DEFAULT_BOSS_VISUAL: EnemyVisualData = {
  entity_id: 0,
  name: 'Guardian',
  sprite_key: null,
  base_hp: 1000,
  base_gold: 0,
  color_primary: '#1a0000',
  color_secondary: '#cc0000',
  movement: {
    name: 'stationary',
    y_offset_min: 0,
    y_offset_max: 0,
    bob_amplitude: 3,
    bob_frequency: 0.5,
    speed_multiplier: 0,
    trail_effect: null,
  },
  size: {
    name: 'huge',
    scale_min: 2.2,
    scale_max: 2.4,
    width_base: 50,
    height_base: 70,
    hitbox_radius: 60,
    hp_bar_width: 200,
  },
  animation: {
    name: 'boss_idle',
    idle_scale_x: 0.02,
    idle_scale_y: 0.02,
    idle_cycle_ms: 1800,
    idle_translate_x: 0,
    idle_translate_y: 0,
    attack_recoil: 6,
    death_style: 'explode',
    death_duration_ms: 1000,
    death_particle_count: 20,
  },
  silhouette: {
    name: 'boss_biped',
    body_shape: 'biped',
    body_ratio_w: 1.2,
    body_ratio_h: 1.3,
    corner_radius: 6,
    has_limbs: true,
    limb_count: 2,
    has_head: true,
    has_wings: false,
    has_weapon_slot: true,
    has_eye_glow: true,
    sub_unit_count: 1,
  },
  primary_attack: {
    name: 'boss_slam',
    attack_animation_type: 'aoe_burst',
    projectile_color: '#cc0000',
    cooldown_ms: 3000,
    projectile_speed: 4,
    impact_effect: 'shatter',
    attack_range: 80,
    arc_angle: 120,
    trail_type: null,
    screen_shake: true,
  },
  secondary_attack: {
    name: 'boss_bolt',
    attack_animation_type: 'elemental_projectile',
    projectile_color: '#ff4400',
    cooldown_ms: 2000,
    projectile_speed: 6,
    impact_effect: 'splash',
    attack_range: 200,
    arc_angle: 90,
    trail_type: 'glow',
    screen_shake: false,
  },
  tertiary_attack: {
    name: 'boss_sweep',
    attack_animation_type: 'melee_swing',
    projectile_color: '#880000',
    cooldown_ms: 4000,
    projectile_speed: 0,
    impact_effect: 'flash',
    attack_range: 70,
    arc_angle: 140,
    trail_type: null,
    screen_shake: true,
  },
};

// ── Inner PixiJS component ──────────────────────────────────────────────────
interface InnerProps {
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  bossVisual: EnemyVisualData;
  damageNumbers: DamageNumber[];
  shake: number;
  textScale: number;
  width: number;
  height: number;
  activeAttack: AttackVisualData | null;
  attackActive: boolean;
  onAttackComplete: () => void;
}

const BossContent: React.FC<InnerProps> = ({
  bossHp, bossMaxHp, bossName, bossVisual, damageNumbers, shake, textScale,
  width, height, activeAttack, attackActive, onAttackComplete,
}) => {
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 6 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 4 : 0;

  useTick(() => { /* trigger re-render each frame for shake */ });

  // Boss glow ring (drawn behind EntityRenderer)
  const drawBossGlow = useCallback((g: any) => {
    g.clear();
    const glowRadius = (bossVisual.size?.hitbox_radius ?? BOSS_RADIUS) + 10;
    g.circle(BOSS_X, BOSS_Y, glowRadius);
    g.fill({ color: 0x550000, alpha: 0.3 });
    g.circle(BOSS_X, BOSS_Y, glowRadius + 5);
    g.fill({ color: 0x330000, alpha: 0.15 });
  }, [bossVisual.size?.hitbox_radius]);

  const bossState = bossHp <= 0 ? 'dying' as const : 'idle' as const;

  return (
    <pixiContainer x={shakeX} y={shakeY}>
      {/* Boss glow effect behind entity */}
      <pixiGraphics draw={drawBossGlow} />

      {/* Boss entity via shared EntityRenderer */}
      <EntityRenderer
        entity={bossVisual}
        x={BOSS_X}
        y={BOSS_Y + (bossVisual.size?.height_base ?? 70) * (bossVisual.size?.scale_min ?? 2.2) * (bossVisual.silhouette?.body_ratio_h ?? 1.3) / 2}
        state={bossState}
        hp={bossHp}
        maxHp={bossMaxHp}
        showHpBar={true}
        showName={false}
      />

      {/* Boss attack animation */}
      {activeAttack && (
        <AttackRenderer
          attack={activeAttack}
          sourceX={BOSS_X}
          sourceY={BOSS_Y}
          targetX={BOSS_X + (Math.random() - 0.5) * 100}
          targetY={BOSS_Y + 80}
          active={attackActive}
          onComplete={onAttackComplete}
        />
      )}

      {/* "BOSS" label */}
      <pixiText
        text={`☠ ${bossName.toUpperCase()}`}
        style={new TextStyle({ fill: '#ff4444', fontSize: 14 * textScale, fontWeight: 'bold', fontFamily: 'monospace' })}
        x={BOSS_X}
        y={BOSS_Y + BOSS_RADIUS + 12}
        anchor={0.5}
      />

      {/* Floating damage numbers */}
      {damageNumbers.map(dn => (
        <pixiText
          key={dn.id}
          text={dn.value}
          style={new TextStyle({
            fill: dn.isCrit ? '#ffff00' : '#ff8888',
            fontSize: (dn.isCrit ? 18 : 13) * textScale,
            fontWeight: 'bold',
            fontFamily: 'monospace',
          })}
          x={dn.x}
          y={dn.y}
          alpha={dn.alpha}
          anchor={0.5}
        />
      ))}
    </pixiContainer>
  );
};

// ── Main BossStage component ────────────────────────────────────────────────
const BossStage: React.FC<Props> = ({
  session, gameConfigs, onEnemyClick, onGoldEarned, onBossDefeated,
  textScale = 1.0, debugSuperClick = false, playSFX, reduceMotion = false,
}) => {
  const { bossName = 'Guardian' } = session;

  // 5.7.3: Preload boss sprite asset definition if available
  let assets: ReturnType<typeof useAssets> | null = null;
  try { assets = useAssets(); } catch { /* AssetProvider not mounted — skip */ }

  useEffect(() => {
    if (!assets) return;
    // Boss sprite key could come from session data; preload if present
    const bossKey = (session as any).bossSpriteKey;
    if (bossKey) {
      assets.preloadBatch([bossKey]);
    }
  }, [(session as any).bossSpriteKey, assets]);
  const cfg: BossConfig = session.bossConfig ?? {
    timer_seconds: 120,
    hp_multiplier: 8,
    interrupt_interval_min: 1200, // now in MS
    interrupt_interval_max: 3000, // now in MS
    interrupt_window_seconds: 2,
    interrupt_refill_seconds: 3,
    interrupt_clicks_required: 20,
  };

  const CRIT_CHANCE = Number(gameConfigs['crit_chance'] ?? 0.02);
  const CRIT_MULT   = Number(gameConfigs['crit_multiplier'] ?? 2.0);

  // Boss HP: prefer server-computed value (uses DB entity data + scene_hp formula),
  // fall back to legacy zoneHp() if backend hasn't been updated yet
  const HP_SCALING  = Number(gameConfigs['hp_scaling_factor'] ?? 1.55);
  const baseHp = (session as any).bossBaseHp
    ?? zoneHp(session.currentZone || 1, HP_SCALING) * cfg.hp_multiplier;

  const [bossHp, setBossHp]     = useState(baseHp);
  const [bossMaxHp]             = useState(baseHp);
  const [timerLeft, setTimerLeft]   = useState(cfg.timer_seconds);
  const [damageNums, setDamageNums] = useState<DamageNumber[]>([]);
  const [shake, setShake]           = useState(0);
  const [interrupt, setInterrupt]   = useState<ActiveInterrupt | null>(null);
  const [interruptSuccess, setInterruptSuccess] = useState<boolean | null>(null);

  // Boss visual data (from session or fallback)
  const bossVisual: EnemyVisualData = (session as any).bossVisualData ?? {
    ...DEFAULT_BOSS_VISUAL,
    name: bossName,
  };

  // Attack cycling: primary → secondary → tertiary
  const attackTypes = [
    bossVisual.primary_attack,
    bossVisual.secondary_attack as AttackVisualData | null,
    bossVisual.tertiary_attack as AttackVisualData | null,
  ].filter(Boolean) as AttackVisualData[];

  const [attackIndex, setAttackIndex] = useState(0);
  const [attackActive, setAttackActive] = useState(false);
  const [activeAttack, setActiveAttack] = useState<AttackVisualData | null>(null);
  const attackCooldownRef = useRef(attackTypes[0]?.cooldown_ms ?? 3000);

  const handleAttackComplete = useCallback(() => {
    setAttackActive(false);
    setActiveAttack(null);
    // Cycle to next attack type
    setAttackIndex(prev => {
      const next = (prev + 1) % attackTypes.length;
      attackCooldownRef.current = attackTypes[next]?.cooldown_ms ?? 3000;
      return next;
    });
  }, [attackTypes]);

  const bossHpRef         = useRef(baseHp);
  const timerRef          = useRef(cfg.timer_seconds);
  const defeatedRef        = useRef(false);
  const nextInterruptRef  = useRef(
    cfg.interrupt_interval_min * 0.8 +
    Math.random() * (cfg.interrupt_interval_max - cfg.interrupt_interval_min) * 0.8
  );
  const interruptActiveRef = useRef(false);
  const interruptRef       = useRef<ActiveInterrupt | null>(null);
  const msAccumulator      = useRef(0);

  // Offset for Y coordinates because of the timer bar at the top
  const CANVAS_OFFSET_Y = 40;

  // Sync refs
  useEffect(() => { interruptRef.current = interrupt; }, [interrupt]);

  // ── Click damage calculation ─────────────────────────────────────────────
  const calcClickDmg = useCallback(() => {
    const base = (session.characterStrength ?? 10) + (session.clickUpgradeLevel ?? 0);
    const multipliers = (session.clickDmgMultiplier ?? 1) * (session.darkRitualMultiplier ?? 1);
    const isCrit = Math.random() < CRIT_CHANCE;
    const dmg = (isCrit ? base * CRIT_MULT : base) * multipliers;
    return { dmg, isCrit };
  }, [session.characterStrength, session.clickUpgradeLevel, session.clickDmgMultiplier, session.darkRitualMultiplier, CRIT_CHANCE, CRIT_MULT]);

  // ── Apply damage to boss ─────────────────────────────────────────────────
  const dealDamage = useCallback((dmg: number, isCrit: boolean, ox: number, oy: number) => {
    if (defeatedRef.current) return;
    const newHp = Math.max(0, bossHpRef.current - dmg);
    bossHpRef.current = newHp;
    setBossHp(newHp);

    // Floating damage number (suppressed when reduceMotion)
    if (!reduceMotion) {
      const id = `${Date.now()}-${Math.random()}`;
      setDamageNums(prev => [...prev.slice(-15), {
        id, x: ox + (Math.random() - 0.5) * 40, y: oy - 20,
        value: isCrit ? `⚡${formatNumber(dmg)}` : formatNumber(dmg),
        alpha: 1, vy: -1.5, isCrit,
      }]);
    }

    if (isCrit && !reduceMotion) setShake(3);

    if (newHp <= 0 && !defeatedRef.current) {
      defeatedRef.current = true;
      playSFX?.('sfx_boss_defeat');
      onBossDefeated(true);
    }
  }, [onBossDefeated, playSFX]);

  // ── Canvas click handler ─────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (defeatedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    // Y relative to canvas
    const cy = my - CANVAS_OFFSET_Y;

    // Handle interrupt click
    const iv = interruptRef.current;
    if (iv) {
      if (iv.type === 'target_zone' && iv.targetZone) {
        const tz = iv.targetZone;
        const dist = Math.hypot(mx - tz.x, cy - tz.y);
        if (dist <= tz.radius) {
          handleInterruptSuccess();
          return;
        }
      }
      if (iv.type === 'whack_sequence' && iv.whackZones) {
        const activeZone = iv.whackZones[iv.whackIndex];
        if (activeZone && !activeZone.hit) {
          const dist = Math.hypot(mx - activeZone.x, cy - activeZone.y);
          if (dist <= activeZone.radius) {
            const next = iv.whackIndex + 1;
            if (next >= iv.whackZones.length) {
              handleInterruptSuccess();
            } else {
              setInterrupt(prev => prev ? { ...prev, whackIndex: next } : prev);
            }
            return;
          }
        }
      }
    }

    // click_burst: clicking anywhere on canvas counts during burst
    if (iv?.type === 'click_burst') {
      const increment = 100 / cfg.interrupt_clicks_required;
      const newProg = Math.min(100, (iv.progress || 0) + increment);
      if (newProg >= 100) {
        handleInterruptSuccess();
      } else {
        setInterrupt(prev => prev ? { ...prev, progress: newProg } : prev);
      }
    }

    // Normal click damage on boss body
    const distBoss = Math.hypot(mx - BOSS_X, cy - BOSS_Y);
    if (distBoss <= CLICK_HITBOX) {
      onEnemyClick();
      const { dmg, isCrit } = debugSuperClick
        ? { dmg: bossMaxHp * 0.5, isCrit: true }
        : calcClickDmg();
      playSFX?.(isCrit ? 'sfx_crit' : 'sfx_click', { pan: 0 });
      dealDamage(dmg, isCrit, mx, cy);
    }
  }, [calcClickDmg, dealDamage, cfg.interrupt_clicks_required, onEnemyClick, bossMaxHp, debugSuperClick]);

  const handleInterruptSuccess = useCallback(() => {
    setInterrupt(null);
    interruptActiveRef.current = false;
    setInterruptSuccess(true);
    // Refill timer
    timerRef.current = Math.min(cfg.timer_seconds, timerRef.current + cfg.interrupt_refill_seconds);
    setTimerLeft(timerRef.current);
    // Reset next interrupt countdown
    nextInterruptRef.current =
      cfg.interrupt_interval_min * 0.8 +
      Math.random() * (cfg.interrupt_interval_max - cfg.interrupt_interval_min) * 0.8;
    setTimeout(() => setInterruptSuccess(null), 1200);
  }, [cfg]);

  // ── Main game loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (defeatedRef.current) return;

    // Auto-DPS tick
    const dpsInterval = setInterval(() => {
      if (defeatedRef.current) return;
      const baseDps = (session.autoDpsPerSecond || 0) + (session.autoUpgradeLevel || 0);
      const multipliers = (session.autoDpsMultiplier || 1) * (session.darkRitualMultiplier || 1);
      let autoDps = baseDps * multipliers;

      // Baseline damage if 0, so health always "ticks away" slowly
      if (autoDps <= 0) {
        autoDps = (session.characterStrength || 10) * 0.1;
      }

      if (autoDps > 0) {
        const tickDmg = autoDps * (AUTO_DPS_TICK_MS / 1000);
        const isCrit = Math.random() < CRIT_CHANCE * 0.5;
        dealDamage(tickDmg * (isCrit ? CRIT_MULT : 1), isCrit,
          BOSS_X + (Math.random() - 0.5) * 60, BOSS_Y);
      }
    }, AUTO_DPS_TICK_MS);

    // Timer and Interrupt loop (100ms ticks)
    const timerInterval = setInterval(() => {
      if (defeatedRef.current) return;
      
      const TICK_MS = 100;
      msAccumulator.current += TICK_MS;
      
      // Main seconds timer
      if (msAccumulator.current >= 1000) {
        msAccumulator.current -= 1000;
        timerRef.current -= 1;
        setTimerLeft(timerRef.current);

        // Interrupt window countdown (1s precision)
        if (interruptActiveRef.current) {
          setInterrupt(prev => {
            if (!prev) return prev;
            const newTime = prev.timeLeft - 1;
            if (newTime <= 0) {
              interruptActiveRef.current = false;
              // Reset next interrupt schedule
              nextInterruptRef.current =
                cfg.interrupt_interval_min +
                Math.random() * (cfg.interrupt_interval_max - cfg.interrupt_interval_min);
              return null;
            }
            return { ...prev, timeLeft: newTime };
          });
        }
        
        if (timerRef.current <= 0 && !defeatedRef.current) {
          defeatedRef.current = true;
          onBossDefeated(false);
        }
      }

      // Interrupt spawning check (MS precision)
      if (!interruptActiveRef.current) {
        nextInterruptRef.current -= TICK_MS;
        if (nextInterruptRef.current <= 0) {
          spawnInterrupt();
        }
      }

      // Boss attack cycling
      attackCooldownRef.current -= TICK_MS;
      if (attackCooldownRef.current <= 0 && attackTypes.length > 0) {
        const currentAttack = attackTypes[attackIndex];
        if (currentAttack) {
          setActiveAttack(currentAttack);
          setAttackActive(true);
          attackCooldownRef.current = currentAttack.cooldown_ms ?? 3000;
        }
      }
    }, 100);

    // Damage number cleanup
    const cleanupInterval = setInterval(() => {
      setDamageNums(prev =>
        prev
          .map(d => ({ ...d, y: d.y + d.vy, alpha: d.alpha - 0.04 }))
          .filter(d => d.alpha > 0)
      );
      setShake(prev => Math.max(0, prev - 1));
    }, 50);

    return () => {
      clearInterval(dpsInterval);
      clearInterval(timerInterval);
      clearInterval(cleanupInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spawnInterrupt = () => {
    const types: InterruptType[] = ['click_burst', 'target_zone', 'whack_sequence'];
    const type = types[Math.floor(Math.random() * types.length)];
    interruptActiveRef.current = true;

    const padding = 60;
    const randX = () => padding + Math.random() * (CANVAS_WIDTH - padding * 2);
    const randY = () => padding + Math.random() * (CANVAS_HEIGHT - padding * 2);

    const iv: ActiveInterrupt = {
      type,
      timeLeft: type === 'click_burst' ? 4 : cfg.interrupt_window_seconds,
      progress: 0,
      whackIndex: 0,
    };

    if (type === 'target_zone') {
      iv.targetZone = { x: randX(), y: randY(), radius: 40, hit: false };
    } else if (type === 'whack_sequence') {
      iv.whackZones = [
        { x: randX(), y: randY(), radius: 35, hit: false },
        { x: randX(), y: randY(), radius: 35, hit: false },
        { x: randX(), y: randY(), radius: 35, hit: false },
      ];
    }

    setInterrupt(iv);
  };

  // Timer colour
  const timerPct = timerLeft / cfg.timer_seconds;
  const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="boss-stage" onClick={handleCanvasClick}>
      {/* Timer bar */}
      <div className="boss-timer-container">
        <div
          className="boss-timer-bar"
          style={{ width: `${Math.max(0, timerPct * 100)}%`, background: timerColor }}
        />
        <span className="boss-timer-label" style={{ color: timerColor }}>
          {Math.max(0, Math.ceil(timerLeft))}s
        </span>
      </div>

      {/* PixiJS canvas */}
      <Application
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        background={0x0a0005}
        antialias
      >
        <BossContent
          bossHp={bossHp}
          bossMaxHp={bossMaxHp}
          bossName={bossName}
          bossVisual={bossVisual}
          damageNumbers={damageNums}
          shake={shake}
          textScale={textScale}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          activeAttack={activeAttack}
          attackActive={attackActive}
          onAttackComplete={handleAttackComplete}
        />
      </Application>

      {/* Interrupt overlays (HTML for interactivity) */}
      {interrupt && interrupt.type === 'click_burst' && (
        <div className="interrupt-overlay interrupt-overlay--burst">
          <div className="interrupt-title">⚡ CLICK FAST!</div>
          <div className="interrupt-progress-track">
            <div
              className="interrupt-progress-fill"
              style={{ width: `${interrupt.progress}%` }}
            />
          </div>
          <div className="interrupt-timer">{Math.ceil(interrupt.timeLeft)}s</div>
        </div>
      )}

      {interrupt && interrupt.type === 'target_zone' && interrupt.targetZone && (
        <div
          className="interrupt-target-zone"
          style={{
            left: interrupt.targetZone.x - interrupt.targetZone.radius,
            top:  interrupt.targetZone.y - interrupt.targetZone.radius + 40, /* offset for timer bar */
            width:  interrupt.targetZone.radius * 2,
            height: interrupt.targetZone.radius * 2,
          }}
        >
          <div className="interrupt-timer interrupt-timer--zone">{Math.ceil(interrupt.timeLeft)}s</div>
        </div>
      )}

      {interrupt && interrupt.type === 'whack_sequence' && interrupt.whackZones && (
        <>
          {interrupt.whackZones.map((zone, i) => i === interrupt.whackIndex && (
            <div
              key={i}
              className="interrupt-whack-zone"
              style={{
                left:   zone.x - zone.radius,
                top:    zone.y - zone.radius + 40,
                width:  zone.radius * 2,
                height: zone.radius * 2,
              }}
            >
              <span>{interrupt.whackIndex + 1}/3</span>
            </div>
          ))}
          <div className="interrupt-timer interrupt-timer--whack">{Math.ceil(interrupt.timeLeft)}s</div>
        </>
      )}

      {interruptSuccess && (
        <div className="interrupt-success-flash">+{cfg.interrupt_refill_seconds}s REFILLED!</div>
      )}
    </div>
  );
};

export default BossStage;
