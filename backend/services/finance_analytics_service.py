"""Finance analytics service: revenue, shard economy, subscriptions, marketplace, donations (3.6)."""

import logging
from datetime import datetime, timezone, timedelta

from sqlmodel import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


# =============================================================================
# Revenue Overview
# =============================================================================

def get_revenue_overview(session: Session) -> dict:
    """Revenue today/week/month, active subs, shard circulation, marketplace volume 7d."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Revenue from completed payment orders
    rev = session.execute(
        text(
            "SELECT "
            "  COALESCE(SUM(CASE WHEN completed_at >= :today THEN price_cents ELSE 0 END), 0) AS rev_today, "
            "  COALESCE(SUM(CASE WHEN completed_at >= :week THEN price_cents ELSE 0 END), 0) AS rev_week, "
            "  COALESCE(SUM(CASE WHEN completed_at >= :month THEN price_cents ELSE 0 END), 0) AS rev_month "
            "FROM payment_orders WHERE status = 'completed'"
        ),
        {"today": today_start, "week": week_start, "month": month_start},
    ).fetchone()

    # Active subscriptions
    active_subs = session.execute(
        text("SELECT COUNT(*) FROM player_subscriptions WHERE status = 'active'")
    ).scalar() or 0

    # Shard circulation
    shard_circ = session.execute(
        text("SELECT COALESCE(SUM(shard_balance), 0) FROM player_meta_progression")
    ).scalar() or 0

    # Marketplace volume 7d
    mp_vol_7d = session.execute(
        text(
            "SELECT COALESCE(SUM(price_shards), 0) FROM marketplace_trades "
            "WHERE traded_at >= :week"
        ),
        {"week": week_start},
    ).scalar() or 0

    return {
        "revenue_today_cents": int(rev.rev_today),
        "revenue_week_cents": int(rev.rev_week),
        "revenue_month_cents": int(rev.rev_month),
        "active_subscriptions": active_subs,
        "shard_circulation": int(shard_circ),
        "marketplace_volume_7d": int(mp_vol_7d),
    }


# =============================================================================
# Revenue Chart
# =============================================================================

def get_revenue_chart(session: Session, days: int = 30) -> list:
    """Daily revenue by source (purchases/subscriptions/donations) from payment_orders + donations."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = session.execute(
        text(
            "SELECT d.day, "
            "  COALESCE(purchases.total, 0) AS purchases_cents, "
            "  COALESCE(subs.total, 0) AS subscriptions_cents, "
            "  COALESCE(dons.total, 0) AS donations_cents "
            "FROM generate_series(CAST(:cutoff AS date), CURRENT_DATE, '1 day') AS d(day) "
            "LEFT JOIN ( "
            "  SELECT completed_at::date AS day, SUM(price_cents) AS total "
            "  FROM payment_orders "
            "  WHERE status = 'completed' AND completed_at >= :cutoff "
            "  GROUP BY completed_at::date "
            ") purchases ON purchases.day = d.day "
            "LEFT JOIN ( "
            "  SELECT subscription_start_date::date AS day, COUNT(*) * 199 AS total "
            "  FROM player_subscriptions "
            "  WHERE status = 'active' AND subscription_start_date >= :cutoff "
            "  GROUP BY subscription_start_date::date "
            ") subs ON subs.day = d.day "
            "LEFT JOIN ( "
            "  SELECT d2.created_at::date AS day, SUM(d2.amount_cents) AS total "
            "  FROM donations d2 "
            "  JOIN payment_orders po ON d2.payment_order_id = po.id "
            "  WHERE po.status = 'completed' AND d2.created_at >= :cutoff "
            "  GROUP BY d2.created_at::date "
            ") dons ON dons.day = d.day "
            "ORDER BY d.day"
        ),
        {"cutoff": cutoff},
    ).fetchall()

    return [
        {
            "date": str(r.day),
            "purchases_cents": int(r.purchases_cents),
            "subscriptions_cents": int(r.subscriptions_cents),
            "donations_cents": int(r.donations_cents),
        }
        for r in rows
    ]


# =============================================================================
# Shard Economy
# =============================================================================

def get_shard_economy(session: Session) -> dict:
    """Total circulation, purchased, spent, burned, net flow 30d, spend rate."""
    circulation = session.execute(
        text("SELECT COALESCE(SUM(shard_balance), 0) FROM player_meta_progression")
    ).scalar() or 0

    total_purchased = session.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) FROM shard_transactions "
            "WHERE source_type = 'purchase' AND amount > 0"
        )
    ).scalar() or 0

    total_spent = session.execute(
        text(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM shard_transactions "
            "WHERE amount < 0"
        )
    ).scalar() or 0

    total_burned = session.execute(
        text(
            "SELECT COALESCE(SUM(tax_shards), 0) FROM marketplace_trades"
        )
    ).scalar() or 0

    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)

    net_flow_30d = session.execute(
        text(
            "SELECT COALESCE(SUM(amount), 0) FROM shard_transactions "
            "WHERE created_at >= :cutoff"
        ),
        {"cutoff": cutoff_30d},
    ).scalar() or 0

    # Spend rate = total spent in 30d / active players in 30d
    spent_30d = session.execute(
        text(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM shard_transactions "
            "WHERE amount < 0 AND created_at >= :cutoff"
        ),
        {"cutoff": cutoff_30d},
    ).scalar() or 0

    active_spenders_30d = session.execute(
        text(
            "SELECT COUNT(DISTINCT player_id) FROM shard_transactions "
            "WHERE amount < 0 AND created_at >= :cutoff"
        ),
        {"cutoff": cutoff_30d},
    ).scalar() or 0

    spend_rate = round(int(spent_30d) / max(active_spenders_30d, 1), 2)

    return {
        "total_circulation": int(circulation),
        "total_purchased": int(total_purchased),
        "total_spent": int(total_spent),
        "total_burned": int(total_burned),
        "net_flow_30d": int(net_flow_30d),
        "spend_rate_per_player_30d": spend_rate,
    }


# =============================================================================
# Shard Flow Chart
# =============================================================================

def get_shard_flow_chart(session: Session, days: int = 30) -> list:
    """Daily inflows vs outflows from shard_transactions."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = session.execute(
        text(
            "SELECT d.day, "
            "  COALESCE(inflows.total, 0) AS inflows, "
            "  COALESCE(outflows.total, 0) AS outflows "
            "FROM generate_series(CAST(:cutoff AS date), CURRENT_DATE, '1 day') AS d(day) "
            "LEFT JOIN ( "
            "  SELECT created_at::date AS day, SUM(amount) AS total "
            "  FROM shard_transactions "
            "  WHERE amount > 0 AND created_at >= :cutoff "
            "  GROUP BY created_at::date "
            ") inflows ON inflows.day = d.day "
            "LEFT JOIN ( "
            "  SELECT created_at::date AS day, SUM(ABS(amount)) AS total "
            "  FROM shard_transactions "
            "  WHERE amount < 0 AND created_at >= :cutoff "
            "  GROUP BY created_at::date "
            ") outflows ON outflows.day = d.day "
            "ORDER BY d.day"
        ),
        {"cutoff": cutoff},
    ).fetchall()

    return [
        {
            "date": str(r.day),
            "inflows": int(r.inflows),
            "outflows": int(r.outflows),
        }
        for r in rows
    ]


# =============================================================================
# Subscription Metrics
# =============================================================================

def get_subscription_metrics(session: Session) -> dict:
    """Active count, plan split, past_due, churn 30d, conversion rate, MRR."""
    active = session.execute(
        text("SELECT COUNT(*) FROM player_subscriptions WHERE status = 'active'")
    ).scalar() or 0

    plan_split = session.execute(
        text(
            "SELECT plan_key, COUNT(*) AS cnt "
            "FROM player_subscriptions WHERE status = 'active' "
            "GROUP BY plan_key"
        )
    ).fetchall()

    past_due = session.execute(
        text("SELECT COUNT(*) FROM player_subscriptions WHERE status = 'past_due'")
    ).scalar() or 0

    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)

    # Voluntary churn: player cancelled (cancel_at_period_end = true) and status became 'expired' in last 30d
    voluntary_churn = session.execute(
        text(
            "SELECT COUNT(*) FROM player_subscriptions "
            "WHERE status = 'expired' AND cancel_at_period_end = TRUE "
            "AND updated_at >= :cutoff"
        ),
        {"cutoff": cutoff_30d},
    ).scalar() or 0

    # Involuntary churn: expired without cancel request
    involuntary_churn = session.execute(
        text(
            "SELECT COUNT(*) FROM player_subscriptions "
            "WHERE status = 'expired' AND (cancel_at_period_end = FALSE OR cancel_at_period_end IS NULL) "
            "AND updated_at >= :cutoff"
        ),
        {"cutoff": cutoff_30d},
    ).scalar() or 0

    # Conversion rate: players with active sub / total players
    total_players = session.execute(
        text("SELECT COUNT(*) FROM players")
    ).scalar() or 0

    conversion_rate = round(active / max(total_players, 1) * 100, 2)

    # MRR: estimate from active count × plan price (plan prices not stored on sub row)
    # Use a fixed mapping since price_cents is not on player_subscriptions
    plan_prices = {"ascendant_monthly": 499, "ascendant_annual": 3999}
    mrr_cents = sum(
        plan_prices.get(str(r.plan_key), 499) * r.cnt for r in plan_split
    )

    return {
        "active_count": active,
        "plan_split": {str(r.plan_key): r.cnt for r in plan_split},
        "past_due": past_due,
        "churn_30d": {
            "voluntary": voluntary_churn,
            "involuntary": involuntary_churn,
            "total": voluntary_churn + involuntary_churn,
        },
        "conversion_rate_pct": conversion_rate,
        "mrr_cents": int(mrr_cents),
    }


# =============================================================================
# Shop Analytics
# =============================================================================

def get_shop_analytics(session: Session) -> dict:
    """Items sold, revenue by category, top 10 items, active boosters."""
    total_sold = session.execute(
        text("SELECT COUNT(*) FROM player_shop_items")
    ).scalar() or 0

    revenue_by_category = session.execute(
        text(
            "SELECT si.category, COUNT(psi.id) AS sold, COALESCE(SUM(si.price_shards), 0) AS revenue_shards "
            "FROM player_shop_items psi "
            "JOIN shop_items si ON si.id = psi.shop_item_id "
            "GROUP BY si.category ORDER BY revenue_shards DESC"
        )
    ).fetchall()

    top_items = session.execute(
        text(
            "SELECT si.id, si.name, si.category, COUNT(psi.id) AS sold, "
            "  COALESCE(SUM(si.price_shards), 0) AS revenue_shards "
            "FROM player_shop_items psi "
            "JOIN shop_items si ON si.id = psi.shop_item_id "
            "GROUP BY si.id, si.name, si.category "
            "ORDER BY sold DESC LIMIT 10"
        )
    ).fetchall()

    active_boosters = session.execute(
        text(
            "SELECT COUNT(*) FROM player_active_boosters "
            "WHERE status = 'active'"
        )
    ).scalar() or 0

    return {
        "total_items_sold": total_sold,
        "revenue_by_category": [
            {"category": r.category, "sold": r.sold, "revenue_shards": int(r.revenue_shards)}
            for r in revenue_by_category
        ],
        "top_10_items": [
            {
                "id": r.id, "name": r.name, "category": r.category,
                "sold": r.sold, "revenue_shards": int(r.revenue_shards),
            }
            for r in top_items
        ],
        "active_boosters": active_boosters,
    }


# =============================================================================
# Marketplace Analytics
# =============================================================================

def get_marketplace_analytics(session: Session) -> dict:
    """Volume 7d/30d/all, avg price, tax burned, unique traders 30d, listings 30d."""
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    stats = session.execute(
        text(
            "SELECT "
            "  COALESCE(SUM(price_shards), 0) AS vol_all, "
            "  COALESCE(SUM(CASE WHEN traded_at >= :week THEN price_shards ELSE 0 END), 0) AS vol_7d, "
            "  COALESCE(SUM(CASE WHEN traded_at >= :month THEN price_shards ELSE 0 END), 0) AS vol_30d, "
            "  COALESCE(AVG(price_shards), 0) AS avg_price, "
            "  COALESCE(SUM(tax_shards), 0) AS tax_burned "
            "FROM marketplace_trades"
        ),
        {"week": week_ago, "month": month_ago},
    ).fetchone()

    unique_traders_30d = session.execute(
        text(
            "SELECT COUNT(DISTINCT trader_id) FROM ( "
            "  SELECT buyer_id AS trader_id FROM marketplace_trades WHERE traded_at >= :month "
            "  UNION "
            "  SELECT seller_id AS trader_id FROM marketplace_trades WHERE traded_at >= :month "
            ") t"
        ),
        {"month": month_ago},
    ).scalar() or 0

    listings_30d = session.execute(
        text(
            "SELECT COUNT(*) FROM marketplace_listings WHERE listed_at >= :month"
        ),
        {"month": month_ago},
    ).scalar() or 0

    return {
        "volume_7d": int(stats.vol_7d),
        "volume_30d": int(stats.vol_30d),
        "volume_all_time": int(stats.vol_all),
        "avg_price": round(float(stats.avg_price), 2),
        "tax_burned": int(stats.tax_burned),
        "unique_traders_30d": unique_traders_30d,
        "listings_30d": listings_30d,
    }


# =============================================================================
# Donation Analytics
# =============================================================================

def get_donation_analytics(session: Session) -> dict:
    """Total all time, total donors, 30d total, avg, tier distribution, top 10, repeat rate."""
    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)

    totals = session.execute(
        text(
            "SELECT "
            "  COALESCE(SUM(amount_cents), 0) AS total_all, "
            "  COUNT(DISTINCT player_id) AS total_donors, "
            "  COALESCE(SUM(CASE WHEN created_at >= :cutoff THEN amount_cents ELSE 0 END), 0) AS total_30d, "
            "  COALESCE(AVG(amount_cents), 0) AS avg_amount "
            "FROM donations"
        ),
        {"cutoff": cutoff_30d},
    ).fetchone()

    # Tier distribution
    tiers = session.execute(
        text(
            "SELECT patron_tier AS tier, COUNT(*) AS cnt, COALESCE(SUM(amount_cents), 0) AS total_cents "
            "FROM donations WHERE patron_tier IS NOT NULL "
            "GROUP BY patron_tier ORDER BY total_cents DESC"
        )
    ).fetchall()

    # Top 10 donors
    top_donors = session.execute(
        text(
            "SELECT d.player_id, p.alias AS display_name, SUM(d.amount_cents) AS total_cents, COUNT(*) AS donation_count "
            "FROM donations d "
            "JOIN players p ON p.id = d.player_id "
            "GROUP BY d.player_id, p.alias "
            "ORDER BY total_cents DESC LIMIT 10"
        )
    ).fetchall()

    # Repeat rate: donors with 2+ donations / total donors
    repeat_donors = session.execute(
        text(
            "SELECT COUNT(*) FROM ( "
            "  SELECT player_id FROM donations "
            "  GROUP BY player_id HAVING COUNT(*) >= 2 "
            ") r"
        )
    ).scalar() or 0

    total_donors = int(totals.total_donors) if totals else 0
    repeat_rate = round(repeat_donors / max(total_donors, 1) * 100, 2)

    return {
        "total_all_time_cents": int(totals.total_all) if totals else 0,
        "total_donors": total_donors,
        "total_30d_cents": int(totals.total_30d) if totals else 0,
        "avg_donation_cents": round(float(totals.avg_amount), 2) if totals else 0,
        "tier_distribution": [
            {"tier": r.tier, "count": r.cnt, "total_cents": int(r.total_cents)}
            for r in tiers
        ],
        "top_10_donors": [
            {
                "player_id": r.player_id, "display_name": r.display_name,
                "total_cents": int(r.total_cents), "donation_count": r.donation_count,
            }
            for r in top_donors
        ],
        "repeat_rate_pct": repeat_rate,
    }


# =============================================================================
# Marketplace Anomaly Detection
# =============================================================================

def detect_marketplace_anomalies(session: Session) -> dict:
    """Detect high price, rapid relist, wash trade suspicion. Read thresholds from game_configs."""
    # Load thresholds from game_configs
    config_rows = session.execute(
        text(
            "SELECT key, value_json #>> '{}' AS value FROM game_configs WHERE category = 'marketplace_anomaly'"
        )
    ).fetchall()
    configs = {r.key: r.value for r in config_rows}

    price_threshold = float(configs.get("anomaly_price_multiplier_threshold", "10"))
    relist_count = int(configs.get("anomaly_rapid_relist_count", "5"))
    relist_window_min = int(configs.get("anomaly_rapid_relist_window_minutes", "60"))
    wash_count = int(configs.get("anomaly_wash_trade_count", "3"))
    wash_window_hours = int(configs.get("anomaly_wash_trade_window_hours", "24"))

    now = datetime.now(timezone.utc)

    # 1. High-price anomalies: listings priced > N× rolling average
    high_price = session.execute(
        text(
            "WITH avg_prices AS ( "
            "  SELECT item_type, AVG(price_shards) AS avg_price "
            "  FROM marketplace_trades "
            "  GROUP BY item_type "
            ") "
            "SELECT ml.id AS listing_id, ml.seller_id, ml.item_name, ml.item_type, "
            "  ml.price_shards, ROUND(ap.avg_price::numeric, 2) AS avg_price, "
            "  ROUND((ml.price_shards / NULLIF(ap.avg_price, 0))::numeric, 2) AS multiplier "
            "FROM marketplace_listings ml "
            "JOIN avg_prices ap ON ap.item_type = ml.item_type "
            "WHERE ml.status = 'active' "
            "  AND ap.avg_price > 0 "
            "  AND ml.price_shards > ap.avg_price * :threshold "
            "ORDER BY multiplier DESC LIMIT 50"
        ),
        {"threshold": price_threshold},
    ).fetchall()

    # 2. Rapid relist: sellers who listed N+ items within the window
    relist_cutoff = now - timedelta(minutes=relist_window_min)
    rapid_relist = session.execute(
        text(
            "SELECT seller_id, COUNT(*) AS listing_count "
            "FROM marketplace_listings "
            "WHERE listed_at >= :cutoff "
            "GROUP BY seller_id "
            "HAVING COUNT(*) >= :relist_count "
            "ORDER BY listing_count DESC LIMIT 50"
        ),
        {"cutoff": relist_cutoff, "relist_count": relist_count},
    ).fetchall()

    # 3. Wash trade suspicion: same buyer-seller pair traded N+ times within window
    wash_cutoff = now - timedelta(hours=wash_window_hours)
    wash_trades = session.execute(
        text(
            "SELECT buyer_id, seller_id, COUNT(*) AS trade_count, "
            "  SUM(price_shards) AS total_shards "
            "FROM marketplace_trades "
            "WHERE traded_at >= :cutoff "
            "GROUP BY buyer_id, seller_id "
            "HAVING COUNT(*) >= :wash_count "
            "ORDER BY trade_count DESC LIMIT 50"
        ),
        {"cutoff": wash_cutoff, "wash_count": wash_count},
    ).fetchall()

    # Log anomalies to activity_events
    anomaly_count = len(high_price) + len(rapid_relist) + len(wash_trades)
    if anomaly_count > 0:
        session.execute(
            text(
                "INSERT INTO activity_events (event_type, description, metadata, created_at) "
                "VALUES ('marketplace_anomaly_scan', :desc, :meta, NOW())"
            ),
            {
                "desc": f"Anomaly scan found {anomaly_count} potential issues",
                "meta": f'{{"high_price": {len(high_price)}, "rapid_relist": {len(rapid_relist)}, "wash_trades": {len(wash_trades)}}}',
            },
        )
        session.commit()

    return {
        "high_price_listings": [
            {
                "listing_id": r.listing_id, "seller_id": r.seller_id,
                "item_name": r.item_name, "item_type": r.item_type,
                "price_shards": r.price_shards,
                "avg_price": float(r.avg_price), "multiplier": float(r.multiplier),
            }
            for r in high_price
        ],
        "rapid_relist": [
            {"seller_id": r.seller_id, "listing_count": r.listing_count}
            for r in rapid_relist
        ],
        "wash_trade_suspicion": [
            {
                "buyer_id": r.buyer_id, "seller_id": r.seller_id,
                "trade_count": r.trade_count, "total_shards": int(r.total_shards),
            }
            for r in wash_trades
        ],
        "thresholds": {
            "price_multiplier": price_threshold,
            "rapid_relist_count": relist_count,
            "rapid_relist_window_minutes": relist_window_min,
            "wash_trade_count": wash_count,
            "wash_trade_window_hours": wash_window_hours,
        },
    }


# =============================================================================
# Player Shard Summary
# =============================================================================

def get_player_shard_summary(session: Session, player_id: int) -> dict:
    """Balance, recent 10 transactions, lifetime stats for a player."""
    balance_row = session.execute(
        text(
            "SELECT shard_balance, total_shards_earned FROM player_meta_progression "
            "WHERE player_id = :pid"
        ),
        {"pid": player_id},
    ).fetchone()

    if not balance_row:
        return {
            "player_id": player_id,
            "balance": 0,
            "total_earned": 0,
            "total_spent": 0,
            "recent_transactions": [],
        }

    total_spent = session.execute(
        text(
            "SELECT COALESCE(SUM(ABS(amount)), 0) FROM shard_transactions "
            "WHERE player_id = :pid AND amount < 0"
        ),
        {"pid": player_id},
    ).scalar() or 0

    recent_txns = session.execute(
        text(
            "SELECT id, amount, balance_after, source_type, source_id, description, created_at "
            "FROM shard_transactions "
            "WHERE player_id = :pid "
            "ORDER BY created_at DESC LIMIT 10"
        ),
        {"pid": player_id},
    ).fetchall()

    return {
        "player_id": player_id,
        "balance": int(balance_row.shard_balance),
        "total_earned": int(balance_row.total_shards_earned),
        "total_spent": int(total_spent),
        "recent_transactions": [
            {
                "id": r.id, "amount": r.amount, "balance_after": r.balance_after,
                "source_type": r.source_type, "source_id": r.source_id,
                "description": r.description, "created_at": str(r.created_at),
            }
            for r in recent_txns
        ],
    }
