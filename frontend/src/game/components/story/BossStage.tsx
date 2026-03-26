/**
 * BossStage — Boss interstitial combat engine.
 *
 * Replaces CombatStage for chapter_boss / book_boss scenes.
 * Features:
 *  - Single large boss entity with high HP (hp_multiplier x zone baseline)
 *  - Countdown timer (replenished on successful interrupts)
 *  - Three random interrupt challenge types (one at a time):
 *      click_burst   — fill a progress bar by clicking fast
 *      target_zone   — click a glowing circle appearing at random position
 *      whack_sequence — click 3 sequential pop-up zones before they disappear
 *  - Auto-DPS tick (same logic as CombatStage)
 *  - No upgrade menu / no wave system
 */
import React, { useEffect, useCallback } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { StorySession } from '../../GameContext';
import { useAssets } from '../../providers/AssetProvider';
import EntityRenderer from '../shared/EntityRenderer';
import type { EnemyVisualData } from '../shared/EntityRenderer';
import AttackRenderer from '../shared/AttackRenderer';
import type { AttackVisualData } from '../shared/AttackRenderer';
import { useBossPhases, CANVAS_WIDTH, CANVAS_HEIGHT, BOSS_X, BOSS_Y, BOSS_RADIUS } from './useBossPhases';
import type { BossDamageNumber } from './useBossPhases';
import './BossStage.css';

extend({ Container, Graphics, Text });

// ── Inner PixiJS component ──────────────────────────────────────────────────
interface InnerProps {
  bossHp: number;
  bossMaxHp: number;
  bossName: string;
  bossVisual: EnemyVisualData;
  damageNumbers: BossDamageNumber[];
  shake: number;
  textScale: number;
  width: number;
  height: number;
  activeAttack: AttackVisualData | null;
  attackActive: boolean;
  onAttackComplete: () => void;
}

const BossContent: React.FC<InnerProps> = ({
  bossHp, bossMaxHp, bossName, bossVisual, damageNumbers, shake, textScale,
  width, height, activeAttack, attackActive, onAttackComplete,
}) => {
  const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 6 : 0;
  const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 4 : 0;

  useTick(() => { /* trigger re-render each frame for shake */ });

  const drawBossGlow = useCallback((g: any) => {
    g.clear();
    const glowRadius = (bossVisual.size?.hitbox_radius ?? BOSS_RADIUS) + 10;
    g.circle(BOSS_X, BOSS_Y, glowRadius);
    g.fill({ color: 0x550000, alpha: 0.3 });
    g.circle(BOSS_X, BOSS_Y, glowRadius + 5);
    g.fill({ color: 0x330000, alpha: 0.15 });
  }, [bossVisual.size?.hitbox_radius]);

  const bossState = bossHp <= 0 ? 'dying' as const : 'idle' as const;

  return (
    <pixiContainer x={shakeX} y={shakeY}>
      <pixiGraphics draw={drawBossGlow} />

      <EntityRenderer
        entity={bossVisual}
        x={BOSS_X}
        y={BOSS_Y + (bossVisual.size?.height_base ?? 70) * (bossVisual.size?.scale_min ?? 2.2) * (bossVisual.silhouette?.body_ratio_h ?? 1.3) / 2}
        state={bossState}
        hp={bossHp}
        maxHp={bossMaxHp}
        showHpBar={true}
        showName={false}
      />

      {activeAttack && (
        <AttackRenderer
          attack={activeAttack}
          sourceX={BOSS_X}
          sourceY={BOSS_Y}
          targetX={BOSS_X + (Math.random() - 0.5) * 100}
          targetY={BOSS_Y + 80}
          active={attackActive}
          onComplete={onAttackComplete}
        />
      )}

      <pixiText
        text={`\u2620 ${bossName.toUpperCase()}`}
        style={new TextStyle({ fill: '#ff4444', fontSize: 14 * textScale, fontWeight: 'bold', fontFamily: 'monospace' })}
        x={BOSS_X}
        y={BOSS_Y + BOSS_RADIUS + 12}
        anchor={0.5}
      />

      {damageNumbers.map(dn => (
        <pixiText
          key={dn.id}
          text={dn.value}
          style={new TextStyle({
            fill: dn.isCrit ? '#ffff00' : '#ff8888',
            fontSize: (dn.isCrit ? 18 : 13) * textScale,
            fontWeight: 'bold',
            fontFamily: 'monospace',
          })}
          x={dn.x}
          y={dn.y}
          alpha={dn.alpha}
          anchor={0.5}
        />
      ))}
    </pixiContainer>
  );
};

// ── Main BossStage component ────────────────────────────────────────────────
interface Props {
  session: StorySession;
  gameConfigs: Record<string, unknown>;
  onEnemyClick: () => void;
  onGoldEarned: (amount: number) => void;
  onBossDefeated: (success: boolean) => void;
  textScale?: number;
  debugSuperClick?: boolean;
  playSFX?: (key: string, opts?: { pan?: number }) => void;
  reduceMotion?: boolean;
}

const BossStage: React.FC<Props> = ({
  session, gameConfigs, onEnemyClick, onGoldEarned, onBossDefeated,
  textScale = 1.0, debugSuperClick = false, playSFX, reduceMotion = false,
}) => {
  // Preload boss sprite asset definition if available
  let assets: ReturnType<typeof useAssets> | null = null;
  try { assets = useAssets(); } catch { /* AssetProvider not mounted */ }

  useEffect(() => {
    if (!assets) return;
    const bossKey = (session as any).bossSpriteKey;
    if (bossKey) assets.preloadBatch([bossKey]);
  }, [(session as any).bossSpriteKey, assets]);

  const boss = useBossPhases({
    session, gameConfigs, onEnemyClick, onBossDefeated,
    debugSuperClick, playSFX, reduceMotion,
  });

  return (
    <div className="boss-stage" onClick={boss.handleCanvasClick}>
      {/* Timer bar */}
      <div className="boss-timer-container">
        <div
          className="boss-timer-bar"
          style={{ width: `${Math.max(0, boss.timerPct * 100)}%`, background: boss.timerColor }}
        />
        <span className="boss-timer-label" style={{ color: boss.timerColor }}>
          {Math.max(0, Math.ceil(boss.timerLeft))}s
        </span>
      </div>

      {/* PixiJS canvas */}
      <Application width={CANVAS_WIDTH} height={CANVAS_HEIGHT} background={0x0a0005} antialias>
        <BossContent
          bossHp={boss.bossHp}
          bossMaxHp={boss.bossMaxHp}
          bossName={boss.bossName}
          bossVisual={boss.bossVisual}
          damageNumbers={boss.damageNums}
          shake={boss.shake}
          textScale={textScale}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          activeAttack={boss.activeAttack}
          attackActive={boss.attackActive}
          onAttackComplete={boss.handleAttackComplete}
        />
      </Application>

      {/* Interrupt overlays (HTML for interactivity) */}
      {boss.interrupt && boss.interrupt.type === 'click_burst' && (
        <div className="interrupt-overlay interrupt-overlay--burst">
          <div className="interrupt-title">{'\u26A1'} CLICK FAST!</div>
          <div className="interrupt-progress-track">
            <div className="interrupt-progress-fill" style={{ width: `${boss.interrupt.progress}%` }} />
          </div>
          <div className="interrupt-timer">{Math.ceil(boss.interrupt.timeLeft)}s</div>
        </div>
      )}

      {boss.interrupt && boss.interrupt.type === 'target_zone' && boss.interrupt.targetZone && (
        <div
          className="interrupt-target-zone"
          style={{
            left: boss.interrupt.targetZone.x - boss.interrupt.targetZone.radius,
            top:  boss.interrupt.targetZone.y - boss.interrupt.targetZone.radius + 40,
            width:  boss.interrupt.targetZone.radius * 2,
            height: boss.interrupt.targetZone.radius * 2,
          }}
        >
          <div className="interrupt-timer interrupt-timer--zone">{Math.ceil(boss.interrupt.timeLeft)}s</div>
        </div>
      )}

      {boss.interrupt && boss.interrupt.type === 'whack_sequence' && boss.interrupt.whackZones && (
        <>
          {boss.interrupt.whackZones.map((zone, i) => i === boss.interrupt!.whackIndex && (
            <div
              key={i}
              className="interrupt-whack-zone"
              style={{
                left:   zone.x - zone.radius,
                top:    zone.y - zone.radius + 40,
                width:  zone.radius * 2,
                height: zone.radius * 2,
              }}
            >
              <span>{boss.interrupt!.whackIndex + 1}/3</span>
            </div>
          ))}
          <div className="interrupt-timer interrupt-timer--whack">{Math.ceil(boss.interrupt.timeLeft)}s</div>
        </>
      )}

      {boss.interruptSuccess && (
        <div className="interrupt-success-flash">+{boss.cfg.interrupt_refill_seconds}s REFILLED!</div>
      )}
    </div>
  );
};

export default BossStage;
