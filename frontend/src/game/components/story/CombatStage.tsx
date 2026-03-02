/**
 * CombatStage — PixiJS combat engine.
 *
 * Implements:
 *   - 10-monster zone structure (9 minions, boss every 5th zone)
 *   - HP scaling formula: 10 × (1.55^(zone-1) + zone - 1)
 *   - Click damage + Auto-DPS from session stats
 *   - HP bar with color shift (green→yellow→red) + shake at <10%
 *   - Floating damage numbers (white normal, yellow/large crit, blue auto)
 *   - Enemy sprite with Generic Shadow Sprite fallback
 *   - Parallax layered background
 *   - Interrupt zones for bosses (click N times)
 *   - "Additional enemies discovered!" for infinite waves
 *   - Primal boss (25% chance, extra gold glow)
 *   - Boss 30s enrage timer
 *   - Enemy Feedback: Idle breathing, hit recoil, death particle burst
 *   - UI Polish: Gold fly-path, Cursor shockwave, Combo Heat (CPS > 10)
 *   - Progression: Auto-advance toggle, Monsters-remaining counter, continuous wave increments
 *   - Failure: Reset to start of zone on boss enrage
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import {
  Container, Graphics, Text, TextStyle, Assets, Texture, TilingSprite as PixiTilingSprite
} from 'pixi.js';
import { api } from '../../../api';
import type { StorySession } from '../../GameContext';
import { zoneHp, zoneGold, formatNumber } from '../../utils/numbers';
import ParallaxBackground from './ParallaxBackground';
import './CombatStage.css';

extend({ Container, Graphics, Text, TilingSprite: PixiTilingSprite });

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
  targetX?: number;
  targetY?: number;
  isFlying?: boolean;
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
  extraWavesMode?: boolean; // Prop from parent (e.g. Farm Mode selected)
}

// ── Inner PixiJS Component ───────────────────────────────────────────────────
interface StageProps extends Props {
  width: number;
  height: number;
  enemyPool: Enemy[];
  waveCount: number;
  setWaveCount: React.Dispatch<React.SetStateAction<number>>;
  requiredWaves: number;
  clickHandlerRef: React.MutableRefObject<((ox: number, oy: number) => void) | null>;
}

const CombatContent: React.FC<StageProps> = ({
  session, gameConfigs, onEnemyClick, onGoldEarned, onZoneAdvance,
  width, height, enemyPool, waveCount,
  setWaveCount, requiredWaves, extraWavesMode, onWavesComplete,
  clickHandlerRef, textScale = 1.0,
}) => {
  // Driven by gameConfigs
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
  const [interruptClicks, setInterruptClicks] = useState(0);
  const [shakeFx, setShakeFx] = useState({ x: 0, y: 0 });
  const [floorScroll, setFloorScroll] = useState(0);
  const [time, setTime] = useState(0);
  const [cps, setCps] = useState(0);
  const [autoProgress, setAutoProgress] = useState(true);
  
  const clickTimesRef = useRef<number[]>([]);
  const autoTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enrageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scalingFactor = Number(gameConfigs['hp_scaling_factor'] ?? 1.55);
  const critMult = Number(gameConfigs['crit_multiplier'] ?? 2.0);

  const spawnEnemy = useCallback((pool: Enemy[], zone: number, waveNum: number) => {
    const monsterIndex = waveNum % MONSTERS_PER_ZONE;
    const isBossWave = (monsterIndex + 1) === MONSTERS_PER_ZONE && zone % BOSS_ZONE_INTERVAL === 0;
    const isPrimal = isBossWave && Math.random() < PRIMAL_CHANCE;
    const hp = zoneHp(zone, scalingFactor);
    const gold = zoneGold(zone) * (isBossWave ? 10 : 1) * (isPrimal ? 3 : 1);

    if (pool.length > 0 && !isBossWave) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      setEnemy({
        ...template,
        maxHp: hp,
        currentHp: hp,
        baseGold: gold,
        isBoss: isBossWave,
        isPrimal,
      });
    } else {
      setEnemy({
        entityId: null,
        name: isBossWave ? (isPrimal ? 'PRIMAL WRAITH' : 'SHADOW BOSS') : 'SHADOW WRAITH',
        spriteKey: null,
        maxHp: hp,
        currentHp: hp,
        baseGold: gold,
        isBoss: isBossWave,
        isPrimal,
        isFallback: true,
      });
    }

    if (isBossWave) {
      setEnrageTimer(BOSS_ENRAGE_SECONDS);
      setInterruptClicks(0);
    }
  }, [scalingFactor, MONSTERS_PER_ZONE, BOSS_ZONE_INTERVAL, PRIMAL_CHANCE, BOSS_ENRAGE_SECONDS]);

  // Spawn first enemy when pool is ready
  useEffect(() => {
    if (enemyPool.length >= 0) {
      spawnEnemy(enemyPool, session.currentZone, waveCount);
    }
  }, [enemyPool.length, session.currentZone, spawnEnemy]);

  // Auto-DPS tick
  useEffect(() => {
    autoTickRef.current = setInterval(() => {
      const baseDps = session.autoDpsPerSecond + session.autoUpgradeLevel;
      const dps = baseDps * session.autoDpsMultiplier * session.darkRitualMultiplier;
      if (dps <= 0) return;
      const damage = dps * (AUTO_DPS_TICK_MS / 1000);
      applyDamage(damage, 'auto');
    }, AUTO_DPS_TICK_MS);
    return () => { if (autoTickRef.current) clearInterval(autoTickRef.current); };
  }, [session.autoDpsPerSecond, session.autoUpgradeLevel, session.autoDpsMultiplier, session.darkRitualMultiplier, AUTO_DPS_TICK_MS, applyDamage]);

  // Boss enrage countdown
  useEffect(() => {
    if (!enemy?.isBoss) return;
    enrageRef.current = setInterval(() => {
      setEnrageTimer(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => { if (enrageRef.current) clearInterval(enrageRef.current); };
  }, [enemy?.isBoss]);

  const applyDamage = useCallback((damage: number, type: 'normal' | 'crit' | 'auto' | 'burst', clickX?: number, clickY?: number) => {
    const enemyX = width * 0.5;
    const enemyY = height * 0.45;
    
    // Default to center if no click coords (e.g. auto-DPS)
    const spawnX = clickX ?? (enemyX + (Math.random() - 0.5) * 40);
    const spawnY = clickY ?? (enemyY + (Math.random() - 0.5) * 40);

    setDmgNumbers(prev => [
      ...prev.slice(-12),
      {
        id: `${Date.now()}_${Math.random()}`,
        x: spawnX,
        y: spawnY,
        value: formatNumber(damage),
        type,
        alpha: 1.0,
        vy: -1.2,
      },
    ]);

    setEnemy(prev => {
      if (!prev) return prev;
      const newHp = Math.max(0, prev.currentHp - damage);
      if (newHp <= 0) {
        // Kill
        const goldEarned = prev.baseGold * session.goldDropMultiplier;
        onGoldEarned(goldEarned);
        spawnCoins(enemyX, enemyY, goldEarned);
        spawnDeathParticles(enemyX, enemyY, prev.isPrimal ? 0xffd700 : 0x444466);
        advanceWave();
        return null;
      }
      const hpPct = newHp / prev.maxHp;
      if (hpPct < 0.1) triggerShake();
      triggerRecoil();
      return { ...prev, currentHp: newHp };
    });

    if (type === 'crit') triggerHitFlash();
  }, [width, height, session.goldDropMultiplier, onGoldEarned]);

  const advanceWave = useCallback(() => {
    setWaveCount(prev => {
      const next = prev + 1;
      const isZoneEnd = (next % MONSTERS_PER_ZONE) === 0;

      // Only notify parent if NOT already in extra/farm mode, and exactly on the required count
      const isLastRequired = next === requiredWaves && !extraWavesMode;
      if (isLastRequired) {
        onWavesComplete();
      }

      if (isZoneEnd) {
        if (autoProgress) {
          onZoneAdvance(session.currentZone + 1);
        } else {
          // Farm current zone monster repeatedly
          setTimeout(() => spawnEnemy(enemyPool, session.currentZone, 0), 600);
          return 0; // stay at start of zone wave loop
        }
      }

      const newZone = Math.floor(next / MONSTERS_PER_ZONE) + 1;
      setTimeout(() => spawnEnemy(enemyPool, newZone, next), 600);
      return next;
    });
  }, [requiredWaves, extraWavesMode, enemyPool, spawnEnemy, onWavesComplete, onZoneAdvance, autoProgress, session.currentZone, MONSTERS_PER_ZONE]);

  const failZone = useCallback(() => {
    // Reset to start of current zone
    setWaveCount(0);
    setDmgNumbers(prev => [...prev, {
      id: `fail_${Date.now()}`, x: width/2, y: height/2 - 40, value: 'ZONE FAILED', type: 'burst', alpha: 1.0, vy: -0.5
    }]);
    setTimeout(() => spawnEnemy(enemyPool, session.currentZone, 0), 1000);
  }, [enemyPool, session.currentZone, spawnEnemy, width, height]);

  // Check for failure
  useEffect(() => {
    if (enemy?.isBoss && enrageTimer === 0) {
      failZone();
    }
  }, [enrageTimer, enemy?.isBoss, failZone]);

  const triggerShake = () => {
    setShake(1);
    setTimeout(() => setShake(0), 400);
  };

  const triggerRecoil = () => {
    setRecoil(1);
    setTimeout(() => setRecoil(0), 150);
  };

  const triggerHitFlash = () => {
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 80);
  };

  const spawnCoins = (x: number, y: number, goldAmount: number) => {
    const count = Math.min(8, Math.max(2, Math.floor(Math.log10(goldAmount + 1))));
    const newCoins: CoinParticle[] = Array.from({ length: count }, (_, i) => ({
      id: `coin_${Date.now()}_${i}`,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -3 - Math.random() * 3,
      alpha: 1.0,
    }));
    setCoins(prev => [...prev.slice(-20), ...newCoins]);
  };

  const spawnDeathParticles = (x: number, y: number, color: number) => {
    const newParts: DeathParticle[] = Array.from({ length: 15 }, (_, i) => ({
      id: `dp_${Date.now()}_${i}`,
      x,
      y: y - 40,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      alpha: 1.0,
      size: 2 + Math.random() * 4,
      color,
    }));
    setDeathParticles(prev => [...prev, ...newParts]);
  };

  // Handle click on enemy
  const handleClick = useCallback((ox: number, oy: number) => {
    if (!enemy) return;
    onEnemyClick();

    // Track CPS
    const now = Date.now();
    clickTimesRef.current.push(now);
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 1000);
    setCps(clickTimesRef.current.length);

    // Spawn shockwave
    const newSw: Shockwave = {
      id: `sw_${Date.now()}_${Math.random()}`,
      x: ox,
      y: oy,
      alpha: 0.6,
      radius: 5,
    };
    setShockwaves(prev => [...prev.slice(-5), newSw]);

    const isCrit = Math.random() < CRIT_CHANCE;
    const baseClick = session.characterStrength + session.clickUpgradeLevel;
    const baseDmg = baseClick * session.clickDmgMultiplier * session.darkRitualMultiplier;
    const damage = isCrit ? baseDmg * critMult : baseDmg;
    applyDamage(damage, isCrit ? 'crit' : 'normal', ox, oy);
    if (enemy.isBoss) setInterruptClicks(prev => prev + 1);
    setShakeFx({ x: ox, y: oy });
    setTimeout(() => setShakeFx({ x: 0, y: 0 }), 200);
  }, [enemy, session, critMult, applyDamage, onEnemyClick, CRIT_CHANCE]);

  // Keep ref up-to-date
  useEffect(() => {
    clickHandlerRef.current = handleClick;
    return () => { clickHandlerRef.current = null; };
  }, [handleClick, clickHandlerRef]);

  // PixiJS animation ticker
  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(prev => prev + 0.05 * dt);

    // Decay CPS visual
    const now = Date.now();
    clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 1000);
    const realCps = clickTimesRef.current.length;
    if (cps > realCps) setCps(prev => Math.max(realCps, prev - 0.1 * dt));

    // Animate floor scroll
    const targetFloor = waveCount * 300;
    setFloorScroll(prev => prev + (targetFloor - prev) * 0.1 * dt);

    setDmgNumbers(prev =>
      prev.map(d => ({ ...d, y: d.y + d.vy * dt, alpha: d.alpha - 0.015 * dt }))
          .filter(d => d.alpha > 0)
    );
    setCoins(prev =>
      prev.map(c => {
        if (!c.isFlying) {
          const nextY = c.y + c.vy * dt;
          const nextVy = c.vy + 0.15 * dt;
          const nextAlpha = c.alpha - 0.005 * dt;
          if (nextAlpha < 0.95) {
            return { ...c, isFlying: true, targetX: 40, targetY: 20 };
          }
          return { ...c, y: nextY, vy: nextVy, x: c.x + c.vx * dt, alpha: nextAlpha };
        }
        const dx = (c.targetX || 0) - c.x;
        const dy = (c.targetY || 0) - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) return { ...c, alpha: 0 };
        return {
          ...c,
          x: c.x + (dx / dist) * 14 * dt,
          y: c.y + (dy / dist) * 14 * dt,
          alpha: 1.0,
        };
      }).filter(c => c.alpha > 0)
    );
    setDeathParticles(prev =>
      prev.map(p => ({
        ...p,
        x: p.x + p.vx * dt,
        y: p.y + p.vy * dt,
        vx: p.vx * 0.96,
        vy: p.vy * 0.96,
        alpha: p.alpha - 0.03 * dt,
      })).filter(p => p.alpha > 0)
    );
    setShockwaves(prev =>
      prev.map(s => ({
        ...s,
        radius: s.radius + 4 * dt,
        alpha: s.alpha - 0.05 * dt,
      })).filter(s => s.alpha > 0)
    );
  });

  const floorY = height * 0.72;

  if (!enemy) {
    return (
      <pixiGraphics
        draw={(g) => {
          g.clear().rect(0, 0, width, height).fill({ color: 0x06060f });
        }}
      />
    );
  }

  const hpPct = enemy.currentHp / enemy.maxHp;
  const hpColor = hpPct > 0.5 ? 0x00cc44 : hpPct > 0.25 ? 0xffaa00 : 0xcc0000;
  
  const breathe = Math.sin(time) * 0.03;
  const idleY = Math.cos(time * 0.7) * 3;
  const shakeX = shake ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = (shake ? (Math.random() - 0.5) * 4 : 0) + idleY;
  const recoilX = recoil ? -8 : 0;

  const enemyX = width * 0.5;
  const barW = 160;
  const barH = 10;

  const heatAlpha = Math.min(0.4, Math.max(0, (cps - 10) / 20));

  return (
    <pixiContainer sortableChildren={true}>
      <ParallaxBackground
        width={width}
        height={height}
        chapterId={session.chapterId}
        waveCount={waveCount}
      />

      <pixiGraphics
        zIndex={1}
        draw={(g) => {
          g.clear();
          g.rect(0, floorY, width, height - floorY).fill({ color: 0x0d0d1a });
          g.moveTo(0, floorY).lineTo(width, floorY).stroke({ width: 1, color: 0x22224a });
          const tileW = Math.max(40, width / 12);
          const offset = floorScroll % tileW;
          for (let x = -tileW; x < width + tileW; x += tileW) {
            const rx = x - offset;
            g.moveTo(rx, floorY).lineTo(rx, height).stroke({ width: 0.5, color: 0x111130, alpha: 0.4 });
          }
          const platW = width * 0.22;
          g.ellipse(enemyX, floorY, platW, height * 0.025).fill({ color: 0x0f0f26 });
          g.ellipse(enemyX, floorY, platW, height * 0.025)
           .stroke({ width: 1, color: 0x2a2a55, alpha: 0.8 });
          g.ellipse(enemyX, floorY, platW * 0.55, height * 0.012)
           .stroke({ width: 0.5, color: 0x3a3a88, alpha: 0.5 });
        }}
      />

      {heatAlpha > 0 && (
        <pixiGraphics
          zIndex={30}
          draw={(g) => {
            g.clear();
            g.rect(0, 0, width, height)
             .stroke({ width: 40, color: 0xff3300, alpha: heatAlpha });
          }}
        />
      )}

      <pixiContainer x={enemyX + shakeX + recoilX} y={floorY + shakeY} scale={{ x: 1 + breathe, y: 1 - breathe }} zIndex={10}>
        <pixiGraphics
          draw={(g) => {
            g.clear().ellipse(0, 0, 38, 9).fill({ color: 0x000000, alpha: 0.45 });
          }}
        />
        <pixiGraphics
          draw={(g) => {
            g.clear();
            const flash = hitFlash ? 0xffffff : (enemy.isPrimal ? 0xffd700 : 0x2a2a4a);
            g.circle(0, -70, 22).fill({ color: flash, alpha: 0.9 });
            g.rect(-18, -48, 36, 55).fill({ color: flash, alpha: 0.85 });
            if (enemy.isBoss) {
              g.moveTo(-14, -92).lineTo(-8, -105).lineTo(0, -96)
               .lineTo(8, -105).lineTo(14, -92).lineTo(-14, -92)
               .fill({ color: enemy.isPrimal ? 0xffd700 : 0x8b0000 });
            }
            if (enemy.isPrimal) {
              g.circle(0, -40, 55).stroke({ width: 2, color: 0xffd700, alpha: 0.4 });
            }
          }}
        />
        <pixiGraphics
          y={-120}
          draw={(g) => {
            g.clear();
            const bx = -barW / 2;
            const by = 0;
            g.rect(bx, by, barW, barH).fill({ color: 0x222222 });
            g.rect(bx, by, barW * hpPct, barH).fill({ color: hpColor });
            if (hpPct < 0.1) {
              g.rect(bx, by, barW, barH).stroke({ width: 1.5, color: 0xff2200, alpha: 0.8 });
            }
          }}
        />
        {enemy.isBoss && (
          <pixiText
            text={`ENRAGE: ${enrageTimer}s`}
            y={-138}
            x={0}
            anchor={{ x: 0.5, y: 0 }}
            style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#ff4400', fontWeight: 'bold' })}
          />
        )}
        {enemy.isBoss && enrageTimer <= 10 && (
          <pixiGraphics
            draw={(g) => {
              g.clear().circle(0, 0, 50).stroke({ width: 3, color: 0xff0000, alpha: 0.7 });
            }}
          />
        )}
      </pixiContainer>

      <pixiContainer zIndex={18}>
        {deathParticles.map(p => (
          <pixiGraphics
            key={p.id}
            x={p.x}
            y={p.y}
            alpha={p.alpha}
            draw={(g) => {
              g.clear().rect(-p.size/2, -p.size/2, p.size, p.size).fill({ color: p.color });
            }}
          />
        ))}
      </pixiContainer>

      <pixiContainer zIndex={25}>
        {shockwaves.map(sw => (
          <pixiGraphics
            key={sw.id}
            x={sw.x}
            y={sw.y}
            alpha={sw.alpha}
            draw={(g) => {
              g.clear().circle(0, 0, sw.radius).stroke({ width: 2, color: 0xffffff });
            }}
          />
        ))}
      </pixiContainer>

      <pixiText
        text={`${enemy.name}\n${formatNumber(enemy.currentHp)} / ${formatNumber(enemy.maxHp)}`}
        x={enemyX}
        y={floorY - 150}
        zIndex={11}
        anchor={{ x: 0.5, y: 0 }}
        style={new TextStyle({
          fontFamily: 'monospace',
          fontSize: 11 * textScale,
          fill: enemy.isBoss ? '#ff6666' : '#aaaacc',
          align: 'center',
          fontWeight: enemy.isBoss ? 'bold' : 'normal',
        })}
      />

      <pixiContainer zIndex={20}>
        {dmgNumbers.map(dn => (
          <pixiText
            key={dn.id}
            text={dn.value}
            x={dn.x}
            y={dn.y}
            alpha={dn.alpha}
            style={new TextStyle({
              fontFamily: 'monospace',
              fontSize: (dn.type === 'crit' ? 20 : dn.type === 'auto' ? 12 : 14) * textScale,
              fill: dn.type === 'crit' ? '#ffcc00'
                  : dn.type === 'auto' ? '#4488ff'
                  : dn.type === 'burst' ? '#ff4400'
                  : '#ffffff',
              fontWeight: dn.type === 'crit' ? 'bold' : 'normal',
              stroke: { width: 2, color: '#000000' },
            })}
          />
        ))}
      </pixiContainer>

      <pixiContainer zIndex={15}>
        {coins.map(c => (
          <pixiGraphics
            key={c.id}
            x={c.x}
            y={c.y}
            alpha={c.alpha}
            draw={(g) => {
              g.clear().circle(0, 0, 4).fill({ color: 0xffd700 });
            }}
          />
        ))}
      </pixiContainer>

      <pixiText
        text={extraWavesMode 
          ? `Zone ${session.currentZone} | Total Waves: ${waveCount + 1}`
          : `Zone ${session.currentZone} | Monsters: ${MONSTERS_PER_ZONE - (waveCount % MONSTERS_PER_ZONE)} left`
        }
        x={8}
        y={8}
        zIndex={5}
        style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#666688' })}
      />

      {/* Auto-Progress Toggle */}
      <pixiContainer 
        x={8} y={24} zIndex={5} 
        interactive={true} 
        cursor="pointer"
        pointertap={() => setAutoProgress(!autoProgress)}
      >
        {/* Toggle Box */}
        <pixiGraphics
          draw={(g) => {
            g.clear();
            // Outer Border
            g.rect(0, 0, 14, 14).stroke({ width: 1, color: 0x444466 });
            // Inner Fill
            if (autoProgress) {
              g.rect(2, 2, 10, 10).fill({ color: 0x00cc44 });
            } else {
              g.rect(2, 2, 10, 10).fill({ color: 0x222222 });
            }
          }}
        />
        <pixiText
          text="AUTO-PROGRESS"
          x={20}
          y={1}
          style={new TextStyle({ 
            fontFamily: 'monospace', 
            fontSize: 10 * (textScale || 1.0), 
            fill: autoProgress ? '#ffffff' : '#666688',
            fontWeight: autoProgress ? 'bold' : 'normal'
          })}
        />
      </pixiContainer>

      {extraWavesMode && (
        <pixiText
          text="ADDITIONAL ENEMIES DISCOVERED!"
          x={width / 2}
          y={height - 24}
          zIndex={5}
          anchor={{ x: 0.5, y: 0 }}
          style={new TextStyle({ fontFamily: 'monospace', fontSize: 11 * textScale, fill: '#ff8800', fontWeight: 'bold' })}
        />
      )}
    </pixiContainer>
  );
};

const CombatStage: React.FC<Props> = (props) => {
  const { session, gameConfigs, extraWavesMode } = props;
  const MONSTERS_PER_ZONE = Number(gameConfigs['monsters_per_zone'] ?? 10);

  const [enemyPool, setEnemyPool] = useState<Enemy[]>([]);
  const [waveCount, setWaveCount] = useState(0);
  const [localExtraMode, setLocalExtraMode] = useState(false);
  const [dims, setDims] = useState({ w: 600, h: 340 });
  const requiredWavesRef = useRef(10);

  // Merge parent prop and local state
  const isExtra = extraWavesMode || localExtraMode;

  useEffect(() => {
    const waveDuration = Number(gameConfigs['wave_duration_seconds'] ?? 30);
    api.get(`/api/game/story/scenes/${session.sceneId}/narrative`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.total_estimated_seconds) {
          requiredWavesRef.current = Math.max(
            MONSTERS_PER_ZONE,
            Math.ceil(data.total_estimated_seconds / waveDuration)
          );
        }
      })
      .catch(() => {});
  }, [session.sceneId, gameConfigs, MONSTERS_PER_ZONE]);

  useEffect(() => {
    api.get(`/api/game/story/scenes/${session.sceneId}/enemies?zone=${session.currentZone}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.enemies) setEnemyPool(data.enemies);
      })
      .catch(() => {});
  }, [session.sceneId, session.currentZone]);

  const handleWavesComplete = useCallback(() => {
    setLocalExtraMode(true);
    props.onWavesComplete();
  }, [props]);

  const containerRef = useRef<HTMLDivElement>(null);
  const clickHandlerRef = useRef<((ox: number, oy: number) => void) | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Force a sync update on mount
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDims({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
    }

    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDims({ w: Math.floor(entry.contentRect.width), h: Math.floor(entry.contentRect.height) });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="combat-stage-wrap"
      ref={containerRef}
      onClick={e => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        if (relX > dims.w * 0.1 && relY < dims.h * 0.9) {
          clickHandlerRef.current?.(relX, relY);
        }
      }}
    >
      {dims.w > 0 && dims.h > 0 && (
        <Application width={dims.w} height={dims.h} background="#080810" antialias>
          <CombatContent
            {...props}
            width={dims.w}
            height={dims.h}
            enemyPool={enemyPool}
            waveCount={waveCount}
            setWaveCount={setWaveCount}
            requiredWaves={requiredWavesRef.current}
            extraWavesMode={isExtra}
            onWavesComplete={handleWavesComplete}
            clickHandlerRef={clickHandlerRef}
          />
        </Application>
      )}
    </div>
  );
};

export default CombatStage;
