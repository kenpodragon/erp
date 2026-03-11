"""Stripe webhook handler. Signature-verified, no Firebase auth."""

import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlmodel import Session, select
from sqlalchemy import text

import stripe

from db import get_session
from models import ActivityEvent
from models.payments import PaymentOrder, StripeWebhookEvent
from services.payment_service import (
    credit_shards, debit_shards, calculate_refund_shards
)
from services.subscription_service import (
    get_subscription_by_stripe_id,
    get_active_subscription,
    activate_subscription,
    renew_subscription,
    expire_subscription,
    mark_past_due,
    refund_subscription,
)

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


# =============================================================================
# Main Webhook Endpoint
# =============================================================================

@router.post("/stripe")
async def stripe_webhook(request: Request, session: Session = Depends(get_session)):
    """
    Receive and process Stripe webhook events.
    Signature-verified via STRIPE_WEBHOOK_SECRET — no Firebase auth required.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    # -- Verify signature --
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    stripe_event_id = event["id"]
    event_type = event["type"]

    # -- Log event to stripe_webhook_events (dedup key: stripe_event_id) --
    existing = session.exec(
        select(StripeWebhookEvent).where(
            StripeWebhookEvent.stripe_event_id == stripe_event_id
        )
    ).first()

    if existing and existing.processed:
        logger.info("Duplicate event %s already processed, skipping", stripe_event_id)
        return {"status": "already_processed"}

    if not existing:
        webhook_event = StripeWebhookEvent(
            stripe_event_id=stripe_event_id,
            event_type=event_type,
            payload=event.get("data", {}),
            processed=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add(webhook_event)
        session.flush()
    else:
        webhook_event = existing

    # -- Route by event type --
    handler_map = {
        "checkout.session.completed": _handle_checkout_completed,
        "checkout.session.expired": _handle_checkout_expired,
        "charge.refunded": _handle_charge_refunded,
        "charge.dispute.created": _handle_dispute_created,
        "charge.dispute.closed": _handle_dispute_closed,
        "invoice.paid": _handle_invoice_paid,
        "invoice.payment_failed": _handle_invoice_payment_failed,
        "customer.subscription.updated": _handle_subscription_updated,
        "customer.subscription.deleted": _handle_subscription_deleted,
    }

    handler = handler_map.get(event_type)
    if handler:
        try:
            handler(event, session)
        except Exception as exc:
            logger.exception(
                "Error processing event %s (%s): %s",
                stripe_event_id, event_type, exc,
            )
            webhook_event.processing_error = str(exc)[:500]
            session.add(webhook_event)
            session.commit()
            # Return 200 so Stripe doesn't retry
            return {"status": "error", "detail": "Processing failed"}
    else:
        logger.info("Unhandled event type %s, skipping", event_type)

    # -- Mark processed --
    webhook_event.processed = True
    webhook_event.processed_at = datetime.now(timezone.utc)
    session.add(webhook_event)
    session.commit()

    return {"status": "ok"}


# =============================================================================
# Event Handlers
# =============================================================================

def _handle_checkout_completed(event: dict, session: Session) -> None:
    """Checkout session completed — route by mode (payment vs subscription)."""
    session_obj = event["data"]["object"]
    mode = session_obj.get("mode", "payment")

    if mode == "subscription":
        _handle_checkout_completed_subscription(session_obj, session)
    else:
        _handle_checkout_completed_payment(session_obj, session)


def _handle_checkout_completed_payment(session_obj: dict, session: Session) -> None:
    """Payment-mode checkout: credit shards (existing 3.1 flow)."""
    metadata = session_obj.get("metadata", {})
    payment_order_id = metadata.get("payment_order_id")

    if not payment_order_id:
        logger.error("checkout.session.completed (payment) missing payment_order_id in metadata")
        return

    order = session.get(PaymentOrder, int(payment_order_id))
    if not order:
        logger.error("PaymentOrder %s not found for checkout.session.completed", payment_order_id)
        return

    # Store Stripe IDs
    pi_id = session_obj.get("payment_intent")
    order.stripe_payment_intent_id = pi_id

    if pi_id:
        try:
            pi = stripe.PaymentIntent.retrieve(pi_id)
            order.stripe_charge_id = pi.get("latest_charge")
        except Exception as exc:
            logger.warning("Could not retrieve PaymentIntent %s: %s", pi_id, exc)

    session.add(order)
    session.flush()

    # Credit shards
    credit_shards(order.id, session)

    logger.info(
        "checkout.session.completed (payment) processed: order=%s player=%s shards=%s",
        order.id, order.player_id, order.shards_credited,
    )


def _handle_checkout_completed_subscription(session_obj: dict, session: Session) -> None:
    """Subscription-mode checkout: activate subscription record, set is_ascendant."""
    metadata = session_obj.get("metadata", {})
    player_id_str = metadata.get("player_id")
    plan_key = metadata.get("plan_key")
    stripe_sub_id = session_obj.get("subscription")

    if not player_id_str or not plan_key:
        logger.error("checkout.session.completed (subscription) missing metadata")
        return

    player_id = int(player_id_str)

    # Avoid duplicate activation
    existing = get_active_subscription(player_id, session)
    if existing:
        logger.info("Player %s already has active subscription %s, skipping", player_id, existing.id)
        return

    # Get subscription details from Stripe
    stripe_price_id = None
    period_start = datetime.now(timezone.utc)
    period_end = datetime.now(timezone.utc)
    if stripe_sub_id:
        try:
            stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
            stripe_price_id = stripe_sub["items"]["data"][0]["price"]["id"] if stripe_sub.get("items") else None
            period_start = datetime.fromtimestamp(stripe_sub["current_period_start"], tz=timezone.utc)
            period_end = datetime.fromtimestamp(stripe_sub["current_period_end"], tz=timezone.utc)
        except Exception as exc:
            logger.warning("Could not retrieve Stripe subscription %s: %s", stripe_sub_id, exc)

    activate_subscription(
        player_id=player_id,
        stripe_subscription_id=stripe_sub_id,
        stripe_price_id=stripe_price_id,
        plan_key=plan_key,
        period_start=period_start,
        period_end=period_end,
        source="stripe",
        db=session,
    )

    logger.info(
        "checkout.session.completed (subscription) processed: player=%s plan=%s stripe_sub=%s",
        player_id, plan_key, stripe_sub_id,
    )


def _handle_checkout_expired(event: dict, session: Session) -> None:
    """Checkout session expired — mark order as expired."""
    session_obj = event["data"]["object"]
    checkout_session_id = session_obj.get("id")

    order = session.exec(
        select(PaymentOrder).where(
            PaymentOrder.stripe_checkout_session_id == checkout_session_id
        )
    ).first()

    if not order:
        logger.warning("No PaymentOrder found for expired checkout session %s", checkout_session_id)
        return

    order.status = "expired"
    order.expired_at = datetime.now(timezone.utc)
    session.add(order)

    logger.info("checkout.session.expired processed: order=%s", order.id)


def _handle_charge_refunded(event: dict, session: Session) -> None:
    """Charge refunded — debit proportional shards from the player."""
    charge = event["data"]["object"]
    charge_id = charge.get("id")
    pi_id = charge.get("payment_intent")

    # Look up order by charge_id first, fall back to payment_intent
    order = None
    if charge_id:
        order = session.exec(
            select(PaymentOrder).where(PaymentOrder.stripe_charge_id == charge_id)
        ).first()
    if not order and pi_id:
        order = session.exec(
            select(PaymentOrder).where(PaymentOrder.stripe_payment_intent_id == pi_id)
        ).first()

    if not order:
        logger.error(
            "No PaymentOrder found for refunded charge %s / pi %s",
            charge_id, pi_id,
        )
        return

    # Stripe sends cumulative amount_refunded on the charge
    amount_refunded = charge.get("amount_refunded", 0)
    total_refund_shards = calculate_refund_shards(
        order.shards_credited, order.price_cents, amount_refunded
    )
    new_refund_shards = total_refund_shards - order.shards_refunded

    if new_refund_shards <= 0:
        logger.info("No new shards to debit for order %s (already refunded %s)", order.id, order.shards_refunded)
        return

    debit_shards(
        player_id=order.player_id,
        amount=new_refund_shards,
        source_type="refund",
        source_id=order.id,
        description=f"Refund for order #{order.id} (charge {charge_id})",
        session=session,
    )

    order.shards_refunded += new_refund_shards
    if not order.refunded_at:
        order.refunded_at = datetime.now(timezone.utc)
    if order.shards_refunded >= order.shards_credited:
        order.status = "refunded"
    session.add(order)

    logger.info(
        "charge.refunded processed: order=%s debited=%s total_refunded=%s",
        order.id, new_refund_shards, order.shards_refunded,
    )


def _handle_dispute_created(event: dict, session: Session) -> None:
    """Dispute opened — debit remaining shards and flag the player."""
    dispute = event["data"]["object"]
    charge_id = dispute.get("charge")

    order = session.exec(
        select(PaymentOrder).where(PaymentOrder.stripe_charge_id == charge_id)
    ).first()

    if not order:
        logger.error("No PaymentOrder found for disputed charge %s", charge_id)
        return

    remaining_shards = order.shards_credited - order.shards_refunded
    if remaining_shards > 0:
        debit_shards(
            player_id=order.player_id,
            amount=remaining_shards,
            source_type="dispute",
            source_id=order.id,
            description=f"Dispute debit for order #{order.id} (charge {charge_id})",
            session=session,
        )
        order.shards_refunded = order.shards_credited

    order.status = "disputed"
    session.add(order)

    # Flag the player account
    session.execute(
        text("UPDATE players SET account_flag = 'dispute' WHERE id = :pid"),
        {"pid": order.player_id},
    )

    # Log activity event
    activity = ActivityEvent(
        player_id=order.player_id,
        event_type="payment_dispute",
        event_data={"action": "dispute_created", "order_id": order.id, "charge_id": charge_id},
        created_at=datetime.now(timezone.utc),
    )
    session.add(activity)

    logger.info(
        "charge.dispute.created processed: order=%s player=%s debited=%s",
        order.id, order.player_id, remaining_shards,
    )


def _handle_dispute_closed(event: dict, session: Session) -> None:
    """Dispute resolved — re-credit if won, log escalation if lost."""
    dispute = event["data"]["object"]
    charge_id = dispute.get("charge")
    dispute_status = dispute.get("status")

    order = session.exec(
        select(PaymentOrder).where(PaymentOrder.stripe_charge_id == charge_id)
    ).first()

    if not order:
        logger.error("No PaymentOrder found for dispute-closed charge %s", charge_id)
        return

    if dispute_status == "won":
        # Merchant won — re-credit the shards that were debited during dispute.
        # During dispute_created, we debited (shards_credited - prior_refunds) and
        # set shards_refunded = shards_credited. Restore that delta.
        shards_to_restore = order.shards_credited - (order.shards_refunded - order.shards_credited)
        if shards_to_restore <= 0:
            shards_to_restore = order.shards_credited
        order.shards_refunded = 0
        order.status = "completed"
        session.add(order)

        # Re-credit via debit_shards with negative amount (credit)
        from models import PlayerMetaProgression
        from models.home_base import ShardTransaction
        meta = session.get(PlayerMetaProgression, order.player_id)
        if meta:
            meta.shard_balance += shards_to_restore
            meta.updated_at = datetime.now(timezone.utc)
            session.add(meta)
            txn = ShardTransaction(
                player_id=order.player_id,
                amount=shards_to_restore,
                balance_after=meta.shard_balance,
                source_type="dispute_reversal",
                source_id=order.id,
                description=f"Dispute won — restored shards for order #{order.id}",
                created_at=datetime.now(timezone.utc),
            )
            session.add(txn)

        # Clear account flag
        session.execute(
            text("UPDATE players SET account_flag = NULL WHERE id = :pid"),
            {"pid": order.player_id},
        )

        activity = ActivityEvent(
            player_id=order.player_id,
            event_type="payment_dispute",
            event_data={"action": "dispute_won", "order_id": order.id, "charge_id": charge_id},
            created_at=datetime.now(timezone.utc),
        )
        session.add(activity)

        logger.info("charge.dispute.closed (won): order=%s player=%s re-credited", order.id, order.player_id)

    elif dispute_status == "lost":
        # Merchant lost — keep debit, log for escalation
        activity = ActivityEvent(
            player_id=order.player_id,
            event_type="payment_dispute",
            event_data={"action": "dispute_lost", "order_id": order.id, "charge_id": charge_id},
            created_at=datetime.now(timezone.utc),
        )
        session.add(activity)

        logger.warning("charge.dispute.closed (lost): order=%s player=%s — escalation needed", order.id, order.player_id)

    else:
        logger.info("charge.dispute.closed with status=%s for order=%s, no action taken", dispute_status, order.id)


# =============================================================================
# Subscription Webhook Handlers (3.2)
# =============================================================================

def _handle_invoice_paid(event: dict, session: Session) -> None:
    """invoice.paid — renew subscription, increment streak, credit stipend."""
    invoice = event["data"]["object"]
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        logger.info("invoice.paid without subscription ID, skipping (one-off payment)")
        return

    sub = get_subscription_by_stripe_id(stripe_sub_id, session)
    if not sub:
        # May arrive before checkout.session.completed — log and skip
        logger.warning("invoice.paid: no subscription row for %s, skipping", stripe_sub_id)
        return

    # Extract period from invoice lines
    period_start = datetime.now(timezone.utc)
    period_end = datetime.now(timezone.utc)
    lines = invoice.get("lines", {}).get("data", [])
    if lines:
        period_start = datetime.fromtimestamp(lines[0].get("period", {}).get("start", 0), tz=timezone.utc)
        period_end = datetime.fromtimestamp(lines[0].get("period", {}).get("end", 0), tz=timezone.utc)

    stripe_invoice_id = invoice.get("id")

    renew_subscription(
        sub=sub,
        new_period_start=period_start,
        new_period_end=period_end,
        stripe_invoice_id=stripe_invoice_id,
        db=session,
    )

    logger.info("invoice.paid processed: sub=%s player=%s streak=%s", sub.id, sub.player_id, sub.continuous_streak)


def _handle_invoice_payment_failed(event: dict, session: Session) -> None:
    """invoice.payment_failed — mark past_due, start grace period."""
    invoice = event["data"]["object"]
    stripe_sub_id = invoice.get("subscription")
    if not stripe_sub_id:
        return

    sub = get_subscription_by_stripe_id(stripe_sub_id, session)
    if not sub:
        logger.warning("invoice.payment_failed: no subscription row for %s", stripe_sub_id)
        return

    mark_past_due(sub, session)
    logger.info("invoice.payment_failed processed: sub=%s grace_deadline=%s", sub.id, sub.grace_deadline)


def _handle_subscription_updated(event: dict, session: Session) -> None:
    """customer.subscription.updated — sync plan changes, cancellation scheduling."""
    stripe_sub_obj = event["data"]["object"]
    stripe_sub_id = stripe_sub_obj.get("id")

    sub = get_subscription_by_stripe_id(stripe_sub_id, session)
    if not sub:
        logger.warning("subscription.updated: no subscription row for %s", stripe_sub_id)
        return

    # Sync price/plan
    items = stripe_sub_obj.get("items", {}).get("data", [])
    if items:
        new_price_id = items[0].get("price", {}).get("id")
        if new_price_id and new_price_id != sub.stripe_price_id:
            sub.stripe_price_id = new_price_id
            # Determine plan_key from price
            from models.story_mode import GameConfig
            from sqlmodel import select as sql_select
            monthly_cfg = session.exec(
                sql_select(GameConfig).where(GameConfig.key == "stripe_ascendant_monthly_price_id")
            ).first()
            annual_cfg = session.exec(
                sql_select(GameConfig).where(GameConfig.key == "stripe_ascendant_annual_price_id")
            ).first()
            if monthly_cfg and new_price_id == monthly_cfg.value:
                sub.plan_key = "ascendant_monthly"
            elif annual_cfg and new_price_id == annual_cfg.value:
                sub.plan_key = "ascendant_annual"

    # Sync cancellation state
    cancel_at = stripe_sub_obj.get("cancel_at_period_end", False)
    if cancel_at and sub.status == "active":
        sub.cancel_at_period_end = True
        sub.status = "canceling"
    elif not cancel_at and sub.status == "canceling":
        sub.cancel_at_period_end = False
        sub.status = "active"

    # Sync period
    if stripe_sub_obj.get("current_period_end"):
        sub.current_period_end = datetime.fromtimestamp(
            stripe_sub_obj["current_period_end"], tz=timezone.utc
        )
    if stripe_sub_obj.get("current_period_start"):
        sub.current_period_start = datetime.fromtimestamp(
            stripe_sub_obj["current_period_start"], tz=timezone.utc
        )

    sub.updated_at = datetime.now(timezone.utc)
    session.add(sub)

    logger.info("subscription.updated processed: sub=%s plan=%s status=%s", sub.id, sub.plan_key, sub.status)


def _handle_subscription_deleted(event: dict, session: Session) -> None:
    """customer.subscription.deleted — revoke all benefits, reset streak."""
    stripe_sub_obj = event["data"]["object"]
    stripe_sub_id = stripe_sub_obj.get("id")

    sub = get_subscription_by_stripe_id(stripe_sub_id, session)
    if not sub:
        logger.warning("subscription.deleted: no subscription row for %s", stripe_sub_id)
        return

    if sub.status == "expired":
        logger.info("subscription.deleted: sub %s already expired, no-op", sub.id)
        return

    expire_subscription(sub, session)
    logger.info("subscription.deleted processed: sub=%s player=%s", sub.id, sub.player_id)
