/**
 * useBannerSimulation — physics & combat loop for the bottom animated banner.
 * Manages data fetching, adaptive scaling, player/enemy state,
 * spawning, damage, and the useTick game loop.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTick } from '@pixi/react';
import { useGame } from '../GameContext';
import { api } from '../../api';
import { preloadEntitySprites } from '../renderers/SpriteTextureCache';
import type { EnemyVisualData } from './shared/EntityRenderer';
import type { CharacterVisualData } from './shared/PaperDollRenderer';
import type { AttackVisualData } from './shared/AttackRenderer';

// ── Types ──────────────────────────────────────────────────────────────────
export interface BannerConfigs {
  banner_base_enemies: number;
  banner_max_enemies: number;
  banner_enemies_per_level: number;
  banner_death_base_rate: number;
  banner_death_reduction_per_level: number;
  banner_death_floor: number;
  banner_kill_speed_base_ms: number;
  banner_kill_speed_min_ms: number;
  banner_spawn_rate_base: number;
  banner_spawn_rate_combat: number;
}

export const DEFAULT_BANNER_CONFIGS: BannerConfigs = {
  banner_base_enemies: 1,
  banner_max_enemies: 15,
  banner_enemies_per_level: 0.15,
  banner_death_base_rate: 0.03,
  banner_death_reduction_per_level: 0.0003,
  banner_death_floor: 0.002,
  banner_kill_speed_base_ms: 3000,
  banner_kill_speed_min_ms: 200,
  banner_spawn_rate_base: 0.05,
  banner_spawn_rate_combat: 0.01,
};

export interface BannerEnemy {
  id: string;
  visual: EnemyVisualData;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: 'idle' | 'attacking' | 'dying' | 'dead';
}

export interface BannerDamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
  alpha: number;
}

export type PlayerAnimState = 'idle' | 'walking' | 'fighting' | 'dead' | 'idle_check' | 'idle_stretch' | 'idle_shine' | 'idle_scan';

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  animState: PlayerAnimState;
  vengeance: boolean;
  level: number;
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useBannerSimulation(character: any) {
  const { state } = useGame();
  const width = window.innerWidth;
  const height = 150;
  const groundY = 75;

  // ── Data fetching ──────────────────────────────────────────────────────
  const [enemyPool, setEnemyPool] = useState<EnemyVisualData[]>([]);
  const [charVisuals, setCharVisuals] = useState<CharacterVisualData | null>(null);
  const [bannerConfigs, setBannerConfigs] = useState<BannerConfigs>(DEFAULT_BANNER_CONFIGS);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const enemyRes = await api.get('/api/game/enemies/encountered');
        if (enemyRes.ok) {
          const pool: EnemyVisualData[] = await enemyRes.json();
          // Preload SVG sprite textures before setting pool
          const spriteKeys = pool.map(e => e.sprite_key).filter((k): k is string => !!k);
          if (spriteKeys.length > 0) await preloadEntitySprites(spriteKeys);
          setEnemyPool(pool);
        }
      } catch (err) { console.error('Banner: Failed to fetch enemy pool', err); }

      try {
        const charRes = await api.get('/api/game/character/visuals');
        if (charRes.ok) setCharVisuals(await charRes.json());
      } catch (err) { console.error('Banner: Failed to fetch character visuals', err); }

      try {
        const configRes = await api.get('/api/game/story/configs');
        if (configRes.ok) {
          const configs = await configRes.json();
          setBannerConfigs({
            banner_base_enemies: Number(configs['banner_base_enemies'] ?? DEFAULT_BANNER_CONFIGS.banner_base_enemies),
            banner_max_enemies: Number(configs['banner_max_enemies'] ?? DEFAULT_BANNER_CONFIGS.banner_max_enemies),
            banner_enemies_per_level: Number(configs['banner_enemies_per_level'] ?? DEFAULT_BANNER_CONFIGS.banner_enemies_per_level),
            banner_death_base_rate: Number(configs['banner_death_base_rate'] ?? DEFAULT_BANNER_CONFIGS.banner_death_base_rate),
            banner_death_reduction_per_level: Number(configs['banner_death_reduction_per_level'] ?? DEFAULT_BANNER_CONFIGS.banner_death_reduction_per_level),
            banner_death_floor: Number(configs['banner_death_floor'] ?? DEFAULT_BANNER_CONFIGS.banner_death_floor),
            banner_kill_speed_base_ms: Number(configs['banner_kill_speed_base_ms'] ?? DEFAULT_BANNER_CONFIGS.banner_kill_speed_base_ms),
            banner_kill_speed_min_ms: Number(configs['banner_kill_speed_min_ms'] ?? DEFAULT_BANNER_CONFIGS.banner_kill_speed_min_ms),
            banner_spawn_rate_base: Number(configs['banner_spawn_rate_base'] ?? DEFAULT_BANNER_CONFIGS.banner_spawn_rate_base),
            banner_spawn_rate_combat: Number(configs['banner_spawn_rate_combat'] ?? DEFAULT_BANNER_CONFIGS.banner_spawn_rate_combat),
          });
        }
      } catch (err) { console.error('Banner: Failed to fetch game configs', err); }
    };
    fetchData();
  }, []);

  // ── Adaptive scaling ───────────────────────────────────────────────────
  const level = character?.level || 1;
  const maxEnemies = useMemo(() =>
    Math.min(bannerConfigs.banner_max_enemies, Math.floor(bannerConfigs.banner_base_enemies + level * bannerConfigs.banner_enemies_per_level)),
    [bannerConfigs, level]
  );
  const deathRate = useMemo(() =>
    Math.max(bannerConfigs.banner_death_floor, bannerConfigs.banner_death_base_rate - level * bannerConfigs.banner_death_reduction_per_level),
    [bannerConfigs, level]
  );
  const killSpeedMs = useMemo(() =>
    Math.max(bannerConfigs.banner_kill_speed_min_ms, bannerConfigs.banner_kill_speed_base_ms - level * 30),
    [bannerConfigs, level]
  );

  // ── Local State ────────────────────────────────────────────────────────
  const [player, setPlayer] = useState<PlayerState>({
    x: 100, y: groundY, hp: 100, maxHp: 100,
    isDead: false, animState: 'walking', vengeance: false, level,
  });
  const [enemies, setEnemies] = useState<BannerEnemy[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<BannerDamageNumber[]>([]);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [waveTimer, setWaveTimer] = useState(0);
  const [idleTimer, setIdleTimer] = useState(0);
  const [deathTimer, setDeathTimer] = useState(0);
  const [focusActive, setFocusActive] = useState(false);
  const [time, setTime] = useState(0);
  const [playerAttackActive, setPlayerAttackActive] = useState(false);
  const [enemyAttackActive, setEnemyAttackActive] = useState(false);
  const attackCooldownRef = useRef(0);

  // Derived stats
  const strength = character?.strength || 10;
  const agility = character?.agility || 5;
  const intelligence = character?.intelligence || 5;
  const speedMult = useMemo(() => 1.0 + (agility / 50), [agility]);
  const vfxIntensity = useMemo(() => intelligence / 5, [intelligence]);

  // Attack visuals
  const playerAttackVisual = useMemo<AttackVisualData>(() => {
    const weaponLayer = charVisuals?.equipped_layers?.find(l => l.layer === 7);
    const attackType = weaponLayer?.player_attack_animation || 'melee_swing';
    return {
      attack_animation_type: attackType as AttackVisualData['attack_animation_type'],
      projectile_color: null,
      impact_effect: 'flash',
      attack_range: 40,
      arc_angle: 90,
    };
  }, [charVisuals]);

  const enemyAttackVisual = useMemo<AttackVisualData>(() => {
    const nearest = enemies.length > 0 ? enemies[0] : null;
    if (nearest?.visual.primary_attack) {
      return {
        attack_animation_type: nearest.visual.primary_attack.attack_animation_type as AttackVisualData['attack_animation_type'],
        projectile_color: nearest.visual.primary_attack.projectile_color,
        impact_effect: nearest.visual.primary_attack.impact_effect,
        attack_range: nearest.visual.primary_attack.attack_range,
        arc_angle: nearest.visual.primary_attack.arc_angle,
        trail_type: nearest.visual.primary_attack.trail_type,
        projectile_speed: nearest.visual.primary_attack.projectile_speed,
      };
    }
    return {
      attack_animation_type: 'melee_swing',
      projectile_color: '#ff4444',
      impact_effect: 'flash',
      attack_range: 30,
      arc_angle: 60,
    };
  }, [enemies]);

  const paperDollState = useMemo((): 'idle' | 'walking' | 'fighting' | 'dead' => {
    if (player.isDead) return 'dead';
    if (player.animState === 'fighting') return 'fighting';
    if (player.animState === 'walking') return 'walking';
    return 'idle';
  }, [player.isDead, player.animState]);

  // ── Physics & Combat Loop ──────────────────────────────────────────────
  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(t => t + dt);
    attackCooldownRef.current = Math.max(0, attackCooldownRef.current - dt * 16.67);

    setDamageNumbers(prev => prev.map(num => ({
      ...num, y: num.y - (1.0 * dt), alpha: num.alpha - (0.02 * dt)
    })).filter(num => num.alpha > 0));

    const nearestEnemy = enemies.length > 0 ? enemies[0] : null;
    const dist = nearestEnemy ? nearestEnemy.x - player.x : 9999;

    if (player.isDead) {
      setDeathTimer(prev => prev + dt);
      setScrollSpeed(0);
      if (deathTimer > 180) {
        setPlayer(prev => ({ ...prev, isDead: false, hp: prev.maxHp, x: 50, vengeance: true, animState: 'walking' }));
        setDeathTimer(0);
      }
      return;
    }

    if (enemies.length > 0) {
      setWaveTimer(prev => prev + dt);
      setIdleTimer(0);
      if (waveTimer > 120 * 60) setFocusActive(true);
    } else {
      setWaveTimer(0);
      setIdleTimer(prev => prev + dt);
      setFocusActive(false);
      setPlayerAttackActive(false);
      setEnemyAttackActive(false);
      if (player.vengeance) setPlayer(prev => ({ ...prev, vengeance: false }));
    }

    let nextAnimState: PlayerAnimState = 'walking';
    let moveX = 0;

    if (nearestEnemy && dist < 200) {
      nextAnimState = 'fighting';
      setScrollSpeed(0.1);
      if (dist < 60) {
        moveX = -0.5 * dt;
        setPlayer(prev => {
          const newHp = prev.hp - (deathRate * dt * 10);
          if (newHp <= 0) return { ...prev, isDead: true, hp: 0, animState: 'dead' };
          return { ...prev, hp: newHp };
        });
        if (!enemyAttackActive && attackCooldownRef.current <= 0) setEnemyAttackActive(true);
      } else {
        moveX = (player.vengeance ? 2.5 : 0.8) * dt * speedMult;
      }
    } else if (enemies.length === 0) {
      if (idleTimer > 180 && idleTimer < 360) {
        const cycle = Math.floor(idleTimer / 180) % 4;
        const idles: PlayerAnimState[] = ['idle_check', 'idle_stretch', 'idle_shine', 'idle_scan'];
        nextAnimState = idles[cycle] || 'walking';
        setScrollSpeed(0);
        moveX = 0;
      } else {
        nextAnimState = 'walking';
        setScrollSpeed(1.0 * speedMult);
        moveX = 1.2 * dt * speedMult;
      }
    }

    setPlayer(prev => ({
      ...prev, animState: nextAnimState,
      x: Math.max(-100, Math.min(width * 0.4, prev.x + moveX)),
      y: groundY,
    }));

    setEnemies(prev => prev.map(en => ({
      ...en, x: en.x - (1.5 + (1.5 * scrollSpeed)) * dt, y: groundY,
    })).filter(en => en.x > -150));

    // Wave Spawning
    const spawnRate = nextAnimState === 'walking' ? bannerConfigs.banner_spawn_rate_base : bannerConfigs.banner_spawn_rate_combat;
    if (enemies.length < maxEnemies && Math.random() < spawnRate) {
      if (enemyPool.length > 0) {
        const template = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        setEnemies(prev => [...prev, {
          id: `en_${Date.now()}`, visual: template,
          x: width + 50, y: groundY,
          hp: template.base_hp || 50, maxHp: template.base_hp || 50,
          state: 'idle',
        }]);
      } else {
        const fallbackVisual: EnemyVisualData = {
          entity_id: Math.floor(Math.random() * 10000),
          name: 'SLUDGE', sprite_key: null, base_hp: 50, base_gold: 1,
          color_primary: '#2a2a4a', color_secondary: '#1a1a3a',
          movement: null, size: null, animation: null, silhouette: null,
          primary_attack: null, secondary_attack: null, tertiary_attack: null,
        };
        setEnemies(prev => [...prev, {
          id: `en_fallback_${Date.now()}`, visual: fallbackVisual,
          x: width + 50, y: groundY, hp: 50, maxHp: 50, state: 'idle',
        }]);
      }
    }

    // Combat — player damages nearest enemy
    if (nearestEnemy && dist < 80) {
      if (!playerAttackActive && attackCooldownRef.current <= 0) setPlayerAttackActive(true);

      setEnemies(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const isCrit = Math.random() < 0.1;
        const baseDamage = (next[0].maxHp / (killSpeedMs / 16.67));
        const damage = baseDamage * dt * (focusActive ? 10 : (player.vengeance ? 5 : 1)) * (isCrit ? 2 : 1);

        if (Math.random() < 0.2) {
          setDamageNumbers(d => [...d, {
            id: `dmg_${Date.now()}_${Math.random()}`,
            x: nearestEnemy.x + (Math.random() * 20 - 10),
            y: nearestEnemy.y - 40,
            value: Math.ceil(damage * 10),
            isCrit, alpha: 1.0,
          }]);
        }

        next[0] = { ...next[0], hp: next[0].hp - damage };
        if (next[0].hp <= 0) {
          next[0] = { ...next[0], state: 'dying' };
          setTimeout(() => {
            setEnemies(e => e.filter(en => en.id !== next[0].id));
          }, 600);
          return next;
        }
        return next;
      });
    }
  });

  return {
    state, width, height, groundY, time,
    player, enemies, damageNumbers,
    scrollSpeed, charVisuals, strength, vfxIntensity,
    playerAttackActive, setPlayerAttackActive,
    enemyAttackActive, setEnemyAttackActive,
    attackCooldownRef,
    playerAttackVisual, enemyAttackVisual, paperDollState,
  };
}
