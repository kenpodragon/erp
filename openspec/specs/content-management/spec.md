# Content Management & Live Tuning Specification

## Purpose
Section 5.5 transforms the existing generic GameConfigs key-value editor into a purpose-built game tuning hub with specialized views for the most complex tuning scenarios. After this phase, a non-developer game admin can adjust drop rates with visual distribution previews, review skill DPS balance with global coefficient editing, tune the Idle Training economy with reactive visualizations, and navigate all 137+ `game_configs` keys through organized category tabs with type-aware inputs and inline help.

## Requirements

### Requirement: GameConfigs Category Reorganization
The system SHALL replace the flat GameConfigs table with a tabbed interface grouped by the existing `category` column (19 categories post-5.4). An "All" tab SHALL retain the flat searchable view. Category tabs SHALL display key count badges. Active search SHALL filter across all categories with visual indicators on matching tabs.

#### Scenario: Admin locates specific key via search
- GIVEN 137+ config keys across 19 categories
- WHEN an admin types "gold_to_essence" in the search bar
- THEN matching keys are highlighted and the "economy" category tab shows a visual indicator

#### Scenario: Type-aware input renders slider for 0-1 floats
- GIVEN a config key `rare_spawn_base_chance` with `value_json = "0.02"`
- WHEN the admin views the "discovery" category tab
- THEN the key renders as a slider (0.0–1.0) + number input rather than a raw JSON text field

### Requirement: Drop Rate Manager
The system SHALL group all drop rate `game_configs` keys in a specialized tab with visual stacked bar previews for rarity weight distributions. Editing a rarity weight SHALL show a live preview of the new probability distribution before saving.

Covered keys: artifact generation chances per scene/boss/mastery, rarity weight objects per book (both artifacts and dream items), rare spawn base chance, run achievement config.

#### Scenario: Rarity distribution visualized
- GIVEN `artifact_rarity_weight_book_2 = {"common": 60, "uncommon": 25, "rare": 11, "epic": 3.5, "cosmic": 0.5}`
- WHEN the admin opens the Drop Rate Manager
- THEN a stacked bar chart shows the proportional distribution of all 5 rarities for Book 2 artifacts

#### Scenario: Live preview before save
- GIVEN an admin increases Book 1 cosmic artifact weight from 0.2 to 1.0
- WHEN they adjust the value (pre-save)
- THEN the stacked bar updates immediately to show the new distribution without requiring a save

### Requirement: Skill Balance Viewer
The system SHALL provide a read-only cross-reference view of all skills showing: base DPS at levels 10, 25, 50, 75, 99 (computed from `base_cooldown_seconds`, `base_cost_gold`, `benefits_json`, and the relevant `game_configs` coefficient keys). Admins SHALL be able to edit global coefficient keys (e.g., `int_power_coefficient`, `cd_reduction_per_level`) from this view with computed values updating reactively.

#### Scenario: DPS comparison across skills
- GIVEN 13 active skills in the database
- WHEN the admin opens the Skill Balance tab
- THEN a table shows all skills with computed DPS at 5 level milestones, sortable by DPS at any milestone

#### Scenario: Coefficient change updates all computed values
- GIVEN an admin increases `int_power_coefficient` from 0.025 to 0.030
- WHEN the coefficient is changed in the CoefficientPanel (pre-save)
- THEN all skill DPS values in the table recalculate instantly using the new coefficient

### Requirement: Economy Tuning Panel
The system SHALL provide specialized editors for: Essence XP curve (step-function visualization of `gold_to_essence_base_rate`, `gold_to_essence_growth_factor`), salvage rate table (Essence per rarity tier), Idle Training essence drain/capacity, subscription boost values, and progression parameters (char_level_xp_factor, char_xp_per_scene_base).

#### Scenario: XP curve visualized as step function
- GIVEN `gold_to_essence_base_rate = 200` and `gold_to_essence_growth_factor = 1.01`
- WHEN the admin opens the Economy Tuning panel
- THEN a step-function chart shows the Essence earned at gold totals of 1K, 5K, 10K, 50K, 100K

## Design

### No New Backend Endpoints
5.5 adds no new backend endpoints. All specialized panels read from and write to existing endpoints:
- `GET /api/admin/game-configs` — fetch all configs
- `PATCH /api/admin/game-configs/{key}` — update single config
- `GET /api/admin/content/skills` — fetch skills for Skill Balance tab (from 5.2)

All computation (DPS calculations, distribution previews, XP curve rendering) happens client-side.

### Type Inference Logic
```typescript
// tuning-utils.ts
function inferInputType(value_json: string): InputType {
  const val = JSON.parse(value_json);
  if (typeof val === 'number') {
    if (val >= 0 && val <= 1 && String(val).includes('.')) return 'slider'; // 0-1 float
    if (Number.isInteger(val) && val > 0) return 'positive_integer';
    return 'number';
  }
  if (typeof val === 'boolean') return 'toggle';
  if (typeof val === 'object') return 'json_editor';
  return 'text';
}
```

### Module Structure
```
admin/src/pages/
  GameConfigs.tsx                   # EXTENDED: tab bar routing

admin/src/components/tuning/
  GameConfigsCategoryView.tsx       # Categorized key-value editor
  TypeAwareInput.tsx                # Inferred input control
  DropRateManager.tsx               # Drop rate specialized panel
  RarityWeightBar.tsx               # Reusable stacked bar chart
  SkillBalanceViewer.tsx            # Skill balance table + coefficient panel
  EconomyTuningPanel.tsx            # Economy container
  EssenceXPCurve.tsx                # Step-function visualization
  SalvageRateTable.tsx
  tuning-utils.ts                   # Type inference, DPS computation
```

## Schema

No migration required. 5.5 is a frontend-only enhancement. All specialized tuning panels read from and write to the existing `game_configs` table via existing endpoints.

### Existing `game_configs` Table (Unchanged)
```sql
CREATE TABLE game_configs (
    key         VARCHAR(100) PRIMARY KEY,
    value_json  JSONB        NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ  DEFAULT NOW(),
    category    VARCHAR(50),
    game_impact TEXT,
    updated_by  INTEGER REFERENCES players(id) ON DELETE SET NULL
);
```

### Categories Used by Specialized Panels

| Category | Key Count | Specialized Panel |
|:---|:---|:---|
| `artifacts` | 7 | Drop Rate Manager |
| `drops` | 5 | Drop Rate Manager |
| `discovery` | 5 | Drop Rate Manager (rare_spawn_base_chance) |
| `upgrades` | 11 | Skill Balance (global coefficients) |
| `economy` | 13 | Economy Tuning |
| `training` | 10 | Economy Tuning (XP curve + essence drain) |
| `salvage` | 7 | Economy Tuning (salvage rates) |
| `subscription` | 11 | Economy Tuning (subscription boosts) |
| `progression` | 5 | Economy Tuning (level/XP params) |
