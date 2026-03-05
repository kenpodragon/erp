-- =============================================================================
-- 001_init_db_tables.sql
-- Consolidated database schema for Towers of Elysium
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Alias for update_updated_at_column used in some migrations
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 1. Narrative Hierarchy
-- =============================================================================

CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    book_number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    transition_lore_text TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_books_modtime
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'not_started',
    transition_lore_text TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, chapter_number)
);

CREATE TRIGGER update_chapters_modtime
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    location_type VARCHAR(50),
    base_visual TEXT,
    base_auditory TEXT,
    base_olfactory TEXT,
    base_tactile TEXT,
    base_atmosphere TEXT,
    first_appearance_scene_id INTEGER, -- Deferred FK
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_locations_modtime
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS scenes (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    title VARCHAR(255),
    summary TEXT,
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    primary_location_id INTEGER REFERENCES locations(id),
    has_hard_break BOOLEAN DEFAULT FALSE,
    scene_type TEXT NOT NULL DEFAULT 'normal', -- normal | chapter_boss | book_boss
    boss_config JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, scene_number)
);

CREATE TRIGGER update_scenes_modtime
    BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Deferred FK for locations
ALTER TABLE locations
    ADD CONSTRAINT fk_locations_first_appearance_scene
    FOREIGN KEY (first_appearance_scene_id) REFERENCES scenes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS story_beats (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    beat_number INTEGER NOT NULL,
    summary VARCHAR(500),
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    intensity SMALLINT CHECK (intensity BETWEEN 1 AND 5),
    pacing VARCHAR(50),
    timeline_context VARCHAR(50) CHECK (timeline_context IN ('present', 'flashback', 'dream', 'vision', 'future')),
    content_image_path VARCHAR(255) DEFAULT NULL,
    audio_path VARCHAR(255) DEFAULT NULL,
    audio_duration_seconds INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id, beat_number)
);

CREATE TRIGGER update_story_beats_modtime
    BEFORE UPDATE ON story_beats
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 2. Entities (Characters, Enemies, Neutral Figures)
-- =============================================================================

CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    base_description TEXT,
    base_emotional_state TEXT,
    base_sounds TEXT,
    base_smells TEXT,
    base_equipment TEXT,
    base_abilities TEXT,
    boss_text_references TEXT,
    boss_action_quote TEXT,
    boss_variant_differences TEXT,
    first_appearance_scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_entities_modtime
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS entity_aliases (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    context TEXT,
    UNIQUE(entity_id, alias)
);

CREATE TABLE IF NOT EXISTS entity_scene_appearances (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_present BOOLEAN DEFAULT TRUE,
    description_delta TEXT,
    emotional_state_delta TEXT,
    equipment_delta TEXT,
    exit_reason VARCHAR(255),
    entry_context TEXT,
    relationships TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, scene_id)
);

CREATE TRIGGER update_entity_scene_appearances_modtime
    BEFORE UPDATE ON entity_scene_appearances
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS entity_beat_appearances (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    story_beat_id INTEGER NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    beat_context TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, story_beat_id)
);

-- =============================================================================
-- 3. Location Extras
-- =============================================================================

CREATE TABLE IF NOT EXISTS location_aliases (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    context TEXT,
    UNIQUE(location_id, alias)
);

CREATE TABLE IF NOT EXISTS location_scene_appearances (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    visual_delta TEXT,
    auditory_delta TEXT,
    olfactory_delta TEXT,
    tactile_delta TEXT,
    atmosphere_delta TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, scene_id)
);

CREATE TRIGGER update_location_scene_appearances_modtime
    BEFORE UPDATE ON location_scene_appearances
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 4. Semantic Tags & Processing
-- =============================================================================

CREATE TABLE IF NOT EXISTS semantic_tags (
    id SERIAL PRIMARY KEY,
    story_beat_id INTEGER NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    value VARCHAR(100) NOT NULL,
    canonical_value VARCHAR(100),
    notes TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_semantic_tags_modtime
    BEFORE UPDATE ON semantic_tags
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS processing_runs (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running',
    last_completed_chapter_id INTEGER REFERENCES chapters(id),
    claude_tokens_used BIGINT DEFAULT 0,
    gemini_tokens_used BIGINT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    suggested_action TEXT,
    affected_entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    affected_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    affected_scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    affected_beat_id INTEGER REFERENCES story_beats(id) ON DELETE SET NULL,
    review_status VARCHAR(50) DEFAULT 'pending_review',
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_review_items_modtime
    BEFORE UPDATE ON review_items
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 5. Players & Profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    google_display_name VARCHAR(255),
    google_avatar_url TEXT,
    alias VARCHAR(20),
    custom_avatar_url TEXT,
    avatar_preset_key VARCHAR(50),
    terms_accepted_at TIMESTAMPTZ,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    banned_by VARCHAR(255),
    ban_reason TEXT,
    sessions_invalid_before TIMESTAMPTZ,
    is_owner BOOLEAN DEFAULT FALSE,
    is_system_admin BOOLEAN DEFAULT FALSE,
    is_game_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_alias ON players(LOWER(alias)) WHERE alias IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_roles ON players (is_owner, is_system_admin, is_game_admin);

CREATE TRIGGER update_players_modtime
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS player_settings (
    id SERIAL PRIMARY KEY,
    player_id INTEGER UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    audio_enabled BOOLEAN DEFAULT TRUE,
    music_volume SMALLINT DEFAULT 80 CHECK (music_volume BETWEEN 0 AND 100),
    sfx_volume SMALLINT DEFAULT 80 CHECK (sfx_volume BETWEEN 0 AND 100),
    narration_speed NUMERIC(2,1) DEFAULT 1.0 CHECK (narration_speed BETWEEN 0.5 AND 2.0),
    narration_wpm INTEGER DEFAULT 200,
    narration_font_size INTEGER DEFAULT 14,
    narration_block_height INTEGER DEFAULT 50,
    ui_scale FLOAT DEFAULT 1.0,
    game_text_scale FLOAT DEFAULT 1.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_player_settings_modtime
    BEFORE UPDATE ON player_settings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 6. Character Classes & Characters
-- =============================================================================

CREATE TABLE IF NOT EXISTS character_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    lore_blurb TEXT,
    base_strength INTEGER DEFAULT 10,
    base_agility INTEGER DEFAULT 10,
    base_intelligence INTEGER DEFAULT 10,
    sprite_key VARCHAR(100),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_character_classes_modtime
    BEFORE UPDATE ON character_classes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS player_characters (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES character_classes(id) ON DELETE RESTRICT,
    character_name VARCHAR(20) NOT NULL,
    level INTEGER DEFAULT 1,
    strength INTEGER,
    agility INTEGER,
    intelligence INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_played_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_characters_name ON player_characters(LOWER(character_name));

CREATE TRIGGER update_player_characters_modtime
    BEFORE UPDATE ON player_characters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 7. Support System
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    category VARCHAR(50) CHECK (category IN ('bug_report','account_issue','payment_issue','feedback','other')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
    subject VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    assigned_admin VARCHAR(255),
    player_last_viewed_at TIMESTAMPTZ,
    admin_last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE TRIGGER update_support_tickets_modtime
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS support_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    author_type VARCHAR(10) CHECK (author_type IN ('player','admin')),
    author_id INTEGER, -- References players.id if author_type is 'player'
    author_email VARCHAR(255), -- Email of admin if author_type is 'admin'
    content TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    reply_id INTEGER REFERENCES support_replies(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INTEGER REFERENCES players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. Configuration & Admin Controls
-- =============================================================================

CREATE TABLE IF NOT EXISTS server_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    value_type VARCHAR(20) CHECK (value_type IN ('string','integer','numeric','boolean','text')),
    category VARCHAR(50) CHECK (category IN ('game','ops')),
    description TEXT,
    default_value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255)
);

CREATE TRIGGER update_server_config_modtime
    BEFORE UPDATE ON server_config
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS game_configs (
    key VARCHAR(100) PRIMARY KEY,
    value_json JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_game_configs_modtime 
    BEFORE UPDATE ON game_configs 
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TABLE IF NOT EXISTS admin_whitelist_emails (
    email VARCHAR(255) PRIMARY KEY,
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_whitelist_ips (
    ip_address VARCHAR(45) PRIMARY KEY,
    note VARCHAR(255),
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 9. Activity & Audit
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_events (
    id BIGSERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dev_content_audit (
    id SERIAL PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL,      -- 'missing_sprite', 'missing_stat', 'missing_entity'
    entity_type VARCHAR(50),              -- 'enemy', 'location', 'scene'
    entity_id INTEGER,
    entity_name VARCHAR(255),
    missing_field VARCHAR(100),           -- e.g. 'base_hp', 'sprite_key'
    scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    zone_level INTEGER,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- 10. Player Game State & Meta
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_progress (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    character_id    INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    book_number     INTEGER NOT NULL DEFAULT 1,
    chapter_number  INTEGER NOT NULL DEFAULT 1,
    scene_number    INTEGER NOT NULL DEFAULT 1,
    beat_number     INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (character_id)
);

CREATE TABLE IF NOT EXISTS player_essence (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    character_id    INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    current_balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
    passive_rate    NUMERIC(20, 4) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (character_id)
);

CREATE TABLE IF NOT EXISTS player_meta_progression (
    player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    elysium_essence NUMERIC DEFAULT 0,
    total_essence_earned NUMERIC DEFAULT 0,
    spent_essence NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_player_meta_progression_modtime 
    BEFORE UPDATE ON player_meta_progression 
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- =============================================================================
-- 11. Gameplay Systems (Story Mode)
-- =============================================================================

CREATE TABLE IF NOT EXISTS scene_gameplay_data (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    required_time_seconds INTEGER NOT NULL DEFAULT 300,
    background_sprite_key VARCHAR(100),
    is_boss_scene BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id)
);

CREATE TRIGGER update_scene_gameplay_data_modtime
    BEFORE UPDATE ON scene_gameplay_data
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS entity_gameplay_data (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    sprite_key VARCHAR(100),
    base_hp BIGINT DEFAULT 0,
    base_gold BIGINT DEFAULT 0,
    appearance_rate FLOAT DEFAULT 1.0, 
    stat_block JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id)
);

CREATE TRIGGER update_entity_gameplay_data_modtime
    BEFORE UPDATE ON entity_gameplay_data
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS player_story_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(id),
    chapter_id INTEGER,
    current_zone INT DEFAULT 1,
    current_wave INT DEFAULT 1,
    session_gold NUMERIC DEFAULT 0,
    dark_ritual_multiplier NUMERIC DEFAULT 1.0,
    audio_progress_pct NUMERIC DEFAULT 0,
    narrative_progress_pct NUMERIC DEFAULT 0,
    required_waves_finished BOOLEAN DEFAULT FALSE,
    audio_finished BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_player_story_sessions_modtime 
    BEFORE UPDATE ON player_story_sessions 
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

CREATE TABLE IF NOT EXISTS session_upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES player_story_sessions(id) ON DELETE CASCADE,
    upgrade_type VARCHAR(50) NOT NULL, -- 'click_dmg', 'auto_dps', 'skill_unlock', 'skill_level'
    target_id INTEGER,
    level INT DEFAULT 0,
    total_cost_paid NUMERIC DEFAULT 0,
    current_multiplier NUMERIC DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS boss_completions (
    id           SERIAL PRIMARY KEY,
    player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scene_id     INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    boss_type    TEXT NOT NULL CHECK (boss_type IN ('chapter_boss', 'book_boss')),
    chapter_id   INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    book_id      INTEGER REFERENCES books(id) ON DELETE SET NULL,
    session_id   TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_boss_completion ON boss_completions(player_id, scene_id);

CREATE TABLE IF NOT EXISTS scene_audio_sync (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL,
    asset_key VARCHAR(255) NOT NULL,
    paragraph_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id, timestamp_seconds)
);

-- =============================================================================
-- 12. Skills & Training
-- =============================================================================

CREATE TABLE IF NOT EXISTS stat_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    value_type VARCHAR(50) NOT NULL,
    min_value NUMERIC,
    max_value NUMERIC,
    description TEXT,
    category VARCHAR(50), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS benefit_effect_data (
    id SERIAL PRIMARY KEY,
    effect_key VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    value_type VARCHAR(50) NOT NULL,
    min_value NUMERIC,
    max_value NUMERIC,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    benefits_json JSONB DEFAULT '{}',
    xp_curve_type VARCHAR(50) DEFAULT 'standard',
    cooldown_type VARCHAR(20) DEFAULT 'individual',
    base_cooldown_seconds INTEGER DEFAULT 30,
    base_cost_gold NUMERIC DEFAULT 100,
    cost_scaling_factor NUMERIC DEFAULT 1.15,
    unlock_scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    unlock_display_text TEXT,
    idle_flavor_title VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_skills_modtime
    BEFORE UPDATE ON skills
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE IF NOT EXISTS skill_actions (
    id                  SERIAL PRIMARY KEY,
    skill_id            INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    display_name        VARCHAR(150) NOT NULL,
    lore_description    TEXT NOT NULL,
    level_required      INTEGER NOT NULL DEFAULT 1,
    interval_ms         INTEGER NOT NULL DEFAULT 3000,
    xp_per_action       INTEGER NOT NULL DEFAULT 10,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_id, name)
);

CREATE TABLE IF NOT EXISTS character_skill_levels (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    current_xp NUMERIC DEFAULT 0,
    active_action_id       INTEGER REFERENCES skill_actions(id) ON DELETE SET NULL,
    action_started_at      TIMESTAMP WITH TIME ZONE,
    is_active_training     BOOLEAN NOT NULL DEFAULT FALSE,
    is_in_active_mode      BOOLEAN NOT NULL DEFAULT FALSE,
    active_mode_started_at TIMESTAMP WITH TIME ZONE,
    last_offline_calc_at   TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, skill_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_character_one_active_training
    ON character_skill_levels (character_id)
    WHERE is_active_training = TRUE;

-- =============================================================================
-- 13. Inventory & Collections
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL,
    rarity VARCHAR(50) DEFAULT 'common',
    base_stats JSONB DEFAULT '{}',
    sprite_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS artifacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    lore_text TEXT,
    rarity VARCHAR(50) DEFAULT 'rare',
    passive_bonus JSONB DEFAULT '{}',
    sprite_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_collections (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, artifact_id)
);

-- =============================================================================
-- 14. Views
-- =============================================================================

CREATE OR REPLACE VIEW chapter_active_multipliers AS
SELECT 
    player_id, 
    chapter_id, 
    MAX(dark_ritual_multiplier) as max_ritual
FROM player_story_sessions
WHERE is_active = TRUE
GROUP BY player_id, chapter_id;

-- =============================================================================
-- 15. Final Indexes
-- =============================================================================

CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_processing_status ON chapters(processing_status);
CREATE INDEX idx_scenes_chapter_id ON scenes(chapter_id);
CREATE INDEX idx_scenes_primary_location_id ON scenes(primary_location_id);
CREATE INDEX idx_story_beats_scene_id ON story_beats(scene_id);
CREATE INDEX idx_story_beats_location_id ON story_beats(location_id);

CREATE INDEX idx_entity_scene_app_entity_id ON entity_scene_appearances(entity_id);
CREATE INDEX idx_entity_scene_app_scene_id ON entity_scene_appearances(scene_id);
CREATE INDEX idx_entity_beat_app_entity_id ON entity_beat_appearances(entity_id);
CREATE INDEX idx_entity_beat_app_beat_id ON entity_beat_appearances(story_beat_id);

CREATE INDEX idx_location_scene_app_location_id ON location_scene_appearances(location_id);
CREATE INDEX idx_location_scene_app_scene_id ON location_scene_appearances(scene_id);

CREATE INDEX idx_semantic_tags_beat_id ON semantic_tags(story_beat_id);
CREATE INDEX idx_semantic_tags_category ON semantic_tags(category);

CREATE INDEX idx_review_items_status ON review_items(review_status);

CREATE INDEX IF NOT EXISTS idx_players_firebase_uid ON players(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);

CREATE INDEX IF NOT EXISTS idx_player_characters_player_id ON player_characters(player_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_player_id ON support_tickets(player_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_admin);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket_id ON support_replies(ticket_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_player_id ON activity_events(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_player_progress_player_id ON player_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_character_id ON player_progress(character_id);

CREATE INDEX IF NOT EXISTS idx_player_essence_player_id ON player_essence(player_id);
CREATE INDEX IF NOT EXISTS idx_player_essence_character_id ON player_essence(character_id);
