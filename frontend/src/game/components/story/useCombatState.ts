/**
 * useCombatState — combat state machine hook.
 * Manages enemy spawning, wave progression, boss logic, enrage timer,
 * and character visuals.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { api } from '../../../api';
import { zoneHp, zoneGold } from '../../utils/numbers';
import type { CharacterVisualData } from '../shared/PaperDollRenderer';
import type { StorySession } from '../../GameContext';

// ── Constants ──────────────────────────────────────────────────────────────
export const MONSTERS_PER_ZONE_DEFAULT = 10;
export const BOSS_ZONE_INTERVAL_DEFAULT = 5;
export const BOSS_ENRAGE_SECONDS_DEFAULT = 30;
export const CRIT_CHANCE_DEFAULT = 0.02;
export const PRIMAL_CHANCE_DEFAULT = 0.25;
export const AUTO_DPS_TICK_MS_DEFAULT = 500;

// ── Types ──────────────────────────────────────────────────────────────────
export interface Enemy {
  entityId: number | null;
  name: string;
  spriteKey: string | null;
  maxHp: number;
  currentHp: number;
  baseGold: number;
  isBoss: boolean;
  isPrimal: boolean;
  isFallback: boolean;
  isRare?: boolean;
  role?: string;
}

export interface CombatConfigs {
  MONSTERS_PER_ZONE: number;
  BOSS_ZONE_INTERVAL: number;
  BOSS_ENRAGE_SECONDS: number;
  CRIT_CHANCE: number;
  PRIMAL_CHANCE: number;
  AUTO_DPS_TICK_MS: number;
  scalingFactor: number;
  critMult: number;
}

interface UseCombatStateParams {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  enemyPool: Enemy[];
  waveCount: number;
  setWaveCount: React.Dispatch<React.SetStateAction<number>>;
  requiredWaves: number;
  extraWavesMode?: boolean;
  autoProgress: boolean;
  onWavesComplete: () => void;
  onZoneAdvance: (newZone: number) => void;
  onAutoProgressToggle: (val: boolean) => void;
  rareSpawn?: { entity_id: number; canonical_name: string; entity_type_id: number; entity_family_id: number | null; base_hp: number; base_gold: number; sprite_key: string | null } | null;
}

export function useCombatState(params: UseCombatStateParams) {
  const {
    session, gameConfigs, enemyPool, waveCount, setWaveCount, requiredWaves,
    extraWavesMode, autoProgress, onWavesComplete, onZoneAdvance,
    onAutoProgressToggle, rareSpawn,
  } = params;

  // ── Configs ────────────────────────────────────────────────────────────
  const configs: CombatConfigs = useMemo(() => ({
    MONSTERS_PER_ZONE: Number(gameConfigs['monsters_per_zone'] ?? MONSTERS_PER_ZONE_DEFAULT),
    BOSS_ZONE_INTERVAL: Number(gameConfigs['boss_zone_interval'] ?? BOSS_ZONE_INTERVAL_DEFAULT),
    BOSS_ENRAGE_SECONDS: Number(gameConfigs['boss_enrage_seconds'] ?? BOSS_ENRAGE_SECONDS_DEFAULT),
    CRIT_CHANCE: Number(gameConfigs['crit_chance'] ?? CRIT_CHANCE_DEFAULT),
    PRIMAL_CHANCE: Number(gameConfigs['primal_boss_chance'] ?? PRIMAL_CHANCE_DEFAULT),
    AUTO_DPS_TICK_MS: Number(gameConfigs['auto_dps_tick_ms'] ?? AUTO_DPS_TICK_MS_DEFAULT),
    scalingFactor: Number(gameConfigs['hp_scaling_factor'] ?? 1.55),
    critMult: Number(gameConfigs['crit_multiplier'] ?? 2.0),
  }), [gameConfigs]);

  // ── State ──────────────────────────────────────────────────────────────
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [isFightingBoss, _setIsFightingBoss] = useState(false);
  const isFightingBossRef = useRef(false);
  const setIsFightingBoss = (val: boolean) => { isFightingBossRef.current = val; _setIsFightingBoss(val); };
  const currentZoneRef = useRef(session.currentZone);
  currentZoneRef.current = session.currentZone;
  const [enrageTimer, setEnrageTimer] = useState(configs.BOSS_ENRAGE_SECONDS);
  const [characterVisuals, setCharacterVisuals] = useState<CharacterVisualData | null>(null);
  const [enemyState, setEnemyState] = useState<'idle' | 'attacking' | 'dying' | 'dead'>('idle');

  const enrageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Character visuals fetch ────────────────────────────────────────────
  useEffect(() => {
    api.get('/api/game/character/visuals')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCharacterVisuals(data); })
      .catch(() => {});
  }, []);

  // ── Spawn ──────────────────────────────────────────────────────────────
  const spawnEnemy = useCallback((pool: Enemy[], zone: number, isBoss: boolean) => {
    const { BOSS_ZONE_INTERVAL, PRIMAL_CHANCE, BOSS_ENRAGE_SECONDS, scalingFactor } = configs;
    const isBossZone = zone % BOSS_ZONE_INTERVAL === 0;
    const isBossWave = isBoss && isBossZone;
    const isPrimal = isBossWave && Math.random() < PRIMAL_CHANCE;
    const enemyLevel = isBoss ? (zone + 1) : zone;
    const hp = zoneHp(enemyLevel, scalingFactor);
    const gold = zoneGold(enemyLevel) * (isBossWave ? 10 : isBoss ? 3 : 1) * (isPrimal ? 3 : 1);

    setEnemyState('idle');

    if (pool && pool.length > 0) {
      let poolToUse = pool;
      const isBossRole = (r?: string) => r === 'boss' || r === 'big-boss';
      const isMiniBossRole = (r?: string) => r === 'mini_boss' || r === 'mini-boss';

      if (isBossWave) poolToUse = pool.filter(e => e && (e.isBoss || isBossRole(e.role)));
      else if (isBoss) poolToUse = pool.filter(e => e && isMiniBossRole(e.role));
      else poolToUse = pool.filter(e => !e.isBoss && !isBossRole(e.role) && !isMiniBossRole(e.role));

      if (!poolToUse || poolToUse.length === 0) poolToUse = pool;

      const template = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      if (!template) {
        setEnemy({
          entityId: null,
          name: isBossWave ? 'BOSS' : isBoss ? 'MINI BOSS' : 'SHADOW',
          spriteKey: null, maxHp: hp, currentHp: hp, baseGold: gold, isBoss, isPrimal, isFallback: true
        });
      } else {
        const tHp = (template as any).base_hp;
        const tGold = (template as any).base_gold;
        const entityHp = (tHp && tHp > 0) ? tHp : hp;
        const entityGold = (tGold && tGold > 0) ? tGold : gold;
        const finalHp = entityHp * (isBossWave ? 3 : isBoss ? 1.5 : 1) * (isPrimal ? 2 : 1);
        const finalGold = entityGold * (isBossWave ? 10 : isBoss ? 3 : 1) * (isPrimal ? 3 : 1);
        setEnemy({
          ...template,
          name: template.name || (template as any).canonical_name || 'UNKNOWN ENTITY',
          maxHp: finalHp, currentHp: finalHp, baseGold: finalGold, isBoss, isPrimal, isFallback: false
        });
      }
    } else {
      setEnemy({
        entityId: null,
        name: isBossWave ? (isPrimal ? 'PRIMAL WRAITH' : 'SHADOW BOSS') : isBoss ? 'MINI BOSS' : 'SHADOW WRAITH',
        spriteKey: null, maxHp: hp, currentHp: hp, baseGold: gold, isBoss, isPrimal, isFallback: true
      });
    }
    if (isBoss) setEnrageTimer(BOSS_ENRAGE_SECONDS);
  }, [configs]);

  // ── Wave progression ───────────────────────────────────────────────────
  const advanceWave = useCallback(() => {
    setWaveCount(prev => {
      const next = prev + 1;
      const zone = currentZoneRef.current;
      if (isFightingBossRef.current) {
        setIsFightingBoss(false);
        if (zone >= requiredWaves && !extraWavesMode) onWavesComplete();
        onZoneAdvance(zone + 1);
        return 0;
      } else {
        if (next < configs.MONSTERS_PER_ZONE) {
          setTimeout(() => spawnEnemy(enemyPool, zone, false), 600);
          return next;
        } else {
          if (autoProgress) {
            setIsFightingBoss(true);
            setTimeout(() => spawnEnemy(enemyPool, zone, true), 600);
          } else {
            setTimeout(() => spawnEnemy(enemyPool, zone, false), 600);
          }
          return configs.MONSTERS_PER_ZONE;
        }
      }
    });
  }, [requiredWaves, extraWavesMode, onWavesComplete, autoProgress, onZoneAdvance, enemyPool, spawnEnemy, configs.MONSTERS_PER_ZONE]);

  const handleChallengeBoss = useCallback(() => {
    if (isFightingBoss) return;
    setIsFightingBoss(true);
    spawnEnemy(enemyPool, session.currentZone, true);
  }, [enemyPool, session.currentZone, spawnEnemy, isFightingBoss]);

  // ── Initial spawn ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (session.currentWave >= configs.MONSTERS_PER_ZONE) {
        setWaveCount(configs.MONSTERS_PER_ZONE);
        setIsFightingBoss(false);
        spawnEnemy(enemyPool, session.currentZone, false);
      } else {
        setWaveCount(session.currentWave);
        setIsFightingBoss(false);
        spawnEnemy(enemyPool, session.currentZone, false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [session.currentZone, enemyPool.length, spawnEnemy, configs.MONSTERS_PER_ZONE]);

  // ── Rare spawn injection ───────────────────────────────────────────────
  const lastRareSpawnId = useRef<number | null>(null);
  useEffect(() => {
    if (!rareSpawn || rareSpawn.entity_id === lastRareSpawnId.current) return;
    lastRareSpawnId.current = rareSpawn.entity_id;
    const zone = session.currentZone;
    const hp = zoneHp(zone, configs.scalingFactor);
    const gold = zoneGold(zone) * 5;
    setEnemy({
      entityId: rareSpawn.entity_id,
      name: rareSpawn.canonical_name,
      spriteKey: rareSpawn.sprite_key,
      maxHp: hp, currentHp: hp, baseGold: gold,
      isBoss: false, isPrimal: false, isFallback: false, isRare: true,
    });
  }, [rareSpawn]);

  // ── Auto-progress toggle ──────────────────────────────────────────────
  useEffect(() => {
    if (autoProgress && waveCount === configs.MONSTERS_PER_ZONE && !isFightingBoss) {
      handleChallengeBoss();
    }
  }, [autoProgress, waveCount, isFightingBoss, handleChallengeBoss, configs.MONSTERS_PER_ZONE]);

  // ── Enrage timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!enemy?.isBoss) return;
    enrageRef.current = setInterval(() => {
      setEnrageTimer(prev => {
        if (prev <= 1) {
          clearInterval(enrageRef.current!);
          onAutoProgressToggle(false);
          setIsFightingBoss(false);
          setWaveCount(configs.MONSTERS_PER_ZONE);
          setTimeout(() => spawnEnemy(enemyPool, session.currentZone, false), 600);
          setEnemy(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (enrageRef.current) clearInterval(enrageRef.current); };
  }, [enemy?.isBoss, onAutoProgressToggle, enemyPool, session.currentZone, spawnEnemy, configs.MONSTERS_PER_ZONE]);

  return {
    enemy, setEnemy,
    isFightingBoss,
    enrageTimer,
    characterVisuals,
    enemyState, setEnemyState,
    configs,
    advanceWave, handleChallengeBoss,
  };
}
