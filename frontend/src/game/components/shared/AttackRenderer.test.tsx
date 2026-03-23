import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AttackRenderer from './AttackRenderer';
import type { AttackVisualData, AttackRendererProps } from './AttackRenderer';

// Mock @pixi/react
vi.mock('@pixi/react', () => ({
  extend: vi.fn(),
  useTick: vi.fn(),
}));

// Mock pixi.js
vi.mock('pixi.js', () => ({
  Container: 'pixiContainer',
  Graphics: 'pixiGraphics',
  Text: 'pixiText',
  Sprite: 'pixiSprite',
  TextStyle: vi.fn().mockImplementation(() => ({})),
  Texture: vi.fn(),
}));

// ── Test fixtures ────────────────────────────────────────────────────

const meleeAttack: AttackVisualData = {
  attack_animation_type: 'melee_swing',
  projectile_color: null,
  projectile_speed: 0,
  impact_effect: 'flash',
  attack_range: 40,
  arc_angle: 90,
  trail_type: null,
  screen_shake: false,
};

const rangedAttack: AttackVisualData = {
  attack_animation_type: 'ranged_projectile',
  projectile_color: '#cccccc',
  projectile_speed: 8,
  impact_effect: 'splash',
  attack_range: 200,
  arc_angle: 0,
  trail_type: null,
  screen_shake: false,
};

const magicAttack: AttackVisualData = {
  attack_animation_type: 'magic_cast',
  projectile_color: '#8844cc',
  projectile_speed: 4,
  impact_effect: 'dissipate',
  attack_range: 150,
  arc_angle: 0,
  trail_type: 'glow',
  screen_shake: false,
};

const elementalAttack: AttackVisualData = {
  attack_animation_type: 'elemental_projectile',
  projectile_color: '#ff4422',
  projectile_speed: 5,
  impact_effect: 'shatter',
  attack_range: 180,
  arc_angle: 0,
  trail_type: 'particles',
  screen_shake: false,
};

const aoeAttack: AttackVisualData = {
  attack_animation_type: 'aoe_burst',
  projectile_color: '#44aaff',
  projectile_speed: 0,
  impact_effect: 'flash',
  attack_range: 120,
  arc_angle: 0,
  trail_type: null,
  screen_shake: true,
};

const baseProps: Omit<AttackRendererProps, 'attack'> = {
  sourceX: 100,
  sourceY: 200,
  targetX: 300,
  targetY: 200,
  active: true,
};

// ── Tests ────────────────────────────────────────────────────────────

describe('AttackRenderer', () => {
  it('renders without crashing when active with melee_swing', () => {
    const { container } = render(
      <AttackRenderer attack={meleeAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when active with ranged_projectile', () => {
    const { container } = render(
      <AttackRenderer attack={rangedAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when active with magic_cast', () => {
    const { container } = render(
      <AttackRenderer attack={magicAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when active with elemental_projectile', () => {
    const { container } = render(
      <AttackRenderer attack={elementalAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing when active with aoe_burst', () => {
    const { container } = render(
      <AttackRenderer attack={aoeAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders nothing when not active', () => {
    const { container } = render(
      <AttackRenderer attack={meleeAttack} {...baseProps} active={false} />
    );
    // inactive returns null — container should be empty
    expect(container.innerHTML).toBe('');
  });

  it('accepts onComplete callback without crashing', () => {
    const onComplete = vi.fn();
    const { container } = render(
      <AttackRenderer attack={rangedAttack} {...baseProps} onComplete={onComplete} />
    );
    expect(container).toBeTruthy();
  });

  it('accepts onImpact callback without crashing', () => {
    const onImpact = vi.fn();
    const { container } = render(
      <AttackRenderer attack={meleeAttack} {...baseProps} onImpact={onImpact} />
    );
    expect(container).toBeTruthy();
  });

  it('renders with minimal attack data (no optional fields)', () => {
    const minimalAttack: AttackVisualData = {
      attack_animation_type: 'melee_swing',
    };
    const { container } = render(
      <AttackRenderer attack={minimalAttack} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders aoe_burst with screen_shake enabled', () => {
    const onImpact = vi.fn();
    const { container } = render(
      <AttackRenderer attack={aoeAttack} {...baseProps} onImpact={onImpact} />
    );
    expect(container).toBeTruthy();
  });

  it('renders magic_cast with glow trail type', () => {
    const glowMagic: AttackVisualData = {
      ...magicAttack,
      trail_type: 'glow',
    };
    const { container } = render(
      <AttackRenderer attack={glowMagic} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('renders elemental_projectile with particles trail type', () => {
    const particleElemental: AttackVisualData = {
      ...elementalAttack,
      trail_type: 'particles',
    };
    const { container } = render(
      <AttackRenderer attack={particleElemental} {...baseProps} />
    );
    expect(container).toBeTruthy();
  });

  it('exports AttackVisualData and AttackRendererProps types', () => {
    // Type-level test — if this compiles, the exports work
    const data: AttackVisualData = meleeAttack;
    const props: AttackRendererProps = {
      attack: data,
      sourceX: 0,
      sourceY: 0,
      targetX: 100,
      targetY: 100,
      active: true,
    };
    expect(props.attack.attack_animation_type).toBe('melee_swing');
  });
});
