"""Admin finance dashboard endpoints: revenue, shard economy, subscriptions, marketplace, donations (3.6)."""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session
from sqlalchemy import text

from db import get_session
from auth import get_current_admin
from audit import write_audit_log
from services.payment_service import credit_shards_direct, debit_shards, calculate_refund_shards
from services.finance_analytics_service import (
    get_revenue_overview,
    get_revenue_chart,
    get_shard_economy,
    get_shard_flow_chart,
    get_subscription_metrics,
    get_shop_analytics,
    get_marketplace_analytics,
    get_donation_analytics,
    detect_marketplace_anomalies,
    get_player_shard_summary,
)

import stripe

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/admin/finance", tags=["admin-finance"])


# =============================================================================
# Request Models
# =============================================================================

class ShardAdjustRequest(BaseModel):
    player_id: int
    amount: int
    adjust_type: str  # 'grant' | 'debit'
    reason: str


class RefundRequest(BaseModel):
    order_id: int
    amount_cents: Optional[int] = None  # null = full refund
    reason: str


class DisputeResolveRequest(BaseModel):
    action: str  # 'clear' | 'warn' | 'ban'
    reason: str


# =============================================================================
# 1. GET /overview — Revenue overview
# =============================================================================

@router.get("/overview")
async def overview(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Revenue today/week/month, active subs, shard circulation, marketplace volume."""
    return get_revenue_overview(session)


# =============================================================================
# 2. GET /revenue-chart — Daily revenue by source
# =============================================================================

@router.get("/revenue-chart")
async def revenue_chart(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Daily revenue broken down by purchases, subscriptions, donations."""
    return get_revenue_chart(session, days=days)


# =============================================================================
# 3. GET /shard-economy — Shard economy overview
# =============================================================================

@router.get("/shard-economy")
async def shard_economy(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Total circulation, purchased, spent, burned, net flow, spend rate."""
    return get_shard_economy(session)


# =============================================================================
# 4. GET /shard-flow-chart — Daily shard inflows/outflows
# =============================================================================

@router.get("/shard-flow-chart")
async def shard_flow_chart(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Daily shard inflows vs outflows."""
    return get_shard_flow_chart(session, days=days)


# =============================================================================
# 5. GET /subscription-metrics — Subscription analytics
# =============================================================================

@router.get("/subscription-metrics")
async def subscription_metrics(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Active count, plan split, churn, conversion rate, MRR."""
    return get_subscription_metrics(session)


# =============================================================================
# 6. GET /shop-analytics — Shop analytics
# =============================================================================

@router.get("/shop-analytics")
async def shop_analytics(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Items sold, revenue by category, top items, active boosters."""
    return get_shop_analytics(session)


# =============================================================================
# 7. GET /marketplace-analytics — Marketplace analytics
# =============================================================================

@router.get("/marketplace-analytics")
async def marketplace_analytics(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Volume, avg price, tax burned, unique traders, listings."""
    return get_marketplace_analytics(session)


# =============================================================================
# 8. GET /donation-analytics — Donation analytics
# =============================================================================

@router.get("/donation-analytics")
async def donation_analytics(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Total, donors, 30d stats, tier distribution, top donors, repeat rate."""
    return get_donation_analytics(session)


# =============================================================================
# 9. POST /shard-adjust — Manual shard grant/debit
# =============================================================================

@router.post("/shard-adjust")
async def shard_adjust(
    body: ShardAdjustRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Grant or debit shards to/from a player with full audit trail."""
    admin_email = token.get("email", "unknown")

    if body.adjust_type not in ("grant", "debit"):
        raise HTTPException(status_code=400, detail="adjust_type must be 'grant' or 'debit'")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be positive")
    if not body.reason.strip():
        raise HTTPException(status_code=400, detail="reason is required")

    # Get current balance
    balance_row = session.execute(
        text("SELECT shard_balance FROM player_meta_progression WHERE player_id = :pid"),
        {"pid": body.player_id},
    ).fetchone()

    if not balance_row:
        raise HTTPException(status_code=404, detail="Player meta progression not found")

    balance_before = int(balance_row.shard_balance)

    try:
        if body.adjust_type == "grant":
            credit_shards_direct(
                player_id=body.player_id,
                amount=body.amount,
                source_type="admin_grant",
                source_id=0,
                description=f"Admin grant: {body.reason}",
                session=session,
            )
            balance_after = balance_before + body.amount
        else:
            debit_shards(
                player_id=body.player_id,
                amount=body.amount,
                source_type="admin_debit",
                source_id=0,
                description=f"Admin debit: {body.reason}",
                session=session,
            )
            balance_after = balance_before - body.amount
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get the shard_txn_id from the most recent transaction
    txn_row = session.execute(
        text(
            "SELECT id FROM shard_transactions WHERE player_id = :pid "
            "ORDER BY created_at DESC LIMIT 1"
        ),
        {"pid": body.player_id},
    ).fetchone()

    shard_txn_id = txn_row.id if txn_row else None

    # Create admin shard adjustment record
    session.execute(
        text(
            "INSERT INTO admin_shard_adjustments "
            "(player_id, admin_email, adjust_type, amount, reason, balance_before, balance_after, shard_txn_id, created_at) "
            "VALUES (:pid, :email, :atype, :amount, :reason, :bb, :ba, :txn_id, NOW())"
        ),
        {
            "pid": body.player_id,
            "email": admin_email,
            "atype": body.adjust_type,
            "amount": body.amount,
            "reason": body.reason,
            "bb": balance_before,
            "ba": balance_after,
            "txn_id": shard_txn_id,
        },
    )
    session.commit()

    # Log to activity_events
    session.execute(
        text(
            "INSERT INTO activity_events (event_type, description, metadata, created_at) "
            "VALUES ('admin_shard_adjust', :desc, :meta, NOW())"
        ),
        {
            "desc": f"Admin {admin_email} {body.adjust_type}ed {body.amount} shards to player {body.player_id}",
            "meta": f'{{"player_id": {body.player_id}, "adjust_type": "{body.adjust_type}", "amount": {body.amount}, "reason": "{body.reason}"}}',
        },
    )
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action=f"shard_{body.adjust_type}",
        target_type="player",
        target_id=str(body.player_id),
        details={
            "amount": body.amount,
            "adjust_type": body.adjust_type,
            "reason": body.reason,
            "balance_before": balance_before,
            "balance_after": balance_after,
        },
    )

    return {
        "status": "ok",
        "adjust_type": body.adjust_type,
        "amount": body.amount,
        "balance_before": balance_before,
        "balance_after": balance_after,
    }


# =============================================================================
# 10. GET /player-shard-summary/{player_id} — Player shard summary
# =============================================================================

@router.get("/player-shard-summary/{player_id}")
async def player_shard_summary(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Balance, recent transactions, lifetime stats for a player."""
    return get_player_shard_summary(session, player_id)


# =============================================================================
# 11. POST /initiate-refund — Initiate a Stripe refund
# =============================================================================

@router.post("/initiate-refund")
async def initiate_refund(
    body: RefundRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Initiate a Stripe refund for a payment order. Debits shards proportionally."""
    admin_email = token.get("email", "unknown")

    # Fetch the payment order
    order_row = session.execute(
        text(
            "SELECT id, player_id, stripe_charge_id, price_cents, shards_credited, status "
            "FROM payment_orders WHERE id = :oid"
        ),
        {"oid": body.order_id},
    ).fetchone()

    if not order_row:
        raise HTTPException(status_code=404, detail="Payment order not found")

    order = dict(order_row._mapping)

    if order["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Order status is '{order['status']}', cannot refund")

    if not order.get("stripe_charge_id"):
        raise HTTPException(status_code=400, detail="No Stripe charge ID on this order")

    refund_amount_cents = body.amount_cents if body.amount_cents else order["price_cents"]

    if refund_amount_cents <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be positive")
    if refund_amount_cents > order["price_cents"]:
        raise HTTPException(status_code=400, detail="Refund amount exceeds order price")

    # Calculate shard clawback
    shards_credited = order.get("shards_credited") or 0
    shards_to_debit = calculate_refund_shards(
        shards_credited=shards_credited,
        price_cents=order["price_cents"],
        refund_amount_cents=refund_amount_cents,
    )

    # Create Stripe refund
    try:
        stripe_refund = stripe.Refund.create(
            charge=order["stripe_charge_id"],
            amount=refund_amount_cents,
            reason="requested_by_customer",
            metadata={
                "order_id": str(body.order_id),
                "admin_email": admin_email,
                "reason": body.reason,
            },
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe refund failed: {str(e)}")

    # Debit shards from player
    if shards_to_debit > 0:
        try:
            debit_shards(
                player_id=order["player_id"],
                amount=shards_to_debit,
                source_type="refund",
                source_id=order["id"],
                description=f"Refund clawback for order {order['id']}: {body.reason}",
                session=session,
            )
        except ValueError as e:
            logger.warning("Could not debit shards for refund on order %s: %s", body.order_id, e)

    # Update payment order
    is_full = refund_amount_cents >= order["price_cents"]
    new_status = "refunded" if is_full else "partially_refunded"
    shards_refunded = (order.get("shards_refunded") or 0) + shards_to_debit

    session.execute(
        text(
            "UPDATE payment_orders SET status = :status, shards_refunded = :sr WHERE id = :oid"
        ),
        {"status": new_status, "sr": shards_refunded, "oid": body.order_id},
    )
    session.commit()

    # Log
    session.execute(
        text(
            "INSERT INTO activity_events (event_type, description, metadata, created_at) "
            "VALUES ('admin_refund', :desc, :meta, NOW())"
        ),
        {
            "desc": f"Admin {admin_email} refunded {refund_amount_cents} cents on order {body.order_id}",
            "meta": f'{{"order_id": {body.order_id}, "player_id": {order["player_id"]}, "amount_cents": {refund_amount_cents}, "shards_debited": {shards_to_debit}}}',
        },
    )
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="initiate_refund",
        target_type="payment_order",
        target_id=str(body.order_id),
        details={
            "player_id": order["player_id"],
            "refund_amount_cents": refund_amount_cents,
            "shards_debited": shards_to_debit,
            "stripe_refund_id": stripe_refund.id,
            "reason": body.reason,
            "full_refund": is_full,
        },
    )

    return {
        "status": "ok",
        "refund_amount_cents": refund_amount_cents,
        "shards_debited": shards_to_debit,
        "order_status": new_status,
        "stripe_refund_id": stripe_refund.id,
    }


# =============================================================================
# 12. GET /disputes — Flagged accounts
# =============================================================================

@router.get("/disputes")
async def list_disputes(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Query flagged accounts with payment details."""
    count = session.execute(
        text(
            "SELECT COUNT(*) FROM players "
            "WHERE account_flag IS NOT NULL AND account_flag != ''"
        )
    ).scalar() or 0

    rows = session.execute(
        text(
            "SELECT p.id, p.display_name, p.email, p.account_flag, p.created_at, "
            "  pmp.shard_balance, "
            "  (SELECT COUNT(*) FROM payment_orders po WHERE po.player_id = p.id AND po.status = 'completed') AS purchase_count, "
            "  (SELECT COALESCE(SUM(price_cents), 0) FROM payment_orders po WHERE po.player_id = p.id AND po.status = 'completed') AS total_spent_cents "
            "FROM players p "
            "LEFT JOIN player_meta_progression pmp ON pmp.player_id = p.id "
            "WHERE p.account_flag IS NOT NULL AND p.account_flag != '' "
            "ORDER BY p.created_at DESC "
            "LIMIT :limit OFFSET :offset"
        ),
        {"limit": page_size, "offset": (page - 1) * page_size},
    ).fetchall()

    return {
        "disputes": [dict(r._mapping) for r in rows],
        "total": count,
        "page": page,
        "page_size": page_size,
    }


# =============================================================================
# 13. POST /disputes/{player_id}/resolve — Resolve a dispute
# =============================================================================

@router.post("/disputes/{player_id}/resolve")
async def resolve_dispute(
    player_id: int,
    body: DisputeResolveRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Clear, warn, or ban a flagged player."""
    admin_email = token.get("email", "unknown")

    if body.action not in ("clear", "warn", "ban"):
        raise HTTPException(status_code=400, detail="action must be 'clear', 'warn', or 'ban'")

    # Verify player exists
    player_row = session.execute(
        text("SELECT id, account_flag FROM players WHERE id = :pid"),
        {"pid": player_id},
    ).fetchone()

    if not player_row:
        raise HTTPException(status_code=404, detail="Player not found")

    if body.action == "clear":
        session.execute(
            text("UPDATE players SET account_flag = NULL WHERE id = :pid"),
            {"pid": player_id},
        )
    elif body.action == "warn":
        # Log warning event but keep existing flag
        session.execute(
            text(
                "INSERT INTO activity_events (event_type, description, metadata, created_at) "
                "VALUES ('admin_dispute_warn', :desc, :meta, NOW())"
            ),
            {
                "desc": f"Admin {admin_email} warned player {player_id}: {body.reason}",
                "meta": f'{{"player_id": {player_id}, "reason": "{body.reason}"}}',
            },
        )
    elif body.action == "ban":
        session.execute(
            text("UPDATE players SET account_flag = 'banned' WHERE id = :pid"),
            {"pid": player_id},
        )

    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action=f"dispute_resolve_{body.action}",
        target_type="player",
        target_id=str(player_id),
        details={"action": body.action, "reason": body.reason},
    )

    return {
        "status": "ok",
        "player_id": player_id,
        "action": body.action,
        "message": f"Dispute for player {player_id} resolved with action: {body.action}",
    }


# =============================================================================
# 14. GET /disputes/{player_id}/investigate — Full financial history
# =============================================================================

@router.get("/disputes/{player_id}/investigate")
async def investigate_player(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Full financial history: purchases, shard log, trades, subscriptions, donations, flags."""
    # Player info
    player_row = session.execute(
        text(
            "SELECT id, display_name, email, account_flag, created_at "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player_id},
    ).fetchone()

    if not player_row:
        raise HTTPException(status_code=404, detail="Player not found")

    # Purchases
    purchases = session.execute(
        text(
            "SELECT id, package_id, price_cents, shards_credited, shards_refunded, status, order_type, "
            "  is_first_purchase, created_at, completed_at "
            "FROM payment_orders WHERE player_id = :pid ORDER BY created_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()

    # Shard log (recent 50)
    shard_log = session.execute(
        text(
            "SELECT id, amount, balance_after, source_type, source_id, description, created_at "
            "FROM shard_transactions WHERE player_id = :pid ORDER BY created_at DESC LIMIT 50"
        ),
        {"pid": player_id},
    ).fetchall()

    # Marketplace trades
    trades = session.execute(
        text(
            "SELECT id, listing_id, buyer_id, seller_id, item_name, price_shards, tax_shards, "
            "  seller_proceeds, traded_at "
            "FROM marketplace_trades "
            "WHERE buyer_id = :pid OR seller_id = :pid "
            "ORDER BY traded_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()

    # Subscriptions
    subscriptions = session.execute(
        text(
            "SELECT id, plan_id, status, price_cents, cancel_at_period_end, "
            "  current_period_start, current_period_end, created_at "
            "FROM player_subscriptions WHERE player_id = :pid ORDER BY created_at DESC"
        ),
        {"pid": player_id},
    ).fetchall()

    # Donations
    donations = session.execute(
        text(
            "SELECT id, amount_cents, tier, status, donor_name, message, created_at "
            "FROM donations WHERE player_id = :pid ORDER BY created_at DESC LIMIT 100"
        ),
        {"pid": player_id},
    ).fetchall()

    # Admin shard adjustments
    adjustments = session.execute(
        text(
            "SELECT id, admin_email, adjust_type, amount, reason, balance_before, balance_after, created_at "
            "FROM admin_shard_adjustments WHERE player_id = :pid ORDER BY created_at DESC LIMIT 50"
        ),
        {"pid": player_id},
    ).fetchall()

    return {
        "player": dict(player_row._mapping),
        "purchases": [dict(r._mapping) for r in purchases],
        "shard_log": [dict(r._mapping) for r in shard_log],
        "trades": [dict(r._mapping) for r in trades],
        "subscriptions": [dict(r._mapping) for r in subscriptions],
        "donations": [dict(r._mapping) for r in donations],
        "admin_adjustments": [dict(r._mapping) for r in adjustments],
    }


# =============================================================================
# 15. GET /marketplace-anomalies — Marketplace anomaly detection
# =============================================================================

@router.get("/marketplace-anomalies")
async def marketplace_anomalies(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Detect high-price listings, rapid relists, and wash trade suspicion."""
    return detect_marketplace_anomalies(session)


@router.get("/alt-warnings")
async def get_alt_warnings(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List recent marketplace alt account warnings (shared Stripe customer ID)."""
    rows = session.execute(
        text(
            "SELECT ae.id, ae.player_id, ae.event_data, ae.created_at "
            "FROM activity_events ae "
            "WHERE ae.event_type = 'marketplace_alt_warning' "
            "ORDER BY ae.created_at DESC LIMIT 100"
        )
    ).fetchall()
    return {
        "warnings": [
            {
                "id": r.id,
                "player_id": r.player_id,
                "event_data": r.event_data,
                "created_at": str(r.created_at),
            }
            for r in rows
        ]
    }
