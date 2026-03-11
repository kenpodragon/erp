"""Player-facing subscription endpoints: create, status, cancel, reactivate, switch (3.2)."""

import os
import time
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import text

from db import get_session
from auth import get_current_player
from models.subscriptions import PlayerSubscription, SubscriptionStipendLog
from models.story_mode import GameConfig
from services.subscription_service import (
    get_active_subscription,
    resolve_lazy_status,
    get_subscriber_multipliers,
    cancel_subscription,
    reactivate_subscription,
)
from services.payment_service import get_or_create_stripe_customer

import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


# =============================================================================
# Request Models
# =============================================================================

class SubscribeRequest(BaseModel):
    plan_key: str  # "ascendant_monthly" or "ascendant_annual"


class SwitchRequest(BaseModel):
    new_plan_key: str  # "ascendant_monthly" or "ascendant_annual"


# =============================================================================
# Helpers
# =============================================================================

def _get_price_id(plan_key: str, session: Session) -> str:
    """Look up the Stripe Price ID for a plan from game_configs."""
    config_key = {
        "ascendant_monthly": "stripe_ascendant_monthly_price_id",
        "ascendant_annual": "stripe_ascendant_annual_price_id",
    }.get(plan_key)
    if not config_key:
        raise HTTPException(status_code=400, detail="Invalid plan key")

    config = session.exec(
        select(GameConfig).where(GameConfig.key == config_key)
    ).first()
    val = config.value_json if config else None
    if not val:
        raise HTTPException(status_code=500, detail="Plan not configured")
    return str(val)


# =============================================================================
# POST /api/subscriptions/create
# =============================================================================

@router.post("/create")
async def create_subscription(
    body: SubscribeRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Create a Stripe Checkout Session for subscription mode."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Block if account has dispute
    result = session.execute(
        text("SELECT account_flag FROM players WHERE id = :pid"),
        {"pid": player.id},
    )
    row = result.fetchone()
    if row and row[0] == "dispute":
        raise HTTPException(status_code=403, detail="Account has an active dispute")

    # Block if already subscribed
    existing_sub = get_active_subscription(player.id, session)
    if existing_sub:
        raise HTTPException(status_code=400, detail="You already have an active subscription")

    # Validate plan and get price ID
    if body.plan_key not in ("ascendant_monthly", "ascendant_annual"):
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'ascendant_monthly' or 'ascendant_annual'")

    price_id = _get_price_id(body.plan_key, session)

    # Get or create Stripe customer
    stripe_customer_id = get_or_create_stripe_customer(player.id, session)

    # Create Stripe Checkout Session in subscription mode
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    checkout_session = stripe.checkout.Session.create(
        mode="subscription",
        customer=stripe_customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        metadata={
            "player_id": str(player.id),
            "plan_key": body.plan_key,
        },
        success_url=f"{frontend_url}/subscription?status=success",
        cancel_url=f"{frontend_url}/subscription",
        expires_at=int(time.time()) + 1800,
    )

    logger.info(
        "Created subscription checkout for player %s (plan=%s)",
        player.id, body.plan_key,
    )
    return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}


# =============================================================================
# GET /api/subscriptions/status
# =============================================================================

@router.get("/status")
async def get_subscription_status(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return current subscription state, boosts, loyalty progress, stipend info."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sub = get_active_subscription(player.id, session)
    if sub:
        resolve_lazy_status(sub, session)
        session.flush()

    # Get multipliers (also triggers lazy stipend credit)
    multipliers = get_subscriber_multipliers(player.id, session)
    session.commit()

    if not sub or sub.status == "expired":
        return {
            "subscribed": False,
            "subscription": None,
            "boosts": multipliers,
            "stipend_history": [],
        }

    # Build stipend history
    stipends = session.exec(
        select(SubscriptionStipendLog)
        .where(SubscriptionStipendLog.subscription_id == sub.id)
        .order_by(SubscriptionStipendLog.created_at.desc())
        .limit(12)
    ).all()

    return {
        "subscribed": True,
        "subscription": {
            "id": sub.id,
            "plan_key": sub.plan_key,
            "status": sub.status,
            "source": sub.source,
            "subscription_start_date": sub.subscription_start_date.isoformat() if sub.subscription_start_date else None,
            "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
            "cancel_at_period_end": sub.cancel_at_period_end,
            "continuous_streak": sub.continuous_streak,
            "grace_deadline": sub.grace_deadline.isoformat() if sub.grace_deadline else None,
        },
        "boosts": multipliers,
        "stipend_history": [
            {
                "period_key": s.period_key,
                "shards_credited": s.shards_credited,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in stipends
        ],
    }


# =============================================================================
# POST /api/subscriptions/cancel
# =============================================================================

@router.post("/cancel")
async def cancel_subscription_endpoint(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Cancel subscription at end of current period."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sub = get_active_subscription(player.id, session)
    if not sub:
        raise HTTPException(status_code=400, detail="No active subscription")

    if sub.status == "canceling":
        raise HTTPException(status_code=400, detail="Subscription is already being canceled")

    # Cancel in Stripe (end of period)
    if sub.stripe_subscription_id:
        try:
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                cancel_at_period_end=True,
            )
        except stripe.error.StripeError as e:
            logger.error("Stripe cancel failed: %s", e)
            raise HTTPException(status_code=502, detail="Payment provider error")

    cancel_subscription(sub, session)
    session.commit()

    return {
        "status": "canceling",
        "period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "message": "Your subscription will remain active until the end of your current billing period.",
    }


# =============================================================================
# POST /api/subscriptions/reactivate
# =============================================================================

@router.post("/reactivate")
async def reactivate_subscription_endpoint(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Un-cancel a subscription that hasn't reached period end."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sub = get_active_subscription(player.id, session)
    if not sub:
        raise HTTPException(status_code=400, detail="No active subscription")

    if sub.status != "canceling":
        raise HTTPException(status_code=400, detail="Subscription is not in canceling state")

    # Check if still within period
    now = datetime.now(timezone.utc)
    period_end = sub.current_period_end
    if period_end:
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)
        if now > period_end:
            raise HTTPException(status_code=400, detail="Subscription period has already ended")

    # Reactivate in Stripe
    if sub.stripe_subscription_id:
        try:
            stripe.Subscription.modify(
                sub.stripe_subscription_id,
                cancel_at_period_end=False,
            )
        except stripe.error.StripeError as e:
            logger.error("Stripe reactivate failed: %s", e)
            raise HTTPException(status_code=502, detail="Payment provider error")

    reactivate_subscription(sub, session)
    session.commit()

    return {
        "status": "active",
        "message": "Your subscription has been reactivated.",
    }


# =============================================================================
# POST /api/subscriptions/switch
# =============================================================================

@router.post("/switch")
async def switch_plan(
    body: SwitchRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Switch between monthly and annual plans with proration."""
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sub = get_active_subscription(player.id, session)
    if not sub:
        raise HTTPException(status_code=400, detail="No active subscription")

    if sub.plan_key == body.new_plan_key:
        raise HTTPException(status_code=400, detail="Already on this plan")

    if body.new_plan_key not in ("ascendant_monthly", "ascendant_annual"):
        raise HTTPException(status_code=400, detail="Invalid plan key")

    new_price_id = _get_price_id(body.new_plan_key, session)

    if not sub.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="Cannot switch a gifted subscription")

    # Update subscription in Stripe with proration
    try:
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[{
                "id": stripe_sub["items"]["data"][0]["id"],
                "price": new_price_id,
            }],
            proration_behavior="create_prorations",
        )
    except stripe.error.StripeError as e:
        logger.error("Stripe plan switch failed: %s", e)
        raise HTTPException(status_code=502, detail="Payment provider error")

    # Update local record
    sub.plan_key = body.new_plan_key
    sub.stripe_price_id = new_price_id
    sub.updated_at = datetime.now(timezone.utc)
    # Clear cancellation if switching
    if sub.cancel_at_period_end:
        sub.cancel_at_period_end = False
        sub.status = "active"
    session.add(sub)
    session.commit()

    return {
        "status": "active",
        "plan_key": body.new_plan_key,
        "message": f"Switched to {body.new_plan_key}. Proration applied.",
    }
