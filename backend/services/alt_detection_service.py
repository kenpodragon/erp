"""Alt account detection for marketplace trades (REC 3.5 §11.3).

Checks if buyer and seller share the same Stripe customer ID, which
indicates they may be alt accounts controlled by the same person.
Logs warnings to activity_events for admin review — does NOT block trades.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlmodel import Session

logger = logging.getLogger(__name__)


def check_shared_stripe_customer(
    buyer_id: int,
    seller_id: int,
    session: Session,
) -> Optional[str]:
    """Check if buyer and seller share the same stripe_customer_id.

    Returns the shared customer_id if found, None otherwise.
    """
    if buyer_id == seller_id:
        return None  # self-trade handled elsewhere (wash trade detection)

    result = session.execute(
        text(
            "SELECT p1.stripe_customer_id "
            "FROM players p1, players p2 "
            "WHERE p1.id = :buyer_id AND p2.id = :seller_id "
            "AND p1.stripe_customer_id IS NOT NULL "
            "AND p1.stripe_customer_id != '' "
            "AND p1.stripe_customer_id = p2.stripe_customer_id"
        ),
        {"buyer_id": buyer_id, "seller_id": seller_id},
    ).fetchone()

    return result[0] if result else None


def log_alt_warning(
    buyer_id: int,
    seller_id: int,
    shared_customer_id: str,
    trade_id: int,
    session: Session,
) -> None:
    """Log a marketplace_alt_warning to activity_events."""
    from models import ActivityEvent

    event = ActivityEvent(
        player_id=buyer_id,
        event_type="marketplace_alt_warning",
        event_data={
            "buyer_id": buyer_id,
            "seller_id": seller_id,
            "shared_stripe_customer_id": shared_customer_id,
            "trade_id": trade_id,
        },
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)

    logger.warning(
        "Alt account warning: buyer=%d seller=%d shared_stripe=%s trade=%d",
        buyer_id, seller_id, shared_customer_id, trade_id,
    )
