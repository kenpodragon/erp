import React, { useMemo, useState, useEffect } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import { Container, Graphics, Text, TextStyle, TilingSprite, Assets, Texture, Sprite, ColorMatrixFilter } from 'pixi.js';
import './BottomAnimatedBanner.css';
import BannerBackground from './BannerBackground';
import { useGame } from '../GameContext';
import { api } from '../../api';

// Register Pixi elements for use in React JSX
extend({ Container, Graphics, Text, TilingSprite, Sprite });

interface BannerEntity {
  id: string;
  type: 'player' | 'enemy';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  stats: any;
  spriteKey: string;
  name: string;
  isDead: boolean;
  hueShift?: number;
  level?: number;
  scaleVariation?: number;
}

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  isCrit: boolean;
  alpha: number;
}

/**
 * Inner component for the layered player character (Paper-doll)
 */
const PlayerPaperDoll: React.FC<{ 
  player: BannerEntity, 
  textures: Record<string, Texture>,
  visualScale: number,
  time: number,
  speedMult: number
}> = ({ player, textures, visualScale, time, speedMult }) => {
  
  // Growth Scaling: Visual indicators for Level 1-99 benchmarks
  const level = player.level || 1;
  const growthScale = 1.0 + (level / 200);
  const finalScale = visualScale * growthScale;

  // Level-based Glow (Aura)
  const getAuraColor = (lvl: number) => {
    if (lvl >= 81) return 0x00ffff; // Radiant/Cosmic
    if (lvl >= 61) return 0xffd700; // Gold
    if (lvl >= 41) return 0xc0c0c0; // Silver
    if (lvl >= 21) return 0xcd7f32; // Bronze
    return null;
  };
  const auraColor = getAuraColor(level);

  return (
    <pixiContainer 
      zIndex={5}
      x={player.x} 
      y={player.y}
      scale={{ 
        x: finalScale, 
        y: player.stats.animState === 'idle_stretch' ? finalScale + Math.sin(time * 0.05) * 0.1 : finalScale 
      }}
      skew={{ 
        x: player.stats.animState === 'walking' ? Math.sin(time * 0.1 * speedMult) * 0.05 : 0, 
        y: player.stats.animState === 'walking' ? Math.cos(time * 0.1 * speedMult) * 0.02 : 0 
      }}
    >
      {/* Level Aura */}
      {auraColor !== null && (
        <pixiGraphics
          draw={(g) => {
            const pulse = 0.4 + Math.abs(Math.sin(time * 0.1)) * 0.2;
            g.clear()
             .circle(0, -15, 20)
             .fill({ color: auraColor, alpha: pulse });
          }}
        />
      )}

      {/* Layer 1: Base Body */}
      {textures.player ? (
        <pixiSprite texture={textures.player} anchor={{ x: 0.5, y: 1.0 }} />
      ) : (
        <pixiGraphics draw={g => { g.clear().circle(0, -15, 15).fill({ color: 0xdaa520 }); }} />
      )}

      {/* Layer 2: Armor Slot (Placeholder fallback) */}
      <pixiGraphics draw={g => {
        g.clear();
        // Only draw if level > 10 as a "progression" indicator
        if (level > 10) {
          g.rect(-8, -25, 16, 12)
           .fill({ color: 0x555555, alpha: 0.6 });
        }
      }} />

      {/* Layer 3: Head Slot (Placeholder fallback) */}
      <pixiGraphics draw={g => {
        g.clear();
        if (level > 30) {
          g.circle(0, -30, 6)
           .fill({ color: 0x888888, alpha: 0.8 });
        }
      }} />

      {/* Layer 4: Weapon Slot (Placeholder fallback) */}
      <pixiGraphics draw={g => {
        g.clear();
        if (level > 5) {
          const weaponY = -15 + Math.sin(time * 0.2) * 2;
          g.moveTo(10, weaponY)
           .lineTo(10, weaponY - 20)
           .stroke({ width: 2, color: 0xaaaaaa });
        }
      }} />
    </pixiContainer>
  );
};

/**
 * Inner content component to access Pixi hooks like useTick
 */
const BannerContent: React.FC<{ character: any }> = ({ character }) => {
  const { state } = useGame();
  const width = window.innerWidth;
  const height = 150;
  const groundY = 75; 

  // ── Asset Loading & Enemy Pool ──────────────────────────────────
  const [textures, setTextures] = useState<Record<string, Texture>>({});
  const [enemyPool, setEnemyPool] = useState<any[]>([]);
  
  useEffect(() => {
    const loadAssets = async () => {
      const paths = {
        player: '/assets/game/classes/base_vessel.png',
        enemy_sludge: '/assets/game/enemies/enemy_sludge.png',
        enemy_voidling: '/assets/game/enemies/enemy_voidling.png',
        enemy_guardian: '/assets/game/enemies/enemy_guardian.png',
        enemy_remnant: '/assets/game/enemies/enemy_remnant.png',
      };
      const loaded: any = {};
      for (const [key, path] of Object.entries(paths)) {
        try {
          loaded[key] = await Assets.load(path);
        } catch (e) {
          console.error(`Banner: Failed to load asset ${path}`, e);
        }
      }
      setTextures(loaded);
    };

    const fetchPool = async () => {
      try {
        const res = await api.get('/api/game/enemies/encountered');
        if (res.ok) setEnemyPool(await res.json());
      } catch (err) {
        console.error('Banner: Failed to fetch enemy pool', err);
      }
    };

    loadAssets();
    fetchPool();
  }, []);

  // ── Local State ───────────────────────────────────────────────────
  const [player, setPlayer] = useState<BannerEntity & { animState: string, vengeance: boolean }>({
    id: 'player',
    type: 'player',
    x: 100,
    y: groundY,
    hp: 100,
    maxHp: 100,
    stats: { 
      strength: character?.strength || 10, 
      agility: character?.agility || 5, 
      intelligence: character?.intelligence || 5 
    },
    level: character?.level || 1,
    spriteKey: 'player',
    name: character?.character_name || 'PLAYER',
    isDead: false,
    animState: 'walking',
    vengeance: false
  });

  const [enemies, setEnemies] = useState<BannerEntity[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [waveTimer, setWaveTimer] = useState(0);
  const [idleTimer, setIdleTimer] = useState(0);
  const [deathTimer, setDeathTimer] = useState(0);
  const [focusActive, setFocusActive] = useState(false);
  const [time, setTime] = useState(0);

  // Derived Multipliers
  const visualScale = useMemo(() => 1.2 + (player.stats.strength / 200), [player.stats.strength]);
  const speedMult = useMemo(() => 1.0 + (player.stats.agility / 50), [player.stats.agility]);
  const vfxIntensity = useMemo(() => player.stats.intelligence / 5, [player.stats.intelligence]);

  // ── Physics & Combat Loop ─────────────────────────────────────────
  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(t => t + dt);
    
    setDamageNumbers(prev => prev.map(num => ({
      ...num,
      y: num.y - (1.0 * dt),
      alpha: num.alpha - (0.02 * dt)
    })).filter(num => num.alpha > 0));

    const nearestEnemy = enemies.length > 0 ? enemies[0] : null;
    const dist = nearestEnemy ? nearestEnemy.x - player.x : 9999;

    if (player.isDead) {
      setDeathTimer(prev => prev + dt);
      setScrollSpeed(0);
      if (deathTimer > 180) { 
        setPlayer(prev => ({ ...prev, isDead: false, hp: prev.maxHp, x: -100, vengeance: true, animState: 'walking' }));
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
      if (player.vengeance) setPlayer(prev => ({ ...prev, vengeance: false }));
    }

    let nextAnimState = 'walking';
    let moveX = 0;

    if (nearestEnemy && dist < 200) {
      nextAnimState = 'fighting';
      setScrollSpeed(0.1);
      if (dist < 60) {
        moveX = -0.5 * dt; 
        setPlayer(prev => {
          const newHp = prev.hp - (0.2 * dt);
          if (newHp <= 0) return { ...prev, isDead: true, hp: 0, animState: 'dead' };
          return { ...prev, hp: newHp };
        });
      } else {
        moveX = (player.vengeance ? 2.5 : 0.8) * dt * speedMult;
      }
    } else if (enemies.length === 0) {
      if (idleTimer > 180 && idleTimer < 360) { 
        const cycle = Math.floor(idleTimer / 180) % 4;
        const idles = ['idle_check', 'idle_stretch', 'idle_shine', 'idle_scan'];
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
      ...prev,
      animState: nextAnimState,
      x: Math.max(-100, Math.min(width * 0.4, prev.x + moveX)),
      y: groundY
    }));

    setEnemies(prev => prev.map(en => ({
      ...en,
      x: en.x - (1.5 + (1.5 * scrollSpeed)) * dt,
      y: groundY
    })).filter(en => en.x > -150));

    // Wave Spawning (Using real dynamic pool)
    if (enemies.length === 0 && Math.random() < (nextAnimState === 'walking' ? 0.05 : 0.01)) {
      const hueShift = Math.random() * 360;
      const scaleVar = 1.3 + Math.random() * 0.4;
      
      if (enemyPool.length > 0) {
        const template = enemyPool[Math.floor(Math.random() * enemyPool.length)];
        setEnemies([{
          id: `en_${Date.now()}`,
          type: 'enemy',
          x: width + 50,
          y: groundY,
          hp: template.gameplay_data?.base_hp || 50,
          maxHp: template.gameplay_data?.base_hp || 50,
          stats: template.gameplay_data?.stat_block || {},
          spriteKey: template.gameplay_data?.sprite_key || 'enemy_sludge',
          name: template.canonical_name.toUpperCase(),
          isDead: false,
          hueShift,
          scaleVariation: scaleVar
        }]);
      } else {
        // Hard fallback if pool is empty
        setEnemies([{
          id: `en_fallback_${Date.now()}`,
          type: 'enemy',
          x: width + 50,
          y: groundY,
          hp: 50,
          maxHp: 50,
          stats: {},
          spriteKey: 'enemy_sludge',
          name: 'SLUDGE',
          isDead: false,
          hueShift,
          scaleVariation: scaleVar
        }]);
      }
    }

    if (nearestEnemy && dist < 80) {
      setEnemies(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const isCrit = Math.random() < 0.1;
        const baseDamage = (1.0 + (player.stats.strength / 20));
        const damage = baseDamage * dt * (focusActive ? 10 : (player.vengeance ? 5 : 1)) * (isCrit ? 2 : 1);
        
        if (Math.random() < 0.2) {
          setDamageNumbers(d => [...d, {
            id: `dmg_${Date.now()}_${Math.random()}`,
            x: nearestEnemy.x + (Math.random() * 20 - 10),
            y: nearestEnemy.y - 40,
            value: Math.ceil(damage * 10),
            isCrit,
            alpha: 1.0
          }]);
        }

        next[0].hp -= damage;
        if (next[0].hp <= 0) return next.slice(1);
        return next;
      });
    }
  });

  return (
    <pixiContainer sortableChildren={true}>
      <pixiContainer zIndex={0}>
        <BannerBackground chapterId={state.activeVisualChapterId} scrollSpeed={scrollSpeed} width={width} height={height} />
      </pixiContainer>

      <pixiContainer zIndex={20}>
        {damageNumbers.map(num => (
          <pixiText 
            key={num.id}
            text={num.value.toString()}
            x={num.x}
            y={num.y}
            alpha={num.alpha}
            style={new TextStyle({
              fontFamily: 'monospace',
              fontSize: num.isCrit ? 18 : 12,
              fill: num.isCrit ? '#ffcc00' : '#ffffff',
              fontWeight: 'bold',
              stroke: { width: 2, color: '#000000' }
            })}
          />
        ))}
      </pixiContainer>

      <pixiContainer zIndex={10} alpha={player.isDead ? 0.3 : 1.0} sortableChildren={true}>
        {/* Layered Player Character */}
        <PlayerPaperDoll 
          player={player} 
          textures={textures} 
          visualScale={visualScale} 
          time={time} 
          speedMult={speedMult} 
        />

        {/* Ambient VFX on Player */}
        <pixiContainer x={player.x} y={player.y} zIndex={6}>
          <pixiGraphics
            draw={(g) => {
              g.clear();
              for (let i = 0; i < vfxIntensity; i++) {
                const px = Math.sin(time * 0.05 + i) * 20;
                const py = Math.cos(time * 0.05 + i) * 30 - 20;
                g.circle(px, py, 1.5).fill({ color: 0x00d4ff, alpha: 0.6 });
              }
            }}
          />

          {player.vengeance && (
            <pixiGraphics
              draw={(g) => {
                const pulse = Math.abs(Math.sin(time * 0.2));
                g.clear().circle(0, -15, 22).stroke({ width: 3, color: 0xff0000, alpha: pulse * 0.8 });
              }}
            />
          )}

          {!player.isDead && (
            <pixiGraphics
              draw={(g) => {
                const hpW = (player.hp / player.maxHp) * 30;
                g.clear()
                 .rect(-15, -45, 30, 4).fill({ color: 0x333333 })
                 .rect(-15, -45, hpW, 4).fill({ color: 0x4caf50 });
              }}
            />
          )}
        </pixiContainer>

        {/* Enemies */}
        <pixiContainer zIndex={4}>
          {enemies.map(en => (
            <EnemySprite 
              key={en.id} 
              enemy={en} 
              textures={textures} 
              time={time} 
            />
          ))}
        </pixiContainer>
      </pixiContainer>

    </pixiContainer>

  );
};

/**
 * Procedural Enemy Sprite with Hue/Size variants
 */
const EnemySprite: React.FC<{ enemy: BannerEntity, textures: Record<string, Texture>, time: number }> = ({ enemy, textures, time }) => {
  const filter = useMemo(() => {
    const f = new ColorMatrixFilter();
    if (enemy.hueShift) f.hue(enemy.hueShift, false);
    return f;
  }, [enemy.hueShift]);

  return (
    <pixiContainer x={enemy.x} y={enemy.y} scale={{ x: enemy.scaleVariation || 1.5, y: enemy.scaleVariation || 1.5 }} skew={{ x: Math.sin(time * 0.15) * 0.1, y: 0 }}>
      <pixiGraphics draw={(g) => { g.clear().ellipse(0, 0, 15, 5).fill({ color: 0x000000, alpha: 0.3 }); }} />
      {textures[enemy.spriteKey] ? (
        <pixiSprite 
          texture={textures[enemy.spriteKey]} 
          anchor={{ x: 0.5, y: 1.0 }} 
          filters={[filter]}
        />
      ) : (
        <pixiGraphics draw={(g) => { 
          g.clear()
           .rect(-15, -30, 30, 30).fill({ color: 0xffffff, alpha: 0.8 })
           .circle(0, -15, 10).fill({ color: 0xff0000 }); 
        }} filters={[filter]} />
      )}
      <pixiGraphics
        draw={(g) => {
          const hpW = (enemy.hp / enemy.maxHp) * 20;
          g.clear().rect(-10, -45, 20, 4).fill({ color: 0x333333 }).rect(-10, -45, hpW, 4).fill({ color: 0xff0000 });
        }}
      />
    </pixiContainer>
  );
};


interface BannerProps {
  character: any;
}

const BottomAnimatedBanner: React.FC<BannerProps> = ({ character }) => {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: 150 });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: 150 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bottom-banner-container">
      <Application width={dimensions.width} height={dimensions.height} background="#111111" antialias={true}>
        <BannerContent character={character} />
      </Application>
    </div>
  );
};


export default BottomAnimatedBanner;
