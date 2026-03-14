# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development. When tackling tasks, be sure to go through the requirements definition process first. Ask probing questions, fill out details, ensure everything from teh main requirements document is covered. Once several loops have clarified, move onto design (and repeat ask questions, create, iterate). Finally move onto the schema. If these are small enough they can be in the same file. Once all are done do at least 2 passes to ensure everything is in sync and add any final clarifying quesitons. Then start the planning, and update TODO with the expanded development tasks per sub-requirement. 

- [ ] **5.0 — Administrative Systems** *(Ref: `docs/recs/5.0_ADMIN_SYSTEMS.md`)*
    - [ ] **5.2 — Game Content Editor (Narrative & World Data)**
        - [ ] 5.2.0 — Create requirements, design, and schema documentation (question → refine → design → schema → consistency review)
        - [ ] 5.2.1 — Book, Chapter & Scene Editors (backend + admin UI)
        - [ ] 5.2.2 — Narrative Text Editor, Story Beats & Entity-Scene Mapper
        - [ ] 5.2.3 — Location Editor, Polish & Tests
    - [ ] **5.3 — Entity Type & Classification Management**
        - [ ] 5.3.0 — Create requirements, design, and schema documentation (question → refine → design → schema → consistency review)
        - [ ] 5.3.1 — Attack Type & Entity Family Management UI
        - [ ] 5.3.2 — Visual Classification Tags & Banner Behavior Mapping
        - [ ] 5.3.3 — Stat Block Templates & Tests
    - [ ] **5.4 — Banner & Scaling Editor (Visual & Difficulty Tuning)**
        - [ ] 5.4.0 — Create requirements, design, and schema documentation (question → refine → design → schema → consistency review)
        - [ ] 5.4.1 — Visual Weight Editor & Global Wave Settings
        - [ ] 5.4.2 — Intensity Curve Editor & Difficulty Presets
        - [ ] 5.4.3 — Chapter Scaling Preview & Tests
    - [ ] **5.5 — Content Management & Live Tuning**
        - [ ] 5.5.0 — Create requirements, design, and schema documentation (question → refine → design → schema → consistency review)
        - [ ] 5.5.1 — Drop Rate Manager & HP/Gold Scaler
        - [ ] 5.5.2 — Skill Balance, Economy Tuning & Narrative Timing
        - [ ] 5.5.3 — Config Categories Reorganization & Tests
    - [ ] **5.6 — Dev Content Audit Dashboard**
        - [ ] 5.6.0 — Create requirements, design, and schema documentation (question → refine → design → schema → consistency review)
        - [ ] 5.6.1 — Audit Table Viewer, Filters & Severity Flagging
        - [ ] 5.6.2 — Inline Fix Actions, Progress Dashboard & Generic vs. Specific Tagging
        - [ ] 5.6.3 — Bulk Status Updates & Tests
    - [ ] **5.8 — UI Polish & Debug Cleanup** *(incremental throughout; final pass at end)*
        - [ ] Hide debug controls behind ADMIN role check
        - [ ] Lore description updates via Audit Dashboard (5.6) + Content Editor (5.2)
        - [ ] Admin navigation & consistent styling for all new pages

- [ ] **Deferred Items (require live Stripe or depend on future modules)**
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



---

*Updated: 2026-03-14 (5.1 COMPLETE — moved to DONE.md. Next: 5.2 Game Content Editor)*
