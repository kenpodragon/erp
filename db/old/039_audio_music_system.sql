-- Migration 039: Audio & Music System (REC 2.5)
-- Creates atmospheres + audio_configs tables, adds FK columns, seeds archetypes + SFX presets.

BEGIN;

-- ============================================================
-- 1. Create atmospheres table
-- ============================================================
CREATE TABLE IF NOT EXISTS atmospheres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    archetype VARCHAR(100),
    description TEXT,

    -- Web Audio API synthesis definitions (one per music state)
    music_definitions JSONB DEFAULT '{
        "explore": null,
        "combat": null,
        "boss": null,
        "mystery": null
    }',

    -- Generator parameters (for reproducible regeneration via CLI tool)
    generator_bpm INTEGER DEFAULT 120,
    generator_key VARCHAR(10) DEFAULT 'C',
    generator_scale VARCHAR(50) DEFAULT 'minor',
    generator_complexity INTEGER DEFAULT 5,
    generator_seed INTEGER,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_atmospheres_modtime
    BEFORE UPDATE ON atmospheres
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 2. Create audio_configs table
-- ============================================================
CREATE TABLE IF NOT EXISTS audio_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'sfx',
    display_name VARCHAR(100),

    preset_definition JSONB NOT NULL DEFAULT '{}',

    base_volume FLOAT DEFAULT 1.0,
    pitch_variation FLOAT DEFAULT 0.0,
    spatial_enabled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_audio_configs_modtime
    BEFORE UPDATE ON audio_configs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================
-- 3. Add atmosphere FK to books, chapters, scene_gameplay_data
-- ============================================================
ALTER TABLE books
    ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;

ALTER TABLE chapters
    ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;

ALTER TABLE scene_gameplay_data
    ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Add boss theme + death SFX to entity_gameplay_data
-- ============================================================
ALTER TABLE entity_gameplay_data
    ADD COLUMN IF NOT EXISTS unique_boss_theme_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;

ALTER TABLE entity_gameplay_data
    ADD COLUMN IF NOT EXISTS death_sfx_key VARCHAR(100);

-- ============================================================
-- 5. Add activation SFX to skills
-- ============================================================
ALTER TABLE skills
    ADD COLUMN IF NOT EXISTS activate_sfx_key VARCHAR(100);

-- ============================================================
-- 6. Add master volume + mute to player_settings
-- ============================================================
ALTER TABLE player_settings
    ADD COLUMN IF NOT EXISTS master_volume SMALLINT DEFAULT 80;

ALTER TABLE player_settings
    ADD COLUMN IF NOT EXISTS master_muted BOOLEAN DEFAULT FALSE;

-- Add check constraint separately (IF NOT EXISTS not supported for constraints in all PG versions)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'player_settings_master_volume_check'
    ) THEN
        ALTER TABLE player_settings
            ADD CONSTRAINT player_settings_master_volume_check
            CHECK (master_volume BETWEEN 0 AND 100);
    END IF;
END $$;

-- ============================================================
-- 7. Add archetype FK to locations
-- ============================================================
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS archetype_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;

-- ============================================================
-- 8. Data migration: map audio_enabled -> master_muted
-- ============================================================
UPDATE player_settings SET master_muted = NOT audio_enabled WHERE audio_enabled = FALSE AND master_muted = FALSE;

-- ============================================================
-- 9. Seed atmosphere archetypes (13 + 3 Training Grounds variations = 16 rows)
-- ============================================================
INSERT INTO atmospheres (name, archetype, description, generator_bpm, generator_key, generator_scale, generator_complexity)
VALUES
    ('Mundane Dread',       'mundane_dread',       'Etheris surface — uncanny normalcy, fluorescent hum, detuned dissonance',     100, 'C',  'major',      4),
    ('Occult Sanctum',      'occult_sanctum',      'Ancient power sites — candle tremolo, minor arpeggios, reverb-heavy',         90,  'Am', 'minor',      5),
    ('Liminal Purgatory',   'liminal_purgatory',   'Between-spaces — sparse echoing pulses, institutional silence',               70,  'Dm', 'dorian',     3),
    ('Body Horror Theatre', 'body_horror_theatre', 'Sensual dread — chromatic runs, pitch bends, irregular time',                110, 'E',  'chromatic',  7),
    ('Ancient Sanctuary',   'ancient_sanctuary',   'Deep peace with hidden power — warm triangles, pentatonic, no drums',         60,  'G',  'pentatonic', 2),
    ('Cosmic Archive',      'cosmic_archive',      'Information as sound — layered arpeggios, shimmering high frequencies',       120, 'F',  'lydian',     8),
    ('Tech Utopia',         'tech_utopia',         'Clean sci-fi — pulse waves, major progressions, hopeful but sterile',         115, 'C',  'major',      5),
    ('Alien Frontier',      'alien_frontier',      'Beautiful but wrong — whole-tone scales, organic percussion, 3-beat feel',    100, 'D',  'whole_tone', 6),
    ('Void Abyss',          'void_abyss',          'Lovecraftian impossibility — sub-bass drones, noise, descending chromatics',  50,  'E',  'chromatic',  9),
    ('Domestic Trauma',     'domestic_trauma',     'Distorted lullabies, irregular heartbeat, silence gaps',                      80,  'Am', 'minor',      4),
    ('Glitch Reality',      'glitch_reality',      'Digital decay — bit-crushed melodies, stutter loops, pitch jumps',            130, 'C',  'chromatic',  7),
    ('Conspiracy Bunker',   'conspiracy_bunker',   'Paranoid arpeggios, staccato bass, radio-static interludes',                  95,  'Bm', 'minor',      5),
    ('Training Grounds',    'training_grounds',    'Disciplined repetition — steady pulse-wave grooves, metronomic percussion',  110, 'Am', 'minor',      5)
ON CONFLICT (name) DO NOTHING;

-- Training Grounds variations
INSERT INTO atmospheres (name, archetype, description, generator_bpm, generator_key, generator_scale, generator_complexity, generator_seed)
VALUES
    ('Training Grounds (Var 2)', 'training_grounds', 'Training variation — slightly different groove', 115, 'Em', 'minor', 5, 2001),
    ('Training Grounds (Var 3)', 'training_grounds', 'Training variation — uptempo pulse', 120, 'Dm', 'dorian', 6, 2002),
    ('Training Grounds (Var 4)', 'training_grounds', 'Training variation — heavy bass focus', 105, 'Am', 'minor', 4, 2003)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 10. Seed core SFX presets (11 rows)
-- ============================================================
INSERT INTO audio_configs (config_key, category, display_name, preset_definition, base_volume, pitch_variation, spatial_enabled)
VALUES
    ('sfx_click',            'combat',      'Player Click',        '{"oscillator_type":"square","frequency_start":660,"frequency_end":440,"duration_ms":80,"attack_ms":2,"decay_ms":30,"sustain_level":0.2,"release_ms":48,"noise_mix":0.05}', 0.6, 0.08, true),
    ('sfx_crit',             'combat',      'Critical Hit',        '{"oscillator_type":"square","frequency_start":1200,"frequency_end":600,"duration_ms":150,"attack_ms":2,"decay_ms":50,"sustain_level":0.4,"release_ms":98,"noise_mix":0.15}', 0.8, 0.05, true),
    ('sfx_enemy_death',      'combat',      'Enemy Death',         '{"oscillator_type":"sawtooth","frequency_start":440,"frequency_end":110,"duration_ms":200,"attack_ms":5,"decay_ms":80,"sustain_level":0.1,"release_ms":115,"noise_mix":0.3}', 0.7, 0.1, true),
    ('sfx_skill_activate',   'combat',      'Skill Activation',    '[{"oscillator_type":"square","frequency_start":440,"frequency_end":440,"duration_ms":60,"attack_ms":2,"decay_ms":20,"sustain_level":0.5,"release_ms":38},{"oscillator_type":"square","frequency_start":554,"frequency_end":554,"duration_ms":60},{"oscillator_type":"square","frequency_start":660,"frequency_end":660,"duration_ms":80}]', 0.7, 0.0, true),
    ('sfx_level_up',         'progression', 'Level Up',            '[{"oscillator_type":"square","frequency_start":523,"frequency_end":523,"duration_ms":100},{"oscillator_type":"square","frequency_start":659,"frequency_end":659,"duration_ms":100},{"oscillator_type":"square","frequency_start":784,"frequency_end":784,"duration_ms":100},{"oscillator_type":"square","frequency_start":1047,"frequency_end":1047,"duration_ms":300}]', 0.8, 0.0, false),
    ('sfx_item_drop',        'progression', 'Item Drop',           '{"oscillator_type":"triangle","frequency_start":880,"frequency_end":1760,"duration_ms":200,"attack_ms":5,"decay_ms":50,"sustain_level":0.3,"release_ms":145,"noise_mix":0.0}', 0.7, 0.0, false),
    ('sfx_achievement',      'progression', 'Achievement',         '[{"oscillator_type":"square","frequency_start":523,"frequency_end":523,"duration_ms":150},{"oscillator_type":"square","frequency_start":659,"frequency_end":659,"duration_ms":150},{"oscillator_type":"square","frequency_start":784,"frequency_end":784,"duration_ms":150},{"oscillator_type":"square","frequency_start":1047,"frequency_end":1047,"duration_ms":400,"attack_ms":5,"decay_ms":100,"sustain_level":0.6,"release_ms":295}]', 0.9, 0.0, false),
    ('sfx_ui_click',         'ui',          'UI Click',            '{"oscillator_type":"sine","frequency_start":1000,"frequency_end":800,"duration_ms":40,"attack_ms":1,"decay_ms":15,"sustain_level":0.1,"release_ms":24,"noise_mix":0.0}', 0.3, 0.0, false),
    ('sfx_ui_nav',           'ui',          'UI Navigate',         '{"oscillator_type":"sine","frequency_start":600,"frequency_end":800,"duration_ms":50,"attack_ms":2,"decay_ms":20,"sustain_level":0.1,"release_ms":28,"noise_mix":0.0}', 0.25, 0.0, false),
    ('sfx_boss_defeat',      'combat',      'Boss Defeat Fanfare', '[{"oscillator_type":"square","frequency_start":392,"frequency_end":392,"duration_ms":200},{"oscillator_type":"square","frequency_start":523,"frequency_end":523,"duration_ms":200},{"oscillator_type":"square","frequency_start":659,"frequency_end":659,"duration_ms":200},{"oscillator_type":"square","frequency_start":784,"frequency_end":784,"duration_ms":400},{"oscillator_type":"triangle","frequency_start":784,"frequency_end":784,"duration_ms":600,"attack_ms":10,"decay_ms":200,"sustain_level":0.4,"release_ms":390}]', 1.0, 0.0, false),
    ('sfx_chapter_complete', 'progression', 'Chapter Complete',    '[{"oscillator_type":"square","frequency_start":523,"frequency_end":523,"duration_ms":200},{"oscillator_type":"square","frequency_start":659,"frequency_end":659,"duration_ms":200},{"oscillator_type":"square","frequency_start":784,"frequency_end":784,"duration_ms":300},{"oscillator_type":"triangle","frequency_start":1047,"frequency_end":1047,"duration_ms":500,"attack_ms":10,"decay_ms":150,"sustain_level":0.5,"release_ms":340}]', 1.0, 0.0, false)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- 11. Seed book-level atmosphere assignments
-- ============================================================
UPDATE books SET atmosphere_id = (SELECT id FROM atmospheres WHERE archetype = 'mundane_dread' LIMIT 1)   WHERE id = 1;
UPDATE books SET atmosphere_id = (SELECT id FROM atmospheres WHERE archetype = 'domestic_trauma' LIMIT 1)  WHERE id = 2;
UPDATE books SET atmosphere_id = (SELECT id FROM atmospheres WHERE archetype = 'cosmic_archive' LIMIT 1)   WHERE id = 3;

COMMIT;
