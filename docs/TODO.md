# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).

---
*Updated: 2026-02-27*

## Phase 7: Onboarding, Profiles & Initial Admin 🧭
> **Requirements:** [1_ONBOARDING_INIT_RECS.md](1_ONBOARDING_INIT_RECS.md) | **Schema:** [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md)

- [ ] **7.1 — Database Migration** *(RECS §10, SCHEMA §1-10)*
  - [x] Create `/db/002_onboarding_and_admin.sql` with all 10 tables (players, player_settings, character_classes, player_characters, support_tickets, support_replies, support_attachments, server_config, activity_events, admin_audit_log).
  - [x] Add all CHECK constraints (volume ranges, enum values for category/priority/status/author_type/value_type).
  - [x] Add all indexes (14 indexes — see SCHEMA §6).
  - [x] Add case-insensitive UNIQUE indexes on `LOWER(alias)` and `LOWER(character_name)`.
  - [x] Seed `character_classes` with 4 placeholder classes (names/stats TBD from book lore — consult BOOKS.md and extracted DB data).
  - [x] Seed `server_config` with all 14 config keys and default values (see SCHEMA §9.2).
  - [x] Use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for idempotency.
  - [x] Run migration against Cloud SQL and verify all tables created.

- [ ] **7.2 — Backend Auth Middleware** *(RECS §2.3, FR-2.11 through FR-2.15)*
  - [x] Initialize Firebase Admin SDK on backend startup (`GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_CREDENTIALS` env var). → `backend/auth.py:init_firebase()`
  - [x] Create `get_current_player()` FastAPI dependency: extract Bearer token → `verify_id_token()` → return decoded token. 401 if invalid/missing.
  - [x] Add ban check inside `get_current_player()`: query `players.is_banned` → 403 if banned (FR-3.6).
  - [x] Create `get_current_admin()` FastAPI dependency: calls `get_current_player()` → check email against `ADMIN_ALLOWED_EMAILS` env var → check IP against `ADMIN_ALLOWED_IPS` env var → 403 if either fails.
  - [x] Handle `X-Forwarded-For` header for Cloud Run IP resolution. → `backend/auth.py:get_client_ip()`
  - [x] Wire `get_current_player()` onto `/api/players/me` stub route.
  - [x] Wire `get_current_admin()` onto `/api/admin/ping` stub route.
  - [x] Create `api.ts` on frontend + admin — wraps `fetch()` with `Authorization: Bearer <token>`, auto-refresh on 401.
  - [x] Frontend `App.tsx`: after login, verifies token against backend `/api/players/me`.
  - [x] Admin `App.tsx`: after client-side email/IP check, verifies against backend `/api/admin/ping`.
  - [x] Test: valid token returns decoded user. Expired token returns 401. Non-admin email returns 403.

- [x] **7.3 — Player Profile API** *(RECS §3.2, FR-3.7 through FR-3.12)*
  - [x] Create SQLModel models for `players` and `player_settings`.
  - [x] `POST /api/auth/login` — validate token, upsert player, return profile + characters + `is_new_player`.
  - [x] `GET /api/players/me` — return full player profile with settings.
  - [x] `PATCH /api/players/me` — update alias (validate uniqueness, format, profanity filter) and/or avatar preset.
  - [x] `POST /api/players/me/avatar` — multipart upload, validate type/size (JPEG/PNG, max 2MB), resize to 128x128 + 256x256 (Pillow), store to filesystem/GCS, update DB.
  - [x] `POST /api/players/me/accept-terms` — set `terms_accepted_at = NOW()`, idempotent.
  - [x] `PATCH /api/players/me/settings` — update audio_enabled, music_volume, sfx_volume, narration_speed with validation.
  - [x] Add `Pillow` to `requirements.txt`.
  - [x] Create profanity blocklist file (simple text list in backend).

- [ ] **7.4 — Character System API** *(RECS §4.3, FR-4.8 through FR-4.11)*
  - [x] Create SQLModel models for `character_classes` and `player_characters`.
  - [ ] `GET /api/game/classes` — public endpoint, return available classes (where `is_available = true`).
  - [ ] `POST /api/players/me/characters` — validate name (uniqueness, format, profanity), check MVP 1-character limit (409 if exists), copy base stats from class, create character record. Also initialize `player_progress` (Book 1, Ch 1, Scene 1, Beat 1) and `player_essence` (balance=0, rate=0).
  - [ ] `GET /api/players/me/characters` — list player's characters with class info.
  - [ ] `GET /api/players/me/characters/{character_id}` — full detail with stats, class, progress summary, essence balance. Verify ownership.

- [ ] **7.5 — Frontend: Splash Page** *(RECS §5.1, FR-5.1 through FR-5.7)*
  - [ ] Replace current Hello World dashboard at `/` with Splash page.
  - [ ] Dark fantasy design: animated "Elysium Rising" title, atmospheric background, tagline from Book 1. (Use book styling from cover image from book).
  - [ ] "Begin Your Ascent" CTA → triggers Firebase Google SSO popup.
  - [ ] Below-fold content: "About the Game", "The Story" teaser, "How It Works" (3-4 bullet points).
  - [ ] Footer: Terms of Service, Privacy Policy, Contact Support links.
  - [ ] Auto-redirect to `/home` if already authenticated (FR-5.6).
  - [ ] Mobile-responsive down to 360px.

- [ ] **7.6 — Frontend: Onboarding Flow** *(RECS §5.2, FR-5.8 through FR-5.26)*
  - [ ] Post-auth routing logic: call `POST /api/auth/login` → check `is_new_player` + character existence → route accordingly (FR-5.8).
  - [ ] Step 1 — Terms of Service: modal/overlay, require scroll/checkbox + "I Accept", call `POST /api/players/me/accept-terms` (FR-5.10–5.13).
  - [ ] Step 2 — Profile Setup: show Google name/avatar as defaults, alias input with real-time validation (debounced uniqueness check), avatar upload/preset selection, "Skip" option (FR-5.14–5.18).
  - [ ] Step 3 — Character Creation: fetch classes from `GET /api/game/classes`, display as cards (name, lore, stat bars, sprite), character name input with validation, "Create Character" calls API (FR-5.19–5.23).
  - [ ] Step 4 — Welcome screen: character name + class + lore welcome message, "Begin Adventure" and "Explore Home Base" CTAs, shown once (FR-5.24–5.26).
  - [ ] Set up frontend auth token management: `getIdToken()` on every request, `onIdTokenChanged()` for auto-refresh, 401 → silent refresh → redirect if fails (FR-2.2–2.4).

- [ ] **7.7 — Frontend: Home Base** *(RECS §5.3, FR-5.27 through FR-5.31)*
  - [ ] Home Base at `/home` — default landing for returning authenticated players.
  - [ ] Character card: name, class, level, avatar, last played.
  - [ ] "Continue Adventure" button (routes to game — stub/placeholder for now).
  - [ ] Quick stats: total Essence, current chapter, playtime.
  - [ ] Nav stubs: Leaderboard ("Coming Soon"), Achievements ("Coming Soon"), Shop ("Coming Soon").
  - [ ] Support link → `/support`.
  - [ ] Settings page: edit alias/avatar, audio preferences, logout, "Contact support to delete account".
  - [ ] Route guards: Auth guard → Terms guard → Character guard, in order (FR-11.1–11.4).
  - [ ] Mobile-responsive.

- [ ] **7.8 — Server Config System** *(RECS §8, FR-8.1 through FR-8.12)*
  - [ ] Create SQLModel model for `server_config`.
  - [ ] Backend: in-memory config cache loaded on startup, refreshed every 60s or on admin write.
  - [ ] `GET /api/admin/config` — return all config grouped by category.
  - [ ] `PATCH /api/admin/config/{key}` — validate value against `value_type`, update DB, invalidate cache, log to audit.
  - [ ] `POST /api/admin/config/{key}/reset` — reset to `default_value`, log to audit.
  - [ ] `GET /api/config/public` — unauthenticated, return only: maintenance_mode, maintenance_message, announcement_banner, announcement_banner_type, registration_open.
  - [ ] Backend: maintenance mode middleware — if `ops.maintenance_mode = true`, return 503 on all player endpoints.
  - [ ] Admin UI: two-tab layout (Game / Operational), appropriate form controls per value_type, save per-setting, "Reset to Default" with confirmation.

- [ ] **7.9 — Support Ticket System** *(RECS §6, FR-6.1 through FR-6.20)*
  - [ ] Create SQLModel models for `support_tickets`, `support_replies`, `support_attachments`.
  - [ ] **Player API:**
    - [ ] `POST /api/support/tickets` — create ticket (category, subject, description).
    - [ ] `GET /api/support/tickets` — list own tickets (paginated, filterable by status).
    - [ ] `GET /api/support/tickets/{id}` — ticket detail + replies (verify ownership).
    - [ ] `POST /api/support/tickets/{id}/replies` — add reply (text + optional attachments).
    - [ ] `PATCH /api/support/tickets/{id}/reopen` — reopen resolved/closed ticket with reason.
    - [ ] `POST /api/support/tickets/{id}/attachments` — upload (max 3 files, 5MB each, JPEG/PNG/GIF/PDF/TXT).
    - [ ] `GET /api/support/attachments/{id}` — download (authorized access).
  - [ ] **Admin API:**
    - [ ] `GET /api/admin/support/tickets` — all tickets (paginated, filterable by status/category/priority/assigned/date).
    - [ ] `PATCH /api/admin/support/tickets/{id}` — update priority, status, assignment.
    - [ ] `POST /api/admin/support/tickets/{id}/notes` — internal note (admin-only, not visible to player).
  - [ ] **Player Frontend:** "My Tickets" list, Submit Ticket form, Ticket Detail with reply chain.
  - [ ] **Admin Frontend:** Ticket Queue (sortable/filterable), Ticket Detail with priority/status/assignment controls, internal notes, quick actions (Resolve+Reply, Close, Escalate).
  - [ ] Auto-close logic: tickets `resolved` for 7+ days → close automatically (cron or on-access).

- [ ] **7.10 — Admin: User Management** *(RECS §7, FR-7.1 through FR-7.14)*
  - [ ] **Admin API:**
    - [ ] `GET /api/admin/players` — paginated player list (search by alias/email/UID, filter by status/has_character/date, sortable).
    - [ ] `GET /api/admin/players/{id}` — full player detail (profile, characters, activity summary, recent tickets).
    - [ ] `POST /api/admin/players/{id}/ban` — set `is_banned=true`, record reason/timestamp/admin email. Log to audit.
    - [ ] `POST /api/admin/players/{id}/unban` — set `is_banned=false`, record timestamp/admin email. Log to audit.
    - [ ] `PATCH /api/admin/players/{id}` — edit alias, avatar override.
    - [ ] `GET /api/admin/players/{id}/activity` — player activity summary.
  - [ ] **Admin Frontend:**
    - [ ] Players list page: search bar, filters, sortable columns, player count summary (Total, Active 30d, Banned).
    - [ ] Player detail page: profile info, character(s), activity summary, recent tickets, Ban/Unban with confirmation modal.

- [ ] **7.11 — Activity Events & Audit Log** *(RECS §9, FR-9.1 through FR-9.17)*
  - [ ] Create SQLModel models for `activity_events` and `admin_audit_log`.
  - [ ] Backend: async event logging helper — fire-and-forget writes to `activity_events` (don't block API responses).
  - [ ] Instrument all player endpoints: log `player_login`, `player_logout`, `character_created`, `profile_updated`, `support_ticket_created` events.
  - [ ] Backend: synchronous audit log helper — writes to `admin_audit_log` before response for all admin actions (ban, unban, config change, ticket updates).
  - [ ] **Admin API:**
    - [ ] `GET /api/admin/analytics/overview` — Total Players, Active (24h/7d/30d), New Registrations (today/week/month), Open Tickets.
    - [ ] `GET /api/admin/analytics/dau?range=30d` — DAU time series.
    - [ ] `GET /api/admin/analytics/registrations?range=30d` — registrations per day.
    - [ ] `GET /api/admin/analytics/chapter-distribution` — player count per chapter.
    - [ ] `GET /api/admin/analytics/events` — recent activity events (paginated, filterable by event_type).
    - [ ] `GET /api/admin/audit-log` — audit log entries (paginated, filterable by admin/action/target_type/date).
  - [ ] **Admin Frontend:**
    - [ ] Dashboard overview cards (Total Players, Active, New Registrations, Open Tickets).
    - [ ] DAU line chart (7d/30d/90d toggle).
    - [ ] Registration bar chart.
    - [ ] Chapter distribution bar chart / table.
    - [ ] Recent Activity feed (last 50 events, filterable).
    - [ ] Audit Log viewer page (paginated, filterable, immutable).

- [ ] **7.12 — Harden Admin Auth** *(RECS §2.2, FR-2.7 through FR-2.10)*
  - [ ] Move IP/email whitelist enforcement from client-side to backend (`get_current_admin()` — should already be done in 7.2).
  - [ ] Retain client-side check in `admin/src/App.tsx` as UX-only fast rejection.
  - [ ] Verify: bypass client-side check with dev tools → backend still returns 403.
  - [ ] Verify: no admin route leaks which check failed (generic "Access denied" only).

---
*2026-02-27*
## Phase 6: Book Processing 📚
- [ ] **Book Processing**
  - [x] Create requirements for the Book processor (BOOK_AGENT_READER.md)
  - [x] Create Book processor
  - [x] Add in DB_INIT bit to the BOOK processor to create tables from the .sql script if not already there.
  - [ ] Execute processing and load to DB (Phase 1 - extract and split the text).
  - [x] Issue at the end of parsing Book 1. It got stuck trying to start Book 2 (kept cycling). Had to abort the process. The good news was that when it restarted it had kept the 90/90 process, adn it jumped into processing again once restarted. Looks like book2 to book 3 same issue. Likes its phase 1 processing the same book again.
  - [x] Add a pause between books, ask to continue, change model, or exit...
  - [x] Verify that a pause occurs at the end of the Phase 1 to Phase 2 transition.
  - [x] Update requirements a bit to identify "mini-bosses" and "big boss" for the chapter. These should be specific entities in the scenes (one mini-boss per scene), and one big boss per chapter. (Should contain canonical references to the text and something the mini-boss or BIG boss would say or do - how this variant of them is different than the regular entity entry for the scene/chapter).
  - [x] Create a dump table CSV export or something that can be used to import/export data from the DB (save these for future initialization in other DBs - can be CSVs or other files that would be loaded in, along with a python script to load them).
  
 - [ ] **Book Processing Phase 3**
  - [ ] Add in some hidden/secret enemies Variants of ********** (ranging from class E -> Class SS). Generate these as book relevant characters (get all the big-bosses and come up with a chaotic/cosmic horror mesh as a description). 
  - [ ] Check for missing data in the locations tables, entitiy tables (e.g. base description, emotional state, sounds, smells, equipment, abiliites). If missing generate.
  - [ ] Check for some consolidation and cleanup (realize entities from other books might be different.)  
  
  ## Phase Later
  - [ ] **MISC**
    - [ ] Clean up text, lots of the ******** from when I left page breaks in there. There's also the introductory bits (copyright pages - chapter 1 for each book). Might want to keep it, maybe just skip it or use as an easter egg (what the hell is this crap - as part of the tutorial or something - also need to see where the TOC went in all of this).
  - [ ] **Sound effects**
    - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
  - [ ] **Audio Integration**
    - [ ] Research Eleven Reader API for streaming background audio.
    - [ ] Research Eleven SUNO API for streaming background audio.

---
*Updated: 2026-02-26*

## Phase 1: Infrastructure & Project Structure 🏗️
- [x] **Define Directory Structure**
  - [x] `backend/`: Python API (FastAPI)
  - [x] `db/`: Database scripts and migrations
  - [x] `frontend/`: React (Vite) User Interface
  - [x] `admin/`: React (Vite) Administrative Interface
  - [x] `docs/`: Project documentation and design specs
  - [x] `infra/`: Docker, GitHub Actions, and GCP configuration
- [ ] **Google Cloud Platform Setup**
  - [x] Create docs/INIT_INFRA.md guide.
  - [x] Create GCP Project.
  - [x] Enable Cloud Run, Cloud SQL, and Secret Manager APIs.
  - [x] Provision a PostgreSQL instance on Cloud SQL.
- [x] **Authentication & Security**
  - [x] Setup Firebase Project for Google SSO.
  - [x] Setup Stripe Account and API Keys (Publishable, Secret, Webhook).  
- [x] **Environment Configuration**
  - [x] Create `.env.example` templates for all services.
  - [x] Update .gitignore to not track any .env files for all services.
  - [x] Create local `.env` files for all services to secrets can be added and initial testing can be created.

## Phase 2: "Hello World" Implementation 🚀
- [x] **Backend API (Python/FastAPI)**
  - [x] Initial `/health` and `/hello` endpoints.
  - [x] Basic SQLModel/SQLAlchemy setup for Postgres connection.
  - [x] Secure PGSQL connection from local enviroment. (Add user other than pgsql)
  - [x] Firebase Admin SDK integration for token validation.
- [x] **Frontend UI (React/TS)**
  - [x] Scaffold with Vite.
  - [x] Implement basic backend ping functionality.
  - [x] Implement Firebase Auth (Google SSO) login flow.
  - [x] Basic "Hello World" dashboard.
- [x] **Admin UI (React/TS)**
  - [x] Scaffold with Vite.
  - [x] Implement basic backend ping functionality.
  - [x] Implement Firebase Auth (Google SSO) login flow. Ensure that only named google account can login (maybe add IP restriction as well - store these in .env)
  - [x] Basic dashboard for managing game state/users.
- [x] **Run the local servers/services from the command lines and test**
  - [x] Backend Runs and starts without error. Can ping the Cloud PGSQL without error.
  - [x] Frontend UI runs and starts without error. Can ping Backend through dummy API call without error.
  - [x] Admin UI runs and starts without error. Can ping the Backend through the dummy API call without error.

  ## Phase 3: Containerization & Local Dev 🐳
- [x] **Dockerize Services**
  - [x] Create `Dockerfile` for `backend/`.
  - [x] Create `Dockerfile` for `frontend/`.
  - [x] Create `Dockerfile` for `admin/`.
- [x] **Orchestration**
  - [x] Create `docker-compose.yml` for local multi-container development.
  - [x] Ensure local networking between Backend and Frontend.

## Phase 4: Manual Deployment & Cloud Connectivity 🚀
- [x] **Manual GCP Deployment**
  - [x] Build and Push Backend, Frontend, and Admin images to Artifact Registry.
  - [x] Deploy services to Cloud Run via `gcloud` CLI (us-east1).
  - [x] Create a script to push the cloud manually (put it in infra folder). As part of the script, extract the variables & secrets from the .env viles and set those for the gcloud instances.
  - [x] Fix issues with the deployed environments.
- [x] **Cloud SQL Connectivity & Security**
  - [x] Configure Cloud SQL instance to allow Cloud Run connections (IAM/VPC).
  - [x] Implement and verify secure SSL connection between Cloud Run and Cloud SQL.
  - [x] Set up Cloud SQL Auth Proxy for local secure testing if needed.
  - [x] Update PostgreSQL security (Service Account permissions and DB users).
  - [x] Setup DNS (so these names don't change each deploy).
  - [x] Setup Wordpress DNS update to point to the frontend/admin servers (to point to the Cloud Run environments).
  - [x] Update Firebase with approved URLs for the new DNS entries.

## Phase 5: CI/CD & Deployment 🤖
- [x] **GitHub Actions**
  - [x] Create `.github/workflows/deploy.yml`.
  - [x] Test out the deployment process (commit to GIT and ensure that the cloud runs are activated)  
- [x] **Deployment Documentation**
  - [x] Create `DEPLOY.md` with step-by-step instructions for manual and automated deploys. Include localhost running, docker-compose, and the new script to push to gcloud.

