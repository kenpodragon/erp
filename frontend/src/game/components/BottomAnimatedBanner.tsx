import React, { useMemo, useState, useEffect } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import { Container, Graphics, Text, TextStyle, TilingSprite, Assets, Texture, Sprite } from 'pixi.js';
import './BottomAnimatedBanner.css';
import BannerBackground from './BannerBackground';
import { useGame } from '../GameContext';

// Register Pixi elements
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
}

/**
 * Inner content component to access Pixi hooks like useTick
 */
const BannerContent: React.FC<{ character: any }> = ({ character }) => {
  const { state } = useGame();
  const width = window.innerWidth;
  const height = 150;
  const groundY = 75; 

  // ── Asset Loading ────────────────────────────────────────────────
  const [textures, setTextures] = useState<Record<string, Texture>>({});
  
  useEffect(() => {
    const loadAssets = async () => {
      const paths = {
        player: '/assets/game/classes/base_vessel.png',
        sludge: '/assets/game/enemies/enemy_sludge.png',
        voidling: '/assets/game/enemies/enemy_voidling.png',
        guardian: '/assets/game/enemies/enemy_guardian.png',
        remnant: '/assets/game/enemies/enemy_remnant.png',
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
    loadAssets();
  }, []);

  // ── Local State (Initialized with real stats) ─────────────────────
  const [player, setPlayer] = useState<BannerEntity & { animState: string }>({
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
    spriteKey: 'player',
    name: character?.character_name || 'PLAYER',
    isDead: false,
    animState: 'walking'
  });

  // Derived Multipliers from Stats
  const visualScale = useMemo(() => 1.2 + (player.stats.strength / 100), [player.stats.strength]);
  const speedMult = useMemo(() => 1.0 + (player.stats.agility / 50), [player.stats.agility]);
  const vfxIntensity = useMemo(() => player.stats.intelligence / 5, [player.stats.intelligence]);

  const [enemies, setEnemies] = useState<BannerEntity[]>([]);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [waveTimer, setWaveTimer] = useState(0);
  const [idleTimer, setIdleTimer] = useState(0);
  const [focusActive, setFocusActive] = useState(false);
  const [time, setTime] = useState(0);

  // ── Physics & Combat Loop ─────────────────────────────────────────
  useTick((delta) => {
    const dt = delta.deltaTime;
    setTime(t => t + dt);
    
    const nearestEnemy = enemies.length > 0 ? enemies[0] : null;
    const dist = nearestEnemy ? nearestEnemy.x - player.x : 9999;

    if (enemies.length > 0) {
      setWaveTimer(prev => prev + dt);
      setIdleTimer(0);
      if (waveTimer > 120 * 60) setFocusActive(true);
    } else {
      setWaveTimer(0);
      setIdleTimer(prev => prev + dt);
      setFocusActive(false);
    }

    let moveX = 0;
    let nextAnimState = 'walking';

    if (nearestEnemy && dist < 200) {
      nextAnimState = 'fighting';
      setScrollSpeed(0.2);
      if (dist < 60) moveX = -0.5 * dt;
      else moveX = 0.8 * dt * speedMult; // Forward surge speed scales with Agi
    } else if (enemies.length === 0) {
      if (idleTimer > 180 && idleTimer < 360) { 
        const cycle = Math.floor(idleTimer / 180) % 4;
        const idles = ['idle_check', 'idle_stretch', 'idle_shine', 'idle_scan'];
        nextAnimState = idles[cycle] || 'walking';
        setScrollSpeed(0);
        moveX = 0;
      } else {
        nextAnimState = 'walking';
        setScrollSpeed(1.0 * speedMult); // Walking speed scales with Agi
        moveX = 1.2 * dt * speedMult;
      }
    }

    setPlayer(prev => ({
      ...prev,
      animState: nextAnimState,
      x: Math.max(20, Math.min(width * 0.4, prev.x + moveX)),
      y: groundY
    }));

    setEnemies(prev => prev.map(en => ({
      ...en,
      x: en.x - (1.5 + (1.5 * scrollSpeed)) * dt,
      y: groundY
    })).filter(en => en.x > -100));

    if (enemies.length === 0 && Math.random() < (nextAnimState === 'walking' ? 0.05 : 0.01)) {
      const types = ['sludge', 'voidling', 'guardian', 'remnant'];
      const type = types[Math.floor(Math.random() * types.length)];
      setEnemies([{
        id: `en_${Date.now()}`,
        type: 'enemy',
        x: width + 50,
        y: groundY,
        hp: 50,
        maxHp: 50,
        stats: {},
        spriteKey: type,
        name: type.toUpperCase(),
        isDead: false
      }]);
    }

    if (nearestEnemy && dist < 80) {
      setEnemies(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        // Damage scales with STR and speed scales with AGI
        const damage = (1.0 + (player.stats.strength / 20)) * dt * (focusActive ? 10 : 1);
        next[0].hp -= damage;
        if (next[0].hp <= 0) return next.slice(1);
        return next;
      });
    }
  });

  return (
    <pixiContainer>
      <BannerBackground chapterId={1} scrollSpeed={scrollSpeed} width={width} height={height} />

      <pixiContainer>
        {/* Render Player */}
        <pixiContainer 
          x={player.x} 
          y={player.y}
          scale={visualScale} // Size scales with STR
          skew={{ 
            x: player.animState === 'walking' ? Math.sin(time * 0.1 * speedMult) * 0.05 : 0, 
            y: player.animState === 'walking' ? Math.cos(time * 0.1 * speedMult) * 0.02 : 0 
          }}
          scaleY={player.animState === 'idle_stretch' ? visualScale + Math.sin(time * 0.05) * 0.1 : visualScale}
        >
          {textures.player ? (
            <pixiSprite texture={textures.player} anchor={{ x: 0.5, y: 1.0 }} />
          ) : (
            <pixiGraphics draw={(g) => { g.clear().circle(0, -15, 15).fill({ color: 0xdaa520 }); }} />
          )}

          {/* Intelligence-based Ambient VFX */}
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

          {player.animState === 'idle_check' && (
            <pixiGraphics
              draw={(g) => {
                g.clear().rect(10, -25, 15, 10).fill({ color: 0x00ffff, alpha: 0.4 });
                g.stroke({ width: 1, color: 0x00ffff, alpha: 0.8 });
              }}
            />
          )}

          {player.animState === 'idle_shine' && (
            <pixiGraphics
              draw={(g) => {
                const pulse = Math.abs(Math.sin(time * 0.2));
                g.clear().poly([15,-20, 18,-15, 23,-15, 19,-12, 20,-7, 15,-10, 10,-7, 11,-12, 7,-15, 12,-15]).fill({ color: 0xffffff, alpha: pulse });
              }}
            />
          )}

          {focusActive && (
            <pixiGraphics
              draw={(g) => {
                g.clear().circle(0, -15, 20).stroke({ width: 2, color: 0xff0000, alpha: 0.4 });
              }}
            />
          )}
        </pixiContainer>

        {/* Render Enemies */}
        {enemies.map(en => (
          <pixiContainer key={en.id} x={en.x} y={en.y} scale={1.5} skew={{ x: Math.sin(time * 0.15) * 0.1 }}>
            <pixiGraphics draw={(g) => { g.clear().ellipse(0, 0, 15, 5).fill({ color: 0x000000, alpha: 0.3 }); }} />
            {textures[en.spriteKey] ? (
              <pixiSprite texture={textures[en.spriteKey]} anchor={{ x: 0.5, y: 1.0 }} />
            ) : (
              <pixiGraphics draw={(g) => { g.clear().circle(0, -15, 10).fill({ color: 0xff0000 }); }} />
            )}
            <pixiGraphics
              draw={(g) => {
                const hpW = (en.hp / en.maxHp) * 20;
                g.clear().rect(-10, -35, 20, 3).fill({ color: 0x333333 }).rect(-10, -35, hpW, 3).fill({ color: 0xff0000 });
              }}
            />
          </pixiContainer>
        ))}
      </pixiContainer>
    </pixiContainer>
  );
};

interface BannerProps {
  character: any;
}

const BottomAnimatedBanner: React.FC<BannerProps> = ({ character }) => {
  const width = window.innerWidth;
  const height = 150;

  return (
    <div className="bottom-banner-container">
      <Application width={width} height={height} background="#111111" antialias={true}>
        <BannerContent character={character} />
      </Application>
    </div>
  );
};

export default BottomAnimatedBanner;
