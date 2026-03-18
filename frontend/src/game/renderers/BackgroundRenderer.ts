/**
 * BackgroundRenderer — renders `background` category to Canvas 2D.
 *
 * Draws gradient backgrounds with optional elements: stars, clouds,
 * buildings, nebula, pipes. Uses a seed for deterministic randomness.
 */

import type { RenderResult } from './PlaceholderRenderer';

export interface RenderDefinition {
  version?: number;
  width?: number;
  height?: number;
  gradient?: GradientDef;
  elements?: ElementDef[];
  seed?: number;
  [key: string]: unknown;
}

interface GradientDef {
  type?: 'linear' | 'radial';
  direction?: 'vertical' | 'horizontal';
  stops?: Array<{ offset: number; color: string }>;
}

interface ElementDef {
  type: string;
  count?: number;
  min_radius?: number;
  max_radius?: number;
  color?: string;
  twinkle?: boolean;
  y_range?: [number, number];
  width_range?: [number, number];
  height_range?: [number, number];
  x?: number;
  y?: number;
  radius?: number;
  [key: string]: unknown;
}

/**
 * Simple seeded PRNG (mulberry32).
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function render(definition: RenderDefinition): RenderResult {
  const width = definition.width || 512;
  const height = definition.height || 150;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const rand = seededRandom(definition.seed ?? Date.now());

  // Draw gradient
  const gradient = definition.gradient;
  if (gradient) {
    const stops = gradient.stops || [
      { offset: 0, color: '#0a0a1a' },
      { offset: 1, color: '#0d0d20' },
    ];

    let grad: CanvasGradient;
    if (gradient.type === 'radial') {
      grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    } else if (gradient.direction === 'horizontal') {
      grad = ctx.createLinearGradient(0, 0, width, 0);
    } else {
      // Default: vertical linear
      grad = ctx.createLinearGradient(0, 0, 0, height);
    }

    for (const stop of stops) {
      grad.addColorStop(stop.offset, stop.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw elements
  const elements = definition.elements || [];
  for (const el of elements) {
    switch (el.type) {
      case 'stars':
        drawStars(ctx, el, width, height, rand);
        break;
      case 'cloud':
        drawClouds(ctx, el, width, height, rand);
        break;
      case 'building':
      case 'buildings':
        drawBuildings(ctx, el, width, height, rand);
        break;
      case 'nebula':
        drawNebula(ctx, el, width, height, rand);
        break;
      case 'pipe':
      case 'pipes':
        drawPipes(ctx, el, width, height, rand);
        break;
    }
  }

  return { canvas, width, height };
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  el: ElementDef,
  width: number,
  height: number,
  rand: () => number,
) {
  const count = el.count || 20;
  const minR = el.min_radius || 1;
  const maxR = el.max_radius || 2;
  const color = el.color || '#ffffff44';

  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = rand() * height;
    const r = minR + rand() * (maxR - minR);
    const alpha = el.twinkle ? 0.3 + rand() * 0.7 : 1.0;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  el: ElementDef,
  width: number,
  height: number,
  rand: () => number,
) {
  const count = el.count || 3;
  const color = el.color || '#22224433';
  const yRange = el.y_range || [10, 50];
  const wRange = el.width_range || [40, 100];
  const hRange = el.height_range || [15, 30];

  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rand() * width;
    const y = yRange[0] + rand() * (yRange[1] - yRange[0]);
    const w = wRange[0] + rand() * (wRange[1] - wRange[0]);
    const h = hRange[0] + rand() * (hRange[1] - hRange[0]);
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  el: ElementDef,
  width: number,
  height: number,
  rand: () => number,
) {
  const color = el.color || '#111122';
  ctx.fillStyle = color;

  // Explicit single building (from DB definitions with x, width, height)
  if (el.x !== undefined && el.width !== undefined && el.height !== undefined) {
    const bw = el.width as number;
    const bh = el.height as number;
    const bx = el.x as number;
    ctx.fillRect(bx, height - bh, bw, bh);
    return;
  }

  // Random batch (legacy plural 'buildings' with count)
  const count = el.count || 5;
  for (let i = 0; i < count; i++) {
    const bw = 20 + rand() * 40;
    const bh = 30 + rand() * 60;
    const x = rand() * width;
    ctx.fillRect(x - bw / 2, height - bh, bw, bh);
  }
}

function drawNebula(
  ctx: CanvasRenderingContext2D,
  el: ElementDef,
  width: number,
  height: number,
  rand: () => number,
) {
  const x = el.x ?? width / 2;
  const y = el.y ?? height / 2;
  const radius = el.radius || Math.min(width, height) * 0.4;
  const color = el.color || '#44228866';

  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipes(
  ctx: CanvasRenderingContext2D,
  el: ElementDef,
  width: number,
  height: number,
  rand: () => number,
) {
  const color = el.color || '#333344';
  ctx.strokeStyle = color;
  ctx.lineWidth = (el.width as number) || 2;

  // Explicit single pipe (from DB definitions with x1, y1, x2, y2)
  if (el.x1 !== undefined && el.y1 !== undefined && el.x2 !== undefined && el.y2 !== undefined) {
    ctx.beginPath();
    ctx.moveTo(el.x1 as number, el.y1 as number);
    ctx.lineTo(el.x2 as number, el.y2 as number);
    ctx.stroke();
    return;
  }

  // Random batch (legacy plural 'pipes' with count)
  const count = el.count || 3;
  for (let i = 0; i < count; i++) {
    const x1 = rand() * width;
    const y1 = rand() * height;
    const x2 = rand() * width;
    const y2 = rand() * height;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
