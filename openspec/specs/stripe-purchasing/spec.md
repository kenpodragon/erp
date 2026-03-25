# Stripe Shard Purchasing Specification

## Purpose
Section 3.1 establishes the real-money payment pipeline connecting Stripe to the game's premium currency (Elysium Shards). This includes Stripe Checkout Sessions for one-time shard package purchases, webhook-driven payment lifecycle (confirmation, failure, refund, dispute), shard crediting with full idempotency and audit trail, player-facing transaction history, and administrative refund and dispute handling. This is the foundation all other Phase 3 monetization systems build upon.

## Requirements

### Requirement: Shard Package Purchase Flow
The system SHALL create a Stripe Checkout Session on `POST /api/payments/checkout` with a 30-minute expiry and all Stripe-supported payment methods enabled. The checkout URL SHALL be returned to the client for redirect.

The system SHALL block checkout if the player's `account_flag = 'dispute'`.

The system SHALL enforce `max_purchases_per_player` cap when set on a package.

#### Scenario: Successful checkout session created
- GIVEN an authenticated player selects the Medium Pack ($9.99 / 1,100 shards)
- WHEN `POST /api/payments/checkout` is called with `package_id`
- THEN a Stripe Checkout Session is created, a `payment_orders` row with status `pending` is inserted, and the checkout URL is returned

#### Scenario: Purchase blocked during active dispute
- GIVEN a player with `account_flag = 'dispute'`
- WHEN they attempt to initiate a checkout
- THEN the endpoint returns 403 with "Purchases blocked during active dispute"

#### Scenario: Per-player cap enforced
- GIVEN a package with `max_purchases_per_player = 1` and a player who already completed one purchase
- WHEN they attempt a second purchase of the same package
- THEN the endpoint returns 400

### Requirement: Webhook-Driven Shard Crediting
The system SHALL handle `checkout.session.completed` by validating the Stripe signature, checking idempotency via `stripe_checkout_session_id`, crediting shards, and marking the order `completed`. The system SHALL apply a 2x first-purchase bonus (tracked by `first_purchase_claimed`, permanently consumed even on refund).

#### Scenario: Idempotent webhook handling
- GIVEN a `checkout.session.completed` webhook is received twice (Stripe retry)
- WHEN the second webhook is processed
- THEN shards are NOT credited a second time (idempotency check via `stripe_checkout_session_id`)

#### Scenario: First purchase bonus applied
- GIVEN a player with `first_purchase_claimed = false` completes an Ultimate Pack purchase
- WHEN the webhook credits shards
- THEN 13,000 × 2 = 26,000 shards are credited and `first_purchase_claimed` is set to true

#### Scenario: First purchase bonus not reset on refund
- GIVEN a player's first purchase is refunded
- WHEN the refund webhook is processed
- THEN `first_purchase_claimed` remains true and shards are debited proportionally

### Requirement: Refund and Dispute Handling
The system SHALL handle `charge.refunded` by debiting shards proportionally (partial refunds debit proportional fraction). The system SHALL handle `charge.dispute.created` by flagging the account and debiting shards. A won dispute reversal SHALL credit shards back.

#### Scenario: Partial refund proportional debit
- GIVEN a player purchased 1,100 shards for $9.99 and a partial refund of $5.00 is issued
- WHEN the `charge.refunded` webhook fires
- THEN `floor(1100 * 5.00 / 9.99) = 550` shards are debited

#### Scenario: Dispute flags account
- GIVEN Stripe fires `charge.dispute.created` for a player's purchase
- WHEN the webhook is processed
- THEN `players.account_flag = 'dispute'`, shards are debited, and all new purchases are blocked

### Requirement: Transaction History
The system SHALL provide a paginated transaction history via `GET /api/payments/transactions`. Each record SHALL include amount, status, shard credit, date, and conditional "Request Refund" / "Contact Support" links.

#### Scenario: Transaction history displayed
- GIVEN a player with 3 completed purchases and 1 refund
- WHEN `GET /api/payments/transactions` is called
- THEN all 4 records are returned with correct statuses and conditional action links

### Requirement: Stripe Customer Linking
The system SHALL create or retrieve a Stripe Customer object on the first purchase attempt, storing `stripe_customer_id` on the player record. All subsequent sessions SHALL attach to this customer. Stripe email receipts SHALL be enabled.

#### Scenario: Stripe customer created on first purchase
- GIVEN a player with no `stripe_customer_id` initiates checkout
- WHEN the checkout session is created
- THEN a Stripe Customer is created with the player's Firebase email and `stripe_customer_id` is stored

## Design

### Module Structure
```
backend/
├── routes/payments.py         # Player-facing: checkout, status, packages, history
├── routes/webhooks.py         # Stripe webhook handler (no auth, signature verify)
├── models/payments.py         # ShardPackage, PaymentOrder, StripeWebhookEvent
├── services/payment_service.py # credit_shards(), debit_shards(), get_or_create_stripe_customer()
└── config/stripe_config.py    # Stripe SDK init from env vars
```

### Checkout Flow
1. Check `account_flag` → reject if 'dispute'
2. Validate package active + purchase cap
3. Get or create Stripe Customer
4. Generate UUID `idempotency_key`, insert `payment_orders` row (status: pending)
5. Call `stripe.checkout.Session.create()` with metadata: `player_id`, `package_id`, `idempotency_key`
6. Return checkout URL

### Proportional Refund Formula
`refunded_amount_cents / original_price_cents * shards_credited` (floored)

### Reconciliation
`POST /api/admin/payments/reconcile` polls Stripe for any completed sessions not yet processed. Run manually or on schedule.

## Schema

**Migration 049** (applied).

### `shard_packages`
6 seeded tiers: Starter ($0.99/100 shards) through Ultimate ($99.99/13,000 shards). Fields: `tier_key`, `price_cents`, `base_shards`, `bonus_pct`, `total_shards`, `is_active`, `max_purchases_per_player` (NULL = unlimited).

### `payment_orders`
One row per Stripe Checkout Session. Key fields: `status` ('pending'|'completed'|'expired'|'refunded'|'disputed'), `stripe_checkout_session_id` (UNIQUE — idempotency key), `idempotency_key` UUID UNIQUE, `shards_credited`, `shards_refunded`, `is_first_purchase`.

### `stripe_webhook_events`
Dedup table for all received Stripe events keyed by `stripe_event_id` to prevent double-processing.

### `players` — New Columns (migration 049)
| Column | Type | Description |
|:---|:---|:---|
| `stripe_customer_id` | VARCHAR(255) UNIQUE | Stripe Customer ID |
| `first_purchase_claimed` | BOOLEAN DEFAULT FALSE | 2x bonus consumed flag |
| `account_flag` | VARCHAR(30) | NULL = clean, 'dispute' = purchases blocked |
