/**
 * CombatStage — PixiJS combat engine (v8).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import { 
  TextStyle, Assets, Texture, TilingSprite,
  Container, Graphics, Text
} from 'pixi.js';
import { api } from '../../../api';
import type { StorySession } from '../../GameContext';
import { zoneHp, zoneGold, formatNumber } from '../../utils/numbers';
import ParallaxBackground from './ParallaxBackground';
import './CombatStage.css';

// Register for v8 JSX
extend({ Container, Graphics, Text, TilingSprite });

const MONSTERS_PER_ZONE_DEFAULT = 10;
const BOSS_ZONE_INTERVAL_DEFAULT = 5;
const BOSS_ENRAGE_SECONDS_DEFAULT = 30;
const CRIT_CHANCE_DEFAULT = 0.02;
const PRIMAL_CHANCE_DEFAULT = 0.25;
const AUTO_DPS_TICK_MS_DEFAULT = 500;

interface Enemy {
  entityId: number | null;
  name: string;
  spriteKey: string | null;
  maxHp: number;
  currentHp: number;
  baseGold: number;
  isBoss: boolean;
  isPrimal: boolean;
  isFallback: boolean;
}

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  type: 'normal' | 'crit' | 'auto' | 'burst';
  alpha: number;
  vy: number;
}

interface CoinParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
}

interface DeathParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: number;
}

interface Shockwave {
  id: string;
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  onEnemyClick: () => void;
  onGoldEarned: (amount: number) => void;
  onWavesComplete: () => void;
  onZoneAdvance: (newZone: number) => void;
  textScale?: number;
  extraWavesMode?: boolean; 
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

const CombatContent: React.FC<InnerProps> = ({
  session, gameConfigs, onEnemyClick, onGoldEarned, onZoneAdvance,
  width, height, enemyPool, waveCount,
  setWaveCount, requiredWaves, extraWavesMode, onWavesComplete,
  clickHandlerRef, textScale = 1.0,
}) => {
  const MONSTERS_PER_ZONE = Number(gameConfigs['monsters_per_zone'] ?? MONSTERS_PER_ZONE_DEFAULT);
  const BOSS_ZONE_INTERVAL = Number(gameConfigs['boss_zone_interval'] ?? BOSS_ZONE_INTERVAL_DEFAULT);
  const BOSS_ENRAGE_SECONDS = Number(gameConfigs['boss_enrage_seconds'] ?? BOSS_ENRAGE_SECONDS_DEFAULT);
  const CRIT_CHANCE = Number(gameConfigs['crit_chance'] ?? CRIT_CHANCE_DEFAULT);
  const PRIMAL_CHANCE = Number(gameConfigs['primal_boss_chance'] ?? PRIMAL_CHANCE_DEFAULT);
  const AUTO_DPS_TICK_MS = Number(gameConfigs['auto_dps_tick_ms'] ?? AUTO_DPS_TICK_MS_DEFAULT);

  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [dmgNumbers, setDmgNumbers] = useState<DamageNumber[]>([]);
  const [coins, setCoins] = useState<CoinParticle[]>([]);
  const [deathParticles, setDeathParticles] = useState<DeathParticle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const [shake, setShake] = useState(0);
  const [recoil, setRecoil] = useState(0);
  const [hitFlash, setHitFlash] = useState(false);
  const [enrageTimer, setEnrageTimer] = useState(0);
  const [time, setTime] = useState(0);
  const [cps, setCps] = useState(0);
  const [autoProgress, setAutoProgress] = useState(true);
  
  const clickTimesRef = useRef<number[]>([]);
  const autoTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scalingFactor = Number(gameConfigs['hp_scaling_factor'] ?? 1.55);
  const critMult = Number(gameConfigs['crit_multiplier'] ?? 2.0);

  const triggerShake = useCallback(() => { setShake(1); setTimeout(() => setShake(0), 400); }, []);
  const triggerRecoil = useCallback(() => { setRecoil(1); setTimeout(() => setRecoil(0), 150); }, []);
  const triggerHitFlash = useCallback(() => { setHitFlash(true); setTimeout(() => setHitFlash(false), 80); }, []);

  const spawnEnemy = useCallback((pool: Enemy[], zone: number, waveNum: number) => {
    const monsterIndex = waveNum % (MONSTERS_PER_ZONE + 1);
    const isMiniBoss = monsterIndex === MONSTERS_PER_ZONE; 
    const isBossZone = zone % BOSS_ZONE_INTERVAL === 0;
    const isBossWave = isMiniBoss && isBossZone;
    const isPrimal = isBossWave && Math.random() < PRIMAL_CHANCE;
    
    const totalLevel = (zone - 1) * (MONSTERS_PER_ZONE + 1) + monsterIndex + 1;
    const hp = zoneHp(totalLevel, scalingFactor);
    const gold = zoneGold(totalLevel) * (isBossWave ? 10 : isMiniBoss ? 3 : 1) * (isPrimal ? 3 : 1);

    if (pool.length > 0) {
      let poolToUse = pool;
      if (isBossWave) poolToUse = pool.filter(e => e.role === 'boss' || e.isBoss);
      else if (isMiniBoss) poolToUse = pool.filter(e => e.role === 'mini_boss');
      if (poolToUse.length === 0) poolToUse = pool;

      const template = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      setEnemy({
        ...template,
        name: template.name || template.canonical_name || 'UNKNOWN ENTITY',
        maxHp: hp, currentHp: hp, baseGold: gold, isBoss: isBossWave || isMiniBoss, isPrimal, isFallback: false
      });
    } else {
      setEnemy({
        entityId: null,
        name: isBossWave ? (isPrimal ? 'PRIMAL WRAITH' : 'SHADOW BOSS') : isMiniBoss ? 'MINI BOSS' : 'SHADOW WRAITH',
        spriteKey: null, maxHp: hp, currentHp: hp, baseGold: gold, isBoss: isBossWave || isMiniBoss, isPrimal, isFallback: true
      });
    }
    if (isBossWave || isMiniBoss) setEnrageTimer(BOSS_ENRAGE_SECONDS);
  }, [scalingFactor, MONSTERS_PER_ZONE, BOSS_ZONE_INTERVAL, PRIMAL_CHANCE, BOSS_ENRAGE_SECONDS]);

  const advanceWave = useCallback(() => {
    setWaveCount(prev => {
      const next = prev + 1;
      const monsterIndex = next % (MONSTERS_PER_ZONE + 1);
      const isZoneEnd = monsterIndex === 0;
      if (next === requiredWaves && !extraWavesMode) onWavesComplete();
      if (isZoneEnd) {
        if (autoProgress) onZoneAdvance(session.currentZone + 1);
        else {
          setTimeout(() => spawnEnemy(enemyPool, session.currentZone, 0), 600);
          return 0; 
        }
      }
      const currentZoneForSpawn = isZoneEnd ? session.currentZone + 1 : session.currentZone;
      setTimeout(() => spawnEnemy(enemyPool, currentZoneForSpawn, next), 600);
      return next;
    });
  }, [requiredWaves, extraWavesMode, enemyPool, spawnEnemy, onWavesComplete, onZoneAdvance, autoProgress, session.currentZone, MONSTERS_PER_ZONE]);

  const applyDamage = useCallback((damage: number, type: 'normal' | 'crit' | 'auto' | 'burst', clickX?: number, clickY?: number) => {
    const enemyX = width * 0.5;
    const enemyY = height * 0.45;
    const spawnX = clickX ?? (enemyX + (Math.random() - 0.5) * 40);
    const spawnY = clickY ?? (enemyY + (Math.random() - 0.5) * 40);

    setDmgNumbers(prev => [...prev.slice(-12), { id: `${Date.now()}_${Math.random()}`, x: spawnX, y: spawnY, value: formatNumber(damage), type, alpha: 1.0, vy: -1.2 }]);
    setEnemy(prev => {
      if (!prev) return prev;
      const newHp = Math.max(0, prev.currentHp - damage);
      if (newHp <= 0) {
        const goldEarned = prev.baseGold * session.goldDropMultiplier;
        onGoldEarned(goldEarned);
        const count = Math.min(8, Math.max(2, Math.floor(Math.log10(goldEarned + 1))));
        setCoins(old => [...old.slice(-20), ...Array.from({ length: count }, (_, i) => ({ id: `c_${Date.now()}_${i}`, x: enemyX, y: enemyY, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 3, alpha: 1.0 }))]);
        setDeathParticles(old => [...old, ...Array.from({ length: 15 }, (_, i) => ({ id: `dp_${Date.now()}_${i}`, x: enemyX, y: enemyY - 40, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, alpha: 1.0, size: 2 + Math.random() * 4, color: prev.isPrimal ? 0xffd700 : 0x444466 }))]);
        advanceWave();
        return null;
      }
      if (newHp / prev.maxHp < 0.1) triggerShake();
      triggerRecoil();
      return { ...prev, currentHp: newHp };
    });
    if (type === 'crit') triggerHitFlash();
  }, [width, height, session.goldDropMultiplier, onGoldEarned, advanceWave, triggerShake, triggerRecoil, triggerHitFlash]);

  useEffect(() => { spawnEnemy(enemyPool, session.currentZone, waveCount); }, [enemyPool.length, session.currentZone, spawnEnemy]);

  useEffect(() => {
    autoTickRef.current = setInterval(() => {
      const dps = (session.autoDpsPerSecond + session.autoUpgradeLevel) * session.autoDpsMultiplier * session.darkRitualMultiplier;
      if (dps > 0) applyDamage(dps * (AUTO_DPS_TICK_MS / 1000), 'auto');
    }, AUTO_DPS_TICK_MS);
    return () => { if (autoTickRef.current) clearInterval(autoTickRef.current); };
  }, [session.autoDpsPerSecond, session.autoUpgradeLevel, session.autoDpsMultiplier, session.darkRitualMultiplier, applyDamage]);

  useEffect(() => {
    if (!enemy?.isBoss) return;
    enrageRef.current = setInterval(() => setEnrageTimer(prev => prev > 0 ? prev - 1 : 0), 1000);
    return () => { if (enrageRef.current) clearInterval(enrageRef.current); };
  }, [enemy?.isBoss]);

  const handleClick = useCallback((ox: number, oy: number) => {
    if (!enemy) return;
    onEnemyClick();
    const now = Date.now();
    clickTimesRef.current.push(now);
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 1000);
    setCps(clickTimesRef.current.length);
    setShockwaves(prev => [...prev.slice(-5), { id: `sw_${Date.now()}_${Math.random()}`, x: ox, y: oy, alpha: 0.6, radius: 5 }]);
    const isCrit = Math.random() < CRIT_CHANCE;
    const baseClick = session.characterStrength + session.clickUpgradeLevel;
    const damage = (isCrit ? critMult : 1) * baseClick * session.clickDmgMultiplier * session.darkRitualMultiplier;
    applyDamage(damage, isCrit ? 'crit' : 'normal', ox, oy);
  }, [enemy, session, critMult, applyDamage, onEnemyClick, CRIT_CHANCE]);

  useEffect(() => { clickHandlerRef.current = handleClick; return () => { clickHandlerRef.current = null; }; }, [handleClick, clickHandlerRef]);

  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(prev => prev + 0.05 * dt);
    const now = Date.now();
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 1000);
    const realCps = clickTimesRef.current.length;
    if (cps > realCps) setCps(prev => Math.max(realCps, prev - 0.1 * dt));
    setDmgNumbers(prev => prev.map(d => ({ ...d, y: d.y + d.vy * dt, alpha: d.alpha - 0.015 * dt })).filter(d => d.alpha > 0));
    setCoins(prev => prev.map(c => {
      const dx = 40 - c.x, dy = 20 - c.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) return { ...c, alpha: 0 };
      return { ...c, x: c.x + (dx / dist) * 14 * dt, y: c.y + (dy / dist) * 14 * dt, alpha: 1.0 };
    }).filter(c => c.alpha > 0));
    setDeathParticles(prev => prev.map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vx: p.vx * 0.96, vy: p.vy * 0.96, alpha: p.alpha - 0.03 * dt })).filter(p => p.alpha > 0));
    setShockwaves(prev => prev.map(s => ({ ...s, radius: s.radius + 4 * dt, alpha: s.alpha - 0.05 * dt })).filter(s => s.alpha > 0));
  });

  const floorY = height * 0.72;
  const enemyX = width * 0.5;
  const barW = 160;
  const barH = 10;

  const hpPct = enemy ? enemy.currentHp / enemy.maxHp : 0;
  const hpColor = hpPct > 0.5 ? 0x00cc44 : hpPct > 0.25 ? 0xffaa00 : 0xcc0000;
  const breathe = Math.sin(time) * 0.03, idleY = Math.cos(time * 0.7) * 3;
  const shakeX = shake ? (Math.random() - 0.5) * 6 : 0, shakeY = (shake ? (Math.random() - 0.5) * 4 : 0) + idleY;

  return (
    <pixiContainer sortableChildren={true}>
      <ParallaxBackground width={width} height={height} chapterId={session.chapterId} waveCount={waveCount} />
      
      {/* Floor */}
      <pixiGraphics zIndex={1} draw={g => {
        g.clear().rect(0, floorY, width, height - floorY).fill({ color: 0x0d0d1a });
        g.moveTo(0, floorY).lineTo(width, floorY).stroke({ width: 1, color: 0x22224a });
        const tileW = Math.max(40, width / 12);
        for (let x = -tileW; x < width + tileW; x += tileW) g.moveTo(x, floorY).lineTo(x, height).stroke({ width: 0.5, color: 0x111130, alpha: 0.4 });
        g.ellipse(enemyX, floorY, width * 0.22, height * 0.025).fill({ color: 0x0f0f26 }).stroke({ width: 1, color: 0x2a2a55, alpha: 0.8 });
      }} />

      {/* Enemy */}
      {enemy && (
        <pixiContainer x={enemyX + shakeX + (recoil ? -8 : 0)} y={floorY + shakeY} scale={{ x: 1 + breathe, y: 1 - breathe }} zIndex={10}>
          <pixiGraphics draw={g => { g.clear().ellipse(0, 0, 38, 9).fill({ color: 0x000000, alpha: 0.45 }); }} />
          <pixiGraphics draw={g => {
            const c = hitFlash ? 0xffffff : (enemy.isPrimal ? 0xffd700 : 0x2a2a4a);
            g.clear().circle(0, -70, 22).fill({ color: c, alpha: 0.9 }).rect(-18, -48, 36, 55).fill({ color: c, alpha: 0.85 });
            if (enemy.isBoss) g.moveTo(-14, -92).lineTo(-8, -105).lineTo(0, -96).lineTo(8, -105).lineTo(14, -92).fill({ color: enemy.isPrimal ? 0xffd700 : 0x8b0000 });
          }} />
          <pixiGraphics y={-120} draw={g => { g.clear().rect(-barW/2, 0, barW, barH).fill({ color: 0x222222 }).rect(-barW/2, 0, barW*hpPct, barH).fill({ color: hpColor }); }} />
          {enemy.isBoss && <pixiText text={`ENRAGE: ${enrageTimer}s`} y={-138} x={0} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#ff4400', fontWeight: 'bold' })} />}
        </pixiContainer>
      )}

      {/* VFX Layers */}
      <pixiContainer zIndex={18}>{deathParticles.map(p => <pixiGraphics key={p.id} x={p.x} y={p.y} alpha={p.alpha} draw={g => g.clear().rect(-p.size/2, -p.size/2, p.size, p.size).fill({ color: p.color })} />)}</pixiContainer>
      <pixiContainer zIndex={25}>{shockwaves.map(sw => <pixiGraphics key={sw.id} x={sw.x} y={sw.y} alpha={sw.alpha} draw={g => g.clear().circle(0, 0, sw.radius).stroke({ width: 2, color: 0xffffff })} />)}</pixiContainer>
      
      {/* UI Elements */}
      {enemy && <pixiText text={`${enemy.name}\n${formatNumber(enemy.currentHp)} / ${formatNumber(enemy.maxHp)}`} x={enemyX} y={floorY - 150} zIndex={11} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 11 * textScale, fill: enemy.isBoss ? '#ff6666' : '#aaaacc', align: 'center' })} />}
      <pixiContainer zIndex={20}>{dmgNumbers.map(dn => <pixiText key={dn.id} text={dn.value} x={dn.x} y={dn.y} alpha={dn.alpha} style={new TextStyle({ fontFamily: 'monospace', fontSize: (dn.type === 'crit' ? 20 : 14) * textScale, fill: dn.type === 'crit' ? '#ffcc00' : '#ffffff', stroke: { width: 2, color: '#000000' } })} />)}</pixiContainer>
      <pixiContainer zIndex={15}>{coins.map(c => <pixiGraphics key={c.id} x={c.x} y={c.y} alpha={c.alpha} draw={g => g.clear().circle(0, 0, 4).fill({ color: 0xffd700 })} />)}</pixiContainer>
      <pixiText text={extraWavesMode ? `Zone ${session.currentZone} | Total Waves: ${waveCount + 1}` : `Zone ${session.currentZone} | Monsters: ${MONSTERS_PER_ZONE + 1 - (waveCount % (MONSTERS_PER_ZONE + 1))} left`} x={8} y={8} zIndex={5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#666688' })} />
    </pixiContainer>
  );
};

const CombatStage: React.FC<Props> = (props) => {
  const [enemyPool, setEnemyPool] = useState<Enemy[]>([]);
  const [waveCount, setWaveCount] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [requiredWaves, setRequiredWaves] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickHandlerRef = useRef<((ox: number, oy: number) => void) | null>(null);

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
          setRequiredWaves(Math.max(10, Math.ceil(data.total_estimated_seconds / waveDuration)));
        }
      })
      .catch(() => {});
  }, [props.session.sceneId, props.gameConfigs]);

  useEffect(() => {
    api.get(`/api/game/story/scenes/${props.session.sceneId}/enemies?zone=${props.session.currentZone}`)
      .then(r => r.ok ? r.json() : null).then(data => { if (data?.enemies) setEnemyPool(data.enemies); });
  }, [props.session.sceneId, props.session.currentZone]);

  return (
    <div className="combat-stage-wrap" ref={containerRef} onClick={e => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      clickHandlerRef.current?.(e.clientX - r.left, e.clientY - r.top);
    }}>
      {dims.w > 0 && dims.h > 0 && (
        <Application 
          width={dims.w} 
          height={dims.h} 
          background="#080810" 
          antialias={true}
        >
          <CombatContent {...props} width={dims.w} height={dims.h} enemyPool={enemyPool} waveCount={waveCount} setWaveCount={setWaveCount} requiredWaves={requiredWaves} clickHandlerRef={clickHandlerRef} />
        </Application>
      )}
    </div>
  );
};

export default CombatStage;
