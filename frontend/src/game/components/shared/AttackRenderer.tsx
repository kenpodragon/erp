/**
 * AttackRenderer — Shared PixiJS component for rendering attack visual effects.
 * Supports melee swings, projectiles, magic orbs, AoE bursts.
 * Uses PixiJS v8 with @pixi/react extend() pattern.
 * Works as a child of any PixiJS Application across all combat surfaces.
 */
import React, { useRef, useCallback, useEffect } from 'react';
import { useTick } from '@pixi/react';

// ── Exported Interfaces ──────────────────────────────────────────────

export interface AttackVisualData {
  attack_animation_type: 'melee_swing' | 'ranged_projectile' | 'magic_cast' | 'elemental_projectile' | 'aoe_burst';
  projectile_color?: string | null;
  projectile_speed?: number;
  impact_effect?: string;
  attack_range?: number;
  arc_angle?: number;
  trail_type?: string | null;
  screen_shake?: boolean;
}

export interface AttackRendererProps {
  attack: AttackVisualData;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  active: boolean;
  onComplete?: () => void;
  onImpact?: (x: number, y: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse a CSS hex color to a PixiJS numeric tint. */
function hexToTint(hex: string | null | undefined, fallback: number): number {
  if (!hex) return fallback;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? fallback : parsed;
}

// ── Trail particle type ──────────────────────────────────────────────

interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

// ── Impact particle type ─────────────────────────────────────────────

interface ImpactParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  rotation?: number;
}

// ── Animation durations (ms) ─────────────────────────────────────────

const MELEE_DURATION_MS = 300;
const AOE_DURATION_MS = 500;
const IMPACT_DURATION_MS = 250;

// ── Component ────────────────────────────────────────────────────────

const AttackRenderer: React.FC<AttackRendererProps> = ({
  attack,
  sourceX,
  sourceY,
  targetX,
  targetY,
  active,
  onComplete,
  onImpact,
}) => {
  const timeRef = useRef(0);
  const completedRef = useRef(false);
  const impactFiredRef = useRef(false);

  // Trail particles for magic_cast / elemental_projectile
  const trailRef = useRef<TrailParticle[]>([]);
  // Impact effect particles
  const impactParticlesRef = useRef<ImpactParticle[]>([]);
  const impactTimeRef = useRef(0);
  const showImpactRef = useRef(false);
  const impactPosRef = useRef({ x: 0, y: 0 });

  // Reset state when active transitions to true
  useEffect(() => {
    if (active) {
      timeRef.current = 0;
      completedRef.current = false;
      impactFiredRef.current = false;
      trailRef.current = [];
      impactParticlesRef.current = [];
      impactTimeRef.current = 0;
      showImpactRef.current = false;
    }
  }, [active]);

  // Computed values
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const angle = Math.atan2(dy, dx);
  const speed = attack.projectile_speed ?? 5;
  const color = hexToTint(attack.projectile_color, attack.attack_animation_type === 'magic_cast' ? 0x8844cc : 0xcccccc);
  const arcAngle = (attack.arc_angle ?? 90) * (Math.PI / 180);
  const range = attack.attack_range ?? 100;

  // How long it takes a projectile to reach the target (in ms)
  const projectileDurationMs = (dist / Math.max(speed, 0.5)) * 16.67;

  // Spawn impact particles
  const spawnImpactParticles = useCallback((ix: number, iy: number) => {
    const effect = attack.impact_effect ?? 'flash';
    const particles: ImpactParticle[] = [];

    switch (effect) {
      case 'splash': {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          particles.push({
            x: ix, y: iy,
            vx: Math.cos(a) * 2.5,
            vy: Math.sin(a) * 2.5,
            alpha: 1, size: 3,
          });
        }
        break;
      }
      case 'shatter': {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
          particles.push({
            x: ix, y: iy,
            vx: Math.cos(a) * 3,
            vy: Math.sin(a) * 3,
            alpha: 1, size: 4,
            rotation: Math.random() * Math.PI,
          });
        }
        break;
      }
      case 'dissipate': {
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: ix + (Math.random() - 0.5) * 10,
            y: iy + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 1,
            vy: -Math.random() * 2,
            alpha: 0.8, size: 5 + Math.random() * 4,
          });
        }
        break;
      }
      case 'flash':
      default: {
        // Single flash — handled directly in draw
        particles.push({
          x: ix, y: iy,
          vx: 0, vy: 0,
          alpha: 1, size: 12,
        });
        break;
      }
    }

    impactParticlesRef.current = particles;
    impactPosRef.current = { x: ix, y: iy };
    impactTimeRef.current = 0;
    showImpactRef.current = true;
  }, [attack.impact_effect]);

  // Tick — drive animation
  useTick((delta) => {
    if (!active && !showImpactRef.current) return;
    const dt = delta.deltaTime * 16.67;

    if (active && !completedRef.current) {
      timeRef.current += dt;
      const t = timeRef.current;
      const type = attack.attack_animation_type;

      switch (type) {
        case 'melee_swing': {
          if (t >= MELEE_DURATION_MS) {
            if (!impactFiredRef.current) {
              impactFiredRef.current = true;
              onImpact?.(targetX, targetY);
              spawnImpactParticles(targetX, targetY);
            }
            completedRef.current = true;
            onComplete?.();
          }
          break;
        }

        case 'ranged_projectile':
        case 'magic_cast':
        case 'elemental_projectile': {
          const progress = t / projectileDurationMs;
          const curX = sourceX + dx * Math.min(progress, 1);
          const curY = sourceY + dy * Math.min(progress, 1);

          // Add trail particles
          if (type === 'elemental_projectile' || (type === 'magic_cast' && attack.trail_type === 'glow')) {
            trailRef.current.push({
              x: curX, y: curY,
              alpha: 0.7,
              size: type === 'elemental_projectile' ? 2 + Math.random() * 2 : 4,
            });
            // Cap trail length
            if (trailRef.current.length > 20) {
              trailRef.current.shift();
            }
          }

          // Fade existing trail
          for (const p of trailRef.current) {
            p.alpha *= 0.92;
          }

          if (progress >= 1) {
            if (!impactFiredRef.current) {
              impactFiredRef.current = true;
              onImpact?.(targetX, targetY);
              spawnImpactParticles(targetX, targetY);
            }
            completedRef.current = true;
            onComplete?.();
          }
          break;
        }

        case 'aoe_burst': {
          if (t >= AOE_DURATION_MS) {
            if (!impactFiredRef.current) {
              impactFiredRef.current = true;
              if (attack.screen_shake) {
                onImpact?.(sourceX, sourceY);
              }
            }
            completedRef.current = true;
            onComplete?.();
          }
          break;
        }
      }
    }

    // Update impact particles
    if (showImpactRef.current) {
      impactTimeRef.current += dt;
      const iprog = impactTimeRef.current / IMPACT_DURATION_MS;
      if (iprog >= 1) {
        showImpactRef.current = false;
        impactParticlesRef.current = [];
      } else {
        for (const p of impactParticlesRef.current) {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, 1 - iprog);
        }
      }
    }
  });

  // ── Draw callback ──────────────────────────────────────────────────

  const draw = useCallback((g: any) => {
    g.clear();

    if (!active && !showImpactRef.current) return;

    const t = timeRef.current;
    const type = attack.attack_animation_type;

    // ── Main attack animation ────────────────────────────────────────
    if (active && !completedRef.current) {
      switch (type) {
        case 'melee_swing': {
          const progress = Math.min(1, t / MELEE_DURATION_MS);
          const startAngle = angle - arcAngle / 2;
          const sweepAngle = startAngle + arcAngle * progress;
          const swingRadius = (attack.attack_range ?? 40);
          const alpha = 1 - progress * 0.6;

          // Draw arc
          g.moveTo(sourceX, sourceY);
          g.arc(sourceX, sourceY, swingRadius, startAngle, sweepAngle);
          g.stroke({ width: 3, color: 0xffffff, alpha });
          break;
        }

        case 'ranged_projectile': {
          const progress = Math.min(1, t / projectileDurationMs);
          const curX = sourceX + dx * progress;
          const curY = sourceY + dy * progress;

          // Elongated rectangle (arrow-like)
          const len = 10;
          const wid = 3;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          g.moveTo(curX + cos * len / 2 - sin * wid / 2, curY + sin * len / 2 + cos * wid / 2);
          g.lineTo(curX + cos * len / 2 + sin * wid / 2, curY + sin * len / 2 - cos * wid / 2);
          g.lineTo(curX - cos * len / 2 + sin * wid / 2, curY - sin * len / 2 - cos * wid / 2);
          g.lineTo(curX - cos * len / 2 - sin * wid / 2, curY - sin * len / 2 + cos * wid / 2);
          g.fill({ color, alpha: 1 });
          break;
        }

        case 'magic_cast': {
          const progress = Math.min(1, t / projectileDurationMs);
          const curX = sourceX + dx * progress;
          const curY = sourceY + dy * progress;
          const radius = 6;

          // Glow outer
          g.circle(curX, curY, radius + 3).fill({ color, alpha: 0.25 });
          // Core
          g.circle(curX, curY, radius).fill({ color, alpha: 0.9 });

          // Trail afterimages
          for (const tp of trailRef.current) {
            if (tp.alpha > 0.05) {
              g.circle(tp.x, tp.y, tp.size).fill({ color, alpha: tp.alpha * 0.5 });
            }
          }
          break;
        }

        case 'elemental_projectile': {
          const progress = Math.min(1, t / projectileDurationMs);
          const curX = sourceX + dx * progress;
          const curY = sourceY + dy * progress;
          const radius = 8;

          // Outer glow
          g.circle(curX, curY, radius + 4).fill({ color, alpha: 0.2 });
          // Core
          g.circle(curX, curY, radius).fill({ color, alpha: 0.9 });
          // Inner bright spot
          g.circle(curX, curY, radius * 0.4).fill({ color: 0xffffff, alpha: 0.6 });

          // Particle trail
          for (const tp of trailRef.current) {
            if (tp.alpha > 0.05) {
              g.circle(tp.x, tp.y, tp.size).fill({ color, alpha: tp.alpha });
            }
          }
          break;
        }

        case 'aoe_burst': {
          const progress = Math.min(1, t / AOE_DURATION_MS);
          const currentRadius = range * progress;
          const alpha = 1 - progress * 0.8;
          const ringWidth = 3 + (1 - progress) * 2;

          g.circle(sourceX, sourceY, currentRadius).stroke({ width: ringWidth, color, alpha });
          // Inner fill fading fast
          if (progress < 0.5) {
            g.circle(sourceX, sourceY, currentRadius).fill({ color, alpha: alpha * 0.15 });
          }
          break;
        }
      }
    }

    // ── Impact effect ────────────────────────────────────────────────
    if (showImpactRef.current) {
      const iprog = impactTimeRef.current / IMPACT_DURATION_MS;
      const effect = attack.impact_effect ?? 'flash';

      if (effect === 'flash') {
        const flashR = 12 * (1 + iprog * 0.5);
        const flashAlpha = Math.max(0, 1 - iprog);
        g.circle(impactPosRef.current.x, impactPosRef.current.y, flashR).fill({ color: 0xffffff, alpha: flashAlpha });
      } else {
        for (const p of impactParticlesRef.current) {
          if (p.alpha > 0.02) {
            if (effect === 'shatter') {
              // Angular fragment: small rotated rect
              const hs = p.size / 2;
              g.rect(p.x - hs, p.y - hs, p.size, p.size).fill({ color, alpha: p.alpha });
            } else {
              g.circle(p.x, p.y, p.size * (1 - iprog * 0.5)).fill({ color, alpha: p.alpha });
            }
          }
        }
      }
    }
  }, [active, attack, sourceX, sourceY, targetX, targetY, dx, dy, angle, color,
      arcAngle, range, projectileDurationMs, spawnImpactParticles]);

  // Don't render anything when not active and no impact showing
  if (!active && !showImpactRef.current) return null;

  return (
    <pixiContainer>
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
};

export default AttackRenderer;
