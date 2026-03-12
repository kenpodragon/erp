-- 054_admin_finance_dashboard.sql
-- Admin Finance Dashboard: shard adjustment audit table + marketplace anomaly configs

-- =============================================================================
-- Admin Shard Adjustments (audit trail for manual shard grants/debits)
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_shard_adjustments (
    id              SERIAL PRIMARY KEY,
    player_id       INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    admin_email     VARCHAR(255) NOT NULL,
    adjust_type     VARCHAR(10) NOT NULL CHECK (adjust_type IN ('grant', 'debit')),
    amount          INT NOT NULL CHECK (amount > 0),
    reason          TEXT NOT NULL,
    balance_before  BIGINT NOT NULL,
    balance_after   BIGINT NOT NULL,
    shard_txn_id    INT REFERENCES shard_transactions(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asa_player  ON admin_shard_adjustments (player_id);
CREATE INDEX IF NOT EXISTS idx_asa_admin   ON admin_shard_adjustments (admin_email);
CREATE INDEX IF NOT EXISTS idx_asa_created ON admin_shard_adjustments (created_at DESC);

-- =============================================================================
-- Game configs: marketplace anomaly detection thresholds
-- =============================================================================

INSERT INTO game_configs (key, value_json, category, description) VALUES
    ('anomaly_price_multiplier_threshold', '"10"', 'marketplace_anomaly', 'Price multiplier above rolling average to flag as anomaly'),
    ('anomaly_rapid_relist_count', '"5"', 'marketplace_anomaly', 'Number of relists within window to flag as rapid relist'),
    ('anomaly_rapid_relist_window_minutes', '"60"', 'marketplace_anomaly', 'Time window in minutes for rapid relist detection'),
    ('anomaly_wash_trade_count', '"3"', 'marketplace_anomaly', 'Number of trades between same pair within window to flag as wash trade'),
    ('anomaly_wash_trade_window_hours', '"24"', 'marketplace_anomaly', 'Time window in hours for wash trade detection')
ON CONFLICT (key) DO NOTHING;
