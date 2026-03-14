-- Migration 057: Backgrounds table, Scene Wave Configs, and schema adjustments for 5.2
-- Game Content Editor (Narrative & World Data)

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. New table: backgrounds
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE backgrounds (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    background_key  VARCHAR(100) NOT NULL UNIQUE,
    parallax_config JSONB DEFAULT '{}'::jsonb,
    time_of_day     VARCHAR(50),
    mood            VARCHAR(50),
    color_palette   JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_backgrounds_modtime
    BEFORE UPDATE ON backgrounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 2. New table: scene_wave_configs
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE scene_wave_configs (
    id                   SERIAL PRIMARY KEY,
    scene_id             INTEGER NOT NULL UNIQUE REFERENCES scenes(id) ON DELETE CASCADE,
    max_enemies_per_wave INTEGER NOT NULL DEFAULT 5,
    wave_count           INTEGER NOT NULL DEFAULT 10,
    spawn_interval_ms    INTEGER NOT NULL DEFAULT 2000,
    scaling_factor       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    hp_multiplier        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    gold_multiplier      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    entity_pool          JSONB NOT NULL DEFAULT '[]'::jsonb,
    boss_entity_id       INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scene_wave_configs_scene ON scene_wave_configs(scene_id);

CREATE TRIGGER update_scene_wave_configs_modtime
    BEFORE UPDATE ON scene_wave_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 3. Alter scene_gameplay_data: add background_id FK
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE scene_gameplay_data
    ADD COLUMN background_id INTEGER REFERENCES backgrounds(id) ON DELETE SET NULL;

-- Migrate existing background_sprite_key values
INSERT INTO backgrounds (name, background_key)
    SELECT DISTINCT
        background_sprite_key,
        background_sprite_key
    FROM scene_gameplay_data
    WHERE background_sprite_key IS NOT NULL
        AND background_sprite_key != ''
ON CONFLICT (background_key) DO NOTHING;

UPDATE scene_gameplay_data sgd
    SET background_id = b.id
    FROM backgrounds b
    WHERE sgd.background_sprite_key = b.background_key
        AND sgd.background_sprite_key IS NOT NULL
        AND sgd.background_sprite_key != '';

CREATE INDEX idx_scene_gameplay_data_background ON scene_gameplay_data(background_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. Alter locations: add description column (if not exists)
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'locations' AND column_name = 'description'
    ) THEN
        ALTER TABLE locations ADD COLUMN description TEXT;
    END IF;
END $$;

COMMIT;
