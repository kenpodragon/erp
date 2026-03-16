-- Migration 058: Entity Type & Classification Management
-- Phase 5.3 — Normalizes entity_type and entity_family into lookup tables,
-- adds visual_behaviors system, extends attack_types with visual behavior
-- mapping and stat multipliers.

BEGIN;

-- =====================================================================
-- 1. Create entity_types lookup table
-- =====================================================================

CREATE TABLE entity_types (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(50)  NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description  TEXT,
    color_hex    VARCHAR(7),
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_entity_types_modtime
    BEFORE UPDATE ON entity_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed from existing distinct entity_type values
INSERT INTO entity_types (name, display_name, description, color_hex, sort_order) VALUES
    ('enemy',         'Enemy',         'Hostile combat entity',               '#FF4444', 1),
    ('creature',      'Creature',      'Living non-humanoid entity',          '#44AA44', 2),
    ('character',     'Character',     'Named humanoid or sentient entity',   '#4488FF', 3),
    ('manifestation', 'Manifestation', 'Ethereal or metaphysical entity',     '#AA44FF', 4),
    ('object',        'Object',        'Inanimate significant object',        '#AAAAAA', 5),
    ('group',         'Group',         'Collective or faction entity',        '#FFAA44', 6),
    ('environment',   'Environment',   'Environmental hazard or feature',     '#44AAAA', 7),
    ('event',         'Event',         'Narrative event or occurrence',       '#FF44AA', 8),
    ('other',         'Other',         'Uncategorized entity',                '#888888', 9);

-- =====================================================================
-- 2. Create entity_families lookup table
-- =====================================================================

CREATE TABLE entity_families (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(100) NOT NULL UNIQUE,
    display_name       VARCHAR(100) NOT NULL,
    description        TEXT,
    icon_key           VARCHAR(100),
    lore_reference     TEXT,
    base_stat_template JSONB,
    sort_order         INTEGER      NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_entity_families_modtime
    BEFORE UPDATE ON entity_families
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- No seed data — entity_family column is currently all NULL in production.

-- =====================================================================
-- 3. Create visual_behaviors table
-- =====================================================================

CREATE TABLE visual_behaviors (
    id               SERIAL PRIMARY KEY,
    name             VARCHAR(50)  NOT NULL UNIQUE,
    display_name     VARCHAR(100) NOT NULL,
    description      TEXT,
    animation_config JSONB        NOT NULL DEFAULT '{}'::jsonb,
    sort_order       INTEGER      NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_visual_behaviors_modtime
    BEFORE UPDATE ON visual_behaviors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO visual_behaviors (name, display_name, description, animation_config, sort_order) VALUES
    ('grounded_melee',  'Grounded Melee',  'Close-range ground-based combat',
     '{"y_offset": 0, "movement_pattern": "walk", "attack_animation": "melee_swing", "attack_vfx": "slash_arc", "idle_animation": "idle_bounce", "speed_modifier": 1.0}'::jsonb, 1),
    ('grounded_ranged', 'Grounded Ranged', 'Projectile-based ground combat',
     '{"y_offset": 0, "movement_pattern": "walk", "attack_animation": "projectile", "attack_vfx": null, "idle_animation": "idle_bounce", "speed_modifier": 0.9}'::jsonb, 2),
    ('airborne',        'Airborne',        'Floating or flying entities with elevated position',
     '{"y_offset": -20, "movement_pattern": "hover", "attack_animation": "dive_attack", "attack_vfx": "wind_gust", "idle_animation": "float", "speed_modifier": 0.8}'::jsonb, 3),
    ('magic_caster',    'Magic Caster',    'Spell-casting entities, stationary during attacks',
     '{"y_offset": 0, "movement_pattern": "stationary", "attack_animation": "spell_cast", "attack_vfx": "magic_burst", "idle_animation": "pulse", "speed_modifier": 0.7}'::jsonb, 4),
    ('hybrid',          'Hybrid',          'Default fallback for entities with mixed or unmapped attack types',
     '{"y_offset": 0, "movement_pattern": "walk", "attack_animation": "melee_swing", "attack_vfx": null, "idle_animation": "idle_bounce", "speed_modifier": 1.0}'::jsonb, 5);

-- =====================================================================
-- 4. Extend attack_types table
-- =====================================================================

ALTER TABLE attack_types
    ADD COLUMN visual_behavior_id INTEGER REFERENCES visual_behaviors(id) ON DELETE SET NULL,
    ADD COLUMN stat_multipliers   JSONB;

-- Map attack types to visual behaviors
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'grounded_melee')  WHERE name = 'melee';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'grounded_ranged') WHERE name = 'ranged';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'grounded_ranged') WHERE name = 'resonance';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'airborne')        WHERE name = 'aerial';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'magic_caster')    WHERE name = 'akashic';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'magic_caster')    WHERE name = 'psychic';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'magic_caster')    WHERE name = 'void';
UPDATE attack_types SET visual_behavior_id = (SELECT id FROM visual_behaviors WHERE name = 'hybrid')          WHERE name IN ('nanite', 'phase', 'construct', 'thermal', 'gravitic', 'corruption');

-- =====================================================================
-- 5. Migrate entities columns: VARCHAR → FK
-- =====================================================================

-- Add new FK columns
ALTER TABLE entities
    ADD COLUMN entity_type_id   INTEGER REFERENCES entity_types(id) ON DELETE RESTRICT,
    ADD COLUMN entity_family_id INTEGER REFERENCES entity_families(id) ON DELETE SET NULL;

-- Populate entity_type_id from existing entity_type string
UPDATE entities e
SET entity_type_id = et.id
FROM entity_types et
WHERE e.entity_type = et.name;

-- Fallback: set any unmatched entities to 'other'
UPDATE entities
SET entity_type_id = (SELECT id FROM entity_types WHERE name = 'other')
WHERE entity_type_id IS NULL;

-- Make entity_type_id NOT NULL
ALTER TABLE entities
    ALTER COLUMN entity_type_id SET NOT NULL;

-- Drop old columns (clean break)
ALTER TABLE entities DROP COLUMN entity_type;
ALTER TABLE entities DROP COLUMN entity_family;

-- Add indexes on new FK columns
CREATE INDEX idx_entities_entity_type_id   ON entities(entity_type_id);
CREATE INDEX idx_entities_entity_family_id ON entities(entity_family_id);

COMMIT;
