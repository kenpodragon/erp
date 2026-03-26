/**
 * CombatHUD — PixiJS rendering sub-component for the combat scene.
 * Pure presentation: floor, hero, enemy, attack VFX, damage numbers,
 * death particles, shockwaves, status text, and challenge button.
 */
import React, { useMemo } from 'react';
import { TextStyle } from 'pixi.js';
import { hexToPixiTint } from '../../utils/classVisuals';
import { formatNumber } from '../../utils/numbers';
import ParallaxBackground from './ParallaxBackground';
import EntityRenderer from '../shared/EntityRenderer';
import type { EnemyVisualData } from '../shared/EntityRenderer';
import PaperDollRenderer from '../shared/PaperDollRenderer';
import type { CharacterVisualData } from '../shared/PaperDollRenderer';
import AttackRenderer from '../shared/AttackRenderer';
import type { Enemy } from './useCombatState';
import type { DamageNumber, DeathParticle, Shockwave } from './useCombatAnimations';
import type { StorySession } from '../../GameContext';

function getEnemyColors(enemy: Enemy): { primary: string | null; secondary: string | null } {
  if (enemy.isPrimal) return { primary: '#ffd700', secondary: '#b8860b' };
  if (enemy.isRare) return { primary: '#60a5fa', secondary: '#3b82f6' };
  return { primary: null, secondary: null };
}

function getEnemyNameColor(enemy: Enemy): string {
  if (enemy.isRare) return '#60a5fa';
  if (enemy.isBoss) return '#ff6666';
  return '#aaaacc';
}

const PLAYER_ATTACK_DATA = {
  attack_animation_type: 'melee_swing' as const,
  projectile_color: null,
  impact_effect: 'flash' as const,
  attack_range: 40,
  arc_angle: 90,
};

interface CombatHUDProps {
  width: number;
  height: number;
  textScale: number;
  reduceMotion: boolean;
  session: StorySession;
  waveCount: number;
  requiredWaves: number;
  extraWavesMode?: boolean;
  monstersPerZone: number;
  enemy: Enemy | null;
  isFightingBoss: boolean;
  enrageTimer: number;
  enemyState: 'idle' | 'attacking' | 'dying' | 'dead';
  onEnemyDeath: () => void;
  characterVisuals: CharacterVisualData | null;
  dmgNumbers: DamageNumber[];
  deathParticles: DeathParticle[];
  shockwaves: Shockwave[];
  shake: number;
  recoil: number;
  time: number;
  playerAttackActive: boolean;
  autoAttackActive: boolean;
  onPlayerAttackComplete: () => void;
  onAutoAttackComplete: () => void;
  handleChallengeBoss: () => void;
  classColors: { damageText: string; particleTint: string; primary: string };
}

const CombatHUD: React.FC<CombatHUDProps> = ({
  width, height, textScale = 1.0, reduceMotion,
  session, waveCount, requiredWaves, extraWavesMode, monstersPerZone,
  enemy, isFightingBoss, enrageTimer, enemyState, onEnemyDeath,
  characterVisuals,
  dmgNumbers, deathParticles, shockwaves, shake, recoil, time,
  playerAttackActive, autoAttackActive, onPlayerAttackComplete, onAutoAttackComplete,
  handleChallengeBoss, classColors,
}) => {
  const floorY = height * 0.72;
  const enemyX = width * 0.5;
  const playerX = width * 0.15;
  const playerY = floorY;

  const breathe = Math.sin(time) * 0.03;
  const idleY = Math.cos(time * 0.7) * 3;
  const shakeX = (shake && !reduceMotion) ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = ((shake && !reduceMotion) ? (Math.random() - 0.5) * 4 : 0) + idleY;

  const monstersInZone = Math.min(waveCount + 1, monstersPerZone);

  // ── Status text ────────────────────────────────────────────────────────
  let statusText = "";
  if (isFightingBoss) {
    const modeLabel = extraWavesMode ? `FARMING Wave ${session.currentZone}` : `Wave ${session.currentZone}/${requiredWaves}`;
    statusText = `${modeLabel} | CHALLENGE: MINI-BOSS`;
  } else if (extraWavesMode) {
    const isNarrativeDelay = session.wavesComplete && !session.previouslyCompleted && session.narrativeProgressPct < 100;
    if (isNarrativeDelay) {
      statusText = `More mobs appear! You must finish the story before clearing this level. | Mob ${monstersInZone}/${monstersPerZone}`;
    } else {
      statusText = `FARMING WAVE ${session.currentZone} | Mob ${monstersInZone}/${monstersPerZone} | Monsters scaling up...`;
    }
  } else if (session.currentZone > requiredWaves || (session.wavesComplete && session.narrativeProgressPct >= 100)) {
    statusText = "SCENE COMPLETE \u2014 Check rewards below";
  } else if (waveCount >= monstersPerZone) {
    statusText = `Wave ${session.currentZone}/${requiredWaves} | BOSS READY`;
  } else {
    statusText = `Wave ${session.currentZone}/${requiredWaves} | Monsters: ${monstersInZone}/${monstersPerZone}`;
  }

  // ── Enemy visual data ──────────────────────────────────────────────────
  const enemyVisualData = useMemo<EnemyVisualData | null>(() => {
    if (!enemy) return null;
    const { primary, secondary } = getEnemyColors(enemy);
    return {
      entity_id: enemy.entityId ?? 0,
      name: enemy.name,
      sprite_key: enemy.spriteKey,
      base_hp: enemy.maxHp,
      base_gold: enemy.baseGold,
      color_primary: primary,
      color_secondary: secondary,
      movement: null,
      size: enemy.isBoss ? {
        name: 'large', scale_min: 1.3, scale_max: 1.5,
        width_base: 44, height_base: 65, hitbox_radius: 28,
        hp_bar_width: 160,
      } : null,
      animation: null,
      silhouette: enemy.isBoss ? {
        name: 'boss', body_shape: 'rect', body_ratio_w: 1, body_ratio_h: 1,
        corner_radius: 0, has_limbs: false, limb_count: 0,
        has_head: true, has_wings: false, has_weapon_slot: false,
        has_eye_glow: true, sub_unit_count: 1,
      } : null,
      primary_attack: null,
      secondary_attack: null,
      tertiary_attack: null,
    };
  }, [enemy?.entityId, enemy?.name, enemy?.spriteKey, enemy?.maxHp, enemy?.baseGold, enemy?.isPrimal, enemy?.isRare, enemy?.isBoss]);

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

      {/* Hero Avatar */}
      {characterVisuals ? (
        <pixiContainer zIndex={8}>
          <PaperDollRenderer
            character={characterVisuals}
            x={playerX}
            y={playerY}
            state={playerAttackActive ? 'fighting' : 'idle'}
            facingRight={true}
            scale={1.2}
          />
        </pixiContainer>
      ) : (
        <pixiContainer x={playerX} y={floorY} zIndex={8}>
          <pixiGraphics draw={g => {
            const primaryTint = classColors.primary ? hexToPixiTint(classColors.primary) : 0x4444aa;
            g.clear().ellipse(0, 0, 24, 7).fill({ color: 0x000000, alpha: 0.4 });
            g.circle(0, -50, 16).fill({ color: primaryTint, alpha: 0.9 });
            g.rect(-12, -34, 24, 38).fill({ color: primaryTint, alpha: 0.85 });
          }} />
          <pixiText text="HERO" y={12} x={0} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 8 * textScale, fill: classColors.primary || '#aaaacc', fontWeight: 'bold' })} />
        </pixiContainer>
      )}

      {/* Enemy */}
      {enemy && enemyVisualData && (
        <pixiContainer x={enemyX + shakeX + (recoil ? -8 : 0)} y={floorY + shakeY} scale={{ x: 1 + breathe, y: 1 - breathe }} zIndex={10}>
          {enemy.isRare && !reduceMotion && (
            <pixiGraphics y={-50} alpha={0.3 + Math.sin(time * 2) * 0.2} draw={g => {
              g.clear().circle(0, -20, 50).stroke({ width: 3, color: 0x60a5fa, alpha: 0.8 });
              g.circle(0, -20, 60).stroke({ width: 2, color: 0x60a5fa, alpha: 0.4 });
            }} />
          )}
          {enemy.isRare && reduceMotion && (
            <pixiGraphics y={-50} alpha={0.5} draw={g => {
              g.clear().circle(0, -20, 50).stroke({ width: 3, color: 0x60a5fa, alpha: 0.8 });
            }} />
          )}
          <EntityRenderer
            entity={enemyVisualData}
            x={0} y={0}
            state={enemyState}
            hp={enemy.currentHp}
            maxHp={enemy.maxHp}
            showHpBar={true}
            showName={false}
            onDeath={onEnemyDeath}
          />
          {enemy.isBoss && <pixiText text={`ENRAGE: ${enrageTimer}s`} y={-138} x={0} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#ff4400', fontWeight: 'bold' })} />}
          {enemy.isRare && <pixiText text="RARE" y={-142} x={0} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 11 * textScale, fill: '#60a5fa', fontWeight: 'bold', letterSpacing: 3 })} />}
        </pixiContainer>
      )}

      {/* Attack VFX */}
      {!reduceMotion && (
        <pixiContainer zIndex={15}>
          <AttackRenderer
            attack={PLAYER_ATTACK_DATA}
            sourceX={playerX} sourceY={playerY - 40}
            targetX={enemyX} targetY={floorY - 40}
            active={playerAttackActive}
            onComplete={onPlayerAttackComplete}
          />
          <AttackRenderer
            attack={{ attack_animation_type: 'aoe_burst', projectile_color: classColors.primary || '#aaaacc', impact_effect: 'dissipate', attack_range: 25 }}
            sourceX={enemyX} sourceY={floorY - 40}
            targetX={enemyX} targetY={floorY - 40}
            active={autoAttackActive}
            onComplete={onAutoAttackComplete}
          />
        </pixiContainer>
      )}

      {/* Challenge Button */}
      {!isFightingBoss && waveCount === monstersPerZone && (
        <pixiContainer x={width * 0.5} y={height * 0.25} zIndex={50} eventMode="static" cursor="pointer" onpointertap={handleChallengeBoss} onpointerdown={handleChallengeBoss}>
          <pixiGraphics draw={g => {
            g.clear().rect(-80, -20, 160, 40).fill({ color: 0x8b0000, alpha: 0.8 }).stroke({ width: 2, color: 0xffd700 });
          }} />
          <pixiText text="CHALLENGE BOSS" anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 14 * textScale, fill: '#ffffff', fontWeight: 'bold' })} />
        </pixiContainer>
      )}

      {/* VFX Layers */}
      {!reduceMotion && (
        <>
          <pixiContainer zIndex={18}>{deathParticles.map(p => <pixiGraphics key={p.id} x={p.x} y={p.y} alpha={p.alpha} draw={g => g.clear().rect(-p.size/2, -p.size/2, p.size, p.size).fill({ color: p.color })} />)}</pixiContainer>
          <pixiContainer zIndex={25}>{shockwaves.map(sw => <pixiGraphics key={sw.id} x={sw.x} y={sw.y} alpha={sw.alpha} draw={g => g.clear().circle(0, 0, sw.radius).stroke({ width: 2, color: 0xffffff })} />)}</pixiContainer>
        </>
      )}

      {/* UI Elements */}
      {enemy && <pixiText text={`${enemy.isRare ? '\u2726 ' : ''}${enemy.name} | HP: ${formatNumber(enemy.currentHp)} / ${formatNumber(enemy.maxHp)}`} x={enemyX} y={floorY + 50} zIndex={11} anchor={0.5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 12 * textScale, fill: getEnemyNameColor(enemy), align: 'center', fontWeight: 'bold' })} />}
      {!reduceMotion && (
        <pixiContainer zIndex={20}>{dmgNumbers.map(dn => <pixiText key={dn.id} text={dn.value} x={dn.x} y={dn.y} alpha={dn.alpha} style={new TextStyle({ fontFamily: 'monospace', fontSize: (dn.type === 'crit' ? 20 : 14) * textScale, fill: dn.type === 'crit' ? '#ffcc00' : classColors.damageText, stroke: { width: 2, color: '#000000' } })} />)}</pixiContainer>
      )}

      <pixiText text={statusText} x={8} y={8} zIndex={5} style={new TextStyle({ fontFamily: 'monospace', fontSize: 10 * textScale, fill: '#666688' })} />
    </pixiContainer>
  );
};

export default CombatHUD;
