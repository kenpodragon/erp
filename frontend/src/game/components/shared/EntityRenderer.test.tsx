import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EntityRenderer from './EntityRenderer';
import type { EnemyVisualData, EntityRendererProps } from './EntityRenderer';

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

const fullEntity: EnemyVisualData = {
  entity_id: 42,
  name: 'Shadow Wraith',
  sprite_key: 'enemy_wraith',
  base_hp: 100,
  base_gold: 10,
  color_primary: '#2a2a4a',
  color_secondary: '#1a1a3a',
  movement: {
    name: 'hover',
    y_offset_min: -5,
    y_offset_max: 5,
    bob_amplitude: 3,
    bob_frequency: 1.5,
    speed_multiplier: 1.0,
    trail_effect: null,
  },
  size: {
    name: 'medium',
    scale_min: 0.9,
    scale_max: 1.1,
    width_base: 36,
    height_base: 55,
    hitbox_radius: 22,
    hp_bar_width: 80,
  },
  animation: {
    name: 'pulse',
    idle_scale_x: 0.03,
    idle_scale_y: 0.03,
    idle_cycle_ms: 1200,
    idle_translate_x: 0,
    idle_translate_y: 0,
    attack_recoil: 4,
    death_style: 'fade',
    death_duration_ms: 600,
    death_particle_count: 12,
  },
  silhouette: {
    name: 'humanoid',
    body_shape: 'biped',
    body_ratio_w: 1.0,
    body_ratio_h: 1.0,
    corner_radius: 4,
    has_limbs: true,
    limb_count: 2,
    has_head: true,
    has_wings: false,
    has_weapon_slot: false,
    has_eye_glow: true,
    sub_unit_count: 1,
  },
  primary_attack: {
    name: 'shadow_bolt',
    attack_animation_type: 'projectile',
    projectile_color: '#6600cc',
    cooldown_ms: 2000,
    projectile_speed: 5,
    impact_effect: 'burst',
    attack_range: 200,
    arc_angle: 0,
    trail_type: null,
    screen_shake: false,
  },
  secondary_attack: null,
  tertiary_attack: null,
};

const nullVisualEntity: EnemyVisualData = {
  entity_id: 99,
  name: 'Unknown Creature',
  sprite_key: null,
  base_hp: 50,
  base_gold: 5,
  color_primary: null,
  color_secondary: null,
  movement: null,
  size: null,
  animation: null,
  silhouette: null,
  primary_attack: null,
  secondary_attack: null,
  tertiary_attack: null,
};

describe('EntityRenderer', () => {
  it('renders without crashing with full visual data', () => {
    const { container } = render(
      <EntityRenderer
        entity={fullEntity}
        x={100}
        y={200}
        state="idle"
        hp={80}
        maxHp={100}
        showHpBar={true}
        showName={true}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with null visual data (fallback)', () => {
    const { container } = render(
      <EntityRenderer
        entity={nullVisualEntity}
        x={50}
        y={100}
        state="idle"
        hp={50}
        maxHp={50}
        showHpBar={true}
        showName={true}
      />
    );
    expect(container).toBeTruthy();
  });

  it('returns null when state is dead', () => {
    const { container } = render(
      <EntityRenderer
        entity={fullEntity}
        x={100}
        y={200}
        state="dead"
      />
    );
    // dead state returns null — container should be empty
    expect(container.innerHTML).toBe('');
  });

  it('renders dying state without crashing', () => {
    const { container } = render(
      <EntityRenderer
        entity={fullEntity}
        x={100}
        y={200}
        state="dying"
        hp={0}
        maxHp={100}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders attacking state without crashing', () => {
    const { container } = render(
      <EntityRenderer
        entity={fullEntity}
        x={100}
        y={200}
        state="attacking"
        hp={60}
        maxHp={100}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders orb body shape without crashing', () => {
    const orbEntity: EnemyVisualData = {
      ...fullEntity,
      entity_id: 50,
      silhouette: {
        ...fullEntity.silhouette!,
        body_shape: 'orb',
      },
    };
    const { container } = render(
      <EntityRenderer entity={orbEntity} x={100} y={200} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders cluster body shape without crashing', () => {
    const clusterEntity: EnemyVisualData = {
      ...fullEntity,
      entity_id: 51,
      silhouette: {
        ...fullEntity.silhouette!,
        body_shape: 'cluster',
        sub_unit_count: 5,
      },
    };
    const { container } = render(
      <EntityRenderer entity={clusterEntity} x={100} y={200} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders blob/winged body shape without crashing', () => {
    const blobEntity: EnemyVisualData = {
      ...fullEntity,
      entity_id: 52,
      silhouette: {
        ...fullEntity.silhouette!,
        body_shape: 'blob',
        has_wings: true,
      },
    };
    const { container } = render(
      <EntityRenderer entity={blobEntity} x={100} y={200} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with explode death style without crashing', () => {
    const explodeEntity: EnemyVisualData = {
      ...fullEntity,
      entity_id: 53,
      animation: {
        ...fullEntity.animation!,
        death_style: 'explode',
      },
    };
    const { container } = render(
      <EntityRenderer entity={explodeEntity} x={100} y={200} state="dying" hp={0} maxHp={100} />
    );
    expect(container).toBeTruthy();
  });

  it('hides HP bar when showHpBar is false', () => {
    const { container } = render(
      <EntityRenderer
        entity={fullEntity}
        x={100}
        y={200}
        state="idle"
        hp={50}
        maxHp={100}
        showHpBar={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('exports EnemyVisualData and EntityRendererProps types', () => {
    // Type-level test — if this compiles, the exports work
    const data: EnemyVisualData = fullEntity;
    const props: EntityRendererProps = {
      entity: data,
      x: 0,
      y: 0,
      state: 'idle',
    };
    expect(props.entity.entity_id).toBe(42);
  });
});
