import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BannerBackground from './BannerBackground';

// Mock api module
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ ok: false, status: 404 })),
  },
  apiEvents: new EventTarget(),
}));

// Mock @pixi/react and pixi.js
vi.mock('@pixi/react', () => ({
  extend: vi.fn(),
  useTick: vi.fn((callback) => {
    // Optionally trigger the tick callback once to simulate an animation frame if needed
  }),
}));

vi.mock('pixi.js', () => ({
  Container: 'Container',
  Graphics: 'Graphics',
  TilingSprite: 'TilingSprite',
  Assets: {
    load: vi.fn().mockResolvedValue({}),
  },
  Texture: Object.assign(vi.fn(), {
    from: vi.fn(() => ({})),
  }),
}));

// Provide mocked react-pixi elements for testing
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    createElement: (type: any, props: any, ...children: any[]) => {
      // Map custom pixi elements to generic divs for testing
      if (type === 'pixiContainer' || type === 'pixiGraphics' || type === 'pixiTilingSprite') {
        return actual.createElement('div', { 'data-testid': type, ...props }, ...children);
      }
      return actual.createElement(type, props, ...children);
    },
  };
});

describe('BannerBackground Component', () => {
  it('renders without crashing given basic props', () => {
    // Render the component (note: initial state won't render anything until textures load, 
    // but we can at least ensure it mounts)
    const { container } = render(
      <BannerBackground chapterId={1} scrollSpeed={1} width={800} height={150} />
    );
    
    expect(container).toBeDefined();
  });
});
