# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

- [ ] **3.0 — Economy & Monetization (Marketplace & Premium)** *(Ref: `docs/recs/3.0_ECONOMY.md`)*

    - [ ] **3.5 — Dreamwalker's Bazaar (Player Marketplace)** *(Ref: `docs/recs/3.5_DREAMWALKERS_BAZAAR.md` | Design: `3.5_DREAMWALKERS_BAZAAR_DESIGN.md` | Schema: `3.5_DREAMWALKERS_BAZAAR_SCHEMA.md`)*
        - [x] Create requirements, design, and schema docs (probing questions, iterate until complete).

        - [ ] **3.5.0 — Backend Foundation**
            - [ ] **S1.1** Database migration `db/053_dreamwalkers_bazaar.sql`
                - [ ] 4 new tables: `marketplace_listings`, `marketplace_trades`, `marketplace_notifications`, `marketplace_price_history`
                - [ ] ALTER `players` — add `marketplace_slots_purchased INTEGER NOT NULL DEFAULT 0`
                - [ ] ALTER `player_artifacts` — add `marketplace_listing_id` FK to `marketplace_listings`
                - [ ] ALTER `player_inventory` — add `marketplace_listing_id` FK to `marketplace_listings`
                - [ ] Widen CHECK: `shard_transactions.source_type` (+`marketplace_purchase`, `marketplace_sale`)
                - [ ] Widen CHECK: `shop_items.category` (+`marketplace_permit`)
                - [ ] Update trigger: `enforce_inventory_slot_cap()` — exclude `marketplace_listing_id IS NOT NULL` from cap count
                - [ ] Seed: 7 Bazaar Permit shop items (200→12,800 doubling)
                - [ ] Seed: 4 marketplace titles (Merchant, Collector, Dreamwalker, Baron)
                - [ ] Seed: 9 marketplace achievements with parent chains
                - [ ] Seed: 15 `game_configs` keys (marketplace + salvage categories)
            - [ ] **S1.2** SQLModel models → `backend/models/marketplace.py`
                - [ ] `MarketplaceListing`, `MarketplaceTrade`, `MarketplaceNotification`, `MarketplacePriceHistory`
                - [ ] Register in `backend/models/__init__.py`
            - [ ] **S1.3** Marketplace service → `backend/services/marketplace_service.py`
                - [ ] `create_listing()` — ownership validation, listing cap, account flag, item lock, auto-unequip
                - [ ] `buy_listing()` — row lock, lazy expiry, self-purchase block, shard debit/credit with tax, item transfer, claim queue
                - [ ] `cancel_listing()` — return item to seller
                - [ ] `adjust_price()` — price history logging, lazy expiry check
                - [ ] `_transfer_item()` — dual-system handler (artifact immediate, equipment cap check → claim queue)
                - [ ] `resolve_claim()` — claim/replace/discard actions for pending equipment claims
                - [ ] `expire_stale_listings()` — lazy expiry helper
                - [ ] `get_browse_listings()` — filters, search, sort (FIFO within same price), pagination
                - [ ] `get_my_listings()` — active listings + listing history
                - [ ] `get_price_comparables()` — min/max/count for same item name+rarity
            - [ ] **S1.4** Salvage service → `backend/services/salvage_service.py`
                - [ ] `salvage_single()` — validate, calculate Essence (rarity × multipliers), destroy item, credit Essence
                - [ ] `salvage_bulk()` — atomic multi-item salvage, single stat recalc
                - [ ] `get_salvage_value()` — preview Essence values for items
                - [ ] `_calculate_essence_value()` — equipment base rates, 2x artifact multiplier, 1.15x curated bonus (all from `game_configs`)
            - [ ] **S1.5** Notification service → `backend/services/marketplace_notification_service.py`
                - [ ] `create_notification()` — item_sold, listing_expired, listing_removed
                - [ ] `get_unread_notifications()` — fetch unread for login/return overlay
                - [ ] `mark_read()` — batch mark notifications as read
                - [ ] `purge_old_notifications()` — delete read notifications older than 30 days
            - [ ] **S1.6** Player endpoints → `backend/routes/marketplace.py`
                - [ ] `GET /api/marketplace/browse` — browse/search/filter/sort (30 req/min)
                - [ ] `POST /api/marketplace/buy` — purchase listing (10 req/min)
                - [ ] `POST /api/marketplace/list` — create listing (10 req/min)
                - [ ] `POST /api/marketplace/cancel` — cancel active listing
                - [ ] `POST /api/marketplace/adjust-price` — change listing price
                - [ ] `GET /api/marketplace/my-listings` — active listings + history + slot info
                - [ ] `GET /api/marketplace/trade-history` — paginated trade log (sales/purchases)
                - [ ] `GET /api/marketplace/notifications` — unread trade notifications
                - [ ] `POST /api/marketplace/notifications/read` — mark notifications read
                - [ ] `POST /api/marketplace/salvage` — single item salvage (10 req/min)
                - [ ] `POST /api/marketplace/salvage-bulk` — bulk salvage (10 req/min)
                - [ ] `POST /api/marketplace/salvage-preview` — preview Essence values
                - [ ] `POST /api/marketplace/claim` — resolve pending equipment claim
            - [ ] **S1.7** Admin endpoints → `backend/routes/admin_marketplace.py`
                - [ ] `GET /api/admin/marketplace/listings` — list all listings (paginated, filterable)
                - [ ] `DELETE /api/admin/marketplace/listings/{id}` — force-remove listing (returns item, creates notification)
                - [ ] `GET /api/admin/marketplace/trades` — view trade history
                - [ ] `GET /api/admin/marketplace/stats` — volume, avg price, tax burned, active count
                - [ ] `GET /api/admin/marketplace/player/{player_id}` — player marketplace activity
                - [ ] `POST /api/admin/marketplace/reverse-trade/{trade_id}` — reverse completed trade
            - [ ] **S1.8** Bazaar Permit purchase handling in `shop_service.py` — detect `marketplace_permit` category, increment `marketplace_slots_purchased`, enforce 7-permit hard cap
            - [ ] **S1.9** Wire marketplace + admin routers in `main.py`

        - [ ] **3.5.1 — Player UI: Browse & Buy**
            - [ ] **S2.1** `BazaarTab.tsx` — main container with sub-tabs (Browse, My Listings, NPC Vendor, Trade History), shard balance header
            - [ ] **S2.2** `BrowseListings.tsx` — filter bar (type, rarity, slot, price range), search, sort dropdown (price↑/↓, rarity, recent), paginated results
            - [ ] **S2.3** `ListingCard.tsx` — item name/rarity/stats, price, min/max comparables, seller alias, "Your Listing" label for own items
            - [ ] **S2.4** `BazaarPurchaseModal.tsx` — item details, price, balance after, "all sales final" warning, insufficient balance state
            - [ ] **S2.5** `TradeNotificationOverlay.tsx` — sold/expired/removed notifications on login/return (piggybacks on idle gains pattern)
            - [ ] **S2.6** `ClaimModal.tsx` — inventory-full claim resolution: replace existing item or discard purchased item
            - [ ] **S2.7** Wire `BazaarTab` as 4th tab in `ShopTab.tsx` ("Dreamwalker's Bazaar")
            - [ ] **S2.8** GameContext state additions: `BazaarState` interface (activeListings, slots, notifications, pendingClaim)

        - [ ] **3.5.2 — Player UI: Sell & Salvage**
            - [ ] **S3.1** `MyListings.tsx` — active listings with expiry countdown, price adjust button, cancel button; listing history below
            - [ ] **S3.2** `CreateListingModal.tsx` — item picker (artifacts + equipment), price input, tax preview ("You will receive X after 5% tax"), equipped item warning
            - [ ] **S3.3** `PriceAdjustModal.tsx` — current price, new price input, updated proceeds preview
            - [ ] **S3.4** `NPCVendor.tsx` — single/bulk toggle, checkbox grid, rarity quick-select buttons, curated artifact exclusion from quick-select, running Essence total, double-confirm for curated items
            - [ ] **S3.5** `TradeHistory.tsx` — paginated table (date, type, item, price, tax, counterparty), filter by sales/purchases
            - [ ] **S3.6** `BazaarPermitUpsell.tsx` — "X/Y slots used" indicator, next permit cost, buy CTA
            - [ ] **S3.7** `BazaarTab.css` — full styling for all Bazaar sub-components

        - [ ] **3.5.3 — Tests & Polish**
            - [ ] **S4.1** Backend tests → `backend/tests/test_marketplace.py` (~32 pytest tests)
                - [ ] Listing CRUD: create (valid, cap exceeded, already listed, equipped, account flagged), adjust price, cancel
                - [ ] Buy flow: valid purchase with tax, self-purchase block, insufficient balance, already sold (410), concurrent race, account flagged, stat recalc
                - [ ] Claim queue: inventory full → pending claim, artifact → no cap, claim resolution (replace/discard), pending claim blocks next purchase
                - [ ] Salvage: equipment rates per rarity, artifact 2x multiplier, curated 1.15x bonus, bulk salvage, equipped item, listed item blocked
                - [ ] Listing expiry: lazy eval excludes expired from browse, item returned on access, notification created
                - [ ] Slot expansion: Bazaar Permit purchase increments counter, enforces hard cap
                - [ ] Notifications: created on sale/expiry/admin removal
                - [ ] Achievements: first listing/sale/purchase, volume milestones
                - [ ] FIFO ordering: same-price listings sorted oldest first
                - [ ] Admin: force-remove listing, reverse trade
            - [ ] **S4.2** Frontend tests → `frontend/src/game/components/shop/BazaarTab.test.tsx` (~12 vitest tests)
                - [ ] Tab renders with sub-tabs, browse filters/search/sort/pagination
                - [ ] Listing card: price comparables, own listing label, rarity badge
                - [ ] Create listing modal: tax preview, equipped warning
                - [ ] NPC Vendor: single/bulk salvage, curated double-confirm
                - [ ] Trade notification overlay, insufficient balance state
            - [ ] **S4.3** Achievement integration — wire marketplace tracking sources into `achievement_service.py`
            - [ ] **S4.4** Data dictionary update (`db/data_dictionary.md`) for migration 053
            - [ ] **S4.5** Update requirements checkboxes in `3.5_DREAMWALKERS_BAZAAR.md`

        - [ ] **3.5 Deferred**
            - [ ] E2E tests → `testing/marketplace.spec.ts` (list → browse → buy → transfer, expiry → return, salvage → Essence, permit → cap increase)

    - [ ] **3.6 — Admin Finance Dashboard & Tools**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] Implement Stripe transaction viewer, shard management, and refund workflow.
        - [ ] Implement subscription management, dispute queue, and revenue analytics.
        - [ ] Implement shop catalog management and marketplace moderation tools.


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

---

*Updated: 2026-03-12 (3.5 Dreamwalker's Bazaar requirements/design/schema complete)*
