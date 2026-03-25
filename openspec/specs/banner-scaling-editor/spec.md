# Banner & Scaling Editor Specification

## Purpose
Section 5.4 provides admin tooling for configuring visual weight mappings on entity behaviors, wave difficulty presets, intensity curves, chapter scaling preview, and difficulty presets. All difficulty tuning is admin-configurable and data-driven — a different book series could define its own curves, wave presets, and visual weight profiles without code changes.

## Requirements

### Requirement: Visual Weight Editor
The system SHALL extend `visual_behaviors` with a `stat_weights` JSONB column defining how character stats (STR/AGI/INT) influence sprite size, movement speed, and VFX intensity per visual behavior type. All weights SHALL be validated to be in the range [0.0, 1.0]. Clamp bounds SHALL prevent extreme visual values.

#### Scenario: Visual weights saved for magic_caster
- GIVEN the "magic_caster" visual behavior
- WHEN an admin saves `stat_weights.vfx_intensity.intelligence = 0.85`
- THEN entities using this behavior display particle effects heavily influenced by the player's INT stat

#### Scenario: Invalid weight rejected
- GIVEN an admin enters `stat_weights.size.strength = 1.5`
- WHEN the save is attempted
- THEN the endpoint returns 422 with "size.strength must be between 0.0 and 1.0"

### Requirement: Wave Presets
The system SHALL provide named reusable wave configuration templates stored as JSONB blobs. Presets SHALL be assignable to books or chapters as default wave config. One preset SHALL be flagged as `is_default` (global default). Per-scene `scene_wave_configs` (5.2) take precedence over inherited preset values.

#### Scenario: Book-level wave preset assignment
- GIVEN a "Dense Combat" wave preset
- WHEN an admin assigns it to Book 2
- THEN all scenes in Book 2 without explicit `scene_wave_configs` use the "Dense Combat" preset parameters

#### Scenario: Global default preset applied as fallback
- GIVEN a scene with no `scene_wave_configs` and no book/chapter preset assigned
- WHEN the scene is played
- THEN the wave config falls back to the single `is_default = true` preset

### Requirement: Difficulty Curves
The system SHALL allow admins to define named intensity curves controlling how difficulty ramps across chapters within a book. Curves SHALL define per-dimension multipliers (HP scale, gold scale, XP scale, speed scale) as a multi-point piecewise function. Curves SHALL be assignable to books via FK on `books`.

#### Scenario: Curve applied to book
- GIVEN a "Gentle Ramp" difficulty curve seeded with moderate HP scaling
- WHEN assigned to Book 1 and the scaling preview is computed
- THEN the projected HP values across Book 1 chapters are lower than with the "Aggressive Ramp" curve

### Requirement: Chapter Scaling Preview
The system SHALL provide a client-side scaling preview tool computing projected HP, Gold, and Wave count across any chapter range using the current `game_configs` values (or pre-save local state). The tool SHALL support side-by-side comparison of two configurations.

#### Scenario: Config comparison before applying
- GIVEN an admin is considering raising `hp_scaling_factor` from 1.015 to 1.020
- WHEN they enter both values in the comparison view
- THEN the preview table shows projected HP at chapters 10, 20, 40, 80 for both values side by side

### Requirement: Difficulty Presets
The system SHALL allow admins to save named difficulty presets bundling: current `game_configs` values for combat/upgrade keys, a `difficulty_curve_id`, and a `wave_preset_id`. Applying a preset SHALL update all referenced `game_configs` keys atomically.

#### Scenario: Preset applied atomically
- GIVEN a "Release v1.0" preset with 14 game_config keys
- WHEN the admin clicks "Apply Preset" and confirms
- THEN all 14 `game_configs` keys are updated in a single transaction and the applied preset is logged

## Design

### Architecture
```
WorldBuilder.tsx
  └── ScalingEditor.tsx (NEW — 5.4 tabbed container)
        ├── VisualWeightEditor   ── PATCH /api/admin/classification/visual-behaviors/{id}
        ├── WavePresetManager    ── /api/admin/scaling/wave-presets
        │     └── WavePresetAssignPanel
        ├── DifficultyCurveManager ── /api/admin/scaling/difficulty-curves
        ├── ScalingPreview       ── (client-side computation)
        └── DifficultyPresetManager ── /api/admin/scaling/presets
```

### Preview Computation (Client-Side)
```typescript
// scaling-utils.ts
function projectSceneHP(position: number, gameConfigs: Record<string, number>): number {
  const { hp_scaling_factor, max_scene_base_hp, default_scene_base_hp } = gameConfigs;
  return Math.min(
    Math.floor(default_scene_base_hp * Math.pow(hp_scaling_factor, position)),
    max_scene_base_hp
  );
}
```

All computation happens locally against locally-loaded game_configs. "Save" writes to server; "Reset" restores server values.

### Module Structure
```
backend/
├── routes/admin_scaling.py              # Wave presets, difficulty curves, difficulty presets
├── services/admin_scaling_service.py    # Preset apply, curve CRUD
└── models/scaling.py                    # WavePreset, WavePresetAssignment, DifficultyCurve, DifficultyPreset

admin/src/components/scaling/
├── ScalingEditor.tsx
├── VisualWeightEditor.tsx
├── WavePresetManager.tsx + WavePresetAssignPanel.tsx
├── DifficultyCurveManager.tsx
├── ScalingPreview.tsx + ScalingComparisonTable.tsx
├── DifficultyPresetManager.tsx + PresetApplyModal.tsx
└── scaling-utils.ts
```

## Schema

**Migration 059** (applied).

### `visual_behaviors` — New Column
`stat_weights JSONB` — nullable. Structure:
```json
{
  "size": {"strength": 0.6, "agility": 0.2, "intelligence": 0.2},
  "speed": {"strength": 0.1, "agility": 0.7, "intelligence": 0.2},
  "vfx_intensity": {"strength": 0.1, "agility": 0.1, "intelligence": 0.8},
  "clamps": {"size": [0.5, 2.5], "speed": [0.3, 1.5], "vfx_intensity": [0.0, 1.0]}
}
```
5 default stat weight seeds provided for all existing visual behaviors.

### New Table: `wave_presets`
```
id SERIAL PK
name VARCHAR(100) UNIQUE NOT NULL
description TEXT
config JSONB NOT NULL DEFAULT '{}'   -- max_enemies_per_wave, wave_count, spawn_interval_ms, etc.
is_default BOOLEAN DEFAULT FALSE     -- at most one true
sort_order INTEGER DEFAULT 0
created_at, updated_at TIMESTAMPTZ
```

### New Table: `wave_preset_assignments`
Links wave presets to books or chapters.
```
id SERIAL PK
preset_id INTEGER FK wave_presets(id) CASCADE
scope VARCHAR(10) CHECK IN ('book', 'chapter')
scope_id INTEGER NOT NULL  -- book_id or chapter_id (app-level polymorphism)
created_at TIMESTAMPTZ
UNIQUE(scope, scope_id)
```

### New Table: `difficulty_curves`
```
id SERIAL PK
name VARCHAR(100) UNIQUE NOT NULL
description TEXT
curve_data JSONB NOT NULL DEFAULT '{}'  -- multi-point piecewise multiplier function
created_at, updated_at TIMESTAMPTZ
```

### New Table: `difficulty_presets`
```
id SERIAL PK
name VARCHAR(100) UNIQUE NOT NULL
description TEXT
game_config_snapshot JSONB NOT NULL DEFAULT '{}'  -- key → value map for combat/upgrade keys
difficulty_curve_id INTEGER FK difficulty_curves(id) SET NULL
wave_preset_id INTEGER FK wave_presets(id) SET NULL
created_at, updated_at TIMESTAMPTZ
```

### `books` — New Column (migration 059)
`difficulty_curve_id INTEGER FK difficulty_curves(id) SET NULL`

### New `game_configs` Seeds (4 keys, category: 'waves')
`default_wave_preset_id`, `wave_scaling_enabled`, `global_hp_multiplier`, `global_gold_multiplier`
