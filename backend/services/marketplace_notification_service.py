"""Marketplace trade notification service (3.5)."""

import logging
from datetime import datetime, timezone, timedelta

from sqlmodel import Session, select
from sqlalchemy import update, delete

from models.marketplace import MarketplaceNotification

logger = logging.getLogger(__name__)


# =============================================================================
# Helpers
# =============================================================================

def _notif_to_dict(n: MarketplaceNotification) -> dict:
    """Serialize a MarketplaceNotification to a dict for API response."""
    return {
        "id": n.id,
        "player_id": n.player_id,
        "notification_type": n.notification_type,
        "title": n.title,
        "message": n.message,
        "related_listing_id": n.related_listing_id,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "read_at": n.read_at.isoformat() if n.read_at else None,
    }


# =============================================================================
# Public API
# =============================================================================

def create_notification(
    player_id: int,
    notification_type: str,
    title: str,
    message: str,
    related_listing_id: int = None,
    session: Session = None,
) -> MarketplaceNotification:
    """Create a marketplace notification for a player.

    notification_type: 'item_sold' | 'listing_expired' | 'listing_removed'
    """
    notif = MarketplaceNotification(
        player_id=player_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_listing_id=related_listing_id,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    session.add(notif)
    return notif


def get_unread_notifications(player_id: int, session: Session) -> list[dict]:
    """Get all unread marketplace notifications for a player.

    Called alongside idle training gains on login/return.
    """
    notifications = session.exec(
        select(MarketplaceNotification).where(
            MarketplaceNotification.player_id == player_id,
            MarketplaceNotification.is_read == False,  # noqa: E712
        ).order_by(MarketplaceNotification.created_at.desc())
    ).all()
    return [_notif_to_dict(n) for n in notifications]


def mark_read(
    player_id: int, notification_ids: list[int], session: Session
) -> int:
    """Mark notifications as read. Returns count of notifications updated."""
    now = datetime.now(timezone.utc)
    result = session.execute(
        update(MarketplaceNotification)
        .where(
            MarketplaceNotification.player_id == player_id,
            MarketplaceNotification.id.in_(notification_ids),
            MarketplaceNotification.is_read == False,  # noqa: E712
        )
        .values(is_read=True, read_at=now)
    )
    return result.rowcount


def purge_old_notifications(days: int = 30, session: Session = None) -> int:
    """Delete read notifications older than `days`. Called opportunistically.

    Returns count of notifications deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = session.execute(
        delete(MarketplaceNotification).where(
            MarketplaceNotification.created_at < cutoff,
            MarketplaceNotification.is_read == True,  # noqa: E712
        )
    )
    return result.rowcount
