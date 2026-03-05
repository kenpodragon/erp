-- 011_inventory_collections.sql
-- Inventory, Equipment, and Collections system

BEGIN;

-- 1. Inventory Items Table (Template for items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL, -- 'weapon', 'armor', 'trinket', 'consumable', 'material'
    rarity VARCHAR(50) DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'cosmic'
    base_stats JSONB DEFAULT '{}', -- e.g., {"strength": 5}
    sprite_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Player Inventory Table (Instance of an item owned by a character)
CREATE TABLE IF NOT EXISTS player_inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_slot VARCHAR(50), -- 'weapon', 'armor', 'trinket'
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Artifacts Table (Lore items / Meta-progression)
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

-- 4. Player Collections Table
CREATE TABLE IF NOT EXISTS player_collections (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    artifact_id INTEGER NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, artifact_id)
);

-- Initial Data (Rule of 4 Artifacts)
INSERT INTO artifacts (name, description, lore_text, rarity, sprite_key) VALUES 
('Cracked Data Core', 'A remnant of the Old World''s network.', 'The silicon is pitted and scarred, but a faint blue light still pulses within. It hums with the static of a billion forgotten conversations.', 'rare', 'artifact_data_core'),
('Void Shard', 'A pulsating fragment of Yaldabaoth''s prison.', 'Cold to the touch and seemingly absorbing the light around it. To hold it is to feel the weight of infinite isolation.', 'epic', 'artifact_void_shard'),
('Membrane Leaf', 'Flora found only in the Lower Towers.', 'Transparent and veins with a bioluminescent sap. It feeds on the atmospheric pressure of the tower''s depths.', 'uncommon', 'artifact_membrane_leaf'),
('Conduit''s Focus', 'A broken lens used to channel cosmic energy.', 'Once part of a Drifter''s apparatus. Though cracked, it still refracts the Akashic flow into visible spectrums.', 'rare', 'artifact_conduit_focus')
ON CONFLICT (name) DO NOTHING;

COMMIT;
