# Onboarding & Initial Admin Specification

## Purpose
This specification covers the complete player-facing onboarding pipeline (Splash → Auth → Profile → Character Creation → Home Base) and the administrative backbone (User Management, Server Config, Support Ticketing, Activity Logs & Audit Trail). This phase produces a fully functional "lobby" — players can sign up, create characters, and land in a Home Base ready for gameplay features to be wired in.

## Requirements

### Requirement: Firebase Authentication
The system SHALL authenticate players via Firebase Google SSO using `signInWithPopup()`. The frontend SHALL obtain a Firebase ID Token and include it as a `Bearer` token in the `Authorization` header of every backend API request. The system SHALL handle token refresh transparently using `onIdTokenChanged()`. On `401 Unauthorized`, the frontend SHALL attempt a silent token refresh; if that fails it SHALL redirect to the Splash page with a "Session expired" message. On logout the frontend SHALL call `firebase.auth().signOut()`, clear all local state, and redirect to the Splash page.

#### Scenario: New player first login
- GIVEN an unauthenticated user on the Splash page
- WHEN they click "Begin Your Ascent" and complete Google SSO
- THEN the system SHALL call `POST /api/auth/login`, receive `is_new_player: true`, and enter the onboarding flow

#### Scenario: Token expiry during session
- GIVEN a player with an expired Firebase token
- WHEN they make a backend API request
- THEN the frontend SHALL silently refresh the token and retry; if refresh fails SHALL redirect to the Splash page

#### Scenario: Banned player login attempt
- GIVEN a player with `is_banned = true`
- WHEN they authenticate with a valid Firebase token
- THEN the backend SHALL return `403 Forbidden` with message "Account suspended. Contact support."

### Requirement: Admin Access Control
The system SHALL enforce backend admin access control by validating that the Firebase token is valid, the email is in `ADMIN_ALLOWED_EMAILS`, and the request IP is in `ADMIN_ALLOWED_IPS`. All admin API routes SHALL be under `/api/admin/` and require `get_current_admin()` middleware. The client-side email/IP whitelist SHALL be retained as a UX optimization only and SHALL NOT be the sole enforcement mechanism. If backend admin validation fails the system SHALL return `403 Forbidden` with a generic "Access denied" message.

#### Scenario: Authorized admin request
- GIVEN an admin with a valid Firebase token, email in allowlist, and IP in allowlist
- WHEN they access `/api/admin/players`
- THEN the system SHALL return the player list with `200 OK`

#### Scenario: Unauthorized admin access attempt
- GIVEN a player whose email is not in `ADMIN_ALLOWED_EMAILS`
- WHEN they attempt to call any `/api/admin/` endpoint
- THEN the system SHALL return `403 Forbidden` without revealing which check failed

### Requirement: Player Profile Management
The system SHALL create a `players` record on first authentication populated from Firebase token data. On subsequent logins the system SHALL update `last_login_at` and sync Google email/avatar if changed. Players SHALL be able to set a custom alias (3–20 characters, alphanumeric + underscores + hyphens, case-insensitively unique, profanity-filtered). Players SHALL be able to select from 8–12 preset avatars, falling back to Google profile picture, then a default silhouette. The `terms_accepted_at` field SHALL be `NULL` until the player accepts terms during onboarding.

#### Scenario: Alias uniqueness check
- GIVEN a player attempting to set alias "DragonSlayer"
- WHEN another player already holds that alias (case-insensitive)
- THEN the system SHALL return `409 Conflict` and SHALL NOT update the record

#### Scenario: Profile settings sync across devices
- GIVEN a player who changes audio settings on Device A
- WHEN they open Device B before Device A syncs
- THEN Device B SHALL load server-side settings (source of truth on login)

### Requirement: Character Creation
The system SHALL support 4–6 character classes derived from Towers of Elysium lore, each with `name`, `lore_blurb`, base stats (STR/AGI/INT), `sprite_key`, and `is_available` flag. Each player MAY create one character for MVP. Character names SHALL be 3–20 characters, alphanumeric + spaces + hyphens, case-insensitively unique, and profanity-filtered. On creation the backend SHALL initialize `player_progress` (Book 1, Chapter 1, Scene 1, Beat 1), `player_essence` (balance 0, passive rate 0), and copy base stats from the selected class. Character names SHALL NOT be changeable after creation.

#### Scenario: Successful character creation
- GIVEN a player with no existing character who selects "Sentinel" and enters name "Kael"
- WHEN they call `POST /api/players/me/characters`
- THEN the system SHALL create the character, initialize game state, and return `{ character, progress, essence }`

#### Scenario: MVP character limit enforcement
- GIVEN a player who already has one character
- WHEN they attempt `POST /api/players/me/characters` again
- THEN the system SHALL return `409 Conflict`

### Requirement: Onboarding Flow
The system SHALL route new players through four steps: (1) Terms of Service acceptance, (2) Profile Setup, (3) Character Creation, (4) Welcome interstitial. Players with `terms_accepted_at = NULL` SHALL be shown the Terms step before any other step. Returning players with existing characters SHALL be routed directly to Home Base. The Profile Setup step SHALL be skippable. The Welcome interstitial SHALL be shown exactly once after character creation.

#### Scenario: Returning player with character
- GIVEN a player with `is_new_player = false` and an existing character
- WHEN they complete Firebase SSO
- THEN the system SHALL route them directly to Home Base, bypassing all onboarding steps

#### Scenario: Terms acceptance gate
- GIVEN a new player who authenticated but has `terms_accepted_at = NULL`
- WHEN they attempt to access any onboarding step beyond Terms
- THEN the system SHALL block progression until `POST /api/players/me/accept-terms` succeeds

### Requirement: Support Ticket System
The system SHALL provide a support ticket workflow with states: `open` → `in_progress` → `resolved` → `closed`. Players SHALL be able to submit tickets with categories (`bug_report`, `account_issue`, `payment_issue`, `feedback`, `other`) and descriptions (20–5000 chars). Tickets in `resolved` state for 7 days without player response SHALL be automatically closed. Players SHALL be able to reopen `resolved` or `closed` tickets. Admins SHALL be able to post internal notes not visible to players.

#### Scenario: Player submits a bug report
- GIVEN an authenticated player
- WHEN they call `POST /api/support/tickets` with category `bug_report` and valid subject/description
- THEN the system SHALL create the ticket with status `open` and priority `normal`

#### Scenario: Auto-close resolved ticket
- GIVEN a ticket in `resolved` state
- WHEN 7 days pass with no player reply
- THEN the system SHALL automatically transition the ticket to `closed`

### Requirement: Server Configuration Management
The system SHALL store all game tuning and operational settings as key-value pairs in the `server_config` table, editable via admin panel without code redeployment. The backend SHALL cache config values in memory on startup and refresh every 60 seconds or immediately on admin change. Maintenance mode SHALL take effect immediately upon change (cache invalidated). A public unauthenticated endpoint SHALL expose only `ops.*` frontend-needed settings (maintenance mode, banner, registration status) without exposing game tuning values.

#### Scenario: Enabling maintenance mode
- GIVEN `ops.maintenance_mode = false`
- WHEN an admin calls `PATCH /api/admin/config/ops.maintenance_mode` with value `true`
- THEN the system SHALL invalidate the config cache immediately and all subsequent player API requests SHALL return `503 Service Unavailable`

#### Scenario: Resetting config to default
- GIVEN an admin who changed `game.crit_chance` to `0.25`
- WHEN they call `POST /api/admin/config/game.crit_chance/reset`
- THEN the system SHALL restore the value to `0.05` and log the change in the admin audit log

### Requirement: Activity Logging & Admin Audit Trail
The system SHALL log player activity events (login, logout, character creation, ticket submission, profile updates) asynchronously to the `activity_events` table. Event writes SHALL be fire-and-forget and SHALL NOT impact API response latency. All admin actions (ban, unban, config changes, ticket updates) SHALL be logged synchronously to the `admin_audit_log` table with admin email, action type, target, and JSONB details.

#### Scenario: Async event write failure
- GIVEN a player who logs in
- WHEN the `activity_events` write fails
- THEN the system SHALL log the failure internally but SHALL return a successful login response to the player

#### Scenario: Admin ban audit
- GIVEN an admin who bans player ID 42
- WHEN the ban action completes
- THEN the system SHALL write a `player_banned` entry to `admin_audit_log` with the admin's email, target player ID, and ban reason

## Design

### Authentication Architecture
- `get_current_player()` FastAPI dependency: extracts Bearer token, verifies via `firebase_admin.auth.verify_id_token()`, checks `is_banned`, returns decoded token dict.
- `get_current_admin()` dependency: calls `get_current_player()`, then checks email against `ADMIN_ALLOWED_EMAILS` and IP against `ADMIN_ALLOWED_IPS`.
- Firebase Admin SDK initialized on startup via `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_CREDENTIALS` JSON env var.

### Splash Page
- Public route at `/`, dark fantasy aesthetic with "Elysium Rising" animated title, tagline from Book 1 opening.
- Primary CTA: "Begin Your Ascent" (triggers SSO popup).
- Mobile-responsive to 360px width.
- Already-authenticated players are redirected to Home Base.

### Home Base
- Default post-login route (`/home`). Shows character card, "Continue Adventure" button, quick stats.
- Navigation stubs for Leaderboard, Achievements, Shop, Support, Settings.
- Settings page: alias/avatar edit, audio preferences, logout.

## Schema

### `players`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `firebase_uid` | `VARCHAR(128)` | Firebase user ID. `UNIQUE NOT NULL`. |
| `email` | `VARCHAR(255)` | Google account email. `NOT NULL`. |
| `google_display_name` | `VARCHAR(255)` | Display name synced from Google on login. |
| `google_avatar_url` | `TEXT` | Avatar URL synced from Google on login. |
| `alias` | `VARCHAR(20)` | Custom display name. `UNIQUE` (case-insensitive). Nullable. |
| `custom_avatar_url` | `TEXT` | Path to uploaded avatar. Nullable. |
| `avatar_preset_key` | `VARCHAR(50)` | Key of selected preset avatar. Nullable. |
| `terms_accepted_at` | `TIMESTAMPTZ` | When ToS was accepted. Nullable. |
| `is_banned` | `BOOLEAN` | Account ban flag. Default `false`. |
| `banned_at` | `TIMESTAMPTZ` | When banned. Nullable. |
| `banned_by` | `VARCHAR(255)` | Admin email who issued ban. Nullable. |
| `ban_reason` | `TEXT` | Reason for ban. Nullable. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `last_login_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `player_settings`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `UNIQUE ON DELETE CASCADE`. |
| `audio_enabled` | `BOOLEAN` | Master audio toggle. Default `true`. |
| `music_volume` | `SMALLINT` | 0-100. Default `80`. CHECK 0–100. |
| `sfx_volume` | `SMALLINT` | 0-100. Default `80`. CHECK 0–100. |
| `narration_speed` | `NUMERIC(2,1)` | 0.5-2.0. Default `1.0`. CHECK 0.5–2.0. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `character_classes`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `name` | `VARCHAR(50)` | `UNIQUE NOT NULL`. |
| `lore_blurb` | `TEXT` | Flavor text for class selection. |
| `base_strength` | `INTEGER` | Starting STR. Default `10`. |
| `base_agility` | `INTEGER` | Starting AGI. Default `10`. |
| `base_intelligence` | `INTEGER` | Starting INT. Default `10`. |
| `sprite_key` | `VARCHAR(100)` | Reference to class art asset. |
| `is_available` | `BOOLEAN` | Default `true`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `player_characters`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE CASCADE`. |
| `class_id` | `INTEGER FK` | References `character_classes.id`. `ON DELETE RESTRICT`. |
| `character_name` | `VARCHAR(20)` | `UNIQUE` (case-insensitive). |
| `level` | `INTEGER` | Default `1`. |
| `strength` | `INTEGER` | Initialized from class base. |
| `agility` | `INTEGER` | Initialized from class base. |
| `intelligence` | `INTEGER` | Initialized from class base. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `last_played_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `support_tickets`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE CASCADE`. |
| `category` | `VARCHAR(50)` | `bug_report`, `account_issue`, `payment_issue`, `feedback`, `other`. |
| `priority` | `VARCHAR(20)` | `low`, `normal`, `high`, `critical`. Default `normal`. |
| `subject` | `VARCHAR(100)` | Ticket subject. |
| `status` | `VARCHAR(20)` | `open`, `in_progress`, `resolved`, `closed`. Default `open`. |
| `assigned_admin` | `VARCHAR(255)` | Nullable. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `resolved_at` | `TIMESTAMPTZ` | Nullable. |
| `closed_at` | `TIMESTAMPTZ` | Nullable. |

### `support_replies`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL PK` | Auto-incrementing primary key. |
| `ticket_id` | `INTEGER FK` | References `support_tickets.id`. `ON DELETE CASCADE`. |
| `author_type` | `VARCHAR(10)` | `player` or `admin`. |
| `author_id` | `INTEGER` | Player ID if player; null if admin. |
| `author_email` | `VARCHAR(255)` | Email of author (for admin replies). |
| `content` | `TEXT` | Reply text. |
| `is_internal_note` | `BOOLEAN` | Admin-only if `true`. Default `false`. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `server_config`
| Column | Type | Description |
|--------|------|-------------|
| `key` | `VARCHAR(100) PK` | Dotted config key (e.g., `game.essence_per_click`). |
| `value` | `TEXT` | Current value stored as string. |
| `value_type` | `VARCHAR(20)` | `string`, `integer`, `numeric`, `boolean`, `text`. |
| `category` | `VARCHAR(50)` | `game` or `ops`. |
| `description` | `TEXT` | Human-readable description. |
| `default_value` | `TEXT` | Default for reset. |
| `updated_at` | `TIMESTAMPTZ` | Default `NOW()`. |
| `updated_by` | `VARCHAR(255)` | Admin email who last changed this. |

### `activity_events`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `BIGSERIAL PK` | Auto-incrementing. |
| `player_id` | `INTEGER FK` | References `players.id`. `ON DELETE SET NULL`. Nullable. |
| `event_type` | `VARCHAR(50)` | Event type key. |
| `event_data` | `JSONB` | Flexible payload. |
| `ip_address` | `VARCHAR(45)` | Client IP (supports IPv6). |
| `user_agent` | `TEXT` | Browser user agent. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### `admin_audit_log`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `BIGSERIAL PK` | Auto-incrementing. |
| `admin_email` | `VARCHAR(255)` | Admin who performed the action. |
| `action` | `VARCHAR(50)` | Action type. |
| `target_type` | `VARCHAR(50)` | `player`, `config`, `ticket`. |
| `target_id` | `VARCHAR(100)` | Affected entity ID. |
| `details` | `JSONB` | Action-specific data. |
| `ip_address` | `VARCHAR(45)` | Admin IP. |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()`. |

### Cascade Delete Chain
```
players
  ├── player_settings        (ON DELETE CASCADE)
  ├── player_characters      (ON DELETE CASCADE)
  ├── support_tickets        (ON DELETE CASCADE)
  │     └── support_replies  (ON DELETE CASCADE)
  └── activity_events        (ON DELETE SET NULL — preserves event history)
```
`character_classes` uses `ON DELETE RESTRICT` from `player_characters.class_id`.

### Migration
All tables, indexes, constraints, and seed data reside in `/db/007_onboarding_and_admin.sql`. Tables are created in dependency order. Case-insensitive unique constraints use `CREATE UNIQUE INDEX ... ON ... (LOWER(...))`. Migration is idempotent via `CREATE TABLE IF NOT EXISTS`.
