"""Stripe payment business logic: shard crediting, refunds, balance integrity."""

import math
import os
import logging
from datetime import datetime, timezone

import stripe
from sqlmodel import Session, select
from sqlalchemy import text, func

from models import GameConfig, PlayerMetaProgression
from models.payments import ShardPackage, PaymentOrder
from models.home_base import ShardTransaction

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stripe initialisation (dotenv already loaded by db.py at import time)
# ---------------------------------------------------------------------------
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_player_row(session: Session, player_id: int):
    """Read Player columns (including migration-049 additions) via raw SQL."""
    result = session.execute(
        text(
            "SELECT stripe_customer_id, first_purchase_claimed, account_flag, "
            "email, firebase_uid "
            "FROM players WHERE id = :pid"
        ),
        {"pid": player_id},
    )
    return result.fetchone()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_or_create_stripe_customer(player_id: int, session: Session) -> str:
    """Return the Stripe customer ID for a player, creating one if needed."""
    row = _get_player_row(session, player_id)
    if row is None:
        raise ValueError(f"Player {player_id} not found")

    stripe_customer_id = row.stripe_customer_id
    if stripe_customer_id:
        return stripe_customer_id

    # Create a new Stripe customer
    customer = stripe.Customer.create(
        email=row.email,
        metadata={
            "player_id": str(player_id),
            "firebase_uid": row.firebase_uid,
        },
    )

    session.execute(
        text("UPDATE players SET stripe_customer_id = :cid WHERE id = :pid"),
        {"cid": customer.id, "pid": player_id},
    )
    session.commit()
    logger.info("Created Stripe customer %s for player %s", customer.id, player_id)
    return customer.id


def credit_shards(payment_order_id: int, session: Session) -> bool:
    """Credit shards for a completed payment order.

    Idempotent: returns False if shards have already been credited.
    Returns True on successful credit.
    """
    order = session.get(PaymentOrder, payment_order_id)
    if order is None:
        raise ValueError(f"PaymentOrder {payment_order_id} not found")

    if order.status == "completed":
        logger.info("Order %s already completed — skipping credit", payment_order_id)
        return False

    package = session.get(ShardPackage, order.package_id)
    if package is None:
        raise ValueError(f"ShardPackage {order.package_id} not found")

    # Check first-purchase bonus
    player_row = _get_player_row(session, order.player_id)
    if player_row is None:
        raise ValueError(f"Player {order.player_id} not found")

    is_first = not player_row.first_purchase_claimed
    total = package.total_shards * 2 if is_first else package.total_shards

    # Update shard balance on PlayerMetaProgression
    meta = session.get(PlayerMetaProgression, order.player_id)
    if meta is None:
        raise ValueError(f"PlayerMetaProgression not found for player {order.player_id}")

    meta.shard_balance += total
    meta.total_shards_earned += total
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    # Audit trail
    txn = ShardTransaction(
        player_id=order.player_id,
        amount=total,
        balance_after=meta.shard_balance,
        source_type="purchase",
        source_id=order.id,
        description=f"Purchased {package.name}" + (" (2x first-purchase bonus)" if is_first else ""),
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)

    # Finalise order
    order.status = "completed"
    order.shards_credited = total
    order.completed_at = datetime.now(timezone.utc)
    order.is_first_purchase = is_first
    session.add(order)

    # Mark first purchase on the player row (raw SQL for migration-049 column)
    if is_first:
        session.execute(
            text("UPDATE players SET first_purchase_claimed = TRUE WHERE id = :pid"),
            {"pid": order.player_id},
        )

    session.commit()
    logger.info(
        "Credited %d shards to player %s (order %s, first=%s)",
        total, order.player_id, payment_order_id, is_first,
    )
    return True


def debit_shards(
    player_id: int,
    amount: int,
    source_type: str,
    source_id: int,
    description: str,
    session: Session,
) -> None:
    """Debit shards from a player's balance.

    Balance CAN go negative (server-authoritative correction later).
    """
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise ValueError(f"PlayerMetaProgression not found for player {player_id}")

    meta.shard_balance -= amount
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    txn = ShardTransaction(
        player_id=player_id,
        amount=-amount,
        balance_after=meta.shard_balance,
        source_type=source_type,
        source_id=source_id,
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)
    session.commit()
    logger.info("Debited %d shards from player %s (%s)", amount, player_id, source_type)


def credit_shards_direct(
    player_id: int,
    amount: int,
    source_type: str,
    source_id: int,
    description: str,
    session: Session,
) -> None:
    """Credit shards directly (not tied to a PaymentOrder).

    Used for admin refunds, promotional grants, etc.
    """
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise ValueError(f"PlayerMetaProgression not found for player {player_id}")

    meta.shard_balance += amount
    meta.total_shards_earned += amount
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    txn = ShardTransaction(
        player_id=player_id,
        amount=amount,
        balance_after=meta.shard_balance,
        source_type=source_type,
        source_id=source_id,
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)
    session.commit()
    logger.info("Credited %d shards to player %s (%s)", amount, player_id, source_type)


def _debit_shards_internal(
    player_id: int,
    amount: int,
    source_type: str,
    source_id: int,
    description: str,
    session: Session,
) -> None:
    """Same as debit_shards but flushes instead of committing.

    For use in larger transactions where the caller manages the commit
    (e.g. shop purchases that need atomic debit + ownership creation).
    """
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise ValueError(f"PlayerMetaProgression not found for player {player_id}")

    meta.shard_balance -= amount
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    txn = ShardTransaction(
        player_id=player_id,
        amount=-amount,
        balance_after=meta.shard_balance,
        source_type=source_type,
        source_id=source_id,
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)
    session.flush()
    logger.info("Debited %d shards from player %s (%s) [internal]", amount, player_id, source_type)


def _credit_shards_direct_internal(
    player_id: int,
    amount: int,
    source_type: str,
    source_id: int,
    description: str,
    session: Session,
) -> None:
    """Same as credit_shards_direct but flushes instead of committing.

    For use in larger transactions where the caller manages the commit.
    """
    meta = session.get(PlayerMetaProgression, player_id)
    if meta is None:
        raise ValueError(f"PlayerMetaProgression not found for player {player_id}")

    meta.shard_balance += amount
    meta.total_shards_earned += amount
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    txn = ShardTransaction(
        player_id=player_id,
        amount=amount,
        balance_after=meta.shard_balance,
        source_type=source_type,
        source_id=source_id,
        description=description,
        created_at=datetime.now(timezone.utc),
    )
    session.add(txn)
    session.flush()
    logger.info("Credited %d shards to player %s (%s) [internal]", amount, player_id, source_type)


def calculate_refund_shards(
    shards_credited: int,
    price_cents: int,
    refund_amount_cents: int,
) -> int:
    """Pure function: pro-rate shard clawback for a partial/full refund."""
    if price_cents <= 0:
        return 0
    return math.floor(shards_credited * refund_amount_cents / price_cents)


def check_balance_integrity(player_id: int, session: Session) -> dict:
    """Compare transaction-log sum against stored shard_balance.

    Returns {"expected": int, "actual": int, "match": bool}.
    """
    result = session.execute(
        select(func.coalesce(func.sum(ShardTransaction.amount), 0)).where(
            ShardTransaction.player_id == player_id
        )
    )
    expected = int(result.scalar_one())

    meta = session.get(PlayerMetaProgression, player_id)
    actual = meta.shard_balance if meta else 0

    return {
        "expected": expected,
        "actual": actual,
        "match": expected == actual,
    }
