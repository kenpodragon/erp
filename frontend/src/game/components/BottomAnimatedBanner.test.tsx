import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BottomAnimatedBanner from './BottomAnimatedBanner';

// Mock GameContext
vi.mock('../GameContext', () => ({
  useGame: () => ({
    state: {
      activeVisualChapterId: 1,
    }
  })
}));

// Mock API
vi.mock('../../api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    })
  }
}));

// Mock @pixi/react and pixi.js to avoid WebGL context errors in JSDOM
vi.mock('@pixi/react', () => ({
  Application: ({ children }: { children: React.ReactNode }) => <div data-testid="pixi-application">{children}</div>,
  extend: vi.fn(),
  useTick: vi.fn(),
}));

vi.mock('pixi.js', () => ({
  Container: 'Container',
  Graphics: 'Graphics',
  Text: 'Text',
  TextStyle: vi.fn(),
  TilingSprite: 'TilingSprite',
  Assets: {
    load: vi.fn().mockResolvedValue({}),
  },
  Texture: vi.fn(),
  Sprite: 'Sprite',
  ColorMatrixFilter: class {
    hue = vi.fn()
  }
}));

// Mock the child BannerBackground component
vi.mock('./BannerBackground', () => ({
  default: () => <div data-testid="banner-background" />
}));

describe('BottomAnimatedBanner Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCharacter = {
    id: 1,
    character_name: 'Test Character',
    strength: 10,
    agility: 10,
    intelligence: 10
  };

  it('renders without crashing and wraps content in Pixi Application', () => {
    const { getByTestId, container } = render(<BottomAnimatedBanner character={mockCharacter} />);
    
    expect(container.querySelector('.bottom-banner-container')).toBeDefined();
    expect(getByTestId('pixi-application')).toBeDefined();
  });

  it('renders with fallback when no character is provided', () => {
    const { getByTestId } = render(<BottomAnimatedBanner character={null} />);
    
    expect(getByTestId('pixi-application')).toBeDefined();
  });
});
