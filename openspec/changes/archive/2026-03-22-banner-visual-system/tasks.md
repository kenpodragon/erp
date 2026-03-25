# Banner Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement adaptive wave scaling, entity visual rendering, player paper doll, attack animations, and shared renderers across all combat surfaces.

**Architecture:** DB-first approach — create normalized lookup tables with rendering parameters, extend entity_gameplay_data and attack_types with visual columns, build shared PixiJS renderers consumed by all 4 combat surfaces (Banner, CombatStage, BossStage, Idle Training), update item generation pipeline with armor_class support, add admin editors for all new tables.

**Tech Stack:** PostgreSQL migrations, FastAPI + SQLModel (backend), React + TypeScript + PixiJS v8 @pixi/react (frontend), Vitest + pytest (testing)

**Spec:** `docs/superpowers/specs/2026-03-22-banner-visual-system-design.md`

---

## Phase 1: Database Foundation (Migrations 064-067)

### Task 1: Create Lookup Tables + Seed Data (Migration 064)

**Files:**
- Create: `db/064_visual_lookup_tables.sql`
- Modify: `db/data_dictionary.md` (add 5 new tables)

- [ ] **Step 1: Write migration SQL — movement_types table + seed**

```sql
-- movement_types
CREATE TABLE IF NOT EXISTS movement_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    y_offset_min REAL DEFAULT 0,
    y_offset_max REAL DEFAULT 0,
    bob_amplitude REAL DEFAULT 0,
    bob_frequency REAL DEFAULT 1.0,
    speed_multiplier REAL DEFAULT 1.0,
    can_change_lane BOOLEAN DEFAULT FALSE,
    trail_effect TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO movement_types (name, description, y_offset_min, y_offset_max, bob_amplitude, bob_frequency, speed_multiplier, can_change_lane, trail_effect) VALUES
('ground', 'Walks on ground level', 0, 0, 0, 1.0, 1.0, FALSE, NULL),
('hover', 'Floats above ground', 15, 30, 4, 0.8, 0.9, FALSE, 'shadow'),
('flying', 'High altitude airborne', 40, 70, 8, 1.2, 1.3, TRUE, NULL),
('burrowing', 'Partially underground', -5, 0, 2, 0.5, 0.7, FALSE, 'particles'),
('teleport', 'Blinks between positions', 0, 0, 0, 1.0, 0.5, TRUE, 'afterimage');
```

- [ ] **Step 2: Add size_classes table + seed**

```sql
-- size_classes
CREATE TABLE IF NOT EXISTS size_classes (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    scale_min REAL NOT NULL,
    scale_max REAL NOT NULL,
    width_base REAL NOT NULL,
    height_base REAL NOT NULL,
    hitbox_radius REAL NOT NULL,
    hp_bar_width REAL NOT NULL,
    hp_bar_offset_y REAL DEFAULT -8,
    name_tag_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO size_classes (name, description, scale_min, scale_max, width_base, height_base, hitbox_radius, hp_bar_width, sort_order) VALUES
('tiny', 'Very small entities', 0.4, 0.6, 12, 14, 8, 16, 1),
('small', 'Below average size', 0.7, 0.9, 18, 22, 12, 22, 2),
('medium', 'Standard size', 1.0, 1.2, 24, 30, 16, 28, 3),
('large', 'Above average size', 1.3, 1.6, 32, 40, 22, 36, 4),
('huge', 'Massive entities', 1.8, 2.2, 44, 54, 30, 48, 5);
```

- [ ] **Step 3: Add animation_styles table + seed**

```sql
-- animation_styles
CREATE TABLE IF NOT EXISTS animation_styles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    idle_scale_x REAL DEFAULT 1.0,
    idle_scale_y REAL DEFAULT 1.0,
    idle_cycle_ms INTEGER DEFAULT 2000,
    idle_translate_x REAL DEFAULT 0,
    idle_translate_y REAL DEFAULT 0,
    attack_recoil REAL DEFAULT 3.0,
    death_style TEXT DEFAULT 'fade',
    death_duration_ms INTEGER DEFAULT 400,
    death_particle_count INTEGER DEFAULT 8,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO animation_styles (name, description, idle_scale_x, idle_scale_y, idle_cycle_ms, idle_translate_x, idle_translate_y, attack_recoil, death_style, death_duration_ms, death_particle_count) VALUES
('ooze', 'Blob squash/stretch', 1.15, 0.88, 2000, 0, 0, 2.0, 'dissolve', 500, 6),
('stalk', 'Predatory side-step', 1.0, 1.0, 1500, -4, 0, 4.0, 'fade', 400, 8),
('pulse', 'Magical pulsing glow', 1.05, 1.05, 2500, 0, 0, 2.0, 'shatter', 600, 12),
('aggro', 'Aggressive bobbing', 1.0, 1.0, 1000, 0, -3, 5.0, 'explode', 300, 15),
('flap', 'Wing-driven hover', 1.0, 1.0, 800, 0, -4, 3.0, 'fade', 400, 10),
('swarm', 'Cluster shifting', 1.0, 1.0, 2000, 2, 0, 1.0, 'dissolve', 500, 20),
('slither', 'Serpentine wave', 1.08, 1.0, 1800, 2, 0, 2.0, 'shrink', 400, 6);
```

- [ ] **Step 4: Add silhouette_types table + seed**

```sql
-- silhouette_types
CREATE TABLE IF NOT EXISTS silhouette_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    body_shape TEXT NOT NULL,
    body_ratio_w REAL DEFAULT 1.0,
    body_ratio_h REAL DEFAULT 1.0,
    corner_radius REAL DEFAULT 0.1,
    has_limbs BOOLEAN DEFAULT FALSE,
    limb_count INTEGER DEFAULT 0,
    has_head BOOLEAN DEFAULT FALSE,
    has_wings BOOLEAN DEFAULT FALSE,
    has_weapon_slot BOOLEAN DEFAULT FALSE,
    has_eye_glow BOOLEAN DEFAULT FALSE,
    sub_unit_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO silhouette_types (name, description, body_shape, body_ratio_w, body_ratio_h, corner_radius, has_limbs, limb_count, has_head, has_wings, has_weapon_slot, has_eye_glow, sub_unit_count) VALUES
('blob', 'Amorphous blob shape', 'ellipse', 1.2, 0.7, 0.5, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 1),
('quadruped', 'Four-legged beast', 'rect', 1.4, 0.8, 0.1, TRUE, 4, TRUE, FALSE, FALSE, TRUE, 1),
('biped', 'Humanoid figure', 'rect', 0.7, 1.3, 0.1, TRUE, 2, TRUE, FALSE, TRUE, FALSE, 1),
('orb', 'Floating sphere', 'circle', 1.0, 1.0, 1.0, FALSE, 0, FALSE, FALSE, FALSE, TRUE, 1),
('winged', 'Winged creature', 'ellipse', 1.5, 0.6, 0.3, FALSE, 0, TRUE, TRUE, FALSE, TRUE, 1),
('cluster', 'Group of small units', 'multi', 0.8, 0.8, 0.2, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 4);
```

- [ ] **Step 5: Add armor_classes table + seed**

```sql
-- armor_classes
CREATE TABLE IF NOT EXISTS armor_classes (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    overlay_opacity REAL DEFAULT 0.6,
    color_tint_base TEXT,
    texture_pattern TEXT DEFAULT 'solid',
    glow_intensity REAL DEFAULT 0,
    outline_width REAL DEFAULT 1.0,
    weight_class TEXT DEFAULT 'medium',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO armor_classes (code, display_name, overlay_opacity, color_tint_base, texture_pattern, glow_intensity, outline_width, weight_class, sort_order) VALUES
('cloth', 'Cloth Armor', 0.4, '#645040', 'solid', 0, 0.5, 'light', 1),
('leather', 'Leather Armor', 0.55, '#8b5a2b', 'solid', 0, 1.0, 'light', 2),
('chain', 'Chain Armor', 0.5, '#b4b4b4', 'crosshatch', 0, 1.0, 'medium', 3),
('plate', 'Plate Armor', 0.65, '#c8c8dc', 'gradient', 0.1, 1.5, 'heavy', 4),
('divine', 'Divine Armor', 0.5, '#ffd700', 'shimmer', 0.8, 1.0, 'medium', 5),
('magic', 'Magic Armor', 0.45, '#8844cc', 'shimmer', 0.6, 0.5, 'light', 6),
('bone', 'Bone Armor', 0.55, '#b4aa8c', 'solid', 0, 1.0, 'medium', 7),
('shadow', 'Shadow Armor', 0.35, '#28283c', 'solid', 0.2, 0.5, 'light', 8);
```

- [ ] **Step 6: Verify migration runs cleanly**

Run: `rtk psql -f db/064_visual_lookup_tables.sql` (using connection from backend/.env)
Expected: 5 tables created, seed data inserted with no errors.

- [ ] **Step 7: Commit**

```bash
rtk git add db/064_visual_lookup_tables.sql && rtk git commit -m "feat: create visual lookup tables (movement, size, animation, silhouette, armor_class)"
```

---

### Task 2: Extend entity_gameplay_data (Migration 065)

**Files:**
- Create: `db/065_entity_gameplay_visual_columns.sql`

- [ ] **Step 1: Write migration — add NULLABLE FK columns**

```sql
-- Add visual FK columns (all NULLABLE until generator populates)
ALTER TABLE entity_gameplay_data
    ADD COLUMN IF NOT EXISTS movement_type_id INTEGER REFERENCES movement_types(id),
    ADD COLUMN IF NOT EXISTS size_class_id INTEGER REFERENCES size_classes(id),
    ADD COLUMN IF NOT EXISTS animation_style_id INTEGER REFERENCES animation_styles(id),
    ADD COLUMN IF NOT EXISTS silhouette_type_id INTEGER REFERENCES silhouette_types(id),
    ADD COLUMN IF NOT EXISTS color_primary TEXT,
    ADD COLUMN IF NOT EXISTS color_secondary TEXT,
    ADD COLUMN IF NOT EXISTS primary_attack_type_id INTEGER REFERENCES attack_types(id),
    ADD COLUMN IF NOT EXISTS secondary_attack_type_id INTEGER REFERENCES attack_types(id),
    ADD COLUMN IF NOT EXISTS tertiary_attack_type_id INTEGER REFERENCES attack_types(id);
```

- [ ] **Step 2: Apply migration**

Run: `rtk psql -f db/065_entity_gameplay_visual_columns.sql`
Expected: 9 columns added to entity_gameplay_data.

- [ ] **Step 3: Commit**

```bash
rtk git add db/065_entity_gameplay_visual_columns.sql && rtk git commit -m "feat: add visual FK columns to entity_gameplay_data (nullable)"
```

---

### Task 3: Extend attack_types with visual columns (Migration 066)

**Files:**
- Create: `db/066_attack_type_visual_columns.sql`

- [ ] **Step 1: Write migration — add visual columns + seed for existing 13 types**

```sql
ALTER TABLE attack_types
    ADD COLUMN IF NOT EXISTS attack_animation_type TEXT DEFAULT 'melee_swing',
    ADD COLUMN IF NOT EXISTS projectile_sprite_key TEXT,
    ADD COLUMN IF NOT EXISTS projectile_speed REAL DEFAULT 3.0,
    ADD COLUMN IF NOT EXISTS projectile_color TEXT,
    ADD COLUMN IF NOT EXISTS impact_effect TEXT DEFAULT 'flash',
    ADD COLUMN IF NOT EXISTS attack_range REAL DEFAULT 30.0,
    ADD COLUMN IF NOT EXISTS cooldown_ms INTEGER DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS arc_angle REAL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS trail_type TEXT,
    ADD COLUMN IF NOT EXISTS screen_shake BOOLEAN DEFAULT FALSE;

-- Update existing attack types with appropriate animation types
-- (Update these based on actual attack_type names in DB — review before applying)
UPDATE attack_types SET attack_animation_type = 'melee_swing', attack_range = 30 WHERE name ILIKE '%melee%' OR name ILIKE '%slash%' OR name ILIKE '%strike%';
UPDATE attack_types SET attack_animation_type = 'ranged_projectile', attack_range = 300, projectile_speed = 4.0 WHERE name ILIKE '%ranged%' OR name ILIKE '%arrow%' OR name ILIKE '%throw%';
UPDATE attack_types SET attack_animation_type = 'magic_cast', attack_range = 250, projectile_speed = 2.5, trail_type = 'glow' WHERE name ILIKE '%magic%' OR name ILIKE '%spell%' OR name ILIKE '%bolt%';
UPDATE attack_types SET attack_animation_type = 'elemental_projectile', attack_range = 250, trail_type = 'particles' WHERE name ILIKE '%fire%' OR name ILIKE '%ice%' OR name ILIKE '%element%';
UPDATE attack_types SET attack_animation_type = 'aoe_burst', attack_range = 100, screen_shake = TRUE WHERE name ILIKE '%aoe%' OR name ILIKE '%burst%' OR name ILIKE '%area%';
```

- [ ] **Step 2: Apply migration**

Run: `rtk psql -f db/066_attack_type_visual_columns.sql`

- [ ] **Step 3: Commit**

```bash
rtk git add db/066_attack_type_visual_columns.sql && rtk git commit -m "feat: add attack animation visual columns to attack_types"
```

---

### Task 4: Extend gear_slots + item_type_bases (Migration 067)

**Files:**
- Create: `db/067_gear_paperdoll_armor_class.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add paperdoll_layer to gear_slots
ALTER TABLE gear_slots ADD COLUMN IF NOT EXISTS paperdoll_layer INTEGER;

-- Map existing slots to layers
UPDATE gear_slots SET paperdoll_layer = 1 WHERE name = 'back';
UPDATE gear_slots SET paperdoll_layer = 2 WHERE name IN ('legs', 'feet');
UPDATE gear_slots SET paperdoll_layer = 3 WHERE name IN ('chest', 'waist');
UPDATE gear_slots SET paperdoll_layer = 4 WHERE name = 'hands';
UPDATE gear_slots SET paperdoll_layer = 5 WHERE name = 'shoulders';
UPDATE gear_slots SET paperdoll_layer = 6 WHERE name = 'head';
UPDATE gear_slots SET paperdoll_layer = 7 WHERE name IN ('main_hand', 'off_hand');
-- neck, wrist_1, wrist_2, finger_1, finger_2, trinket stay NULL (stat-only)

-- Add armor_class_id + weapon animation to item_type_bases
ALTER TABLE item_type_bases
    ADD COLUMN IF NOT EXISTS armor_class_id INTEGER REFERENCES armor_classes(id),
    ADD COLUMN IF NOT EXISTS player_attack_animation TEXT,
    ADD COLUMN IF NOT EXISTS player_projectile_key TEXT;

-- Map weapon types to attack animations (review actual codes before applying)
UPDATE item_type_bases SET player_attack_animation = 'melee_swing' WHERE code IN ('BLADE', 'SWORD', 'AXE', 'DAGGER', 'KNIFE', 'MACE', 'HAMMER');
UPDATE item_type_bases SET player_attack_animation = 'magic_cast' WHERE code IN ('STAFF', 'WAND', 'ORB');
UPDATE item_type_bases SET player_attack_animation = 'ranged_projectile' WHERE code IN ('BOW', 'CROSSBOW', 'THROWN');

-- Map armor types to armor_classes (review actual codes before applying)
-- Chest armor
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'cloth') WHERE code IN ('ROBE', 'TUNIC', 'VEST') AND gear_slot_id = (SELECT id FROM gear_slots WHERE name = 'chest');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'leather') WHERE code IN ('JERKIN', 'HIDE') AND gear_slot_id = (SELECT id FROM gear_slots WHERE name = 'chest');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'chain') WHERE code IN ('CUIRASS', 'MAIL') AND gear_slot_id = (SELECT id FROM gear_slots WHERE name = 'chest');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'plate') WHERE code IN ('BREASTPLATE', 'PLATE') AND gear_slot_id = (SELECT id FROM gear_slots WHERE name = 'chest');
-- NOTE: Full mapping of all 90 item_type_bases requires reviewing actual DB codes.
-- The generator task will handle unmapped types by defaulting based on gear_slot.
```

- [ ] **Step 2: Apply migration**

Run: `rtk psql -f db/067_gear_paperdoll_armor_class.sql`

- [ ] **Step 3: Commit**

```bash
rtk git add db/067_gear_paperdoll_armor_class.sql && rtk git commit -m "feat: add paperdoll_layer to gear_slots, armor_class + weapon animation to item_type_bases"
```

---

### Task 5: Add banner scaling game_configs

**Files:**
- Create: `db/068_banner_scaling_configs.sql`

- [ ] **Step 1: Write migration — insert game_configs rows**

```sql
INSERT INTO game_configs (key, value, category, description) VALUES
('banner_base_enemies', '1', 'banner', 'Minimum enemies on screen in banner'),
('banner_max_enemies', '15', 'banner', 'Maximum enemies on screen in banner'),
('banner_enemies_per_level', '0.15', 'banner', 'Additional enemies per character level'),
('banner_death_base_rate', '0.03', 'banner', 'Base death probability per combat cycle'),
('banner_death_reduction_per_level', '0.0003', 'banner', 'Death rate reduction per character level'),
('banner_death_floor', '0.002', 'banner', 'Minimum death rate (never zero)'),
('banner_kill_speed_base_ms', '3000', 'banner', 'Base time to kill at level 1 (ms)'),
('banner_kill_speed_min_ms', '200', 'banner', 'Minimum kill time floor (ms)'),
('banner_spawn_rate_base', '0.05', 'banner', 'Spawn probability per tick (walking)'),
('banner_spawn_rate_combat', '0.01', 'banner', 'Spawn probability per tick (fighting)')
ON CONFLICT (key) DO NOTHING;
```

- [ ] **Step 2: Apply migration and commit**

```bash
rtk psql -f db/068_banner_scaling_configs.sql
rtk git add db/068_banner_scaling_configs.sql && rtk git commit -m "feat: add banner scaling game_configs"
```

---

### Task 6: Update data dictionary

**Files:**
- Modify: `db/data_dictionary.md`

- [ ] **Step 1: Add all 5 new tables to data dictionary**

Add entries for: movement_types, size_classes, animation_styles, silhouette_types, armor_classes. Document all columns, types, FKs, seed row counts.

- [ ] **Step 2: Update entity_gameplay_data entry**

Add the 9 new columns with FK references.

- [ ] **Step 3: Update attack_types entry**

Add the 10 new visual columns.

- [ ] **Step 4: Update gear_slots entry**

Add paperdoll_layer column.

- [ ] **Step 5: Update item_type_bases entry**

Add armor_class_id, player_attack_animation, player_projectile_key columns.

- [ ] **Step 6: Commit**

```bash
rtk git add db/data_dictionary.md && rtk git commit -m "docs: update data dictionary with visual system tables and columns"
```

---

## Phase 2: Backend Models & Routes

### Task 7: Create lookup table models

**Files:**
- Create: `backend/models/visual.py`
- Modify: `backend/models/__init__.py` (add re-exports)

- [ ] **Step 1: Write test for model imports**

```python
# backend/tests/test_visual_models.py
def test_visual_models_importable():
    from backend.models.visual import MovementType, SizeClass, AnimationStyle, SilhouetteType, ArmorClass
    assert MovementType.__tablename__ == "movement_types"
    assert SizeClass.__tablename__ == "size_classes"
    assert AnimationStyle.__tablename__ == "animation_styles"
    assert SilhouetteType.__tablename__ == "silhouette_types"
    assert ArmorClass.__tablename__ == "armor_classes"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk pytest backend/tests/test_visual_models.py -v`
Expected: FAIL — ImportError

- [ ] **Step 3: Implement models**

Create `backend/models/visual.py` with 5 SQLModel classes matching the migration schemas. Each class maps to its table with all columns typed.

- [ ] **Step 4: Add re-exports to `backend/models/__init__.py`**

```python
from .visual import MovementType, SizeClass, AnimationStyle, SilhouetteType, ArmorClass
```

- [ ] **Step 5: Run test to verify it passes**

Run: `rtk pytest backend/tests/test_visual_models.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
rtk git add backend/models/visual.py backend/models/__init__.py backend/tests/test_visual_models.py && rtk git commit -m "feat: add SQLModel classes for visual lookup tables"
```

---

### Task 8: Update existing models with new columns

**Files:**
- Modify: `backend/models/gameplay.py` (EntityGameplayData — add 9 columns)
- Modify: `backend/models/attack_types.py` (AttackType — add 10 columns)
- Modify: `backend/models/inventory.py` (GearSlot — add paperdoll_layer, ItemTypeBase — add 3 columns)

- [ ] **Step 1: Write tests for new columns**

```python
# backend/tests/test_visual_models.py (append)
def test_entity_gameplay_data_has_visual_columns():
    from backend.models.gameplay import EntityGameplayData
    fields = EntityGameplayData.model_fields
    for col in ['movement_type_id', 'size_class_id', 'animation_style_id', 'silhouette_type_id',
                'color_primary', 'color_secondary', 'primary_attack_type_id',
                'secondary_attack_type_id', 'tertiary_attack_type_id']:
        assert col in fields, f"Missing column: {col}"

def test_attack_type_has_visual_columns():
    from backend.models.attack_types import AttackType
    fields = AttackType.model_fields
    for col in ['attack_animation_type', 'projectile_sprite_key', 'projectile_speed',
                'projectile_color', 'impact_effect', 'attack_range', 'cooldown_ms',
                'arc_angle', 'trail_type', 'screen_shake']:
        assert col in fields, f"Missing column: {col}"

def test_gear_slot_has_paperdoll_layer():
    from backend.models.inventory import GearSlot
    assert 'paperdoll_layer' in GearSlot.model_fields

def test_item_type_base_has_armor_class():
    from backend.models.inventory import ItemTypeBase
    for col in ['armor_class_id', 'player_attack_animation', 'player_projectile_key']:
        assert col in ItemTypeBase.model_fields, f"Missing column: {col}"
```

- [ ] **Step 2: Run tests — expect failure**

Run: `rtk pytest backend/tests/test_visual_models.py -v`

- [ ] **Step 3: Add columns to EntityGameplayData in `backend/models/gameplay.py`**

Add 9 Optional fields with FK references.

- [ ] **Step 4: Add columns to AttackType in `backend/models/attack_types.py`**

Add 10 fields with defaults matching migration.

- [ ] **Step 5: Add columns to GearSlot and ItemTypeBase in `backend/models/inventory.py`**

Add `paperdoll_layer: Optional[int]` to GearSlot. Add `armor_class_id: Optional[int]`, `player_attack_animation: Optional[str]`, `player_projectile_key: Optional[str]` to ItemTypeBase.

- [ ] **Step 6: Run tests — expect pass**

Run: `rtk pytest backend/tests/test_visual_models.py -v`

- [ ] **Step 7: Run full backend test suite to check for regressions**

Run: `rtk pytest backend/tests/ -v`
Expected: No new failures (pre-existing failures OK).

- [ ] **Step 8: Commit**

```bash
rtk git add backend/models/gameplay.py backend/models/attack_types.py backend/models/inventory.py backend/tests/test_visual_models.py && rtk git commit -m "feat: add visual columns to EntityGameplayData, AttackType, GearSlot, ItemTypeBase"
```

---

### Task 9: Update /enemies/encountered endpoint

**Files:**
- Modify: `backend/routes/game.py` (update encountered endpoint to filter by discovery + inline lookup data)
- Modify: `backend/tests/test_game.py` or create `backend/tests/test_enemies_encountered.py`

- [ ] **Step 1: Write test for discovery-filtered response**

Test that the endpoint only returns entities the player has discovered, and that the response includes inlined visual data (movement, size, animation, silhouette, attack types).

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Update endpoint**

Modify the `/api/game/enemies/encountered` handler in `backend/routes/game.py`:
- JOIN on `player_entity_discovery` filtered by current player
- JOIN on `movement_types`, `size_classes`, `animation_styles`, `silhouette_types` via entity_gameplay_data FKs
- JOIN on `attack_types` for primary/secondary/tertiary
- Return `EnemyVisualData` response shape per spec section 4

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Run full backend tests for regressions**

Run: `rtk pytest backend/tests/ -v`

- [ ] **Step 6: Commit**

```bash
rtk git add backend/routes/game.py backend/tests/test_enemies_encountered.py && rtk git commit -m "feat: update /enemies/encountered to filter by discovery and include visual data"
```

---

### Task 10: Create /character/visuals endpoint

**Files:**
- Modify: `backend/routes/game.py` or `backend/routes/characters.py`
- Create: `backend/tests/test_character_visuals.py`

- [ ] **Step 1: Write test for character visuals response**

Test that the endpoint returns equipped_layers with sprite_keys, armor_class data, paperdoll_layer, and aura_tier based on level.

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Implement endpoint**

```python
@router.get("/api/game/character/visuals")
async def get_character_visuals(token: dict = Depends(get_current_player), db: Session = Depends(get_db)):
    # Query equipped items with gear_slot paperdoll_layer + item_type_base armor_class
    # Calculate aura_tier from character level
    # Return equipped_layers[] and unequipped_layers[]
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit**

```bash
rtk git add backend/routes/game.py backend/tests/test_character_visuals.py && rtk git commit -m "feat: add /character/visuals endpoint for paper doll rendering"
```

---

### Task 11: Update item generator with armor_class + sprite_key

**Files:**
- Modify: `backend/services/item_generator.py` (add steps 3b and 8)
- Modify: `backend/tests/test_item_generation.py` or create new test file

- [ ] **Step 1: Write test — generated item has sprite_key when armor_class exists**

Test that `generate_dream_item()` sets `sprite_key` to `{armor_class.code}_{gear_slot.name}_{rarity}` when the item_type_base has an armor_class_id, and NULL when it doesn't.

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Add step 3b — read armor_class_id from item_type_base**

After selecting item_type_base, query its `armor_class_id`. If not null, fetch the ArmorClass row.

- [ ] **Step 4: Add step 8 — derive sprite_key**

```python
if armor_class:
    item.sprite_key = f"{armor_class.code}_{gear_slot.name}_{rarity}"
else:
    item.sprite_key = None
```

- [ ] **Step 5: Run test — expect pass**

- [ ] **Step 6: Run full backend tests**

Run: `rtk pytest backend/tests/ -v`

- [ ] **Step 7: Commit**

```bash
rtk git add backend/services/item_generator.py backend/tests/ && rtk git commit -m "feat: item generator derives sprite_key from armor_class + gear_slot + rarity"
```

---

## Phase 3: Admin Editors

### Task 12: Lookup table admin routes

**Files:**
- Create: `backend/routes/admin_visual.py`
- Modify: `backend/main.py` (register router)
- Create: `backend/tests/test_admin_visual.py`

- [ ] **Step 1: Write tests for CRUD endpoints**

Test GET (list), POST (create), PUT (update), DELETE for each of the 5 lookup tables + armor_classes.

- [ ] **Step 2: Implement admin routes**

Standard CRUD pattern matching existing admin routes (see `backend/routes/admin_game.py` for pattern). Endpoints:
- `GET/POST /api/admin/visual/movement-types`
- `GET/POST /api/admin/visual/size-classes`
- `GET/POST /api/admin/visual/animation-styles`
- `GET/POST /api/admin/visual/silhouette-types`
- `GET/POST /api/admin/visual/armor-classes`
- `PUT/DELETE /api/admin/visual/{table}/{id}`

- [ ] **Step 3: Register router in main.py**

- [ ] **Step 4: Run tests — expect pass**

- [ ] **Step 5: Commit**

```bash
rtk git add backend/routes/admin_visual.py backend/main.py backend/tests/test_admin_visual.py && rtk git commit -m "feat: add admin CRUD routes for visual lookup tables"
```

---

### Task 13: Admin editor pages (frontend)

**Files:**
- Create: `admin/src/pages/VisualEditor.tsx`
- Modify: `admin/src/App.tsx` (add route)
- Create: `admin/src/pages/VisualEditor.test.tsx`

- [ ] **Step 1: Write component tests**

Test that the editor renders tabs for each lookup table, fetches data, and handles CRUD operations. Follow pattern from `admin/src/pages/GameConfigs.tsx`.

- [ ] **Step 2: Implement VisualEditor page**

Single page with tab navigation for: Movement Types, Size Classes, Animation Styles, Silhouette Types, Armor Classes. Each tab shows a table with inline edit + add/delete. Follow existing admin page patterns.

- [ ] **Step 3: Add route to App.tsx**

- [ ] **Step 4: Run admin tests**

Run: `cd admin && rtk npx vitest run`

- [ ] **Step 5: Commit**

```bash
rtk git add admin/src/pages/VisualEditor.tsx admin/src/pages/VisualEditor.test.tsx admin/src/App.tsx && rtk git commit -m "feat: add VisualEditor admin page for lookup tables"
```

---

## Phase 4: Shared Renderers (Frontend)

### Task 14: EntityRenderer component

**Files:**
- Create: `frontend/src/game/components/shared/EntityRenderer.tsx`
- Create: `frontend/src/game/components/shared/EntityRenderer.test.tsx`

- [ ] **Step 1: Define EnemyVisualData TypeScript interface**

Match the API response shape from the spec. Export from EntityRenderer.

- [ ] **Step 2: Write component tests**

Test that EntityRenderer renders a PixiJS container with correct positioning, applies movement offsets, uses silhouette shape, and applies animation cycle.

- [ ] **Step 3: Implement EntityRenderer**

React component using `@pixi/react` extend() pattern. Props: `entity: EnemyVisualData`, `x`, `y`, `state: 'idle' | 'attacking' | 'dying' | 'dead'`, `onDeath`. Renders:
- Body shape from silhouette_type params
- Colors from color_primary/secondary
- Idle animation from animation_style params (scale oscillation, translation)
- Movement offset from movement_type params (y_offset, bob)
- HP bar from size_class params
- Death animation from animation_style death params
- Attack visual from primary_attack_type animation params

- [ ] **Step 4: Run frontend tests**

Run: `cd frontend && rtk npx vitest run`

- [ ] **Step 5: Commit**

```bash
rtk git add frontend/src/game/components/shared/ && rtk git commit -m "feat: add shared EntityRenderer PixiJS component"
```

---

### Task 15: PaperDollRenderer component

**Files:**
- Create: `frontend/src/game/components/shared/PaperDollRenderer.tsx`
- Create: `frontend/src/game/components/shared/PaperDollRenderer.test.tsx`

- [ ] **Step 1: Define CharacterVisualData TypeScript interface**

Match the `/character/visuals` API response shape.

- [ ] **Step 2: Write component tests**

Test that PaperDollRenderer renders layers in correct z-order, applies armor_class visual params, renders weapon with attack animation, shows aura based on level.

- [ ] **Step 3: Implement PaperDollRenderer**

React component using `@pixi/react`. Props: `character: CharacterVisualData`, `x`, `y`, `state`, `attackAnimation`. Renders layers 0-7 from equipped_layers, applying armor_class overlay params (opacity, texture, glow). Weapon layer drives attack animation (melee arc, projectile, magic cast).

- [ ] **Step 4: Run frontend tests**

Run: `cd frontend && rtk npx vitest run`

- [ ] **Step 5: Commit**

```bash
rtk git add frontend/src/game/components/shared/PaperDollRenderer* && rtk git commit -m "feat: add shared PaperDollRenderer PixiJS component"
```

---

### Task 16: Attack animation system

**Files:**
- Create: `frontend/src/game/components/shared/AttackRenderer.tsx`
- Create: `frontend/src/game/components/shared/AttackRenderer.test.tsx`

- [ ] **Step 1: Write tests for each attack type visual**

Test melee_swing (arc), ranged_projectile (flying sprite), magic_cast (orb), elemental_projectile (colored + trail), aoe_burst (expanding ring).

- [ ] **Step 2: Implement AttackRenderer**

Renders attack visuals based on `attack_animation_type`. Handles:
- Melee: arc graphic with configurable angle, recoil
- Ranged/Magic/Elemental: projectile sprite that moves from source to target
- AoE: expanding ring with screen shake callback
- Impact effects (flash, splash, shatter)
- Damage number spawning

- [ ] **Step 3: Run tests**

Run: `cd frontend && rtk npx vitest run`

- [ ] **Step 4: Commit**

```bash
rtk git add frontend/src/game/components/shared/AttackRenderer* && rtk git commit -m "feat: add shared AttackRenderer for all attack visual types"
```

---

## Phase 5: Integration — Wire Renderers to Surfaces

### Task 17: Integrate into BottomAnimatedBanner

**Files:**
- Modify: `frontend/src/game/components/BottomAnimatedBanner.tsx`
- Modify: `frontend/src/game/components/BottomAnimatedBanner.test.tsx`

- [ ] **Step 1: Replace EnemySprite with EntityRenderer**

Remove the inline `EnemySprite` rendering. Import and use `EntityRenderer` with visual data from `/enemies/encountered`.

- [ ] **Step 2: Replace PlayerPaperDoll with PaperDollRenderer**

Remove inline `PlayerPaperDoll`. Import and use `PaperDollRenderer` with data from `/character/visuals`.

- [ ] **Step 3: Implement adaptive wave scaling**

Read banner game_configs. Calculate `max_enemies` from character level/DPS. Adjust spawn rate and death rate per config. Use `banner_enemies_per_level`, `banner_death_base_rate`, etc.

- [ ] **Step 4: Wire attack animations**

Use AttackRenderer for both player and enemy attacks. Player attack type from equipped weapon's `player_attack_animation`. Enemy attack type from `primary_attack_type_id`.

- [ ] **Step 5: Run tests**

Run: `cd frontend && rtk npx vitest run`

- [ ] **Step 6: Commit**

```bash
rtk git add frontend/src/game/components/BottomAnimatedBanner* && rtk git commit -m "feat: integrate EntityRenderer, PaperDollRenderer, AttackRenderer into banner with adaptive scaling"
```

---

### Task 18: Integrate into CombatStage

**Files:**
- Modify: `frontend/src/game/components/story/CombatStage.tsx`

- [ ] **Step 1: Replace inline enemy rendering with EntityRenderer**

Swap the existing procedural enemy graphics for `EntityRenderer` components using visual data.

- [ ] **Step 2: Replace player rendering with PaperDollRenderer**

- [ ] **Step 3: Wire attack animations to damage events**

Click damage → player attack animation. Auto-DPS → subtle auto attack visual. Enemy attacks → EntityRenderer attack state.

- [ ] **Step 4: Run frontend tests**

Run: `cd frontend && rtk npx vitest run`

- [ ] **Step 5: Commit**

```bash
rtk git add frontend/src/game/components/story/CombatStage.tsx && rtk git commit -m "feat: integrate shared renderers into CombatStage"
```

---

### Task 19: Integrate into BossStage

**Files:**
- Modify: `frontend/src/game/components/story/BossStage.tsx`

- [ ] **Step 1: Replace boss rendering with EntityRenderer (scaled up)**

Boss uses same EntityRenderer but with `size_class` overridden to huge + boss glow.

- [ ] **Step 2: Boss attack cycling**

Cycle through primary → secondary → tertiary attack types. Each uses AttackRenderer with appropriate visual.

- [ ] **Step 3: Run frontend tests and commit**

```bash
rtk git add frontend/src/game/components/story/BossStage.tsx && rtk git commit -m "feat: integrate shared renderers into BossStage with attack cycling"
```

---

### Task 20: Integrate into Idle Training (ActiveTrainingSimulator)

**Files:**
- Modify: `frontend/src/game/components/ActiveTrainingSimulator.tsx`

- [ ] **Step 1: Replace enemy/player rendering with shared renderers**

Same pattern as CombatStage. EntityRenderer for enemies, PaperDollRenderer for player.

- [ ] **Step 2: Run tests and commit**

```bash
cd frontend && rtk npx vitest run
rtk git add frontend/src/game/components/ActiveTrainingSimulator.tsx && rtk git commit -m "feat: integrate shared renderers into ActiveTrainingSimulator"
```

---

### Task 21: Update InventoryPanel with paper doll preview

**Files:**
- Modify: `frontend/src/game/components/InventoryPanel.tsx`
- Create: `frontend/src/game/components/InventoryPanel.test.tsx`

- [ ] **Step 1: Write tests for expanded inventory**

Test that all 16 gear slots render in the equipment grid. Test that PaperDollRenderer is rendered with equipped gear data. Test equip/unequip still works.

- [ ] **Step 2: Expand equipment grid to show all 16 gear slots**

Currently shows 3 active slots. Expand to render all 16 gear_slots sorted by sort_order.

- [ ] **Step 3: Add paper doll character preview**

Render PaperDollRenderer in the inventory panel showing current equipped gear visually.

- [ ] **Step 4: Run tests and commit**

```bash
cd frontend && rtk npx vitest run
rtk git add frontend/src/game/components/InventoryPanel* && rtk git commit -m "feat: expand inventory to 16 slots with paper doll preview"
```

---

## Phase 6: Visual Verification

### Task 22: Manual visual verification

- [ ] **Step 1: Set character to level 1, chapter 1**

Update character directly in DB. Open game. Verify banner shows 1-2 enemies, frequent deaths.

- [ ] **Step 2: Update character to level 20**

Verify 3-5 enemies, bronze aura, mixed types.

- [ ] **Step 3: Update to level 40**

Verify 5-6 enemies.

- [ ] **Step 4: Update to level 70**

Verify 6-8 enemies, flyers, silver aura.

- [ ] **Step 5: Update to level 90**

Verify 10-15 enemies, carnage, cyan aura.

- [ ] **Step 6: Test gear equipping**

Equip cloth → plate → divine armor. Verify paper doll updates across all surfaces. Equip sword, then staff, then bow — verify attack animation changes.

- [ ] **Step 7: Verify consistency across surfaces**

Same entity visuals in Banner, CombatStage, BossStage, Idle Training.

- [ ] **Step 8: Document results and commit any fixes**

---

## Phase 7: Generators (for later — data population)

### Task 23: Entity gameplay data generator

**Files:**
- Create: `tools/generate_entity_gameplay.py`

- [ ] **Step 1: Build CLI script**

Python script that reads all 3,936 entities, infers visual properties from entity_type + description + lore, and populates entity_gameplay_data with movement_type_id, size_class_id, animation_style_id, silhouette_type_id, colors, and attack type slots.

- [ ] **Step 2: Add --status, --remaining, --update, --preview modes**

- [ ] **Step 3: Add entity type → visual defaults mapping**

creature → ground/stalk/quadruped, manifestation → hover/pulse/orb, etc.

- [ ] **Step 4: Run on dev DB, verify population**

- [ ] **Step 5: Commit**

---

### Task 24: Entity family seeder

**Files:**
- Create: `tools/seed_entity_families.py`

- [ ] **Step 1: Define families** (wraiths, demons, beasts, elementals, undead, constructs, humanoids)
- [ ] **Step 2: Seed entity_families table**
- [ ] **Step 3: Commit**

---

### Task 25: Entity sprite generator

**Files:**
- Create: `tools/generate_entity_sprites.py`

- [ ] **Step 1: Generate asset_registry entries from silhouette + colors + size**
- [ ] **Step 2: Commit**

---

### Task 26: Item sprite generator

**Files:**
- Create: `tools/generate_item_sprites.py`

- [ ] **Step 1: Generate paper doll layer sprites for armor_class × gear_slot × rarity combos**
- [ ] **Step 2: Generate weapon sprites per weapon item_type_base**
- [ ] **Step 3: Generate inventory icons matching paper doll visuals**
- [ ] **Step 4: Commit**

---

### Task 27: Projectile sprite generator

**Files:**
- Create: `tools/generate_projectile_sprites.py`

- [ ] **Step 1: Generate projectile asset_registry entries per attack_type**
- [ ] **Step 2: Commit**

---

### Task 28: Finalize — NOT NULL constraints (Migration 069)

**Files:**
- Create: `db/069_visual_not_null_constraints.sql`

- [ ] **Step 1: After generators have populated all rows, add NOT NULL constraints**

```sql
ALTER TABLE entity_gameplay_data
    ALTER COLUMN movement_type_id SET NOT NULL,
    ALTER COLUMN size_class_id SET NOT NULL,
    ALTER COLUMN animation_style_id SET NOT NULL,
    ALTER COLUMN silhouette_type_id SET NOT NULL,
    ALTER COLUMN primary_attack_type_id SET NOT NULL;
```

- [ ] **Step 2: Migrate entity_attack_types → primary/secondary/tertiary**
- [ ] **Step 3: Drop entity_attack_types table**
- [ ] **Step 4: Apply and commit**

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | DB migrations (5 new tables, schema extensions, game_configs, data dictionary) |
| 2 | 7-11 | Backend models, routes, API contracts, item generator update |
| 3 | 12-13 | Admin editors (CRUD routes + frontend pages) |
| 4 | 14-16 | Shared renderers (EntityRenderer, PaperDollRenderer, AttackRenderer) |
| 5 | 17-21 | Integration (wire renderers to Banner, CombatStage, BossStage, Idle, Inventory) |
| 6 | 22 | Visual verification at each progression tier |
| 7 | 23-28 | Generators + final NOT NULL migration |

**Total: 28 tasks, ~65 steps**

Phases 1-5 are tonight's target. Phase 6 is verification. Phase 7 (generators) can follow in a subsequent session after data population strategy is confirmed.
