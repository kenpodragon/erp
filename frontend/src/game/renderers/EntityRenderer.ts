/**
 * EntityRenderer — renders `entity_sprite` category to Canvas 2D.
 *
 * Draws base shape (circle/rect) with fill/stroke, optional features
 * (eyes, horns, aura), and a shadow ellipse.
 */

import type { RenderResult } from './PlaceholderRenderer';

export interface RenderDefinition {
  version?: number;
  base_shape?: 'circle' | 'rect';
  radius?: number;
  width?: number;
  height?: number;
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  features?: Feature[];
  shadow?: ShadowDef;
  size_category?: 'tiny' | 'small' | 'medium' | 'large' | 'boss';
  [key: string]: unknown;
}

interface Feature {
  type: string;
  shape?: string;
  count?: number;
  radius?: number;
  height?: number;
  color?: string;
  glow?: boolean;
  offset_y?: number;
  offset_x?: number;
  pulse?: boolean;
  pulse_speed?: number;
  size?: number;
}

interface ShadowDef {
  enabled?: boolean;
  offset_y?: number;
  scale_x?: number;
  opacity?: number;
}

const SIZE_MAP: Record<string, number> = {
  tiny: 12,
  small: 16,
  medium: 20,
  large: 30,
  boss: 60,
};

export function render(definition: RenderDefinition): RenderResult {
  const sizeCategory = definition.size_category || 'medium';
  const baseRadius = definition.radius || SIZE_MAP[sizeCategory] || 20;

  // Canvas size: enough to fit the entity + features + shadow
  const padding = 40;
  const canvasSize = (baseRadius * 2) + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize + 30; // extra space for shadow
  const ctx = canvas.getContext('2d')!;

  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  // Draw shadow
  const shadow = definition.shadow;
  if (!shadow || shadow.enabled !== false) {
    const shadowOffsetY = shadow?.offset_y ?? (baseRadius + 10);
    const shadowScaleX = shadow?.scale_x ?? 1.2;
    const shadowOpacity = shadow?.opacity ?? 0.3;
    ctx.save();
    ctx.globalAlpha = shadowOpacity;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, cy + shadowOffsetY, baseRadius * shadowScaleX, baseRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw aura feature (behind the body)
  const features = definition.features || [];
  for (const f of features) {
    if (f.type === 'aura') {
      const auraRadius = f.radius || baseRadius + 8;
      const auraColor = f.color || '#ff000033';
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
      ctx.fillStyle = auraColor;
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw base shape
  const fillColor = definition.fill_color || '#2a2a4a';
  const strokeColor = definition.stroke_color || '#444466';
  const strokeWidth = definition.stroke_width ?? 2;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  if (definition.base_shape === 'rect') {
    const w = definition.width || baseRadius * 1.5;
    const h = definition.height || baseRadius * 2;
    ctx.beginPath();
    ctx.rect(cx - w / 2, cy - h / 2, w, h);
    ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  } else {
    // Default: circle
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  }

  // Draw features
  for (const f of features) {
    if (f.type === 'aura') continue; // already drawn

    if (f.type === 'eyes') {
      const eyeCount = f.count || 2;
      const eyeRadius = f.radius || 3;
      const eyeColor = f.color || '#ff0000';
      const eyeOffsetY = f.offset_y || -5;
      const spacing = baseRadius * 0.5;

      ctx.fillStyle = eyeColor;
      for (let i = 0; i < eyeCount; i++) {
        const ex = cx + (i - (eyeCount - 1) / 2) * spacing;
        const ey = cy + eyeOffsetY;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        if (f.glow) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(ex, ey, eyeRadius * 2, 0, Math.PI * 2);
          ctx.fillStyle = eyeColor;
          ctx.fill();
          ctx.restore();
        }
      }
    }

    if (f.type === 'horns') {
      const hornCount = f.count || 2;
      const hornHeight = f.height || 8;
      const hornColor = f.color || '#443322';
      const hornOffsetY = f.offset_y || -(baseRadius + 2);
      const hornSpacing = baseRadius * 0.6;

      ctx.fillStyle = hornColor;
      for (let i = 0; i < hornCount; i++) {
        const hx = cx + (i - (hornCount - 1) / 2) * hornSpacing;
        const hy = cy + hornOffsetY;
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy);
        ctx.lineTo(hx, hy - hornHeight);
        ctx.lineTo(hx + 4, hy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  return { canvas, width: canvas.width, height: canvas.height };
}
