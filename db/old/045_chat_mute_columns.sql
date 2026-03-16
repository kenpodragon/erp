-- Migration 045: Add chat mute columns to player_settings
-- Part of REC 2.6.4 (Chat System)

ALTER TABLE player_settings
ADD COLUMN IF NOT EXISTS chat_muted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE player_settings
ADD COLUMN IF NOT EXISTS chat_muted_until VARCHAR(50) DEFAULT NULL;
