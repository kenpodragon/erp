# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).

---
*Updated: 2026-02-27*

## Phase 7: Onboarding, Profiles & Initial Admin 🧭
> **Requirements:** [1_ONBOARDING_INIT_RECS.md](1_ONBOARDING_INIT_RECS.md) | **Schema:** [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md)

- [ ] **7.6 — Frontend: Onboarding Flow** *(RECS §5.2, FR-5.8 through FR-5.26)*
  - [ ] Post-auth routing logic: call `POST /api/auth/login` → check `is_new_player` + character existence → route accordingly (FR-5.8).
  - [ ] Whenever you click on login from any other page, it should take you right to the profile page once you log in (regardless of page you logged in from). The exception - if you are new, it takes you the onboarding flow.
  - [ ] Step 1 — Terms of Service: modal/overlay, require scroll/checkbox + "I Accept", call `POST /api/players/me/accept-terms` (FR-5.10–5.13).
  - [ ] Step 2 — Profile Setup: show Google name/avatar as defaults, alias input with real-time validation (debounced uniqueness check), avatar upload/preset selection, "Skip" option (FR-5.14–5.18).
  - [ ] Step 3 — Character Creation: fetch classes from `GET /api/game/classes`, display as cards (name, lore, stat bars, sprite), character name input with validation, "Create Character" calls API (FR-5.19–5.23).
  - [ ] Step 4 — Welcome screen: character name + class + lore welcome message, "Begin Adventure" and "Explore Home Base" CTAs, shown once (FR-5.24–5.26).
  - [ ] Set up frontend auth token management: `getIdToken()` on every request, `onIdTokenChanged()` for auto-refresh, 401 → silent refresh → redirect if fails (FR-2.2–2.4).
  - [ ] Need a TOS page, Privacy Policy Page, Contact Us Support form - non logged in users get the support email address form to send, logged in users will go to the support center {developed later requirement}). Also need to create a page for the LICENSE (use the text from the LICENSE file - it's going to be long)
  - [ ] Add UI/UX for the pieces. 
  - [ ] Add a button ont he profile/character page (for testing) - called MAKE ME NEW. Which will set the flag to new player and let you go through the flows as a new player.
  - [ ] Create testing for UI/UX and API.

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
  - [ ] Add UI/UX for the pieces. 
  - [ ] Create testing for UI/UX and API.

- [ ] **7.8 — Server Config System** *(RECS §8, FR-8.1 through FR-8.12)*
  - [ ] Create SQLModel model for `server_config`.
  - [ ] Backend: in-memory config cache loaded on startup, refreshed every 60s or on admin write.
  - [ ] `GET /api/admin/config` — return all config grouped by category.
  - [ ] `PATCH /api/admin/config/{key}` — validate value against `value_type`, update DB, invalidate cache, log to audit.
  - [ ] `POST /api/admin/config/{key}/reset` — reset to `default_value`, log to audit.
  - [ ] `GET /api/config/public` — unauthenticated, return only: maintenance_mode, maintenance_message, announcement_banner, announcement_banner_type, registration_open.
  - [ ] Backend: maintenance mode middleware — if `ops.maintenance_mode = true`, return 503 on all player endpoints.
  - [ ] Admin UI: two-tab layout (Game / Operational), appropriate form controls per value_type, save per-setting, "Reset to Default" with confirmation.
  - [ ] Add UI/UX for the pieces. 
  - [ ] Create testing for UI/UX and API.


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
  - [ ] Add UI/UX for the pieces. If not logged in see the email request support form. If logged in see the support center.
  - [ ] Create testing for UI/UX and API.


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
    - [ ] Add UI/UX for the pieces. 
  - [ ] Create testing for UI/UX and API.


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
    - [ ] Add UI/UX for the pieces. 
  - [ ] Create testing for UI/UX and API.


- [ ] **7.12 — Harden Admin Auth** *(RECS §2.2, FR-2.7 through FR-2.10)*
  - [ ] Move IP/email whitelist enforcement from client-side to backend (`get_current_admin()` — should already be done in 7.2).
  - [ ] Retain client-side check in `admin/src/App.tsx` as UX-only fast rejection.
  - [ ] Verify: bypass client-side check with dev tools → backend still returns 403.
  - [ ] Verify: no admin route leaks which check failed (generic "Access denied" only).



 ## OTHER MAJOR TASKS
 - [ ] **Book Processing Phase 3**
    - [ ] Add in some hidden/secret enemies Variants of ********** (ranging from class E -> Class SS). Generate these as book relevant characters (get all the big-bosses and come up with a chaotic/cosmic horror mesh as a description). 
    - [ ] Check for missing data in the locations tables, entitiy tables (e.g. base description, emotional state, sounds, smells, equipment, abiliites). If missing generate.
    - [ ] Check for some consolidation and cleanup (realize entities from other books might be different.)   
  - [ ] **MISC**
    - [ ] Clean up text, lots of the ******** from when I left page breaks in there. There's also the introductory bits (copyright pages - chapter 1 for each book). Might want to keep it, maybe just skip it or use as an easter egg (what the hell is this crap - as part of the tutorial or something - also need to see where the TOC went in all of this).
  - [ ] **Sound effects**
    - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
  - [ ] **Audio Integration**
    - [ ] Research Eleven Reader API for streaming background audio.
    - [ ] Research Eleven SUNO API for streaming background audio.

