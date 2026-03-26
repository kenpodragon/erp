"""Donation business logic: Stripe sessions, webhook processing, patron tier management."""

import os
import math
import logging
from datetime import datetime, timezone, timedelta

import stripe
from sqlmodel import Session, select
from sqlalchemy import text, func

from models.home_base import ShardTransaction, Title, PlayerTitle, Achievement, PlayerAchievement
from models.payments import PaymentOrder
from models.shop import ShopItem, PlayerShopItem

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Patron tier thresholds (defaults, overridden by game_configs)
TIER_THRESHOLDS = [
    ("diamond", 50000),
    ("gold", 10000),
    ("silver", 2500),
    ("bronze", 500),
]

TIER_COSMETIC_MAP = {
    "bronze": {"badges": ["patron_badge_bronze"], "titles": ["Bronze Patron"]},
    "silver": {"badges": ["patron_badge_bronze", "patron_badge_silver"], "titles": ["Bronze Patron", "Silver Patron"]},
    "gold": {"badges": ["patron_badge_bronze", "patron_badge_silver", "patron_badge_gold"], "flair": ["patron_flair_golden"], "titles": ["Bronze Patron", "Silver Patron", "Gold Patron"]},
    "diamond": {"badges": ["patron_badge_bronze", "patron_badge_silver", "patron_badge_gold", "patron_badge_diamond"], "flair": ["patron_flair_golden"], "avatars": ["patron_avatar_benefactor"], "titles": ["Bronze Patron", "Silver Patron", "Gold Patron", "Diamond Patron"]},
}


def _get_config_int(session: Session, key: str, default: int) -> int:
    row = session.execute(
        text("SELECT value_json FROM game_configs WHERE key = :k"),
        {"k": key},
    ).first()
    if row and row[0] is not None:
        # value_json is jsonb — may be raw int/string or JSON-encoded
        val = row[0]
        if isinstance(val, (int, float)):
            return int(val)
        return int(str(val).strip('"'))
    return default


def calculate_patron_tier(cumulative_cents: int, session: Session) -> tuple[str | None, int]:
    """Return (tier_name, diamond_stars) for given cumulative cents."""
    diamond_threshold = _get_config_int(session, "patron_tier_diamond_cents", 50000)
    gold_threshold = _get_config_int(session, "patron_tier_gold_cents", 10000)
    silver_threshold = _get_config_int(session, "patron_tier_silver_cents", 2500)
    bronze_threshold = _get_config_int(session, "patron_tier_bronze_cents", 500)
    star_increment = _get_config_int(session, "patron_diamond_star_increment", 50000)

    if cumulative_cents >= diamond_threshold:
        stars = (cumulative_cents - diamond_threshold) // star_increment
        return "diamond", max(0, stars)
    elif cumulative_cents >= gold_threshold:
        return "gold", 0
    elif cumulative_cents >= silver_threshold:
        return "silver", 0
    elif cumulative_cents >= bronze_threshold:
        return "bronze", 0
    return None, 0


def create_donation_checkout_session(
    player_id: int,
    amount_cents: int,
    session: Session,
) -> dict:
    """Create a Stripe Checkout Session for a donation."""
    min_cents = _get_config_int(session, "donation_min_cents", 100)
    if amount_cents < min_cents:
        raise ValueError(f"Minimum donation is ${min_cents / 100:.2f}.")

    # Check account flag
    row = session.execute(
        text("SELECT account_flag FROM players WHERE id = :pid"),
        {"pid": player_id},
    ).first()
    if not row:
        raise ValueError("Player not found")
    if row.account_flag == "dispute":
        raise ValueError("Account has an active dispute. Please resolve before donating.")

    from services.payment_service import get_or_create_stripe_customer
    customer_id = get_or_create_stripe_customer(player_id, session)

    # Create payment_order via raw SQL (package_id not applicable for donations)
    import uuid
    idempotency_key = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    session.execute(
        text("""
            INSERT INTO payment_orders
                (player_id, package_id, status, idempotency_key, price_cents,
                 shards_credited, shards_refunded, is_first_purchase, created_at)
            VALUES
                (:pid, 1, 'pending', :idem, :price, 0, 0, FALSE, :now)
        """),
        {"pid": player_id, "idem": idempotency_key, "price": amount_cents, "now": now},
    )
    session.flush()

    # Get the order ID
    order_row = session.execute(
        text("SELECT id FROM payment_orders WHERE idempotency_key = :k"),
        {"k": idempotency_key},
    ).first()
    order_id = order_row[0]

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    checkout = stripe.checkout.Session.create(
        customer=customer_id,
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": amount_cents,
                "product_data": {
                    "name": f"Donation to Elysium Rising (${amount_cents / 100:.2f})",
                    "description": "Thank you for supporting Elysium Rising!",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "payment_order_id": str(order_id),
            "order_type": "donation",
            "player_id": str(player_id),
        },
        success_url=f"{frontend_url}?session_id={{CHECKOUT_SESSION_ID}}&type=donation",
        cancel_url=f"{frontend_url}?canceled=true",
    )

    # Update order with checkout session ID
    session.execute(
        text("UPDATE payment_orders SET stripe_checkout_session_id = :sid WHERE id = :oid"),
        {"sid": checkout.id, "oid": order_id},
    )
    session.commit()

    return {"checkout_url": checkout.url, "session_id": checkout.id}


def process_donation_webhook(payment_order_id: int, session_obj: dict, session: Session) -> None:
    """Process a completed donation checkout. Called from webhook handler."""
    order = session.get(PaymentOrder, payment_order_id)
    if not order:
        logger.error("PaymentOrder %s not found for donation webhook", payment_order_id)
        return

    if order.status == "completed":
        logger.info("Donation order %s already completed, skipping", payment_order_id)
        return

    player_id = order.player_id
    amount_cents = order.price_cents

    # Store Stripe IDs on order
    pi_id = session_obj.get("payment_intent")
    order.stripe_payment_intent_id = pi_id
    if pi_id:
        try:
            pi = stripe.PaymentIntent.retrieve(pi_id)
            order.stripe_charge_id = pi.get("latest_charge")
        except stripe.error.StripeError as exc:
            logger.warning("Could not retrieve PI %s: %s", pi_id, exc)

    order.status = "completed"
    order.completed_at = datetime.now(timezone.utc)
    session.add(order)
    session.flush()

    # Update player cumulative total
    session.execute(
        text("""
            UPDATE players
            SET cumulative_donation_cents = cumulative_donation_cents + :amt
            WHERE id = :pid
        """),
        {"amt": amount_cents, "pid": player_id},
    )
    session.flush()

    # Get updated cumulative total
    p_row = session.execute(
        text("SELECT cumulative_donation_cents FROM players WHERE id = :pid"),
        {"pid": player_id},
    ).first()
    cumulative = p_row[0] if p_row else amount_cents

    # Calculate patron tier
    tier, stars = calculate_patron_tier(cumulative, session)

    # Update player patron fields
    session.execute(
        text("""
            UPDATE players
            SET patron_tier = :tier, patron_diamond_stars = :stars
            WHERE id = :pid
        """),
        {"tier": tier, "stars": stars, "pid": player_id},
    )

    # Create donation record
    from models.donation import Donation
    donation = Donation(
        player_id=player_id,
        payment_order_id=payment_order_id,
        amount_cents=amount_cents,
        cumulative_total_cents=cumulative,
        patron_tier=tier,
        diamond_stars=stars,
    )
    session.add(donation)

    # Audit trail: shard_transactions with amount=0
    from models.story_mode import PlayerMetaProgression
    meta = session.get(PlayerMetaProgression, player_id)
    balance_after = meta.shard_balance if meta else 0
    txn = ShardTransaction(
        player_id=player_id,
        amount=0,
        balance_after=balance_after,
        source_type="donation",
        source_id=order.id,
        description=f"Donation ${amount_cents / 100:.2f} (order #{order.id})",
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)

    # Grant cosmetics for current tier
    if tier:
        _grant_patron_cosmetics(player_id, tier, session)

    # Evaluate achievement (donations_count)
    donation_count = session.execute(
        text("SELECT COUNT(*) FROM donations WHERE player_id = :pid"),
        {"pid": player_id},
    ).first()
    count = (donation_count[0] if donation_count else 0) + 1  # +1 for current (not yet flushed)

    from services.achievement_service import evaluate_achievements
    evaluate_achievements(player_id, session, context={"donations_count": count})

    session.commit()
    logger.info("Donation processed: player=%s amount=$%.2f tier=%s stars=%s",
                player_id, amount_cents / 100, tier, stars)


def _grant_patron_cosmetics(player_id: int, tier: str, session: Session) -> None:
    """Grant all cosmetic items and titles for the given patron tier."""
    cosmetics = TIER_COSMETIC_MAP.get(tier, {})

    # Grant shop items (badges, flair, avatars)
    for category_key in ["badges", "flair", "avatars"]:
        item_keys = cosmetics.get(category_key, [])
        for item_key in item_keys:
            # Check if already owned
            existing = session.execute(
                text("""
                    SELECT 1 FROM player_shop_items psi
                    JOIN shop_items si ON si.id = psi.shop_item_id
                    WHERE psi.player_id = :pid AND si.item_key = :ik AND psi.status = 'owned'
                """),
                {"pid": player_id, "ik": item_key},
            ).first()
            if existing:
                continue

            item = session.execute(
                text("SELECT id FROM shop_items WHERE item_key = :ik"),
                {"ik": item_key},
            ).first()
            if item:
                psi = PlayerShopItem(
                    player_id=player_id,
                    shop_item_id=item[0],
                    status="owned",
                    purchased_at=datetime.now(timezone.utc),
                )
                session.add(psi)

    # Grant titles
    title_names = cosmetics.get("titles", [])
    for title_name in title_names:
        existing = session.execute(
            text("""
                SELECT 1 FROM player_titles pt
                JOIN titles t ON t.id = pt.title_id
                WHERE pt.player_id = :pid AND t.name = :tn
            """),
            {"pid": player_id, "tn": title_name},
        ).first()
        if existing:
            continue

        title_row = session.execute(
            text("SELECT id FROM titles WHERE name = :tn"),
            {"tn": title_name},
        ).first()
        if title_row:
            pt = PlayerTitle(
                player_id=player_id,
                title_id=title_row[0],
                earned_at=datetime.now(timezone.utc),
            )
            session.add(pt)

    session.flush()


def get_patron_status(player_id: int, session: Session) -> dict:
    """Get current player's patron status."""
    row = session.execute(
        text("""
            SELECT cumulative_donation_cents, patron_tier, patron_diamond_stars, donor_visibility
            FROM players WHERE id = :pid
        """),
        {"pid": player_id},
    ).first()

    if not row:
        return {"error": "Player not found"}

    cumulative = row.cumulative_donation_cents
    tier = row.patron_tier
    stars = row.patron_diamond_stars
    visible = row.donor_visibility

    # Donation count
    count_row = session.execute(
        text("SELECT COUNT(*) FROM donations WHERE player_id = :pid"),
        {"pid": player_id},
    ).first()
    donation_count = count_row[0] if count_row else 0

    # Next tier info
    next_tier = None
    next_threshold = None
    remaining = None

    thresholds = [
        ("bronze", _get_config_int(session, "patron_tier_bronze_cents", 500)),
        ("silver", _get_config_int(session, "patron_tier_silver_cents", 2500)),
        ("gold", _get_config_int(session, "patron_tier_gold_cents", 10000)),
        ("diamond", _get_config_int(session, "patron_tier_diamond_cents", 50000)),
    ]

    if tier == "diamond":
        star_incr = _get_config_int(session, "patron_diamond_star_increment", 50000)
        diamond_base = _get_config_int(session, "patron_tier_diamond_cents", 50000)
        next_star_at = diamond_base + (stars + 1) * star_incr
        next_tier = f"Diamond Patron {'★' * (stars + 1)}"
        next_threshold = next_star_at
        remaining = max(0, next_star_at - cumulative)
    else:
        for t_name, t_cents in thresholds:
            if cumulative < t_cents:
                next_tier = f"{t_name.capitalize()} Patron"
                next_threshold = t_cents
                remaining = t_cents - cumulative
                break

    display_cap = _get_config_int(session, "patron_diamond_star_display_cap", 5)

    return {
        "cumulative_cents": cumulative,
        "cumulative_display": f"${cumulative / 100:.2f}",
        "patron_tier": tier,
        "diamond_stars": stars,
        "diamond_stars_display": min(stars, display_cap),
        "donor_visibility": visible,
        "donation_count": donation_count,
        "next_tier": next_tier,
        "next_threshold_cents": next_threshold,
        "remaining_cents": remaining,
        "remaining_display": f"${remaining / 100:.2f}" if remaining else None,
    }


def get_donation_history(player_id: int, session: Session, limit: int = 20, offset: int = 0) -> dict:
    """Get paginated donation history for a player."""
    rows = session.execute(
        text("""
            SELECT d.id, d.amount_cents, d.cumulative_total_cents, d.patron_tier,
                   d.diamond_stars, d.created_at
            FROM donations d
            WHERE d.player_id = :pid
            ORDER BY d.created_at DESC
            LIMIT :lim OFFSET :off
        """),
        {"pid": player_id, "lim": limit, "off": offset},
    ).fetchall()

    total_row = session.execute(
        text("SELECT COUNT(*) FROM donations WHERE player_id = :pid"),
        {"pid": player_id},
    ).first()
    total = total_row[0] if total_row else 0

    return {
        "donations": [
            {
                "id": r.id,
                "amount_cents": r.amount_cents,
                "amount_display": f"${r.amount_cents / 100:.2f}",
                "cumulative_total_cents": r.cumulative_total_cents,
                "patron_tier": r.patron_tier,
                "diamond_stars": r.diamond_stars,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_donor_leaderboard(session: Session) -> list[dict]:
    """Get top donors who opted in to visibility."""
    limit = _get_config_int(session, "donor_leaderboard_size", 50)

    rows = session.execute(
        text("""
            SELECT p.id, p.alias, p.patron_tier, p.patron_diamond_stars,
                   p.cumulative_donation_cents
            FROM players p
            WHERE p.donor_visibility = TRUE
              AND p.cumulative_donation_cents > 0
            ORDER BY p.cumulative_donation_cents DESC
            LIMIT :lim
        """),
        {"lim": limit},
    ).fetchall()

    display_cap = _get_config_int(session, "patron_diamond_star_display_cap", 5)

    return [
        {
            "rank": i + 1,
            "player_alias": r.alias or "Anonymous",
            "patron_tier": r.patron_tier,
            "diamond_stars": min(r.patron_diamond_stars, display_cap),
        }
        for i, r in enumerate(rows)
    ]


def get_recent_donors(session: Session) -> list[dict]:
    """Get recent donors for rotating banner."""
    count = _get_config_int(session, "recent_donors_count", 5)
    days = _get_config_int(session, "recent_donors_window_days", 7)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    rows = session.execute(
        text("""
            SELECT p.alias, d.created_at
            FROM donations d
            JOIN players p ON p.id = d.player_id
            WHERE p.donor_visibility = TRUE
              AND d.created_at >= :cutoff
            ORDER BY d.created_at DESC
            LIMIT :lim
        """),
        {"cutoff": cutoff, "lim": count},
    ).fetchall()

    return [
        {
            "player_alias": r.alias or "An anonymous patron",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


def toggle_donor_visibility(player_id: int, visible: bool, session: Session) -> dict:
    """Toggle donor leaderboard visibility."""
    session.execute(
        text("UPDATE players SET donor_visibility = :vis WHERE id = :pid"),
        {"vis": visible, "pid": player_id},
    )
    session.commit()
    return {"donor_visibility": visible}


# ---- Admin functions ----

def admin_get_donations(
    session: Session,
    player_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    """List donations with optional player filter."""
    where = ""
    params: dict = {"lim": limit, "off": offset}
    if player_id:
        where = "WHERE d.player_id = :pid"
        params["pid"] = player_id

    rows = session.execute(
        text(f"""
            SELECT d.id, d.player_id, p.alias, d.amount_cents,
                   d.cumulative_total_cents, d.patron_tier, d.diamond_stars, d.created_at
            FROM donations d
            JOIN players p ON p.id = d.player_id
            {where}
            ORDER BY d.created_at DESC
            LIMIT :lim OFFSET :off
        """),
        params,
    ).fetchall()

    count_row = session.execute(
        text(f"SELECT COUNT(*) FROM donations d {where}"),
        params,
    ).first()
    total = count_row[0] if count_row else 0

    return {
        "donations": [
            {
                "id": r.id,
                "player_id": r.player_id,
                "player_alias": r.alias,
                "amount_cents": r.amount_cents,
                "amount_display": f"${r.amount_cents / 100:.2f}",
                "cumulative_total_cents": r.cumulative_total_cents,
                "patron_tier": r.patron_tier,
                "diamond_stars": r.diamond_stars,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
        "total": total,
    }


def admin_get_donation_stats(session: Session) -> dict:
    """Aggregate donation statistics."""
    row = session.execute(
        text("""
            SELECT COUNT(*) AS total_donations,
                   COUNT(DISTINCT player_id) AS unique_donors,
                   COALESCE(SUM(amount_cents), 0) AS total_raised_cents,
                   COALESCE(AVG(amount_cents), 0) AS avg_donation_cents
            FROM donations
        """)
    ).first()

    tier_rows = session.execute(
        text("""
            SELECT patron_tier, COUNT(*) AS count
            FROM players
            WHERE patron_tier IS NOT NULL
            GROUP BY patron_tier
        """)
    ).fetchall()

    tier_distribution = {r.patron_tier: r.count for r in tier_rows} if tier_rows else {}

    return {
        "total_donations": row.total_donations if row else 0,
        "unique_donors": row.unique_donors if row else 0,
        "total_raised_cents": row.total_raised_cents if row else 0,
        "total_raised_display": f"${(row.total_raised_cents or 0) / 100:.2f}",
        "avg_donation_cents": int(row.avg_donation_cents) if row else 0,
        "avg_donation_display": f"${(row.avg_donation_cents or 0) / 100:.2f}",
        "tier_distribution": tier_distribution,
    }


def admin_get_player_donations(player_id: int, session: Session) -> dict:
    """Get a specific player's donation history and patron info."""
    status = get_patron_status(player_id, session)
    history = get_donation_history(player_id, session, limit=100, offset=0)
    return {**status, **history}
