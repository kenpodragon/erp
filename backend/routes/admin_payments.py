"""Admin payment reconciliation and debugging routes."""

import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import Session, select, func

import stripe

from db import get_session
from auth import get_current_admin, get_client_ip
from models import GameConfig, ActivityEvent
from models.payments import PaymentOrder, StripeWebhookEvent
from models.home_base import ShardTransaction
from services.payment_service import (
    credit_shards,
    debit_shards,
    calculate_refund_shards,
    check_balance_integrity,
)
from audit import write_audit_log

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/admin/payments", tags=["admin-payments"])


# =============================================================================
# 1. Receipt Reconciliation
# =============================================================================

@router.post("/reconcile")
async def reconcile_receipts(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Fetch recent Stripe charges and ensure all are credited."""
    config = session.get(GameConfig, "reconciliation_lookback_hours")
    lookback_hours = int(config.value_json) if config else 48

    since = int(time.time()) - (lookback_hours * 3600)
    reconciled = 0
    errors = 0

    try:
        charges = stripe.Charge.list(created={"gte": since}, limit=100)
        for charge in charges.auto_paging_iter():
            metadata = charge.get("metadata", {})
            order_id = metadata.get("payment_order_id")
            if not order_id:
                continue
            order = session.get(PaymentOrder, int(order_id))
            if order and order.status == "pending" and charge.get("paid"):
                try:
                    credit_shards(order.id, session)
                    reconciled += 1
                except Exception as e:
                    errors += 1
                    logger.error("Reconciliation error for order %s: %s", order_id, e)
    except stripe.error.StripeError as e:
        logger.error("Stripe API error during reconciliation: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    # Log activity
    activity = ActivityEvent(
        event_type="reconciliation_complete",
        event_data={
            "reconciled": reconciled,
            "errors": errors,
            "lookback_hours": lookback_hours,
        },
        created_at=datetime.now(timezone.utc),
    )
    session.add(activity)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="reconcile_receipts",
        target_type="payments",
        target_id="batch",
        details={"reconciled": reconciled, "errors": errors, "lookback_hours": lookback_hours},
        ip=get_client_ip(request),
    )

    return {"reconciled": reconciled, "errors": errors}


# =============================================================================
# 2. Refund / Dispute Polling
# =============================================================================

@router.post("/poll-refunds")
async def poll_refunds(
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Fetch recent Stripe refunds and disputes, process any unhandled ones."""
    config = session.get(GameConfig, "reconciliation_lookback_hours")
    lookback_hours = int(config.value_json) if config else 48

    since = int(time.time()) - (lookback_hours * 3600)
    refunds_processed = 0
    disputes_processed = 0
    errors = 0

    # --- Refunds ---
    try:
        refunds = stripe.Refund.list(created={"gte": since}, limit=100)
        for refund in refunds.auto_paging_iter():
            refund_event_id = f"poll_refund_{refund['id']}"

            # Skip if already recorded
            existing = session.exec(
                select(StripeWebhookEvent).where(
                    StripeWebhookEvent.stripe_event_id == refund_event_id
                )
            ).first()
            if existing:
                continue

            charge_id = refund.get("charge")
            if not charge_id:
                continue

            order = session.exec(
                select(PaymentOrder).where(PaymentOrder.stripe_charge_id == charge_id)
            ).first()
            if not order or order.status in ("refunded", "disputed"):
                continue

            try:
                # Fetch the full charge to get cumulative refund amount
                charge = stripe.Charge.retrieve(charge_id)
                amount_refunded = charge.get("amount_refunded", 0)
                total_refund_shards = calculate_refund_shards(
                    order.shards_credited, order.price_cents, amount_refunded,
                )
                new_refund_shards = total_refund_shards - order.shards_refunded

                if new_refund_shards > 0:
                    debit_shards(
                        player_id=order.player_id,
                        amount=new_refund_shards,
                        source_type="refund",
                        source_id=order.id,
                        description=f"Polled refund for order #{order.id} (charge {charge_id})",
                        session=session,
                    )
                    order.shards_refunded += new_refund_shards
                    if not order.refunded_at:
                        order.refunded_at = datetime.now(timezone.utc)
                    if order.shards_refunded >= order.shards_credited:
                        order.status = "refunded"
                    session.add(order)

                # Record as processed
                webhook_event = StripeWebhookEvent(
                    stripe_event_id=refund_event_id,
                    event_type="charge.refunded",
                    payload={"refund_id": refund["id"], "charge_id": charge_id, "source": "poll"},
                    processed=True,
                    processed_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                )
                session.add(webhook_event)
                session.commit()
                refunds_processed += 1

            except Exception as e:
                errors += 1
                logger.error("Error processing polled refund %s: %s", refund["id"], e)

    except stripe.error.StripeError as e:
        logger.error("Stripe API error polling refunds: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    # --- Disputes ---
    try:
        disputes = stripe.Dispute.list(created={"gte": since}, limit=100)
        for dispute in disputes.auto_paging_iter():
            dispute_event_id = f"poll_dispute_{dispute['id']}"

            existing = session.exec(
                select(StripeWebhookEvent).where(
                    StripeWebhookEvent.stripe_event_id == dispute_event_id
                )
            ).first()
            if existing:
                continue

            charge_id = dispute.get("charge")
            if not charge_id:
                continue

            order = session.exec(
                select(PaymentOrder).where(PaymentOrder.stripe_charge_id == charge_id)
            ).first()
            if not order or order.status == "disputed":
                continue

            try:
                from sqlalchemy import text

                remaining_shards = order.shards_credited - order.shards_refunded
                if remaining_shards > 0:
                    debit_shards(
                        player_id=order.player_id,
                        amount=remaining_shards,
                        source_type="dispute",
                        source_id=order.id,
                        description=f"Polled dispute debit for order #{order.id} (charge {charge_id})",
                        session=session,
                    )
                    order.shards_refunded = order.shards_credited

                order.status = "disputed"
                session.add(order)

                # Flag the player
                session.execute(
                    text("UPDATE players SET account_flag = 'dispute' WHERE id = :pid"),
                    {"pid": order.player_id},
                )

                # Record as processed
                webhook_event = StripeWebhookEvent(
                    stripe_event_id=dispute_event_id,
                    event_type="charge.dispute.created",
                    payload={"dispute_id": dispute["id"], "charge_id": charge_id, "source": "poll"},
                    processed=True,
                    processed_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                )
                session.add(webhook_event)
                session.commit()
                disputes_processed += 1

            except Exception as e:
                errors += 1
                logger.error("Error processing polled dispute %s: %s", dispute["id"], e)

    except stripe.error.StripeError as e:
        logger.error("Stripe API error polling disputes: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    # Log activity
    activity = ActivityEvent(
        event_type="refund_poll_complete",
        event_data={
            "refunds_processed": refunds_processed,
            "disputes_processed": disputes_processed,
            "errors": errors,
            "lookback_hours": lookback_hours,
        },
        created_at=datetime.now(timezone.utc),
    )
    session.add(activity)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="poll_refunds",
        target_type="payments",
        target_id="batch",
        details={
            "refunds_processed": refunds_processed,
            "disputes_processed": disputes_processed,
            "errors": errors,
        },
        ip=get_client_ip(request),
    )

    return {
        "refunds_processed": refunds_processed,
        "disputes_processed": disputes_processed,
        "errors": errors,
    }


# =============================================================================
# 3. Balance Integrity Check
# =============================================================================

@router.post("/check-balances")
async def check_balances(
    request: Request,
    player_id: Optional[int] = Query(default=None, description="Check a specific player (omit for all)"),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Check shard balance integrity for one or all players with transactions."""
    mismatches = []

    if player_id:
        player_ids = [player_id]
    else:
        # All distinct players who have at least one shard transaction
        rows = session.exec(
            select(ShardTransaction.player_id).distinct()
        ).all()
        player_ids = list(rows)

    for pid in player_ids:
        result = check_balance_integrity(pid, session)
        if not result["match"]:
            mismatches.append({"player_id": pid, **result})

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="check_balances",
        target_type="payments",
        target_id=str(player_id) if player_id else "all",
        details={
            "players_checked": len(player_ids),
            "mismatches_found": len(mismatches),
        },
        ip=get_client_ip(request),
    )

    return {
        "players_checked": len(player_ids),
        "mismatches": mismatches,
    }


# =============================================================================
# 4. Webhook Event Viewer
# =============================================================================

@router.get("/webhook-events")
async def list_webhook_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    event_type: Optional[str] = Query(default=None, description="Filter by event type"),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return paginated Stripe webhook events for debugging."""
    query = select(StripeWebhookEvent)
    count_query = select(func.count()).select_from(StripeWebhookEvent)

    if event_type:
        query = query.where(StripeWebhookEvent.event_type == event_type)
        count_query = count_query.where(StripeWebhookEvent.event_type == event_type)

    total = session.exec(count_query).one()

    events = session.exec(
        query.order_by(StripeWebhookEvent.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "events": [
            {
                "id": e.id,
                "stripe_event_id": e.stripe_event_id,
                "event_type": e.event_type,
                "processed": e.processed,
                "processing_error": e.processing_error,
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "processed_at": e.processed_at.isoformat() if e.processed_at else None,
            }
            for e in events
        ],
    }
