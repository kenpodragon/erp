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
    get: vi.fn().mockImplementation((url: string) => {
      if (url.includes('/enemies/encountered')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/character/visuals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            character_id: 1,
            level: 5,
            aura_tier: null,
            equipped_layers: [],
            unequipped_layers: [1, 2, 3, 4, 5, 6, 7],
          })
        });
      }
      if (url.includes('/story/configs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            banner_base_enemies: '1',
            banner_max_enemies: '15',
            banner_enemies_per_level: '0.15',
            banner_death_base_rate: '0.03',
            banner_death_reduction_per_level: '0.0003',
            banner_death_floor: '0.002',
            banner_kill_speed_base_ms: '3000',
            banner_kill_speed_min_ms: '200',
            banner_spawn_rate_base: '0.05',
            banner_spawn_rate_combat: '0.01',
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
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
}));

// Mock the child BannerBackground component
vi.mock('./BannerBackground', () => ({
  default: () => <div data-testid="banner-background" />
}));

// Mock shared renderers
vi.mock('./shared/EntityRenderer', () => ({
  default: () => <div data-testid="entity-renderer" />,
}));

vi.mock('./shared/PaperDollRenderer', () => ({
  default: () => <div data-testid="paper-doll-renderer" />,
}));

vi.mock('./shared/AttackRenderer', () => ({
  default: () => <div data-testid="attack-renderer" />,
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
    intelligence: 10,
    level: 5
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
