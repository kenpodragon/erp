# 1_ONBOARDING_INIT_RECS: Onboarding, Authentication, Profiles & Initial Admin Panel

This document defines the complete requirements for the **first implementation phase** of the Elysium Rising mmorPg (ERP) — everything a player touches from first visit to "ready to play," plus the administrative foundation needed to manage users, configuration, support, and observability from day one.

---

## 1. Overview

### 1.1 Purpose
Build the complete player-facing onboarding pipeline (Splash → Auth → Profile → Character Creation → Home Base) and the administrative backbone (User Management, Server Config, Support Ticketing, Activity Logs & Analytics). This phase produces a fully functional "lobby" — players can sign up, create characters, and land in a Home Base ready for gameplay features to be wired in.

### 1.2 Scope
- **Player Frontend:** Splash page, onboarding flow, profile management, character creation, Home Base stub.
- **Admin Dashboard:** User management, server config, support ticket management, activity logs & analytics dashboards.
- **Backend API:** Auth middleware, player/profile/character CRUD, support ticketing, config management, event logging.
- **Database:** All player, character, config, support, and logging tables — see companion doc [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md) for full schema.
- **Payments:** Stripe integration is **out of scope** for this document. Payment UI appears post-onboarding in the Home Base / Settings area (see REQ §3 in REQUIREMENTS.md).

### 1.3 Current State
| Component | Status | Notes |
|-----------|--------|-------|
| Firebase Google SSO (Frontend) | ✅ Working | `signInWithPopup()` in `frontend/src/App.tsx`. |
| Firebase Google SSO (Admin) | ✅ Working | Integrated in `admin/src/App.tsx`. |
| Backend Auth Middleware | ✅ Working | Implemented in `backend/auth.py`. |
| Backend Endpoints | ✅ Working | CRUD for profiles, characters, support, and config active. |
| SQLModel Models | ✅ Working | Defined in `backend/models.py`. |
| DB Tables (Player) | ✅ Working | Created via `db/002_onboarding_and_admin.sql`. |
| Admin Dashboard UI | ✅ Working | Config and Support screens active. |

### 1.4 Dependencies
| Package | Purpose | Status |
|---------|---------|--------|
| `firebase-admin` | Backend JWT validation | ✅ Used in `backend/auth.py` |
| `sqlmodel` / `sqlalchemy` | ORM for all new tables | ✅ Core of `backend/db.py` and `models.py` |
| `psycopg2-binary` | PostgreSQL driver | ✅ Working |
| `python-dotenv` | Environment variable loading | ✅ Working |
| `stripe` | Payment webhooks (future — not this phase) | **Not yet added** |
| `Pillow` or equivalent | Avatar image processing/resizing | ✅ Used for avatar uploads |

---

## 2. Authentication & Session Management

### 2.1 Player Authentication (Frontend)

- [x] **FR-2.1:** The frontend authenticates players via **Firebase Google SSO** using `signInWithPopup()` (already implemented).
- [x] **FR-2.2:** After successful Firebase authentication, the frontend must obtain a **Firebase ID Token** (`user.getIdToken()`) and include it as a `Bearer` token in the `Authorization` header of **every** backend API request.
- [x] **FR-2.3:** The frontend must handle token refresh transparently — Firebase tokens expire after 1 hour. Use `onIdTokenChanged()` to auto-refresh and update the stored token.
- [x] **FR-2.4:** If a backend request returns `401 Unauthorized`, the frontend must attempt a silent token refresh. If the refresh fails, redirect the player to the Splash page with a "Session expired" message.
- [x] **FR-2.5:** On logout, the frontend must call `firebase.auth().signOut()`, clear all local state (tokens, player data), and redirect to the Splash page.

### 2.2 Admin Authentication

- [x] **FR-2.6:** Admin authentication uses the same Firebase Google SSO flow as the player frontend.
- [ ] **FR-2.7:** **Backend-enforced access control:** The admin panel must send the Firebase ID Token to the backend. The backend validates: (a) the token is valid, (b) the email is in the `ADMIN_ALLOWED_EMAILS` list (server-side env var), and (c) the request IP is in the `ADMIN_ALLOWED_IPS` list (server-side env var).
- [ ] **FR-2.8:** The existing client-side email/IP whitelist in `admin/src/App.tsx` should be **retained as a UX optimization** (fast rejection without a round-trip) but must **not be the sole enforcement mechanism**.
- [ ] **FR-2.9:** If backend admin validation fails, return `403 Forbidden` with a generic "Access denied" message (do not reveal which check failed).
- [ ] **FR-2.10:** All admin API routes must be under a `/api/admin/` prefix and require admin validation middleware.

### 2.3 Backend Auth Middleware

- [x] **FR-2.11:** Create a FastAPI dependency `get_current_player()` that:
  1. Extracts the `Bearer` token from the `Authorization` header.
  2. Verifies it using `firebase_admin.auth.verify_id_token()`.
  3. Returns the decoded token (containing `uid`, `email`, `name`, `picture`).
  4. Raises `401 Unauthorized` if the token is missing, expired, or invalid.
- [x] **FR-2.12:** Create a FastAPI dependency `get_current_admin()` that:
  1. Calls `get_current_player()` for base token validation.
  2. Checks the decoded email against `ADMIN_ALLOWED_EMAILS` (comma-separated env var).
  3. Checks the request IP (`request.client.host` or `X-Forwarded-For` header for Cloud Run) against `ADMIN_ALLOWED_IPS`.
  4. Raises `403 Forbidden` if either check fails.
- [x] **FR-2.13:** All `/api/players/` and `/api/game/` routes must use `get_current_player()` as a dependency.
- [x] **FR-2.14:** All `/api/admin/` routes must use `get_current_admin()` as a dependency.
- [x] **FR-2.15:** Firebase Admin SDK must be initialized on backend startup using the service account credentials (via `GOOGLE_APPLICATION_CREDENTIALS` env var or `FIREBASE_CREDENTIALS` JSON env var).

---

## 3. Player Profiles

### 3.1 Profile Creation & Storage

- [x] **FR-3.1:** When a player authenticates for the **first time**, the backend must create a `players` record populated from the Firebase token data (`firebase_uid`, `email`, Google `display_name`, Google `avatar_url`).
- [x] **FR-3.2:** When a player authenticates on **subsequent visits**, the backend must update `last_login_at` and optionally sync the Google `email` / `avatar_url` if they've changed.
- [x] **FR-3.3:** Players must be able to set a **custom display name (alias)** that is different from their Google name. This alias is what other players see in leaderboards, chat, etc.
  - Alias must be 3-20 characters, alphanumeric + underscores + hyphens only.
  - Alias must be unique across all players (case-insensitive).
  - Profanity filter on alias (use a blocklist — can be simple for MVP, expanded later).
- [x] **FR-3.4:** Players must be able to choose from a set of **preset avatars**.
  - Preset avatars: 8-12 themed options stored as static assets (dark fantasy aesthetic).
  - If no preset is chosen, fall back to the Google profile picture. If that's unavailable, use a default silhouette.
- [x] **FR-3.5:** Profile data must include a `terms_accepted_at` timestamp. This field is `NULL` until the player accepts terms during onboarding.
- [x] **FR-3.6:** Players with `is_banned = true` must be blocked from all API access. The `get_current_player()` middleware must check this flag after token validation and return `403 Forbidden` with message "Account suspended. Contact support."

### 3.2 Profile API Endpoints

- [x] **FR-3.7:** `POST /api/auth/login`
  - **Input:** Firebase ID Token (via `Authorization` header). No request body needed.
  - **Behavior:** Validate token. Upsert `players` record. Return player profile + character list + `is_new_player` boolean.
  - **Response:** `{ player: {...}, characters: [...], is_new_player: bool }`
- [x] **FR-3.8:** `GET /api/players/me`
  - **Auth:** `get_current_player()`
  - **Response:** Full player profile (id, alias, email, avatar_url, terms_accepted_at, created_at, settings).
- [x] **FR-3.9:** `PATCH /api/players/me`
  - **Auth:** `get_current_player()`
  - **Input:** `{ alias?: string, avatar_preset?: string }`
  - **Behavior:** Validate alias uniqueness/format if provided. Update fields.
- [x] **FR-3.10:** `POST /api/players/me/avatar`
  - **Auth:** `get_current_player()`
  - **Input:** Multipart form upload (image file).
  - **Behavior:** Validate file type/size. Resize. Store. Update `avatar_url` in DB.
- [x] **FR-3.11:** `POST /api/players/me/accept-terms`
  - **Auth:** `get_current_player()`
  - **Behavior:** Set `terms_accepted_at = NOW()`. Idempotent (calling again is a no-op).
- [x] **FR-3.12:** `PATCH /api/players/me/settings`
  - **Auth:** `get_current_player()`
  - **Input:** `{ audio_enabled?: bool, music_volume?: int (0-100), sfx_volume?: int (0-100), narration_speed?: float (0.5-2.0) }`

---

## 4. Character System

### 4.1 Character Classes

- [x] **FR-4.1:** The game supports **4-6 character classes** derived from the *Towers of Elysium* lore. Exact class names, descriptions, and stat distributions must be determined during implementation by consulting `../Books/BOOKS.md` and the extracted entity/narrative data in the DB.
- [x] **FR-4.2:** Each class is defined by:
  - `name` (VARCHAR 50): Class name (e.g., "Sentinel", "Arcanist").
  - `lore_blurb` (TEXT): 2-3 sentence flavor text from the books explaining the archetype.
  - `base_strength` (INTEGER): Starting STR stat.
  - `base_agility` (INTEGER): Starting AGI stat.
  - `base_intelligence` (INTEGER): Starting INT stat.
  - `sprite_key` (VARCHAR 100): Reference key for the class's default character art (placeholder initially).
  - `is_available` (BOOLEAN): Whether players can currently select this class. Default `true`. Allows admins to add/disable classes without code changes.
- [x] **FR-4.3:** Character classes are **seeded via SQL** in the migration script. They are **not** player-created. Admins can edit class definitions (stats, lore, availability) via the Admin panel.

### 4.2 Character Creation

- [x] **FR-4.4:** Each player may create **one character** for the MVP. (Multi-character support is deferred — the DB schema supports it, but the UI enforces a limit of 1.)
- [x] **FR-4.5:** Character creation requires:
  - **Character Name:** 3-20 characters, alphanumeric + spaces + hyphens. Must be unique across all characters (case-insensitive). Profanity filtered.
  - **Class Selection:** Player picks from available classes.
- [x] **FR-4.6:** On character creation, the backend must:
  1. Validate name uniqueness and format.
  2. Create the `player_characters` record with stats copied from the selected class's base stats.
  3. Initialize a `player_progress` record pointing to Book 1, Chapter 1, Scene 1, Beat 1.
  4. Initialize a `player_essence` record with `current_balance = 0`, `passive_rate = 0`.
  5. Return the created character with all associated state.
- [x] **FR-4.7:** Character names **cannot be changed** after creation (for MVP). Display name (alias) on the player profile is the mutable identity.

### 4.3 Character API Endpoints

- [x] **FR-4.8:** `POST /api/players/me/characters`
  - **Auth:** `get_current_player()`
  - **Input:** `{ character_name: string, class_id: int }`
  - **Behavior:** Validate, create character + initialize game state (progress, essence). Return `409 Conflict` if player already has a character (MVP limit).
  - **Response:** `{ character: {...}, progress: {...}, essence: {...} }`
- [x] **FR-4.9:** `GET /api/players/me/characters`
  - **Auth:** `get_current_player()`
  - **Response:** Array of characters (will be 0 or 1 for MVP) with class info, level, last_played.
- [x] **FR-4.10:** `GET /api/players/me/characters/{character_id}`
  - **Auth:** `get_current_player()`. Verify ownership.
  - **Response:** Full character detail (stats, class, progress summary, essence balance).
- [x] **FR-4.11:** `GET /api/game/classes`
  - **Auth:** None required (public endpoint — for displaying classes on the creation screen before full auth if needed).
  - **Response:** Array of available classes (where `is_available = true`) with name, lore_blurb, base stats, sprite_key.

---

## 5. Frontend: Splash Page & Onboarding Flow

### 5.1 Splash Page (Public — Unauthenticated)

The Splash page is the **public-facing entry point** for the game. It replaces the current "Hello World" frontend dashboard at the root route (`/`).

- [x] **FR-5.1:** The Splash page is accessible at `/` (root URL) for unauthenticated users.
- [x] **FR-5.2:** Visual design: dark fantasy aesthetic consistent with the *Towers of Elysium* theme.
  - Animated title/logo: "Elysium Rising" with a subtle particle or mist effect.
  - Background: atmospheric image or looping video (dark tower, swirling clouds — placeholder for MVP, upgrade later).
  - Tagline: A short lore-flavored hook (1-2 sentences, derived from Book 1 opening).
- [x] **FR-5.3:** Primary CTA button: **"Begin Your Ascent"** (or similar lore-flavored text). Triggers Firebase Google SSO popup.
- [x] **FR-5.4:** Secondary content (below fold or accessible via scroll/links):
  - **"About the Game"** section: Brief description of the game (incremental MMORPG, book-driven, competitive).
  - **"The Story"** section: 1-paragraph teaser about the Towers of Elysium narrative (no spoilers).
  - **"How It Works"** section: 3-4 bullet points or icons explaining core mechanics (Click, Listen, Progress, Compete).
- [x] **FR-5.5:** Footer: links to Terms of Service, Privacy Policy, and a "Contact Support" link.
- [x] **FR-5.6:** If a player is **already authenticated** (valid Firebase session in local storage), skip the Splash and route directly to Home Base (or Character Creation if they haven't completed onboarding).
- [x] **FR-5.7:** Mobile-responsive layout. All content readable and CTA accessible on screens down to 360px width.

### 5.2 Onboarding Flow (Post-Authentication)

After the player completes Google SSO, the frontend orchestrates the onboarding pipeline. This flow runs **once** for new players and is skipped for returning players with existing characters.

- [x] **FR-5.8:** On successful Firebase auth, the frontend calls `POST /api/auth/login`.
  - If `is_new_player = true` → enter onboarding flow (Step 1).
  - If `is_new_player = false` AND player has characters → route to Home Base.
  - If `is_new_player = false` AND player has NO characters (edge case: profile exists but no character) → route to Character Creation (Step 3).
- [x] **FR-5.9:** If `terms_accepted_at` is `NULL` → show Terms acceptance before any other step.

#### Step 1: Terms of Service Acceptance
- [x] **FR-5.10:** Display a modal or full-page overlay with the Terms of Service and Privacy Policy text.
- [x] **FR-5.11:** Player must scroll to the bottom (or check a checkbox) AND click "I Accept" to proceed.
- [x] **FR-5.12:** On acceptance, call `POST /api/players/me/accept-terms`. Block progression until the API confirms.
- [x] **FR-5.13:** The Terms text itself should be stored as a static asset or fetched from a CMS/config endpoint (so it can be updated without redeploying). For MVP, a static markdown file rendered in-app is acceptable.

#### Step 2: Profile Setup
- [x] **FR-5.14:** Display the player's Google name and avatar as defaults.
- [x] **FR-5.15:** Allow the player to set a custom **alias** (display name). Show validation feedback in real-time (length, allowed characters, uniqueness check via debounced API call).
- [x] **FR-5.16:** Allow the player to upload a custom avatar or select from preset avatars. Show a preview.
- [x] **FR-5.17:** "Continue" button calls `PATCH /api/players/me` with the alias and avatar choice.
- [x] **FR-5.18:** This step is **skippable** — if the player clicks "Skip," they keep their Google name/avatar and can customize later from Settings.

#### Step 3: Character Creation
- [x] **FR-5.19:** Fetch class list from `GET /api/game/classes`.
- [x] **FR-5.20:** Display class selection as cards: each card shows class name, lore blurb (2-3 sentences), stat distribution (STR/AGI/INT) as a visual bar or radar chart, and the class sprite (placeholder for MVP).
- [x] **FR-5.21:** Player enters a character name. Real-time validation (length, format, uniqueness via debounced API call or on-submit).
- [x] **FR-5.22:** "Create Character" button calls `POST /api/players/me/characters`. On success, transition to Step 4.
- [x] **FR-5.23:** On validation error (name taken, profanity detected, etc.), display the error inline without losing the player's input.

#### Step 4: Welcome / Tutorial Prompt
- [x] **FR-5.24:** Brief "Welcome to Elysium" interstitial screen. Displays the character name, class, and a lore-flavored welcome message.
- [x] **FR-5.25:** Two CTAs: **"Begin Adventure"** (routes to the game / Chapter 1) and **"Explore Home Base"** (routes to Home Base).
- [x] **FR-5.26:** This screen is shown **once** after character creation. Returning players never see it.

### 5.3 Home Base (Post-Login Landing)

The Home Base is the **authenticated player's hub** — where they return between gameplay sessions and access all non-combat features.

- [x] **FR-5.27:** Home Base is the default post-login route for returning players (`/home` or `/`).
- [x] **FR-5.28:** Display:
  - Character card: name, class, level, avatar, last played.
  - **"Continue Adventure"** button: resumes gameplay at the player's current chapter/scene/beat.
  - Quick stats: total Essence earned, current chapter, playtime (from activity logs).
- [x] **FR-5.29:** Navigation to (as placeholders for future implementation):
  - **Leaderboard** (stub — "Coming Soon").
  - **Achievements** (stub — "Coming Soon").
  - **Shop / Payments** (stub — "Coming Soon"). Stripe integration goes here post-onboarding.
  - **Support** (links to Support Ticket submission).
  - **Settings** (profile edit, audio preferences, account management).
- [x] **FR-5.30:** **Settings page** allows:
  - Edit alias and avatar (same UI as onboarding Step 2, but accessed from settings).
  - Audio preferences: toggle audio, adjust music/SFX/narration volumes.
  - "Logout" button.
  - "Delete Account" (deferred — flag for BGL phase). For now, show "Contact support to delete your account."
- [x] **FR-5.31:** Mobile-responsive. Home Base must work on mobile browsers.

---

## 6. Support Ticket System

### 6.1 Overview
A full-featured support ticket system allowing players to submit issues and communicate with support staff (admins). Supports categories, priorities, status workflows, threaded replies, and file attachments.

### 6.2 Ticket Lifecycle
```
Player submits ticket → [open]
  Admin views and assigns → [in_progress]
    Admin or player adds replies → (still [in_progress])
    Admin resolves → [resolved]
      Player confirms or auto-close after 7 days → [closed]
      Player reopens → [in_progress]
```

### 6.3 Player-Facing Requirements

- [x] **FR-6.1:** Players access support from the Home Base via a "Support" link and from the footer of every page.
- [x] **FR-6.2:** **Submit Ticket** form:
  - **Category** (dropdown): `bug_report`, `account_issue`, `payment_issue`, `feedback`, `other`.
  - **Subject** (text, required): 5-100 characters.
  - **Description** (textarea, required): 20-5000 characters. Supports plain text only (no markdown/HTML for security).
  - **Priority** (auto-assigned): All player-submitted tickets default to `normal`. Admins can escalate.
- [x] **FR-6.3:** **My Tickets** view:
  - List of player's submitted tickets with: subject, category, status (color-coded badge), created date, last updated date.
  - Sortable by date and status. Filterable by status.
  - Click to open ticket detail.
- [x] **FR-6.4:** **Ticket Detail** view (player):
  - Ticket metadata: subject, category, status, created date.
  - Threaded reply chain: all messages in chronological order. Each message shows author (player or "Support Team"), timestamp, and content.
  - Reply form: text area (20-5000 chars).
  - Players can reply to `open` and `in_progress` tickets. Cannot reply to `closed` tickets unless they reopen.
- [x] **FR-6.5:** **Reopen Ticket:** Players can reopen a `resolved` or `closed` ticket by clicking "Reopen" and providing a reason (required text, 10-500 chars). Status returns to `in_progress`.
- [x] **FR-6.6:** **Auto-close:** Tickets in `resolved` status for 7 days without player response are automatically closed. (Backend cron job or on-access check.)

### 6.4 Admin-Facing Requirements

- [x] **FR-6.7:** **Ticket Queue** (admin dashboard):
  - List all tickets across all players with: ticket ID, player alias/email, subject, category, priority, status, assigned admin, created date, last updated.
  - Filterable by: status, category, priority, assigned admin, date range.
  - Sortable by: date, priority, status, last updated.
  - Default sort: `open` tickets first, then by priority (high → normal → low), then by created date (oldest first).
- [x] **FR-6.8:** **Ticket Detail** (admin):
  - All fields visible to the player PLUS:
    - **Priority** (editable dropdown): `low`, `normal`, `high`, `critical`.
    - **Assigned Admin** (editable dropdown): list of admin emails from `ADMIN_ALLOWED_EMAILS`.
    - **Internal Notes** (textarea): admin-only notes not visible to the player. Threaded like replies.
    - **Player Profile Link:** Quick link to the player's admin profile view.
  - Admin can change status: `open` → `in_progress`, `in_progress` → `resolved`, any → `closed`.
  - Admin can reply (visible to player) or add internal notes (admin-only).
- [x] **FR-6.9:** **Quick Actions:**
  - "Resolve and Reply" — submit a reply + change status to `resolved` in one action.
  - "Close" — close the ticket with an optional closing note.
  - "Escalate" — change priority to `critical` and send an internal note.
- [x] **FR-6.10:** **Ticket Stats** (on admin dashboard home):
  - Open tickets count, In-progress count, average resolution time, tickets created today/this week.

### 6.5 Support API Endpoints

- [x] **FR-6.11:** `POST /api/support/tickets` — Player creates a ticket.
- [x] **FR-6.12:** `GET /api/support/tickets` — Player lists their own tickets (paginated).
- [x] **FR-6.13:** `GET /api/support/tickets/{ticket_id}` — Player views ticket detail (must be owner).
- [x] **FR-6.14:** `POST /api/support/tickets/{ticket_id}/replies` — Player or admin posts a reply.
- [x] **FR-6.15:** `PATCH /api/support/tickets/{ticket_id}/reopen` — Player reopens a resolved/closed ticket.
- [x] **FR-6.16:** `GET /api/admin/support/tickets` — Admin lists all tickets (paginated, filterable).
- [x] **FR-6.17:** `PATCH /api/admin/support/tickets/{ticket_id}` — Admin updates priority, status, assignment.
- [x] **FR-6.18:** `POST /api/admin/support/tickets/{ticket_id}/notes` — Admin adds internal note.

---

## 7. Admin: User Management

### 7.1 Player List

- [x] **FR-7.1:** Admin dashboard displays a **paginated, searchable player list**.
  - Columns: ID, Alias, Email, Character(s), Created At, Last Login, Status (active/banned).
  - Search by: alias (partial match), email (partial match), Firebase UID (exact match).
  - Filter by: status (active, banned, all), has character (yes/no), registration date range.
  - Sortable by: created_at, last_login_at, alias.
  - Default: sorted by last_login_at descending (most recently active first).
- [x] **FR-7.2:** Player count summary at the top: Total Players, Active (logged in within 30 days), Banned.

### 7.2 Player Detail View

- [x] **FR-7.3:** Clicking a player opens their detail view showing:
  - **Profile:** Alias, email, Firebase UID, avatar, created_at, last_login_at, terms_accepted_at.
  - **Characters:** List of characters with name, class, level, created_at, last_played_at. Click to expand full stats.
  - **Activity Summary:** Login count (last 30 days), total playtime, current chapter, total essence earned.
  - **Support Tickets:** Recent tickets for this player (last 5), with link to full ticket list filtered by player.
  - **Admin Actions:** Ban/Unban, Edit Alias, Reset Password (N/A for SSO — note this), Force Logout (invalidate sessions).

### 7.3 Ban/Unban

- [x] **FR-7.4:** Admins can **ban** a player, which sets `is_banned = true` and records:
  - `banned_at` timestamp.
  - `banned_by` (admin email).
  - `ban_reason` (required text, 10-500 chars).
- [x] **FR-7.5:** Banned players are immediately blocked from all API access (enforced by `get_current_player()` middleware).
- [x] **FR-7.6:** Admins can **unban** a player, which sets `is_banned = false` and records `unbanned_at` and `unbanned_by`.
- [x] **FR-7.7:** Ban/unban actions must require a confirmation modal ("Are you sure you want to ban [alias]? This will immediately terminate their session.").
- [x] **FR-7.8:** Ban/unban actions are logged in the **admin audit log** (see §9).

### 7.4 Admin API Endpoints

- [x] **FR-7.9:** `GET /api/admin/players` — Paginated player list (search, filter, sort params).
- [x] **FR-7.10:** `GET /api/admin/players/{player_id}` — Full player detail.
- [x] **FR-7.11:** `POST /api/admin/players/{player_id}/ban` — Ban player. Input: `{ reason: string }`.
- [x] **FR-7.12:** `POST /api/admin/players/{player_id}/unban` — Unban player.
- [x] **FR-7.13:** `PATCH /api/admin/players/{player_id}` — Edit player fields (alias, avatar override).
- [x] **FR-7.14:** `GET /api/admin/players/{player_id}/activity` — Player activity summary.

---

## 8. Admin: Server Config Management

### 8.1 Overview
A dynamic configuration system that stores key-value settings in the database, editable via the admin panel, without requiring code redeployment. Covers both game tuning parameters and operational settings.

### 8.2 Config Categories

#### Game Tuning
- [x] **FR-8.1:** The following game settings must be configurable:
  - `game.essence_per_click` (NUMERIC): Base essence earned per click. Default: `1.0`.
  - `game.crit_chance` (NUMERIC): Probability of a critical click (0.0-1.0). Default: `0.05`.
  - `game.crit_multiplier` (NUMERIC): Damage/essence multiplier on crit. Default: `2.0`.
  - `game.xp_multiplier` (NUMERIC): Global XP multiplier. Default: `1.0`.
  - `game.drop_rate_multiplier` (NUMERIC): Global drop rate multiplier. Default: `1.0`.
  - `game.offline_cap_chapters` (INTEGER): Max chapters worth of offline progress. Default: `1`.
  - `game.max_characters_per_player` (INTEGER): Character creation limit. Default: `1`.

#### Operational Settings
- [x] **FR-8.2:** The following operational settings must be configurable:
  - `ops.maintenance_mode` (BOOLEAN): If `true`, all player API endpoints return `503 Service Unavailable` with a message. Default: `false`.
  - `ops.maintenance_message` (TEXT): Message shown during maintenance. Default: `"Elysium is undergoing maintenance. Please return shortly."`.
  - `ops.registration_open` (BOOLEAN): If `false`, new player registration is blocked (existing players can still log in). Default: `true`.
  - `ops.announcement_banner` (TEXT): If non-empty, displayed as a banner at the top of the frontend/Home Base. Default: `""` (empty = hidden).
  - `ops.announcement_banner_type` (VARCHAR): `info`, `warning`, `error`. Controls banner color. Default: `info`.
  - `ops.rate_limit_clicks_per_second` (INTEGER): Max clicks/sec before rate limiting. Default: `20`.
  - `ops.rate_limit_suspicious_threshold` (INTEGER): Sustained clicks/sec that flags a player as suspicious. Default: `15`.

### 8.3 Config Storage

- [x] **FR-8.3:** Config values are stored in the `server_config` table (see [Schema doc §4](1_ONBOARDING_INIT_SCHEMA.md#4-server-config-table)). Each entry has a key, value, type, category, description, and default. Values are stored as strings and cast by the application based on `value_type`.
- [x] **FR-8.4:** Config values are **seeded** on first deployment via SQL migration with all default values.
- [x] **FR-8.5:** The backend must **cache** config values in memory (dictionary) on startup and refresh on a configurable interval (default: 60 seconds) or on-demand when an admin changes a value.

### 8.4 Config API & Admin UI

- [x] **FR-8.6:** `GET /api/admin/config` — Return all config keys grouped by category. Include key, value, value_type, description, default_value, updated_at, updated_by.
- [x] **FR-8.7:** `PATCH /api/admin/config/{key}` — Update a single config value. Validate against `value_type`. Log the change in the admin audit log (old value → new value).
- [x] **FR-8.8:** `POST /api/admin/config/{key}/reset` — Reset a config value to its default. Log the change.
- [x] **FR-8.9:** Admin UI: Two-tab layout (Game Settings, Operational Settings). Each setting displayed as a labeled form control (toggle for booleans, number input for integers/numerics, text input for strings, textarea for text). Save button per-setting or a global "Save All Changes" with diff preview.
- [x] **FR-8.10:** Admin UI: "Reset to Default" button per setting. Confirmation required.
- [x] **FR-8.11:** Maintenance mode must take effect **immediately** — the backend config cache must be invalidated when `ops.maintenance_mode` is changed.
- [x] **FR-8.12:** `GET /api/config/public` — **Unauthenticated** endpoint returning only settings the frontend needs: `ops.maintenance_mode`, `ops.maintenance_message`, `ops.announcement_banner`, `ops.announcement_banner_type`, `ops.registration_open`. No game tuning values exposed.

---

## 9. Admin: Activity Logs, Analytics & Audit Trail

### 9.1 Overview
Full observability covering three domains: **player behavior analytics** (what players do), **server audit logs** (what admins do), and **system metrics** (how the platform performs). All stored in PostgreSQL — no external analytics platform required for MVP.

### 9.2 Player Activity Events

- [x] **FR-9.1:** The backend must log the following player events to an `activity_events` table:
  - `player_login` — on successful login.
  - `player_logout` — on logout (via `POST /api/auth/logout`).
  - `character_created` — character creation with class_id.
  - `chapter_started` — player enters a new chapter. *(Deferred — gameplay not yet built)*
  - `chapter_completed` — player completes a chapter. *(Deferred)*
  - `scene_completed` — player completes a scene. *(Deferred)*
  - `upgrade_purchased` — upgrade purchase with upgrade_id and cost. *(Deferred)*
  - `essence_milestone` — player reaches an essence milestone. *(Deferred)*
  - `support_ticket_created` — ticket submission.
  - `profile_updated` — alias or avatar changed.
- [x] **FR-9.2:** Each event is stored in the `activity_events` table (see [Schema doc §5](1_ONBOARDING_INIT_SCHEMA.md#5-activity--audit-tables)) with player_id, event_type, JSONB event_data payload, IP address, user agent, and timestamp.
- [x] **FR-9.3:** Events are written **asynchronously** (fire-and-forget) so they do not impact API response latency. If the event write fails, log the failure but do not raise an error to the player.

### 9.3 Admin Audit Log

- [x] **FR-9.4:** The backend must log all admin actions to the `admin_audit_log` table (see [Schema doc §5](1_ONBOARDING_INIT_SCHEMA.md#5-activity--audit-tables)). Logged actions include:
  - `player_banned`, `player_unbanned`, `player_edited`
  - `config_changed`, `config_reset`
  - `ticket_status_changed`, `ticket_priority_changed`, `ticket_assigned`, `ticket_note_added`
- [x] **FR-9.5:** Audit log records are **immutable** — no update or delete operations. This is an append-only log.

### 9.4 Analytics Dashboard (Admin UI)

- [x] **FR-9.6:** **Overview Cards** (top of admin dashboard):
  - Total Players (all time).
  - Active Players (logged in within 24h / 7d / 30d).
  - New Registrations (today / this week / this month).
  - Open Support Tickets.
- [x] **FR-9.7:** **Player Activity Graph:**
  - Line chart showing daily active users (DAU) over the last 30 days.
  - Selectable time range: 7d, 30d, 90d.
- [x] **FR-9.8:** **Registration Graph:**
  - Bar chart showing new registrations per day over the last 30 days.
- [x] **FR-9.9:** **Chapter Distribution:**
  - Bar chart or table showing how many active players are on each chapter. Identifies where players are getting stuck or dropping off.
- [x] **FR-9.10:** **Recent Activity Feed:**
  - Scrollable list of the last 50 player events (across all players) with: timestamp, player alias, event type, summary.
  - Filterable by event type.
- [x] **FR-9.11:** **Admin Audit Log Viewer:**
  - Paginated, filterable list of admin audit log entries.
  - Filterable by: admin email, action type, target type, date range.
  - Cannot be edited or deleted from the UI.

### 9.5 Analytics API Endpoints

- [x] **FR-9.12:** `GET /api/admin/analytics/overview` — Return overview card stats.
- [x] **FR-9.13:** `GET /api/admin/analytics/dau?range=30d` — Return DAU time series.
- [x] **FR-9.14:** `GET /api/admin/analytics/registrations?range=30d` — Return registration time series.
- [x] **FR-9.15:** `GET /api/admin/analytics/chapter-distribution` — Return player count per chapter.
- [x] **FR-9.16:** `GET /api/admin/analytics/events?type=&limit=50&offset=0` — Return recent activity events (paginated, filterable).
- [x] **FR-9.17:** `GET /api/admin/audit-log?admin=&action=&target_type=&limit=50&offset=0` — Return admin audit log (paginated, filterable).

---

## 10. Database Schema

> **Full schema specification (tables, columns, types, constraints, indexes, cascade chains, and seed data) is defined in the companion document: [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md).**

### 10.1 Tables Overview

| Table | Section | Purpose |
|-------|---------|---------|
| `players` | §1 (Schema) | Player accounts linked to Firebase UID. |
| `player_settings` | §1 (Schema) | Per-player audio/UI preferences. |
| `character_classes` | §2 (Schema) | Class definitions (seeded, admin-editable). |
| `player_characters` | §2 (Schema) | Player-created characters with stats. |
| `support_tickets` | §3 (Schema) | Support ticket headers. |
| `support_replies` | §3 (Schema) | Threaded ticket replies + internal notes. |
| `server_config` | §4 (Schema) | Key-value server configuration. |
| `activity_events` | §5 (Schema) | Player behavior event log. |
| `admin_audit_log` | §5 (Schema) | Immutable admin action audit trail. |

### 10.2 SQL Migration
- [x] **FR-10.1:** All tables must be created via a single SQL migration file: `/db/002_onboarding_and_admin.sql`.
- [x] **FR-10.2:** The migration must include seed data for `character_classes` and `server_config` (see Schema doc §9).
- [x] **FR-10.3:** The migration must include all indexes (see Schema doc §6).
- [x] **FR-10.4:** The migration must be idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

---

## 11. Frontend Routing Summary

| Route | Auth Required | Component | Description |
|-------|---------------|-----------|-------------|
| `/` | No | SplashPage | Public landing page. Redirects to `/home` if authenticated. |
| `/onboarding/terms` | Yes | TermsAcceptance | ToS acceptance (shown once). |
| `/onboarding/profile` | Yes | ProfileSetup | Alias + avatar setup (skippable). |
| `/onboarding/character` | Yes | CharacterCreation | Class selection + naming. |
| `/onboarding/welcome` | Yes | WelcomeScreen | One-time welcome interstitial. |
| `/home` | Yes | HomeBase | Main authenticated hub. |
| `/settings` | Yes | Settings | Profile edit, audio, account. |
| `/support` | Yes | SupportTickets | My tickets list. |
| `/support/new` | Yes | SubmitTicket | New ticket form. |
| `/support/{id}` | Yes | TicketDetail | Ticket detail + replies. |

### Route Guards
- [x] **FR-11.1:** An auth route guard checks Firebase session. If not authenticated → redirect to `/`.
- [x] **FR-11.2:** A terms guard checks `terms_accepted_at`. If null → redirect to `/onboarding/terms`.
- [x] **FR-11.3:** A character guard checks if player has a character. If not → redirect to `/onboarding/character`.
- [x] **FR-11.4:** Guards execute in order: Auth → Terms → Character. The first failing guard takes precedence.

---

## 12. Admin Routing Summary

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Overview cards, analytics graphs, recent activity. |
| `/players` | PlayerList | Paginated, searchable player table. |
| `/players/{id}` | PlayerDetail | Full player profile + actions. |
| `/support` | TicketQueue | All tickets, filterable. |
| `/support/{id}` | TicketDetail | Ticket detail + admin actions. |
| `/config` | ServerConfig | Game + Ops settings editor. |
| `/audit-log` | AuditLog | Admin audit log viewer. |

---

## 13. Non-Functional Requirements

- [x] **NFR-1:** All API endpoints must return responses in **<200ms** under normal load (single-digit concurrent users for MVP).
- [x] **NFR-2:** User-submitted text (alias, character name, ticket content, replies) must be **sanitized** to prevent XSS. Store as plain text, escape on render.
- [x] **NFR-4:** Alias and character name uniqueness checks must be **case-insensitive** (`LOWER()` index + comparison).
- [x] **NFR-5:** The profanity filter for aliases and character names should use a configurable blocklist stored in the backend (text file or DB table). No external API calls for profanity checking.
- [x] **NFR-6:** Activity events (§9.2) must be written **asynchronously** and must not block API responses.
- [x] **NFR-7:** The `activity_events` table will grow large. Include a `created_at` index and plan for a future retention policy (e.g., archive events older than 90 days). Not required for MVP but the schema should support it.
- [x] **NFR-8:** All SQL for this phase goes in `/db/002_onboarding_and_admin.sql` per project convention.
- [x] **NFR-9:** All sensitive operations (ban, unban, config changes) must be recorded in the admin audit log before the response is returned (synchronous write for audit trail integrity).

---

## 14. Error Handling

- [x] **FR-14.1:** Invalid or expired Firebase tokens → `401 Unauthorized` with `{ error: "Invalid or expired authentication token" }`.
- [x] **FR-14.2:** Banned player attempting API access → `403 Forbidden` with `{ error: "Account suspended. Contact support." }`.
- [x] **FR-14.3:** Admin access denied → `403 Forbidden` with `{ error: "Access denied" }` (no detail about which check failed).
- [x] **FR-14.4:** Alias or character name already taken → `409 Conflict` with `{ error: "This name is already taken", field: "alias|character_name" }`.
- [x] **FR-14.5:** Player already has max characters → `409 Conflict` with `{ error: "Character limit reached" }`.
- [x] **FR-14.6:** Validation errors (bad format, too long, etc.) → `422 Unprocessable Entity` with `{ error: "Validation failed", details: [...] }`.
- [x] **FR-14.7:** Maintenance mode active → `503 Service Unavailable` with `{ error: "<maintenance message from config>" }`.
- [x] **FR-14.8:** All error responses must follow a consistent JSON shape: `{ error: string, details?: any, field?: string }`.

---

## 15. Summary of Implementation

| Task | Status | Completion |
|------|--------|------------|
| Database migration | ✅ Complete | 2026-02-28 |
| Backend auth middleware | ✅ Complete | 2026-02-28 |
| Player profile API | ✅ Complete | 2026-02-28 |
| Character API | ✅ Complete | 2026-02-28 |
| Frontend: Splash page | ✅ Complete | 2026-02-28 |
| Frontend: Onboarding flow | ✅ Complete | 2026-02-28 |
| Frontend: Home Base | ✅ Complete | 2026-02-28 |
| Server config system | ✅ Complete | 2026-02-28 |
| Support ticket system | ✅ Complete | 2026-02-28 |
| Admin: User management | ✅ Complete | 2026-02-28 |
| Activity events & audit log | ✅ Complete | 2026-02-28 |
| Admin: Hardened auth | ✅ Complete | 2026-02-28 |

---

*Last Updated: 2026-02-28*
