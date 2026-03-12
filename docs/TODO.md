# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

- [ ] **3.0 — Economy & Monetization (Marketplace & Premium)** *(Ref: `docs/recs/3.0_ECONOMY.md`)*

    - [ ] **3.6 — Admin Finance Dashboard & Tools** *(Ref: `docs/recs/3.6_ADMIN_FINANCE_DASHBOARD.md`)*
        - [x] Create requirements, design, and schema docs (`3.6_ADMIN_FINANCE_DASHBOARD.md`, `_DESIGN.md`, `_SCHEMA.md`)
        - [ ] **3.6.0 — Backend Foundation**
            - [ ] S1.1: Database migration 054 (`admin_shard_adjustments` table, `game_configs` anomaly threshold seeds)
            - [ ] S1.2: Finance analytics service → `backend/services/finance_analytics_service.py` (10 DB-driven aggregation functions)
            - [ ] S1.3: Revenue analytics endpoints → `backend/routes/admin_finance.py` (8 GET endpoints: overview, revenue-chart, shard-economy, shard-flow-chart, subscription-metrics, shop-analytics, marketplace-analytics, donation-analytics)
            - [ ] S1.4: Shard management endpoints (`POST /shard-adjust`, `GET /player-shard-summary/{player_id}`)
            - [ ] S1.5: Stripe refund initiation endpoint (`POST /initiate-refund`)
            - [ ] S1.6: Dispute management endpoints (`GET /disputes`, `POST /disputes/{player_id}/resolve`, `GET /disputes/{player_id}/investigate`)
            - [ ] S1.7: Marketplace anomaly detection endpoint (`GET /marketplace-anomalies`)
            - [ ] S1.8: Wire admin_finance router in `main.py`
            - [ ] S1.9: `AdminShardAdjustment` SQLModel in `backend/models/finance.py`
        - [ ] **3.6.1 — Admin UI: Overview, Transactions, Shard Economy**
            - [ ] S2.1: `FinanceDashboard.tsx` — Page with 8-tab framework, registered in admin sidebar
            - [ ] S2.2: `OverviewTab.tsx` — Revenue cards (recharts BarChart), quick action buttons
            - [ ] S2.3: `TransactionsTab.tsx` — Payment orders table, filters, expandable detail, webhook viewer
            - [ ] S2.4: `RefundModal.tsx` — Full/partial Stripe refund + proportional shard debit
            - [ ] S2.5: `ShardEconomyTab.tsx` — Economy health metrics, shard flow chart (recharts AreaChart), adjustment tool, balance integrity
            - [ ] S2.6: `ShardAdjustModal.tsx` — Grant/debit form with player search, balance preview, reason
            - [ ] S2.7: `CsvExportButton.tsx` — Reusable CSV export for all list views
            - [ ] S2.8: `FinanceDashboard.css` — Styling for all finance components
        - [ ] **3.6.2 — Admin UI: Subscriptions, Shop, Donations**
            - [ ] S3.1: `SubscriptionsTab.tsx` — Subscriber list, action modals (extend/cancel/streak), gift sub, churn metrics
            - [ ] S3.2: `ShopManagementTab.tsx` — Item CRUD, bundle CRUD, featured rotation table, booster config, purchase analytics
            - [ ] S3.3: `ShopItemModal.tsx` — Create/edit with structured booster form (boost_type, duration, magnitude)
            - [ ] S3.4: `BundleModal.tsx` — Create/edit with multi-select item picker
            - [ ] S3.5: `DonationsTab.tsx` — Donation list, stats cards, patron tier distribution
        - [ ] **3.6.3 — Admin UI: Marketplace, Disputes, PlayerDetail**
            - [ ] S4.1: `MarketplaceTab.tsx` — Listings, trade audit, stats, anomaly log, force-remove/reverse-trade
            - [ ] S4.2: `DisputeQueueTab.tsx` — Flagged accounts, investigation panel, resolution actions (clear/warn/ban)
            - [ ] S4.3: `PlayerFinanceWidget.tsx` — Finance panel for PlayerDetail (shard balance, adjust, history, sub, trades, donations, flags)
            - [ ] S4.4: Integrate `PlayerFinanceWidget` into `PlayerDetail.tsx`
        - [ ] **3.6.4 — Tests & Polish**
            - [ ] S5.1: Backend tests (pytest) → `backend/tests/test_admin_finance.py` (~19 tests)
            - [ ] S5.2: Frontend tests (vitest) → `admin/src/pages/FinanceDashboard.test.tsx` (~18 tests)
            - [ ] S5.3: Data dictionary update for migration 054
            - [ ] S5.4: Update TODO.md / requirements checkboxes
            - [ ] S5.5: Update `0_REQUIREMENTS.md` §3.6 checkboxes


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

---

*Updated: 2026-03-12 (3.6 requirements breakdown complete; 3.6.0–3.6.4 phases defined)*
