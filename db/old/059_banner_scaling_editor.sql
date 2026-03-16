-- Migration 059: Banner & Scaling Editor
-- Phase 5.4 — Adds stat_weights to visual_behaviors, creates wave_presets
-- with assignment chain, difficulty_curves with multi-dimension multipliers,
-- difficulty_presets for A/B testing, and global wave default game_configs.

BEGIN;

-- =====================================================================
-- 1. Extend visual_behaviors with stat_weights
-- =====================================================================

ALTER TABLE visual_behaviors
    ADD COLUMN stat_weights JSONB;

UPDATE visual_behaviors SET stat_weights = '{
  "size": {"strength": 0.6, "agility": 0.2, "intelligence": 0.2},
  "speed": {"strength": 0.2, "agility": 0.6, "intelligence": 0.2},
  "vfx_intensity": {"strength": 0.3, "agility": 0.3, "intelligence": 0.4},
  "clamps": {"size": [0.5, 2.5], "speed": [0.3, 1.5], "vfx_intensity": [0.0, 1.0]}
}'::jsonb WHERE name = 'grounded_melee';

UPDATE visual_behaviors SET stat_weights = '{
  "size": {"strength": 0.3, "agility": 0.4, "intelligence": 0.3},
  "speed": {"strength": 0.1, "agility": 0.7, "intelligence": 0.2},
  "vfx_intensity": {"strength": 0.2, "agility": 0.2, "intelligence": 0.6},
  "clamps": {"size": [0.5, 2.0], "speed": [0.3, 1.5], "vfx_intensity": [0.0, 1.0]}
}'::jsonb WHERE name = 'grounded_ranged';

UPDATE visual_behaviors SET stat_weights = '{
  "size": {"strength": 0.2, "agility": 0.5, "intelligence": 0.3},
  "speed": {"strength": 0.1, "agility": 0.7, "intelligence": 0.2},
  "vfx_intensity": {"strength": 0.1, "agility": 0.3, "intelligence": 0.6},
  "clamps": {"size": [0.5, 2.0], "speed": [0.4, 1.8], "vfx_intensity": [0.0, 1.0]}
}'::jsonb WHERE name = 'airborne';

UPDATE visual_behaviors SET stat_weights = '{
  "size": {"strength": 0.2, "agility": 0.2, "intelligence": 0.6},
  "speed": {"strength": 0.1, "agility": 0.3, "intelligence": 0.6},
  "vfx_intensity": {"strength": 0.05, "agility": 0.1, "intelligence": 0.85},
  "clamps": {"size": [0.5, 1.8], "speed": [0.3, 1.2], "vfx_intensity": [0.0, 1.0]}
}'::jsonb WHERE name = 'magic_caster';

UPDATE visual_behaviors SET stat_weights = '{
  "size": {"strength": 0.34, "agility": 0.33, "intelligence": 0.33},
  "speed": {"strength": 0.34, "agility": 0.33, "intelligence": 0.33},
  "vfx_intensity": {"strength": 0.34, "agility": 0.33, "intelligence": 0.33},
  "clamps": {"size": [0.5, 2.5], "speed": [0.3, 1.5], "vfx_intensity": [0.0, 1.0]}
}'::jsonb WHERE name = 'hybrid';

-- =====================================================================
-- 2. Create wave_presets table
-- =====================================================================

CREATE TABLE wave_presets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    config      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_wave_presets_modtime
    BEFORE UPDATE ON wave_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO wave_presets (name, description, config, is_default, sort_order) VALUES
    ('Standard', 'Default wave configuration matching hardcoded fallback values', '{
      "max_enemies_per_wave": 5,
      "wave_count": 10,
      "spawn_interval_ms": 2000,
      "scaling_factor": 1.0,
      "hp_multiplier": 1.0,
      "gold_multiplier": 1.0,
      "spawn_pattern": "uniform"
    }'::jsonb, TRUE, 1);

-- =====================================================================
-- 3. Create wave_preset_assignments table
-- =====================================================================

CREATE TABLE wave_preset_assignments (
    id             SERIAL PRIMARY KEY,
    wave_preset_id INTEGER      NOT NULL REFERENCES wave_presets(id) ON DELETE CASCADE,
    book_id        INTEGER               REFERENCES books(id) ON DELETE CASCADE,
    chapter_id     INTEGER               REFERENCES chapters(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT wpa_exactly_one_target CHECK (
        (book_id IS NOT NULL AND chapter_id IS NULL) OR
        (book_id IS NULL AND chapter_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX idx_wpa_unique_book ON wave_preset_assignments(book_id) WHERE book_id IS NOT NULL;
CREATE UNIQUE INDEX idx_wpa_unique_chapter ON wave_preset_assignments(chapter_id) WHERE chapter_id IS NOT NULL;
CREATE INDEX idx_wpa_wave_preset_id ON wave_preset_assignments(wave_preset_id);

CREATE TRIGGER update_wave_preset_assignments_modtime
    BEFORE UPDATE ON wave_preset_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 4. Create difficulty_curves table
-- =====================================================================

CREATE TABLE difficulty_curves (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    curve_data  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_difficulty_curves_modtime
    BEFORE UPDATE ON difficulty_curves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO difficulty_curves (name, description, curve_data, is_default, sort_order) VALUES
    ('Standard Ramp', 'Gentle 10-chapter difficulty increase', '{
      "1":  {"hp": 1.0,  "gold": 1.0,  "wave_density": 1.0,  "spawn_speed": 1.0},
      "2":  {"hp": 1.1,  "gold": 1.05, "wave_density": 1.05, "spawn_speed": 1.0},
      "3":  {"hp": 1.2,  "gold": 1.1,  "wave_density": 1.1,  "spawn_speed": 0.98},
      "4":  {"hp": 1.35, "gold": 1.15, "wave_density": 1.15, "spawn_speed": 0.96},
      "5":  {"hp": 1.5,  "gold": 1.2,  "wave_density": 1.2,  "spawn_speed": 0.94},
      "6":  {"hp": 1.7,  "gold": 1.25, "wave_density": 1.25, "spawn_speed": 0.92},
      "7":  {"hp": 1.95, "gold": 1.3,  "wave_density": 1.3,  "spawn_speed": 0.90},
      "8":  {"hp": 2.2,  "gold": 1.35, "wave_density": 1.35, "spawn_speed": 0.88},
      "9":  {"hp": 2.5,  "gold": 1.4,  "wave_density": 1.4,  "spawn_speed": 0.86},
      "10": {"hp": 2.85, "gold": 1.45, "wave_density": 1.45, "spawn_speed": 0.84}
    }'::jsonb, TRUE, 1);

-- =====================================================================
-- 5. Add difficulty_curve_id FK to books
-- =====================================================================

ALTER TABLE books
    ADD COLUMN difficulty_curve_id INTEGER REFERENCES difficulty_curves(id) ON DELETE SET NULL;

-- =====================================================================
-- 6. Create difficulty_presets table
-- =====================================================================

CREATE TABLE difficulty_presets (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL UNIQUE,
    description         TEXT,
    difficulty_curve_id INTEGER               REFERENCES difficulty_curves(id) ON DELETE SET NULL,
    wave_preset_id      INTEGER               REFERENCES wave_presets(id) ON DELETE SET NULL,
    config_snapshot     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_active           BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_difficulty_presets_modtime
    BEFORE UPDATE ON difficulty_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- 7. Add global wave default game_configs
-- =====================================================================

INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
    ('wave_default_max_enemies', '5', 'Default max enemies per wave when no scene/chapter/book config exists', 'waves', 'Controls baseline enemy density for unconfigured scenes'),
    ('wave_default_wave_count', '10', 'Default number of waves per scene when no config exists', 'waves', 'Controls baseline wave count for unconfigured scenes'),
    ('wave_default_spawn_interval_ms', '2000', 'Default spawn interval in milliseconds when no config exists', 'waves', 'Controls baseline enemy spawn timing for unconfigured scenes'),
    ('wave_default_spawn_pattern', '"uniform"', 'Default spawn pattern when no config exists. Values: uniform, front_loaded, crescendo, random', 'waves', 'Controls baseline enemy distribution pattern for unconfigured scenes');

COMMIT;
