-- 010_game_entities.sql
-- Extending existing narrative tables with gameplay metadata for Loop 2.0

BEGIN;

-- 1. Create Scene Gameplay Data Table (Normalized)
CREATE TABLE IF NOT EXISTS scene_gameplay_data (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    required_time_seconds INTEGER NOT NULL DEFAULT 0,
    background_sprite_key VARCHAR(100),
    is_boss_scene BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id)
);

-- 2. Create Entity Gameplay Data Table (Normalized)
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

-- 3. Create Stat Definitions Table (Metadata for dynamic stats)
CREATE TABLE IF NOT EXISTS stat_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'strength'
    display_name VARCHAR(100) NOT NULL,
    value_type VARCHAR(50) NOT NULL, -- 'integer', 'float', 'percentage'
    min_value NUMERIC,
    max_value NUMERIC,
    description TEXT,
    category VARCHAR(50), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Benefit Effect Data Table (Metadata for skill/item effects)
CREATE TABLE IF NOT EXISTS benefit_effect_data (
    id SERIAL PRIMARY KEY,
    effect_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'click_damage_bonus'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    value_type VARCHAR(50) NOT NULL, -- 'percentage_add', 'flat_add', 'multiplier'
    min_value NUMERIC,
    max_value NUMERIC,
    category VARCHAR(50), -- 'combat', 'economy', 'audio'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Skills Table (Purely gameplay mechanic)
CREATE TABLE IF NOT EXISTS skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'combat', 'magic', 'utility'
    description TEXT,
    benefits_json JSONB DEFAULT '{}', -- Stores the specific values, e.g., {"click_damage_bonus": 0.5}
    xp_curve_type VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Initial Gameplay Data Seeding

-- Seed initial stat definitions
INSERT INTO stat_definitions (name, display_name, value_type, description, category) VALUES 
('strength', 'Strength', 'integer', 'Increases physical damage.', 'combat'),
('agility', 'Agility', 'integer', 'Increases attack speed.', 'combat'),
('intelligence', 'Intelligence', 'integer', 'Increases mana and skill power.', 'magic'),
('crit_chance', 'Crit Chance', 'percentage', 'Chance to deal double damage.', 'combat')
ON CONFLICT (name) DO NOTHING;

-- Seed initial benefit effect definitions
INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, category) VALUES 
('click_damage_bonus', 'Click Damage Bonus', 'Increases the damage dealt per manual click.', 'percentage_add', 'combat'),
('auto_dps_bonus', 'Auto-DPS Bonus', 'Increases the damage dealt automatically over time.', 'percentage_add', 'combat'),
('time_gate_reduction', 'Time Gate Reduction', 'Reduces the required audio playback time for scenes.', 'percentage_add', 'audio'),
('essence_bonus', 'Essence Gain Bonus', 'Increases the rate at which Elysium Essence is earned.', 'percentage_add', 'economy'),
('crit_chance_bonus', 'Crit Chance Bonus', 'Increases the probability of landing a critical hit.', 'flat_add', 'combat'),
('crit_mult_bonus', 'Crit Multiplier Bonus', 'Increases the damage multiplier of critical hits.', 'flat_add', 'combat')
ON CONFLICT (effect_key) DO NOTHING;

-- Seed initial skills
INSERT INTO skills (name, category, description, benefits_json) VALUES 
('Attack', 'combat', 'Increases base Click Damage in Story Mode.', '{"click_damage_bonus": 0.5}'),
('Magic', 'magic', 'Increases base Auto-DPS and unlocks magic skills.', '{"auto_dps_bonus": 0.5}'),
('Lore', 'utility', 'Reduces story duration gate and increases Essence.', '{"time_gate_reduction": 0.01, "essence_bonus": 0.05}'),
('Precision', 'utility', 'Increases critical hit chance and multiplier.', '{"crit_chance_bonus": 0.01, "crit_mult_bonus": 0.05}')
ON CONFLICT DO NOTHING;

COMMIT;
