# Dreamwalker's Bazaar Specification

## Purpose
Section 3.5 introduces the Dreamwalker's Bazaar — the endgame item economy for Elysium Rising. Players can list artifacts and equipment for sale at a fixed Shard price (24-hour duration), browse and buy items listed by other players, and salvage unwanted items at the NPC Vendor for Essence. The marketplace uses Shards only as trading currency with a 5% transaction tax burned from the economy as a deflationary shard sink. Marketplace activity drives long-term shard demand, completing the monetization loop.

## Requirements

### Requirement: Listing Creation
The system SHALL allow players to create marketplace listings for artifacts (`player_artifacts`) and equipment (`player_inventory`). Each listing SHALL expire after 24 hours. Equipped items SHALL be automatically unequipped before listing. The system SHALL enforce a per-player listing slot cap (default 5, expandable via Bazaar Permit shop items).

The system SHALL snapshot item name, rarity, stats, and icon at listing time for display after item transfers.

#### Scenario: Listing created for artifact
- GIVEN a player owns an unequipped artifact and has an open listing slot
- WHEN `POST /api/marketplace/listings` is called with `item_type='artifact'` and `price_shards=100`
- THEN a `marketplace_listings` row is inserted, `expires_at = listed_at + 24hr`, and the artifact's `marketplace_listing_id` is set

#### Scenario: Equipped item auto-unequipped
- GIVEN a player has an equipped piece of equipment and attempts to list it
- WHEN the listing is created
- THEN the item is unequipped (`is_equipped = false`, `equipped_slot = NULL`) before listing

#### Scenario: Listing slot cap enforced
- GIVEN a player has 5 active listings (their default cap)
- WHEN they attempt a 6th listing
- THEN the endpoint returns 400 with a slot cap error

### Requirement: Purchase Flow with Tax
The system SHALL apply a 5% transaction tax (`tax = floor(price * 0.05)`) burned from the economy. The buyer is debited `price_shards`. The seller is credited `price_shards - tax`. Both transfers are logged to `shard_transactions`.

#### Scenario: Tax calculation and distribution
- GIVEN an item listed at 200 shards
- WHEN a buyer purchases it
- THEN buyer is debited 200, seller is credited 190, 10 shards are burned (not credited to anyone)

#### Scenario: Tax is zero below 20 shards
- GIVEN an item listed at 1 shard
- WHEN purchased
- THEN `floor(1 * 0.05) = 0` — no tax applied, seller receives 1 shard

### Requirement: Item Ownership Transfer
The system SHALL transfer artifact ownership by updating `player_artifacts.player_id` and `character_id` to the buyer's IDs. The system SHALL transfer equipment by updating `player_inventory.character_id` to the buyer's active character. The system SHALL call `recalculate_character_stats()` for both seller and buyer characters after transfer.

#### Scenario: Artifact transferred to buyer
- GIVEN a completed purchase of an artifact
- WHEN the transaction is finalized
- THEN `player_artifacts.player_id` and `character_id` are updated to the buyer, and both players' character stats are recalculated

### Requirement: Lazy Expiry
The system SHALL evaluate listing expiry at query time (no cron jobs). Browse queries SHALL include `WHERE expires_at > NOW() AND status = 'active'`. When a seller accesses "My Listings" and expired listings are found, those listings SHALL be marked `status = 'expired'` and items returned to inventory.

#### Scenario: Expired listing returns item to seller
- GIVEN a listing's `expires_at` has passed
- WHEN the seller opens "My Listings"
- THEN the listing status is updated to 'expired' and the item is unlinked from the listing

### Requirement: NPC Vendor (Salvage)
The system SHALL provide single and bulk salvage endpoints. Essence payouts SHALL be configurable by rarity tier in `game_configs`. Curated artifact salvage SHALL require a double-confirm warning. Bulk salvage SHALL support rarity quick-select filters.

#### Scenario: Bulk salvage with rarity filter
- GIVEN a player selects "Salvage all Common and Uncommon items"
- WHEN `POST /api/marketplace/salvage-bulk` is called
- THEN all matching owned items are destroyed and Essence is credited per rarity tier

### Requirement: Trade Notifications
The system SHALL create a `marketplace_notifications` record when a player's listed item sells. The notification SHALL surface on the player's next game session via an overlay (reusing the idle training gains pattern).

## Design

### Module Structure
```
backend/
├── routes/marketplace.py              # browse, buy, list, cancel, adjust, my-listings, trade-history, notifications, salvage, claim
├── routes/admin_marketplace.py        # listings, trades, stats, player detail, force-remove, reverse-trade
├── models/marketplace.py              # MarketplaceListing, MarketplaceTrade, MarketplaceNotification, MarketplacePriceHistory
├── services/marketplace_service.py    # create_listing(), buy_listing(), cancel_listing(), adjust_price(), expire_stale_listings()
├── services/salvage_service.py        # salvage_single(), salvage_bulk(), get_salvage_value()
└── services/marketplace_notification_service.py
```

### Claim Queue (Equipment Only)
If the buyer's inventory is full when equipment is purchased, the item enters a `claim_status = 'pending_claim'` state. The buyer is prompted to resolve the claim (replace/discard existing item) before the equipment is delivered.

### Price Comparables
Browse listings include min/max price comparables for the same item name + rarity (from `marketplace_price_history`), helping buyers assess fair value.

## Schema

**Migration 053** (applied).

### `marketplace_listings`
Key columns: `seller_id`, `buyer_id` (set on sale), `item_type` ('artifact'|'equipment'), `item_ref_id` (PK in source table), `item_name/rarity/stats/icon_key` (denormalized snapshot), `price_shards`, `status` ('active'|'sold'|'expired'|'cancelled'), `listed_at`, `expires_at` (listed_at + 24hr).

Indexes: `(status, expires_at)` for active browse, `(item_name, item_rarity)` for comparables, `(price_shards, listed_at)` for price sort.

### `marketplace_trades`
Completed trade audit: `listing_id`, `buyer_id`, `seller_id`, `price_shards`, `tax_shards`, `seller_proceeds`, `claim_status` ('claimed'|'pending_claim'|'forfeited').

### `marketplace_notifications`
`(player_id, listing_id, notification_type, is_read)`. `is_read` cleared when player acknowledges.

### `marketplace_price_history`
Price change audit log per listing.

### Table Alterations (migration 053)
- `players` gains `marketplace_slots_purchased INTEGER DEFAULT 0`
- `player_artifacts` gains `marketplace_listing_id INTEGER FK marketplace_listings`
- `player_inventory` gains `marketplace_listing_id INTEGER FK marketplace_listings`
- `shop_items.category` CHECK widened to include `'marketplace_permit'`
- 7 Bazaar Permit shop items seeded (listing slot expansions)
- 9 marketplace achievements + 4 titles seeded
- 15 `game_configs` keys (marketplace + salvage categories)
