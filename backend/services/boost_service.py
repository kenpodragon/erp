"""Combined boost multiplier resolution: subscription + shop boosters."""

import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from models.shop import PlayerActiveBooster
from services.subscription_service import get_subscriber_multipliers

logger = logging.getLogger(__name__)


def get_effective_multipliers(player_id: int, session: Session) -> dict:
    """Combine subscription boosts and shop booster multipliers.

    This replaces all direct calls to get_subscriber_multipliers() in game systems.
    Returns the multiplicative combination of both boost sources.
    """
    sub = get_subscriber_multipliers(player_id, session)

    # Load active shop boosters
    active_boosters = session.exec(
        select(PlayerActiveBooster).where(
            PlayerActiveBooster.player_id == player_id,
            PlayerActiveBooster.status == "active",
        )
    ).all()

    # Lazy expiry check + collect shop multipliers
    shop_multipliers = {"xp": 1.0, "essence": 1.0, "drop_rate": 1.0}
    booster_details = []
    now = datetime.now(timezone.utc)
    any_expired = False

    for booster in active_boosters:
        remaining = booster.duration_seconds - booster.elapsed_seconds
        if remaining <= 0:
            booster.status = "expired"
            booster.expired_at = now
            session.add(booster)
            any_expired = True
            continue

        shop_multipliers[booster.boost_type] = float(booster.magnitude)
        booster_details.append({
            "boost_type": booster.boost_type,
            "magnitude": float(booster.magnitude),
            "remaining_seconds": remaining,
            "duration_seconds": booster.duration_seconds,
        })

    if any_expired:
        session.flush()

    # Multiplicative stacking: subscription × shop
    return {
        "xp": round(sub["xp"] * shop_multipliers["xp"], 4),
        "essence": round(sub["essence"] * shop_multipliers["essence"], 4),
        "drop_rate": round(sub["drop_rate"] * shop_multipliers["drop_rate"], 4),
        "training_speed": sub["training_speed"],
        "is_ascendant": sub["is_ascendant"],
        "continuous_streak": sub["continuous_streak"],
        "cumulative_months": sub["cumulative_months"],
        "stipend_shards": sub["stipend_shards"],
        "active_boosters": booster_details,
        # Breakdown for UI display
        "sub_multipliers": {
            "xp": sub["xp"],
            "essence": sub["essence"],
            "drop_rate": sub["drop_rate"],
        },
        "shop_multipliers": shop_multipliers,
    }
