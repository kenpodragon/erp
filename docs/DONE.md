# ERP Project Kickstart COMPLETED TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP). These are all the completed tasks so TODO can stay relatively small.

---
*Updated: 2026-02-27*

## 022726_Stuff
 **Things to do**
 - [x] Migrate off GitHub Actions and move to Google Cloud (including migration of cloud secrets into google). Update update ENV script and manual deploy scripts with these new bits.
 - [x] Update Agents.md to ensure that during dev tests and test cases are created (whenever development is done)
 - [x] Update commit pipeline to ensure tests are being executed when building (Added backend pytest and frontend/admin linting to cloudbuild.yaml)
 - [x] Review BACKEND/ADMIN/FRONTEND and implement testing frameworks for all current code

- [x] **7.1 — Database Migration** *(RECS §10, SCHEMA §1-10)*
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

- [ ] **7.3 — Player Profile System (API & UI)** *(RECS §3.2, FR-3.7 through FR-3.12, §5.3)*
  - [x] Create SQLModel models for `players` and `player_settings`.
  - [x] `POST /api/auth/login` — validate token, upsert player, return profile + characters + `is_new_player`.
  - [x] `GET /api/players/me` — return full player profile with settings.
  - [x] `PATCH /api/players/me` — update alias (validate uniqueness, format, profanity filter) and/or avatar preset.
  - [x] `POST /api/players/me/accept-terms` — set `terms_accepted_at = NOW()`, idempotent.
  - [x] `PATCH /api/players/me/settings` — update audio_enabled, music_volume, sfx_volume, narration_speed with validation.
  - [x] Create profanity blocklist file (simple text list in backend).
  - [ ] **Frontend: Profile Management UI**
    - [x] Create `ProfileDashboard.tsx` to display player identity and stats.
    - [x] Implement `AliasEditor`: Input with debounced uniqueness check (`PATCH /api/players/me`).
    - [x] Implement `AvatarManager`: Selection from preset avatars (`PATCH /api/players/me`).
    - [x] Implement `AudioSettings`: Sliders for Music/SFX/Narration and Master Audio toggle (`PATCH /api/players/me/settings`).
    - [x] Add "Terms of Service" view/re-acceptance if needed.
    - [x] Ensure mobile responsiveness and dark fantasy aesthetic consistency.
    - [x] Add loading skeletons and "Saved" confirmation toasts for all profile updates.
    - [x] Create tests for UI/UX (add to current test suite).

- [x] **7.4 — Character System API** *(RECS §4.3, FR-4.8 through FR-4.11)*
  - [x] Create SQLModel models for `character_classes` and `player_characters` (pre-existing), plus new `PlayerProgress` and `PlayerEssence` models (`db/003_character_state.sql`).
  - [x] `GET /api/game/classes` — public endpoint, return available classes (where `is_available = true`).
  - [x] `POST /api/players/me/characters` — validate name (uniqueness, format, profanity), check MVP 1-character limit (409 if exists), copy base stats from class, create character record. Also initialize `player_progress` (Book 1, Ch 1, Scene 1, Beat 1) and `player_essence` (balance=0, rate=0).
  - [x] `GET /api/players/me/characters` — list player's characters with class info.
  - [x] `GET /api/players/me/characters/{character_id}` — full detail with stats, class, progress summary, essence balance. Verify ownership.
  - [x] Create the basic interfaces for these on the frontend (`CharacterCreator.tsx` — class selection cards with stat bars, name input, integrated into App.tsx).
  - [x] Create testing for UI/UX and API (backend: `tests/test_characters.py` — 14 tests; frontend: `CharacterCreator.test.tsx` — 7 tests).
  - [x] Wonky character delete. The name of the character isn't shown, the selected class and stats aren't there either.

  - [x] **7.5 — Frontend: Splash Page** *(RECS §5.1, FR-5.1 through FR-5.7)*
    - [x] Replace current Hello World dashboard at `/` with Splash page (move the Hello World dashboard to a `/profile` page to keep the changes).
    - [x] Dark fantasy design: animated "Elysium Rising" title, atmospheric background, tagline from Book 1. (Use book styling from cover image from book `NewCover04112025.jpg`).
    - [x] "Begin Your Ascent" CTA → triggers Firebase Google SSO popup.
    - [x] Below-fold content: "About the Game", "The Story" teaser, "How It Works" (3-4 bullet points).
    - [x] Footer: Terms of Service, Privacy Policy, Contact Support links.
    - [x] Auto-redirect to `/profile` if already authenticated (FR-5.6).
    - [x] Navigation appears to all users (users can go to the home page, about page, all the other pages etc...). Login button at the top (to login, or if you're logged in to log out). When logged in should have a profile button so you can jump over to the profile page.
    - [x] Mobile-responsive down to 360px.
    - [x] Create testing for UI/UX and API

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