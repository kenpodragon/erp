-- Migration 042: Discovery tables + entity_family column (2.6.2)

CREATE TABLE IF NOT EXISTS player_entity_discovery (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    encounters INTEGER NOT NULL DEFAULT 0,
    kills INTEGER NOT NULL DEFAULT 0,
    rank VARCHAR(2) DEFAULT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (player_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_ped_player ON player_entity_discovery(player_id);
CREATE INDEX IF NOT EXISTS idx_ped_entity ON player_entity_discovery(entity_id);
CREATE INDEX IF NOT EXISTS idx_ped_player_rank ON player_entity_discovery(player_id, rank);

CREATE TABLE IF NOT EXISTS player_discovery_log (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    discovery_type VARCHAR(20) NOT NULL,
    reference_id INTEGER NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (player_id, discovery_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_pdl_player ON player_discovery_log(player_id);
CREATE INDEX IF NOT EXISTS idx_pdl_player_type ON player_discovery_log(player_id, discovery_type);

-- Add entity_family column to entities table
ALTER TABLE entities ADD COLUMN IF NOT EXISTS entity_family VARCHAR(100) DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_family ON entities(entity_family);
