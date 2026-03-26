import React, { useState, useEffect } from 'react';
import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text, TextStyle, TilingSprite, Sprite } from 'pixi.js';
import './BottomAnimatedBanner.css';
import BannerBackground from './BannerBackground';
import EntityRenderer from './shared/EntityRenderer';
import PaperDollRenderer from './shared/PaperDollRenderer';
import AttackRenderer from './shared/AttackRenderer';
import { useBannerSimulation } from './useBannerSimulation';

extend({ Container, Graphics, Text, TilingSprite, Sprite });

/**
 * Inner content component — uses useBannerSimulation hook (requires PixiJS context).
 */
const BannerContent: React.FC<{ character: any }> = ({ character }) => {
  const s = useBannerSimulation(character);
  const nearestEnemy = s.enemies.length > 0 ? s.enemies[0] : null;

  return (
    <pixiContainer sortableChildren={true}>
      <pixiContainer zIndex={0}>
        <BannerBackground chapterId={s.state.activeVisualChapterId} scrollSpeed={s.scrollSpeed} width={s.width} height={s.height} />
      </pixiContainer>

      <pixiContainer zIndex={20}>
        {s.damageNumbers.map(num => (
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

      <pixiContainer zIndex={10} alpha={s.player.isDead ? 0.3 : 1.0} sortableChildren={true}>
        {/* Player Character */}
        {s.charVisuals ? (
          <PaperDollRenderer
            character={s.charVisuals}
            x={s.player.x}
            y={s.player.y}
            state={s.paperDollState}
            facingRight={true}
            scale={1.2 + (s.strength / 200)}
          />
        ) : (
          <pixiContainer x={s.player.x} y={s.player.y} zIndex={5}>
            <pixiGraphics draw={g => { g.clear().circle(0, -15, 15).fill({ color: 0xdaa520 }); }} />
          </pixiContainer>
        )}

        {/* Ambient VFX on Player */}
        <pixiContainer x={s.player.x} y={s.player.y} zIndex={6}>
          <pixiGraphics
            draw={(g) => {
              g.clear();
              for (let i = 0; i < s.vfxIntensity; i++) {
                const px = Math.sin(s.time * 0.05 + i) * 20;
                const py = Math.cos(s.time * 0.05 + i) * 30 - 20;
                g.circle(px, py, 1.5).fill({ color: 0x00d4ff, alpha: 0.6 });
              }
            }}
          />

          {s.player.vengeance && (
            <pixiGraphics
              draw={(g) => {
                const pulse = Math.abs(Math.sin(s.time * 0.2));
                g.clear().circle(0, -15, 22).stroke({ width: 3, color: 0xff0000, alpha: pulse * 0.8 });
              }}
            />
          )}

          {!s.player.isDead && (
            <pixiGraphics
              draw={(g) => {
                const hpW = (s.player.hp / s.player.maxHp) * 30;
                g.clear()
                 .rect(-15, -45, 30, 4).fill({ color: 0x333333 })
                 .rect(-15, -45, hpW, 4).fill({ color: 0x4caf50 });
              }}
            />
          )}
        </pixiContainer>

        {/* Enemies */}
        <pixiContainer zIndex={7}>
          {s.enemies.map(en => (
            <EntityRenderer
              key={en.id}
              entity={en.visual}
              x={en.x}
              y={en.y}
              state={en.state}
              hp={en.hp}
              maxHp={en.maxHp}
              showHpBar={true}
              showName={false}
            />
          ))}
        </pixiContainer>

        {/* Attack Animations */}
        <pixiContainer zIndex={15}>
          {nearestEnemy && (
            <AttackRenderer
              attack={s.playerAttackVisual}
              sourceX={s.player.x}
              sourceY={s.player.y - 15}
              targetX={nearestEnemy.x}
              targetY={nearestEnemy.y - 15}
              active={s.playerAttackActive}
              onComplete={() => {
                s.setPlayerAttackActive(false);
                s.attackCooldownRef.current = 500;
              }}
            />
          )}

          {nearestEnemy && (
            <AttackRenderer
              attack={s.enemyAttackVisual}
              sourceX={nearestEnemy.x}
              sourceY={nearestEnemy.y - 15}
              targetX={s.player.x}
              targetY={s.player.y - 15}
              active={s.enemyAttackActive}
              onComplete={() => {
                s.setEnemyAttackActive(false);
                s.attackCooldownRef.current = 300;
              }}
            />
          )}
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  );
};

/**
 * BottomAnimatedBanner — outer wrapper with responsive resize.
 */
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
      <Application
        key={character?.id || 'no-char'}
        width={dimensions.width}
        height={dimensions.height}
        background="#111111"
        antialias={true}
      >
        <BannerContent character={character} />
      </Application>
    </div>
  );
};

export default BottomAnimatedBanner;
