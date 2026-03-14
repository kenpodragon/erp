-- Migration 056: Admin Essence Adjustments
-- Follows the admin_shard_adjustments pattern from migration 054.
-- Provides immutable audit trail for admin Essence grants and debits.

CREATE TABLE admin_essence_adjustments (
    id              SERIAL PRIMARY KEY,
    character_id    INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    admin_email     VARCHAR(255) NOT NULL,
    adjustment_type VARCHAR(10) NOT NULL CHECK (adjustment_type IN ('grant', 'debit')),
    amount          DOUBLE PRECISION NOT NULL CHECK (amount > 0),
    balance_before  DOUBLE PRECISION NOT NULL,
    balance_after   DOUBLE PRECISION NOT NULL,
    reason          VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_essence_adj_character ON admin_essence_adjustments(character_id);
CREATE INDEX idx_admin_essence_adj_player ON admin_essence_adjustments(player_id);
CREATE INDEX idx_admin_essence_adj_created ON admin_essence_adjustments(created_at DESC);
