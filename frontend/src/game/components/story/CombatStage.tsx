/**
 * CombatStage — PixiJS combat engine (v8).
 * Slim orchestrator composing useCombatState, useCombatAnimations, and CombatHUD.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text, Sprite } from 'pixi.js';
import { api } from '../../../api';
import type { StorySession } from '../../GameContext';
import { formatNumber } from '../../utils/numbers';
import { hexToPixiTint } from '../../utils/classVisuals';
import { useAssets } from '../../providers/AssetProvider';
import { preloadEntitySprites } from '../../renderers/SpriteTextureCache';
import { useCombatState, MONSTERS_PER_ZONE_DEFAULT } from './useCombatState';
import type { Enemy } from './useCombatState';
import { useCombatAnimations } from './useCombatAnimations';
import CombatHUD from './CombatHUD';
import './CombatStage.css';

// Register for v8 JSX
extend({ Container, Graphics, Text, Sprite });

interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  onEnemyClick: () => void;
  onGoldEarned: (amount: number) => void;
  onWavesComplete: () => void;
  onZoneAdvance: (newZone: number) => void;
  onEntityKill?: (entityId: number) => void;
  textScale?: number;
  extraWavesMode?: boolean;
  autoProgress: boolean;
  onAutoProgressToggle: (val: boolean) => void;
  debugSuperClick?: boolean;
  narrativeProgressPct: number;
  playSFX?: (key: string, opts?: { pan?: number }) => void;
  reduceMotion?: boolean;
  rareSpawn?: { entity_id: number; canonical_name: string; entity_type_id: number; entity_family_id: number | null; base_hp: number; base_gold: number; sprite_key: string | null } | null;
}

interface InnerProps extends Props {
  width: number;
  height: number;
  enemyPool: Enemy[];
  waveCount: number;
  setWaveCount: React.Dispatch<React.SetStateAction<number>>;
  requiredWaves: number;
  clickHandlerRef: React.MutableRefObject<((ox: number, oy: number) => void) | null>;
}

// ── Inner component (runs inside PixiJS Application context) ─────────────
const CombatContent: React.FC<InnerProps> = ({
  session, gameConfigs, onEnemyClick, onGoldEarned, onEntityKill,
  width, height, enemyPool, waveCount, setWaveCount, requiredWaves,
  extraWavesMode, onWavesComplete, autoProgress, onAutoProgressToggle,
  clickHandlerRef, textScale = 1.0, debugSuperClick = false,
  playSFX, reduceMotion = false, rareSpawn, onZoneAdvance,
}) => {
  const classColors = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      damageText: style.getPropertyValue('--class-damage-text').trim() || '#ffffff',
      particleTint: style.getPropertyValue('--class-particle-tint').trim(),
      primary: style.getPropertyValue('--class-primary').trim() || '#aaaacc',
    };
  }, []);

  // ── Hooks ──────────────────────────────────────────────────────────────
  const combat = useCombatState({
    session, gameConfigs, enemyPool, waveCount, setWaveCount, requiredWaves,
    extraWavesMode, autoProgress, onWavesComplete, onZoneAdvance,
    onAutoProgressToggle, rareSpawn,
  });

  const anims = useCombatAnimations(reduceMotion);

  const autoTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── applyDamage (bridges combat state + animations) ────────────────────
  const applyDamage = useCallback((damage: number, type: 'normal' | 'crit' | 'auto' | 'burst', clickX?: number, clickY?: number) => {
    const enemyX = width * 0.5;
    const enemyY = height * 0.45;
    const spawnX = clickX ?? (enemyX + (Math.random() - 0.5) * 40);
    const spawnY = clickY ?? (enemyY + (Math.random() - 0.5) * 40);

    anims.addDmgNumber(spawnX, spawnY, formatNumber(damage), type);
    combat.setEnemy(prev => {
      if (!prev) return prev;
      const newHp = Math.max(0, prev.currentHp - damage);
      if (newHp <= 0) {
        const goldEarned = (prev.baseGold || 0) * session.goldDropMultiplier;
        onGoldEarned(goldEarned);
        if (prev.entityId) onEntityKill?.(prev.entityId);
        anims.addDeathParticles(
          enemyX, enemyY - 40,
          prev.isPrimal ? 0xffd700 : (classColors.particleTint ? hexToPixiTint(classColors.particleTint) : 0x444466),
        );
        playSFX?.('sfx_enemy_death', { pan: (enemyX / width) * 2 - 1 });
        combat.advanceWave();
        return null;
      }
      if (newHp / prev.maxHp < 0.1) anims.triggerShake();
      anims.triggerRecoil();
      return { ...prev, currentHp: newHp };
    });
    if (type === 'crit') anims.triggerHitFlash();
  }, [width, height, session.goldDropMultiplier, onGoldEarned, onEntityKill, combat.advanceWave, anims, classColors.particleTint, playSFX]);

  // ── Auto-DPS interval ──────────────────────────────────────────────────
  useEffect(() => {
    autoTickRef.current = setInterval(() => {
      const dps = ((session.autoDpsPerSecond || 0) + (session.autoUpgradeLevel || 0)) * (session.autoDpsMultiplier || 1) * (session.darkRitualMultiplier || 1);
      if (dps > 0) {
        anims.setAutoAttackActive(true);
        applyDamage(dps * (combat.configs.AUTO_DPS_TICK_MS / 1000), 'auto');
      }
    }, combat.configs.AUTO_DPS_TICK_MS);
    return () => { if (autoTickRef.current) clearInterval(autoTickRef.current); };
  }, [session.autoDpsPerSecond, session.autoUpgradeLevel, session.autoDpsMultiplier, session.darkRitualMultiplier, applyDamage, combat.configs.AUTO_DPS_TICK_MS]);

  // ── Click handler ──────────────────────────────────────────────────────
  const handleClick = useCallback((ox: number, oy: number) => {
    if (!combat.enemy) return;
    onEnemyClick();
    const now = Date.now();
    anims.clickTimesRef.current.push(now);
    anims.clickTimesRef.current = anims.clickTimesRef.current.filter(t => now - t < 1000);
    anims.setCps(anims.clickTimesRef.current.length);
    anims.addShockwave(ox, oy);

    const isCrit = Math.random() < combat.configs.CRIT_CHANCE;
    let damage = 0;
    if (debugSuperClick) {
      damage = combat.enemy.currentHp;
    } else {
      const baseClick = (session.characterStrength || 0) + (session.clickUpgradeLevel || 0);
      damage = (isCrit ? combat.configs.critMult : 1) * baseClick * (session.clickDmgMultiplier || 1) * (session.darkRitualMultiplier || 1);
    }

    const panValue = (ox / width) * 2 - 1;
    playSFX?.(isCrit ? 'sfx_crit' : 'sfx_click', { pan: panValue });
    anims.setPlayerAttackActive(true);
    applyDamage(damage, isCrit ? 'crit' : 'normal', ox, oy);
  }, [combat.enemy, session, combat.configs, applyDamage, onEnemyClick, debugSuperClick, playSFX, width, anims]);

  useEffect(() => { clickHandlerRef.current = handleClick; return () => { clickHandlerRef.current = null; }; }, [handleClick, clickHandlerRef]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <CombatHUD
      width={width} height={height} textScale={textScale} reduceMotion={reduceMotion}
      session={session} waveCount={waveCount} requiredWaves={requiredWaves}
      extraWavesMode={extraWavesMode} monstersPerZone={combat.configs.MONSTERS_PER_ZONE}
      enemy={combat.enemy} isFightingBoss={combat.isFightingBoss}
      enrageTimer={combat.enrageTimer} enemyState={combat.enemyState}
      onEnemyDeath={() => combat.setEnemyState('idle')}
      characterVisuals={combat.characterVisuals}
      dmgNumbers={anims.dmgNumbers} deathParticles={anims.deathParticles}
      shockwaves={anims.shockwaves} shake={anims.shake} recoil={anims.recoil}
      time={anims.time}
      playerAttackActive={anims.playerAttackActive} autoAttackActive={anims.autoAttackActive}
      onPlayerAttackComplete={() => anims.setPlayerAttackActive(false)}
      onAutoAttackComplete={() => anims.setAutoAttackActive(false)}
      handleChallengeBoss={combat.handleChallengeBoss}
      classColors={classColors}
    />
  );
};

// ── Outer wrapper (DOM + Application bootstrap) ──────────────────────────
const CombatStage: React.FC<Props> = (props) => {
  const [enemyPool, setEnemyPool] = useState<Enemy[]>([]);
  const [waveCount, setWaveCount] = useState(props.session.currentWave >= MONSTERS_PER_ZONE_DEFAULT ? MONSTERS_PER_ZONE_DEFAULT : props.session.currentWave);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [requiredWaves, setRequiredWaves] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickHandlerRef = useRef<((ox: number, oy: number) => void) | null>(null);

  // Preload asset definitions for enemy sprites when pool changes
  let assets: ReturnType<typeof useAssets> | null = null;
  try { assets = useAssets(); } catch { /* AssetProvider not mounted */ }

  useEffect(() => {
    if (!assets) return;
    const spriteKeys = enemyPool.map(e => e.spriteKey || (e as any).sprite_key).filter((k): k is string => !!k);
    if (spriteKeys.length > 0) assets.preloadBatch(spriteKeys);
  }, [enemyPool, assets]);

  useEffect(() => {
    const update = () => { if (containerRef.current) { const r = containerRef.current.getBoundingClientRect(); setDims({ w: Math.floor(r.width), h: Math.floor(r.height) }); } };
    update();
    const obs = new ResizeObserver(update); if (containerRef.current) obs.observe(containerRef.current);
    return () => { obs.disconnect(); };
  }, []);

  useEffect(() => {
    const waveDuration = Number(props.gameConfigs['wave_duration_seconds'] ?? 30);
    api.get(`/api/game/story/scenes/${props.session.sceneId}/narrative`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.total_estimated_seconds) {
          const waves = Math.max(1, Math.ceil(data.total_estimated_seconds / (waveDuration * 1.1)));
          setRequiredWaves(waves);
        }
      })
      .catch(() => {});
  }, [props.session.sceneId, props.gameConfigs]);

  useEffect(() => {
    api.get(`/api/game/story/scenes/${props.session.sceneId}/enemies?zone=${props.session.currentZone}`)
      .then(r => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.enemies) return;
        // Preload SVG sprite textures BEFORE setting pool — ensures textures
        // are cached before any EntityRenderer mounts (enemies die too fast otherwise)
        const spriteKeys = data.enemies
          .map((e: any) => e.sprite_key)
          .filter((k: string | null): k is string => !!k);
        if (spriteKeys.length > 0) await preloadEntitySprites(spriteKeys);
        setEnemyPool(data.enemies);
      });
  }, [props.session.sceneId, props.session.currentZone]);

  return (
    <div className="combat-stage-wrap" ref={containerRef} onClick={e => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      clickHandlerRef.current?.(e.clientX - r.left, e.clientY - r.top);
    }}>
      {dims.w > 0 && dims.h > 0 && (
        <Application width={dims.w} height={dims.h} background="#080810" antialias={true}>
          <CombatContent {...props} width={dims.w} height={dims.h} enemyPool={enemyPool} waveCount={waveCount} setWaveCount={setWaveCount} requiredWaves={requiredWaves} clickHandlerRef={clickHandlerRef} />
        </Application>
      )}
    </div>
  );
};

export default CombatStage;
