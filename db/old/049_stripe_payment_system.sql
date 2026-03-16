-- Migration 049: Stripe Payment System Foundation (3.1)

BEGIN;

-- =============================================================================
-- 1. Shard Packages Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS shard_packages (
    id SERIAL PRIMARY KEY,
    tier_key VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    base_shards INTEGER NOT NULL CHECK (base_shards > 0),
    bonus_pct INTEGER NOT NULL DEFAULT 0 CHECK (bonus_pct >= 0 AND bonus_pct <= 100),
    total_shards INTEGER NOT NULL CHECK (total_shards > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_best_value BOOLEAN NOT NULL DEFAULT FALSE,
    max_purchases_per_player INTEGER DEFAULT NULL CHECK (max_purchases_per_player IS NULL OR max_purchases_per_player > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shard_packages_active ON shard_packages (is_active, sort_order) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION update_shard_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shard_packages_updated_at
    BEFORE UPDATE ON shard_packages
    FOR EACH ROW EXECUTE FUNCTION update_shard_packages_updated_at();

-- Seed shard packages
INSERT INTO shard_packages (tier_key, name, price_cents, base_shards, bonus_pct, total_shards, sort_order, is_best_value) VALUES
('starter',  'Starter Pack',   99,   100,   0,  100,   1, FALSE),
('small',    'Small Pack',     499,  500,   5,  525,   2, FALSE),
('medium',   'Medium Pack',    999,  1000,  10, 1100,  3, FALSE),
('large',    'Large Pack',     2499, 2500,  12, 2800,  4, FALSE),
('premium',  'Premium Pack',   4999, 5000,  20, 6000,  5, FALSE),
('ultimate', 'Ultimate Pack',  9999, 10000, 30, 13000, 6, TRUE);

-- =============================================================================
-- 2. Payment Orders Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_orders (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES shard_packages(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'refunded', 'disputed')),
    stripe_checkout_session_id VARCHAR(255) UNIQUE,
    stripe_payment_intent_id VARCHAR(255) DEFAULT NULL,
    stripe_charge_id VARCHAR(255) DEFAULT NULL,
    idempotency_key UUID NOT NULL UNIQUE,
    price_cents INTEGER NOT NULL,
    shards_credited INTEGER DEFAULT 0,
    shards_refunded INTEGER DEFAULT 0,
    is_first_purchase BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ DEFAULT NULL,
    refunded_at TIMESTAMPTZ DEFAULT NULL,
    expired_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_payment_orders_player ON payment_orders (player_id, created_at DESC);
CREATE INDEX idx_payment_orders_status ON payment_orders (status) WHERE status = 'pending';
CREATE INDEX idx_payment_orders_stripe_pi ON payment_orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX idx_payment_orders_stripe_charge ON payment_orders (stripe_charge_id) WHERE stripe_charge_id IS NOT NULL;
CREATE INDEX idx_payment_orders_player_package ON payment_orders (player_id, package_id) WHERE status = 'completed';

-- =============================================================================
-- 3. Stripe Webhook Events Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id SERIAL PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_stripe_events_type ON stripe_webhook_events (event_type, created_at DESC);
CREATE INDEX idx_stripe_events_unprocessed ON stripe_webhook_events (processed) WHERE processed = FALSE;

-- =============================================================================
-- 4. ALTER players — Stripe columns
-- =============================================================================

ALTER TABLE players
    ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS first_purchase_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS account_flag VARCHAR(30) DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_stripe_customer
    ON players (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- 5. game_configs Seeds (economy)
-- =============================================================================

INSERT INTO game_configs (key, value_json, category, description) VALUES
('stripe_first_purchase_multiplier', '2',     'economy', 'Multiplier for first shard purchase bonus'),
('payment_poll_max_attempts',        '20',    'economy', 'Max frontend polling attempts after checkout'),
('payment_poll_interval_ms',         '3000',  'economy', 'Frontend polling interval in milliseconds'),
('reconciliation_lookback_hours',    '48',    'economy', 'Hours to look back in reconciliation jobs'),
('checkout_expiration_minutes',      '30',    'economy', 'Stripe Checkout Session expiration time'),
('refund_eligible_days',             '14',    'economy', 'Days after purchase a self-service refund is available')
ON CONFLICT (key) DO NOTHING;

COMMIT;
