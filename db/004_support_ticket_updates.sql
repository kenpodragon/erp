-- =============================================================================
-- 004: Support Ticket Updates
-- - Add last-viewed timestamps for unread/new-activity tracking
-- =============================================================================

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS player_last_viewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_last_viewed_at TIMESTAMPTZ;
