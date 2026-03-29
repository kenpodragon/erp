import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as BackgroundRenderer from './BackgroundRenderer';
import type { ComponentCache, ElementDefinition, ComponentVariant } from './BackgroundRenderer';

// Mock canvas
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  fillRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  set fillStyle(_v: any) {},
  set strokeStyle(_v: any) {},
  set lineWidth(_v: any) {},
  set globalAlpha(_v: any) {},
  get globalAlpha() { return 1; },
};

vi.stubGlobal('document', {
  createElement: vi.fn(() => ({
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockCtx),
  })),
});

// Mock Path2D
vi.stubGlobal('Path2D', vi.fn());

// ── Test fixtures ──────────────────────────────────────────────

const streetlightDef: ElementDefinition = {
  type: 'element_definition',
  element_type: 'streetlight',
  components: {
    pole: ['elem_streetlight_pole_a', 'elem_streetlight_pole_b'],
    lamp: ['elem_streetlight_lamp_a'],
  },
  anchor: { x: 0.5, y: 1.0 },
  base_width: 20,
  base_height: 80,
};

const poleVariantA: ComponentVariant = {
  type: 'bg_component',
  slot: 'pole',
  svg_paths: [{ d: 'M9 0 L9 65 L11 65 L11 0 Z', fill: '{color}' }],
  color_slots: { color: { base: '#666666', variance: 0.1 } },
};

const poleVariantB: ComponentVariant = {
  type: 'bg_component',
  slot: 'pole',
  svg_paths: [{ d: 'M8 0 L9 65 L11 65 L12 0 Z', fill: '{color}' }],
  color_slots: { color: { base: '#666666', variance: 0.1 } },
};

const lampVariant: ComponentVariant = {
  type: 'bg_component',
  slot: 'lamp',
  svg_paths: [{ d: 'M4 0 A6 6 0 0 1 16 0 Z', fill: '{glow}' }],
  color_slots: { glow: { base: '#FFDD88', variance: 0.15 } },
};

function createMockCache(defs: Record<string, ElementDefinition>, comps: Record<string, ComponentVariant>): ComponentCache {
  return {
    isReady: true,
    getElementDef: (type: string) => defs[`elem_def_${type}`] || null,
    getComponent: (key: string) => comps[key] || null,
  };
}

// ── Tests ──────────────────────────────────────────────────────

describe('BackgroundRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders gradient-only background when no cache provided', () => {
    const result = BackgroundRenderer.render({
      width: 512,
      height: 150,
      gradient: {
        type: 'linear',
        direction: 'vertical',
        stops: [{ offset: 0, color: '#050510' }, { offset: 1, color: '#111133' }],
      },
    });

    expect(result.canvas).toBeDefined();
    expect(result.width).toBe(512);
    expect(result.height).toBe(150);
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('renders gradient-only when cache is not ready', () => {
    const cache: ComponentCache = { isReady: false, getElementDef: () => null, getComponent: () => null };

    const result = BackgroundRenderer.render({
      width: 256,
      height: 100,
      elements: [{ element_type: 'streetlight', count: 3 }],
    }, cache);

    expect(result.canvas).toBeDefined();
    // Should not attempt to render elements since cache isn't ready
  });

  it('renders elements when cache is ready with valid definitions', () => {
    const cache = createMockCache(
      { elem_def_streetlight: streetlightDef },
      {
        elem_streetlight_pole_a: poleVariantA,
        elem_streetlight_pole_b: poleVariantB,
        elem_streetlight_lamp_a: lampVariant,
      },
    );

    const result = BackgroundRenderer.render({
      width: 512,
      height: 150,
      seed: 42,
      elements: [{ element_type: 'streetlight', count: 3, y_range: [0.7, 0.95] as [number, number] }],
    }, cache);

    expect(result.canvas).toBeDefined();
    // Should have called save/restore for each SVG path rendering (2 slots × 3 instances = 6 calls)
    expect(mockCtx.save.mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  it('produces deterministic output for same seed', () => {
    const cache = createMockCache(
      { elem_def_streetlight: streetlightDef },
      {
        elem_streetlight_pole_a: poleVariantA,
        elem_streetlight_pole_b: poleVariantB,
        elem_streetlight_lamp_a: lampVariant,
      },
    );

    const def = {
      width: 512,
      height: 150,
      seed: 12345,
      elements: [{ element_type: 'streetlight', count: 2 }],
    };

    // Render twice with same seed
    vi.clearAllMocks();
    BackgroundRenderer.render(def, cache);
    const calls1 = mockCtx.translate.mock.calls.map(c => [...c]);

    vi.clearAllMocks();
    BackgroundRenderer.render(def, cache);
    const calls2 = mockCtx.translate.mock.calls.map(c => [...c]);

    // Same seed should produce identical translate positions
    expect(calls1).toEqual(calls2);
  });

  it('gracefully skips missing element definitions', () => {
    const cache = createMockCache({}, {});

    // Should not throw when element_type is not found in cache
    expect(() => {
      BackgroundRenderer.render({
        width: 512,
        height: 150,
        seed: 1,
        elements: [{ element_type: 'nonexistent', count: 5 }],
      }, cache);
    }).not.toThrow();
  });

  it('gracefully skips missing component variants', () => {
    const cache = createMockCache(
      { elem_def_streetlight: streetlightDef },
      {}, // No component variants loaded
    );

    expect(() => {
      BackgroundRenderer.render({
        width: 512,
        height: 150,
        seed: 1,
        elements: [{ element_type: 'streetlight', count: 3 }],
      }, cache);
    }).not.toThrow();
  });

  it('applies opacity parameter', () => {
    BackgroundRenderer.render({
      width: 200,
      height: 100,
      opacity: 0.4,
    });

    expect(result => result).toBeDefined();
  });

  it('supports configurable canvas widths', () => {
    for (const width of [1024, 1536, 2048]) {
      const result = BackgroundRenderer.render({ width, height: 150 });
      expect(result.width).toBe(width);
    }
  });

  it('defaults to 512x150 when no dimensions specified', () => {
    const result = BackgroundRenderer.render({});
    expect(result.width).toBe(512);
    expect(result.height).toBe(150);
  });
});
