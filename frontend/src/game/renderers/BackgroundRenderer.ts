/**
 * BackgroundRenderer — component assembly engine for parallax backgrounds.
 *
 * Renders backgrounds from render_definitions that reference element types
 * and component variants stored in asset_registry. Uses seeded PRNG for
 * deterministic assembly: variant selection, color shifts, scale, rotation.
 *
 * Flow:
 *   render_definition → gradient + elements array
 *   For each element entry → resolve element_definition from cache
 *   For each instance → pick variant per slot → resolve colors → render SVG paths → composite
 */

import type { RenderResult } from './PlaceholderRenderer';

// ── Public Types ──────────────────────────────────────────────────────────

export interface RenderDefinition {
  version?: number;
  width?: number;
  height?: number;
  gradient?: GradientDef;
  elements?: ElementEntry[];
  seed?: number;
  opacity?: number;
  [key: string]: unknown;
}

interface GradientDef {
  type?: 'linear' | 'radial';
  direction?: 'vertical' | 'horizontal';
  stops?: Array<{ offset: number; color: string }>;
}

/** An element placement in a background render_definition. */
interface ElementEntry {
  element_type: string;
  count?: number;
  y_range?: [number, number];
  size_range?: [number, number];
  rotation_range?: [number, number];
  x_spacing?: 'random' | 'even' | 'clustered';
  flip_chance?: number;
  opacity?: number;
  [key: string]: unknown;
}

/** Element type definition from asset_registry (category: bg_element_def). */
export interface ElementDefinition {
  type: 'element_definition';
  element_type: string;
  components: Record<string, string[]>;
  anchor: { x: number; y: number };
  base_width: number;
  base_height: number;
}

/** SVG component variant from asset_registry (category: bg_component). */
export interface ComponentVariant {
  type: 'bg_component';
  slot: string;
  svg_paths: SvgPath[];
  color_slots: Record<string, ColorSlot>;
}

interface SvgPath {
  d: string;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
}

interface ColorSlot {
  base: string;
  variance: number;
}

/** Lookup interface for the component cache. */
export interface ComponentCache {
  getElementDef(elementType: string): ElementDefinition | null;
  getComponent(assetKey: string): ComponentVariant | null;
  isReady: boolean;
}

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Color Utilities ───────────────────────────────────────────────────────

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function shiftColor(baseHex: string, variance: number, rand: () => number): string {
  const hsl = hexToHSL(baseHex);
  hsl.h += (rand() - 0.5) * variance;
  hsl.s = Math.max(0, Math.min(1, hsl.s + (rand() - 0.5) * variance));
  hsl.l = Math.max(0, Math.min(1, hsl.l + (rand() - 0.5) * variance * 0.5));
  if (hsl.h < 0) hsl.h += 1;
  if (hsl.h > 1) hsl.h -= 1;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

// ── SVG Path → Canvas 2D Rendering ───────────────────────────────────────

function renderSvgPaths(
  ctx: CanvasRenderingContext2D,
  paths: SvgPath[],
  resolvedColors: Record<string, string>,
  scale: number,
  x: number,
  y: number,
  rotation: number,
  flipX: boolean,
  opacity: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (flipX) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.globalAlpha *= opacity;

  for (const path of paths) {
    const path2d = new Path2D(path.d);

    if (path.fill && path.fill !== 'none') {
      const fillColor = path.fill.startsWith('{')
        ? resolvedColors[path.fill.slice(1, -1)] || '#FF00FF'
        : path.fill;
      ctx.fillStyle = fillColor;
      ctx.fill(path2d);
    }

    if (path.stroke && path.stroke !== 'none') {
      const strokeColor = path.stroke.startsWith('{')
        ? resolvedColors[path.stroke.slice(1, -1)] || '#FF00FF'
        : path.stroke;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (path.stroke_width || 1) * scale;
      ctx.stroke(path2d);
    }
  }

  ctx.restore();
}

// ── Component Assembly ────────────────────────────────────────────────────

function assembleElement(
  ctx: CanvasRenderingContext2D,
  elementDef: ElementDefinition,
  entry: ElementEntry,
  instanceIndex: number,
  canvasWidth: number,
  canvasHeight: number,
  rand: () => number,
  cache: ComponentCache,
): void {
  const sizeRange = entry.size_range || [0.8, 1.2];
  const yRange = entry.y_range || [0.6, 0.95];
  const rotRange = entry.rotation_range || [0, 0];
  const flipChance = entry.flip_chance || 0;
  const elOpacity = entry.opacity ?? 1;

  // Scale for this instance
  const scale = sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]);

  // Position
  const spacing = entry.x_spacing || 'random';
  let x: number;
  const count = entry.count || 1;
  if (spacing === 'even') {
    const step = canvasWidth / count;
    x = step * instanceIndex + step * 0.5 + (rand() - 0.5) * step * 0.3;
  } else if (spacing === 'clustered') {
    const center = rand() * canvasWidth;
    x = center + (rand() - 0.5) * canvasWidth * 0.3;
  } else {
    x = rand() * canvasWidth;
  }

  const yFraction = yRange[0] + rand() * (yRange[1] - yRange[0]);
  const y = yFraction * canvasHeight;

  const rotation = rotRange[0] + rand() * (rotRange[1] - rotRange[0]);
  const flipX = rand() < flipChance;

  // For each component slot, pick a variant and render
  for (const [_slot, variantKeys] of Object.entries(elementDef.components)) {
    if (!variantKeys || variantKeys.length === 0) continue;

    // Pick variant using PRNG
    const variantKey = variantKeys[Math.floor(rand() * variantKeys.length)];
    const variant = cache.getComponent(variantKey);
    if (!variant) continue;

    // Resolve color placeholders
    const resolvedColors: Record<string, string> = {};
    for (const [slotName, colorDef] of Object.entries(variant.color_slots || {})) {
      resolvedColors[slotName] = shiftColor(colorDef.base, colorDef.variance, rand);
    }

    // Apply anchor offset
    const anchorOffsetX = -elementDef.anchor.x * elementDef.base_width * scale;
    const anchorOffsetY = -elementDef.anchor.y * elementDef.base_height * scale;

    renderSvgPaths(
      ctx,
      variant.svg_paths,
      resolvedColors,
      scale,
      x + anchorOffsetX,
      y + anchorOffsetY,
      rotation,
      flipX,
      elOpacity,
    );
  }
}

// ── Main Render Function ──────────────────────────────────────────────────

export function render(
  definition: RenderDefinition,
  componentCache?: ComponentCache | null,
): RenderResult {
  const width = definition.width || 512;
  const height = definition.height || 150;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const globalOpacity = definition.opacity ?? 1;
  ctx.globalAlpha = globalOpacity;

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

  // Draw elements via component assembly
  const elements = definition.elements || [];
  if (componentCache?.isReady) {
    for (const entry of elements) {
      if (!entry.element_type) continue;
      const elemDef = componentCache.getElementDef(entry.element_type);
      if (!elemDef) continue;
      const count = entry.count || 1;
      for (let i = 0; i < count; i++) {
        assembleElement(ctx, elemDef, entry, i, width, height, rand, componentCache);
      }
    }
  }

  return { canvas, width, height };
}
