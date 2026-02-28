-- ============================================================
-- Migration 003: Character Game State Tables
-- player_progress and player_essence are initialized on
-- character creation (POST /api/players/me/characters).
-- ============================================================

-- player_progress: tracks the player/character's narrative position
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

CREATE INDEX IF NOT EXISTS idx_player_progress_player_id ON player_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_character_id ON player_progress(character_id);

-- player_essence: tracks the currency/resource for a character
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

CREATE INDEX IF NOT EXISTS idx_player_essence_player_id ON player_essence(player_id);
CREATE INDEX IF NOT EXISTS idx_player_essence_character_id ON player_essence(character_id);
