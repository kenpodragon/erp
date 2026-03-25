# Banner Visual System — Design Spec

**Created:** 2026-03-22
**Status:** Final (review issues addressed)
**Scope:** Wave scaling, entity visual rendering, player paper doll, shared renderer across all combat surfaces

---

## 1. Overview

Overhaul the BottomAnimatedBanner (and unify visual rendering with CombatStage, BossStage, and Idle Training) to create a visually rich, progression-driven combat spectacle. As the player grows stronger and advances through the story, the banner should feel increasingly frenetic — more enemies, more variety, faster kills, more particle effects.

**This is a visual/decorative system** — no gameplay mechanics in the banner. The same entity rendering must be shared across all 4 combat surfaces.

---

## 2. Wave Scaling — Adaptive Progression

### Approach: Character-Power-Driven Density

Enemy count and variety in the banner scales based on character power (level, auto-DPS, furthest scene), not fixed chapter brackets.

**Progression curve:**

| Tier | Level Range | Book | Enemies On Screen | Kill Speed | Death Rate | Visual Feel |
|------|-------------|------|-------------------|------------|------------|-------------|
| Early | 1–10 | B1 Ch1–5 | 1–2 | 2–3s/mob | Frequent (~30s) | Cautious, learning |
| Mid | 20–40 | B1 Ch10–15 | 3–5 | 1–2s/mob | Occasional (~90s) | Getting comfortable |
| Late-Mid | 50–70 | B2 | 6–8 | 0.5–1s/mob | Rare (~3min) | Cleaving through |
| End Game | 80+ | B3 Final | 10–15 | Instant cleave | ~5% of time | Absolute carnage |

### Key Rules

- **Encountered-only pool:** Only entities from scenes the player has completed appear in the banner. **NOTE:** The current `/api/game/enemies/encountered` endpoint does NOT filter by `player_entity_discovery` — it returns ALL entities with gameplay data. This endpoint must be modified to JOIN on `player_entity_discovery` and filter to only discovered entities for the requesting player.
- **Character power drives density:** `max_enemies = f(char_level, furthest_scene, auto_dps)` — stronger = more enemies, not easier
- **Death still happens:** Player character still dies in the banner, but less frequently as they get stronger. Death must never reach zero — keeps tension
- **Story progression feel:** Book 1 feels tutorial, Book 3 feels like a warzone
- **Power fantasy:** Seeing the same mobs from the story, feeling your progression as you mow them down

### DB Configuration (game_configs)

All scaling parameters stored in `game_configs` and editable via admin panel:

| Config Key | Default | Description |
|------------|---------|-------------|
| `banner_base_enemies` | 1 | Minimum enemies on screen |
| `banner_max_enemies` | 15 | Maximum enemies on screen |
| `banner_enemies_per_level` | 0.15 | Enemies added per character level |
| `banner_death_base_rate` | 0.03 | Base death probability per combat cycle |
| `banner_death_reduction_per_level` | 0.0003 | Death rate reduction per level |
| `banner_death_floor` | 0.002 | Minimum death rate (never zero) |
| `banner_kill_speed_base_ms` | 3000 | Base time to kill at level 1 |
| `banner_kill_speed_min_ms` | 200 | Minimum kill time (instant cleave floor) |
| `banner_spawn_rate_base` | 0.05 | Spawn probability per tick (walking) |
| `banner_spawn_rate_combat` | 0.01 | Spawn probability per tick (fighting) |

### Visual Verification TODO

After implementation, manually verify at each tier:
1. Set character to level 1, chapter 1 → observe banner (1–2 enemies, frequent deaths)
2. Update character level to 20 in DB → observe (3–5 enemies, bronze aura)
3. Update to level 40 → observe (5–6 enemies, mixed types)
4. Update to level 70 → observe (6–8 enemies, flyers, silver aura)
5. Update to level 90 → observe (10–15 enemies, carnage, cyan aura)

### Background

Banner background already uses `activeVisualChapterId` → `BannerBackground` component with chapter-specific parallax (`bg_ch{N}_{far|mid}`). No changes needed — it already matches the current story scene.

---

## 3. Entity Visual Schema — Normalized Lookup Tables

### Existing Infrastructure (Already in DB)

The entity system is rich — 14 tables, 3,936 entities:

- **entities** — 3,936 rows with full lore metadata (descriptions, emotional states, abilities, quotes)
- **entity_types** — 9 classifications (enemy, creature, character, manifestation, object, group, environment, event, other)
- **attack_types** — 13 types with visual behavior links and stat multipliers
- **entity_attack_types** — 614 many-to-many mappings (TO BE DEPRECATED)
- **visual_behaviors** — 5 seeded with animation_config JSON
- **entity_families** — table exists, 0 rows (needs seeding)
- **entity_scene_appearances** — 6,434 pairings with role support
- **entity_beat_appearances** — 8,500 narrative pairings
- **player_entity_discovery** — tracks encountered entities per player
- **asset_registry** — 196 entries for procedural sprite rendering
- **entity_gameplay_data** — exists but only 4 of 3,936 populated

### New Lookup Tables (4 tables)

All lookup tables include rendering parameters used by the frontend EntityRenderer. All are CRUD-editable via admin panel.

#### 3.1 movement_types

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| name | TEXT UNIQUE NOT NULL | ground, hover, flying, burrowing, teleport |
| description | TEXT | |
| y_offset_min | REAL DEFAULT 0 | Pixels above ground (0 = on ground) |
| y_offset_max | REAL DEFAULT 0 | Max float height (random in range) |
| bob_amplitude | REAL DEFAULT 0 | Vertical oscillation pixels |
| bob_frequency | REAL DEFAULT 1.0 | Oscillation speed multiplier |
| speed_multiplier | REAL DEFAULT 1.0 | Horizontal movement speed scale |
| can_change_lane | BOOLEAN DEFAULT FALSE | Can switch y-layer during movement |
| trail_effect | TEXT | null, 'shadow', 'particles', 'afterimage' |

**Seed data:**

| name | y_offset | bob | speed | trail |
|------|----------|-----|-------|-------|
| ground | 0–0 | 0 | 1.0× | null |
| hover | 15–30 | 4px @ 0.8× | 0.9× | shadow |
| flying | 40–70 | 8px @ 1.2× | 1.3× | null |
| burrowing | -5–0 | 2px @ 0.5× | 0.7× | particles |
| teleport | 0–0 | 0 | 0.5× | afterimage |

#### 3.2 size_classes

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| name | TEXT UNIQUE NOT NULL | tiny, small, medium, large, huge |
| description | TEXT | |
| scale_min | REAL NOT NULL | Minimum render scale (0.4 = 40%) |
| scale_max | REAL NOT NULL | Maximum render scale |
| width_base | REAL NOT NULL | Base width in pixels before scaling |
| height_base | REAL NOT NULL | Base height in pixels before scaling |
| hitbox_radius | REAL NOT NULL | Click target radius in pixels |
| hp_bar_width | REAL NOT NULL | HP bar width in pixels |
| hp_bar_offset_y | REAL DEFAULT -8 | HP bar position above entity |
| name_tag_visible | BOOLEAN DEFAULT TRUE | Show entity name below |
| sort_order | INTEGER DEFAULT 0 | For admin dropdowns |

**Seed data:**

| name | scale | base w×h | hitbox | hp bar |
|------|-------|----------|--------|--------|
| tiny | 0.4–0.6 | 12×14 | 8px | 16px |
| small | 0.7–0.9 | 18×22 | 12px | 22px |
| medium | 1.0–1.2 | 24×30 | 16px | 28px |
| large | 1.3–1.6 | 32×40 | 22px | 36px |
| huge | 1.8–2.2 | 44×54 | 30px | 48px |

#### 3.3 animation_styles

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| name | TEXT UNIQUE NOT NULL | ooze, stalk, pulse, aggro, flap, swarm, slither |
| description | TEXT | |
| idle_scale_x | REAL DEFAULT 1.0 | Horizontal squash/stretch at idle peak |
| idle_scale_y | REAL DEFAULT 1.0 | Vertical squash/stretch at idle peak |
| idle_cycle_ms | INTEGER DEFAULT 2000 | Full idle animation cycle in ms |
| idle_translate_x | REAL DEFAULT 0 | Horizontal shift amplitude |
| idle_translate_y | REAL DEFAULT 0 | Vertical shift amplitude |
| attack_recoil | REAL DEFAULT 3.0 | Px knockback when hit |
| death_style | TEXT DEFAULT 'fade' | fade, explode, dissolve, shrink, shatter |
| death_duration_ms | INTEGER DEFAULT 400 | Death animation length |
| death_particle_count | INTEGER DEFAULT 8 | Particles on death |

**Seed data:**

| name | idle motion | cycle | death | particles |
|------|-------------|-------|-------|-----------|
| ooze | scaleX 1.15, scaleY 0.88 | 2000ms | dissolve | 6 |
| stalk | translateX -4px | 1500ms | fade | 8 |
| pulse | scale 1.05, glow | 2500ms | shatter | 12 |
| aggro | translateY -3px | 1000ms | explode | 15 |
| flap | translateY -4px, wing rotate | 800ms | fade | 10 |
| swarm | cluster shift ±2px staggered | 2000ms | dissolve | 20 |
| slither | scaleX wave, translateX ±2px | 1800ms | shrink | 6 |

#### 3.4 silhouette_types

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| name | TEXT UNIQUE NOT NULL | blob, quadruped, biped, orb, winged, cluster |
| description | TEXT | |
| body_shape | TEXT NOT NULL | ellipse, rect, circle, polygon, multi |
| body_ratio_w | REAL DEFAULT 1.0 | Width proportion of bounding box |
| body_ratio_h | REAL DEFAULT 1.0 | Height proportion of bounding box |
| corner_radius | REAL DEFAULT 0.1 | 0=sharp, 0.5=round, 1=circle |
| has_limbs | BOOLEAN DEFAULT FALSE | Draw legs/appendages |
| limb_count | INTEGER DEFAULT 0 | Number of visible limbs |
| has_head | BOOLEAN DEFAULT FALSE | Draw separate head shape |
| has_wings | BOOLEAN DEFAULT FALSE | Draw wing appendages |
| has_weapon_slot | BOOLEAN DEFAULT FALSE | Render held weapon |
| has_eye_glow | BOOLEAN DEFAULT FALSE | Glowing eye effect |
| sub_unit_count | INTEGER DEFAULT 1 | >1 for clusters/swarms |

**Seed data:**

| name | shape | limbs | head | wings | weapon | eyes | units |
|------|-------|-------|------|-------|--------|------|-------|
| blob | ellipse (1.2×0.7) | 0 | no | no | no | no | 1 |
| quadruped | rect (1.4×0.8) | 4 | yes | no | no | yes | 1 |
| biped | rect (0.7×1.3) | 2 | yes | no | yes | no | 1 |
| orb | circle (1.0×1.0) | 0 | no | no | no | yes | 1 |
| winged | ellipse (1.5×0.6) | 0 | yes | yes | no | yes | 1 |
| cluster | multi (0.8×0.8) | 0 | no | no | no | no | 3–5 |

### Modified Table: entity_gameplay_data

New FK columns added to existing table:

| New Column | Type | FK Target | Notes |
|------------|------|-----------|-------|
| movement_type_id | INTEGER NOT NULL | → movement_types.id | ground, hover, flying... |
| size_class_id | INTEGER NOT NULL | → size_classes.id | tiny → huge |
| animation_style_id | INTEGER NOT NULL | → animation_styles.id | ooze, stalk, pulse... |
| silhouette_type_id | INTEGER NOT NULL | → silhouette_types.id | blob, quadruped, biped... |
| color_primary | TEXT | — | hex e.g. '#44aa44' |
| color_secondary | TEXT | — | hex e.g. '#227722' |
| primary_attack_type_id | INTEGER NOT NULL | → attack_types.id | Required |
| secondary_attack_type_id | INTEGER | → attack_types.id | Nullable |
| tertiary_attack_type_id | INTEGER | → attack_types.id | Nullable |

### Deprecated Table: entity_attack_types

The existing 614-row junction table is deprecated. Migration will:
1. For each entity with rows in entity_attack_types, take up to 3 attack types ordered by `attack_type_id ASC` (deterministic, lowest IDs = most basic attacks = primary)
2. Map to primary/secondary/tertiary slots on entity_gameplay_data
3. Entities with 0 attack types in the junction table: assign a sensible default based on entity_type (e.g., creature → melee, manifestation → magic_cast)
4. Keep entity_attack_types table until generator has fully populated entity_gameplay_data and verified; then drop in a later migration

### Migration Strategy

All new columns on `entity_gameplay_data` must be added as **NULLABLE** initially. The NOT NULL constraints are added in a later migration AFTER the generator has populated all 3,936 rows.

**Migration ordering:**
1. **Migration A:** Create lookup tables (movement_types, size_classes, animation_styles, silhouette_types, armor_classes) + seed data
2. **Migration B:** ALTER entity_gameplay_data — add new columns as NULLABLE (movement_type_id, size_class_id, animation_style_id, silhouette_type_id, color_primary, color_secondary, primary_attack_type_id, secondary_attack_type_id, tertiary_attack_type_id)
3. **Migration C:** ALTER attack_types — add visual columns (attack_animation_type, projectile_sprite_key, etc.)
4. **Migration D:** ALTER gear_slots — add paperdoll_layer. ALTER item_type_bases — add armor_class_id, player_attack_animation, player_projectile_key
5. **Generator run:** Populate entity_gameplay_data for all 3,936 entities
6. **Migration E:** Migrate entity_attack_types data → primary/secondary/tertiary slots. Add NOT NULL constraints on required columns. Drop entity_attack_types table.

### visual_behaviors vs animation_styles

The existing `visual_behaviors` table (5 rows) stores `animation_config` JSON and `stat_weights` — it is linked to `attack_types` via `visual_behavior_id` and defines **attack-related** animation behavior (how an entity behaves when using a specific attack type).

The new `animation_styles` table defines **idle/death** animation behavior (how an entity looks when not attacking — its personality). These are complementary, not overlapping:
- `animation_styles` → idle squash/stretch, death style, ambient motion
- `visual_behaviors` → attack execution behavior, stat weighting

Both remain. `entity_gameplay_data.animation_style_id` → idle/death. `attack_types.visual_behavior_id` → attack behavior (unchanged).

---

## 4. Shared EntityRenderer

**One renderer, all surfaces.** The same entity visual (silhouette, animation, size, colors, movement) appears identically across:

1. **BottomAnimatedBanner** — hub/home screen decorative combat loop
2. **CombatStage** — story mode active clicking combat
3. **BossStage** — boss encounters (single large entity)
4. **Idle Training** — active clicker skill training combat

### Implementation Pattern

EntityRenderer is a **React component wrapping PixiJS primitives** using the existing `@pixi/react` + `extend()` pattern. Each surface creates its own PixiJS Application (as they do now), and EntityRenderer is used as a child component within each surface's `<pixiContainer>`. It receives entity visual data as props and renders using `<pixiGraphics>`, `<pixiText>`, etc.

```tsx
// Used identically in all 4 surfaces:
<EntityRenderer
  entity={enemyVisualData}
  x={position.x}
  y={position.y}
  state="idle" | "attacking" | "dying" | "dead"
  onDeath={handleDeath}
/>
```

### Data Flow

```
entity_gameplay_data (size, movement, colors, animation, silhouette, attacks)
  + animation_styles (idle/death params)
  + visual_behaviors (attack behavior — via attack_types)
  + asset_registry (sprite render rules)
  + lookup tables (rendering parameters — inlined by API)
      ↓
/api/game/enemies/encountered → EnemyVisualData payload
  (includes inlined lookup data: movement params, size params, animation params, silhouette params)
      ↓
Shared EntityRenderer component (PixiJS @pixi/react)
      ↓
All 4 combat surfaces consume EntityRenderer identically
```

### API Contracts

**Modified: GET /api/game/enemies/encountered**

Must be updated to:
- JOIN on `player_entity_discovery` to filter to only discovered entities
- JOIN and inline lookup table data (movement_types, size_classes, animation_styles, silhouette_types)
- Include attack type visual data (primary/secondary/tertiary with animation params)

Response shape per entity:
```json
{
  "entity_id": 123,
  "name": "Shadow Wraith",
  "sprite_key": "enemy_wraith",
  "base_hp": 25, "base_gold": 10,
  "color_primary": "#8844cc", "color_secondary": "#662299",
  "movement": { "name": "hover", "y_offset_min": 15, "y_offset_max": 30, "bob_amplitude": 4, "bob_frequency": 0.8, "speed_multiplier": 0.9, "trail_effect": "shadow" },
  "size": { "name": "medium", "scale_min": 1.0, "scale_max": 1.2, "width_base": 24, "height_base": 30, "hitbox_radius": 16 },
  "animation": { "name": "pulse", "idle_scale_x": 1.05, "idle_cycle_ms": 2500, "death_style": "shatter", "death_particle_count": 12 },
  "silhouette": { "name": "orb", "body_shape": "circle", "has_eye_glow": true, "sub_unit_count": 1 },
  "primary_attack": { "name": "magic_bolt", "attack_animation_type": "magic_cast", "projectile_color": "#8844cc", "cooldown_ms": 2000 },
  "secondary_attack": null,
  "tertiary_attack": null
}
```

**New: GET /api/game/character/visuals**

Returns the player character's visual state for paper doll rendering.

Response shape:
```json
{
  "character_id": 1,
  "level": 45,
  "aura_tier": "silver",
  "equipped_layers": [
    { "layer": 3, "slot": "chest", "sprite_key": "chain_chest_rare", "armor_class": { "code": "chain", "overlay_opacity": 0.5, "texture_pattern": "crosshatch", "glow_intensity": 0 } },
    { "layer": 6, "slot": "head", "sprite_key": "chain_head_rare", "armor_class": { "code": "chain", "overlay_opacity": 0.5 } },
    { "layer": 7, "slot": "main_hand", "sprite_key": "weapon_greatsword_rare", "player_attack_animation": "melee_swing" }
  ],
  "unequipped_layers": [1, 2, 4, 5]
}
```

---

## 5. Player Paper Doll — Gear-Driven Visuals

### Current State

- `PlayerPaperDoll` in BottomAnimatedBanner has 4 layers (body, armor, head, weapon) using **level-gated placeholders** — not real gear
- `inventory_items` already has `sprite_key` (always NULL — never set by generator) and `gear_slot_id` (FK)
- `gear_slots` — 16 slots exist: head, neck, shoulders, chest, hands, wrist_1, wrist_2, finger_1, finger_2, legs, feet, main_hand, off_hand, back, trinket, waist
- `item_type_bases` — 90 rows already mapped to gear_slots with base_stat_ranges
- `player_inventory` — has `is_equipped`, `equipped_slot`
- `generate_dream_item()` builds items from 5 components (prefix + quality + lore_tag + type + suffix = 11.7M combos) but never sets `sprite_key`

### New Table: armor_classes (FK lookup, admin-editable)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | |
| code | TEXT UNIQUE NOT NULL | cloth, leather, chain, plate, divine, magic, bone, shadow |
| display_name | TEXT NOT NULL | "Cloth Armor", "Leather Armor", etc. |
| description | TEXT | |
| overlay_opacity | REAL DEFAULT 0.6 | How opaque the armor layer renders |
| color_tint_base | TEXT | Hex base tint (can be overridden by rarity glow) |
| texture_pattern | TEXT DEFAULT 'solid' | solid, crosshatch, rings, gradient, shimmer |
| glow_intensity | REAL DEFAULT 0 | 0=none, 0.5=subtle, 1.0=bright |
| outline_width | REAL DEFAULT 1.0 | Border thickness on paper doll layer |
| weight_class | TEXT DEFAULT 'medium' | light, medium, heavy (affects character animation speed) |
| sort_order | INTEGER DEFAULT 0 | |

**Seed data:**

| code | overlay | pattern | glow | weight |
|------|---------|---------|------|--------|
| cloth | 0.4 | solid | 0 | light |
| leather | 0.55 | solid | 0 | light |
| chain | 0.5 | crosshatch | 0 | medium |
| plate | 0.65 | gradient | 0.1 | heavy |
| divine | 0.5 | shimmer | 0.8 | medium |
| magic | 0.45 | shimmer | 0.6 | light |
| bone | 0.55 | solid | 0 | medium |
| shadow | 0.35 | solid | 0.2 | light |

### Modified Table: item_type_bases

New nullable column:

| Column | Type | Description |
|--------|------|-------------|
| armor_class_id | INTEGER (nullable) | FK → armor_classes.id. NULL = no visual (stat-only items: rings, amulets, trinkets) |

**Example mappings:**
- BLADE (main_hand) → null (weapon-type, uses weapon layer directly)
- ROBE (chest) → cloth
- CUIRASS (chest) → chain
- BREASTPLATE (chest) → plate
- GREAVES (legs) → plate
- HOOD (head) → leather
- SIGNET (finger) → null (stat-only)
- AMULET (neck) → null (stat-only)

### Modified Table: gear_slots

New nullable column:

| Column | Type | Description |
|--------|------|-------------|
| paperdoll_layer | INTEGER (nullable) | Render z-layer (0-7). NULL = no visual (stat-only) |

**Mapping:**

| Slot | Layer | Visual |
|------|-------|--------|
| back | 1 | Cloak, cape, wings (behind body) |
| legs | 2 | Pants, greaves |
| feet | 2 | Boots, sabatons |
| chest | 3 | Robe, cuirass, breastplate |
| waist | 3 | Belt, sash |
| hands | 4 | Gloves, gauntlets |
| shoulders | 5 | Pauldrons, mantle |
| head | 6 | Hood, helm, crown |
| main_hand | 7 | Sword, staff, dagger |
| off_hand | 7 | Shield, orb, tome |
| neck | null | Stat-only |
| wrist_1/2 | null | Stat-only |
| finger_1/2 | null | Stat-only |
| trinket | null | Stat-only |

### Paper Doll Layers (bottom → top)

| # | Layer | Source | Visual |
|---|-------|--------|--------|
| 0 | Aura | Character level thresholds | none → bronze → silver → gold → cyan |
| 1 | Back/Cape | gear_slot: back | Cloak → cape → wings |
| 2 | Legs/Feet | gear_slots: legs, feet | Pants → greaves, boots → sabatons |
| 3 | Chest/Waist | gear_slots: chest, waist | Cloth robe → plate breastplate, belt |
| 4 | Hands | gear_slot: hands | Gloves → gauntlets |
| 5 | Shoulders | gear_slot: shoulders | Pauldrons, mantle |
| 6 | Head | gear_slot: head | Hood → helm → crown |
| 7 | Weapons | gear_slots: main_hand, off_hand | Sword + shield, staff + orb |

### Updated Item Generation Pipeline

Existing 7-step pipeline gets 2 new steps:

- **Step 3b (NEW):** Read `armor_class_id` from selected item_type_base → may be NULL (stat-only)
- **Step 8 (NEW):** Derive `sprite_key`:
  ```
  if armor_class:
      sprite_key = f"{armor_class.code}_{gear_slot.name}_{rarity}"
  else:
      sprite_key = None  # stat-only, no visual
  ```
  Example: `plate_chest_epic` → plate armor overlay with epic glow on chest layer

### Shared PaperDollRenderer

One component reads equipped gear map and renders layers 0-7. Same renderer used across:
- BottomAnimatedBanner (decorative)
- CombatStage (story mode)
- BossStage (boss fights)
- Idle Training (active clicker)
- InventoryPanel (character preview)
- Hub (character display)

### Gear → Visual Data Flow

```
inventory_items (sprite_key, gear_slot_id)
  + player_inventory (is_equipped, equipped_slot)
  + gear_slots (paperdoll_layer)
  + item_type_bases (armor_class_id)
  + armor_classes (rendering params)
  + asset_registry (render_config for sprite_key)
      ↓
/api/game/character/visuals → equipped_layers[] with sprite_keys
      ↓
PaperDollRenderer → layers 0-7 from equipped gear
      ↓
Same renderer → Banner, CombatStage, BossStage, Idle, Inventory, Hub
```

### Inventory Panel Enhancement

- Expand from 3 active equip slots to all 16 gear slots in equipment grid
- Paper doll preview of character with equipped gear
- Same visual_key drives both the paper doll layer AND the inventory icon

---

## 6. Admin Panel Additions

### New Editors (CRUD for lookup tables)

1. **Movement Types Editor** — CRUD with inline parameter sliders for y_offset, bob, speed. Preview animation in mini canvas.
2. **Size Classes Editor** — CRUD with visual scale preview showing entity at min/max scale with hitbox overlay.
3. **Animation Styles Editor** — CRUD with inline preview of idle cycle + death animation. Adjustable timing sliders.
4. **Silhouette Types Editor** — CRUD with procedural shape preview. Toggle limbs/head/wings/eyes.
5. **Armor Classes Editor** — CRUD with visual preview showing overlay style (opacity, pattern, glow). Add new armor classes anytime.

### Enhanced Existing Editors

6. **Entity Gameplay Data Editor** — enhanced with FK dropdowns for movement, size, animation, silhouette, and 3 attack type slots.
7. **Item Type Bases Editor** — existing editor gets new `armor_class_id` dropdown. Null option for stat-only items.
8. **Game Configs** — new banner scaling parameters added to existing config editor.
9. **Inventory Panel** — expanded to show all 16 gear slots with paper doll character preview.

---

## 7. Generator Requirements (Tools)

### Entity Gameplay Data Generator (`tools/generate_entity_gameplay.py`)

Must populate for all 3,936 entities: base_hp, base_gold, movement_type_id, size_class_id, animation_style_id, silhouette_type_id, color_primary, color_secondary, sprite_key, primary/secondary/tertiary_attack_type_id.

- Derives from: entity_type, entity_families, lore description, chapter difficulty curve
- AI-assisted: use entity descriptions to infer visual properties (e.g., "floating wraith" → movement: hover, silhouette: orb)
- Must be runnable by both humans and AI agents
- Supports: get status, remaining items, update, edit, fetch/view

### Entity Type Visual Defaults Generator

Sets default visual profiles per entity_type so new entities inherit sensible defaults:
- creature → ground/stalk/quadruped
- manifestation → hover/pulse/orb
- environment → ground/ooze/blob
- etc.

### Entity Family Seeder

Populates entity_families table (currently 0 rows). Groups like: wraiths, demons, beasts, elementals, undead, constructs, humanoids. Each family gets shared visual traits (color palette, animation tendencies).

### Attack Type Visual Enrichment

Adds to existing 13 attack_types: projectile visuals, animation types, particle effects. Expands visual_behaviors animation_config with: idle_anim, attack_anim, death_anim, movement_pattern.

### Entity Sprite Generator (`tools/generate_entity_sprites.py`)

Generates procedural `asset_registry` entries for each entity using: silhouette_type + colors + size_class + animation_style. Must produce:
- Entity body sprites (base shape from silhouette_type, colored with color_primary/secondary)
- Size variants (scaled per size_class params)
- Animation frame hints (idle keyframes from animation_style params)
- Death particle configs (count, color, style from animation_style)
- Elite/boss glow overlays

Depends on: entity_gameplay_data fully populated, all lookup tables seeded.

### Item Sprite Generator (`tools/generate_item_sprites.py`)

Generates procedural `asset_registry` entries for gear visuals using: armor_class + gear_slot + rarity. Must produce:
- Paper doll layer sprites for each armor_class × gear_slot combination (e.g., `plate_chest_common`, `leather_head_epic`)
- Weapon sprites for each weapon item_type_base (blade, staff, dagger, greatsword, etc.)
- Shield/offhand sprites (buckler, kite shield, tower shield, orb, tome)
- Rarity visual modifiers (common = plain, epic = glow, cosmic = particle trail)
- Inventory icons matching the paper doll layer appearance (same visual_key, icon-sized render)

Depends on: armor_classes table seeded, item_type_bases updated with armor_class_id.

### Projectile Sprite Generator (`tools/generate_projectile_sprites.py`)

Generates procedural `asset_registry` entries for attack projectile visuals. Must produce:
- Projectile sprites per attack_type (arrows, fireballs, energy bolts, thrown weapons)
- Particle trail configs per projectile
- Impact effect configs (splash, shatter, dissipate)

Depends on: attack_types enriched with visual columns.

---

## 8. Attack Animation System

### Enemy Attack Visual Categories

Each of the 13 existing `attack_types` maps to one of 5 visual categories:

| Category | Tag | Visual | Used By |
|----------|-----|--------|---------|
| Melee Swing | `melee_swing` | White arc slash + weapon follow + recoil | Hostiles, creatures |
| Ranged Projectile | `ranged_projectile` | Arrow/weapon sprite flies across screen | Archers, hunters |
| Magic Cast | `magic_cast` | Glowing orb projectile, slower, with glow | Manifestations, mages |
| Elemental Projectile | `elemental_projectile` | Colored projectile (fire/ice/lightning) + particle trail | Elementals, dragons |
| AoE Burst | `aoe_burst` | Expanding ring + screen shake | Bosses, elites |

### New Columns on attack_types

| Column | Type | Description |
|--------|------|-------------|
| attack_animation_type | TEXT NOT NULL | melee_swing, ranged_projectile, magic_cast, elemental_projectile, aoe_burst |
| projectile_sprite_key | TEXT (nullable) | FK-ish to asset_registry. NULL for melee types |
| projectile_speed | REAL DEFAULT 3.0 | Pixels per frame |
| projectile_color | TEXT (nullable) | Hex color for projectile tint |
| impact_effect | TEXT DEFAULT 'flash' | flash, splash, shatter, dissipate, shake |
| attack_range | REAL DEFAULT 30.0 | Pixels (melee ≈ 30, ranged ≈ screen width) |
| cooldown_ms | INTEGER DEFAULT 2000 | Time between attacks |
| arc_angle | REAL DEFAULT 90 | Melee swing arc degrees |
| trail_type | TEXT (nullable) | null, 'particles', 'streak', 'glow' |
| screen_shake | BOOLEAN DEFAULT FALSE | Trigger screen shake on hit (bosses, aoe) |

### Player Attack Animation — Weapon-Driven

Player attack animation is determined by equipped weapon's `item_type_base`. No weapon = unarmed (fist punch). Same visual across all surfaces.

| item_type_base | attack_animation | visual |
|----------------|-----------------|--------|
| BLADE, SWORD, AXE | melee_swing | Wide arc, weapon follows path |
| DAGGER, KNIFE | melee_swing | Fast short arc, quick cycle |
| MACE, HAMMER | melee_swing | Overhead smash arc, screen shake |
| STAFF, WAND, ORB | magic_cast | Cast pose → orb projectile from tip |
| BOW, CROSSBOW | ranged_projectile | Draw → release → arrow flies |
| THROWN | ranged_projectile | Wind up → projectile |
| (none equipped) | melee_swing | Fist punch, shortest arc |

### New Columns on item_type_bases (for weapons)

| Column | Type | Description |
|--------|------|-------------|
| player_attack_animation | TEXT (nullable) | Only for weapon-slot types: melee_swing, magic_cast, ranged_projectile |
| player_projectile_key | TEXT (nullable) | Asset key for player's projectile when using this weapon type |

### Attack Animation in Banner vs Combat

- **BottomAnimatedBanner:** Enemies use their `primary_attack_type_id` to determine attack visual. Player uses equipped weapon. Attacks are purely visual — no real damage calculation.
- **CombatStage:** Same attack visuals, but tied to actual damage events (click damage, auto-DPS ticks). Damage numbers appear at impact point.
- **BossStage:** Boss uses all 3 attack type slots (primary/secondary/tertiary) cycling through them. More dramatic — screen shake enabled, larger projectiles.
- **Idle Training:** Same as CombatStage but auto-only (no click). Attack visuals match equipped weapon.

---

## 9. Visual Verification TODO

After implementation, manually verify at each progression tier:

### Banner Wave Scaling
1. Set character to level 1, chapter 1 → observe banner (1–2 enemies, frequent deaths)
2. Update character level to 20 in DB → observe (3–5 enemies, bronze aura)
3. Update to level 40 → observe (5–6 enemies, mixed types)
4. Update to level 70 → observe (6–8 enemies, flyers, silver aura)
5. Update to level 90 → observe (10–15 enemies, carnage, cyan aura)

### Paper Doll Gear
6. Equip cloth armor → verify paper doll shows cloth overlay
7. Equip plate armor → verify plate visual replaces cloth
8. Equip weapon → verify weapon layer renders correctly
9. Equip full set → verify all layers render in correct z-order
10. Verify same visuals appear in Banner, CombatStage, BossStage, Idle Training

### Attack Animations
11. Verify melee enemy shows arc slash when attacking player
12. Verify ranged enemy fires projectile across screen
13. Verify magic enemy fires glowing orb
14. Verify elemental enemy fires colored projectile with trail
15. Verify boss uses AoE burst with expanding ring + screen shake
16. Equip sword → verify player shows melee swing arc
17. Equip staff → verify player fires magic orb projectile
18. Equip bow → verify player fires arrow projectile
19. Unequip weapon → verify player uses fist punch animation
20. Verify boss cycles through primary/secondary/tertiary attack types

---

## 10. Migration Numbers

Per SESSION_STATE.md, next available migration is **064**. Planned migrations:

| Migration | Content |
|-----------|---------|
| 064 | Create lookup tables (movement_types, size_classes, animation_styles, silhouette_types, armor_classes) + seed data |
| 065 | ALTER entity_gameplay_data — add new NULLABLE FK columns + color columns |
| 066 | ALTER attack_types — add visual columns (attack_animation_type, projectile_sprite_key, etc.) + seed values for existing 13 types |
| 067 | ALTER gear_slots — add paperdoll_layer + seed. ALTER item_type_bases — add armor_class_id, player_attack_animation, player_projectile_key |
| 068 | Insert banner scaling game_configs rows |
| 069 | (After generator run) Migrate entity_attack_types → primary/secondary/tertiary. Add NOT NULL constraints. |

---

*Updated: 2026-03-22*
