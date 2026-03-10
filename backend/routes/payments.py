"""Player-facing payment endpoints: checkout, packages, status, transactions."""

import os
import uuid
import time
import math
import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select
from sqlalchemy import text, func

from db import get_session
from auth import get_current_player
from models import PlayerMetaProgression, GameConfig
from models.payments import ShardPackage, PaymentOrder
from models.home_base import ShardTransaction
from services.payment_service import get_or_create_stripe_customer

import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


# =============================================================================
# Request / Response Models
# =============================================================================

class CheckoutRequest(BaseModel):
    package_id: int


# =============================================================================
# POST /api/payments/checkout
# =============================================================================

@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check account_flag for disputes
    result = session.execute(
        text("SELECT account_flag FROM players WHERE id = :pid"),
        {"pid": player.id},
    )
    row = result.fetchone()
    if row and row[0] == "dispute":
        raise HTTPException(status_code=403, detail="Account has an active dispute")

    # Validate package
    package = session.get(ShardPackage, body.package_id)
    if not package or not package.is_active:
        raise HTTPException(status_code=400, detail="Package not found or inactive")

    # Check per-player purchase cap
    if package.max_purchases_per_player is not None:
        completed_count = session.exec(
            select(func.count(PaymentOrder.id)).where(
                PaymentOrder.player_id == player.id,
                PaymentOrder.package_id == package.id,
                PaymentOrder.status == "completed",
            )
        ).one()
        if completed_count >= package.max_purchases_per_player:
            raise HTTPException(
                status_code=400,
                detail="Maximum purchases reached for this package",
            )

    # Get or create Stripe customer
    stripe_customer_id = get_or_create_stripe_customer(player.id, session)

    # Create payment order
    idempotency_key = str(uuid.uuid4())
    order = PaymentOrder(
        player_id=player.id,
        package_id=package.id,
        status="pending",
        price_cents=package.price_cents,
        idempotency_key=idempotency_key,
    )
    session.add(order)
    session.flush()

    # Create Stripe Checkout Session
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    checkout_session = stripe.checkout.Session.create(
        mode="payment",
        customer=stripe_customer_id,
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": package.price_cents,
                "product_data": {"name": package.name},
            },
            "quantity": 1,
        }],
        metadata={
            "player_id": str(player.id),
            "package_id": str(package.id),
            "payment_order_id": str(order.id),
            "idempotency_key": str(order.idempotency_key),
        },
        success_url=f"{frontend_url}/shop?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/shop",
        expires_at=int(time.time()) + 1800,
    )

    # Update order with Stripe session ID
    order.stripe_checkout_session_id = checkout_session.id
    session.add(order)
    session.commit()

    return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}


# =============================================================================
# GET /api/payments/packages
# =============================================================================

@router.get("/packages")
async def get_packages(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Active packages ordered by sort_order
    packages = session.exec(
        select(ShardPackage)
        .where(ShardPackage.is_active == True)
        .order_by(ShardPackage.sort_order)
    ).all()

    # Player flags via raw SQL
    result = session.execute(
        text(
            "SELECT first_purchase_claimed, account_flag "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player.id},
    )
    player_row = result.fetchone()
    first_purchase_claimed = player_row[0] if player_row else False
    account_flag = player_row[1] if player_row else None

    # Shard balance
    meta = session.exec(
        select(PlayerMetaProgression)
        .where(PlayerMetaProgression.player_id == player.id)
    ).first()
    current_balance = meta.shard_balance if meta else 0

    # Build response
    result = []
    for pkg in packages:
        item = {
            "id": pkg.id,
            "tier_key": pkg.tier_key,
            "name": pkg.name,
            "price_cents": pkg.price_cents,
            "price_display": f"${pkg.price_cents / 100:.2f}",
            "base_shards": pkg.base_shards,
            "bonus_pct": pkg.bonus_pct,
            "total_shards": pkg.total_shards,
            "is_best_value": pkg.is_best_value,
            "max_purchases": pkg.max_purchases_per_player,
            "purchases_remaining": None,
        }

        if pkg.max_purchases_per_player is not None:
            completed_count = session.exec(
                select(func.count(PaymentOrder.id)).where(
                    PaymentOrder.player_id == player.id,
                    PaymentOrder.package_id == pkg.id,
                    PaymentOrder.status == "completed",
                )
            ).one()
            item["purchases_remaining"] = max(
                0, pkg.max_purchases_per_player - completed_count
            )

        result.append(item)

    return {
        "packages": result,
        "first_purchase_available": not first_purchase_claimed,
        "current_balance": current_balance,
        "has_active_dispute": account_flag == "dispute",
    }


# =============================================================================
# GET /api/payments/status/{session_id}
# =============================================================================

@router.get("/status/{session_id}")
async def get_payment_status(
    session_id: str,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    order = session.exec(
        select(PaymentOrder).where(
            PaymentOrder.stripe_checkout_session_id == session_id,
            PaymentOrder.player_id == player.id,
        )
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Payment not found")

    new_balance = None
    if order.status == "completed":
        meta = session.exec(
            select(PlayerMetaProgression)
            .where(PlayerMetaProgression.player_id == player.id)
        ).first()
        new_balance = meta.shard_balance if meta else None

    return {
        "status": order.status,
        "shards_credited": order.shards_credited,
        "new_balance": new_balance,
    }


# =============================================================================
# GET /api/payments/transactions
# =============================================================================

@router.get("/transactions")
async def get_transactions(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    source_type: str | None = Query(default=None),
):
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Refund eligibility window from game_configs
    config = session.get(GameConfig, "refund_eligible_days")
    refund_days = int(config.value_json) if config else 14
    refund_cutoff = datetime.now(timezone.utc) - timedelta(days=refund_days)

    # Base query
    query = select(ShardTransaction).where(
        ShardTransaction.player_id == player.id
    )
    if source_type:
        query = query.where(ShardTransaction.source_type == source_type)
    query = query.order_by(ShardTransaction.created_at.desc())

    # Total count for pagination
    count_query = select(func.count(ShardTransaction.id)).where(
        ShardTransaction.player_id == player.id
    )
    if source_type:
        count_query = count_query.where(
            ShardTransaction.source_type == source_type
        )
    total = session.exec(count_query).one()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    # Paginate
    offset = (page - 1) * page_size
    transactions = session.exec(query.offset(offset).limit(page_size)).all()

    # Build response
    items = []
    for txn in transactions:
        item = {
            "id": txn.id,
            "amount": txn.amount,
            "balance_after": txn.balance_after,
            "source_type": txn.source_type,
            "source_id": txn.source_id,
            "description": txn.description,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
            "refund_eligible": False,
            "refund_max_cents": None,
            "refund_max_shards": None,
        }

        # Check refund eligibility for purchase transactions
        if txn.source_type == "purchase" and txn.source_id:
            order = session.get(PaymentOrder, txn.source_id)
            if order and order.status == "completed":
                within_window = (
                    order.completed_at is not None
                    and order.completed_at >= refund_cutoff
                )
                unrefunded_shards = order.shards_credited - order.shards_refunded
                if within_window and unrefunded_shards > 0:
                    item["refund_eligible"] = True
                    item["refund_max_shards"] = unrefunded_shards
                    # Pro-rate cents based on shards remaining
                    if order.shards_credited > 0:
                        item["refund_max_cents"] = math.floor(
                            order.price_cents
                            * (unrefunded_shards / order.shards_credited)
                        )

        items.append(item)

    return {
        "transactions": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }
