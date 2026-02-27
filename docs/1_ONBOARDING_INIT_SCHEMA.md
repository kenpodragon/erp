# 1_ONBOARDING_INIT_SCHEMA: Database Schema for Onboarding & Initial Admin

This document defines the complete database schema for the onboarding, authentication, profiles, support ticketing, server configuration, and observability systems described in [1_ONBOARDING_INIT_RECS.md](1_ONBOARDING_INIT_RECS.md).

---

## 1. Player & Profile Tables

### `players`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `firebase_uid` | `VARCHAR(128)` | Firebase user ID. `UNIQUE NOT NULL`. |
| `email` | `VARCHAR(255)` | Google account email. `NOT NULL`. |
| `google_display_name` | `VARCHAR(255)` | Display name from Google (synced on login). |
| `google_avatar_url` | `TEXT` | Avatar URL from Google (synced on login). |
| `alias` | `VARCHAR(20)` | Custom display name. `UNIQUE` (case-insensitive). Nullable (uses Google name if null). |
| `custom_avatar_url` | `TEXT` | Path to uploaded avatar. Nullable (falls back to Google avatar). |
| `avatar_preset_key` | `VARCHAR(50)` | Key of selected preset avatar. Nullable. |
| `terms_accepted_at` | `TIMESTAMPTZ` | When ToS was accepted. Nullable. |
| `is_banned` | `BOOLEAN` | Account ban flag. Default `false`. |
| `banned_at` | `TIMESTAMPTZ` | When banned. Nullable. |
| `banned_by` | `VARCHAR(255)` | Admin email who issued ban. Nullable. |
| `ban_reason` | `TEXT` | Reason for ban. Nullable. |
| `created_at` | `TIMESTAMPTZ` | Account creation time. Default `NOW()`. |
| `last_login_at` | `TIMESTAMPTZ` | Last successful login. Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Last profile update. Default `NOW()`. |

### `player_settings`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `UNIQUE ON DELETE CASCADE`. |
| `audio_enabled` | `BOOLEAN` | Master audio toggle. Default `true`. |
| `music_volume` | `SMALLINT` | Music volume 0-100. Default `80`. |
| `sfx_volume` | `SMALLINT` | SFX volume 0-100. Default `80`. |
| `narration_speed` | `NUMERIC(2,1)` | Narration playback speed 0.5-2.0. Default `1.0`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

---

## 2. Character Tables

### `character_classes`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `name` | `VARCHAR(50)` | Class name. `UNIQUE NOT NULL`. |
| `lore_blurb` | `TEXT` | Flavor text for class selection screen. |
| `base_strength` | `INTEGER` | Starting STR. Default `10`. |
| `base_agility` | `INTEGER` | Starting AGI. Default `10`. |
| `base_intelligence` | `INTEGER` | Starting INT. Default `10`. |
| `sprite_key` | `VARCHAR(100)` | Reference to class art asset. |
| `is_available` | `BOOLEAN` | Whether players can select this class. Default `true`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `player_characters`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE CASCADE`. |
| `class_id` | `INTEGER FK` | References `character_classes.id`. `ON DELETE RESTRICT`. |
| `character_name` | `VARCHAR(20)` | In-game character name. `UNIQUE` (case-insensitive). |
| `level` | `INTEGER` | Character level. Default `1`. |
| `strength` | `INTEGER` | Current STR (initialized from class base). |
| `agility` | `INTEGER` | Current AGI (initialized from class base). |
| `intelligence` | `INTEGER` | Current INT (initialized from class base). |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `last_played_at` | `TIMESTAMPTZ` | Last gameplay session. Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

---

## 3. Support Ticket Tables

### `support_tickets`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE CASCADE`. |
| `category` | `VARCHAR(50)` | `bug_report`, `account_issue`, `payment_issue`, `feedback`, `other`. |
| `priority` | `VARCHAR(20)` | `low`, `normal`, `high`, `critical`. Default `normal`. |
| `subject` | `VARCHAR(100)` | Ticket subject. |
| `status` | `VARCHAR(20)` | `open`, `in_progress`, `resolved`, `closed`. Default `open`. |
| `assigned_admin` | `VARCHAR(255)` | Admin email assigned to this ticket. Nullable. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `resolved_at` | `TIMESTAMPTZ` | When status changed to `resolved`. Nullable. |
| `closed_at` | `TIMESTAMPTZ` | When status changed to `closed`. Nullable. |

### `support_replies`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `ticket_id` | `INTEGER FK` | References `support_tickets.id`. `ON DELETE CASCADE`. |
| `author_type` | `VARCHAR(10)` | `player` or `admin`. |
| `author_id` | `INTEGER` | Player ID (if player) or null (if admin). |
| `author_email` | `VARCHAR(255)` | Email of author (for admin replies). |
| `content` | `TEXT` | Reply text. |
| `is_internal_note` | `BOOLEAN` | If `true`, only visible to admins. Default `false`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `support_attachments`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `ticket_id` | `INTEGER FK` | References `support_tickets.id`. `ON DELETE CASCADE`. |
| `reply_id` | `INTEGER FK` | References `support_replies.id`. Nullable (null = attached to initial ticket). `ON DELETE CASCADE`. |
| `file_name` | `VARCHAR(255)` | Original file name. |
| `file_path` | `TEXT` | Storage path (local or GCS). |
| `file_size` | `INTEGER` | File size in bytes. |
| `mime_type` | `VARCHAR(100)` | MIME type (image/jpeg, application/pdf, etc.). |
| `uploaded_by` | `INTEGER FK` | References `players.id`. Nullable for admin uploads. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

---

## 4. Server Config Table

### `server_config`
| Column | Type | Description |
|--------|------|-------------|
| `key` | `VARCHAR(100) PK` | Dotted config key (e.g., `game.essence_per_click`). |
| `value` | `TEXT` | Current value (stored as string). |
| `value_type` | `VARCHAR(20)` | `string`, `integer`, `numeric`, `boolean`, `text`. |
| `category` | `VARCHAR(50)` | `game` or `ops`. |
| `description` | `TEXT` | Human-readable description. |
| `default_value` | `TEXT` | Default value for "Reset" feature. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_by` | `VARCHAR(255)` | Admin email who last changed this. |

---

## 5. Activity & Audit Tables

### `activity_events`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `BIGSERIAL PK` | Auto-incrementing (BIGSERIAL for high-volume table). |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE SET NULL`. Nullable. |
| `event_type` | `VARCHAR(50)` | Event type key (see RECS FR-9.1). |
| `event_data` | `JSONB` | Flexible payload for event-specific data. |
| `ip_address` | `VARCHAR(45)` | Client IP (supports IPv6). |
| `user_agent` | `TEXT` | Browser user agent string. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `admin_audit_log`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `BIGSERIAL PK` | Auto-incrementing. |
| `admin_email` | `VARCHAR(255)` | Admin who performed the action. |
| `action` | `VARCHAR(50)` | Action type (see RECS FR-9.4). |
| `target_type` | `VARCHAR(50)` | `player`, `config`, `ticket`. |
| `target_id` | `VARCHAR(100)` | Affected entity's ID. |
| `details` | `JSONB` | Action-specific data. |
| `ip_address` | `VARCHAR(45)` | Admin's IP. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

---

## 6. Indexes

```
idx_players_firebase_uid        ON players(firebase_uid)
idx_players_email               ON players(email)
idx_players_alias               ON players(LOWER(alias))
idx_player_characters_player_id ON player_characters(player_id)
idx_player_characters_name      ON player_characters(LOWER(character_name))
idx_support_tickets_player_id   ON support_tickets(player_id)
idx_support_tickets_status      ON support_tickets(status)
idx_support_tickets_assigned    ON support_tickets(assigned_admin)
idx_support_replies_ticket_id   ON support_replies(ticket_id)
idx_activity_events_player_id   ON activity_events(player_id)
idx_activity_events_type        ON activity_events(event_type)
idx_activity_events_created     ON activity_events(created_at)
idx_admin_audit_created         ON admin_audit_log(created_at)
idx_admin_audit_action          ON admin_audit_log(action)
```

---

## 7. Cascade Delete Chain

```
players
  ├── player_settings        (ON DELETE CASCADE)
  ├── player_characters      (ON DELETE CASCADE)
  ├── support_tickets        (ON DELETE CASCADE)
  │     ├── support_replies      (ON DELETE CASCADE)
  │     └── support_attachments  (ON DELETE CASCADE)
  └── activity_events        (ON DELETE SET NULL — preserves event history)
```

- `character_classes` uses `ON DELETE RESTRICT` from `player_characters.class_id` — cannot delete a class while characters exist.
- `admin_audit_log` has no FK to `players` — uses `admin_email` string for independence.

---

## 8. Constraints Summary

| Table | Constraint | Type |
|-------|-----------|------|
| `players` | `firebase_uid` | `UNIQUE NOT NULL` |
| `players` | `LOWER(alias)` | `UNIQUE` (via index) |
| `player_settings` | `player_id` | `UNIQUE` (one settings row per player) |
| `character_classes` | `name` | `UNIQUE NOT NULL` |
| `player_characters` | `LOWER(character_name)` | `UNIQUE` (via index) |
| `player_settings.music_volume` | `CHECK (music_volume BETWEEN 0 AND 100)` | `CHECK` |
| `player_settings.sfx_volume` | `CHECK (sfx_volume BETWEEN 0 AND 100)` | `CHECK` |
| `player_settings.narration_speed` | `CHECK (narration_speed BETWEEN 0.5 AND 2.0)` | `CHECK` |
| `support_tickets.category` | `CHECK (category IN ('bug_report','account_issue','payment_issue','feedback','other'))` | `CHECK` |
| `support_tickets.priority` | `CHECK (priority IN ('low','normal','high','critical'))` | `CHECK` |
| `support_tickets.status` | `CHECK (status IN ('open','in_progress','resolved','closed'))` | `CHECK` |
| `support_replies.author_type` | `CHECK (author_type IN ('player','admin'))` | `CHECK` |
| `server_config.value_type` | `CHECK (value_type IN ('string','integer','numeric','boolean','text'))` | `CHECK` |
| `server_config.category` | `CHECK (category IN ('game','ops'))` | `CHECK` |

---

## 9. Seed Data

### 9.1 Character Classes (Placeholder — Finalize from Book Lore)
```sql
INSERT INTO character_classes (name, lore_blurb, base_strength, base_agility, base_intelligence, sprite_key) VALUES
('Sentinel',  'TBD — derive from Towers of Elysium lore.', 14, 10, 6,  'class_sentinel'),
('Arcanist',  'TBD — derive from Towers of Elysium lore.', 6,  8,  16, 'class_arcanist'),
('Wanderer',  'TBD — derive from Towers of Elysium lore.', 8,  16, 6,  'class_wanderer'),
('Invoker',   'TBD — derive from Towers of Elysium lore.', 10, 6,  14, 'class_invoker');
```

### 9.2 Server Config Defaults
```sql
INSERT INTO server_config (key, value, value_type, category, description, default_value) VALUES
-- Game Tuning
('game.essence_per_click',        '1.0',   'numeric', 'game', 'Base essence earned per click.',                                '1.0'),
('game.crit_chance',              '0.05',  'numeric', 'game', 'Probability of a critical click (0.0-1.0).',                     '0.05'),
('game.crit_multiplier',          '2.0',   'numeric', 'game', 'Damage/essence multiplier on critical click.',                   '2.0'),
('game.xp_multiplier',            '1.0',   'numeric', 'game', 'Global XP multiplier.',                                         '1.0'),
('game.drop_rate_multiplier',     '1.0',   'numeric', 'game', 'Global drop rate multiplier.',                                   '1.0'),
('game.offline_cap_chapters',     '1',     'integer', 'game', 'Max chapters worth of offline progress.',                        '1'),
('game.max_characters_per_player','1',     'integer', 'game', 'Character creation limit per player.',                           '1'),
-- Operational Settings
('ops.maintenance_mode',              'false', 'boolean', 'ops', 'Block all player API access with maintenance message.',        'false'),
('ops.maintenance_message',           'Elysium is undergoing maintenance. Please return shortly.', 'text', 'ops', 'Message shown during maintenance.', 'Elysium is undergoing maintenance. Please return shortly.'),
('ops.registration_open',            'true',  'boolean', 'ops', 'Allow new player registration.',                                'true'),
('ops.announcement_banner',          '',       'text',    'ops', 'Banner text displayed at top of frontend (empty = hidden).',    ''),
('ops.announcement_banner_type',     'info',   'string',  'ops', 'Banner color type: info, warning, error.',                      'info'),
('ops.rate_limit_clicks_per_second', '20',     'integer', 'ops', 'Max clicks/sec before rate limiting kicks in.',                 '20'),
('ops.rate_limit_suspicious_threshold','15',   'integer', 'ops', 'Sustained clicks/sec that flags a player as suspicious.',       '15');
```

---

## 10. Migration File

- [ ] **SCH-1:** All tables, indexes, constraints, and seed data in this document must be created via a single SQL migration file: `/db/007_onboarding_and_admin.sql`.
- [ ] **SCH-2:** Tables must be created in dependency order: `players` → `player_settings` → `character_classes` → `player_characters` → `support_tickets` → `support_replies` → `support_attachments` → `server_config` → `activity_events` → `admin_audit_log`.
- [ ] **SCH-3:** Case-insensitive unique constraints on `players.alias` and `player_characters.character_name` must use `CREATE UNIQUE INDEX ... ON ... (LOWER(...))` expressions.
- [ ] **SCH-4:** The migration must be idempotent — use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.

---

*Last Updated: 2026-02-27*
