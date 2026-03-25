# Subscription — Elysium Ascendant Specification

## Purpose
Section 3.2 introduces a single recurring subscription tier — Elysium Ascendant — providing cosmetic perks, quality-of-life convenience, and soft gameplay boosts. The subscription is positioned as a "supporter plus" tier that accelerates collection and progression without gating content or creating pay-to-win advantages (no PVP exists). Benefits include XP/Essence/Drop Rate/Idle Speed multipliers, a monthly shard stipend, loyalty streak bonuses, and subscriber cosmetic indicators in chat and leaderboards.

## Requirements

### Requirement: Subscription Lifecycle
The system SHALL support monthly ($1.99/mo) and annual ($19.90/yr) billing via Stripe Subscriptions. The system SHALL apply a business-day grace period on payment failure before revoking benefits. Benefit state SHALL be tracked via `players.is_ascendant` (fast-lookup boolean kept in sync by the subscription service).

#### Scenario: Grace period on payment failure
- GIVEN a subscriber whose renewal payment fails on a Monday
- WHEN `invoice.payment_failed` webhook fires
- THEN `grace_deadline` is set to 23:59:59 UTC Tuesday (next business day) and benefits continue

#### Scenario: Benefits revoked after grace period
- GIVEN the grace deadline passes without payment resolution
- WHEN the grace period expires
- THEN `player_subscriptions.status = 'expired'` and `players.is_ascendant = false`

#### Scenario: Cancellation at period end
- GIVEN a subscriber requests cancellation
- WHEN `PATCH /api/subscriptions/cancel` is called
- THEN `cancel_at_period_end = true`, status remains 'canceling', benefits continue until `current_period_end`

### Requirement: Subscription Boosts Applied Server-Side
The system SHALL apply all boosts server-side via `get_subscriber_multipliers(player_id)` (or `get_effective_multipliers()` after 3.3). Boosts SHALL be multiplicative with shop boosters. The system SHALL apply boosts in: Story Mode `/complete` (XP + Essence + Drop Rate), Idle Training (XP + Essence + Speed), Achievement essence rewards, and Artifact drop chances.

Default boost values (all stored in `game_configs`, admin-adjustable):
- XP Multiplier: 1.15x
- Essence Multiplier: 1.15x
- Drop Rate Boost: 1.10x
- Idle Training Speed: 1.10x

#### Scenario: XP boost applied on scene completion
- GIVEN an active Elysium Ascendant subscriber completes a story scene that awards 200 XP
- WHEN `/complete` is processed
- THEN the player receives `floor(200 * 1.15) = 230` XP

#### Scenario: Stacking with shop booster
- GIVEN a subscriber (1.15x XP) who also has an active 1.25x XP shop booster
- WHEN XP is calculated
- THEN total XP multiplier is `1.15 × 1.25 = 1.4375x`

### Requirement: Monthly Shard Stipend
The system SHALL credit 150 shards on each monthly renewal. Annual subscribers SHALL receive 150 shards on each monthly anniversary of their subscription start date (lazy evaluation — credited on next access after the anniversary). Stipend credits SHALL be logged in `shard_transactions` with `source_type = 'subscription_stipend'`.

#### Scenario: Monthly stipend credited on renewal
- GIVEN a monthly subscriber whose billing date is the 1st of the month
- WHEN `invoice.paid` fires on the 1st
- THEN 150 shards are credited and a `shard_transactions` record is inserted

### Requirement: Loyalty Streak System
The system SHALL track `continuous_streak` (months uninterrupted) and `cumulative_subscription_months` (lifetime total, monotonically increasing). Permanent titles SHALL be granted at cumulative month milestones. Streaks SHALL reset to 0 on subscription lapse.

#### Scenario: Loyalty title granted at milestone
- GIVEN a player reaches 3 cumulative subscription months
- WHEN `cumulative_subscription_months` increments to 3
- THEN the "Loyal Ascendant" title is permanently granted

#### Scenario: Streak resets on lapse
- GIVEN a subscriber with `continuous_streak = 5` whose subscription expires
- WHEN the subscription lapses and they re-subscribe later
- THEN a new `player_subscriptions` row is created and `continuous_streak` starts at 0

### Requirement: Subscriber Indicators
The system SHALL display a golden ★ badge next to subscriber names in chat and a ★ indicator on leaderboard rank cards.

#### Scenario: Chat badge visible to all
- GIVEN a subscriber sends a chat message
- WHEN other players view the chat
- THEN a golden ★ appears next to the subscriber's display name

## Design

### Webhook Handlers (extending `webhooks.py`)
| Event | Action |
|:---|:---|
| `checkout.session.completed` (subscription mode) | Create `player_subscriptions` row, set `is_ascendant = true` |
| `invoice.paid` | Renew period, increment streak, credit stipend |
| `invoice.payment_failed` | Start grace period |
| `customer.subscription.updated` | Handle plan switch (proration via Stripe) |
| `customer.subscription.deleted` | Set status = 'expired', `is_ascendant = false` |

### Business-Day Grace Period
Calculated as the next business day (Monday–Friday, excluding observed holidays) at 23:59:59 UTC from the payment failure date.

### Module Structure
```
backend/
├── routes/subscriptions.py         # Player-facing endpoints
├── routes/admin_subscriptions.py   # Admin lifecycle management
├── models/subscriptions.py         # PlayerSubscription, SubscriptionStipendLog
└── services/subscription_service.py # Lifecycle, stipend, loyalty, grace period
```

## Schema

**Migration 050** (applied).

### `player_subscriptions`
Append-only. Each subscription period = one row. Key columns:
- `plan_key`: 'ascendant_monthly' | 'ascendant_annual'
- `status`: 'active' | 'past_due' | 'canceling' | 'expired'
- `source`: 'stripe' | 'admin_gift'
- `subscription_start_date`: anchor for annual stipend anniversaries (never changes on plan switch)
- `cancel_at_period_end` BOOLEAN
- `continuous_streak` INTEGER
- `grace_period_start`, `grace_deadline` TIMESTAMPTZ (NULL = no active grace period)

### `subscription_stipend_log`
Tracks each stipend credit: `player_id`, `subscription_id`, `credited_at`, `shards_credited`, `period_month`.

### `players` — New Columns (migration 050)
| Column | Type | Description |
|:---|:---|:---|
| `is_ascendant` | BOOLEAN DEFAULT FALSE | Fast-lookup subscription status flag |
| `cumulative_subscription_months` | INTEGER DEFAULT 0 | Lifetime months subscribed |

### New Seed Data (migration 050)
- 10 loyalty titles
- 11 subscription achievements (categories: 'economics', tracking cumulative months + streak + shard spend)
