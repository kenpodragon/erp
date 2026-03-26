/**
 * useBossPhases — boss combat logic hook.
 * Manages boss HP, countdown timer, interrupt challenges,
 * attack cycling, auto-DPS, and damage numbers.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { StorySession, BossConfig } from '../../GameContext';
import { zoneHp, formatNumber } from '../../utils/numbers';
import type { EnemyVisualData } from '../shared/EntityRenderer';
import type { AttackVisualData } from '../shared/AttackRenderer';

// ── Constants ──────────────────────────────────────────────────────────────
export const AUTO_DPS_TICK_MS = 500;
export const CANVAS_WIDTH  = 600;
export const CANVAS_HEIGHT = 380;
export const BOSS_X = CANVAS_WIDTH / 2;
export const BOSS_Y = CANVAS_HEIGHT / 2 - 20;
export const BOSS_RADIUS = 60;
const CLICK_HITBOX = BOSS_RADIUS + 20;

// ── Types ──────────────────────────────────────────────────────────────────
export interface BossDamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  alpha: number;
  vy: number;
  isCrit: boolean;
}

export type InterruptType = 'click_burst' | 'target_zone' | 'whack_sequence';

export interface TargetZone {
  x: number;
  y: number;
  radius: number;
  hit: boolean;
}

export interface ActiveInterrupt {
  type: InterruptType;
  timeLeft: number;
  progress: number;
  targetZone?: TargetZone;
  whackZones?: TargetZone[];
  whackIndex: number;
}

// ── Default boss visual data ───────────────────────────────────────────────
export const DEFAULT_BOSS_VISUAL: EnemyVisualData = {
  entity_id: 0,
  name: 'Guardian',
  sprite_key: null,
  base_hp: 1000,
  base_gold: 0,
  color_primary: '#1a0000',
  color_secondary: '#cc0000',
  movement: {
    name: 'stationary',
    y_offset_min: 0, y_offset_max: 0,
    bob_amplitude: 3, bob_frequency: 0.5,
    speed_multiplier: 0, trail_effect: null,
  },
  size: {
    name: 'huge', scale_min: 2.2, scale_max: 2.4,
    width_base: 50, height_base: 70, hitbox_radius: 60, hp_bar_width: 200,
  },
  animation: {
    name: 'boss_idle',
    idle_scale_x: 0.02, idle_scale_y: 0.02, idle_cycle_ms: 1800,
    idle_translate_x: 0, idle_translate_y: 0,
    attack_recoil: 6, death_style: 'explode',
    death_duration_ms: 1000, death_particle_count: 20,
  },
  silhouette: {
    name: 'boss_biped', body_shape: 'biped',
    body_ratio_w: 1.2, body_ratio_h: 1.3, corner_radius: 6,
    has_limbs: true, limb_count: 2, has_head: true, has_wings: false,
    has_weapon_slot: true, has_eye_glow: true, sub_unit_count: 1,
  },
  primary_attack: {
    name: 'boss_slam', attack_animation_type: 'aoe_burst',
    projectile_color: '#cc0000', cooldown_ms: 3000, projectile_speed: 4,
    impact_effect: 'shatter', attack_range: 80, arc_angle: 120,
    trail_type: null, screen_shake: true,
  },
  secondary_attack: {
    name: 'boss_bolt', attack_animation_type: 'elemental_projectile',
    projectile_color: '#ff4400', cooldown_ms: 2000, projectile_speed: 6,
    impact_effect: 'splash', attack_range: 200, arc_angle: 90,
    trail_type: 'glow', screen_shake: false,
  },
  tertiary_attack: {
    name: 'boss_sweep', attack_animation_type: 'melee_swing',
    projectile_color: '#880000', cooldown_ms: 4000, projectile_speed: 0,
    impact_effect: 'flash', attack_range: 70, arc_angle: 140,
    trail_type: null, screen_shake: true,
  },
};

// ── Hook ───────────────────────────────────────────────────────────────────
interface UseBossPhasesParams {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  onEnemyClick: () => void;
  onBossDefeated: (success: boolean) => void;
  debugSuperClick?: boolean;
  playSFX?: (key: string, opts?: { pan?: number }) => void;
  reduceMotion?: boolean;
}

export function useBossPhases(params: UseBossPhasesParams) {
  const {
    session, gameConfigs, onEnemyClick, onBossDefeated,
    debugSuperClick = false, playSFX, reduceMotion = false,
  } = params;

  const { bossName = 'Guardian' } = session;

  const cfg: BossConfig = session.bossConfig ?? {
    timer_seconds: 120,
    hp_multiplier: 8,
    interrupt_interval_min: 1200,
    interrupt_interval_max: 3000,
    interrupt_window_seconds: 2,
    interrupt_refill_seconds: 3,
    interrupt_clicks_required: 20,
  };

  const CRIT_CHANCE = Number(gameConfigs['crit_chance'] ?? 0.02);
  const CRIT_MULT   = Number(gameConfigs['crit_multiplier'] ?? 2.0);
  const HP_SCALING   = Number(gameConfigs['hp_scaling_factor'] ?? 1.55);

  const baseHp = (session as any).bossBaseHp
    ?? zoneHp(session.currentZone || 1, HP_SCALING) * cfg.hp_multiplier;

  // ── State ──────────────────────────────────────────────────────────────
  const [bossHp, setBossHp]     = useState(baseHp);
  const [bossMaxHp]             = useState(baseHp);
  const [timerLeft, setTimerLeft]   = useState(cfg.timer_seconds);
  const [damageNums, setDamageNums] = useState<BossDamageNumber[]>([]);
  const [shake, setShake]           = useState(0);
  const [interrupt, setInterrupt]   = useState<ActiveInterrupt | null>(null);
  const [interruptSuccess, setInterruptSuccess] = useState<boolean | null>(null);

  const bossVisual: EnemyVisualData = (session as any).bossVisualData ?? {
    ...DEFAULT_BOSS_VISUAL,
    name: bossName,
  };

  // Attack cycling
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
    setAttackIndex(prev => {
      const next = (prev + 1) % attackTypes.length;
      attackCooldownRef.current = attackTypes[next]?.cooldown_ms ?? 3000;
      return next;
    });
  }, [attackTypes]);

  // ── Refs ───────────────────────────────────────────────────────────────
  const bossHpRef         = useRef(baseHp);
  const timerRef          = useRef(cfg.timer_seconds);
  const defeatedRef       = useRef(false);
  const nextInterruptRef  = useRef(
    cfg.interrupt_interval_min * 0.8 +
    Math.random() * (cfg.interrupt_interval_max - cfg.interrupt_interval_min) * 0.8
  );
  const interruptActiveRef = useRef(false);
  const interruptRef       = useRef<ActiveInterrupt | null>(null);
  const msAccumulator      = useRef(0);
  const CANVAS_OFFSET_Y = 40;

  useEffect(() => { interruptRef.current = interrupt; }, [interrupt]);

  // ── Damage ─────────────────────────────────────────────────────────────
  const calcClickDmg = useCallback(() => {
    const base = (session.characterStrength ?? 10) + (session.clickUpgradeLevel ?? 0);
    const multipliers = (session.clickDmgMultiplier ?? 1) * (session.darkRitualMultiplier ?? 1);
    const isCrit = Math.random() < CRIT_CHANCE;
    const dmg = (isCrit ? base * CRIT_MULT : base) * multipliers;
    return { dmg, isCrit };
  }, [session.characterStrength, session.clickUpgradeLevel, session.clickDmgMultiplier, session.darkRitualMultiplier, CRIT_CHANCE, CRIT_MULT]);

  const dealDamage = useCallback((dmg: number, isCrit: boolean, ox: number, oy: number) => {
    if (defeatedRef.current) return;
    const newHp = Math.max(0, bossHpRef.current - dmg);
    bossHpRef.current = newHp;
    setBossHp(newHp);

    if (!reduceMotion) {
      const id = `${Date.now()}-${Math.random()}`;
      setDamageNums(prev => [...prev.slice(-15), {
        id, x: ox + (Math.random() - 0.5) * 40, y: oy - 20,
        value: isCrit ? `\u26A1${formatNumber(dmg)}` : formatNumber(dmg),
        alpha: 1, vy: -1.5, isCrit,
      }]);
    }

    if (isCrit && !reduceMotion) setShake(3);

    if (newHp <= 0 && !defeatedRef.current) {
      defeatedRef.current = true;
      playSFX?.('sfx_boss_defeat');
      onBossDefeated(true);
    }
  }, [onBossDefeated, playSFX, reduceMotion]);

  // ── Interrupts ─────────────────────────────────────────────────────────
  const handleInterruptSuccess = useCallback(() => {
    setInterrupt(null);
    interruptActiveRef.current = false;
    setInterruptSuccess(true);
    timerRef.current = Math.min(cfg.timer_seconds, timerRef.current + cfg.interrupt_refill_seconds);
    setTimerLeft(timerRef.current);
    nextInterruptRef.current =
      cfg.interrupt_interval_min * 0.8 +
      Math.random() * (cfg.interrupt_interval_max - cfg.interrupt_interval_min) * 0.8;
    setTimeout(() => setInterruptSuccess(null), 1200);
  }, [cfg]);

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

  // ── Click handler ──────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (defeatedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cy = my - CANVAS_OFFSET_Y;

    // Handle interrupt clicks
    const iv = interruptRef.current;
    if (iv) {
      if (iv.type === 'target_zone' && iv.targetZone) {
        const tz = iv.targetZone;
        const dist = Math.hypot(mx - tz.x, cy - tz.y);
        if (dist <= tz.radius) { handleInterruptSuccess(); return; }
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

    // click_burst: any click on canvas counts
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
  }, [calcClickDmg, dealDamage, cfg.interrupt_clicks_required, onEnemyClick, bossMaxHp, debugSuperClick, handleInterruptSuccess, playSFX]);

  // ── Main game loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (defeatedRef.current) return;

    const dpsInterval = setInterval(() => {
      if (defeatedRef.current) return;
      const baseDps = (session.autoDpsPerSecond || 0) + (session.autoUpgradeLevel || 0);
      const multipliers = (session.autoDpsMultiplier || 1) * (session.darkRitualMultiplier || 1);
      let autoDps = baseDps * multipliers;
      if (autoDps <= 0) autoDps = (session.characterStrength || 10) * 0.1;

      if (autoDps > 0) {
        const tickDmg = autoDps * (AUTO_DPS_TICK_MS / 1000);
        const isCrit = Math.random() < CRIT_CHANCE * 0.5;
        dealDamage(tickDmg * (isCrit ? CRIT_MULT : 1), isCrit,
          BOSS_X + (Math.random() - 0.5) * 60, BOSS_Y);
      }
    }, AUTO_DPS_TICK_MS);

    const timerInterval = setInterval(() => {
      if (defeatedRef.current) return;
      const TICK_MS = 100;
      msAccumulator.current += TICK_MS;

      if (msAccumulator.current >= 1000) {
        msAccumulator.current -= 1000;
        timerRef.current -= 1;
        setTimerLeft(timerRef.current);

        if (interruptActiveRef.current) {
          setInterrupt(prev => {
            if (!prev) return prev;
            const newTime = prev.timeLeft - 1;
            if (newTime <= 0) {
              interruptActiveRef.current = false;
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

      if (!interruptActiveRef.current) {
        nextInterruptRef.current -= TICK_MS;
        if (nextInterruptRef.current <= 0) spawnInterrupt();
      }

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

  // ── Derived values ─────────────────────────────────────────────────────
  const timerPct = timerLeft / cfg.timer_seconds;
  const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f59e0b' : '#ef4444';

  return {
    bossHp, bossMaxHp, bossName, bossVisual,
    timerLeft, timerPct, timerColor, cfg,
    damageNums, shake,
    interrupt, interruptSuccess,
    activeAttack, attackActive, handleAttackComplete,
    handleCanvasClick,
  };
}
