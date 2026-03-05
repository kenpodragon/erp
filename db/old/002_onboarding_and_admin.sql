-- =============================================================================
-- SQL Script for Onboarding, Profiles & Initial Admin
-- Based on requirements in docs/1_ONBOARDING_INIT_SCHEMA.md and docs/TODO.md
-- =============================================================================

-- Helper function for auto-updating updated_at timestamps (Idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- 1. Player & Profile Tables
-- =============================================================================

-- players
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive unique index for alias
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_alias ON players(LOWER(alias)) WHERE alias IS NOT NULL;

CREATE TRIGGER update_players_modtime
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- player_settings
CREATE TABLE IF NOT EXISTS player_settings (
    id SERIAL PRIMARY KEY,
    player_id INTEGER UNIQUE NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    audio_enabled BOOLEAN DEFAULT TRUE,
    music_volume SMALLINT DEFAULT 80 CHECK (music_volume BETWEEN 0 AND 100),
    sfx_volume SMALLINT DEFAULT 80 CHECK (sfx_volume BETWEEN 0 AND 100),
    narration_speed NUMERIC(2,1) DEFAULT 1.0 CHECK (narration_speed BETWEEN 0.5 AND 2.0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_player_settings_modtime
    BEFORE UPDATE ON player_settings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 2. Character Tables
-- =============================================================================

-- character_classes
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

-- player_characters
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

-- Case-insensitive unique index for character_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_characters_name ON player_characters(LOWER(character_name));

CREATE TRIGGER update_player_characters_modtime
    BEFORE UPDATE ON player_characters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- 3. Support Ticket Tables
-- =============================================================================

-- support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    category VARCHAR(50) CHECK (category IN ('bug_report','account_issue','payment_issue','feedback','other')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
    subject VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
    assigned_admin VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

CREATE TRIGGER update_support_tickets_modtime
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- support_replies
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

-- support_attachments
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
-- 4. Server Config Table
-- =============================================================================

-- server_config
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

-- =============================================================================
-- 5. Activity & Audit Tables
-- =============================================================================

-- activity_events
CREATE TABLE IF NOT EXISTS activity_events (
    id BIGSERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- admin_audit_log
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

-- =============================================================================
-- 6. Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_players_firebase_uid ON players(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_players_email ON players(email);
-- idx_players_alias is already created as a UNIQUE index above

CREATE INDEX IF NOT EXISTS idx_player_characters_player_id ON player_characters(player_id);
-- idx_player_characters_name is already created as a UNIQUE index above

CREATE INDEX IF NOT EXISTS idx_support_tickets_player_id ON support_tickets(player_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_admin);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket_id ON support_replies(ticket_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_player_id ON activity_events(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_type ON activity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);

-- =============================================================================
-- 7. Seed Data
-- =============================================================================

-- 7.1 Character Classes
INSERT INTO character_classes (name, lore_blurb, base_strength, base_agility, base_intelligence, sprite_key)
VALUES
('Sentinel',  'Stalwart protectors of the Towers, gifted with unnatural resilience and strength.', 14, 10, 6,  'class_sentinel'),
('Arcanist',  'Scholars of the ancient glyphs, weaving raw essence into devastating manifestations.', 6,  8,  16, 'class_arcanist'),
('Wanderer',  'Agile survivors who roam the shifting levels, relying on speed and sharp instincts.', 8,  16, 6,  'class_wanderer'),
('Invoker',   'Vessels for the Towers spirit, balancing physical prowess with tactical essence manipulation.', 10, 6,  14, 'class_invoker')
ON CONFLICT (name) DO NOTHING;

-- 7.2 Server Config Defaults
INSERT INTO server_config (key, value, value_type, category, description, default_value)
VALUES
-- Game Tuning
('game.essence_per_click',        '1.0',   'numeric', 'game', 'Base essence earned per click.',                                '1.0'),
('game.crit_chance',              '0.05',  'numeric', 'game', 'Probability of a critical click (0.0-1.0).',                     '0.05'),
('game.crit_multiplier',          '2.0',   'numeric', 'game', 'Damage/essence multiplier on critical click.',                   '2.0'),
('game.xp_multiplier',            '1.0',   'numeric', 'game', 'Global XP multiplier.',                                         '1.0'),
('game.drop_rate_multiplier',     '1.0',   'numeric', 'game', 'Global drop rate multiplier.',                                   '1.0'),
('game.offline_cap_chapters',     '1',     'integer', 'game', 'Max chapters worth of offline progress.',                        '1'),
('game.max_characters_per_player','1',     'integer', 'game', 'Character creation limit per player.',                           '1'),
-- Operational Settings
('ops.maintenance_mode',              'false', 'boolean', 'ops', 'Block all player API access with maintenance message.',        'false'),
('ops.maintenance_message',           'Elysium is undergoing maintenance. Please return shortly.', 'text', 'ops', 'Message shown during maintenance.', 'Elysium is undergoing maintenance. Please return shortly.'),
('ops.registration_open',            'true',  'boolean', 'ops', 'Allow new player registration.',                                'true'),
('ops.announcement_banner',          '',       'text',    'ops', 'Banner text displayed at top of frontend (empty = hidden).',    ''),
('ops.announcement_banner_type',     'info',   'string',  'ops', 'Banner color type: info, warning, error.',                      'info'),
('ops.rate_limit_clicks_per_second', '20',     'integer', 'ops', 'Max clicks/sec before rate limiting kicks in.',                 '20'),
('ops.rate_limit_suspicious_threshold','15',   'integer', 'ops', 'Sustained clicks/sec that flags a player as suspicious.',       '15')
ON CONFLICT (key) DO NOTHING;
