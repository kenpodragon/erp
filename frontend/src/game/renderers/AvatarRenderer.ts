/**
 * AvatarRenderer — renders `avatar` category to Canvas 2D.
 *
 * Draws a face/bust composition for player profile pictures:
 * background fill, face shape, eyes, optional features (mask, hood, etc.),
 * and a border circle.
 */

import type { RenderResult } from './PlaceholderRenderer';

export interface RenderDefinition {
  version?: number;
  size?: number;
  background_color?: string;
  face?: FaceDef;
  eyes?: EyesDef;
  features?: FeatureDef[];
  border?: BorderDef;
  [key: string]: unknown;
}

interface FaceDef {
  shape?: 'oval' | 'circle';
  width?: number;
  height?: number;
  fill_color?: string;
}

interface EyesDef {
  shape?: 'circle' | 'almond' | 'narrow';
  color?: string;
  size?: number;
  glow?: boolean;
  spacing?: number;
}

interface FeatureDef {
  type: string;
  shape?: string;
  color?: string;
  opacity?: number;
  offset_y?: number;
  offset_x?: number;
  width?: number;
  height?: number;
}

interface BorderDef {
  shape?: 'circle' | 'square';
  color?: string;
  width?: number;
}

export function render(definition: RenderDefinition): RenderResult {
  const size = definition.size || 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Background fill
  ctx.fillStyle = definition.background_color || '#1a1a2e';
  ctx.fillRect(0, 0, size, size);

  // Face
  const face = definition.face;
  if (face) {
    const faceW = face.width || size * 0.45;
    const faceH = face.height || size * 0.55;
    const faceColor = face.fill_color || '#ddccbb';

    ctx.fillStyle = faceColor;
    ctx.beginPath();
    if (face.shape === 'circle') {
      ctx.arc(cx, cy, Math.min(faceW, faceH) / 2, 0, Math.PI * 2);
    } else {
      // Oval
      ctx.ellipse(cx, cy, faceW / 2, faceH / 2, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Eyes
  const eyes = definition.eyes;
  if (eyes) {
    const eyeSize = eyes.size || 8;
    const eyeColor = eyes.color || '#3388ff';
    const spacing = eyes.spacing || 20;
    const eyeY = cy - (definition.face?.height || size * 0.55) * 0.1;

    ctx.fillStyle = eyeColor;

    const drawEye = (ex: number, ey: number) => {
      if (eyes.shape === 'almond') {
        // Almond shape: two arcs
        ctx.beginPath();
        ctx.ellipse(ex, ey, eyeSize, eyeSize * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (eyes.shape === 'narrow') {
        ctx.beginPath();
        ctx.ellipse(ex, ey, eyeSize, eyeSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(ex, ey, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pupil
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eyeColor;

      // Glow
      if (eyes.glow) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    drawEye(cx - spacing / 2, eyeY);
    drawEye(cx + spacing / 2, eyeY);
  }

  // Features
  const features = definition.features || [];
  for (const f of features) {
    const offsetY = f.offset_y || 0;
    const offsetX = f.offset_x || 0;
    const opacity = f.opacity ?? 1.0;

    ctx.save();
    ctx.globalAlpha = opacity;

    switch (f.type) {
      case 'mask': {
        const color = f.color || '#eeeeee';
        ctx.fillStyle = color;
        if (f.shape === 'half_circle') {
          ctx.beginPath();
          ctx.arc(cx + offsetX, cy + offsetY, size * 0.2, 0, Math.PI);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(cx + offsetX, cy + offsetY, size * 0.2, size * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'jaw': {
        ctx.fillStyle = f.color || '#ccbbaa';
        ctx.beginPath();
        ctx.ellipse(cx + offsetX, cy + size * 0.15 + offsetY, size * 0.15, size * 0.1, 0, 0, Math.PI);
        ctx.fill();
        break;
      }
      case 'brow': {
        ctx.strokeStyle = f.color || '#554433';
        ctx.lineWidth = 3;
        const browY = cy - size * 0.15 + offsetY;
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.12 + offsetX, browY);
        ctx.quadraticCurveTo(cx + offsetX, browY - 5, cx + size * 0.12 + offsetX, browY);
        ctx.stroke();
        break;
      }
      case 'hood': {
        ctx.fillStyle = f.color || '#222244';
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy - size * 0.05 + offsetY, size * 0.4, Math.PI, 0);
        ctx.fill();
        break;
      }
      default: {
        // Generic feature: small colored circle
        ctx.fillStyle = f.color || '#888888';
        ctx.beginPath();
        ctx.arc(cx + offsetX, cy + offsetY, size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  // Border
  const border = definition.border;
  if (border) {
    const borderColor = border.color || '#7b5ea7';
    const borderWidth = border.width || 3;

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    if (border.shape === 'square') {
      ctx.strokeRect(
        borderWidth / 2,
        borderWidth / 2,
        size - borderWidth,
        size - borderWidth,
      );
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - borderWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return { canvas, width: size, height: size };
}
