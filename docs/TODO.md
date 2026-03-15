# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

**Session Tracking:** For multi-session tasks (like E2E testing), live progress is tracked in `docs/E2E_SESSION_STATE.md`. This file contains environment setup, per-page test results, bugs found/fixed, files modified, and a resume prompt for the next session. Always read it at the start of a new session and update it as you go. The TODO tracks *what* needs to be done; the session state tracks *where we are* and *what happened*.

**E2E Testing Environment:** Docker dev stack runs via `docker-compose up --build -d` from project root. Services: backend (`:8000`), frontend (`:5173`), admin (`:5174`). Auth bypass enabled via `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB (toggle in Admin → Server Config). Test player E2ETestBot (ID 2) created via Admin panel. DB backups via `python tools/db_dump_restore.py dump/restore/list`. Playwright MCP server used for interactive browser testing; automated specs in `testing/*.spec.ts`.

## Complete Testing and Simulation (pretend to be new user. Create user manuals both end user and admin)
- [ ] **XX End to End User Testing and initial scaling fixes**
         - [ ] Restore the server to it's pre testing dump. Take another dump for this test session.
         - [ ] Login. Create an account. Create a new character.
         - [ ] Play the game, advance, click, beat the waves, read the story, do automated skills training. Progress through book 1 (test out at least the first 5 chapters). Admin set (using the admin page), to the last scene in the last chapter. Test out the functionality of the chapter and book boss. Start chapter 2.
         - [ ] Test out character editing as an admin (more skill XP) make sure things reflect appropriately. Add some shards for the user, test out selling and buying things. 
         - [ ] Check out the entity asset error log (make sure they're showing up as intended)
         - [ ] Check out the bottom bar battle (make sure as the game progresses the waves and freneticity of the bar increases). Check out the admin settings of the waves (slow things down, speed things up).
         - [ ] Test out the progression in real time (simulate max clicking), adjust settings and XP and whatnot with the ADMin on teh backend).
         - [ ] Test out all the admin editing on the backend - make sure changes on the back end get reflected on the frontend. 
         - [ ] Design other E2E flows that a regular user and admin would normally do. Incluyding banning players, flagging them for duplicate issues, unbanning, support tickets, and the other requirements.

## Deferred Items & Bugs
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

- [ ] **Documentation and Code improcements**
    - [ ] Investigate some standard SDD frameworks (Open Spec) - consider converting this and documentation into that format.
    - [ ] Code bloat and ballooning (a few god class files have been created, break these back down into modules)
    - [ ] Code documentation - link to requirements documentation, functional specs, or inline code comments




## Generators
**NOTE:** When tackling tasks, be sure to go through the requirements definition process first. Ask probing questions, fill out details, ensure everything from the main requirements document is covered. Once several loops have clarified, move onto design (and repeat ask questions, create, iterate). Finally move onto the schema. If these are small enough they can be in the same file. Once all are done do at least 2 passes to ensure everything is in sync and add any final clarifying questions. Then start the planning, and update TODO with the expanded development tasks per sub-requirement.
    - [ ] Read through `0_REQUIREMENTS.md` and capture the generators requirements, and add them in TODO to start tracking. Then go through each of those and build out the requirements, design, and schema documents before proceeding. As a first pass, go through the system and ensure all necessary generators have been listed (where there might be gaps in the existing data).

## Deployment Bits for later
- [ ] **Enabling Cloud Deployment without the cost**
    - [ ] See if firebase can store a JSON string for users (how much space, how updatable).
    - [ ] If not, are there free clud DBS?
    - [ ] If yes, then create postgres docker container, load up with DB dump (everything except player data) when container inits.
    - [ ] When player logs in first time (if missing) gets info from firebase and repopulates their record.
    - [ ] Every now and then update the JSON string in firebase.


---

*Updated: 2026-03-15 (5.9 COMPLETE — All 4 phases done. 119 Playwright tests, 19 spec files, 50/52 RECs verified. 7 bugs fixed. Ready for 5.10 live user testing.)*
