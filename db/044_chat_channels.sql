-- Migration 044: Chat channels table + chat game_configs seeds (2.6.4)

CREATE TABLE IF NOT EXISTS chat_channels (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    channel_type VARCHAR(20) NOT NULL DEFAULT 'global',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES players(id) ON DELETE SET NULL
);

-- Seed the default global channel
INSERT INTO chat_channels (id, name, channel_type, is_active)
VALUES ('global', 'Global Chat', 'global', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO game_configs (key, category, value_json, description) VALUES
('chat_buffer_size', 'social', '200', 'Max messages held in the in-memory chat buffer'),
('chat_rate_limit_per_minute', 'social', '20', 'Max chat messages per player per minute'),
('chat_heartbeat_interval_s', 'social', '30', 'Server WebSocket ping interval in seconds'),
('broadcast_rarity_min', 'social', '4', 'Min item rarity level for system broadcast to global chat'),
('broadcast_rate_limit_per_minute', 'social', '10', 'Max system broadcasts per minute (global)')
ON CONFLICT (key) DO NOTHING;
