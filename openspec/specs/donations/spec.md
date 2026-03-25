# Donations Specification

## Purpose
The Donations system provides a voluntary, altruistic way for players to support Elysium Rising development through a "Support Us" tab in the Shop. Donations grant no shards or gameplay advantages — rewards are purely cosmetic recognition through the Patron tier system (badges, titles, chat flair, and an exclusive avatar) and a single achievement. The tone is warm and community-focused, acknowledging alternative support methods (audiobooks, book purchases, gifting).

## Requirements

### Requirement: Donation Flow
The system SHALL support six fixed donation tiers ($1, $5, $10, $25, $50, $100) plus a custom amount (minimum $1, no maximum), processed via Stripe Checkout with `order_type = 'donation'`. No shards SHALL be credited for donations.

#### Scenario: Fixed tier donation
- GIVEN a player selects the $25 tier and opts in to donor visibility
- WHEN the Stripe checkout completes and the webhook fires
- THEN a `donations` record SHALL be created, the player's `cumulative_donation_cents` SHALL increase by 2,500, Patron tier SHALL be recalculated, and zero shards SHALL be credited

#### Scenario: Custom amount validation
- GIVEN a player enters $0.50 in the custom amount field
- WHEN the player clicks Donate
- THEN the system SHALL reject the input with the message "Minimum donation is $1.00" before reaching Stripe

#### Scenario: Flagged account blocked
- GIVEN a player's account has `account_flag = 'dispute'`
- WHEN the player attempts to initiate a donation session
- THEN the system SHALL return a 403 error blocking the donation

### Requirement: Patron Tier System
The system SHALL automatically promote players through four Patron tiers based on cumulative lifetime donation totals. Tier upgrades SHALL be permanent and SHALL NOT downgrade on refund or dispute.

#### Scenario: Automatic tier promotion
- GIVEN a player's cumulative total crosses $25
- WHEN the donation webhook processes
- THEN the player's `patron_tier` SHALL be set to 'silver', the Silver Patron badge and title SHALL be granted, and the player SHALL see a thank-you confirmation with their new tier

#### Scenario: Tier never downgrades
- GIVEN a Gold Patron ($100+ cumulative) receives a refund on a $50 donation
- WHEN the refund processes
- THEN `patron_tier` SHALL remain 'gold' and `cumulative_donation_cents` SHALL NOT be reduced

#### Scenario: Diamond stars accumulate
- GIVEN a Diamond Patron has donated a cumulative $1,500
- WHEN the donation is processed
- THEN `patron_diamond_stars` SHALL be `floor((150000 - 50000) / 50000)` = 2 stars, and the badge SHALL display 2 star sparkles (max 5 displayed in UI, uncapped in backend)

### Requirement: Patron Cosmetics
The system SHALL grant tier-specific cosmetic rewards (badges, chat flair, avatar) stored in `shop_items` with patron-specific categories and granted via `player_shop_items`.

#### Scenario: Gold Patron cosmetic grant
- GIVEN a player reaches Gold Patron tier ($100+)
- WHEN the tier promotion fires
- THEN the "Golden Benefactor" chat flair (`patron_flair_golden`) SHALL be granted via `player_shop_items` in addition to the Gold Patron badge and title

#### Scenario: Diamond Patron avatar
- GIVEN a player reaches Diamond Patron tier ($500+)
- WHEN the tier promotion fires
- THEN the "The Benefactor" exclusive avatar SHALL be granted (`patron_avatar_benefactor`)

#### Scenario: Patron cosmetic slots shared with shop
- GIVEN a player has a patron badge and a shop badge
- WHEN the player equips cosmetics
- THEN only one badge SHALL be active at a time (shared `equipped_badge_id` slot on `players`)

### Requirement: Donor Leaderboard
The system SHALL display a public donor leaderboard of up to 50 opted-in patrons ranked by cumulative donation total, with no specific dollar amounts shown — only rank, alias, and Patron tier.

#### Scenario: Opt-in required for visibility
- GIVEN a player's `donor_visibility` is FALSE (default)
- WHEN the donor leaderboard renders
- THEN that player SHALL NOT appear on the leaderboard even if they have donated

#### Scenario: Opt-in toggle
- GIVEN a player checks "Show my name on the donor leaderboard" during a donation
- WHEN the donation completes
- THEN `donor_visibility` SHALL be set to TRUE and the player SHALL appear on the leaderboard

### Requirement: Recent Donors Banner
The system SHALL display a rotating ticker of the 5 most recent opted-in donations within the last 7 days, rotating every 5 seconds client-side.

#### Scenario: Recent donor display
- GIVEN a donor opted in donated within the last 7 days
- WHEN the Support Us tab renders
- THEN the banner SHALL display `"[PlayerAlias] just supported Elysium Rising!"` in the rotation

#### Scenario: Anonymous donor
- GIVEN a donor did not opt in to visibility
- WHEN a recent donation notification would appear
- THEN it SHALL NOT appear in the banner

### Requirement: Achievement
The system SHALL grant the "Patron of Elysium" achievement (with suffix title "Patron of Elysium") on a player's first successful donation of any amount.

#### Scenario: First donation achievement
- GIVEN a player has never donated before
- WHEN any donation completes successfully
- THEN the `patron_of_elysium` achievement SHALL be evaluated and granted, awarding the "Patron of Elysium" title

### Requirement: Admin Endpoints
The system SHALL provide admin-only read endpoints for listing donations, viewing statistics, and viewing a player's donation history. No manual tier override SHALL exist.

#### Scenario: Admin stats
- GIVEN an admin navigates to the donations admin page
- WHEN the stats endpoint is called
- THEN total raised (USD), donor count, average donation, and tier distribution SHALL be returned

## Design
The Shop gains a third tab "Support Us" containing:
1. Recent donors rotating banner
2. Heartfelt community message + alternative support methods
3. Donation flow (6 fixed tiers + custom amount input + visibility checkbox + [Donate] button)
4. Patron Status section (current tier, progress to next, donation count)
5. Donor Hall of Honor (leaderboard, 50 entries max, opt-in only)

Donation confirmation modal shows: amount, no-shards disclaimer, [Confirm Donation] / [Cancel].

Patron tier thresholds (all configurable via game_configs):
- Bronze: $5 — Bronze shield + heart badge, "Bronze Patron" prefix title
- Silver: $25 — Silver shield + wings badge, "Silver Patron" prefix title
- Gold: $100 — Gold shield + laurel badge, "Gold Patron" prefix title, Golden Benefactor flair
- Diamond: $500 — Diamond shield + stars badge, "Diamond Patron" prefix title, Golden Benefactor flair, "The Benefactor" avatar

Rate limiting: POST `/api/donations/create-session` max 5/player/minute; GET `/api/donations/leaderboard` max 15/player/minute.

## Schema

### New Table: `donations`
```sql
CREATE TABLE donations (
    id                      SERIAL PRIMARY KEY,
    player_id               INTEGER NOT NULL REFERENCES players(id),
    payment_order_id        INTEGER NOT NULL REFERENCES payment_orders(id) UNIQUE,
    amount_cents            INTEGER NOT NULL CHECK (amount_cents >= 100),
    cumulative_total_cents  INTEGER NOT NULL DEFAULT 0,
    patron_tier             VARCHAR(20) DEFAULT NULL,
    diamond_stars           INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Modified: `players`
Added columns: `cumulative_donation_cents` (INTEGER DEFAULT 0), `patron_tier` (VARCHAR(20)), `patron_diamond_stars` (INTEGER DEFAULT 0), `donor_visibility` (BOOLEAN DEFAULT FALSE).

### Key game_configs
| Key | Default |
|-----|---------|
| `donation_min_cents` | 100 |
| `patron_tier_bronze_cents` | 500 |
| `patron_tier_silver_cents` | 2500 |
| `patron_tier_gold_cents` | 10000 |
| `patron_tier_diamond_cents` | 50000 |
| `patron_diamond_star_increment` | 50000 |
| `patron_diamond_star_display_cap` | 5 |
| `donor_leaderboard_size` | 50 |
| `recent_donors_count` | 5 |
| `recent_donors_window_days` | 7 |

### API Endpoints
Player: `POST /api/donations/create-session`, `GET /api/donations/status`, `GET /api/donations/history`, `GET /api/donations/leaderboard`, `GET /api/donations/recent`, `PUT /api/donations/visibility`

Admin: `GET /api/admin/donations`, `GET /api/admin/donations/stats`, `GET /api/admin/donations/player/{player_id}`
