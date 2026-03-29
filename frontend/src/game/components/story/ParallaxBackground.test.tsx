import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ParallaxBackground from './ParallaxBackground';

// Mock api module
vi.mock('../../../api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ ok: false, status: 404 })),
  },
  apiEvents: new EventTarget(),
}));

// Mock BackgroundComponentCache
vi.mock('../../renderers/BackgroundComponentCache', () => ({
  backgroundComponentCache: {
    load: vi.fn(() => Promise.resolve()),
    isReady: true,
    getElementDef: vi.fn(() => null),
    getComponent: vi.fn(() => null),
  },
}));

// Mock @pixi/react and pixi.js
vi.mock('@pixi/react', () => ({
  extend: vi.fn(),
  useTick: vi.fn(),
}));

vi.mock('pixi.js', () => ({
  TilingSprite: 'TilingSprite',
  Texture: Object.assign(vi.fn(), {
    from: vi.fn(() => ({ height: 150 })),
  }),
}));

// Map pixi elements to divs for testing
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    createElement: (type: any, props: any, ...children: any[]) => {
      if (type === 'pixiContainer' || type === 'pixiTilingSprite') {
        return actual.createElement('div', { 'data-testid': type, ...props }, ...children);
      }
      return actual.createElement(type, props, ...children);
    },
  };
});

describe('ParallaxBackground Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ParallaxBackground width={800} height={300} chapterId={1} waveCount={0} />
    );
    expect(container).toBeDefined();
  });

  it('accepts different chapter IDs without error', () => {
    for (const chapterId of [1, 50, 91, 114, 138]) {
      const { container } = render(
        <ParallaxBackground width={800} height={300} chapterId={chapterId} waveCount={5} />
      );
      expect(container).toBeDefined();
    }
  });
});
