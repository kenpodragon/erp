-- Migration 030: Stat System Foundation (2.4.0)
-- Creates: idle_skill_stat_contributions, class_stat_affinities, character_stats, player_scene_records
-- Modifies: player_characters, chapters, books, game_configs, server_config, character_classes

-- §2.1 idle_skill_stat_contributions
CREATE TABLE IF NOT EXISTS idle_skill_stat_contributions (
    id              SERIAL PRIMARY KEY,
    idle_skill_id   INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    stat_id         INTEGER NOT NULL REFERENCES stat_definitions(id) ON DELETE CASCADE,
    coefficient     NUMERIC(6,4) NOT NULL DEFAULT 0.5,
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(idle_skill_id, stat_id)
);
CREATE TRIGGER update_idle_skill_stat_contributions_modtime
    BEFORE UPDATE ON idle_skill_stat_contributions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- §2.2 class_stat_affinities
CREATE TABLE IF NOT EXISTS class_stat_affinities (
    id                      SERIAL PRIMARY KEY,
    class_id                INTEGER NOT NULL REFERENCES character_classes(id) ON DELETE CASCADE,
    stat_id                 INTEGER NOT NULL REFERENCES stat_definitions(id) ON DELETE CASCADE,
    base_value              INTEGER NOT NULL DEFAULT 10,
    lore_weight             NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    level_bonus_per_level   NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, stat_id)
);
CREATE TRIGGER update_class_stat_affinities_modtime
    BEFORE UPDATE ON class_stat_affinities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- §2.3 character_stats (computed cache)
CREATE TABLE IF NOT EXISTS character_stats (
    id                  SERIAL PRIMARY KEY,
    character_id        INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    stat_id             INTEGER NOT NULL REFERENCES stat_definitions(id) ON DELETE CASCADE,
    computed_total      INTEGER NOT NULL DEFAULT 0,
    last_computed_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, stat_id)
);

-- §2.4 player_characters: add character_xp, deprecate old stat columns
ALTER TABLE player_characters
    ADD COLUMN IF NOT EXISTS character_xp BIGINT NOT NULL DEFAULT 0;
COMMENT ON COLUMN player_characters.strength     IS 'DEPRECATED in 2.4. Use character_stats table.';
COMMENT ON COLUMN player_characters.agility      IS 'DEPRECATED in 2.4. Use character_stats table.';
COMMENT ON COLUMN player_characters.intelligence IS 'DEPRECATED in 2.4. Use character_stats table.';

-- §2.5 chapters + books: level gates
ALTER TABLE chapters
    ADD COLUMN IF NOT EXISTS recommended_level INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS min_level         INTEGER DEFAULT NULL;
ALTER TABLE books
    ADD COLUMN IF NOT EXISTS recommended_level INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS min_level         INTEGER DEFAULT NULL;

-- §2.6 game_configs + server_config: metadata
ALTER TABLE game_configs
    ADD COLUMN IF NOT EXISTS category   VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS game_impact TEXT        DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_by INTEGER      REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE server_config
    ADD COLUMN IF NOT EXISTS game_impact TEXT DEFAULT NULL;

-- §2.7 character_classes: visual_config
ALTER TABLE character_classes
    ADD COLUMN IF NOT EXISTS visual_config JSONB DEFAULT NULL;
COMMENT ON COLUMN character_classes.visual_config IS 'JSONB: class visual identity config (colors, avatar, particles). Read at session start. Admin-editable.';

-- §2.8 player_scene_records
CREATE TABLE IF NOT EXISTS player_scene_records (
    id                      SERIAL PRIMARY KEY,
    player_id               INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scene_id                INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    best_wave               INTEGER NOT NULL DEFAULT 0,
    best_time_seconds       INTEGER DEFAULT NULL,
    total_enemies_killed    BIGINT NOT NULL DEFAULT 0,
    total_runs              INTEGER NOT NULL DEFAULT 0,
    first_completed_at      TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, scene_id)
);
CREATE TRIGGER update_player_scene_records_modtime
    BEFORE UPDATE ON player_scene_records
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_player_scene_records_player
    ON player_scene_records(player_id);
