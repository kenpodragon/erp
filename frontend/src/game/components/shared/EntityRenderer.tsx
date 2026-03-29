/**
 * EntityRenderer — Shared PixiJS component for rendering entities (enemies).
 * Uses PixiJS v8 with @pixi/react extend() pattern.
 * Works as a child of any PixiJS Application across CombatStage, BossStage,
 * BottomAnimatedBanner, and ActiveTrainingSimulator.
 */
import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useTick, extend } from '@pixi/react';
import { TextStyle, Texture, Sprite } from 'pixi.js';
import { svgTextureCache, onCacheUpdate, preloadEntitySprites } from '../../renderers/SpriteTextureCache';
import { api } from '../../../api';

extend({ Sprite });

// ── Exported Interfaces ──────────────────────────────────────────────

export interface EnemyVisualData {
  entity_id: number;
  name: string;
  sprite_key: string | null;
  base_hp: number;
  base_gold: number;
  color_primary: string | null;
  color_secondary: string | null;
  movement: {
    name: string;
    y_offset_min: number;
    y_offset_max: number;
    bob_amplitude: number;
    bob_frequency: number;
    speed_multiplier: number;
    trail_effect: string | null;
  } | null;
  size: {
    name: string;
    scale_min: number;
    scale_max: number;
    width_base: number;
    height_base: number;
    hitbox_radius: number;
    hp_bar_width: number;
  } | null;
  animation: {
    name: string;
    idle_scale_x: number;
    idle_scale_y: number;
    idle_cycle_ms: number;
    idle_translate_x: number;
    idle_translate_y: number;
    attack_recoil: number;
    death_style: string;
    death_duration_ms: number;
    death_particle_count: number;
  } | null;
  silhouette: {
    name: string;
    body_shape: string;
    body_ratio_w: number;
    body_ratio_h: number;
    corner_radius: number;
    has_limbs: boolean;
    limb_count: number;
    has_head: boolean;
    has_wings: boolean;
    has_weapon_slot: boolean;
    has_eye_glow: boolean;
    sub_unit_count: number;
  } | null;
  primary_attack: {
    name: string;
    attack_animation_type: string;
    projectile_color: string | null;
    cooldown_ms: number;
    projectile_speed: number;
    impact_effect: string;
    attack_range: number;
    arc_angle: number;
    trail_type: string | null;
    screen_shake: boolean;
  } | null;
  secondary_attack: object | null;
  tertiary_attack: object | null;
}

export interface EntityRendererProps {
  entity: EnemyVisualData;
  x: number;
  y: number;
  state: 'idle' | 'attacking' | 'dying' | 'dead';
  hp?: number;
  maxHp?: number;
  showHpBar?: boolean;
  showName?: boolean;
  onDeath?: () => void;
  elapsedMs?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse a CSS hex color to a PixiJS numeric tint. */
function hexToTint(hex: string | null, fallback: number): number {
  if (!hex) return fallback;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? fallback : parsed;
}

/** Pick a stable random value between min and max using a seed-like id. */
function stableRandom(seed: number, min: number, max: number): number {
  // Simple deterministic hash from entity_id
  const h = Math.abs(Math.sin(seed * 9301 + 49297) * 233280);
  const frac = h - Math.floor(h);
  return min + frac * (max - min);
}

// ── Default dimensions ──────────────────────────────────────────────

const FALLBACK_WIDTH = 36;
const FALLBACK_HEIGHT = 55;
const FALLBACK_RADIUS = 22;
const FALLBACK_HP_BAR_WIDTH = 80;

// ── Death animation particles ───────────────────────────────────────

interface DeathParticle {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
}

// ── Component ────────────────────────────────────────────────────────

const EntityRenderer: React.FC<EntityRendererProps> = ({
  entity,
  x,
  y,
  state,
  hp,
  maxHp,
  showHpBar = true,
  showName = false,
  onDeath,
  elapsedMs,
}) => {
  const timeRef = useRef(0);
  const deathTimeRef = useRef(0);
  const deathFiredRef = useRef(false);

  // ── Asset-based sprite rendering ─────────────────────────────────────
  // Textures are pre-cached by CombatStage before enemies spawn.
  // This component reads the shared cache synchronously on mount.
  // Falls back to on-demand fetch + subscription for cache misses.
  const [spriteTexture, setSpriteTexture] = useState<Texture | null>(
    entity.sprite_key ? svgTextureCache.get(entity.sprite_key) ?? null : null,
  );

  useEffect(() => {
    if (!entity.sprite_key) return;

    // Already cached (preloaded by CombatStage)
    const cached = svgTextureCache.get(entity.sprite_key);
    if (cached) { setSpriteTexture(cached); return; }

    // Not cached yet — subscribe to cache updates and trigger on-demand fetch
    const unsubscribe = onCacheUpdate(() => {
      const tex = svgTextureCache.get(entity.sprite_key!);
      if (tex) { setSpriteTexture(tex); unsubscribe(); }
    });

    // Trigger fetch if not already in-flight (handles banner, training, boss)
    preloadEntitySprites([entity.sprite_key]);

    return unsubscribe;
  }, [entity.sprite_key]);

  // Stable random values computed once per entity_id
  const stableValues = useMemo(() => {
    const sizeScale = entity.size
      ? stableRandom(entity.entity_id, entity.size.scale_min, entity.size.scale_max)
      : 1;
    const yOffset = entity.movement
      ? stableRandom(entity.entity_id + 1, entity.movement.y_offset_min, entity.movement.y_offset_max)
      : 0;
    return { sizeScale, yOffset };
  }, [entity.entity_id, entity.size, entity.movement]);

  // Death particles (stable per entity)
  const deathParticles = useMemo<DeathParticle[]>(() => {
    const count = entity.animation?.death_particle_count ?? 12;
    return Array.from({ length: count }, (_, i) => ({
      ox: 0,
      oy: 0,
      vx: (Math.sin(i * 2.39996) * 3) + (Math.random() - 0.5) * 2,
      vy: (Math.cos(i * 2.39996) * 3) + (Math.random() - 0.5) * 2,
      size: 2 + Math.random() * 3,
    }));
  }, [entity.entity_id, entity.animation?.death_particle_count]);

  // Colors
  const primaryColor = hexToTint(entity.color_primary, 0x2a2a4a);
  const secondaryColor = hexToTint(entity.color_secondary, 0x1a1a3a);

  // Dimensions
  const baseW = entity.size?.width_base ?? FALLBACK_WIDTH;
  const baseH = entity.size?.height_base ?? FALLBACK_HEIGHT;
  const hitboxR = entity.size?.hitbox_radius ?? FALLBACK_RADIUS;
  const hpBarW = entity.size?.hp_bar_width ?? FALLBACK_HP_BAR_WIDTH;
  const scale = stableValues.sizeScale;

  // Animation params
  const idleScaleX = entity.animation?.idle_scale_x ?? 0.03;
  const idleScaleY = entity.animation?.idle_scale_y ?? 0.03;
  const idleCycleMs = entity.animation?.idle_cycle_ms ?? 1200;
  const bobAmp = entity.movement?.bob_amplitude ?? 0;
  const bobFreq = entity.movement?.bob_frequency ?? 1;
  const deathStyle = entity.animation?.death_style ?? 'fade';
  const deathDurationMs = entity.animation?.death_duration_ms ?? 600;

  // Silhouette
  const bodyShape = entity.silhouette?.body_shape ?? 'rect';
  const hasHead = entity.silhouette?.has_head ?? false;
  const hasLimbs = entity.silhouette?.has_limbs ?? false;
  const limbCount = entity.silhouette?.limb_count ?? 0;
  const hasWings = entity.silhouette?.has_wings ?? false;
  const hasEyeGlow = entity.silhouette?.has_eye_glow ?? false;
  const subUnitCount = entity.silhouette?.sub_unit_count ?? 1;
  const bodyRatioW = entity.silhouette?.body_ratio_w ?? 1;
  const bodyRatioH = entity.silhouette?.body_ratio_h ?? 1;
  const cornerRadius = entity.silhouette?.corner_radius ?? 0;
  const isFallback = !entity.movement && !entity.size && !entity.animation && !entity.silhouette;

  // HP bar
  const hpPct = (hp !== undefined && maxHp) ? Math.max(0, Math.min(1, hp / maxHp)) : 1;
  const hpColor = hpPct > 0.5 ? 0x00cc44 : hpPct > 0.25 ? 0xffaa00 : 0xcc0000;

  // Tick — update internal time
  useTick((delta) => {
    const dt = delta.deltaTime;
    timeRef.current += dt * 16.67; // approximate ms per frame at 60fps

    if (state === 'dying') {
      deathTimeRef.current += dt * 16.67;
      if (deathTimeRef.current >= deathDurationMs && !deathFiredRef.current) {
        deathFiredRef.current = true;
        onDeath?.();
      }
    }
  });

  // Use elapsedMs if provided, else internal timer
  const t = elapsedMs ?? timeRef.current;

  // Idle animation values
  const idleCycleRad = (t / idleCycleMs) * Math.PI * 2;
  const scaleOscX = state === 'idle' || state === 'attacking' ? Math.sin(idleCycleRad) * idleScaleX : 0;
  const scaleOscY = state === 'idle' || state === 'attacking' ? Math.cos(idleCycleRad) * idleScaleY : 0;
  const bobY = bobAmp * Math.sin(t * bobFreq * 0.006);

  // Death animation progress (0 to 1)
  const deathProgress = state === 'dying'
    ? Math.min(1, deathTimeRef.current / deathDurationMs)
    : state === 'dead' ? 1 : 0;

  // Death transform values
  let deathAlpha = 1;
  let deathScaleX = 1;
  let deathScaleY = 1;
  if (deathProgress > 0) {
    switch (deathStyle) {
      case 'fade':
        deathAlpha = 1 - deathProgress;
        break;
      case 'shrink':
        deathScaleX = 1 - deathProgress;
        deathScaleY = 1 - deathProgress;
        break;
      case 'dissolve':
        deathAlpha = 1 - deathProgress * 0.8;
        deathScaleX = 1 + deathProgress * 0.3;
        deathScaleY = 1 - deathProgress * 0.5;
        break;
      case 'shatter':
        deathAlpha = 1 - deathProgress;
        deathScaleX = 1 + deathProgress * 0.2;
        break;
      case 'explode':
        deathAlpha = 1 - deathProgress;
        deathScaleX = 1 + deathProgress * 0.5;
        deathScaleY = 1 + deathProgress * 0.5;
        break;
      default:
        deathAlpha = 1 - deathProgress;
    }
  }

  // Attack recoil
  const attackRecoil = state === 'attacking' ? (entity.animation?.attack_recoil ?? 4) : 0;
  const recoilX = attackRecoil * Math.sin(t * 0.02);

  // Final transform
  const finalX = x + recoilX;
  const finalY = y + stableValues.yOffset + bobY;
  const finalScaleX = scale * (1 + scaleOscX) * deathScaleX;
  const finalScaleY = scale * (1 + scaleOscY) * deathScaleY;

  // ── Draw body callback ────────────────────────────────────────────

  const drawBody = useCallback((g: any) => {
    g.clear();

    const w = baseW * bodyRatioW;
    const h = baseH * bodyRatioH;

    if (isFallback) {
      // Fallback: simple colored rectangle
      g.rect(-w / 2, -h, w, h).fill({ color: primaryColor, alpha: 0.9 });
      g.rect(-w / 2, -h, w, h).stroke({ width: 2, color: secondaryColor });
      return;
    }

    switch (bodyShape) {
      case 'orb':
        // Circle
        g.circle(0, -hitboxR, hitboxR).fill({ color: primaryColor, alpha: 0.9 });
        g.circle(0, -hitboxR, hitboxR).stroke({ width: 2, color: secondaryColor, alpha: 0.7 });
        break;

      case 'blob':
      case 'winged':
        // Ellipse
        g.ellipse(0, -h / 2, w / 2, h / 2).fill({ color: primaryColor, alpha: 0.9 });
        g.ellipse(0, -h / 2, w / 2, h / 2).stroke({ width: 2, color: secondaryColor, alpha: 0.7 });
        break;

      case 'cluster': {
        // Multiple small shapes
        const count = Math.max(2, subUnitCount);
        const unitR = hitboxR / Math.sqrt(count);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const cx = Math.cos(angle) * hitboxR * 0.4;
          const cy = -h / 2 + Math.sin(angle) * hitboxR * 0.4;
          g.circle(cx, cy, unitR).fill({ color: primaryColor, alpha: 0.85 });
          g.circle(cx, cy, unitR).stroke({ width: 1, color: secondaryColor, alpha: 0.6 });
        }
        break;
      }

      case 'biped':
      case 'quadruped':
      default: {
        // Rounded rectangle body
        if (cornerRadius > 0) {
          g.roundRect(-w / 2, -h, w, h, cornerRadius).fill({ color: primaryColor, alpha: 0.9 });
          g.roundRect(-w / 2, -h, w, h, cornerRadius).stroke({ width: 2, color: secondaryColor, alpha: 0.7 });
        } else {
          g.rect(-w / 2, -h, w, h).fill({ color: primaryColor, alpha: 0.9 });
          g.rect(-w / 2, -h, w, h).stroke({ width: 2, color: secondaryColor, alpha: 0.7 });
        }
        break;
      }
    }

    // ── Limbs ──────────────────────────────────────────────────────
    if (hasLimbs && limbCount > 0) {
      const legW = Math.max(3, w * 0.12);
      const legH = h * 0.3;
      const spacing = w / (limbCount + 1);
      for (let i = 0; i < limbCount; i++) {
        const lx = -w / 2 + spacing * (i + 1) - legW / 2;
        g.rect(lx, 0, legW, legH).fill({ color: secondaryColor, alpha: 0.8 });
      }
    }

    // ── Head ───────────────────────────────────────────────────────
    if (hasHead) {
      const headR = Math.max(6, w * 0.22);
      g.circle(0, -h - headR * 0.6, headR).fill({ color: primaryColor, alpha: 0.95 });
      g.circle(0, -h - headR * 0.6, headR).stroke({ width: 1.5, color: secondaryColor, alpha: 0.7 });

      // Eye glow
      if (hasEyeGlow) {
        const eyeY = -h - headR * 0.6;
        const eyeSpacing = headR * 0.35;
        g.circle(-eyeSpacing, eyeY, 2).fill({ color: 0xffcc00, alpha: 0.95 });
        g.circle(eyeSpacing, eyeY, 2).fill({ color: 0xffcc00, alpha: 0.95 });
      }
    }

    // ── Wings ──────────────────────────────────────────────────────
    if (hasWings) {
      const wingH = h * 0.6;
      const wingW = w * 0.5;
      // Left wing (triangle)
      g.moveTo(-w / 2, -h * 0.7)
        .lineTo(-w / 2 - wingW, -h * 0.7 - wingH * 0.3)
        .lineTo(-w / 2, -h * 0.3)
        .fill({ color: secondaryColor, alpha: 0.6 });
      // Right wing (triangle)
      g.moveTo(w / 2, -h * 0.7)
        .lineTo(w / 2 + wingW, -h * 0.7 - wingH * 0.3)
        .lineTo(w / 2, -h * 0.3)
        .fill({ color: secondaryColor, alpha: 0.6 });
    }
  }, [bodyShape, baseW, baseH, bodyRatioW, bodyRatioH, hitboxR, primaryColor, secondaryColor,
      cornerRadius, hasHead, hasLimbs, limbCount, hasWings, hasEyeGlow, subUnitCount, isFallback]);

  // ── Draw HP bar callback ──────────────────────────────────────────

  const drawHpBar = useCallback((g: any) => {
    g.clear();
    const barH = 6;
    g.rect(-hpBarW / 2, 0, hpBarW, barH).fill({ color: 0x222222 });
    g.rect(-hpBarW / 2, 0, hpBarW * hpPct, barH).fill({ color: hpColor });
  }, [hpBarW, hpPct, hpColor]);

  // ── Draw shadow callback ──────────────────────────────────────────

  const drawShadow = useCallback((g: any) => {
    g.clear();
    const shadowW = (baseW * bodyRatioW * scale) * 0.8;
    const shadowH = Math.max(5, shadowW * 0.25);
    g.ellipse(0, 0, shadowW, shadowH).fill({ color: 0x000000, alpha: 0.4 });
  }, [baseW, bodyRatioW, scale]);

  // ── Draw death particles callback ─────────────────────────────────

  const drawDeathParticlesGraphics = useCallback((g: any) => {
    g.clear();
    if (deathProgress <= 0) return;
    const elapsed = deathTimeRef.current;
    for (const p of deathParticles) {
      const px = p.vx * elapsed * 0.01;
      const py = p.vy * elapsed * 0.01;
      const alpha = Math.max(0, 1 - deathProgress);
      g.rect(px - p.size / 2, py - p.size / 2, p.size, p.size)
        .fill({ color: primaryColor, alpha });
    }
  }, [deathProgress, deathParticles, primaryColor]);

  // ── Name label position ───────────────────────────────────────────

  const totalH = (baseH * bodyRatioH) + (hasHead ? baseW * 0.22 * 0.6 : 0);
  const hpBarY = -(totalH * scale) - 16;
  const nameY = hpBarY - 14;

  if (state === 'dead') return null;

  return (
    <pixiContainer
      x={finalX}
      y={finalY}
      scale={{ x: finalScaleX, y: finalScaleY }}
      alpha={deathAlpha}
    >
      {/* Shadow */}
      <pixiGraphics draw={drawShadow} />

      {/* Body — sprite texture from asset registry, or procedural fallback */}
      {spriteTexture ? (
        <pixiSprite
          texture={spriteTexture}
          anchor={{ x: 0.5, y: 0.85 }}
          width={baseW * bodyRatioW * 2.5}
          height={baseH * bodyRatioH * 2.5}
          y={0}
        />
      ) : (
        <pixiGraphics draw={drawBody} />
      )}

      {/* Death particles (explode/shatter) */}
      {(deathStyle === 'explode' || deathStyle === 'shatter') && deathProgress > 0 && (
        <pixiGraphics draw={drawDeathParticlesGraphics} />
      )}

      {/* HP Bar */}
      {showHpBar && hp !== undefined && maxHp !== undefined && maxHp > 0 && (
        <pixiGraphics y={hpBarY} draw={drawHpBar} />
      )}

      {/* Name Label */}
      {showName && (
        <pixiText
          text={entity.name}
          y={nameY}
          x={0}
          anchor={0.5}
          style={new TextStyle({
            fontFamily: 'monospace',
            fontSize: 10,
            fill: '#aaaacc',
            fontWeight: 'bold',
          })}
        />
      )}
    </pixiContainer>
  );
};

export default EntityRenderer;
