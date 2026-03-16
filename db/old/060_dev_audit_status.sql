-- Migration 060: Dev Content Audit Dashboard
-- Phase 5.6 — Replaces boolean 'resolved' with richer 'status' column,
-- adds indexes for dashboard filtering.

BEGIN;

ALTER TABLE dev_content_audit
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'open';

UPDATE dev_content_audit SET status = 'resolved' WHERE resolved = TRUE;
UPDATE dev_content_audit SET status = 'open' WHERE resolved = FALSE;

ALTER TABLE dev_content_audit DROP COLUMN resolved;

CREATE INDEX idx_dev_content_audit_status ON dev_content_audit(status);
CREATE INDEX idx_dev_content_audit_type ON dev_content_audit(audit_type);

COMMIT;
