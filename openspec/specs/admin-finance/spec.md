# Admin Finance Dashboard Specification

## Purpose
Section 3.6 builds the Admin Finance Dashboard — a single-page, tabbed admin interface that consolidates all financial management and operational tooling across 3.1–3.5. While backend admin endpoints already exist for payments, subscriptions, shop, donations, and marketplace, this phase creates a comprehensive management experience with deeper workflows including revenue analytics, manual shard adjustments, Stripe refund initiation, dispute queue management, and marketplace anomaly detection.

## Requirements

### Requirement: Revenue Overview and Analytics
The system SHALL provide a consolidated revenue overview with summary cards (total revenue, ARPU, active subscribers, dispute count) and a time-series revenue chart (daily/weekly/monthly breakdowns by source). All analytics SHALL be computed server-side from existing tables.

#### Scenario: Overview loads with current metrics
- GIVEN an admin opens the Finance Dashboard Overview tab
- WHEN the page loads
- THEN revenue summary cards and a BarChart showing revenue by source (purchases, subscriptions, marketplace) are displayed

### Requirement: Manual Shard Adjustment
The system SHALL allow admins to grant or debit shards for any player via `POST /api/admin/finance/shard-adjust`. Every adjustment SHALL require a non-empty reason field, log to both `shard_transactions` and `admin_shard_adjustments`, and capture before/after balance snapshots.

#### Scenario: Shard grant with audit trail
- GIVEN an admin grants 500 shards to a player for a support resolution
- WHEN `POST /api/admin/finance/shard-adjust` is called with `adjust_type='grant'`, `amount=500`, `reason='Lost items - support ticket #123'`
- THEN the player's balance increases by 500, a `shard_transactions` row (`source_type='admin_grant'`) is created, and an `admin_shard_adjustments` row captures the admin email, before/after balance, and reason

### Requirement: Stripe Refund Initiation
The system SHALL allow admins to initiate partial or full Stripe refunds via `POST /api/admin/finance/initiate-refund`. The endpoint SHALL call the Stripe API, then auto-debit the proportional shard amount via the existing `debit_shards()` service.

#### Scenario: Admin-initiated full refund
- GIVEN an admin selects a completed payment order and initiates a full refund
- WHEN `POST /api/admin/finance/initiate-refund` is called with `payment_order_id` and full amount
- THEN Stripe is called to issue the refund, shards are debited proportionally, and the order status updates to 'refunded'

### Requirement: Dispute Queue
The system SHALL provide a filterable dispute queue showing all players with `account_flag = 'dispute'`. Admins SHALL be able to clear the dispute flag, apply a warning, or ban the account. Investigation panels SHALL show the player's full transaction history and shard balance timeline.

#### Scenario: Dispute resolved — flag cleared
- GIVEN an admin investigates a dispute and determines it was fraudulent but already resolved
- WHEN they click "Clear Dispute Flag" in the DisputeQueueTab
- THEN `players.account_flag` is set to NULL and the player can resume purchases

### Requirement: Marketplace Anomaly Detection
The system SHALL detect and log marketplace anomalies using configurable thresholds from `game_configs`: price manipulation (listing > N× 30-day average for same item/rarity), rapid relisting (same item type > N times within a time window), and wash trading (same player pair trading > N times within a window). Anomalies SHALL be logged to `activity_events` for admin review.

#### Scenario: Price anomaly flagged
- GIVEN `anomaly_price_multiplier_threshold = 10` and the 30-day average price for a "Cracked Data Core" (Common) is 50 shards
- WHEN a player lists it at 600 shards (12×)
- THEN an anomaly event is logged and the listing appears in the Marketplace Anomaly log

### Requirement: CSV Export
The system SHALL provide a CSV export button on all paginated list views (transactions, subscriptions, donations, listings, trades, disputes) that exports the current filtered dataset.

### Requirement: Shop Catalog Management
The system SHALL allow admins to create, edit, and deactivate shop items and bundles. The booster item form SHALL provide structured inputs (boost_type dropdown, duration_seconds, magnitude) that write to `item_metadata` JSONB. Admins SHALL be able to schedule featured rotation windows via `featured_from` / `featured_until` timestamps.

## Design

### Module Structure
```
backend/
├── routes/admin_finance.py              # All 3.6 analytics + shard + refund + dispute endpoints
├── services/finance_analytics_service.py # DB-driven aggregation queries (no new schema)
└── models/finance.py                    # AdminShardAdjustment model

admin/src/pages/
└── FinanceDashboard.tsx                 # 8-tab container

admin/src/components/finance/
├── OverviewTab.tsx          # Revenue cards + recharts BarChart
├── TransactionsTab.tsx      # Payment orders + webhook events
├── RefundModal.tsx          # Full/partial refund with Stripe call
├── ShardEconomyTab.tsx      # Health metrics + AreaChart + manual adjust
├── ShardAdjustModal.tsx     # Grant/debit form
├── SubscriptionsTab.tsx     # Subscriber list + actions
├── ShopManagementTab.tsx    # Item/bundle CRUD + featured rotation
├── MarketplaceTab.tsx       # Listings + trades + anomaly log
├── DisputeQueueTab.tsx      # Flagged accounts + investigation
├── DonationsTab.tsx         # Donor list + stats
└── CsvExportButton.tsx      # Reusable export component
```

### Analytics Queries (Server-Side, No New Tables)
- Revenue chart: aggregates from `payment_orders` (completed) + `player_subscriptions` (invoice events) grouped by date
- Shard flow: `shard_transactions` grouped by `source_type`
- Subscription metrics: active count, churn rate, ARPU from `player_subscriptions`
- Marketplace analytics: `marketplace_trades` volume + revenue (tax burned)

## Schema

**Migration 054** (applied).

### `admin_shard_adjustments`
Dedicated audit trail separate from `shard_transactions` (which is the financial ledger). Captures admin accountability context.

```sql
admin_shard_adjustments:
  id SERIAL PK
  player_id → players(id)
  admin_email VARCHAR(255) NOT NULL
  adjust_type VARCHAR(10) CHECK IN ('grant', 'debit')
  amount INTEGER CHECK > 0
  reason TEXT NOT NULL
  balance_before BIGINT NOT NULL
  balance_after BIGINT NOT NULL
  shard_txn_id → shard_transactions(id) [nullable]
  created_at TIMESTAMPTZ
```

Indexes: `(player_id)`, `(admin_email)`, `(created_at DESC)`.

### Seed Data — Anomaly Detection Thresholds (migration 054)
| Key | Default | Purpose |
|:---|:---|:---|
| `anomaly_price_multiplier_threshold` | 10 | Flag listings > N× 30-day average |
| `anomaly_rapid_relist_count` | 5 | Flag > N same-type listings in window |
| `anomaly_rapid_relist_window_minutes` | 60 | Relist detection window |
| `anomaly_wash_trade_count` | 3 | Flag player pairs trading > N times |
| `anomaly_wash_trade_window_hours` | 24 | Wash trade detection window |
