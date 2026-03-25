# Economy Core Specification

## Purpose
The ERP economy consists of three completely separate currencies — Session Gold (temporary), Elysium Essence (F2P permanent), and Elysium Shards (premium) — with no conversion between them. Phase 3.0 adds Stripe-powered premium currency purchasing, a single subscription tier, a player-facing shop for cosmetics and boosters, a transparent fixed-price player marketplace, donation support, and a full administrative finance dashboard.

## Requirements

### Requirement: Three-Currency Isolation
The system SHALL maintain three separate currencies with no conversion path between them.

#### Scenario: No Essence-to-Shard conversion
- GIVEN a player has accumulated 100,000 Elysium Essence
- WHEN the player navigates to any shop or currency exchange
- THEN no mechanism SHALL exist to convert Essence into Shards or vice versa

#### Scenario: Session Gold does not persist
- GIVEN a player earned 50,000 Session Gold in a Story Mode run
- WHEN the session ends
- THEN all Session Gold SHALL be discarded; no carryover to any other currency or the next session

### Requirement: Stripe Shard Purchasing
The system SHALL provide six shard package tiers purchasable via Stripe Checkout Sessions, with a first-purchase 2× bonus and idempotency protection against double-crediting.

#### Scenario: Standard shard purchase
- GIVEN a player selects the Medium package ($9.99, 1,100 shards)
- WHEN the Stripe checkout completes and the webhook fires
- THEN 1,100 shards SHALL be credited to the player's `shard_balance`, a `shard_transactions` record SHALL be created with `source_type = 'purchase'`, and a Stripe Customer object SHALL be linked to the player

#### Scenario: First-purchase bonus
- GIVEN a player has never made a shard purchase before
- WHEN any package purchase completes
- THEN the shard credit SHALL be doubled (e.g., 1,100 → 2,200 shards)

#### Scenario: Webhook idempotency
- GIVEN a Stripe webhook is delivered twice for the same payment event
- WHEN the second webhook arrives
- THEN the system SHALL detect the duplicate and NOT credit shards a second time

### Requirement: Elysium Ascendant Subscription
The system SHALL offer a single "Elysium Ascendant" subscription at $1.99/month or $19.90/year with Stripe-managed lifecycle (create, renew, cancel).

#### Scenario: Subscription activation
- GIVEN a player completes the Ascendant subscription checkout
- WHEN the `invoice.paid` webhook fires
- THEN the player's `is_ascendant` SHALL be set to TRUE and `subscription_expires_at` SHALL be updated

#### Scenario: Subscription cancellation
- GIVEN an active subscriber cancels their subscription
- WHEN the `customer.subscription.deleted` webhook fires
- THEN `is_ascendant` SHALL be set to FALSE at the end of the current billing period

#### Scenario: Failed payment grace period
- GIVEN a subscriber's payment fails
- WHEN the grace period expires without successful payment
- THEN the subscription SHALL be cancelled and `is_ascendant` set to FALSE

### Requirement: Overworld Shop — Cosmetics and Boosters Only
The system SHALL provide a shop where players spend Shards on cosmetics (skins, chat flair, leaderboard badges, avatars) and time-limited boosters. The system SHALL NOT offer permanent meta-gameplay advantages for purchase.

#### Scenario: Booster purchase and display
- GIVEN a player purchases an 8-hour 1.5× XP booster
- WHEN the purchase completes
- THEN the booster SHALL be active for 8 hours, a countdown timer SHALL display in the game UI, and the XP multiplier SHALL apply to all XP earned during that period

#### Scenario: No permanent meta-upgrades
- GIVEN a player with maximum Shards
- WHEN browsing the shop
- THEN no item SHALL permanently increase base stats, damage, or any core progression metric

### Requirement: Player Marketplace
The system SHALL provide a transparent fixed-price, FIFO player marketplace for trading any item using Shards only, with 24-hour listing duration and no fees.

#### Scenario: Listing an item
- GIVEN a player wants to sell a Rare artifact for 50 Shards
- WHEN the player lists the item
- THEN the item SHALL be removed from the seller's inventory, a listing SHALL be created with a 24-hour expiry, and the current lowest/highest prices for that item type SHALL be visible to all buyers

#### Scenario: FIFO ordering at equal price
- GIVEN two listings exist for the same item at 50 Shards each
- WHEN a buyer purchases
- THEN the listing created first (earliest timestamp) SHALL sell first

#### Scenario: Listing expiry
- GIVEN a listing has been active for 24 hours without a buyer
- WHEN the expiry timestamp is reached
- THEN the item SHALL be automatically returned to the seller's inventory

#### Scenario: Buy flow and audit
- GIVEN a buyer purchases an item for 50 Shards
- WHEN the transaction completes
- THEN 50 Shards SHALL be debited from the buyer, 50 Shards SHALL be credited to the seller, the item SHALL transfer, and both sides SHALL have a `shard_transactions` record logged

### Requirement: NPC Salvage
The system SHALL allow players to salvage any item (including curated artifacts) to an NPC vendor for fixed Essence amounts by rarity tier, with a double-confirmation modal for curated artifacts.

#### Scenario: Salvaging a Rare item
- GIVEN a player wants to salvage a Rare item
- WHEN the player confirms the single salvage modal
- THEN 50 Essence SHALL be credited to the player and the item SHALL be removed from inventory

#### Scenario: Salvaging a curated artifact
- GIVEN a player attempts to salvage a curated artifact
- WHEN the first confirmation is shown
- THEN a second irreversible-action confirmation SHALL be required before proceeding

### Requirement: Admin Finance Dashboard
The system SHALL provide an admin dashboard for viewing Stripe transactions, managing shard balances, handling refunds and disputes, configuring the shop, moderating the marketplace, and viewing revenue analytics.

#### Scenario: Admin shard grant
- GIVEN an admin is processing a support case
- WHEN the admin grants 500 Shards to a player with a reason
- THEN the player's `shard_balance` SHALL increase by 500 and a `shard_transactions` record with `source_type = 'admin_grant'` SHALL be created

#### Scenario: Refund flow
- GIVEN an admin initiates a refund for a shard purchase
- WHEN the Stripe refund is processed and the webhook fires
- THEN the corresponding shards SHALL be debited from the player (balance MAY go negative if already spent) and the transaction SHALL be logged with `source_type = 'refund'`

## Design
Currency model:
| Currency | Type | Source | Sink |
|----------|------|--------|------|
| Session Gold | Temporary | Story Mode combat | In-session upgrades only |
| Elysium Essence | F2P Permanent | Story Mode exit, Idle Training, achievements | Idle Training, NPC salvage |
| Elysium Shards | Premium | Stripe purchases, minimal achievement rewards (1-2) | Shop cosmetics, boosters, marketplace trades |

Shard package tiers: Starter $0.99 (100), Small $4.99 (525), Medium $9.99 (1,100), Large $24.99 (2,800), Premium $49.99 (6,000), Ultimate $99.99 (13,000).

Salvage rates by rarity: Common 5E, Uncommon 15E, Rare 50E, Epic 150E, Legendary 500E. All admin-configurable.

Booster tiers (admin-configurable): 1hr (1.25×), 8hr (1.5×), 24hr (2×). Stack cap is admin-set.

## Schema
Key tables: `shard_transactions` (source_type: purchase/reward/spend/refund/admin_grant/admin_deduct/subscription_stipend/shop_purchase/donation), `payment_orders` (order_type: shard_purchase/subscription/donation), `shop_items` (category, price_shards, availability_window), `player_shop_items`, `marketplace_listings` (seller_id, item_id, price_shards, expires_at, status), `player_subscriptions` (is_ascendant, subscription_expires_at).

Key fields on `players`: `shard_balance` (INTEGER), `is_ascendant` (BOOLEAN), `subscription_expires_at` (TIMESTAMPTZ).
