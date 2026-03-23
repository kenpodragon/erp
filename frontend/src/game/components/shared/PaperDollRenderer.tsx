/**
 * PaperDollRenderer — Shared PixiJS component for rendering the player character
 * with equipped gear layers. Used across Banner, CombatStage, BossStage,
 * Idle Training, and InventoryPanel.
 *
 * Uses PixiJS v8 with @pixi/react extend() pattern.
 */
import React, { useMemo, useRef, useCallback } from 'react';
import { useTick } from '@pixi/react';

// ── Exported Interfaces ──────────────────────────────────────────────

export interface ArmorClassVisual {
  code: string;
  overlay_opacity: number;
  texture_pattern: string;
  glow_intensity: number;
  color_tint_base?: string;
  outline_width?: number;
  weight_class?: string;
}

export interface EquippedLayer {
  layer: number;
  slot: string;
  sprite_key: string | null;
  armor_class?: ArmorClassVisual | null;
  player_attack_animation?: string | null;
}

export interface CharacterVisualData {
  character_id: number;
  level: number;
  aura_tier: string | null;
  equipped_layers: EquippedLayer[];
  unequipped_layers: number[];
}

export interface PaperDollRendererProps {
  character: CharacterVisualData;
  x: number;
  y: number;
  state: 'idle' | 'walking' | 'fighting' | 'dead';
  facingRight?: boolean;
  scale?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Parse a CSS hex color to a PixiJS numeric tint. */
function hexToTint(hex: string | undefined | null, fallback: number): number {
  if (!hex) return fallback;
  const cleaned = hex.replace('#', '');
  const parsed = parseInt(cleaned, 16);
  return isNaN(parsed) ? fallback : parsed;
}

/** Aura tier color mapping. */
const AURA_COLORS: Record<string, { color: number; alpha: number }> = {
  bronze: { color: 0xcc8844, alpha: 0.25 },
  silver: { color: 0x99aacc, alpha: 0.3 },
  gold: { color: 0xffdd44, alpha: 0.35 },
  cyan: { color: 0x00eeff, alpha: 0.4 },
};

// ── Base character dimensions ────────────────────────────────────────

const BODY_W = 24;
const BODY_H = 32;
const HEAD_R = 10;
const LEG_W = 6;
const LEG_H = 14;
const ARM_W = 5;
const ARM_H = 22;

// ── Component ────────────────────────────────────────────────────────

const PaperDollRenderer: React.FC<PaperDollRendererProps> = ({
  character,
  x,
  y,
  state,
  facingRight = true,
  scale: userScale = 1,
}) => {
  const timeRef = useRef(0);

  // Equipped layers indexed by layer number for fast lookup
  const layerMap = useMemo(() => {
    const map = new Map<number, EquippedLayer>();
    for (const eq of character.equipped_layers) {
      map.set(eq.layer, eq);
    }
    return map;
  }, [character.equipped_layers]);

  // Tick — update internal time
  useTick((delta) => {
    timeRef.current += delta.deltaTime * 16.67;
  });

  const t = timeRef.current;

  // State-based animation
  const idleBob = state === 'idle' ? Math.sin(t * 0.004) * 2 : 0;
  const walkBob = state === 'walking' ? Math.abs(Math.sin(t * 0.008)) * 4 : 0;
  const fightShake = state === 'fighting' ? Math.sin(t * 0.02) * 3 : 0;

  const finalX = x + fightShake;
  const finalY = y + idleBob + walkBob;
  const flipX = facingRight ? 1 : -1;

  if (state === 'dead') return null;

  // ── Draw aura ─────────────────────────────────────────────────────

  const auraConfig = character.aura_tier ? AURA_COLORS[character.aura_tier] : null;

  const drawAura = useCallback((g: any) => {
    g.clear();
    if (!auraConfig) return;
    const pulse = 1 + Math.sin(t * 0.003) * 0.1;
    const rx = 30 * pulse;
    const ry = 40 * pulse;
    g.ellipse(0, -BODY_H / 2, rx, ry)
      .fill({ color: auraConfig.color, alpha: auraConfig.alpha * 0.5 });
    // Outer ring
    g.ellipse(0, -BODY_H / 2, rx * 1.3, ry * 1.3)
      .fill({ color: auraConfig.color, alpha: auraConfig.alpha * 0.2 });
  }, [auraConfig, t]);

  // ── Draw base body ────────────────────────────────────────────────

  const drawBody = useCallback((g: any) => {
    g.clear();

    // Legs
    g.rect(-BODY_W / 2 + 2, 0, LEG_W, LEG_H)
      .fill({ color: 0x445566, alpha: 0.9 });
    g.rect(BODY_W / 2 - LEG_W - 2, 0, LEG_W, LEG_H)
      .fill({ color: 0x445566, alpha: 0.9 });

    // Torso
    g.rect(-BODY_W / 2, -BODY_H, BODY_W, BODY_H)
      .fill({ color: 0x556688, alpha: 0.9 });
    g.rect(-BODY_W / 2, -BODY_H, BODY_W, BODY_H)
      .stroke({ width: 1, color: 0x334466 });

    // Arms
    g.rect(-BODY_W / 2 - ARM_W, -BODY_H + 2, ARM_W, ARM_H)
      .fill({ color: 0x556688, alpha: 0.85 });
    g.rect(BODY_W / 2, -BODY_H + 2, ARM_W, ARM_H)
      .fill({ color: 0x556688, alpha: 0.85 });

    // Head
    g.circle(0, -BODY_H - HEAD_R, HEAD_R)
      .fill({ color: 0x887766, alpha: 0.95 });
    g.circle(0, -BODY_H - HEAD_R, HEAD_R)
      .stroke({ width: 1, color: 0x665544 });
  }, []);

  // ── Draw equipment layers ─────────────────────────────────────────

  const drawLayer1Back = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(1);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x664422);
    const alpha = ac?.overlay_opacity ?? 0.7;
    // Cape shape
    g.moveTo(-BODY_W / 2 + 2, -BODY_H)
      .lineTo(-BODY_W / 2 - 4, LEG_H)
      .lineTo(BODY_W / 2 + 4, LEG_H)
      .lineTo(BODY_W / 2 - 2, -BODY_H)
      .fill({ color, alpha });
    if (ac && ac.glow_intensity > 0) {
      g.moveTo(-BODY_W / 2 + 2, -BODY_H)
        .lineTo(-BODY_W / 2 - 4, LEG_H)
        .lineTo(BODY_W / 2 + 4, LEG_H)
        .lineTo(BODY_W / 2 - 2, -BODY_H)
        .stroke({ width: ac.glow_intensity * 2, color: 0xffffff, alpha: 0.3 });
    }
  }, [layerMap]);

  const drawLayer2Legs = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(2);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x555555);
    const alpha = ac?.overlay_opacity ?? 0.6;
    // Left leg overlay
    g.rect(-BODY_W / 2 + 1, 0, LEG_W + 2, LEG_H)
      .fill({ color, alpha });
    // Right leg overlay
    g.rect(BODY_W / 2 - LEG_W - 3, 0, LEG_W + 2, LEG_H)
      .fill({ color, alpha });
    if (ac && ac.glow_intensity > 0) {
      g.rect(-BODY_W / 2 + 1, 0, LEG_W + 2, LEG_H)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
      g.rect(BODY_W / 2 - LEG_W - 3, 0, LEG_W + 2, LEG_H)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
    }
  }, [layerMap]);

  const drawLayer3Chest = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(3);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x666666);
    const alpha = ac?.overlay_opacity ?? 0.65;
    // Chest overlay
    g.rect(-BODY_W / 2 - 1, -BODY_H, BODY_W + 2, BODY_H)
      .fill({ color, alpha });
    // Crosshatch pattern
    if (ac?.texture_pattern === 'crosshatch') {
      const step = 6;
      for (let i = -BODY_W / 2; i < BODY_W / 2; i += step) {
        g.moveTo(i, -BODY_H).lineTo(i + step, 0)
          .stroke({ width: 0.5, color: 0x000000, alpha: 0.2 });
        g.moveTo(i + step, -BODY_H).lineTo(i, 0)
          .stroke({ width: 0.5, color: 0x000000, alpha: 0.2 });
      }
    }
    if (ac && ac.glow_intensity > 0) {
      g.rect(-BODY_W / 2 - 1, -BODY_H, BODY_W + 2, BODY_H)
        .stroke({ width: ac.glow_intensity * 1.5, color: 0xffffff, alpha: 0.25 });
    }
  }, [layerMap]);

  const drawLayer4Hands = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(4);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x777777);
    const alpha = ac?.overlay_opacity ?? 0.7;
    const gauntletW = ARM_W + 2;
    const gauntletH = 10;
    // Left gauntlet
    g.rect(-BODY_W / 2 - ARM_W - 1, -BODY_H + ARM_H - gauntletH, gauntletW, gauntletH)
      .fill({ color, alpha });
    // Right gauntlet
    g.rect(BODY_W / 2 - 1, -BODY_H + ARM_H - gauntletH, gauntletW, gauntletH)
      .fill({ color, alpha });
    if (ac && ac.glow_intensity > 0) {
      g.rect(-BODY_W / 2 - ARM_W - 1, -BODY_H + ARM_H - gauntletH, gauntletW, gauntletH)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
      g.rect(BODY_W / 2 - 1, -BODY_H + ARM_H - gauntletH, gauntletW, gauntletH)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
    }
  }, [layerMap]);

  const drawLayer5Shoulders = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(5);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x888888);
    const alpha = ac?.overlay_opacity ?? 0.7;
    const pW = 10;
    const pH = 8;
    // Left pauldron
    g.roundRect(-BODY_W / 2 - ARM_W, -BODY_H - 2, pW, pH, 3)
      .fill({ color, alpha });
    // Right pauldron
    g.roundRect(BODY_W / 2 - pW + ARM_W, -BODY_H - 2, pW, pH, 3)
      .fill({ color, alpha });
    if (ac && ac.glow_intensity > 0) {
      g.roundRect(-BODY_W / 2 - ARM_W, -BODY_H - 2, pW, pH, 3)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
      g.roundRect(BODY_W / 2 - pW + ARM_W, -BODY_H - 2, pW, pH, 3)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.3 });
    }
  }, [layerMap]);

  const drawLayer6Head = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(6);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0x999999);
    const alpha = ac?.overlay_opacity ?? 0.65;
    // Helmet over head
    g.circle(0, -BODY_H - HEAD_R, HEAD_R + 2)
      .fill({ color, alpha });
    // Visor slit
    g.rect(-5, -BODY_H - HEAD_R - 1, 10, 3)
      .fill({ color: 0x222222, alpha: 0.8 });
    if (ac && ac.glow_intensity > 0) {
      g.circle(0, -BODY_H - HEAD_R, HEAD_R + 2)
        .stroke({ width: ac.glow_intensity * 1.5, color: 0xffffff, alpha: 0.25 });
    }
  }, [layerMap]);

  const drawLayer7Weapons = useCallback((g: any) => {
    g.clear();
    const eq = layerMap.get(7);
    if (!eq) return;
    const ac = eq.armor_class;
    const color = hexToTint(ac?.color_tint_base, 0xaaaaaa);
    const alpha = ac?.overlay_opacity ?? 0.85;
    const weaponLen = 28;
    const weaponW = 4;
    // Main hand (right side when facing right)
    const handX = BODY_W / 2 + ARM_W / 2;
    const handY = -BODY_H + ARM_H - 4;
    g.rect(handX - weaponW / 2, handY - weaponLen, weaponW, weaponLen)
      .fill({ color, alpha });
    // Guard
    g.rect(handX - weaponW, handY - weaponLen, weaponW * 2, 3)
      .fill({ color: 0x888888, alpha: 0.9 });
    if (ac && ac.glow_intensity > 0) {
      g.rect(handX - weaponW / 2, handY - weaponLen, weaponW, weaponLen)
        .stroke({ width: ac.glow_intensity, color: 0xffffff, alpha: 0.35 });
    }
    // Off hand check (slot === 'off_hand' means second weapon layer exists elsewhere)
    // For now, only main_hand is drawn from layer 7
  }, [layerMap]);

  // ── Draw shimmer overlay (for shimmer texture_pattern) ────────────

  const hasShimmer = useMemo(() => {
    for (const eq of character.equipped_layers) {
      if (eq.armor_class?.texture_pattern === 'shimmer') return true;
    }
    return false;
  }, [character.equipped_layers]);

  const drawShimmer = useCallback((g: any) => {
    g.clear();
    if (!hasShimmer) return;
    const shimmerAlpha = 0.1 + Math.sin(t * 0.005) * 0.08;
    g.rect(-BODY_W / 2 - ARM_W - 2, -BODY_H - HEAD_R * 2 - 4, BODY_W + ARM_W * 2 + 4, BODY_H + HEAD_R * 2 + LEG_H + 4)
      .fill({ color: 0xffffff, alpha: shimmerAlpha });
  }, [hasShimmer, t]);

  // ── Draw shadow ───────────────────────────────────────────────────

  const drawShadow = useCallback((g: any) => {
    g.clear();
    g.ellipse(0, LEG_H + 2, 16, 5)
      .fill({ color: 0x000000, alpha: 0.35 });
  }, []);

  return (
    <pixiContainer
      x={finalX}
      y={finalY}
      scale={{ x: userScale * flipX, y: userScale }}
    >
      {/* Layer 0: Aura */}
      {auraConfig && <pixiGraphics draw={drawAura} />}

      {/* Shadow */}
      <pixiGraphics draw={drawShadow} />

      {/* Layer 1: Back (cape/cloak) — behind body */}
      <pixiGraphics draw={drawLayer1Back} />

      {/* Base body */}
      <pixiGraphics draw={drawBody} />

      {/* Layer 2: Legs/Feet */}
      <pixiGraphics draw={drawLayer2Legs} />

      {/* Layer 3: Chest/Waist */}
      <pixiGraphics draw={drawLayer3Chest} />

      {/* Layer 4: Hands */}
      <pixiGraphics draw={drawLayer4Hands} />

      {/* Layer 5: Shoulders */}
      <pixiGraphics draw={drawLayer5Shoulders} />

      {/* Layer 6: Head */}
      <pixiGraphics draw={drawLayer6Head} />

      {/* Layer 7: Weapons */}
      <pixiGraphics draw={drawLayer7Weapons} />

      {/* Shimmer overlay */}
      {hasShimmer && <pixiGraphics draw={drawShimmer} />}
    </pixiContainer>
  );
};

export default PaperDollRenderer;
