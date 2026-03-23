import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PaperDollRenderer from './PaperDollRenderer';
import type {
  CharacterVisualData,
  PaperDollRendererProps,
  ArmorClassVisual,
  EquippedLayer,
} from './PaperDollRenderer';

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

// ── Test data ────────────────────────────────────────────────────────

const heavyArmor: ArmorClassVisual = {
  code: 'heavy',
  overlay_opacity: 0.8,
  texture_pattern: 'solid',
  glow_intensity: 0.5,
  color_tint_base: '#888888',
  outline_width: 2,
  weight_class: 'heavy',
};

const shimmerArmor: ArmorClassVisual = {
  code: 'enchanted',
  overlay_opacity: 0.6,
  texture_pattern: 'shimmer',
  glow_intensity: 1.0,
  color_tint_base: '#44aaff',
};

const crosshatchArmor: ArmorClassVisual = {
  code: 'chain',
  overlay_opacity: 0.65,
  texture_pattern: 'crosshatch',
  glow_intensity: 0,
  color_tint_base: '#aaaaaa',
};

const fullEquipment: EquippedLayer[] = [
  { layer: 1, slot: 'back', sprite_key: 'cape_01', armor_class: heavyArmor },
  { layer: 2, slot: 'legs', sprite_key: 'legs_01', armor_class: heavyArmor },
  { layer: 3, slot: 'chest', sprite_key: 'chest_01', armor_class: crosshatchArmor },
  { layer: 4, slot: 'hands', sprite_key: 'gloves_01', armor_class: heavyArmor },
  { layer: 5, slot: 'shoulders', sprite_key: 'pauldrons_01', armor_class: heavyArmor },
  { layer: 6, slot: 'head', sprite_key: 'helm_01', armor_class: heavyArmor },
  { layer: 7, slot: 'main_hand', sprite_key: 'sword_01', armor_class: heavyArmor },
];

const fullyEquippedCharacter: CharacterVisualData = {
  character_id: 1,
  level: 25,
  aura_tier: 'gold',
  equipped_layers: fullEquipment,
  unequipped_layers: [],
};

const bareCharacter: CharacterVisualData = {
  character_id: 2,
  level: 1,
  aura_tier: null,
  equipped_layers: [],
  unequipped_layers: [1, 2, 3, 4, 5, 6, 7],
};

// ── Tests ────────────────────────────────────────────────────────────

describe('PaperDollRenderer', () => {
  it('renders without crashing with full equipment', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="idle"
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders without crashing with no equipment (bare character)', () => {
    const { container } = render(
      <PaperDollRenderer
        character={bareCharacter}
        x={50}
        y={100}
        state="idle"
      />
    );
    expect(container).toBeTruthy();
  });

  it('returns null when state is dead', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="dead"
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders walking state without crashing', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="walking"
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders fighting state without crashing', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="fighting"
      />
    );
    expect(container).toBeTruthy();
  });

  // ── Aura tier tests ───────────────────────────────────────────────

  it('renders bronze aura without crashing', () => {
    const char: CharacterVisualData = { ...bareCharacter, aura_tier: 'bronze' };
    const { container } = render(
      <PaperDollRenderer character={char} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders silver aura without crashing', () => {
    const char: CharacterVisualData = { ...bareCharacter, aura_tier: 'silver' };
    const { container } = render(
      <PaperDollRenderer character={char} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders gold aura without crashing', () => {
    const char: CharacterVisualData = { ...bareCharacter, aura_tier: 'gold' };
    const { container } = render(
      <PaperDollRenderer character={char} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders cyan aura without crashing', () => {
    const char: CharacterVisualData = { ...bareCharacter, aura_tier: 'cyan' };
    const { container } = render(
      <PaperDollRenderer character={char} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders null aura (no glow) without crashing', () => {
    const { container } = render(
      <PaperDollRenderer character={bareCharacter} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  // ── Equipment variation tests ─────────────────────────────────────

  it('renders with shimmer texture pattern without crashing', () => {
    const shimmerChar: CharacterVisualData = {
      ...bareCharacter,
      equipped_layers: [
        { layer: 3, slot: 'chest', sprite_key: 'chest_enchanted', armor_class: shimmerArmor },
      ],
      unequipped_layers: [1, 2, 4, 5, 6, 7],
    };
    const { container } = render(
      <PaperDollRenderer character={shimmerChar} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with crosshatch texture pattern without crashing', () => {
    const crosshatchChar: CharacterVisualData = {
      ...bareCharacter,
      equipped_layers: [
        { layer: 3, slot: 'chest', sprite_key: 'chest_chain', armor_class: crosshatchArmor },
      ],
      unequipped_layers: [1, 2, 4, 5, 6, 7],
    };
    const { container } = render(
      <PaperDollRenderer character={crosshatchChar} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders with facingRight=false (flipped) without crashing', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="idle"
        facingRight={false}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders with custom scale without crashing', () => {
    const { container } = render(
      <PaperDollRenderer
        character={fullyEquippedCharacter}
        x={100}
        y={200}
        state="idle"
        scale={2.5}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders partial equipment (only weapon) without crashing', () => {
    const partialChar: CharacterVisualData = {
      character_id: 3,
      level: 5,
      aura_tier: null,
      equipped_layers: [
        { layer: 7, slot: 'main_hand', sprite_key: 'sword_basic', armor_class: null },
      ],
      unequipped_layers: [1, 2, 3, 4, 5, 6],
    };
    const { container } = render(
      <PaperDollRenderer character={partialChar} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  it('renders equipment layer with no armor_class without crashing', () => {
    const noArmorChar: CharacterVisualData = {
      character_id: 4,
      level: 3,
      aura_tier: null,
      equipped_layers: [
        { layer: 1, slot: 'back', sprite_key: 'cape_torn', armor_class: null },
        { layer: 3, slot: 'chest', sprite_key: 'shirt_basic', armor_class: null },
      ],
      unequipped_layers: [2, 4, 5, 6, 7],
    };
    const { container } = render(
      <PaperDollRenderer character={noArmorChar} x={0} y={0} state="idle" />
    );
    expect(container).toBeTruthy();
  });

  // ── Type export tests ─────────────────────────────────────────────

  it('exports all required TypeScript interfaces', () => {
    const acv: ArmorClassVisual = heavyArmor;
    const eq: EquippedLayer = fullEquipment[0];
    const char: CharacterVisualData = fullyEquippedCharacter;
    const props: PaperDollRendererProps = {
      character: char,
      x: 0,
      y: 0,
      state: 'idle',
    };
    expect(acv.code).toBe('heavy');
    expect(eq.layer).toBe(1);
    expect(char.character_id).toBe(1);
    expect(props.state).toBe('idle');
  });
});
