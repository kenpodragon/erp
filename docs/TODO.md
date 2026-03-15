# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

**Session Tracking:** For multi-session tasks (like E2E testing), live progress is tracked in `docs/E2E_SESSION_STATE.md`. This file contains environment setup, per-page test results, bugs found/fixed, files modified, and a resume prompt for the next session. Always read it at the start of a new session and update it as you go. The TODO tracks *what* needs to be done; the session state tracks *where we are* and *what happened*.

**E2E Testing Environment:** Docker dev stack runs via `docker-compose up --build -d` from project root. Services: backend (`:8000`), frontend (`:5173`), admin (`:5174`). Auth bypass enabled via `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB (toggle in Admin → Server Config). Test player E2ETestBot (ID 2) created via Admin panel. DB backups via `python tools/db_dump_restore.py dump/restore/list`. Playwright MCP server used for interactive browser testing; automated specs in `testing/*.spec.ts`.

- [ ] **5.0 — Administrative Systems** *(Ref: `docs/recs/5.0_ADMIN_SYSTEMS.md`)*
    - [ ] **5.9 Initial Remediation & E2E Testing Revamp** *(Ref: `docs/recs/5.9_TESTING_REVAMP.md`)*
        - [x] **Phase 0: Infrastructure**
            - [x] 0.1 Auth Bypass System — DB-driven spoof toggle (double-gated: `.env` `ALLOW_AUTH_BYPASS` + DB `auth_bypass_enabled`), admin UI panel with test player creation, frontend/backend integration. Migration 061 applied. Test player E2ETestBot (ID 2) created.
            - [x] 0.2 DB Dump/Restore Script — `tools/db_dump_restore.py` (dump/restore/list commands via `pg_dump`/`pg_restore`). Pre-E2E backup created.
            - [x] 0.3 Playwright Config Enhancement — added `admin` project, localhost base URLs with `PLAYWRIGHT_FRONTEND_URL`/`PLAYWRIGHT_ADMIN_URL` env var overrides
            - [x] 0.4 Shared Test Helpers — `testing/helpers/auth.ts`, `testing/helpers/navigation.ts`, `testing/helpers/api-mocks.ts`
        - [ ] **Phase 1: MCP Browser Smoke Testing** *(IN PROGRESS)*
            - [ ] 1.1 Frontend pages — Splash OK, Game tabs (Map/Skills/Home/Shop/Ascendant/Chat) all OK. Remaining: about, terms, privacy, license, support, profile
            - [ ] 1.2 Admin pages — Dashboard OK. Remaining: players, detail, world-builder, configs, game-configs, atmospheres, sfx, artifacts, achievements, assets, chat, finance, audit, dev-audit
            - [ ] 1.3 Document all rendering issues and console errors
            - **Bugs found and fixed during smoke testing:**
                - [x] FIX: `Entity.entity_type` → join `EntityType` by `entity_type_id` in `backend/routes/game.py:395` — was 500 on `/api/game/enemies/encountered`
                - [x] FIX: `SkillBalanceRow` import error — `verbatimModuleSyntax` requires `import type` (`SkillBalanceTable.tsx`, `SkillBalanceViewer.tsx`)
                - [x] FIX: `verifyUserWithBackend`/`isLoggedIn` temporal dead zone in `frontend/App.tsx` — reordered declarations
                - [x] FIX: `onAuthStateChanged` resetting bypass state — added `isAuthBypassed()` guard in both `frontend/App.tsx` and `admin/App.tsx`
                - [x] FIX: Finance revenue-chart SQL — `:cutoff::date` → `CAST(:cutoff AS date)`, removed non-existent `order_type` column from `payment_orders`, fixed `donations` subquery to join through `payment_orders` for status
                - [x] FIX: `OverviewTab.tsx` `formatNumber` null safety — handle undefined values from API
        - [ ] **Phase 2: Automated Playwright Specs**
            - [ ] 2.1 Enhance `smoke.spec.ts` — backend health, admin smoke
            - [ ] 2.2 New `onboarding.spec.ts` — REC 1 (splash, terms, profile, character creation)
            - [ ] 2.3 New `story-mode.spec.ts` — REC 2.0–2.2 (map, combat, narrative, boss)
            - [ ] 2.4 Merge+enhance `idle-training.spec.ts` — REC 2.3
            - [ ] 2.5 Rename+enhance `character.spec.ts` — REC 2.4
            - [ ] 2.6 New `audio.spec.ts` — REC 2.5 (settings, volume, mute)
            - [ ] 2.7 Rewrite `economy.spec.ts` — REC 2.6 (discovery, chat, reduce-motion)
            - [ ] 2.8 New `home-base.spec.ts` — REC 2.7 (akashic log, relics, achievements, leaderboard)
            - [ ] 2.9 New `shop-shards.spec.ts` — REC 3.1 (packages, checkout mock)
            - [ ] 2.10 Enhance `subscription.spec.ts` — REC 3.2
            - [ ] 2.11 New `emporium.spec.ts` — REC 3.3
            - [ ] 2.12 New `donations.spec.ts` — REC 3.4
            - [ ] 2.13 New `marketplace.spec.ts` — REC 3.5
            - [ ] 2.14 New `admin-players.spec.ts` — REC 5.1
            - [ ] 2.15 New `admin-content.spec.ts` — REC 5.2–5.3
            - [ ] 2.16 New `admin-scaling.spec.ts` — REC 5.4–5.5
            - [ ] 2.17 New `admin-audit.spec.ts` — REC 5.6
            - [ ] 2.18 New `admin-assets.spec.ts` — REC 5.7
            - [ ] 2.19 New `admin-finance.spec.ts` — REC 3.6
        - [ ] **Phase 3: Systematic Requirement Verification**
            - [ ] 3.1 Verify REC 1 (onboarding) — SSO, terms, profile, character creation
            - [ ] 3.2 Verify REC 2.0–2.2 (game loop) — map, combat, narrative, boss, upgrades
            - [ ] 3.3 Verify REC 2.3 (idle training) — skills, training, offline report
            - [ ] 3.4 Verify REC 2.4 (character progression) — stats, levels, equipment
            - [ ] 3.5 Verify REC 2.5 (audio) — settings, volume, mute
            - [ ] 3.6 Verify REC 2.6 (economy/discovery/chat) — anti-cheat, codex, chat
            - [ ] 3.7 Verify REC 2.7 (home base) — 4 terminals
            - [ ] 3.8 Verify REC 3.1–3.5 (monetization) — shards, subscriptions, emporium, donations, marketplace
            - [ ] 3.9 Verify REC 3.6 + 5.1–5.8 (admin) — all admin pages functional
        - [ ] **Phase 4: Fix Issues Found**
            - [ ] 4.1 Fix rendering bugs found during smoke testing
            - [ ] 4.2 Fix API/server errors found during testing
            - [ ] 4.3 Add regression specs for fixed bugs



    - [ ] **5.10 End to End User Testing and initial scaling fixes**
         - [ ] Restore the server to it's pre testing dump. Take another dump for this test session.
         - [ ] Login. Create an account. Create a new character.
         - [ ] Play the game, advance, click, beat the waves, read the story, do automated skills training. Progress through book 1 (test out at least the first 5 chapters). Admin set (using the admin page), to the last scene in the last chapter. Test out the functionality of the chapter and book boss. Start chapter 2.
         - [ ] Test out character editing as an admin (more skill XP) make sure things reflect appropriately. Add some shards for the user, test out selling and buying things. 
         - [ ] Check out the entity asset error log (make sure they're showing up as intended)
         - [ ] Check out the bottom bar battle (make sure as the game progresses the waves and freneticity of the bar increases). Check out the admin settings of the waves (slow things down, speed things up).
         - [ ] Test out the progression in real time (simulate max clicking), adjust settings and XP and whatnot with the ADMin on teh backend).
         - [ ] Test out all the admin editing on the backend - make sure changes on the back end get reflected on the frontend. 
         - [ ] Design other E2E flows that a regular user and admin would normally do. Incluyding banning players, flagging them for duplicate issues, unbanning, support tickets, and the other requirements.

- [ ] **Deferred Items (require live Stripe, Docker stack, or depend on future modules)**
    - [ ] **5.2 Integration pass:** Verify all World Builder tabs navigate correctly, cascading filters work across editors (requires running app) *(Ref: `docs/recs/5.2_GAME_CONTENT_EDITOR.md`)*
    - [ ] **3.1 E2E tests** → `testing/shard_purchasing.spec.ts` *(Ref: `docs/recs/3.1_STRIPE_SHARD_PURCHASING.md`)*
    - [ ] **3.2 Live Stripe tests:** Plan switch with proration, Stripe Customer creation for first-time subscriber, price change propagation *(Ref: `docs/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` §12.1)*
    - [ ] **3.2 Dispute integration:** Subscribe blocked when account has active dispute *(Ref: `docs/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` §12.1 — depends on 3.6 dispute queue)*
    - [ ] **3.3 E2E tests** → `testing/emporium.spec.ts` *(Ref: `docs/recs/3.3_ELYSIUM_EMPORIUM.md` §16.3 — 5 Playwright tests)*
    - [ ] **3.3 Frontend test gaps:** Booster overlap extension message test, Active booster display in hub top bar test *(Ref: `docs/recs/3.3_ELYSIUM_EMPORIUM.md` §16.2)*
    - [ ] **3.3 Cosmetic asset generation** → pixel-art skins, badges, flair, avatars *(Ref: `docs/recs/3.3_ELYSIUM_EMPORIUM.md` §19 — depends on C_STORY_ASSET_GENERATORS.md §8)*
    - [ ] **3.4 E2E tests** → `testing/donations.spec.ts` *(Ref: `docs/recs/3.4_DONATIONS.md` §10.3 — 3 Playwright tests, requires live Stripe)*
    - [ ] **3.5 E2E tests** → `testing/marketplace.spec.ts` *(Ref: `docs/recs/3.5_DREAMWALKERS_BAZAAR.md` §14.3 — 4 Playwright tests, requires Docker stack)*
    - [ ] **3.5 Rate limiting** → Per-endpoint rate limits on marketplace endpoints (10 req/min list/buy/salvage, 30 req/min browse) *(Ref: `docs/recs/3.5_DREAMWALKERS_BAZAAR.md` §12.4)*
    - [ ] **3.5 Alt account detection** → Flag accounts sharing Stripe payment methods via `stripe_customer_id` cross-reference, log to `activity_events` as `marketplace_alt_warning` *(Ref: `docs/recs/3.5_DREAMWALKERS_BAZAAR.md` §11.3)*



- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him.
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).
    - [ ] Investigate some standard SDD frameworks (Open Spec) - consider converting this and documentation into that format.
    - [ ] Code bloat and ballooning (a few god class files have been created, break these back down into modules)
    - [ ] Code documentation - link to requirements documentation, functional specs, or inline code comments

- [ ] **Enabling Cloud Deployment without the cost**
    - [ ] See if firebase can store a JSON string for users (how much space, how updatable).
    - [ ] If not, are there free clud DBS?
    - [ ] If yes, then create postgres docker container, load up with DB dump (everything except player data) when container inits.
    - [ ] When player logs in first time (if missing) gets info from firebase and repopulates their record.
    - [ ] Every now and then update the JSON string in firebase.

## Generators
**NOTE:** When tackling tasks, be sure to go through the requirements definition process first. Ask probing questions, fill out details, ensure everything from the main requirements document is covered. Once several loops have clarified, move onto design (and repeat ask questions, create, iterate). Finally move onto the schema. If these are small enough they can be in the same file. Once all are done do at least 2 passes to ensure everything is in sync and add any final clarifying questions. Then start the planning, and update TODO with the expanded development tasks per sub-requirement.
    - [ ] Read through `0_REQUIREMENTS.md` and capture the generators requirements, and add them in TODO to start tracking. Then go through each of those and build out the requirements, design, and schema documents before proceeding. As a first pass, go through the system and ensure all necessary generators have been listed (where there might be gaps in the existing data).

---

*Updated: 2026-03-15 (5.9 Phase 0 complete — Auth Bypass, DB Dump, Playwright Config, Test Helpers. Phase 1 smoke testing in progress.)*
