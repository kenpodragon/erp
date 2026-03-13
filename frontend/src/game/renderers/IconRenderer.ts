/**
 * IconRenderer — renders icon categories to Canvas 2D.
 *
 * Handles: item_icon, artifact_icon, achievement_icon, skill_icon, ui_icon.
 * Draws background shape, centered symbol, optional rarity border,
 * and locked variant (grayscale + overlay + lock icon).
 */

import type { RenderResult } from './PlaceholderRenderer';

export interface RenderDefinition {
  version?: number;
  size?: number;
  background?: BackgroundDef;
  symbol?: SymbolDef;
  rarity_border?: Record<string, string>;
  locked_variant?: LockedDef;
  rarity?: string;
  locked?: boolean;
  [key: string]: unknown;
}

interface BackgroundDef {
  shape?: 'rounded_rect' | 'circle';
  corner_radius?: number;
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
}

interface SymbolDef {
  type?: string;
  shape?: 'diamond' | 'circle' | 'triangle' | 'hexagon' | 'star' | 'square';
  size?: number;
  fill_color?: string;
  stroke_color?: string;
  rotation?: number;
}

interface LockedDef {
  grayscale?: boolean;
  overlay_color?: string;
  lock_icon?: boolean;
}

export function render(definition: RenderDefinition): RenderResult {
  const size = definition.size || 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bg = definition.background;
  const sym = definition.symbol;
  const rarity = definition.rarity;
  const locked = definition.locked;

  // Draw background shape
  const fillColor = bg?.fill_color || '#1a1a2e';
  const strokeColor = bg?.stroke_color || '#333355';
  const strokeWidth = bg?.stroke_width ?? 2;

  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  if (bg?.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - strokeWidth, 0, Math.PI * 2);
    ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  } else {
    // Default: rounded_rect
    const cr = bg?.corner_radius ?? 8;
    roundRect(ctx, strokeWidth, strokeWidth, size - strokeWidth * 2, size - strokeWidth * 2, cr);
    ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  }

  // Draw rarity border
  if (rarity && definition.rarity_border) {
    const borderColor = definition.rarity_border[rarity];
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      if (bg?.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const cr = bg?.corner_radius ?? 8;
        roundRect(ctx, 1, 1, size - 2, size - 2, cr);
        ctx.stroke();
      }
    }
  }

  // Draw symbol
  if (sym) {
    const symSize = sym.size || 24;
    const symFill = sym.fill_color || '#7b5ea7';
    const symStroke = sym.stroke_color || '#9b7ec7';
    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    if (sym.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((sym.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.fillStyle = symFill;
    ctx.strokeStyle = symStroke;
    ctx.lineWidth = 1.5;

    const shape = sym.shape || 'diamond';
    drawSymbol(ctx, shape, cx, cy, symSize);
    ctx.restore();
  }

  // Apply locked variant
  if (locked && definition.locked_variant) {
    const lv = definition.locked_variant;

    if (lv.grayscale) {
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    if (lv.overlay_color) {
      ctx.fillStyle = lv.overlay_color;
      ctx.fillRect(0, 0, size, size);
    }

    if (lv.lock_icon) {
      // Draw a simple lock icon
      const lockSize = size * 0.3;
      const lx = size / 2;
      const ly = size / 2;
      ctx.fillStyle = '#888888';
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;

      // Lock body
      ctx.beginPath();
      ctx.rect(lx - lockSize / 2, ly - lockSize / 4, lockSize, lockSize * 0.6);
      ctx.fill();
      ctx.stroke();

      // Lock shackle
      ctx.beginPath();
      ctx.arc(lx, ly - lockSize / 4, lockSize * 0.3, Math.PI, 0);
      ctx.stroke();
    }
  }

  return { canvas, width: size, height: size };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  shape: string,
  cx: number,
  cy: number,
  size: number,
) {
  const half = size / 2;

  switch (shape) {
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy + half);
      ctx.lineTo(cx - half, cy + half);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'hexagon': {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + half * Math.cos(angle);
        const py = cy + half * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'star': {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? half : half * 0.4;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'square':
    default:
      ctx.beginPath();
      ctx.rect(cx - half, cy - half, size, size);
      ctx.fill();
      ctx.stroke();
      break;
  }
}
