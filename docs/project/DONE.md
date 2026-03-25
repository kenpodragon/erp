# ERP Project Kickstart COMPLETED TODO

This document tracks the completed development phases for the Elysium Rising mmorPg (ERP). Tasks are moved here from `TODO.md` once finalized.

---
*Updated: 2026-03-25*

## Test Health + Frontend Fixes — COMPLETE (2026-03-25)

### Frontend Runtime Fixes
- [x] Fixed BottomAnimatedBanner.tsx: value imports for type-only exports caused white screen (`AttackVisualData`, `EnemyVisualData`, `CharacterVisualData` → `type` imports)
- [x] Fixed PaperDollRenderer.tsx: early `return null` before hooks caused "Rendered fewer hooks" crash — moved after all hooks
- [x] Fixed EntityRenderer.tsx: same early-return-before-hooks bug
- [x] Fixed backend Docker container port 8000 not binding to host (admin auth stuck)

### Backend Test Health (29 failures → 0)
- [x] Fixed test_profiles.py: replaced PIL/Pillow dependency with raw PNG bytes (collection blocker)
- [x] Created `backend/pytest.ini`: registered `integration` marker, excluded Stripe E2E tests from default runs (22 tests need live Stripe CLI + Firebase token)
- [x] Fixed test_2_6_features.py: updated discovery endpoint assertions for paginated dict response (was expecting bare list), fixed `entity_family_name` → `family` key, fixed websocket test for last-connection-wins design
- [x] Fixed test_admin_finance.py: updated plan_key to match hardcoded service prices (`monthly_premium` → `ascendant_monthly`), fixed `tier` → `patron_tier` column name
- [x] Fixed test_admin_players.py: `character_count` → `character_name`/`character_level` to match actual route response

### Generator Test Health (3 failures → 0)
- [x] Fixed test_ai_provider.py mock paths: `asyncio.create_subprocess_exec` → `tools.generators.lib.ai_provider.asyncio.create_subprocess_exec` (broken after generator reorg)
- [x] Fixed all `_make_provider()` helpers: set non-SDK provider names (`cli_primary`/`cli_fallback`) to force `_run_cli` path, bypassing SDK branches that skip subprocess mocks

### Final Test Counts
| Suite | Passed | Skipped | Deselected |
|-------|--------|---------|------------|
| Backend (pytest) | 853 | 2 | 25 (integration) |
| Frontend (vitest) | 457 | 1 | — |
| Admin (vitest) | 368 | — | — |
| Generator (pytest) | 76 | — | — |

---

## Migration Consolidation — COMPLETE (2026-03-24)

### DB Migration Merge (061-068 → 001-003)
- [x] Deep-dived all 8 migrations to classify schema vs seed vs Elysium-specific data
- [x] Confirmed: 062 game configs REQUIRED (balanced values), 068 banner configs UNUSED (dead code), 063 max_enemy_hp OPTIONAL (NULL fallback), 064-067 visual data MOSTLY UNUSED (only paperdoll_layer + attack_animation_type required, rest have fallbacks)
- [x] 001_init_db_tables.sql: Added 5 new lookup tables (animation_styles, armor_classes, movement_types, silhouette_types, size_classes) with sequences, PKs, UNIQUE, FKs. Added columns to attack_types (10), entity_gameplay_data (9), gear_slots (1), item_type_bases (3), scene_gameplay_data (1)
- [x] 002_system_seed_data.sql: Updated 6 game_config values in-place (sim toolkit balanced values). Added lookup table seed rows (5+5+7+6+8). Baked paperdoll_layer into gear_slots INSERTs
- [x] 003_sample_content_data.sql: No changes needed
- [x] Moved 061-068 to db/old/ (archived, not deleted)
- [x] Result: Clean 001-003 install for any new instance, no Elysium-specific data required

---

## Generator Pipeline + Watchdog v1 — COMPLETE (2026-03-23/24)

### Generator Pipeline Framework (2026-03-23)
- [x] Built 4 framework modules: `tools/lib/ai_provider.py`, `db_client.py`, `base_generator.py`, `cache.py`
- [x] Built 16 generators with `--ai` mode + Python fallback (entity families, gameplay, sprites, backgrounds, lore, music, SFX, scenes, achievements, artifacts, attack visuals, projectiles)
- [x] Admin Asset Viewer: `admin/src/pages/AssetViewer.tsx` + `backend/routes/admin_visual.py`
- [x] 76 generator tests passing
- [x] Migrations 064-068 (visual lookup tables, entity gameplay FKs, attack type visuals, paperdoll layers, banner scaling)
- [x] Documentation: GENERATOR_INSTRUCTIONS.md, GENERATOR_AI_RULES.md, C_STORY_ASSET_GENERATORS.md

### Watchdog v1 — Overnight Bulk Population (2026-03-24)
- [x] Built watchdog infrastructure (adapted from RESUMES project): WATCHDOG_AUTO.ps1, START_AUTONOMOUS.ps1, STOP_AUTONOMOUS.ps1
- [x] AGENT_INSTRUCTIONS.md + AGENT_GOALS.md with 103 acceptance criteria
- [x] Ran overnight ~2 hours — all 16 generators executed via AI mode
- [x] Results: 87/103 goals passed, 0 gaps, all 3,936 entities populated
- [x] Entity families expanded 10 → 17, max family 72% → 21.4%
- [x] 85 death SFX presets created, all entities mapped
- [x] 724 scenes with atmosphere + background + wave configs

**Quality audit (post-v1):** Data structurally complete but content quality poor — template lore text, identical backgrounds, null music tracks. Led to v2 quality improvement pass.

### Watchdog v2 — Quality Improvement Design (2026-03-24)
- [x] Audited v1 cache files — identified template text, identical configs, null values
- [x] Redesigned as audit-first quality pass: sample → classify KEEP/REPLACE → fix → verify
- [x] Direct SQL approach (skip generators) with full lore data chain (entity → scenes → chapters → books → locations → story beats)
- [x] 129 quality-focused goals with template detection, SVG complexity checks, content sampling
- [x] Scoping/prioritization: Book 1 + bounded sets first, quality > coverage
- [x] 3 deep audit passes on all docs — cross-referenced against actual schema

**Next steps:** Run v2 overnight, review results, visual verification, iterate if needed.

### Generator Directory Reorganization — COMPLETE (2026-03-24)
- [x] Created `tools/generators/` package with proper `__init__.py` files
- [x] Moved `tools/lib/` → `tools/generators/lib/` (4 framework modules: ai_provider, base_generator, cache, db_client)
- [x] Moved `tools/tests/` → `tools/generators/tests/` (4 test files), fixed imports + mock paths
- [x] Moved 15 generators from `tools/` root → `tools/generators/` with import fixes
- [x] Moved 6 supporting scripts (scan_content_gaps, seed_entity_families, assign_atmospheres, classify_atmospheres, classify_entity_families, capture_difficulty_preset)
- [x] Deleted one-off `generate_migration_040.py`
- [x] Updated watchdog imports (`tools.lib` → `tools.generators.lib`)
- [x] Updated `.gitignore` exception for new lib path
- [x] Updated all documentation path references (AGENTS.md, GENERATOR_AI_RULES.md, TODO.md, pipeline docs)
- [x] Removed stale "Cosmetic Asset Generation" TODO section (3.3 Emporium already complete)
- [x] Replaced `sys.path.insert()` hacks with proper package imports across all files
- [x] Verification: 73/76 generator tests pass (3 pre-existing failures), all generators import correctly

---

## Spoofing Lockdown + Combat Scaling Alignment — COMPLETE (2026-03-22)

### Spoofing Lockdown (25 files, -812 lines)
- [x] Removed double-gated auth bypass from `backend/auth.py` (`get_decoded_token()`)
- [x] Removed WebSocket bypass from `backend/routes/chat.py`
- [x] Removed bypass fields from `backend/routes/public.py` (`/api/config/public`)
- [x] Removed 3 admin bypass endpoints from `backend/routes/admin_config.py` (status, create-test-player, set-player)
- [x] Removed `AuthBypassPanel` (~230 lines) from `admin/src/pages/ServerConfig.tsx`
- [x] Removed `setAuthBypass`/`isAuthBypassed`/`X-Spoof-Player-Id` from frontend + admin `api.ts`, `App.tsx`, `chatClient.ts`
- [x] Removed `ALLOW_AUTH_BYPASS` from `.env.example`, seed data, docs (TESTING.md, API_REFERENCE.md, INIT_INFRA.md, admin API_GUIDE.md, admin README.md)
- [x] Updated E2E auth helpers (`testing/helpers/auth.ts`) — bypass-based login removed, `bypassOnboarding` renamed to `completeOnboarding`
- [x] Updated sim toolkit `api_client.py` — removed spoof header

### Combat Scaling Alignment
- [x] Idle training HP now uses story mode formula: `100 * 1.012^(skillLevel-1) * 1.08^(wave-1)` with 8x boss multiplier (was hardcoded `100 * 1.25^(w-1)` with no skill level scaling)
- [x] Boss HP computed server-side from DB entity `base_hp` × scene position multiplier × `boss_config.hp_multiplier`, returned as `boss_base_hp` in session start response
- [x] Added `max_enemy_hp` column to `scene_gameplay_data` — per-scene HP cap override (NULL = global formula)
- [x] Migration 063: seeded early game HP caps (Book 1 Ch1-3: 25, Ch4-8: 40, Ch9-15: 60, Ch16+: 100, Book 2 early: 120)
- [x] Enemies endpoint uses per-scene `max_enemy_hp` override when set

### Admin Enhancement
- [x] Players list: replaced character count column with character name, level, and story progress (Book/Chapter/Scene)

---

## Simulation Toolkit Phases 5-6 + Progression Balancing — COMPLETE (2026-03-22)

**Toolkit guide:** `docs/how-to/SIM_TOOLKIT_GUIDE.md`

### Phase 5: Results & Migration Tooling
- [x] Migration generator (`tools/sim/generate_migration.py`) — reads config_overrides.json, outputs SQL (9 tests)
- [x] Toolkit guide (`docs/how-to/SIM_TOOLKIT_GUIDE.md`) — full usage guide for all 3 layers + iteration workflow
- [x] TODO.md and session state updates

### Phase 6: First Iteration Run — Casual 59.53h (Target: 60h)
- [x] Fixed math model: legacy `zone_hp(1.55x)` → `scene_hp(1.012x)` matching server `/enemies` endpoint
- [x] Two tuning passes: baseline 2,977h → v1 43.59h (too fast) → v2 **59.53h** (on target)
- [x] API bot validation: 5/5 scenes completed, 0 errors, ~31s/scene combat
- [x] Migration 062 generated and applied to dev DB (`db/062_balanced_game_configs.sql`)

**Config Changes (Migration 062):**

| Config Key | Old | New | Reason |
|-----------|-----|-----|--------|
| `char_level_xp_factor` | 1000 | 80 | XP curve 50x too steep |
| `char_xp_per_scene_base` | 50 | 200 | More XP per scene |
| `gold_to_essence_base_rate` | 1000 | 200 | Cheaper essence conversion |
| `gold_to_essence_growth_factor` | 1.07 | 1.01 | Flatter economy curve |
| `idle_essence_drain_per_minute` | 1 | 0.5 | Sustain idle training longer |
| `upgrade_cost_scaling` | 1.07 | 1.03 | Gentler upgrade cost growth |

**All Profile Results:**

| Profile | Hours | Target | Status |
|---------|-------|--------|--------|
| Casual | 59.53h | 60h | On target |
| Power Gamer | 24.62h active | 56-80h / 7-10 days | On target |
| No Autoskills | 256h | Walls, not stuck | As designed |
| New User | 2,926h | Very slow | Expected (30min/day) |
| Idle Only | inf | Can't clear content | By design |

### Test Summary
- 30 tests total (7 config + 14 math_model + 9 migration generator)
- All passing as of commit `5657d48`

---

## Simulation Toolkit Phases 1-4 + Combat Scaling — COMPLETE (2026-03-22)

**Spec:** `docs/specs/2026-03-20-simulation-toolkit-design.md`
**Plan:** `docs/plans/2026-03-20-simulation-toolkit-plan.md`
**Session state:** `docs/SIM_PROC_BAL_SESSION_STATE.md`

### Phase 1: API Documentation
- [x] Scanned all backend routes → generated `docs/reference/API_REFERENCE.md`
- [x] Created `admin/docs/API_GUIDE.md` and updated `admin/README.md`

### Phase 2: Math Model
- [x] Scaffolded `tools/sim/` directory, profiles (5 archetypes), requirements
- [x] Built config/formula module with tests (9 formula functions, 5 tests)
- [x] Built simulation engine — zone, economy, XP, walls, bosses, archetypes (14 tests)
- [x] Content data snapshot from DB (3 books, 580 scenes, 18 skills, 72 configs)

### Phase 3: API Bot
- [x] Async API client (`tools/sim/api_client.py`) — 20 endpoints, httpx async, retry/backoff, metrics (7 tests)
- [x] Profile-driven bot runner (`tools/sim/api_bot.py`) — tick loop, 4 upgrade strategies, narrative pacing (7 tests)
- [x] Run comparison tool (`tools/sim/results/compare.py`) — config/summary/zone/wall diffs, severity flags, design target verdicts (7 tests)
- [x] Integration tested: 3/3 scenes completed, 0 errors against live Docker stack
- [x] Browser validated: API bot produces identical server-side results to frontend (Playwright MCP)

### Phase 4: Browser Bot — OBE
- [x] ~~Browser bot~~ **OBE** — browser validation confirmed API bot faithfully replicates all frontend gameplay mechanics. Separate browser bot unnecessary. See `tools/sim/browser_validation.py`.

### Combat Scaling Fix (discovered during browser validation)
- [x] **Bug 1 — No inter-scene HP scaling:** Frontend ignored server `base_hp` and recalculated locally via `zoneHp()`. Fixed CombatStage.tsx to use server values. Backend now applies exponential scene scaling (`1.012^(scene_position-1)`) to all entity HP/gold.
- [x] **Bug 2 — No mob HP variation:** Confirmed data gap (only 4/3,936 entities had `entity_gameplay_data`). Code path verified working. Seeded all entities via migration 061 with tiered base_hp by entity type (environment 5-10, creature 20-50, enemy 40-80, etc).
- [x] **Max HP cap:** Added `max_scene_base_hp` game_config (default 500) — prevents data errors from making early scenes impossible.
- [x] New game_configs: `scene_hp_scaling_base` (1.012), `scene_gold_scaling_base` (1.008), `max_scene_base_hp` (500)
- [x] Migration: `db/061_seed_entity_gameplay_data.sql`

### Test Summary
- 40 tests total across sim toolkit (19 Phase 2 + 21 Phase 3)
- All passing as of commit `603ea0b`

---

## E2E User Testing — COMPLETE (Sessions 1-11)

**Full session details:** `E2E_SESSION_STATE.md`

11 sessions across onboarding, story mode, bosses, farm mode, idle training, admin panel, economy (Stripe), home base hub, chat, audio, settings, accessibility, and edge cases. Produced in-app user manuals for both player and admin audiences.

### Summary
- **Sessions 1-9:** Functional testing across all frontend + admin features
- **Session 10:** In-app Player Guide (`/guide`) — 10 sections, 40 entries, 17 screenshots, search, deep-linking
- **Session 11:** In-app Admin Help (`/help`) — 8 sections, 39 entries, 4 screenshots, search
- **20 bugs found and fixed** (#1-#20) — encoding, null guards, model defaults, UI wiring, missing controls
- **Test suite restored:** All pre-existing test failures fixed (frontend 410 pass, admin 359 pass)
- **76 annotated screenshots** captured in `docs/user_manuals/screenshots/`

### Key Deliverables
- `frontend/src/pages/guide/` — PlayerGuide component + 10-section content data + 9 tests
- `admin/src/pages/help/` — AdminHelp component + 8-section content data + 7 tests
- `frontend/public/help/` — 17 curated player screenshots
- `admin/public/help/` — 4 curated admin screenshots
- NavBar "Guide" link + TopBar "?" icon (frontend)
- NavBar "Help" link (admin)

---

## Docker PostgreSQL Migration (DB Deploy)

- [x] **PostgreSQL Docker Migration** — Dockerized PostgreSQL 17 container integrated into `docker-compose.yml` (port 5433). Init scripts create `erp_app_user` + `erp_production` DB from SQL scripts (001/002/003) or from a `pg_dump` snapshot. `tools/refresh_dump.py` dumps localhost to `db/deploy/dump.sql`; `tools/toggle_db.py` toggles `backend/.env` between localhost and Docker. Fixed `backend/routes/discovery.py`: `PlayerProgress.current_chapter_id` → `chapter_number`, Etheric Registry + Discovery Library response shapes aligned to frontend contracts. See `docs/reference/TOOLS.md` for usage.

---

## Deferred Items & Hardening (Phases A–D)

 - [x] **Phase A: Bug Fixes**
   - [x] Bug #1 — Bottom battle bar: respawn x -100→50, enemy zIndex 4→7 (`BottomAnimatedBanner.tsx`)
   - [x] Bug #2 — Boss farm mode exit: added `!isBossSession` guards to `handleExit()` and auto-farmMode (`StoryMode.tsx`)

 - [x] **Phase B: Backend Hardening**
   - [x] B.1 — Rate Limiting: new `backend/services/rate_limiter.py` (sliding-window, Depends-based). Applied to 5 marketplace endpoints (browse 30/min, buy/list/salvage/bulk-salvage 10/min). 7 unit tests.
   - [x] B.2 — Alt Account Detection: new `backend/services/alt_detection_service.py`. Checks shared `stripe_customer_id` on marketplace buy. Logs `marketplace_alt_warning` to `activity_events`. Admin endpoint `GET /api/admin/finance/alt-warnings`. 7 unit tests.

 - [x] **Phase C: Frontend Test Gaps**
   - [x] C.1 — Booster overlap: new `BoosterPanel.test.tsx` (7 Vitest tests)
   - [x] C.2 — Active booster top bar: added test to `TopBar.test.tsx` (5 total)
   - [x] C.3 — World Builder integration: verified in 5.9 + CascadingPicker tests passing

 - [x] **Phase D: Live Stripe E2E (25 integration tests)**
   - [x] D.1 Shard Purchasing (5 tests): packages, checkout (real Stripe), payment status, transactions
   - [x] D.2 Subscription (3 tests): status, checkout creation, invalid plan rejection
   - [x] D.3 Dispute (2 tests): dispute flag in packages, non-disputed checkout succeeds
   - [x] D.4 Donation (4 tests): create session (real Stripe), too-low rejection, status, leaderboard
   - [x] D.5 Emporium (5 tests): catalog, collection, boosters, insufficient shards, missing body
   - [x] D.6 Marketplace (6 tests): browse, filtered, my-listings, trade history, rate limit 429
   - Bugs fixed: `PaymentOrder.created_at` default (was None), marketplace browse arg mismatch

 - [x] **Test Suite Remediation (COMPLETE)** — 818 passed, 0 failed, 0 errors (was 766/35/17)
   - Fixed 7 test files for Entity `entity_type`→`entity_type_id` FK migration (058): `test_2_6_features.py`, `test_admin_content.py`, `test_story_mode.py`, `test_story_mode_enemies.py`, `test_achievement_system.py`, `test_audio.py`, `test_idle_training.py`
   - Fixed real service bug: `admin_content_service.py` `auto_populate_wave_config()` using stale `ent.entity_type` string field → FK lookup
   - Fixed `test_achievement_system.py` missing `cumulative_subscription_months` migration column in SQLite fixture
   - Fixed `test_idle_training.py` expected value for granular essence drain simulation (15000→705)

## REC_5: Administrative Systems

 - [x] **5.9 — Initial Remediation & E2E Testing Revamp (COMPLETE)** *(Ref: `recs/5.9_TESTING_REVAMP.md` | Session State: `E2E_SESSION_STATE.md`)*
   - [x] **Phase 0: Infrastructure**
     - [x] 0.1 — Auth Bypass System: DB-driven spoof toggle double-gated (`.env` `ALLOW_AUTH_BYPASS` + DB `ops.auth_bypass_enabled`). Backend `get_decoded_token()` in `auth.py` accepts `X-Spoof-Player-Id` header. Admin UI panel in `ServerConfig.tsx` with test player creation. Frontend/admin `api.ts` auto-attaches spoof header. Migration 061 (`auth_bypass_enabled`, `auth_bypass_player_id` server_config keys). Test player E2ETestBot (ID 2) created with `is_system_admin + is_game_admin`.
     - [x] 0.2 — DB Dump/Restore Script: `tools/db_dump_restore.py` (dump/restore/list via `pg_dump`/`pg_restore`). Pre-E2E backup at `db/backups/erp_backup_pre_e2e_testing.dump`.
     - [x] 0.3 — Playwright Config Enhancement: Added `admin` project to `testing/playwright.config.ts` (matches `admin-*.spec.ts`, baseURL `:5174`). `PLAYWRIGHT_FRONTEND_URL`/`PLAYWRIGHT_ADMIN_URL` env var overrides.
     - [x] 0.4 — Shared Test Helpers: `testing/helpers/auth.ts` (`loginAsTestUser`, `loginAsAdmin`, `bypassOnboarding`), `testing/helpers/navigation.ts` (`navigateToTab`, `navigateToAdminPage`, `waitForContentLoad`, `captureConsoleErrors`), `testing/helpers/api-mocks.ts` (`mockStripeCheckout`, `mockSubscriptionCreate`, `mockActiveSubscription`, `mockNoSubscription`, `mockDonationCreate`, `mockAllStripe`).
   - [x] **Phase 1: MCP Browser Smoke Testing** — All pages verified with 0 console errors
     - [x] 1.1 — Frontend (12 routes): Splash, about, terms, privacy, license, support (guest), profile (SKIP — no Firebase User), Game tabs (Map, Skills, Home, Shop, Ascendant, Chat) all OK.
     - [x] 1.2 — Admin (17 routes): Dashboard, Players, Players/:id, World Builder, Config, Finance, Support, Game Configs (141), Atmospheres (21), SFX Configs (17), Artifacts (50), Achievements (90+), Asset Registry (196), Chat Manager, Audit Log, Dev Audit (17 open), Access Control (SKIP — owner-only gate).
     - [x] 1.3 — 7 bugs found and fixed:
       1. `Entity.entity_type` → `entity_type_id` FK join in `backend/routes/game.py:395`
       2. `SkillBalanceRow` import — `verbatimModuleSyntax` requires `import type`
       3. `verifyUserWithBackend`/`isLoggedIn` temporal dead zone in `frontend/App.tsx`
       4. `onAuthStateChanged` resetting bypass — added `isAuthBypassed()` guard
       5. Finance revenue-chart SQL — `CAST(:cutoff AS date)`, removed non-existent `order_type`, fixed donations join
       6. `OverviewTab.tsx` `formatNumber` null safety
       7. `PlayerFinanceWidget.tsx` crash — `formatShards()` null safety + field name mismatch (`shard_balance`→`balance`, `type`→`source_type`)
   - [x] **Phase 2: Automated Playwright Specs** — 119 tests across 19 spec files
     - [x] 2.1 `smoke.spec.ts` (10 tests) — Backend health+hello, frontend statics, admin login+dashboard
     - [x] 2.2 `onboarding.spec.ts` (7 tests) — Splash, terms, about, auth bypass auto-login, support
     - [x] 2.3 `story-mode.spec.ts` (8 tests) — Map, scene entry, combat/narrative UI, post-battle, hub return
     - [x] 2.4 `idle_training.spec.ts` (6 tests) — Skills tab, action table, training, active mode, locked/unlocked
     - [x] 2.5 `character_progression.spec.ts` (5 tests) — Stats, prerequisites, items, equip pipeline
     - [x] 2.6 `audio.spec.ts` (8 tests) — Settings, volume sliders, mute, AudioContext, persistence
     - [x] 2.7 `economy_discovery.spec.ts` (5 tests) — Chat tab, connection status, codex, reduce-motion
     - [x] 2.8 `home-base.spec.ts` (6 tests) — Sub-tabs, Akashic Log hierarchy+search, collections, achievements, leaderboard
     - [x] 2.9 `shop-shards.spec.ts` (5 tests) — Packages, checkout mock, transaction history, shard balance
     - [x] 2.10 `subscription.spec.ts` (6 tests) — Promo, checkout, active subscriber, cancel/reactivate, badge
     - [x] 2.11 `emporium.spec.ts` (5 tests) — Cosmetic categories, item cards, insufficient shards, boosters
     - [x] 2.12 `donations.spec.ts` (5 tests) — Tiers, custom amount, checkout mock, patron status
     - [x] 2.13 `marketplace.spec.ts` (6 tests) — Browse, listings, my listings, NPC vendor, trade history
     - [x] 2.14 `admin-players.spec.ts` (6 tests) — Player list, search, detail, edit/ban, force logout, character
     - [x] 2.15 `admin-content.spec.ts` (6 tests) — World builder tabs, narrative editor, atmosphere, SFX, artifacts
     - [x] 2.16 `admin-scaling.spec.ts` (6 tests) — Game configs (141+), search, tabs, editable values
     - [x] 2.17 `admin-audit.spec.ts` (6 tests) — Audit log table+filters, dev audit status cards+filters
     - [x] 2.18 `admin-assets.spec.ts` (7 tests) — 196 assets, 16 categories, search, pagination, orphan detection
     - [x] 2.19 `admin-finance.spec.ts` (5 tests) — Overview, revenue chart, tabs, player finance widget
   - [x] **Phase 3: Systematic Requirement Verification** — 50/52 items verified (96%)
     - [x] REC 1 Onboarding (6/6), REC 2.0–2.2 Game Loop (11/11), REC 2.3 Idle Training (4/5 — offline report deferred), REC 2.4 Character (5/5), REC 2.5 Audio (4/4), REC 2.6 Economy/Chat (5/6 — welcome modal deferred), REC 2.7 Home Base (5/5), REC 3.1–3.5 Monetization (5/5), REC 3.6+5.1–5.8 Admin (12/12)
     - 2 gaps deferred to 5.10 live user testing: offline training report (needs test tooling), welcome/changelog modal (needs version trigger)
   - [x] **Phase 4: Fix Issues Found** — 7 bugs fixed (sessions 1-2), 0 new bugs (session 3), regression specs in place

 - [x] **5.8 — UI Polish & Debug Cleanup (COMPLETE)**
   - [x] 5.8.1 — Debug Control Gating: StoryMode debug buttons (SUPER CLICK toggle, RESET SESSION) gated behind `player?.is_game_admin` check in both normal and boss combat modes. Added `is_game_admin` to Player interfaces in `MainGameLayout.tsx` and `StoryMode.tsx`. Deleted orphaned `DatabaseStatus.tsx` (never routed, exposed raw DB table names).
   - [x] 5.8.2 — Admin Navigation Reorganization: Replaced 15 flat navbar links with 6 grouped items using hover-based `NavDropdown` component: Dashboard (direct), Players (Player List, Support Tickets, Chat Manager), Content (World Builder, Atmospheres, Sound Effects, Asset Registry), Game (Game Configs, Artifacts, Achievements), Finance (direct), System (Server Config, Audit Log, Dev Audit, Access Control). Dropdown CSS with smooth hover transitions, active group highlighting, 150ms close delay.
   - [x] 5.8.3 — Styling Standardization: Global admin heading hierarchy (h1 1.6rem white, h2 1.2rem info-blue, h3 1rem #ccc, h4 0.85rem muted uppercase) in `App.css`. Page container `max-width` standardized to 1200px (1400px for table-heavy pages via `:has()` selector). Added CSS variables to `index.css`: 5 rarity colors (`--color-rarity-*`), 4 shared button colors (`--color-btn-*`), 2 panel background colors (`--color-panel-*`).
   - [x] 5.8.4 — Shared Tab Component: Created `AdminTabs.tsx` + `AdminTabs.css` — reusable tab bar with `primary`/`secondary` variants. Migrated 6 pages: FinanceDashboard (8 tabs), WorldBuilder (4 tabs), ContentEditor (6 primary + item sub-tabs), NarrativeEditor, ClassificationEditor, ScalingEditor (all secondary variant). Eliminated 5 independent tab implementations (`finance-tab`, `wb-top-tab`, `ce-tab`, `cls-tab`, `ne-tab`, `scaling-tab`).
   - [x] 5.8.5 — Duplication Cleanup: Redirected orphaned `/content` route to `/world-builder`. Exposed previously hidden SFX Configs page in Content dropdown. Updated test assertions (WorldBuilder.test.tsx, FinanceDashboard.test.tsx) for new `admin-tab` class names. All 352 admin tests + 364 frontend tests passing (7 pre-existing PixiJS/scrollTo failures unchanged).

 - [x] **5.6 — Dev Content Audit Dashboard (COMPLETE)** *(Ref: `recs/5.6_DEV_CONTENT_AUDIT.md` | [Design](recs/5.6_DEV_CONTENT_AUDIT_DESIGN.md) | [Schema](recs/5.6_DEV_CONTENT_AUDIT_SCHEMA.md))*
   - [x] 5.6.0 — Requirements, design, and schema documentation (3 docs created, migration 060 planned)
   - [x] 5.6.1 — Audit Table Viewer, Filters & Summary Cards: Migration 060 (replaced `resolved` boolean with `status` VARCHAR(20), added indexes). `DevContentAudit` model updated. `dev_audit_service.py` (6 functions: `log_content_audit` with dedup, `list_audit_records` with scene title enrichment, `get_audit_summary`, `get_filter_options`, `update_audit_status`, `bulk_update_status`). `admin_dev_audit.py` (5 endpoints: paginated list, summary, filter-options, PATCH status, POST bulk-status). Router registered in `main.py`. Frontend: `DevAudit.tsx` (orchestrator page), `AuditSummaryCards.tsx` (5 clickable status cards with per-type breakdown), `AuditFilterBar.tsx` (dynamic type/entity dropdowns with counts, status filter, debounced search, date range), `AuditTable.tsx` (paginated table, colored type badges, status pills, pagination). `dev-audit.css` (dark-theme styling). Admin sidebar updated with "Dev Audit" NavLink + route. Data dictionary updated for migration 060.
   - [x] 5.6.2 — Fix Actions, Status Management & Fallback Instrumentation: `StatusDropdown.tsx` (inline per-row status changer with colored backgrounds). `BulkStatusBar.tsx` (multi-select, bulk action dropdown, confirmation dialog). Deep-link fix routing via `getFixRoute()` in AuditTable (7 audit_type → WorldBuilder URL mappings + generic fallback). `log_content_audit()` shared helper with application-level dedup replaces old `_log_audit()` in `story_mode.py`. Existing `missing_entity`/`missing_stat`/`missing_sprite` logging refactored to use shared helper. New instrumentation: `missing_atmosphere` in `audio.py` (atmosphere resolution fallback), `missing_lore_text` in `story_mode.py` (boss completion endpoint). Proactive content scanner cross-ref added to `C_STORY_ASSET_GENERATORS.md` §9 (7 scan targets).
   - [x] 5.6.3 — Tests: Backend (`test_dev_audit.py`: 13 pytest — log_content_audit create/dedup/resolved-reopen, list default/filter-by-type/filter-by-status, summary counts, filter-options, status update valid/invalid/not-found, bulk update valid/invalid). Frontend (5 test files, 37 vitest — AuditSummaryCards ×6, AuditFilterBar ×7, AuditTable ×13, StatusDropdown ×5, BulkStatusBar ×6).

 - [x] **5.5 — Content Management & Live Tuning (COMPLETE)** *(Ref: `recs/5.5_CONTENT_MANAGEMENT_LIVE_TUNING.md` | [Design](recs/5.5_CONTENT_MANAGEMENT_LIVE_TUNING_DESIGN.md) | [Schema](recs/5.5_CONTENT_MANAGEMENT_LIVE_TUNING_SCHEMA.md))*
   - [x] 5.5.0 — Requirements, design, and schema documentation (requirements, design, schema docs — no migration needed, frontend-only)
   - [x] 5.5.1 — Drop Rate Manager: `tuning-utils.ts` (inferInputType, computeDropPreview, computeSkillBalance, buildEssenceSteps, goldPerEssence, formatGold, RARITY_COLORS), `tuning.css` (shared dark-theme styles). `DropRateManager.tsx` (6 sections: artifact drop chance sliders with DropPreview, artifact rarity weight bars per book with RarityWeightBar, dream item rarity weights, gear slot proportional bars, rare spawn slider with contextual help, collapsible run achievement JSON editor; save/reset with dirty tracking). `RarityWeightBar.tsx` (reusable stacked bar — proportional segments, color-coded, editable weight inputs, readOnly mode). `DropPreview.tsx` (per-100-scenes artifact drop estimates, reactive).
   - [x] 5.5.2 — Skill Balance Viewer & Economy Tuning Panel: `SkillBalanceViewer.tsx` (fetches skills from `/api/admin/content/skills`, local coefficient state for reactive preview, category/class filter dropdowns, computes SkillBalanceRow arrays for diff highlighting). `SkillBalanceTable.tsx` (sortable 11-column table — name, category, class, base CD, base cost, cost@5/10/25, eff CD@10/25, ContentEditor deep-link; changed-cell highlighting, formatGold). `CoefficientPanel.tsx` (8 editable global coefficients with hints and dirty highlighting). `EconomyTuningPanel.tsx` (5-section container: EssenceXPCurve, EssenceEconomyPanel, SalvageRateTable, SubscriptionBoostPanel, ProgressionPanel; save/reset). `EssenceXPCurve.tsx` (CSS step-function chart — 5 positioned div bands, Y-axis labels, editable threshold/rate inputs, contextual help). `SalvageRateTable.tsx` (5 rarities × 4 columns with computed artifact/curated essence). `EssenceEconomyPanel.tsx` (drain/capacity/offline inputs, gold-to-essence preview at zones 1/5/10/25 via goldPerEssence). `SubscriptionBoostPanel.tsx` (4 boost sliders, stipend input, 2 collapsible JSON editors). `ProgressionPanel.tsx` (5 inputs, XP requirements preview at levels 10/25/50/99).
   - [x] 5.5.3 — GameConfigs Categories Reorganization & Tests: `GameConfigsCategoryView.tsx` (category tab bar with key counts + "All" + "Uncategorized", ConfigSearchBar with highlight badges, per-key rows with TypeAwareInput + description + game_impact tooltip + Meta button, grouped-by-category "All" view, search filtering, dirty indicator bar with save/reset). `TypeAwareInput.tsx` (type-inferred inputs: slider_01 with linked range+number, integer step=1, float step=0.01, text, boolean toggle, collapsible JSON textarea). `ConfigSearchBar.tsx` (cross-category search with dropdown results, category matching callback, jump-to-category). Extended `GameConfigs.tsx` (4 top-level tabs: All Configs / Drop Rates / Skill Balance / Economy, URL routing via `?tab=`, shared config state with serverConfigs/localConfigs, dirty tracking per key, centralized saveAll/resetAll, metadata modal preserved, dynamic page title). Tests: `TuningComponents.test.tsx` (50 vitest — tuning-utils unit 16, TypeAwareInput 6, RarityWeightBar 4, DropPreview 1, DropRateManager 6, SkillBalanceViewer 3, EconomyTuningPanel 5, ConfigSearchBar 2, GameConfigsCategoryView 3, GameConfigs integration 4). Updated `GameConfigs.test.tsx` (15 vitest — loading, tabs, config rendering, search, meta modal, tab switching).

 - [x] **5.4 — Banner & Scaling Editor (Visual & Difficulty Tuning) (COMPLETE)** *(Ref: `recs/5.4_BANNER_SCALING_EDITOR.md` | [Design](recs/5.4_BANNER_SCALING_EDITOR_DESIGN.md) | [Schema](recs/5.4_BANNER_SCALING_EDITOR_SCHEMA.md))*
   - [x] 5.4.0 — Requirements, design, and schema documentation (requirements, design, schema docs with consistency review)
   - [x] 5.4.1 — Visual Weight Editor & Global Wave Settings: Migration 059 (`stat_weights` JSONB on `visual_behaviors`, `wave_presets`, `wave_preset_assignments`, `difficulty_curves`, `difficulty_presets` tables, `difficulty_curve_id` FK on `books`, 4 wave default `game_configs` keys). Backend models (`scaling.py`: WavePreset, WavePresetAssignment, DifficultyCurve, DifficultyPreset; updated `classification.py` VisualBehavior +stat_weights, `narrative.py` Book +difficulty_curve_id, `__init__.py` re-exports). `validate_stat_weights()` added to classification service. Visual behavior PATCH extended for stat_weights. Frontend: `ScalingEditor.tsx` (5 sub-tab container), `VisualWeightEditor.tsx` (behavior selector, 3×3 sliders, proportional bars, clamp inputs, reset-to-defaults), `scaling-editor.css`. WorldBuilder.tsx updated (4th tab "Scaling & Difficulty").
   - [x] 5.4.2 — Wave Presets & Difficulty Curves: Backend service (`admin_scaling_service.py`: wave preset CRUD with config validation, assignment CRUD with uniqueness checks, apply-to-scenes bulk action, difficulty curve CRUD with curve_data validation, book assignment/unassignment, difficulty preset CRUD with auto-capture, capture-current endpoint, apply-preset atomic). Backend routes (`admin_scaling.py`: 17 endpoints — wave presets 8, difficulty curves 5, presets 4). Router registered in `main.py`. Frontend: `WavePresetManager.tsx` (CRUD table, config editor with spawn pattern dropdown, default toggle, assignment panel, apply-to-scenes bulk action), `DifficultyCurveManager.tsx` (CRUD table, chapter×dimension grid editor, add/remove chapter rows, book assignment panel).
   - [x] 5.4.3 — Scaling Preview & Difficulty Presets & Tests: Frontend: `scaling-utils.ts` (computeProjections, getCurveEntry, computeDelta), `ScalingPreview.tsx` (book selector, chapter range, A/B config source selectors, ScalingComparisonTable with color-coded diff cells and summary), `DifficultyPresetManager.tsx` (CRUD table, curve/wave picker, expandable config_snapshot, active badge, apply button), `PresetApplyModal.tsx` (change summary, diff display, warning banner, confirmation). Backend tests (`test_scaling.py`: 35 tests — wave preset CRUD 5, validation 5, default toggle 1, assignments 5, difficulty curve CRUD 5, validation 3, book assignment 2, preset CRUD 6, apply 2, stat_weights 1). Frontend tests (`ScalingEditor.test.tsx`: 7 vitest — tab rendering, switching, component mounting). Data dictionary updated for migration 059.

 - [x] **5.3 — Entity Type & Classification Management (COMPLETE)** *(Ref: `recs/5.3_ENTITY_CLASSIFICATION.md` | [Design](recs/5.3_ENTITY_CLASSIFICATION_DESIGN.md) | [Schema](recs/5.3_ENTITY_CLASSIFICATION_SCHEMA.md))*
   - [x] 5.3.0 — Requirements, design, and schema documentation (question → refine → design → schema → 2-pass consistency review)
   - [x] 5.3.1 — Entity Type & Family Normalization (Backend): Migration 058 (`entity_types`, `entity_families`, `visual_behaviors` tables; `attack_types` extended with `visual_behavior_id` FK + `stat_multipliers` JSONB; `entities.entity_type` VARCHAR→`entity_type_id` FK, `entities.entity_family` VARCHAR→`entity_family_id` FK; 3,936 entities migrated, 0 fallback). Backend models (`classification.py`: EntityType, EntityFamily, VisualBehavior; updated `gameplay.py` Entity, `attack_types.py` AttackType, `__init__.py` re-exports). Updated existing entity service/routes (`admin_content_entity_service.py`, `admin_content_entities.py`, `story_mode.py`, `discovery.py` — all string refs→FK joins). Classification CRUD service/routes (`admin_classification_service.py` + `admin_classification.py` router: entity type CRUD with deletion blocking + count, entity family CRUD with search + base_stat_template validation; registered in `main.py`).
   - [x] 5.3.2 — Visual Behavior System & Attack Type Extensions (Backend + Frontend): Visual behavior CRUD (transitive entity count via primary attack types, animation_config validation), attack type extended list/update (`visual_behavior_id`, `stat_multipliers`). Bulk assignment (6 actions: assign_type, assign_family, add_attack_types, replace_attack_types, set_primary, create_family), audit summary (6 coverage metrics + incomplete entity list), template preview/apply (family base × attack type multipliers → stat block). Search entities for bulk panel. Backend tests (`test_admin_classification.py`: 29 tests — entity type CRUD 7, family CRUD 4, visual behavior 3, attack type extensions 3, bulk assign 6, audit 2, template 3 + conftest JSONB fix).
   - [x] 5.3.3 — Frontend Classification UI: `ClassificationEditor.tsx` (6 sub-tab container), `EntityTypeManager.tsx` (color badges, sort, counts), `EntityFamilyManager.tsx` (search, stat template inputs, icon picker), `AttackTypeManager.tsx` (migrated from ContentEditor + visual behavior dropdown + StatMultiplierPanel), `VisualBehaviorManager.tsx` (AnimationConfigEditor, mapped attack types), `BulkAssignmentPanel.tsx` (entity search with filters, multi-select, 6 action sub-forms, confirmation, result toast), `ClassificationAudit.tsx` (6 summary cards, filterable incomplete table, quick-action buttons, CSV export), `TemplateApplyModal.tsx` (preview/apply with side-by-side diff). WorldBuilder.tsx updated (3rd tab "Classification"). ContentEditor.tsx updated (removed "Attack Types" tab). EntityEditor.tsx updated (`entity_type_id`/`entity_family_id` dropdowns, visual behavior badge). Frontend tests (ClassificationEditor.test.tsx: 7 vitest, EntityEditor.test.tsx: 8 vitest updated).

 - [x] **5.1 — Player & Character Management (Support Tooling) (COMPLETE)** *(Ref: `recs/5.1_PLAYER_CHARACTER_MANAGEMENT.md` | Design: `5.1_PLAYER_CHARACTER_MANAGEMENT_DESIGN.md` | Schema: `5.1_PLAYER_CHARACTER_MANAGEMENT_SCHEMA.md`)*
   - [x] 5.1.0 — Requirements, design, and schema documentation
   - [x] 5.1.1 — Character Deep Editor & Item Crafting Tool: Migration 056 (`admin_essence_adjustments` table + 3 indexes), `AdminEssenceAdjustment` SQLModel (`backend/models/admin.py`), re-export in `models/__init__.py`, data dictionary updated. Backend service (`backend/services/admin_character_service.py`: 20+ functions — `edit_character()`, `reassign_class()` with skill mapping by ID order, `check_equipment_requirements()`, `get_stat_breakdown()` with 6-source detail, `get_item_components()`, `craft_item_manual()`, `craft_item_random()`, `grant_crafted_item()`, `get_character_inventory()`, `edit_item()` with item_code parsing + stat recalc, `edit_artifact()` for generated prefix/suffix/rarity + curated rarity tier, `delete_item()`, `adjust_essence()`, `get_essence_history()`, `get_content_tree()`, `set_progression()` with forward backfill, `get_boss_completions()`, `reset_boss_completions()`, `get_character_skills()`, `update_character_skills()`, `get_player_timeline()` aggregating 5 categories). Backend routes (`backend/routes/admin_characters.py`: 18 endpoints — PATCH/GET characters, POST craft, GET components, PATCH/DELETE items, PATCH artifacts, POST/GET essence, PATCH progression, GET/DELETE/POST boss-completions, GET/PATCH skills, GET timeline, GET content-tree). 3 routers registered in `main.py`. Frontend: `StatBreakdownPanel.tsx` (expandable per-stat 6-source breakdown), `CharacterEditorModal.tsx` + CSS (name/level/XP/class editing, skill mapping confirmation, stat breakdown, equipment warnings), `ItemComponentPicker.tsx` (reusable gear slot-filtered component selector with range sliders), `ItemCraftModal.tsx` + CSS (Manual/Random tabs, live stat preview, bag warning), `ItemEditorModal.tsx` + CSS (item + artifact editing, before/after comparison, discard with confirm).
   - [x] 5.1.2 — Currency, Progression & Skill Editors: `EssenceAdjustModal.tsx` + CSS (grant/debit toggle, balance preview, >10k warning gate, recent history), `ProgressionEditorModal.tsx` + CSS (cascading Book→Chapter→Scene dropdowns, forward/backward indicator with backfill count, boss completions checkboxes + reset), `SkillEditorModal.tsx` + CSS (editable level/XP table, prerequisite enforcement with green ✓ / red 🔒 / yellow ⚠ indicators, class-exclusive star markers, Reset All with double-confirm). All wired into enhanced `PlayerDetail.tsx`.
   - [x] 5.1.3 — Activity Timeline, PlayerDetail Enhancements, Integration & Tests: `ActivityTimelineModal.tsx` + CSS (80vw×90vh modal, 5 category filters, date-grouped events, category-colored borders, expandable JSON detail, cursor-based Load More pagination). Enhanced `PlayerDetail.tsx` (7 action buttons per character card, enhanced cards with stats/essence/progression, collapsible inventory with equipped/bag/artifacts sections, rarity-colored clickable items → ItemEditorModal, Activity Timeline button at player level). Backend tests (`test_admin_characters.py`: 24 pytest). Frontend tests (8 test files, 25 vitest: CharacterEditorModal ×4, ItemCraftModal ×4, ItemEditorModal ×3, EssenceAdjustModal ×3, ProgressionEditorModal ×3, SkillEditorModal ×3, ActivityTimelineModal ×3, PlayerDetail ×2).

 - [x] **5.7 — Asset Registry & Sprite Management (COMPLETE)** *(Ref: `recs/5.7_ASSET_REGISTRY.md` | Design: `5.7_ASSET_REGISTRY_DESIGN.md` | Schema: `5.7_ASSET_REGISTRY_SCHEMA.md`)*
   - [x] 5.7.0 — Requirements, design, and schema documentation
   - [x] 5.7.1 — Backend Foundation: Migration 055 (`asset_registry` table with 5 indexes + updated_at trigger, `shop_items`/`shop_bundles` RENAME `icon_path` → `icon_asset_key` with data migration), SQLModel model (`backend/models/asset_registry.py`: AssetRegistryEntry + VALID_CATEGORIES), admin CRUD routes (`backend/routes/admin_assets.py`: 9 endpoints — paginated list with category/tag/search filters, get, create, update, delete with reference-check warning, orphan detection missing/unused, bulk import upsert, batch preload), router wired in `main.py`, `icon_path` → `icon_asset_key` renamed across 16 files (models, routes, admin UI, frontend, tests)
   - [x] 5.7.2 — Admin Asset Registry Page: 3 new components (`AssetRegistry.tsx` — full page with grid/table view, category filter tabs, search, create/edit modal with split layout JSON editor + live canvas preview with 200ms debounce, delete confirmation with reference warning, collapsible orphan detection panel with Missing/Unused tabs + bulk delete, pagination; `AssetPreview.tsx` — reusable canvas renderer for all 15 categories; `AssetRegistry.css` — complete dark-theme styling). Registered in admin sidebar via `App.tsx`.
   - [x] 5.7.3 — Frontend Asset Renderers & Integration: 7 new modules (`frontend/src/game/renderers/`: AssetRenderer.ts core dispatcher with LRU cache 200 entries, EntityRenderer.ts, BackgroundRenderer.ts with seeded PRNG, IconRenderer.ts with locked variant, AvatarRenderer.ts, PlaceholderRenderer.ts with dev_content_audit logging). `AssetProvider.tsx` React context with batch preload + `useAssets` hook. Refactored CombatStage.tsx, BossStage.tsx, BottomAnimatedBanner.tsx with asset preloading (existing inline rendering preserved as fallback). S3.7: RelicGallery.tsx + AchievementMatrix.tsx refactored to use IconRenderer via inline ArtifactIcon/AchievementIcon components with useSafeAssets pattern + preloadBatch.
   - [x] 5.7.4 — Existing Asset Migration, Bulk Import & Tests: Migration 055 seeds 196 assets (4 entity sprites, 1 class sprite, 8 backgrounds, 8 avatars, 2 default placeholders, 50 curated artifact icons, 100 achievement icons, 23 shop item icons). Backend tests (`test_asset_registry.py`: 20 tests, 18 pass / 2 skip on SQLite). Admin tests (`AssetRegistry.test.tsx`: 15 tests passing). Data dictionary updated. `GAME_ASSETS_GUIDE.md` rewritten for procedural approach. S4.4: All filesystem assets retired — `frontend/public/assets/avatars/` (8 PNGs), `frontend/public/assets/game/` (backgrounds/classes/enemies PNGs), `frontend/public/music/` (4 WAVs). 10+ components refactored from PNG paths to AvatarPreset/BackgroundRenderer API-driven rendering.

 - [x] **5.2 — Game Content Editor (Narrative & World Data) (COMPLETE)** *(Ref: `recs/5.2_GAME_CONTENT_EDITOR.md` | Design: `5.2_GAME_CONTENT_EDITOR_DESIGN.md` | Schema: `5.2_GAME_CONTENT_EDITOR_SCHEMA.md`)*
   - [x] 5.2.0 — Requirements, design, and schema documentation (requirements, design, schema docs with 2-pass consistency review)
   - [x] 5.2.1 — Book, Chapter & Scene Editors + Backgrounds + Wave Config: Migration 057 (`backgrounds` table, `scene_wave_configs` table, `background_id` FK on `scene_gameplay_data` with data migration, `description` column on `locations`). New SQLModel models (`backend/models/content.py`: Background, SceneWaveConfig, EntityAlias, EntityBeatAppearance, LocationAlias, LocationSceneAppearance, SemanticTag). Updated Entity model (+8 lore fields), Location model (+6 sensory/type fields), SceneGameplayData (+background_id). Backend service (`backend/services/admin_content_service.py`: Books list/get/create/update/delete, Chapters list/get/create/update/delete with book filter + pagination, Scenes list/get/create/update/delete with gameplay_data inline + boss_config validation, Backgrounds list/get/create/update/delete with asset_exists flag + scene_count, Wave Configs get/upsert/delete/list + apply_wave_template bulk scaling + bulk_adjust_multipliers + auto_populate from entity_scene_appearances). Backend routes (`backend/routes/admin_content.py`: 23 endpoints — Books 5, Chapters 5, Scenes 5, Backgrounds 5, Wave Configs 7). 7 shared components (`admin/src/components/content/shared/`: CascadingPicker, DeleteConfirmDialog, JsonEditor, AtmospherePicker, AssetPicker, EntityPicker, LocationPicker). Frontend (`admin/src/pages/WorldBuilder.tsx` top-level page, `admin/src/components/content/NarrativeEditor.tsx` 10-tab container, BookEditor, ChapterEditor, SceneEditor with BossConfigEditor + SceneGameplayPanel, WaveConfigPanel inline, WaveConfigBulk with template + multiplier adjustment, BackgroundEditor with grid/table toggle + parallax + color palette). App.tsx updated: "World Builder" nav link replaces "Content", `/world-builder/*` route.
   - [x] 5.2.2 — Entity & Story Beat Editors, Entity-Scene/Beat Mappers, Semantic Tags: Backend service (`backend/services/admin_content_entity_service.py`: Entities list with filters + aggregated counts / detail / families / create / update / delete with reference blocking / gameplay upsert+delete / attack types replace-all / alias add+remove, Entity-Scene list / create / bulk create skip duplicates / copy between scenes / update / delete, Entity-Beat list / create / bulk create / update / delete, Story Beats list / detail / create / update / reorder within scene / delete with reference blocking, Semantic Tags list / analytics category_counts+top_values+orphan_beat_count / create / bulk create / update / rename across category / delete). Backend routes (`backend/routes/admin_content_entities.py`: 33 endpoints — Entities 11, Entity-Scenes 6, Entity-Beats 5, Story Beats 6, Semantic Tags 7). Frontend: EntityEditor (multi-filter + pagination at 50/page, lore section collapsible, gameplay toggle, attack types checkbox grid with primary radio, inline aliases), StoryBeatEditor (cascading filters, reorder mode, word count, hidden lore section, inline semantic tags + entity-beat appearances), EntitySceneMapper (split-panel: tree view + entity assignments with expandable delta fields, copy-from-scene dialog), EntityBeatMapper (inline table), SemanticTagManager (analytics cards, rename form, bulk add).
   - [x] 5.2.3 — Location Editor, World Builder Shell, Polish & Tests: Backend service (`backend/services/admin_content_location_service.py`: Locations list with filters + aggregated counts / detail with aliases + scene appearances / types distinct / create / update / delete with reference blocking / alias add+remove, Location-Scenes list / create / update / delete). Backend routes (`backend/routes/admin_content_locations.py`: 12 endpoints — Locations 8, Location-Scenes 4). Frontend: LocationEditor (type/archetype filters, paginated, sensory detail textareas, aliases, read-only scene appearances). Route ordering bug fix: `/beats/reorder` and `/semantic-tags/rename` moved before parameterized routes. Backend tests (`backend/tests/test_admin_content.py`: 73 tests — Books 5, Chapters 6, Scenes 8, Beats 6, Entities 8, Entity-Scenes 5, Entity-Beats 4, Backgrounds 5, Wave Configs 7, Locations 6, Location-Scenes 4, Semantic Tags 6, Audit 3). Frontend tests (15 test files, 66 tests: WorldBuilder 2, CascadingPicker 2, DeleteConfirmDialog 2, JsonEditor 1, BookEditor 5, ChapterEditor 5, SceneEditor 7, StoryBeatEditor 6, EntityEditor 8, EntitySceneMapper 5, BackgroundEditor 4, WaveConfigPanel 5, WaveConfigBulk 4, LocationEditor 5, SemanticTagManager 5).

## REC_3: Economy & Monetization

 - [x] **3.6 — Admin Finance Dashboard & Tools (COMPLETE)** *(Ref: `recs/3.6_ADMIN_FINANCE_DASHBOARD.md` | Design: `3.6_ADMIN_FINANCE_DASHBOARD_DESIGN.md` | Schema: `3.6_ADMIN_FINANCE_DASHBOARD_SCHEMA.md`)*
   - [x] 3.6.0 — Backend Foundation: Migration 054 (`admin_shard_adjustments` table with 3 indexes, 5 `game_configs` marketplace_anomaly seeds), `AdminShardAdjustment` SQLModel (`backend/models/finance.py`), finance analytics service (`backend/services/finance_analytics_service.py`: 10 DB-driven aggregation functions — revenue overview/chart, shard economy/flow, subscription metrics, shop analytics, marketplace analytics, donation analytics, anomaly detection, player shard summary), admin finance routes (`backend/routes/admin_finance.py`: 15 endpoints — 8 analytics GET, 2 shard management, 1 Stripe refund, 3 dispute management, 1 anomaly detection), router wired in `main.py`
   - [x] 3.6.1 — Admin UI: Overview, Transactions, Shard Economy: 8 new components (`FinanceDashboard.tsx` — 8-tab page registered in admin navbar, `OverviewTab.tsx` — revenue cards + recharts BarChart + quick actions, `TransactionsTab.tsx` — paginated payment_orders table with filters/search/expandable detail/webhook viewer, `RefundModal.tsx` — full/partial Stripe refund with shard debit preview, `ShardEconomyTab.tsx` — economy health metrics + recharts AreaChart + balance integrity, `ShardAdjustModal.tsx` — player search + grant/debit + balance preview + warnings, `CsvExportButton.tsx` — reusable CSV export, `FinanceDashboard.css`)
   - [x] 3.6.2 — Admin UI: Subscriptions, Shop, Donations: 5 new components (`SubscriptionsTab.tsx` — metrics cards + subscriber table + extend/cancel/streak actions + gift sub + CSV, `ShopManagementTab.tsx` — 4 collapsible sections: item CRUD + bundle CRUD + featured rotation + analytics, `ShopItemModal.tsx` — structured booster form for item_metadata, `BundleModal.tsx` — multi-select item picker + discount calculator, `DonationsTab.tsx` — analytics cards + patron tier distribution + donor table + CSV). `FinanceTabs.css`.
   - [x] 3.6.3 — Admin UI: Marketplace, Disputes, PlayerDetail: 3 new components (`MarketplaceTab.tsx` — 3 sub-tabs: listings/trades/anomaly log + force remove/reverse trade modals, `DisputeQueueTab.tsx` — flagged accounts + expandable investigation panel + clear/warn/ban with double-confirm, `PlayerFinanceWidget.tsx` — compact embeddable widget with shard balance + inline adjust + quick stats + recent transactions). Modified `PlayerDetail.tsx` (collapsible Finance section). `MarketplaceDisputes.css`.
   - [x] 3.6.4 — Tests & Polish: Backend tests (`backend/tests/test_admin_finance.py`: 19 pytest — revenue overview, chart, shard economy, flow chart, grant/debit/validation, Stripe refund full/partial/already-refunded, disputes list/clear/ban, investigation, subscription metrics, shop analytics, marketplace anomalies ×2, donation analytics). Frontend tests (`FinanceDashboard.test.tsx`: 18 vitest — all 8 tabs render, tab switching, overview cards + actions, transactions filters + expandable + refund modal, shard economy metrics + adjustment modal + negative warning, subscriptions + actions + gift, shop management, marketplace + force remove, donations + stats, disputes + investigation + resolution, refresh, CSV export ×2). Data dictionary updated for migration 054. Requirements/design/schema checkboxes updated.

 - [x] **3.5 — Dreamwalker's Bazaar (Player Marketplace) (COMPLETE)** *(Ref: `recs/3.5_DREAMWALKERS_BAZAAR.md` | Design: `3.5_DREAMWALKERS_BAZAAR_DESIGN.md` | Schema: `3.5_DREAMWALKERS_BAZAAR_SCHEMA.md`)*
   - [x] 3.5.0 — Backend Foundation: Migration 053 (4 new tables: `marketplace_listings`, `marketplace_trades`, `marketplace_notifications`, `marketplace_price_history`; ALTER `players` + `player_artifacts` + `player_inventory` with `marketplace_listing_id` FKs; widened CHECK constraints on `shard_transactions`/`shop_items`; updated `enforce_inventory_slot_cap` trigger; seeded 7 Bazaar Permits, 4 titles, 9 achievements with parent chains, 15 game_configs keys), SQLModel models (`backend/models/marketplace.py`: MarketplaceListing, MarketplaceTrade, MarketplaceNotification, MarketplacePriceHistory), marketplace service (`backend/services/marketplace_service.py`: create_listing, buy_listing with row-level locking, cancel_listing, adjust_price, resolve_claim, expire_stale_listings, get_browse_listings with FIFO, get_my_listings, get_price_comparables), salvage service (`backend/services/salvage_service.py`: salvage_single, salvage_bulk, get_salvage_value with rarity rates + 2x artifact multiplier + 1.15x curated bonus), notification service (`backend/services/marketplace_notification_service.py`: create_notification, get_unread_notifications, mark_read, purge_old_notifications), player routes (`backend/routes/marketplace.py`: 13 endpoints — browse, buy, list, cancel, adjust-price, my-listings, trade-history, notifications, notifications/read, salvage, salvage-bulk, salvage-preview, claim), admin routes (`backend/routes/admin_marketplace.py`: 6 endpoints — listings, force-remove, trades, stats, player detail, reverse-trade), Bazaar Permit handling in `shop_service.py`, routers wired in `main.py`
   - [x] 3.5.1 — Player UI: Browse & Buy: 7 new components (BazaarTab.tsx — main container with sub-tabs + shard balance + notification overlay, BrowseListings.tsx — filters/search/sort/pagination, ListingCard.tsx — rarity-colored names + stats + price comparables + seller, BazaarPurchaseModal.tsx — item details + balance + "all sales final", TradeNotificationOverlay.tsx — sold/expired/removed z-1000 overlay, ClaimModal.tsx — replace/discard resolution). Modified ShopTab.tsx (4th tab "Dreamwalker's Bazaar"). BazaarTab.css (~500 lines dark theme styling).
   - [x] 3.5.2 — Player UI: Sell & Salvage: 6 new components (MyListings.tsx — active listings with expiry countdown + cancel/adjust + listing history, CreateListingModal.tsx — artifact/equipment toggle + item picker + price input + tax preview + equipped warning, PriceAdjustModal.tsx — current/new price + updated proceeds, NPCVendor.tsx — single/bulk mode + checkbox grid + rarity quick-select + curated exclusion + running Essence total + double-confirm, TradeHistory.tsx — paginated table with date/type/item/price/tax/counterparty + filter, BazaarPermitUpsell.tsx — slot usage indicator + next permit cost + CTA). BazaarSell.css (~700 lines).
   - [x] 3.5.3 — Tests & Polish: Backend tests (`backend/tests/test_marketplace.py`: 32 pytest — listing CRUD ×7, buy flow ×8, claim queue ×4, salvage ×6, notifications ×2, expiry ×2, slot expansion ×1, admin ×2). Frontend tests (`BazaarTab.test.tsx`: 12 vitest — tab render, sub-tabs, filters, search, pagination, listing card states, NPC vendor modes, notifications). Achievement integration (6 marketplace tracking sources wired into `achievement_service.py`). Data dictionary updated for migration 053. Requirements/design checkboxes updated.

 - [x] **3.1 — Stripe Integration & Shard Purchasing (COMPLETE)** *(Ref: `recs/3.1_STRIPE_SHARD_PURCHASING.md` | Design: `3.1_STRIPE_SHARD_PURCHASING_DESIGN.md` | Schema: `3.1_STRIPE_SHARD_PURCHASING_SCHEMA.md`)*
   - [x] 3.1.0 — Backend Foundation: Migration 049 (shard_packages/payment_orders/stripe_webhook_events tables, 3 player columns, 6 game_configs seeds, 6 package tiers), SQLModel models (`backend/models/payments.py`), payment service (`backend/services/payment_service.py`: credit_shards/debit_shards/get_or_create_stripe_customer/calculate_refund_shards/check_balance_integrity), payment routes (`backend/routes/payments.py`: POST /checkout, GET /packages, GET /status/{session_id}, GET /transactions), webhook handler (`backend/routes/webhooks.py`: 5 Stripe event handlers with signature verification + dedup)
   - [x] 3.1.1 — Refund & Dispute: Refund webhook (charge.refunded) with proportional shard debit formula, dispute webhooks (charge.dispute.created/closed) with account flagging, dispute-won re-credit + flag clear, negative balance allowed
   - [x] 3.1.2 — Player UI: ShopTab.tsx (unified "Buy Shards" + placeholder "Spend Shards" tabs), PackageCard.tsx (best-value/2x/limited-qty badges), PurchaseConfirmModal.tsx (age disclaimer, legal footer), TransactionHistory.tsx (paginated, refund eligibility), RefundRequestModal.tsx (partial/full options), PaymentStatus.tsx (3s polling, 60s timeout, success animation), TopBar shard balance wired to API (replaced hardcoded "10"), MainGameLayout shop tab wired
   - [x] 3.1.3 — Reconciliation & Polish: Admin endpoints (`backend/routes/admin_payments.py`: POST /reconcile, POST /poll-refunds, POST /check-balances, GET /webhook-events), backend tests (23 pytest), frontend tests (37 vitest across 5 files), data dictionary updated, TermsPage.tsx §6 expanded with virtual currency legal text, ToS date bumped

 - [x] **3.2 — Subscription: Elysium Ascendant (COMPLETE)** *(Ref: `recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` | Design: `_DESIGN.md` | Schema: `_SCHEMA.md`)*
   - [x] 3.2.0 — Backend Foundation: Migration 050 (player_subscriptions/subscription_stipend_log tables, 2 player columns, 11 game_configs seeds, 10 titles, 11 achievements), SQLModel models (`backend/models/subscriptions.py`), subscription service (`backend/services/subscription_service.py`: activate/renew/cancel/reactivate/expire/refund/mark_past_due, get_subscriber_multipliers, grace period calculator with US business day logic), subscription routes (`backend/routes/subscriptions.py`: POST /create, GET /status, POST /cancel, POST /reactivate, POST /switch), webhook handlers (invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, checkout.session.completed subscription mode)
   - [x] 3.2.1 — Benefits & Boosts: Server-side boost multipliers (XP 1.15x, Essence 1.15x, Drop Rate 1.10x, Training Speed 1.10x) applied in story_mode.py, game_training.py, achievement_service.py, artifact_service.py. Lazy stipend crediting (150 base + streak bonus, period_key idempotency). Loyalty streak/cumulative tracking with title grants at 7 milestones. Streak-based boost escalation from game_configs JSON.
   - [x] 3.2.2 — Player UI: SubscriptionPage.tsx (status, subscribe, cancel/reactivate/switch with modals, stipend history), SubscriptionCard.tsx (plan cards), LoyaltyProgress.tsx (dual-track timeline), BoostDisplay.tsx (multiplier panel with streak breakdown), PaymentWarningBanner.tsx (grace countdown), Chat ★ badge, Leaderboard ★ indicator, Sidebar "Ascendant" tab
   - [x] 3.2.3 — Admin & Polish: Admin endpoints (`backend/routes/admin_subscriptions.py`: GET list, POST gift, POST extend, POST force-cancel, PATCH streak), achievement integration (4 new tracking sources: cumulative_sub_months, continuous_sub_streak, shards_purchased, shards_spent), backend tests (40 pytest), frontend tests (15 vitest across 4 files), E2E tests (6 Playwright in `testing/subscription.spec.ts`: non-subscriber view, subscribe checkout, active subscriber view, cancel modal, reactivate flow, chat badge), data dictionary updated

 - [x] **3.3 — The Elysium Emporium (Overworld Shop) (COMPLETE)** *(Ref: `recs/3.3_ELYSIUM_EMPORIUM.md` | Design: `3.3_ELYSIUM_EMPORIUM_DESIGN.md` | Schema: `3.3_ELYSIUM_EMPORIUM_SCHEMA.md`)*
   - [x] 3.3.0 — Backend Foundation: Migration 051 (shop_items/shop_bundles/shop_bundle_items/player_shop_items/player_active_boosters tables, equipped cosmetic columns on players + player_characters, widened shard_transactions CHECK, 9 game_configs seeds, 32 items + 3 bundles + 9 bundle mappings), SQLModel models (`backend/models/shop.py`: ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster), shop service (`backend/services/shop_service.py`: purchase_item, purchase_bundle, equip_cosmetic, unequip_cosmetic, get_catalog, get_player_collection, get_active_boosters, increment_booster_time, admin_refund_item), `credit_shards_direct()` + internal flush variants in payment_service.py, player routes (`backend/routes/shop.py`: 8 endpoints), admin routes (`backend/routes/admin_shop.py`: 9 endpoints), router registration in main.py
   - [x] 3.3.1 — Booster Engine & Multiplier Integration: `get_effective_multipliers()` in `backend/services/boost_service.py` (subscription × shop booster multiplicative stacking), replaced all `get_subscriber_multipliers()` calls in story_mode.py, game_training.py, achievement_service.py. Booster time increment on story session `/complete` and idle training ticks. Lazy expiry (mark expired when elapsed >= duration on any access). Anti-cheat clamping via `shop_booster_max_elapsed_per_ping` config.
   - [x] 3.3.2 — Player UI: 8 new components (EmporiumTab.tsx, ShopItemCard.tsx, ShopCategoryFilter.tsx, ShopPurchaseModal.tsx, BoosterPanel.tsx, BundleCard.tsx, FeaturedSection.tsx with CountdownTimer, MyCollection.tsx with equip/unequip). Modified ShopTab.tsx ("Elysium Emporium" replaces disabled placeholder), TopBar.tsx (booster indicators + countdown next to shard balance), GlobalHeader.tsx (booster buff chips in story mode buff tray), GameContext.tsx (ActiveBooster state, 30s booster ping polling, 1s client-side countdown). EmporiumTab.css (~500 lines styling).
   - [x] 3.3.3 — Tests & Polish: Backend tests (`backend/tests/test_shop.py`: 26 pytest), frontend tests (`EmporiumTab.test.tsx`: 10 vitest), data dictionary updated for migration 051, requirements checkboxes updated.

 - [x] **3.4 — Donations (One-Time Support) (COMPLETE)** *(Ref: `recs/3.4_DONATIONS.md`)*
   - [x] 3.4.0 — Backend Foundation: Migration 052 (`donations` table, `players` ALTER 4 cols, patron seed data: 6 shop_items + 5 titles + 1 achievement + 10 game_configs, `shard_transactions` CHECK update), SQLModel model (`backend/models/donation.py`: Donation), donation service (`backend/services/donation_service.py`: create_donation_checkout_session, process_donation_webhook, calculate_patron_tier, _grant_patron_cosmetics, get_patron_status, get_donation_history, get_donor_leaderboard, get_recent_donors, toggle_donor_visibility, admin_get_donations, admin_get_donation_stats, admin_get_player_donations), player routes (`backend/routes/donations.py`: 6 endpoints — create-session, status, history, leaderboard, recent, visibility), admin routes (`backend/routes/admin_donations.py`: 3 endpoints — list, stats, player detail), webhook extension (`backend/routes/webhooks.py`: order_type=donation routing)
   - [x] 3.4.1 — Player UI: 5 new components (SupportUsTab.tsx — main container with tier buttons $1-$100 + custom input + opt-in + Stripe redirect, RecentDonorsBanner.tsx — rotating 5s ticker, DonationConfirmModal.tsx — no-shard disclaimer, PatronStatus.tsx — tier display + progress, DonorLeaderboard.tsx — Hall of Honor top 50). SupportUsTab.css (~300 lines dark theme). Modified ShopTab.tsx (added "Support Us" as 3rd tab).
   - [x] 3.4.2 — Tests & Polish: Backend tests (`backend/tests/test_donations.py`: 19 pytest — tier calculation ×7, session creation ×2, webhook processing ×3, patron status ×2, leaderboard ×3, admin stats ×2), frontend tests (`SupportUsTab.test.tsx`: 7 vitest — tab render, custom validation, confirm modal ×2, patron status, leaderboard, recent banner), data dictionary updated for migration 052, requirements checkboxes updated.
   - [x] 3.3.0 — Backend Foundation: Migration 051 (shop_items/shop_bundles/shop_bundle_items/player_shop_items/player_active_boosters tables, equipped cosmetic columns on players + player_characters, widened shard_transactions CHECK, 9 game_configs seeds, 32 items + 3 bundles + 9 bundle mappings), SQLModel models (`backend/models/shop.py`: ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster), shop service (`backend/services/shop_service.py`: purchase_item, purchase_bundle, equip_cosmetic, unequip_cosmetic, get_catalog, get_player_collection, get_active_boosters, increment_booster_time, admin_refund_item), `credit_shards_direct()` + internal flush variants in payment_service.py, player routes (`backend/routes/shop.py`: 8 endpoints), admin routes (`backend/routes/admin_shop.py`: 9 endpoints), router registration in main.py
   - [x] 3.3.1 — Booster Engine & Multiplier Integration: `get_effective_multipliers()` in `backend/services/boost_service.py` (subscription × shop booster multiplicative stacking), replaced all `get_subscriber_multipliers()` calls in story_mode.py, game_training.py, achievement_service.py. Booster time increment on story session `/complete` and idle training ticks. Lazy expiry (mark expired when elapsed >= duration on any access). Anti-cheat clamping via `shop_booster_max_elapsed_per_ping` config.
   - [x] 3.3.2 — Player UI: 8 new components (EmporiumTab.tsx, ShopItemCard.tsx, ShopCategoryFilter.tsx, ShopPurchaseModal.tsx, BoosterPanel.tsx, BundleCard.tsx, FeaturedSection.tsx with CountdownTimer, MyCollection.tsx with equip/unequip). Modified ShopTab.tsx ("Elysium Emporium" replaces disabled placeholder), TopBar.tsx (booster indicators + countdown next to shard balance), GlobalHeader.tsx (booster buff chips in story mode buff tray), GameContext.tsx (ActiveBooster state, 30s booster ping polling, 1s client-side countdown). EmporiumTab.css (~500 lines styling).
   - [x] 3.3.3 — Tests & Polish: Backend tests (`backend/tests/test_shop.py`: 26 pytest — purchase cosmetic ×4, class-specific skin ×2, booster purchase ×3, booster timer ×4, bundle purchase ×3, limited-time ×1, equip/unequip ×4, combined multiplier ×1, catalog ×2, admin refund ×2). Frontend tests (`EmporiumTab.test.tsx`: 10 vitest — catalog render, item cards, purchase modal, booster warning, insufficient balance, countdown timer, bundle card, bundle partial ownership, My Collection, Buy More Shards). Data dictionary updated for migration 051. Requirements checkboxes updated.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
- [x] **2.0 — Loop A: Overworld / Hub (Skeleton & Framework)** *(Ref: `recs/2.0_GAME_LOOP.md`)*
- [x] **2.1 — Loop A: Overworld / Hub (Detailed Implementation)** *(Ref: `recs/2.1_OVERWORLD_HUB.md`)*
  - [x] **Atmospheric Battle Banner (PixiJS)** *(Ref: `recs/2.1.1_ATMOSPHERIC_BATTLE_BANNER.md`)*
 - [x] **2.2.0 — Investigations & Infrastructure**
 - [x] **2.2.0 — Backend Infrastructure**        
 - [x] **2.2.1 — UI/UX & Interaction Layer** *(Ref: `recs/2.2.1_STORY_MODE_UI.md`)*
 - [x] **2.2.2 — Combat Engine & Wave Logic**        
 - [x] **2.2.3 — Narrative & Combat Sync**        
 - [x] **2.2.4 — In-Session Progression & Scaling**        
 - [x] **2.2.5 — Victory & Meta-Rewards**        
 - [x] **2.2.6 — Frontend Tests** *(Ref: `docs/how-to/TESTING.md`)*        
 - [x] **2.2.7 — Polish & Remaining Requirements** *(from `2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md`)*
 - [x] **2.2.8 — BUGS AND FIXES** *(from `2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md`)*   (backend/routes/story_mode.py and frontend/src/game/components/story/CombatStage.tsx)
 - [x] **2.2.9 — NARRATIVE INTERSTITIALS** (1.2 Option C)
 - [x] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `recs/2.3_IDLE_TRAINING.md`, `recs/2.3.1_IDLE_TRAINING_UX.md`, `recs/2.3.1.0_IDLE_TRAINING_SCHEMA.md`)*
 - [x] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `recs/2.4_CHARACTER_PROGRESSION.md`, `recs/2.4_CHARACTER_PROGRESSION_DESIGN.md`, `recs/2.4_CHARACTER_PROGRESSION_SCHEMA.md`)*
   - [x] 2.4.0 — Foundation: Extensible Stats & Character Level (migrations 030–031, models, stat calc, XP accrual, level-up, frontend stat panel + level bar + class visuals)
   - [x] 2.4.1 — Skill System: Prerequisites & Class Abilities (migrations 032–033, prerequisite evaluation, Level 0 system, dual-leveling, skill tree API, second hotbar row, effect handlers)
   - [x] 2.4.2 — Dream Item System (migrations 034–035, 5-component item generator, rarity tiers, run achievement evaluator, inventory CRUD, PostBattleSummary loot, equip/swap UI)
   - [x] 2.4.3 — Admin Panel: Config Browser + Content Editor (admin CRUD for configs/stats/classes/skills/benefits/items, GameConfigs + ContentEditor frontend pages)
   - [x] 2.4.4 — Cross-Cutting / Final (data dictionary, E2E Playwright tests, doc pass)
 - [x] **2.5 — Audio & Music Integration** *(Ref: `recs/2.5_AUDIO_MUSIC.md`, `recs/2.5_AUDIO_MUSIC_SCHEMA.md`)*
   - [x] 2.5.0 — Foundation: Audio Infrastructure & Settings (migration 039, atmospheres/audio_configs tables, SQLModel models, hierarchy resolution endpoint, SFX configs endpoint, player settings, AudioSettingsModal, MuteToggle)
   - [x] 2.5.1 — Music System: MusicManager & Web Audio Synthesis (OscillatorNode chain renderer, 2s cross-fade, tab visibility handling, replaced AudioPlayer.tsx)
   - [x] 2.5.2 — SFX System: SFXEngine & Game Integration (SFXEngine singleton, spatial panning, integrated into CombatStage/SkillsHotbar/PostBattleSummary/BossStage/UI)
   - [x] 2.5.3 — Admin Panel & Content Tools (AtmosphereEditor, SFXConfigEditor, Web Audio preview, batch assignment, generate_8bit_music.py, generate_8bit_sfx.py, classify_atmospheres.py, 19 backend + 19 admin tests)
   - [x] 2.5.4 — Polish, Idle Integration & Final QA (Idle Training music via archetype prop, migration 040: 52 music definitions + 5 boss themes + 6 extended SFX, data dictionary update, regression: 337 backend / 99 admin / 201 frontend passing)

 - [x] **2.6 — Economy, Anti-Cheat & Discovery (COMPLETE)** *(Ref: `recs/2.6_ECONOMY_ANTICHEAT.md`, Design: `2.6_ECONOMY_ANTICHEAT_DESIGN.md`, Schema: `2.6_ECONOMY_ANTICHEAT_SCHEMA.md`)* — Deployment `--max-instances=1` deferred to §99.5 in `0_REQUIREMENTS.md`
   - [x] 2.6.0 — Animation Toggle: Reduce Motion toggle in TopBar.tsx, `body.reduce-motion` CSS class, `prefers-reduced-motion` baseline + user override, static banner replacement for BottomAnimatedBanner, reduceMotion state in GameContext
   - [x] 2.6.1 — Anti-Cheat Hardening: Migration 041 (4 game_configs), wave validation DPS ceiling in `/tick`, session integrity check at `/complete`, anomaly logging to `activity_events`, CPS state machine (NORMAL→FLASHING→WARNING→COOLDOWN) in StoryMode.tsx
   - [x] 2.6.2 — Discovery System: Migrations 042-043, `PlayerEntityDiscovery` + `PlayerDiscoveryLog` models, `entity_family` on Entity, 6 discovery API endpoints (`/api/game/registry/*`), tick extension with entity_encounters/item_discoveries, Mist/Grey/Revealed visibility logic, E/C/A/SS rank system, EthericRegistry.tsx, DiscoveryLibrary.tsx, 6 wiki pages + HelpIcon, `tools/classify_entity_families.py`
   - [x] 2.6.3 — Onboarding & UI Polish: WelcomeModal.tsx (changelog.json, version tracking), TutorialOverlay.tsx (coach-mark spotlight, 7-step tutorial), changelog.json initial data
   - [x] 2.6.4 — Chat System: Migrations 044-045, ChatChannel model, ConnectionManager singleton + ChatRateLimiter + BroadcastRateLimiter in `services/chat.py`, WebSocket endpoint (`/ws/chat` with JWT auth), profanity filter (pyahocorasick + blocklist), mute support via PlayerSettings, ChatTab.tsx + chatClient.ts (auto-reconnect, exponential backoff), admin ChatManager.tsx (channels, monitor, mute controls), admin_chat.py endpoints
   - [x] 2.6 Cross-Cutting: Migrations 041-045 applied to dev DB, data dictionary updated through 045, backend tests (52 passing incl. rare spawn + tick entity encounters), frontend tests (242 passing: ChatTab, EthericRegistry, WelcomeModal, TutorialOverlay, GoldOdometer reduce-motion, HelpIcon, discovery counters), admin tests (106 passing: ChatManager 7 tests), E2E Playwright spec (economy_discovery.spec.ts: reduce-motion, discovery flow, chat, changelog)
   - [x] 2.6.2 Remaining: Random spawn engine (`_check_rare_spawn` in story_mode.py), rare spawn VFX (blue glow aura in CombatStage), entity encounter accumulation (`pendingEntityEncounters` Map in StoryMode), discovery counters on Home Base Hub, tick integration (flush entity_encounters with tick payload)
   - [x] 2.6.3 Remaining: "Magic Research 2" aesthetic polish in index.css (panels, buttons, modals, focus states, tooltips, stat bars), Terminal Exception verified (no polish leaks into Idle Training)
   - [x] 2.6.4 Remaining: System broadcasts on boss first-clear, chapter completions, rare item drops (rarity >= broadcast_rarity_min), rate-limited via BroadcastRateLimiter, ChatTab broadcast rendering (blue, bold, ⚡ prefix)

 - [x] **2.7 — Home Base Hub (Meta-Progression & Collections)** *(Ref: `recs/2.7_HOME_BASE_HUB.md` | Design: `2.7_HOME_BASE_HUB_DESIGN.md` | Schema: `2.7_HOME_BASE_HUB_SCHEMA.md`)*
   - [x] 2.7.0 — Foundation: Artifact System & Schema (migrations 046–048, curated_artifacts/tiers/player_artifacts/achievements/titles/leaderboard_cache tables, SQLModel models, artifact generation service, curated artifact drops in `/complete`, `recalculate_character_stats()` with artifact bonuses, backend tests)
   - [x] 2.7.1 — Akashic Log Enhancements (`GET /akashic-log` with full beat hierarchy + hidden lore + intelligence gating, AkashicLog.tsx with keyword search + completion % + beat detail, "new" badge tracking via `akashic_last_visited_at`, backend + frontend tests)
   - [x] 2.7.2 — Relic Gallery & Artifact UI (`GET /artifacts` with owned + curated silhouettes, RelicGallery.tsx with grid/filtering/sorting/collection progress, ArtifactInspectionModal.tsx, empty slot silhouettes with source hints, backend + frontend tests)
   - [x] 2.7.3 — Leaderboard Expansion & Achievement Matrix (leaderboard_service.py: 4 categories vanguard/alchemist/swift/scholar with TTL cache, badge tiers by percentile; achievement_service.py: cumulative stat aggregation, parent chain enforcement, reward distribution; HallOfEchoes.tsx + AchievementMatrix.tsx; title system with equip/unequip; achievement toast in PostBattleSummary; 24 backend + 27 frontend tests)
   - [x] 2.7.4 — Admin Tools & Polish (admin_home_base.py: 14 endpoints for artifact/achievement CRUD + player override + analytics; ArtifactEditor.tsx + AchievementEditor.tsx admin pages; `GET /summary` hub endpoint with badge counts; idle training milestone rewards L25/50/75/99; MR2 terminal theme with amber accents; reduce motion compliance; 26 admin tests)
   - [x] 2.7.5 — Final Polish & Hub Integration
     - [x] Hub Integration: HomeBase.tsx restructured from scrollable grid to 6-tab layout (Akashic Log | Relic Gallery | Hall of Echoes | Achievements | Etheric Registry | Discovery Library), wired as primary "home" tab in MainGameLayout.tsx
     - [x] Relic Power Badge: Compact gem icon in HeroStats.tsx (Story Mode only), fetches artifact stat_total, shows total bonus with click-to-expand per-stat breakdown (STR/AGI/INT/CRIT)
     - [x] Milestones Tab: 5th "Milestones" tab in HallOfEchoes.tsx, 4x4 grid (4 idle skills x L25/50/75/99), pulls from `/api/game/training/skills`, checkmarks for completed + percentage for in-progress, Essence reward display per tier
     - [x] Badge Icon Enhancement: CSS `::after` pseudo-element symbols on leaderboard badge circles (Cosmic=star + pulse glow, Gold=diamond, Silver=chevron, Bronze=plain), reduce-motion compliant
     - [x] Artifact Generation Config: Collapsible panel in ArtifactEditor.tsx for 7 artifact-related game_configs keys (3 drop chances + 3 rarity weight JSONs + stat multiplier), per-key save via PATCH API

## Requirements Doc Audit (Post-2.5)
- [x] **Full Requirements Audit & Code Verification** (all docs through 2.5)
  - [x] Checked off ~100+ implemented items across `2.0_GAME_LOOP.md`, `2.2_STORY_MODE.md`, `2.3.1.0_IDLE_TRAINING_SCHEMA.md`, `2.4_CHARACTER_PROGRESSION.md`, `2.5_AUDIO_MUSIC.md`, `0_REQUIREMENTS.md`, `1_ONBOARDING_INIT_RECS.md`
  - [x] Code-verified 15 flagged items via Explore agents — resolved 9 as implemented (Settings Gear partial, Battle Banner, Screen Shake, Offline Summary, Progression Mode, Test Criteria, Migration Checklist, Map Node States, Skill Unlock partial)
  - [x] 8 genuinely incomplete items documented in TODO.md under "Incomplete Items from Completed Phases"
  - [x] Moved completed 2.5 block from TODO.md to DONE.md

## Book Processing Post Processing Stuff
- [x] **Book Processing Phase 3** (all changes via `psql` against the live DB)  
  - [x] Check for some consolidation and cleanup (realize entities from other books might be different.)
  - [x] Check for missing data in the locations tables, entity tables (e.g. base description, emotional state, sounds, smells, equipment, abilities). If missing, generate and INSERT/UPDATE via SQL.

## Phase 7: Onboarding, Profiles & Initial Admin 🧭
- [x] **7.1 — Database Migration** *(RECS §10, SCHEMA §1-10)*
- [x] **7.2 — Backend Auth Middleware** *(RECS §2.3, FR-2.11 through FR-2.15)*
- [x] **7.3 — Player Profile System (API & UI)** *(RECS §3.2, FR-3.7 through FR-3.12, §5.3)*
- [x] **7.4 — Character System API** *(RECS §4.3, FR-4.8 through FR-4.11)*
- [x] **7.5 — Frontend: Splash Page** *(RECS §5.1, FR-5.1 through FR-5.7)*
- [x] **7.6 — Frontend: Onboarding Flow** *(RECS §5.2, FR-5.8 through FR-5.26)*
- [x] **7.7 — Frontend: Home Base** *(RECS §5.3, FR-5.27 through FR-5.31)*
- [x] **7.8 — Server Config System** *(RECS §8, FR-8.1 through FR-8.12)*
- [x] **7.9 — Support Ticket System** *(RECS §6, FR-6.1 through FR-6.20)*
- [x] **7.10 — Admin: User Management** *(RECS §7, FR-7.1 through FR-7.14)*
- [x] **7.11 — Activity Events & Audit Log** *(RECS §9, FR-9.1 through FR-9.17)*
- [x] **7.12 — Harden Admin Auth** *(RECS §2.2, FR-2.7 through FR-2.10)*
- [x] **7.13 — Onboarding & Admin: Polishing & Refinements**
- [x] **7.14 — Styling, Theming & Lore Alignment**
  - Created: `docs/explanation/SUMMARY_MARKETING.md`, `docs/BOOKS_SUMMARY.md`, `docs/reference/STYLE_GUIDE.md`, `docs/CHARACTER_GUIDE.md`, `docs/ENVIRONMENT_GUIDE.md`, `docs/ANNOUNCEMENT.md`
  - Full CSS variable refactor (17 files, crimson/cyan palette from book cover)
  - Lore rewrite: Splash + About pages updated from generic fantasy to sci-fi cosmic horror
  - Character class rename: Sentinel→Engineer, Arcanist→Conduit, Wanderer→Drifter, Invoker→Vessel
  - DB migration: `db/009_rename_classes.sql`
  - Tests updated: SplashPage.test.tsx, AboutPage.test.tsx

## Phase 6: Book Processing 📚
- [x] Create requirements for the Book processor (recs/BOOK_AGENT_READER.md)
- [x] Create Book processor
- [x] Add in DB_INIT bit to the BOOK processor to create tables from the .sql script if not already there.
- [x] Issue at the end of parsing Book 1 resolution.
- [x] Add a pause between books, ask to continue, change model, or exit.
- [x] Verify that a pause occurs at the end of the Phase 1 to Phase 2 transition.
- [x] Update requirements for "mini-bosses" and "big boss" identification.
- [x] Create a dump table CSV export system.
- [x] Execute processing and load to DB (Phase 1 & 2 - extract and split the text).

## Phase 5: CI/CD & Deployment 🤖
- [x] **Google Cloud Build Integration** (Migrated from GitHub Actions).
- [x] Automated deployments to Cloud Run via Cloud Build.
- [x] Update ENV and manual deploy scripts for GCP.
- [x] Review and implement testing frameworks across the stack.

## Phase 4: Manual Deployment & Cloud Connectivity 🚀
- [x] Manual GCP Deployment scripts and initial push.
- [x] Cloud SQL Connectivity & Security (SSL, IAM, Auth Proxy).
- [x] DNS Setup and Firebase authorized URL updates.

## Phase 3: Containerization & Local Dev 🐳
- [x] Dockerize Backend, Frontend, and Admin services.
- [x] Orchestration via `docker-compose.yml`.

## Phase 2: "Hello World" Implementation 🚀
- [x] Backend API (Python/FastAPI) skeleton.
- [x] Frontend & Admin (React/TS) skeletons.
- [x] Firebase Auth (Google SSO) login flows.
- [x] Initial local server testing.

## Phase 1: Infrastructure & Project Structure 🏗️
- [x] Define Directory Structure.
- [x] Google Cloud Platform Setup (Project, APIs, Cloud SQL).
- [x] Authentication & Security (Firebase, Stripe setup).
- [x] Environment Configuration (.env.example templates).
