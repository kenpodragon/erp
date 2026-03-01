-- Create tables for dynamic Admin Access Control
-- These replace the ADMIN_ALLOWED_EMAILS and ADMIN_ALLOWED_IPS env vars

CREATE TABLE IF NOT EXISTS admin_whitelist_emails (
    email VARCHAR(255) PRIMARY KEY,
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_whitelist_ips (
    ip_address VARCHAR(45) PRIMARY KEY,
    note VARCHAR(255),
    added_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed with current env defaults if they are known, or handled via app logic on first run
-- For now, we ensure tables exist.
