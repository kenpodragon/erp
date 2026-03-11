# ERP Project Kickstart COMPLETED TODO

This document tracks the completed development phases for the Elysium Rising mmorPg (ERP). Tasks are moved here from `TODO.md` once finalized.

---
*Updated: 2026-03-11*

## REC_3: Economy & Monetization

 - [x] **3.1 — Stripe Integration & Shard Purchasing (COMPLETE)** *(Ref: `docs/recs/3.1_STRIPE_SHARD_PURCHASING.md` | Design: `3.1_STRIPE_SHARD_PURCHASING_DESIGN.md` | Schema: `3.1_STRIPE_SHARD_PURCHASING_SCHEMA.md`)*
   - [x] 3.1.0 — Backend Foundation: Migration 049 (shard_packages/payment_orders/stripe_webhook_events tables, 3 player columns, 6 game_configs seeds, 6 package tiers), SQLModel models (`backend/models/payments.py`), payment service (`backend/services/payment_service.py`: credit_shards/debit_shards/get_or_create_stripe_customer/calculate_refund_shards/check_balance_integrity), payment routes (`backend/routes/payments.py`: POST /checkout, GET /packages, GET /status/{session_id}, GET /transactions), webhook handler (`backend/routes/webhooks.py`: 5 Stripe event handlers with signature verification + dedup)
   - [x] 3.1.1 — Refund & Dispute: Refund webhook (charge.refunded) with proportional shard debit formula, dispute webhooks (charge.dispute.created/closed) with account flagging, dispute-won re-credit + flag clear, negative balance allowed
   - [x] 3.1.2 — Player UI: ShopTab.tsx (unified "Buy Shards" + placeholder "Spend Shards" tabs), PackageCard.tsx (best-value/2x/limited-qty badges), PurchaseConfirmModal.tsx (age disclaimer, legal footer), TransactionHistory.tsx (paginated, refund eligibility), RefundRequestModal.tsx (partial/full options), PaymentStatus.tsx (3s polling, 60s timeout, success animation), TopBar shard balance wired to API (replaced hardcoded "10"), MainGameLayout shop tab wired
   - [x] 3.1.3 — Reconciliation & Polish: Admin endpoints (`backend/routes/admin_payments.py`: POST /reconcile, POST /poll-refunds, POST /check-balances, GET /webhook-events), backend tests (23 pytest), frontend tests (37 vitest across 5 files), data dictionary updated, TermsPage.tsx §6 expanded with virtual currency legal text, ToS date bumped

 - [x] **3.2 — Subscription: Elysium Ascendant (COMPLETE)** *(Ref: `docs/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` | Design: `_DESIGN.md` | Schema: `_SCHEMA.md`)*
   - [x] 3.2.0 — Backend Foundation: Migration 050 (player_subscriptions/subscription_stipend_log tables, 2 player columns, 11 game_configs seeds, 10 titles, 11 achievements), SQLModel models (`backend/models/subscriptions.py`), subscription service (`backend/services/subscription_service.py`: activate/renew/cancel/reactivate/expire/refund/mark_past_due, get_subscriber_multipliers, grace period calculator with US business day logic), subscription routes (`backend/routes/subscriptions.py`: POST /create, GET /status, POST /cancel, POST /reactivate, POST /switch), webhook handlers (invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, checkout.session.completed subscription mode)
   - [x] 3.2.1 — Benefits & Boosts: Server-side boost multipliers (XP 1.15x, Essence 1.15x, Drop Rate 1.10x, Training Speed 1.10x) applied in story_mode.py, game_training.py, achievement_service.py, artifact_service.py. Lazy stipend crediting (150 base + streak bonus, period_key idempotency). Loyalty streak/cumulative tracking with title grants at 7 milestones. Streak-based boost escalation from game_configs JSON.
   - [x] 3.2.2 — Player UI: SubscriptionPage.tsx (status, subscribe, cancel/reactivate/switch with modals, stipend history), SubscriptionCard.tsx (plan cards), LoyaltyProgress.tsx (dual-track timeline), BoostDisplay.tsx (multiplier panel with streak breakdown), PaymentWarningBanner.tsx (grace countdown), Chat ★ badge, Leaderboard ★ indicator, Sidebar "Ascendant" tab
   - [x] 3.2.3 — Admin & Polish: Admin endpoints (`backend/routes/admin_subscriptions.py`: GET list, POST gift, POST extend, POST force-cancel, PATCH streak), achievement integration (4 new tracking sources: cumulative_sub_months, continuous_sub_streak, shards_purchased, shards_spent), backend tests (40 pytest), frontend tests (15 vitest across 4 files), E2E tests (6 Playwright in `testing/subscription.spec.ts`: non-subscriber view, subscribe checkout, active subscriber view, cancel modal, reactivate flow, chat badge), data dictionary updated

## REC_2: Game Loop 2.0 (The Towers of Elysium)
- [x] **2.0 — Loop A: Overworld / Hub (Skeleton & Framework)** *(Ref: `docs/recs/2.0_GAME_LOOP.md`)*
- [x] **2.1 — Loop A: Overworld / Hub (Detailed Implementation)** *(Ref: `docs/recs/2.1_OVERWORLD_HUB.md`)*
  - [x] **Atmospheric Battle Banner (PixiJS)** *(Ref: `docs/recs/2.1.1_ATMOSPHERIC_BATTLE_BANNER.md`)*
 - [x] **2.2.0 — Investigations & Infrastructure**
 - [x] **2.2.0 — Backend Infrastructure**        
 - [x] **2.2.1 — UI/UX & Interaction Layer** *(Ref: `docs/recs/2.2.1_STORY_MODE_UI.md`)*
 - [x] **2.2.2 — Combat Engine & Wave Logic**        
 - [x] **2.2.3 — Narrative & Combat Sync**        
 - [x] **2.2.4 — In-Session Progression & Scaling**        
 - [x] **2.2.5 — Victory & Meta-Rewards**        
 - [x] **2.2.6 — Frontend Tests** *(Ref: `docs/inst/TESTING.md`)*        
 - [x] **2.2.7 — Polish & Remaining Requirements** *(from `2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md`)*
 - [x] **2.2.8 — BUGS AND FIXES** *(from `2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md`)*   (backend/routes/story_mode.py and frontend/src/game/components/story/CombatStage.tsx)
 - [x] **2.2.9 — NARRATIVE INTERSTITIALS** (1.2 Option C)
 - [x] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`, `docs/recs/2.3.1_IDLE_TRAINING_UX.md`, `docs/recs/2.3.1.0_IDLE_TRAINING_SCHEMA.md`)*
 - [x] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `docs/recs/2.4_CHARACTER_PROGRESSION.md`, `docs/recs/2.4_CHARACTER_PROGRESSION_DESIGN.md`, `docs/recs/2.4_CHARACTER_PROGRESSION_SCHEMA.md`)*
   - [x] 2.4.0 — Foundation: Extensible Stats & Character Level (migrations 030–031, models, stat calc, XP accrual, level-up, frontend stat panel + level bar + class visuals)
   - [x] 2.4.1 — Skill System: Prerequisites & Class Abilities (migrations 032–033, prerequisite evaluation, Level 0 system, dual-leveling, skill tree API, second hotbar row, effect handlers)
   - [x] 2.4.2 — Dream Item System (migrations 034–035, 5-component item generator, rarity tiers, run achievement evaluator, inventory CRUD, PostBattleSummary loot, equip/swap UI)
   - [x] 2.4.3 — Admin Panel: Config Browser + Content Editor (admin CRUD for configs/stats/classes/skills/benefits/items, GameConfigs + ContentEditor frontend pages)
   - [x] 2.4.4 — Cross-Cutting / Final (data dictionary, E2E Playwright tests, doc pass)
 - [x] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`, `docs/recs/2.5_AUDIO_MUSIC_SCHEMA.md`)*
   - [x] 2.5.0 — Foundation: Audio Infrastructure & Settings (migration 039, atmospheres/audio_configs tables, SQLModel models, hierarchy resolution endpoint, SFX configs endpoint, player settings, AudioSettingsModal, MuteToggle)
   - [x] 2.5.1 — Music System: MusicManager & Web Audio Synthesis (OscillatorNode chain renderer, 2s cross-fade, tab visibility handling, replaced AudioPlayer.tsx)
   - [x] 2.5.2 — SFX System: SFXEngine & Game Integration (SFXEngine singleton, spatial panning, integrated into CombatStage/SkillsHotbar/PostBattleSummary/BossStage/UI)
   - [x] 2.5.3 — Admin Panel & Content Tools (AtmosphereEditor, SFXConfigEditor, Web Audio preview, batch assignment, generate_8bit_music.py, generate_8bit_sfx.py, classify_atmospheres.py, 19 backend + 19 admin tests)
   - [x] 2.5.4 — Polish, Idle Integration & Final QA (Idle Training music via archetype prop, migration 040: 52 music definitions + 5 boss themes + 6 extended SFX, data dictionary update, regression: 337 backend / 99 admin / 201 frontend passing)

 - [x] **2.6 — Economy, Anti-Cheat & Discovery (COMPLETE)** *(Ref: `docs/recs/2.6_ECONOMY_ANTICHEAT.md`, Design: `2.6_ECONOMY_ANTICHEAT_DESIGN.md`, Schema: `2.6_ECONOMY_ANTICHEAT_SCHEMA.md`)* — Deployment `--max-instances=1` deferred to §99.5 in `0_REQUIREMENTS.md`
   - [x] 2.6.0 — Animation Toggle: Reduce Motion toggle in TopBar.tsx, `body.reduce-motion` CSS class, `prefers-reduced-motion` baseline + user override, static banner replacement for BottomAnimatedBanner, reduceMotion state in GameContext
   - [x] 2.6.1 — Anti-Cheat Hardening: Migration 041 (4 game_configs), wave validation DPS ceiling in `/tick`, session integrity check at `/complete`, anomaly logging to `activity_events`, CPS state machine (NORMAL→FLASHING→WARNING→COOLDOWN) in StoryMode.tsx
   - [x] 2.6.2 — Discovery System: Migrations 042-043, `PlayerEntityDiscovery` + `PlayerDiscoveryLog` models, `entity_family` on Entity, 6 discovery API endpoints (`/api/game/registry/*`), tick extension with entity_encounters/item_discoveries, Mist/Grey/Revealed visibility logic, E/C/A/SS rank system, EthericRegistry.tsx, DiscoveryLibrary.tsx, 6 wiki pages + HelpIcon, `tools/classify_entity_families.py`
   - [x] 2.6.3 — Onboarding & UI Polish: WelcomeModal.tsx (changelog.json, version tracking), TutorialOverlay.tsx (coach-mark spotlight, 7-step tutorial), changelog.json initial data
   - [x] 2.6.4 — Chat System: Migrations 044-045, ChatChannel model, ConnectionManager singleton + ChatRateLimiter + BroadcastRateLimiter in `services/chat.py`, WebSocket endpoint (`/ws/chat` with JWT auth), profanity filter (pyahocorasick + blocklist), mute support via PlayerSettings, ChatTab.tsx + chatClient.ts (auto-reconnect, exponential backoff), admin ChatManager.tsx (channels, monitor, mute controls), admin_chat.py endpoints
   - [x] 2.6 Cross-Cutting: Migrations 041-045 applied to dev DB, data dictionary updated through 045, backend tests (52 passing incl. rare spawn + tick entity encounters), frontend tests (242 passing: ChatTab, EthericRegistry, WelcomeModal, TutorialOverlay, GoldOdometer reduce-motion, HelpIcon, discovery counters), admin tests (106 passing: ChatManager 7 tests), E2E Playwright spec (economy_discovery.spec.ts: reduce-motion, discovery flow, chat, changelog)
   - [x] 2.6.2 Remaining: Random spawn engine (`_check_rare_spawn` in story_mode.py), rare spawn VFX (blue glow aura in CombatStage), entity encounter accumulation (`pendingEntityEncounters` Map in StoryMode), discovery counters on Home Base Hub, tick integration (flush entity_encounters with tick payload)
   - [x] 2.6.3 Remaining: "Magic Research 2" aesthetic polish in index.css (panels, buttons, modals, focus states, tooltips, stat bars), Terminal Exception verified (no polish leaks into Idle Training)
   - [x] 2.6.4 Remaining: System broadcasts on boss first-clear, chapter completions, rare item drops (rarity >= broadcast_rarity_min), rate-limited via BroadcastRateLimiter, ChatTab broadcast rendering (blue, bold, ⚡ prefix)

 - [x] **2.7 — Home Base Hub (Meta-Progression & Collections)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md` | Design: `2.7_HOME_BASE_HUB_DESIGN.md` | Schema: `2.7_HOME_BASE_HUB_SCHEMA.md`)*
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
  - Created: `docs/SUMMARY_MARKETING.md`, `docs/BOOKS_SUMMARY.md`, `docs/STYLE_GUIDE.md`, `docs/CHARACTER_GUIDE.md`, `docs/ENVIRONMENT_GUIDE.md`, `docs/ANNOUNCEMENT.md`
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
