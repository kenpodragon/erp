# Elysium Emporium Specification

## Purpose
Section 3.3 introduces the first shard sink — a centralized in-game store called the Elysium Emporium accessible from the Hub. Players spend Elysium Shards on cosmetics (character skins, chat flair, leaderboard badges, avatar pictures), time-limited gameplay boosters (XP, Essence, Drop Rate), and bundled packages. All items are cosmetic or time-limited — no permanent meta-upgrades, no pay-to-win. This is the first shard spending system, completing the earn → spend loop.

## Requirements

### Requirement: Shop Catalog and Purchase Flow
The system SHALL serve an active shop catalog via `GET /api/shop/catalog` with player ownership status per item. The system SHALL process purchases via `POST /api/shop/purchase`, debiting shards via `debit_shards()` and creating a `player_shop_items` record. Re-purchasing an already-owned cosmetic SHALL be blocked.

#### Scenario: Cosmetic purchase succeeds
- GIVEN a player with 500 shards and a chat flair priced at 200 shards
- WHEN `POST /api/shop/purchase` is called with the flair's item ID
- THEN 200 shards are debited, a `player_shop_items` record is created, and the flair is available to equip

#### Scenario: Re-purchase of owned cosmetic blocked
- GIVEN a player already owns a specific avatar picture
- WHEN they attempt to purchase the same item again
- THEN the endpoint returns 400 with "Item already owned"

#### Scenario: Insufficient shards blocked
- GIVEN a player with 100 shards and a skin priced at 300 shards
- WHEN they attempt to purchase
- THEN the endpoint returns 400 with "Insufficient shard balance"

### Requirement: Cosmetic Equip System
The system SHALL allow players to equip one cosmetic per slot at a time via `POST /api/shop/equip`. Unequipping SHALL revert to the class default. Class-specific skins SHALL only be equippable by the matching class.

#### Scenario: Character skin equip changes all three display points
- GIVEN a player owns the "Void Engineer" skin
- WHEN they equip it via `POST /api/shop/equip`
- THEN the character portrait, battle avatar in CombatStage/BossStage, and battle bar hero portrait all update simultaneously

#### Scenario: Class-specific skin blocked for wrong class
- GIVEN a player is a Drifter and attempts to equip the "Void Engineer" skin (Engineer-only)
- WHEN the equip request is made
- THEN the endpoint returns 400 with a class restriction error

### Requirement: Booster System
The system SHALL activate boosters immediately on purchase. If an active booster of the same type exists, the remaining duration SHALL be extended rather than reset. Booster elapsed time SHALL be tracked in `player_active_boosters.elapsed_seconds`, incremented at session complete and periodic pings. Expiry SHALL be evaluated lazily on access.

Subscription boosts and shop boosters SHALL stack multiplicatively via `get_effective_multipliers(player_id)`.

#### Scenario: Booster extends on re-purchase
- GIVEN a player has an active 24hr XP booster with 6 hours remaining
- WHEN they purchase another 24hr XP booster
- THEN `elapsed_seconds` is reduced by `24 * 3600` (i.e., total remaining becomes 6 + 24 = 30 hours)

#### Scenario: Expired booster deactivated on access
- GIVEN a booster's `elapsed_seconds >= duration_seconds`
- WHEN any endpoint checks active boosters for the player
- THEN the booster is marked expired and excluded from multiplier calculations

### Requirement: Bundle Purchase
The system SHALL deliver bundle contents (cosmetics + boosters) individually to the player. Partial ownership of bundle items SHALL reduce the displayed value but NOT block bundle purchase. Each item in the bundle SHALL apply the same rules as individual purchases (owned cosmetics are granted as already-owned; boosters extend active timers).

#### Scenario: Bundle delivered item-by-item
- GIVEN a bundle containing 1 skin, 1 flair, and 1 24hr XP booster
- WHEN `POST /api/shop/purchase-bundle` is called
- THEN all three items are processed individually and delivered

### Requirement: Featured and Limited-Time Items
The system SHALL support featured items (`is_featured = true`) displayed at the top of the Emporium. Items with `available_from` and `available_until` timestamps SHALL only appear in the catalog within their availability window.

#### Scenario: Expired limited item hidden from catalog
- GIVEN an item with `available_until` in the past
- WHEN `GET /api/shop/catalog` is called
- THEN the item is excluded from results

## Design

### Booster Architecture
```
player_active_boosters:
  boost_type: 'xp' | 'essence' | 'drop_rate'
  elapsed_seconds: INTEGER (incremented by server)
  duration_seconds: INTEGER (from item_metadata)
  magnitude: FLOAT (e.g., 1.25 = +25%)

get_effective_multipliers(player_id):
  sub_mult = get_subscriber_multipliers(player_id)  # 1.0 if not subscriber
  shop_mult = get_active_booster_magnitudes(player_id)
  return {
    xp: sub_mult.xp * shop_mult.xp,
    essence: sub_mult.essence * shop_mult.essence,
    drop_rate: sub_mult.drop_rate * shop_mult.drop_rate
  }
```

`get_effective_multipliers()` replaces all prior `get_subscriber_multipliers()` call sites.

### Module Structure
```
backend/
├── routes/shop.py              # catalog, purchase, purchase-bundle, equip, unequip, collection, boosters, booster-ping
├── routes/admin_shop.py        # item/bundle CRUD, admin refund
├── models/shop.py              # ShopItem, ShopBundle, ShopBundleItem, PlayerShopItem, PlayerActiveBooster
├── services/shop_service.py    # purchase, equip, collection queries
└── services/boost_service.py   # get_effective_multipliers()
```

### Launch Catalog (35 items seeded in migration 051)
- 6 skins (2 universal + 4 class-specific)
- 5 chat flair options
- 4 leaderboard badge frames
- 8 avatar pictures
- 9 boosters (XP/Essence/Drop Rate × 1hr/8hr/24hr)
- 3 bundles

## Schema

**Migration 051** (applied).

### `shop_items`
Key columns: `item_key` VARCHAR(60) UNIQUE, `category` CHECK IN ('skin','flair','badge','avatar','booster'), `price_shards`, `class_restriction` FK to `character_classes` (NULL = universal), `item_metadata` JSONB (booster config or visual config), `is_featured`, `featured_from/until`, `available_from/until`.

### `player_shop_items`
`(player_id, shop_item_id)` UNIQUE. Tracks ownership.

### `player_active_boosters`
`(player_id, boost_type)` UNIQUE. Tracks elapsed time per boost type.

### Table Alterations (migration 051)
- `players` gains: `equipped_flair_id`, `equipped_badge_id`, `equipped_avatar_id` (INTEGER nullable, no FK — item may be deactivated but stays equipped)
- `player_characters` gains: `equipped_skin_id` (INTEGER nullable)
- `shard_transactions.source_type` CHECK widened to include `'subscription_stipend'`, `'subscription_refund'`, `'shop_purchase'`, `'admin_refund'`
