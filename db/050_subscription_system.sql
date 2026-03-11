-- ============================================================
-- Migration 050: Subscription System (Elysium Ascendant)
-- Phase: 3.2.0
-- ============================================================

-- 1. Alter players: add subscription columns
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS is_ascendant BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cumulative_subscription_months INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_players_is_ascendant
  ON players (is_ascendant) WHERE is_ascendant = TRUE;

-- 2. New table: player_subscriptions (append-only)
CREATE TABLE IF NOT EXISTS player_subscriptions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) DEFAULT NULL,
    stripe_price_id VARCHAR(255) DEFAULT NULL,
    plan_key VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'past_due', 'canceling', 'expired')),
    source VARCHAR(20) NOT NULL DEFAULT 'stripe'
        CHECK (source IN ('stripe', 'admin_gift')),
    subscription_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    continuous_streak INTEGER NOT NULL DEFAULT 0,
    grace_period_start TIMESTAMPTZ DEFAULT NULL,
    grace_deadline TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psub_player_status ON player_subscriptions (player_id, status);
CREATE INDEX IF NOT EXISTS idx_psub_player_created ON player_subscriptions (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psub_stripe_sub ON player_subscriptions (stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psub_status_grace ON player_subscriptions (status, grace_deadline)
    WHERE status = 'past_due';

CREATE OR REPLACE FUNCTION trg_player_subscriptions_updated_at_fn()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_subscriptions_updated_at ON player_subscriptions;
CREATE TRIGGER trg_player_subscriptions_updated_at
    BEFORE UPDATE ON player_subscriptions
    FOR EACH ROW EXECUTE FUNCTION trg_player_subscriptions_updated_at_fn();

-- 3. New table: subscription_stipend_log
CREATE TABLE IF NOT EXISTS subscription_stipend_log (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES player_subscriptions(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    period_key VARCHAR(7) NOT NULL,
    shards_credited INTEGER NOT NULL CHECK (shards_credited > 0),
    stripe_invoice_id VARCHAR(255) DEFAULT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_stipend_player ON subscription_stipend_log (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stipend_invoice ON subscription_stipend_log (stripe_invoice_id)
    WHERE stripe_invoice_id IS NOT NULL;

-- 4. Seed titles (10 rows: 1 subscriber + 7 loyalty + 2 achievement-reward)
INSERT INTO titles (name, display_format, sort_order) VALUES
('the Ascendant',         'suffix', 200),
('the Patron',            'suffix', 201),
('the Devoted',           'suffix', 202),
('the Eternal Ascendant', 'suffix', 203),
('Architect of Elysium',  'prefix', 204),
('Voidwalker Ascendant',  'prefix', 205),
('Keeper of the Spire',   'prefix', 206),
('Elysium Incarnate',     'prefix', 207),
('the Unyielding',        'suffix', 208),
('the Investor',          'suffix', 209)
ON CONFLICT (name) DO NOTHING;

-- 5. Add unique index on achievements.name for idempotent inserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_name_unique ON achievements (name);

-- Seed achievements (11 rows)
-- Cumulative subscription chain: Initiate → Devotee → Eternal → Architect
INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, reward_title_id)
VALUES ('Ascendant Initiate', 'Subscribe for the first time', 'economics', 'cumulative', 'cumulative_sub_months', 1,
        (SELECT id FROM titles WHERE name = 'the Patron'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Ascendant Devotee', 'Accumulate 6 cumulative months of subscription', 'economics', 'cumulative', 'cumulative_sub_months', 6,
        (SELECT id FROM achievements WHERE name = 'Ascendant Initiate'), 50)
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Ascendant Eternal', 'Accumulate 12 cumulative months of subscription', 'economics', 'cumulative', 'cumulative_sub_months', 12,
        (SELECT id FROM achievements WHERE name = 'Ascendant Devotee'), 100)
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Architect of Ages', 'Accumulate 24 cumulative months of subscription', 'economics', 'cumulative', 'cumulative_sub_months', 24,
        (SELECT id FROM achievements WHERE name = 'Ascendant Eternal'), 200)
ON CONFLICT (name) DO NOTHING;

-- Continuous streak achievement
INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, reward_title_id)
VALUES ('Ascendant Unbroken', 'Maintain 12 consecutive months of subscription', 'economics', 'threshold', 'continuous_sub_streak', 12,
        (SELECT id FROM titles WHERE name = 'the Unyielding'))
ON CONFLICT (name) DO NOTHING;

-- Shard Collector chain
INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, reward_title_id)
VALUES ('Shard Collector I', 'Purchase 1,000 total shards (lifetime)', 'economics', 'cumulative', 'shards_purchased', 1000,
        (SELECT id FROM titles WHERE name = 'the Investor'))
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Shard Collector II', 'Purchase 5,000 total shards (lifetime)', 'economics', 'cumulative', 'shards_purchased', 5000,
        (SELECT id FROM achievements WHERE name = 'Shard Collector I'), 25)
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Shard Collector III', 'Purchase 25,000 total shards (lifetime)', 'economics', 'cumulative', 'shards_purchased', 25000,
        (SELECT id FROM achievements WHERE name = 'Shard Collector II'), 50)
ON CONFLICT (name) DO NOTHING;

-- Big Spender chain
INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value)
VALUES ('Big Spender I', 'Spend 500 shards (lifetime)', 'economics', 'cumulative', 'shards_spent', 500)
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Big Spender II', 'Spend 2,500 shards (lifetime)', 'economics', 'cumulative', 'shards_spent', 2500,
        (SELECT id FROM achievements WHERE name = 'Big Spender I'), 25)
ON CONFLICT (name) DO NOTHING;

INSERT INTO achievements (name, description, category, tracking_type, tracking_source, threshold_value, parent_achievement_id, reward_shards)
VALUES ('Big Spender III', 'Spend 10,000 shards (lifetime)', 'economics', 'cumulative', 'shards_spent', 10000,
        (SELECT id FROM achievements WHERE name = 'Big Spender II'), 50)
ON CONFLICT (name) DO NOTHING;

-- Link title back-references (achievement_id column on titles)
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Ascendant Initiate') WHERE name = 'the Patron' AND achievement_id IS NULL;
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Ascendant Unbroken') WHERE name = 'the Unyielding' AND achievement_id IS NULL;
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Shard Collector I') WHERE name = 'the Investor' AND achievement_id IS NULL;

-- 6. Seed game_configs (11 rows, category: subscription)
INSERT INTO game_configs (key, value_json, category, description) VALUES
('stripe_ascendant_monthly_price_id', '""'::jsonb, 'subscription', 'Stripe Price ID for Ascendant monthly plan'),
('stripe_ascendant_annual_price_id',  '""'::jsonb, 'subscription', 'Stripe Price ID for Ascendant annual plan'),
('subscription_base_stipend_shards',  '150'::jsonb,  'subscription', 'Monthly shard stipend base amount'),
('subscription_base_xp_boost',        '0.15'::jsonb, 'subscription', 'Base XP multiplier bonus (e.g., 0.15 = +15%)'),
('subscription_base_essence_boost',   '0.15'::jsonb, 'subscription', 'Base Essence multiplier bonus'),
('subscription_base_drop_boost',      '0.10'::jsonb, 'subscription', 'Base artifact drop rate multiplier bonus'),
('subscription_base_training_boost',  '0.10'::jsonb, 'subscription', 'Base idle training speed bonus'),
('subscription_streak_bonuses',       '[{"months":3,"xp_bonus":0.05,"essence_bonus":0.05,"drop_bonus":0,"training_bonus":0,"stipend_bonus":0},{"months":6,"xp_bonus":0.05,"essence_bonus":0.05,"drop_bonus":0.05,"training_bonus":0,"stipend_bonus":0},{"months":12,"xp_bonus":0.05,"essence_bonus":0.05,"drop_bonus":0.05,"training_bonus":0,"stipend_bonus":0},{"months":24,"xp_bonus":0,"essence_bonus":0,"drop_bonus":0,"training_bonus":0.05,"stipend_bonus":50},{"months":36,"xp_bonus":0,"essence_bonus":0,"drop_bonus":0,"training_bonus":0,"stipend_bonus":50}]'::jsonb, 'subscription', 'Continuous streak bonus milestones (JSON array)'),
('subscription_cumulative_milestones','[{"months":1,"reward_type":"title","reward_value":"the_patron"},{"months":6,"reward_type":"title","reward_value":"the_devoted"},{"months":12,"reward_type":"title","reward_value":"the_eternal_ascendant"},{"months":24,"reward_type":"title","reward_value":"architect_of_elysium"},{"months":36,"reward_type":"title","reward_value":"voidwalker_ascendant"},{"months":48,"reward_type":"title","reward_value":"keeper_of_the_spire"},{"months":60,"reward_type":"title","reward_value":"elysium_incarnate"}]'::jsonb, 'subscription', 'Cumulative month milestone rewards (JSON array)'),
('subscription_custom_holidays',      '[]'::jsonb,    'subscription', 'Additional holiday dates for grace period (JSON array of ISO date strings)'),
('gift_counts_toward_loyalty',        '"false"'::jsonb, 'subscription', 'Whether admin-gifted periods count toward loyalty counters')
ON CONFLICT (key) DO NOTHING;