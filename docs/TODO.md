# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development. When tackling tasks, be sure to go through the requirements definition process first. Ask probing questions, fill out details, ensure everything from teh main requirements document is covered. Once several loops have clarified, move onto design (and repeat ask questions, create, iterate). Finally move onto the schema. If these are small enough they can be in the same file. Once all are done do at least 2 passes to ensure everything is in sync and add any final clarifying quesitons. Then start the planning, and update TODO with the expanded development tasks per sub-requirement. 

- [ ] **5.0 — Administrative Systems** *(Ref: `docs/recs/5.0_ADMIN_SYSTEMS.md`)*
    - [ ] **5.4 — Banner & Scaling Editor (Visual & Difficulty Tuning)** *(Ref: `docs/recs/5.4_BANNER_SCALING_EDITOR.md`)*
        - [x] 5.4.0 — Requirements, design, and schema documentation *(3 docs created, consistency reviewed)*
        - [ ] 5.4.1 — Visual Weight Editor & Global Wave Settings
            - [ ] **Migration 059**: Create `wave_presets`, `wave_preset_assignments`, `difficulty_curves`, `difficulty_presets` tables; add `stat_weights` to `visual_behaviors`; add `difficulty_curve_id` FK to `books`; seed defaults; add 4 `waves` game_configs keys
            - [ ] **Backend model**: Create `backend/models/scaling.py` (WavePreset, WavePresetAssignment, DifficultyCurve, DifficultyPreset); update `models/__init__.py` re-exports
            - [ ] **Backend model update**: Add `stat_weights` field to `VisualBehavior` in `backend/models/classification.py`; add `difficulty_curve_id` field to Book model in `backend/models/gameplay.py`
            - [ ] **Backend validation**: Add `validate_stat_weights()` to `admin_classification_service.py`; extend visual behavior PATCH endpoint in `admin_classification.py`
            - [ ] **Frontend**: Create `admin/src/components/scaling/` directory; create `VisualWeightEditor.tsx` (behavior selector, 3×3 sliders, clamp inputs, proportional bars, reset-to-defaults)
            - [ ] **Frontend**: Create `ScalingEditor.tsx` (tabbed container with 5 sub-tabs); extend `WorldBuilder.tsx` with fourth "Scaling & Difficulty" tab
            - [ ] **Frontend**: Create `scaling-editor.css`
            - [ ] **Data dictionary**: Update `db/data_dictionary.md` with new tables + modified columns
        - [ ] 5.4.2 — Wave Presets & Difficulty Curves
            - [ ] **Backend routes**: Create `backend/routes/admin_scaling.py` — wave preset CRUD (GET list, POST create, PATCH update, DELETE with blocking)
            - [ ] **Backend routes**: Wave preset assignment endpoints (GET assignments, POST assign, DELETE unassign)
            - [ ] **Backend routes**: `POST /wave-presets/{id}/apply-to-scenes` bulk action
            - [ ] **Backend routes**: Difficulty curve CRUD (GET list, POST create, PATCH update, DELETE with blocking)
            - [ ] **Backend routes**: `PATCH /difficulty-curves/{id}/assign-book` endpoint
            - [ ] **Backend service**: Create `backend/services/admin_scaling_service.py` — all business logic (list, create, update, delete, assign, bulk-apply)
            - [ ] **Backend**: Register `admin_scaling` router in `main.py`
            - [ ] **Frontend**: Create `WavePresetManager.tsx` (CRUD table, config editor, spawn pattern dropdown, default toggle)
            - [ ] **Frontend**: Create `WavePresetAssignPanel.tsx` (book/chapter assignment, bulk apply-to-scenes with confirmation)
            - [ ] **Frontend**: Create `DifficultyCurveManager.tsx` (CRUD table, editable chapter×dimension grid, add/remove chapter rows, book assignment panel)
        - [ ] 5.4.3 — Scaling Preview & Difficulty Presets & Tests
            - [ ] **Frontend**: Create `scaling-utils.ts` — `computeProjections()`, `getCurveEntry()`, comparison diff logic
            - [ ] **Frontend**: Create `ScalingPreview.tsx` (book selector, chapter range, config A/B source selectors)
            - [ ] **Frontend**: Create `ScalingComparisonTable.tsx` (side-by-side table, color-coded cells, % delta, summary row)
            - [ ] **Backend routes**: Difficulty preset CRUD (GET list, POST create, PATCH update, DELETE with active-block)
            - [ ] **Backend routes**: `GET /presets/capture-current` — category-based game_configs snapshot
            - [ ] **Backend routes**: `POST /presets/{id}/apply` — atomic apply (game_configs write + curve assign + wave preset default)
            - [ ] **Frontend**: Create `DifficultyPresetManager.tsx` (CRUD table, curve/wave picker, expandable config_snapshot, active badge)
            - [ ] **Frontend**: Create `PresetApplyModal.tsx` (change summary, diff display, confirmation)
            - [ ] **Backend tests**: `backend/tests/test_scaling.py` — wave preset CRUD, assignment, bulk-apply, curve CRUD, preset capture/apply, stat_weights validation
            - [ ] **Frontend tests**: `admin/src/components/scaling/*.test.tsx` — ScalingEditor tabs, VisualWeightEditor, WavePresetManager, DifficultyCurveManager, ScalingPreview computation, DifficultyPresetManager
    - [ ] **5.5 — Content Management & Live Tuning** *(Ref: `docs/recs/5.5_CONTENT_MANAGEMENT_LIVE_TUNING.md`)* — Frontend only, no migration
        - [x] 5.5.0 — Requirements, design, and schema documentation *(3 docs created, no migration needed)*
        - [ ] 5.5.1 — Drop Rate Manager
            - [ ] **Frontend**: Create `admin/src/components/tuning/` directory + `tuning.css`
            - [ ] **Frontend**: Create `tuning-utils.ts` — `inferInputType()`, `computeDropPreview()`, `computeSkillBalance()`, `buildEssenceSteps()`, `goldPerEssence()`
            - [ ] **Frontend**: Create `DropRateManager.tsx` (artifact drop sliders, rare spawn slider)
            - [ ] **Frontend**: Create `RarityWeightBar.tsx` (reusable stacked bar — rarity colors, proportional segments)
            - [ ] **Frontend**: Create `DropPreview.tsx` (per-100-scenes estimates, reactive)
        - [ ] 5.5.2 — Skill Balance Viewer & Economy Tuning Panel
            - [ ] **Frontend**: Create `SkillBalanceViewer.tsx` (container — fetches skills + game_configs)
            - [ ] **Frontend**: Create `SkillBalanceTable.tsx` (sortable table — name, category, class, base CD, cost at Lv 5/10/25, effective CD at Lv 10/25, ContentEditor deep-link)
            - [ ] **Frontend**: Create `CoefficientPanel.tsx` (editable global coefficients — cd_reduction, int_power, gcd, upgrade_cost_scaling, etc.; reactive table updates; save/reset)
            - [ ] **Frontend**: Create `EconomyTuningPanel.tsx` (container for sub-panels)
            - [ ] **Frontend**: Create `EssenceXPCurve.tsx` (CSS step-function chart — 5 threshold inputs, reactive rendering, contextual help)
            - [ ] **Frontend**: Create `SalvageRateTable.tsx` (rarity × essence table, computed artifact/curated columns)
            - [ ] **Frontend**: Create `EssenceEconomyPanel.tsx` (drain/capacity/offline inputs, gold-to-essence conversion preview at zones 1/5/10/25)
            - [ ] **Frontend**: Create `SubscriptionBoostPanel.tsx` (boost sliders, stipend input, streak/milestone JSON editors)
            - [ ] **Frontend**: Create `ProgressionPanel.tsx` (level cap, XP factor, XP requirements preview at levels 10/25/50/99)
        - [ ] 5.5.3 — GameConfigs Categories Reorganization & Tests
            - [ ] **Frontend**: Create `GameConfigsCategoryView.tsx` (category tab bar with key counts, per-category key list)
            - [ ] **Frontend**: Create `TypeAwareInput.tsx` (inferred input: slider_01, integer, float, string, boolean, json_array, json_object, fallback JSON)
            - [ ] **Frontend**: Create `ConfigSearchBar.tsx` (cross-category search, category highlight badges, jump-to-category)
            - [ ] **Frontend**: Extend `GameConfigs.tsx` — add top-level tab bar (All Configs, Drop Rates, Skill Balance, Economy), shared config state, dirty tracking, URL routing (`?tab=`)
            - [ ] **Frontend tests**: `admin/src/components/tuning/*.test.tsx` — TypeAwareInput inference, RarityWeightBar, SkillBalanceTable computed values, EssenceXPCurve rendering, ConfigSearchBar, GameConfigs tab routing
    - [ ] **5.6 — Dev Content Audit Dashboard** *(Ref: `docs/recs/5.6_DEV_CONTENT_AUDIT.md`)*
        - [x] 5.6.0 — Requirements, design, and schema documentation *(3 docs created, migration 060)*
        - [ ] 5.6.1 — Audit Table Viewer, Filters & Summary Cards
            - [ ] **Migration 060**: Add `status` VARCHAR(20) to `dev_content_audit`, migrate `resolved` data, drop `resolved`, add indexes on `status` and `audit_type`
            - [ ] **Backend model update**: Update `DevContentAudit` in `backend/models/story_mode.py` — remove `resolved: bool`, add `status: str`
            - [ ] **Backend routes**: Create `backend/routes/admin_dev_audit.py` — `GET /api/admin/dev-audit` (paginated, filtered list), `GET /summary`, `GET /filter-options`
            - [ ] **Backend service**: Create `backend/services/dev_audit_service.py` — `list_audit_records()`, `get_audit_summary()`, `get_filter_options()`
            - [ ] **Backend**: Register `admin_dev_audit` router in `main.py`
            - [ ] **Frontend**: Create `admin/src/pages/DevAudit.tsx` (top-level page)
            - [ ] **Frontend**: Create `admin/src/components/audit/` directory + `dev-audit.css`
            - [ ] **Frontend**: Create `AuditSummaryCards.tsx` (5 status cards, per-type breakdown in Open card, clickable to filter)
            - [ ] **Frontend**: Create `AuditFilterBar.tsx` (dynamic type/entity dropdowns with counts, status filter, search, date range)
            - [ ] **Frontend**: Create `AuditTable.tsx` (paginated table, colored type badges, status pills)
            - [ ] **Admin sidebar**: Add "Dev Audit" entry after "Audit Log"
            - [ ] **Data dictionary**: Update `db/data_dictionary.md` with `status` column change
        - [ ] 5.6.2 — Fix Actions, Status Management & Fallback Instrumentation
            - [ ] **Backend routes**: `PATCH /api/admin/dev-audit/{id}` (status update), `POST /api/admin/dev-audit/bulk-status` (bulk update)
            - [ ] **Backend service**: `update_audit_status()`, `bulk_update_status()` in `dev_audit_service.py`
            - [ ] **Backend service**: Create `log_content_audit()` shared helper with application-level dedup check
            - [ ] **Backend instrumentation**: Instrument atmosphere resolution fallback in `story_mode.py` → log `missing_atmosphere`
            - [ ] **Backend instrumentation**: Instrument boss completion lore text path in `story_mode.py` → log `missing_lore_text`
            - [ ] **Backend refactor**: Update existing `missing_entity` and `missing_stat` logging to use the shared `log_content_audit()` helper
            - [ ] **Frontend**: Create `StatusDropdown.tsx` (inline per-row status changer with colored pills)
            - [ ] **Frontend**: Create `BulkStatusBar.tsx` (multi-select, bulk action dropdown, confirmation dialog)
            - [ ] **Frontend**: Add deep-link fix routing to `AuditTable.tsx` — `getFixRoute()` switch by audit_type → WorldBuilder query params
            - [ ] **C_ cross-ref**: Add proactive content scanner note to `docs/recs/C_STORY_ASSET_GENERATORS.md`
        - [ ] 5.6.3 — Tests
            - [ ] **Backend tests**: `backend/tests/test_dev_audit.py` — list/filter/summary endpoints, status update, bulk status, `log_content_audit()` dedup, atmosphere fallback logging, lore text fallback logging
            - [ ] **Frontend tests**: `admin/src/components/audit/*.test.tsx` — AuditSummaryCards, AuditFilterBar, AuditTable, StatusDropdown, BulkStatusBar, fix route mapping
    - [ ] **5.8 — UI Polish & Debug Cleanup** *(incremental throughout; final pass at end)*
        - [ ] Hide debug controls behind ADMIN role check
        - [ ] Lore description updates via Audit Dashboard (5.6) + Content Editor (5.2)
        - [ ] Admin navigation & consistent styling for all new pages

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



---

*Updated: 2026-03-15 (5.4/5.5/5.6 docs complete — 9 files created. Execution plan expanded with detailed sub-tasks per sub-requirement.)*
