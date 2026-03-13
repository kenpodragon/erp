# ERP Project Kickstart COMPLETED TODO

This document tracks the completed development phases for the Elysium Rising mmorPg (ERP). Tasks are moved here from `TODO.md` once finalized.

---
*Updated: 2026-03-13*

## REC_5: Administrative Systems

 - [x] **5.7 — Asset Registry & Sprite Management (COMPLETE)** *(Ref: `docs/recs/5.7_ASSET_REGISTRY.md` | Design: `5.7_ASSET_REGISTRY_DESIGN.md` | Schema: `5.7_ASSET_REGISTRY_SCHEMA.md`)*
   - [x] 5.7.0 — Requirements, design, and schema documentation
   - [x] 5.7.1 — Backend Foundation: Migration 055 (`asset_registry` table with 5 indexes + updated_at trigger, `shop_items`/`shop_bundles` RENAME `icon_path` → `icon_asset_key` with data migration), SQLModel model (`backend/models/asset_registry.py`: AssetRegistryEntry + VALID_CATEGORIES), admin CRUD routes (`backend/routes/admin_assets.py`: 9 endpoints — paginated list with category/tag/search filters, get, create, update, delete with reference-check warning, orphan detection missing/unused, bulk import upsert, batch preload), router wired in `main.py`, `icon_path` → `icon_asset_key` renamed across 16 files (models, routes, admin UI, frontend, tests)
   - [x] 5.7.2 — Admin Asset Registry Page: 3 new components (`AssetRegistry.tsx` — full page with grid/table view, category filter tabs, search, create/edit modal with split layout JSON editor + live canvas preview with 200ms debounce, delete confirmation with reference warning, collapsible orphan detection panel with Missing/Unused tabs + bulk delete, pagination; `AssetPreview.tsx` — reusable canvas renderer for all 15 categories; `AssetRegistry.css` — complete dark-theme styling). Registered in admin sidebar via `App.tsx`.
   - [x] 5.7.3 — Frontend Asset Renderers & Integration: 7 new modules (`frontend/src/game/renderers/`: AssetRenderer.ts core dispatcher with LRU cache 200 entries, EntityRenderer.ts, BackgroundRenderer.ts with seeded PRNG, IconRenderer.ts with locked variant, AvatarRenderer.ts, PlaceholderRenderer.ts with dev_content_audit logging). `AssetProvider.tsx` React context with batch preload + `useAssets` hook. Refactored CombatStage.tsx, BossStage.tsx, BottomAnimatedBanner.tsx with asset preloading (existing inline rendering preserved as fallback). S3.7: RelicGallery.tsx + AchievementMatrix.tsx refactored to use IconRenderer via inline ArtifactIcon/AchievementIcon components with useSafeAssets pattern + preloadBatch.
   - [x] 5.7.4 — Existing Asset Migration, Bulk Import & Tests: Migration 055 seeds 196 assets (4 entity sprites, 1 class sprite, 8 backgrounds, 8 avatars, 2 default placeholders, 50 curated artifact icons, 100 achievement icons, 23 shop item icons). Backend tests (`test_asset_registry.py`: 20 tests, 18 pass / 2 skip on SQLite). Admin tests (`AssetRegistry.test.tsx`: 15 tests passing). Data dictionary updated. `GAME_ASSETS_GUIDE.md` rewritten for procedural approach. S4.4: All filesystem assets retired — `frontend/public/assets/avatars/` (8 PNGs), `frontend/public/assets/game/` (backgrounds/classes/enemies PNGs), `frontend/public/music/` (4 WAVs). 10+ components refactored from PNG paths to AvatarPreset/BackgroundRenderer API-driven rendering.

## REC_3: Economy & Monetization

 - [x] **3.6 — Admin Finance Dashboard & Tools (COMPLETE)** *(Ref: `docs/recs/3.6_ADMIN_FINANCE_DASHBOARD.md` | Design: `3.6_ADMIN_FINANCE_DASHBOARD_DESIGN.md` | Schema: `3.6_ADMIN_FINANCE_DASHBOARD_SCHEMA.md`)*
   - [x] 3.6.0 — Backend Foundation: Migration 054 (`admin_shard_adjustments` table with 3 indexes, 5 `game_configs` marketplace_anomaly seeds), `AdminShardAdjustment` SQLModel (`backend/models/finance.py`), finance analytics service (`backend/services/finance_analytics_service.py`: 10 DB-driven aggregation functions — revenue overview/chart, shard economy/flow, subscription metrics, shop analytics, marketplace analytics, donation analytics, anomaly detection, player shard summary), admin finance routes (`backend/routes/admin_finance.py`: 15 endpoints — 8 analytics GET, 2 shard management, 1 Stripe refund, 3 dispute management, 1 anomaly detection), router wired in `main.py`
   - [x] 3.6.1 — Admin UI: Overview, Transactions, Shard Economy: 8 new components (`FinanceDashboard.tsx` — 8-tab page registered in admin navbar, `OverviewTab.tsx` — revenue cards + recharts BarChart + quick actions, `TransactionsTab.tsx` — paginated payment_orders table with filters/search/expandable detail/webhook viewer, `RefundModal.tsx` — full/partial Stripe refund with shard debit preview, `ShardEconomyTab.tsx` — economy health metrics + recharts AreaChart + balance integrity, `ShardAdjustModal.tsx` — player search + grant/debit + balance preview + warnings, `CsvExportButton.tsx` — reusable CSV export, `FinanceDashboard.css`)
   - [x] 3.6.2 — Admin UI: Subscriptions, Shop, Donations: 5 new components (`SubscriptionsTab.tsx` — metrics cards + subscriber table + extend/cancel/streak actions + gift sub + CSV, `ShopManagementTab.tsx` — 4 collapsible sections: item CRUD + bundle CRUD + featured rotation + analytics, `ShopItemModal.tsx` — structured booster form for item_metadata, `BundleModal.tsx` — multi-select item picker + discount calculator, `DonationsTab.tsx` — analytics cards + patron tier distribution + donor table + CSV). `FinanceTabs.css`.
   - [x] 3.6.3 — Admin UI: Marketplace, Disputes, PlayerDetail: 3 new components (`MarketplaceTab.tsx` — 3 sub-tabs: listings/trades/anomaly log + force remove/reverse trade modals, `DisputeQueueTab.tsx` — flagged accounts + expandable investigation panel + clear/warn/ban with double-confirm, `PlayerFinanceWidget.tsx` — compact embeddable widget with shard balance + inline adjust + quick stats + recent transactions). Modified `PlayerDetail.tsx` (collapsible Finance section). `MarketplaceDisputes.css`.
   - [x] 3.6.4 — Tests & Polish: Backend tests (`backend/tests/test_admin_finance.py`: 19 pytest — revenue overview, chart, shard economy, flow chart, grant/debit/validation, Stripe refund full/partial/already-refunded, disputes list/clear/ban, investigation, subscription metrics, shop analytics, marketplace anomalies ×2, donation analytics). Frontend tests (`FinanceDashboard.test.tsx`: 18 vitest — all 8 tabs render, tab switching, overview cards + actions, transactions filters + expandable + refund modal, shard economy metrics + adjustment modal + negative warning, subscriptions + actions + gift, shop management, marketplace + force remove, donations + stats, disputes + investigation + resolution, refresh, CSV export ×2). Data dictionary updated for migration 054. Requirements/design/schema checkboxes updated.

 - [x] **3.5 — Dreamwalker's Bazaar (Player Marketplace) (COMPLETE)** *(Ref: `docs/recs/3.5_DREAMWALKERS_BAZAAR.md` | Design: `3.5_DREAMWALKERS_BAZAAR_DESIGN.md` | Schema: `3.5_DREAMWALKERS_BAZAAR_SCHEMA.md`)*
   - [x] 3.5.0 — Backend Foundation: Migration 053 (4 new tables: `marketplace_listings`, `marketplace_trades`, `marketplace_notifications`, `marketplace_price_history`; ALTER `players` + `player_artifacts` + `player_inventory` with `marketplace_listing_id` FKs; widened CHECK constraints on `shard_transactions`/`shop_items`; updated `enforce_inventory_slot_cap` trigger; seeded 7 Bazaar Permits, 4 titles, 9 achievements with parent chains, 15 game_configs keys), SQLModel models (`backend/models/marketplace.py`: MarketplaceListing, MarketplaceTrade, MarketplaceNotification, MarketplacePriceHistory), marketplace service (`backend/services/marketplace_service.py`: create_listing, buy_listing with row-level locking, cancel_listing, adjust_price, resolve_claim, expire_stale_listings, get_browse_listings with FIFO, get_my_listings, get_price_comparables), salvage service (`backend/services/salvage_service.py`: salvage_single, salvage_bulk, get_salvage_value with rarity rates + 2x artifact multiplier + 1.15x curated bonus), notification service (`backend/services/marketplace_notification_service.py`: create_notification, get_unread_notifications, mark_read, purge_old_notifications), player routes (`backend/routes/marketplace.py`: 13 endpoints — browse, buy, list, cancel, adjust-price, my-listings, trade-history, notifications, notifications/read, salvage, salvage-bulk, salvage-preview, claim), admin routes (`backend/routes/admin_marketplace.py`: 6 endpoints — listings, force-remove, trades, stats, player detail, reverse-trade), Bazaar Permit handling in `shop_service.py`, routers wired in `main.py`
   - [x] 3.5.1 — Player UI: Browse & Buy: 7 new components (BazaarTab.tsx — main container with sub-tabs + shard balance + notification overlay, BrowseListings.tsx — filters/search/sort/pagination, ListingCard.tsx — rarity-colored names + stats + price comparables + seller, BazaarPurchaseModal.tsx — item details + balance + "all sales final", TradeNotificationOverlay.tsx — sold/expired/removed z-1000 overlay, ClaimModal.tsx — replace/discard resolution). Modified ShopTab.tsx (4th tab "Dreamwalker's Bazaar"). BazaarTab.css (~500 lines dark theme styling).
   - [x] 3.5.2 — Player UI: Sell & Salvage: 6 new components (MyListings.tsx — active listings with expiry countdown + cancel/adjust + listing history, CreateListingModal.tsx — artifact/equipment toggle + item picker + price input + tax preview + equipped warning, PriceAdjustModal.tsx — current/new price + updated proceeds, NPCVendor.tsx — single/bulk mode + checkbox grid + rarity quick-select + curated exclusion + running Essence total + double-confirm, TradeHistory.tsx — paginated table with date/type/item/price/tax/counterparty + filter, BazaarPermitUpsell.tsx — slot usage indicator + next permit cost + CTA). BazaarSell.css (~700 lines).
   - [x] 3.5.3 — Tests & Polish: Backend tests (`backend/tests/test_marketplace.py`: 32 pytest — listing CRUD ×7, buy flow ×8, claim queue ×4, salvage ×6, notifications ×2, expiry ×2, slot expansion ×1, admin ×2). Frontend tests (`BazaarTab.test.tsx`: 12 vitest — tab render, sub-tabs, filters, search, pagination, listing card states, NPC vendor modes, notifications). Achievement integration (6 marketplace tracking sources wired into `achievement_service.py`). Data dictionary updated for migration 053. Requirements/design checkboxes updated.

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

 - [x] **3.3 — The Elysium Emporium (Overworld Shop) (COMPLETE)** *(Ref: `docs/recs/3.3_ELYSIUM_EMPORIUM.md` | Design: `3.3_ELYSIUM_EMPORIUM_DESIGN.md` | Schema: `3.3_ELYSIUM_EMPORIUM_SCHEMA.md`)*
   - [x] 3.3.0 — Backend Foundation: Migration 051 (shop_items/shop_bundles/shop_bundle_items/player_shop_items/player_active_boosters tables, equipped cosmetic columns on players + player_characters, widened shard_transactions CHECK, 9 game_configs seeds, 32 items + 3 bundles + 9 bundle mappings), SQLModel models (`backend/models/shop.py`: ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster), shop service (`backend/services/shop_service.py`: purchase_item, purchase_bundle, equip_cosmetic, unequip_cosmetic, get_catalog, get_player_collection, get_active_boosters, increment_booster_time, admin_refund_item), `credit_shards_direct()` + internal flush variants in payment_service.py, player routes (`backend/routes/shop.py`: 8 endpoints), admin routes (`backend/routes/admin_shop.py`: 9 endpoints), router registration in main.py
   - [x] 3.3.1 — Booster Engine & Multiplier Integration: `get_effective_multipliers()` in `backend/services/boost_service.py` (subscription × shop booster multiplicative stacking), replaced all `get_subscriber_multipliers()` calls in story_mode.py, game_training.py, achievement_service.py. Booster time increment on story session `/complete` and idle training ticks. Lazy expiry (mark expired when elapsed >= duration on any access). Anti-cheat clamping via `shop_booster_max_elapsed_per_ping` config.
   - [x] 3.3.2 — Player UI: 8 new components (EmporiumTab.tsx, ShopItemCard.tsx, ShopCategoryFilter.tsx, ShopPurchaseModal.tsx, BoosterPanel.tsx, BundleCard.tsx, FeaturedSection.tsx with CountdownTimer, MyCollection.tsx with equip/unequip). Modified ShopTab.tsx ("Elysium Emporium" replaces disabled placeholder), TopBar.tsx (booster indicators + countdown next to shard balance), GlobalHeader.tsx (booster buff chips in story mode buff tray), GameContext.tsx (ActiveBooster state, 30s booster ping polling, 1s client-side countdown). EmporiumTab.css (~500 lines styling).
   - [x] 3.3.3 — Tests & Polish: Backend tests (`backend/tests/test_shop.py`: 26 pytest), frontend tests (`EmporiumTab.test.tsx`: 10 vitest), data dictionary updated for migration 051, requirements checkboxes updated.

 - [x] **3.4 — Donations (One-Time Support) (COMPLETE)** *(Ref: `docs/recs/3.4_DONATIONS.md`)*
   - [x] 3.4.0 — Backend Foundation: Migration 052 (`donations` table, `players` ALTER 4 cols, patron seed data: 6 shop_items + 5 titles + 1 achievement + 10 game_configs, `shard_transactions` CHECK update), SQLModel model (`backend/models/donation.py`: Donation), donation service (`backend/services/donation_service.py`: create_donation_checkout_session, process_donation_webhook, calculate_patron_tier, _grant_patron_cosmetics, get_patron_status, get_donation_history, get_donor_leaderboard, get_recent_donors, toggle_donor_visibility, admin_get_donations, admin_get_donation_stats, admin_get_player_donations), player routes (`backend/routes/donations.py`: 6 endpoints — create-session, status, history, leaderboard, recent, visibility), admin routes (`backend/routes/admin_donations.py`: 3 endpoints — list, stats, player detail), webhook extension (`backend/routes/webhooks.py`: order_type=donation routing)
   - [x] 3.4.1 — Player UI: 5 new components (SupportUsTab.tsx — main container with tier buttons $1-$100 + custom input + opt-in + Stripe redirect, RecentDonorsBanner.tsx — rotating 5s ticker, DonationConfirmModal.tsx — no-shard disclaimer, PatronStatus.tsx — tier display + progress, DonorLeaderboard.tsx — Hall of Honor top 50). SupportUsTab.css (~300 lines dark theme). Modified ShopTab.tsx (added "Support Us" as 3rd tab).
   - [x] 3.4.2 — Tests & Polish: Backend tests (`backend/tests/test_donations.py`: 19 pytest — tier calculation ×7, session creation ×2, webhook processing ×3, patron status ×2, leaderboard ×3, admin stats ×2), frontend tests (`SupportUsTab.test.tsx`: 7 vitest — tab render, custom validation, confirm modal ×2, patron status, leaderboard, recent banner), data dictionary updated for migration 052, requirements checkboxes updated.
   - [x] 3.3.0 — Backend Foundation: Migration 051 (shop_items/shop_bundles/shop_bundle_items/player_shop_items/player_active_boosters tables, equipped cosmetic columns on players + player_characters, widened shard_transactions CHECK, 9 game_configs seeds, 32 items + 3 bundles + 9 bundle mappings), SQLModel models (`backend/models/shop.py`: ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster), shop service (`backend/services/shop_service.py`: purchase_item, purchase_bundle, equip_cosmetic, unequip_cosmetic, get_catalog, get_player_collection, get_active_boosters, increment_booster_time, admin_refund_item), `credit_shards_direct()` + internal flush variants in payment_service.py, player routes (`backend/routes/shop.py`: 8 endpoints), admin routes (`backend/routes/admin_shop.py`: 9 endpoints), router registration in main.py
   - [x] 3.3.1 — Booster Engine & Multiplier Integration: `get_effective_multipliers()` in `backend/services/boost_service.py` (subscription × shop booster multiplicative stacking), replaced all `get_subscriber_multipliers()` calls in story_mode.py, game_training.py, achievement_service.py. Booster time increment on story session `/complete` and idle training ticks. Lazy expiry (mark expired when elapsed >= duration on any access). Anti-cheat clamping via `shop_booster_max_elapsed_per_ping` config.
   - [x] 3.3.2 — Player UI: 8 new components (EmporiumTab.tsx, ShopItemCard.tsx, ShopCategoryFilter.tsx, ShopPurchaseModal.tsx, BoosterPanel.tsx, BundleCard.tsx, FeaturedSection.tsx with CountdownTimer, MyCollection.tsx with equip/unequip). Modified ShopTab.tsx ("Elysium Emporium" replaces disabled placeholder), TopBar.tsx (booster indicators + countdown next to shard balance), GlobalHeader.tsx (booster buff chips in story mode buff tray), GameContext.tsx (ActiveBooster state, 30s booster ping polling, 1s client-side countdown). EmporiumTab.css (~500 lines styling).
   - [x] 3.3.3 — Tests & Polish: Backend tests (`backend/tests/test_shop.py`: 26 pytest — purchase cosmetic ×4, class-specific skin ×2, booster purchase ×3, booster timer ×4, bundle purchase ×3, limited-time ×1, equip/unequip ×4, combined multiplier ×1, catalog ×2, admin refund ×2). Frontend tests (`EmporiumTab.test.tsx`: 10 vitest — catalog render, item cards, purchase modal, booster warning, insufficient balance, countdown timer, bundle card, bundle partial ownership, My Collection, Buy More Shards). Data dictionary updated for migration 051. Requirements checkboxes updated.

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
