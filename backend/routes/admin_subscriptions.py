"""Admin subscription management endpoints (3.2.3)."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import text, func

from db import get_session
from auth import get_current_player
from models.subscriptions import PlayerSubscription, SubscriptionStipendLog
from services.subscription_service import (
    activate_subscription, expire_subscription,
    get_active_subscription,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/subscriptions", tags=["admin-subscriptions"])


# =============================================================================
# Auth helper
# =============================================================================

def _require_admin(token: dict):
    """Check that the caller is an admin."""
    role = token.get("role", "")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# =============================================================================
# Request models
# =============================================================================

class GiftRequest(BaseModel):
    days: int = 30  # default 1 month


class ExtendRequest(BaseModel):
    days: int


class StreakOverrideRequest(BaseModel):
    continuous_streak: Optional[int] = None
    cumulative_months: Optional[int] = None


# =============================================================================
# GET /api/admin/subscriptions
# =============================================================================

@router.get("/")
async def list_subscriptions(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    player_id: Optional[int] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
):
    _require_admin(token)

    query = select(PlayerSubscription)
    count_query = select(func.count(PlayerSubscription.id))

    if status_filter:
        query = query.where(PlayerSubscription.status == status_filter)
        count_query = count_query.where(PlayerSubscription.status == status_filter)

    if player_id:
        query = query.where(PlayerSubscription.player_id == player_id)
        count_query = count_query.where(PlayerSubscription.player_id == player_id)

    total = session.exec(count_query).one()
    subs = session.exec(
        query.order_by(PlayerSubscription.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "subscriptions": [
            {
                "id": s.id,
                "player_id": s.player_id,
                "plan_key": s.plan_key,
                "status": s.status,
                "source": s.source,
                "continuous_streak": s.continuous_streak,
                "current_period_end": s.current_period_end.isoformat() if s.current_period_end else None,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in subs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# =============================================================================
# POST /api/admin/subscriptions/{player_id}/gift
# =============================================================================

@router.post("/{player_id}/gift")
async def gift_subscription(
    player_id: int,
    body: GiftRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)

    existing = get_active_subscription(player_id, session)
    if existing:
        raise HTTPException(status_code=400, detail="Player already has an active subscription")

    now = datetime.now(timezone.utc)
    sub = activate_subscription(
        player_id=player_id,
        stripe_subscription_id=None,
        stripe_price_id=None,
        plan_key="ascendant_monthly",
        period_start=now,
        period_end=now + timedelta(days=body.days),
        source="admin_gift",
        db=session,
    )
    session.commit()

    return {"subscription_id": sub.id, "period_end": sub.current_period_end.isoformat()}


# =============================================================================
# POST /api/admin/subscriptions/{sub_id}/extend
# =============================================================================

@router.post("/{sub_id}/extend")
async def extend_subscription(
    sub_id: int,
    body: ExtendRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)

    sub = session.get(PlayerSubscription, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub.current_period_end = sub.current_period_end + timedelta(days=body.days)
    sub.updated_at = datetime.now(timezone.utc)
    session.add(sub)
    session.commit()

    return {"subscription_id": sub.id, "new_period_end": sub.current_period_end.isoformat()}


# =============================================================================
# POST /api/admin/subscriptions/{sub_id}/force-cancel
# =============================================================================

@router.post("/{sub_id}/force-cancel")
async def force_cancel_subscription(
    sub_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)

    sub = session.get(PlayerSubscription, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.status == "expired":
        raise HTTPException(status_code=400, detail="Subscription already expired")

    expire_subscription(sub, session)
    session.commit()

    return {"subscription_id": sub.id, "status": "expired"}


# =============================================================================
# PATCH /api/admin/subscriptions/{sub_id}/streak
# =============================================================================

@router.patch("/{sub_id}/streak")
async def override_streak(
    sub_id: int,
    body: StreakOverrideRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    _require_admin(token)

    sub = session.get(PlayerSubscription, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if body.continuous_streak is not None:
        sub.continuous_streak = body.continuous_streak
        sub.updated_at = datetime.now(timezone.utc)
        session.add(sub)

    if body.cumulative_months is not None:
        session.execute(
            text("UPDATE players SET cumulative_subscription_months = :months WHERE id = :pid"),
            {"months": body.cumulative_months, "pid": sub.player_id},
        )

    session.commit()

    return {
        "subscription_id": sub.id,
        "continuous_streak": sub.continuous_streak,
        "cumulative_months": body.cumulative_months,
    }
