"""Subscription lifecycle service: activate, renew, cancel, expire, refund,
boost multipliers, stipend crediting, grace period business-day logic (3.2)."""

import json
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from sqlmodel import Session, select, text
from sqlalchemy import func

from models.subscriptions import PlayerSubscription, SubscriptionStipendLog
from models.story_mode import GameConfig, PlayerMetaProgression
from models.home_base import ShardTransaction, PlayerTitle, Title

logger = logging.getLogger(__name__)


# =============================================================================
# Config helpers
# =============================================================================

def _get_config(db: Session, key: str, default: str = "") -> str:
    row = db.exec(
        select(GameConfig).where(GameConfig.key == key)
    ).first()
    if not row:
        return default
    # value_json stores JSON-typed data; coerce to string for scalar configs
    val = row.value_json
    if val is None:
        return default
    return str(val)


def _get_config_float(db: Session, key: str, default: float = 0.0) -> float:
    try:
        return float(_get_config(db, key, str(default)))
    except (ValueError, TypeError):
        return default


def _get_config_int(db: Session, key: str, default: int = 0) -> int:
    try:
        return int(float(_get_config(db, key, str(default))))
    except (ValueError, TypeError):
        return default


def _get_config_json(db: Session, key: str, default=None):
    row = db.exec(
        select(GameConfig).where(GameConfig.key == key)
    ).first()
    if not row or row.value_json is None:
        return default if default is not None else []
    val = row.value_json
    # If already a list/dict (JSON column), return directly
    if isinstance(val, (list, dict)):
        return val
    # If stored as string, try to parse
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else []


# =============================================================================
# Active subscription lookup
# =============================================================================

def get_active_subscription(
    player_id: int, db: Session
) -> Optional[PlayerSubscription]:
    """Return the active/past_due/canceling subscription for a player, or None."""
    sub = db.exec(
        select(PlayerSubscription)
        .where(PlayerSubscription.player_id == player_id)
        .where(PlayerSubscription.status.in_(["active", "past_due", "canceling"]))
        .order_by(PlayerSubscription.created_at.desc())
    ).first()
    return sub


def get_subscription_by_stripe_id(
    stripe_sub_id: str, db: Session
) -> Optional[PlayerSubscription]:
    """Look up a subscription row by Stripe subscription ID."""
    return db.exec(
        select(PlayerSubscription)
        .where(PlayerSubscription.stripe_subscription_id == stripe_sub_id)
        .order_by(PlayerSubscription.created_at.desc())
    ).first()


# =============================================================================
# Subscription lifecycle
# =============================================================================

def activate_subscription(
    player_id: int,
    stripe_subscription_id: Optional[str],
    stripe_price_id: Optional[str],
    plan_key: str,
    period_start: datetime,
    period_end: datetime,
    source: str = "stripe",
    db: Session = None,
) -> PlayerSubscription:
    """Create and activate a new subscription row. Sets is_ascendant on player."""
    now = datetime.now(timezone.utc)

    sub = PlayerSubscription(
        player_id=player_id,
        stripe_subscription_id=stripe_subscription_id,
        stripe_price_id=stripe_price_id,
        plan_key=plan_key,
        status="active",
        source=source,
        subscription_start_date=now,
        current_period_start=period_start,
        current_period_end=period_end,
        continuous_streak=0,
        created_at=now,
        updated_at=now,
    )
    db.add(sub)
    db.flush()

    # Set player flag
    db.execute(
        text("UPDATE players SET is_ascendant = TRUE WHERE id = :pid"),
        {"pid": player_id},
    )

    # Grant "the Ascendant" title if not already owned
    _grant_ascendant_title(player_id, db)

    logger.info("Activated subscription %s for player %s (%s)", sub.id, player_id, plan_key)
    return sub


def renew_subscription(
    sub: PlayerSubscription,
    new_period_start: datetime,
    new_period_end: datetime,
    stripe_invoice_id: Optional[str],
    db: Session,
) -> None:
    """Renew: extend period, increment streak + cumulative, credit stipend."""
    sub.current_period_start = new_period_start
    sub.current_period_end = new_period_end
    sub.status = "active"
    sub.grace_period_start = None
    sub.grace_deadline = None
    sub.updated_at = datetime.now(timezone.utc)

    # Increment loyalty counters
    gift_counts = _get_config(db, "gift_counts_toward_loyalty", "false").lower() == "true"
    if sub.source == "stripe" or gift_counts:
        sub.continuous_streak += 1
        db.execute(
            text(
                "UPDATE players SET cumulative_subscription_months = "
                "cumulative_subscription_months + 1 WHERE id = :pid"
            ),
            {"pid": sub.player_id},
        )

    db.add(sub)
    db.flush()

    # Credit stipend
    _credit_stipend(sub, stripe_invoice_id, db)

    # Check loyalty milestones
    _check_cumulative_milestones(sub.player_id, db)

    logger.info(
        "Renewed subscription %s: streak=%s period_end=%s",
        sub.id, sub.continuous_streak, new_period_end,
    )


def cancel_subscription(sub: PlayerSubscription, db: Session) -> None:
    """Mark subscription for end-of-period cancellation."""
    sub.cancel_at_period_end = True
    sub.status = "canceling"
    sub.updated_at = datetime.now(timezone.utc)
    db.add(sub)
    logger.info("Subscription %s marked for cancellation at period end", sub.id)


def reactivate_subscription(sub: PlayerSubscription, db: Session) -> None:
    """Un-cancel a subscription that hasn't reached period end."""
    sub.cancel_at_period_end = False
    sub.status = "active"
    sub.updated_at = datetime.now(timezone.utc)
    db.add(sub)
    logger.info("Subscription %s reactivated", sub.id)


def expire_subscription(sub: PlayerSubscription, db: Session) -> None:
    """Fully expire: revoke benefits, reset streak."""
    sub.status = "expired"
    sub.cancel_at_period_end = False
    sub.grace_period_start = None
    sub.grace_deadline = None
    sub.continuous_streak = 0
    sub.updated_at = datetime.now(timezone.utc)
    db.add(sub)

    # Clear player flag
    db.execute(
        text("UPDATE players SET is_ascendant = FALSE WHERE id = :pid"),
        {"pid": sub.player_id},
    )

    # Unequip "the Ascendant" title if currently equipped
    _unequip_ascendant_title(sub.player_id, db)

    logger.info("Subscription %s expired for player %s", sub.id, sub.player_id)


def mark_past_due(sub: PlayerSubscription, db: Session) -> None:
    """Payment failed — start grace period."""
    now = datetime.now(timezone.utc)
    if sub.status == "past_due" and sub.grace_deadline:
        return  # Already in grace period

    sub.status = "past_due"
    sub.grace_period_start = now
    sub.grace_deadline = calculate_grace_deadline(now, db)
    sub.updated_at = now
    db.add(sub)
    logger.info(
        "Subscription %s past_due, grace deadline=%s",
        sub.id, sub.grace_deadline,
    )


def refund_subscription(
    sub: PlayerSubscription, db: Session,
    months_to_claw_back: int = 1,
) -> None:
    """Immediate cancellation + stipend clawback on refund."""
    # Claw back stipend shards for the refunded period(s)
    stipend_logs = db.exec(
        select(SubscriptionStipendLog)
        .where(SubscriptionStipendLog.subscription_id == sub.id)
        .order_by(SubscriptionStipendLog.created_at.desc())
        .limit(months_to_claw_back)
    ).all()

    total_clawback = sum(log.shards_credited for log in stipend_logs)
    if total_clawback > 0:
        from services.payment_service import debit_shards
        debit_shards(
            player_id=sub.player_id,
            amount=total_clawback,
            source_type="subscription_refund",
            source_id=sub.id,
            description=f"Subscription refund clawback ({total_clawback} shards)",
            session=db,
        )

    # Decrement cumulative months for refunded period
    db.execute(
        text(
            "UPDATE players SET cumulative_subscription_months = "
            "MAX(0, cumulative_subscription_months - :months) WHERE id = :pid"
        ),
        {"months": months_to_claw_back, "pid": sub.player_id},
    )

    # Expire the subscription
    expire_subscription(sub, db)
    logger.info(
        "Refunded subscription %s: clawed back %s shards, decremented %s months",
        sub.id, total_clawback, months_to_claw_back,
    )


# =============================================================================
# Lazy status resolution (belt + suspenders)
# =============================================================================

def _ensure_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (assume UTC if naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def resolve_lazy_status(sub: PlayerSubscription, db: Session) -> None:
    """Check grace deadline and period end, expire if past due."""
    now = datetime.now(timezone.utc)

    if sub.status == "past_due" and sub.grace_deadline:
        if now > _ensure_aware(sub.grace_deadline):
            expire_subscription(sub, db)
            return

    if sub.status == "canceling" and sub.current_period_end:
        if now > _ensure_aware(sub.current_period_end):
            expire_subscription(sub, db)
            return


# =============================================================================
# Boost multipliers (3.2.1)
# =============================================================================

def get_subscriber_multipliers(player_id: int, db: Session) -> dict:
    """Return current effective multipliers for a player.

    Returns 1.0x multipliers and is_ascendant=False for non-subscribers.
    Also triggers lazy stipend credit and status resolution.
    """
    sub = get_active_subscription(player_id, db)

    default = {
        "xp": 1.0,
        "essence": 1.0,
        "drop_rate": 1.0,
        "training_speed": 1.0,
        "stipend_shards": 0,
        "is_ascendant": False,
        "continuous_streak": 0,
        "cumulative_months": 0,
    }

    if not sub:
        return default

    # Lazy status check
    resolve_lazy_status(sub, db)
    if sub.status == "expired":
        return default

    # Lazy stipend credit for annual subscribers
    _credit_lazy_stipends(sub, db)

    # Base boosts from game_configs
    base_xp = _get_config_float(db, "subscription_base_xp_boost", 0.15)
    base_essence = _get_config_float(db, "subscription_base_essence_boost", 0.15)
    base_drop = _get_config_float(db, "subscription_base_drop_boost", 0.10)
    base_training = _get_config_float(db, "subscription_base_training_boost", 0.10)
    base_stipend = _get_config_int(db, "subscription_base_stipend_shards", 150)

    # Accumulate streak bonuses
    streak_bonuses = _get_config_json(db, "subscription_streak_bonuses", [])
    extra_xp = 0.0
    extra_essence = 0.0
    extra_drop = 0.0
    extra_training = 0.0
    extra_stipend = 0

    for bonus in sorted(streak_bonuses, key=lambda b: b.get("months", 0)):
        if sub.continuous_streak >= bonus.get("months", 999):
            extra_xp += bonus.get("xp_bonus", 0)
            extra_essence += bonus.get("essence_bonus", 0)
            extra_drop += bonus.get("drop_bonus", 0)
            extra_training += bonus.get("training_bonus", 0)
            extra_stipend += bonus.get("stipend_bonus", 0)

    # Read cumulative months from player row
    cum_row = db.execute(
        text("SELECT cumulative_subscription_months FROM players WHERE id = :pid"),
        {"pid": player_id},
    ).first()
    cumulative_months = cum_row[0] if cum_row else 0

    return {
        "xp": round(1.0 + base_xp + extra_xp, 4),
        "essence": round(1.0 + base_essence + extra_essence, 4),
        "drop_rate": round(1.0 + base_drop + extra_drop, 4),
        "training_speed": round(1.0 + base_training + extra_training, 4),
        "stipend_shards": base_stipend + extra_stipend,
        "is_ascendant": True,
        "continuous_streak": sub.continuous_streak,
        "cumulative_months": cumulative_months,
    }


# =============================================================================
# Stipend crediting
# =============================================================================

def _credit_stipend(
    sub: PlayerSubscription,
    stripe_invoice_id: Optional[str],
    db: Session,
) -> None:
    """Credit monthly shard stipend. Idempotent via period_key."""
    if sub.status == "past_due":
        return  # No stipend during grace period

    period_key = sub.current_period_start.strftime("%Y-%m") if sub.current_period_start else None
    if not period_key:
        return

    # Check idempotency
    existing = db.exec(
        select(SubscriptionStipendLog)
        .where(SubscriptionStipendLog.subscription_id == sub.id)
        .where(SubscriptionStipendLog.period_key == period_key)
    ).first()
    if existing:
        return

    # Calculate stipend amount (base + streak bonus)
    multipliers = get_subscriber_multipliers.__wrapped__(sub, db) if hasattr(get_subscriber_multipliers, '__wrapped__') else None
    base_stipend = _get_config_int(db, "subscription_base_stipend_shards", 150)
    streak_bonuses = _get_config_json(db, "subscription_streak_bonuses", [])
    extra_stipend = 0
    for bonus in sorted(streak_bonuses, key=lambda b: b.get("months", 0)):
        if sub.continuous_streak >= bonus.get("months", 999):
            extra_stipend += bonus.get("stipend_bonus", 0)

    total_stipend = base_stipend + extra_stipend

    # Credit shards
    meta = db.exec(
        select(PlayerMetaProgression)
        .where(PlayerMetaProgression.player_id == sub.player_id)
    ).first()
    if not meta:
        return

    meta.shard_balance += total_stipend
    meta.total_shards_earned += total_stipend
    meta.updated_at = datetime.now(timezone.utc)
    db.add(meta)

    txn = ShardTransaction(
        player_id=sub.player_id,
        amount=total_stipend,
        balance_after=meta.shard_balance,
        source_type="subscription_stipend",
        source_id=sub.id,
        description=f"Monthly Ascendant stipend ({total_stipend} shards)",
        created_at=datetime.now(timezone.utc),
    )
    db.add(txn)

    # Log for idempotency
    log = SubscriptionStipendLog(
        subscription_id=sub.id,
        player_id=sub.player_id,
        period_key=period_key,
        shards_credited=total_stipend,
        stripe_invoice_id=stripe_invoice_id,
        period_start=sub.current_period_start,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.flush()

    logger.info(
        "Credited %s stipend shards for subscription %s (period %s)",
        total_stipend, sub.id, period_key,
    )


def _credit_lazy_stipends(sub: PlayerSubscription, db: Session) -> None:
    """For annual subscribers, credit any missed monthly stipends on-access."""
    if sub.plan_key != "ascendant_annual":
        return
    if sub.status == "past_due":
        return

    now = datetime.now(timezone.utc)
    start = sub.subscription_start_date or sub.current_period_start
    if not start:
        return

    # Walk month-by-month from subscription start to now
    current = start
    while current <= now:
        period_key = current.strftime("%Y-%m")
        existing = db.exec(
            select(SubscriptionStipendLog)
            .where(SubscriptionStipendLog.subscription_id == sub.id)
            .where(SubscriptionStipendLog.period_key == period_key)
        ).first()
        if not existing:
            # Credit this month
            base_stipend = _get_config_int(db, "subscription_base_stipend_shards", 150)
            streak_bonuses = _get_config_json(db, "subscription_streak_bonuses", [])
            extra_stipend = 0
            for bonus in sorted(streak_bonuses, key=lambda b: b.get("months", 0)):
                if sub.continuous_streak >= bonus.get("months", 999):
                    extra_stipend += bonus.get("stipend_bonus", 0)
            total_stipend = base_stipend + extra_stipend

            meta = db.exec(
                select(PlayerMetaProgression)
                .where(PlayerMetaProgression.player_id == sub.player_id)
            ).first()
            if meta:
                meta.shard_balance += total_stipend
                meta.total_shards_earned += total_stipend
                meta.updated_at = datetime.now(timezone.utc)
                db.add(meta)

                txn = ShardTransaction(
                    player_id=sub.player_id,
                    amount=total_stipend,
                    balance_after=meta.shard_balance,
                    source_type="subscription_stipend",
                    source_id=sub.id,
                    description=f"Ascendant stipend ({period_key})",
                    created_at=datetime.now(timezone.utc),
                )
                db.add(txn)

                log = SubscriptionStipendLog(
                    subscription_id=sub.id,
                    player_id=sub.player_id,
                    period_key=period_key,
                    shards_credited=total_stipend,
                    period_start=current,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(log)

        # Advance to next month anniversary
        month = current.month + 1
        year = current.year
        if month > 12:
            month = 1
            year += 1
        day = min(start.day, _days_in_month(year, month))
        current = current.replace(year=year, month=month, day=day)

    db.flush()


def _days_in_month(year: int, month: int) -> int:
    """Return number of days in a given month."""
    import calendar
    return calendar.monthrange(year, month)[1]


# =============================================================================
# Loyalty milestone checks
# =============================================================================

def _check_cumulative_milestones(player_id: int, db: Session) -> None:
    """Grant cumulative loyalty titles based on total months subscribed."""
    row = db.execute(
        text("SELECT cumulative_subscription_months FROM players WHERE id = :pid"),
        {"pid": player_id},
    ).first()
    if not row:
        return
    cumulative = row[0]

    milestones = _get_config_json(db, "subscription_cumulative_milestones", [])
    title_name_map = {
        "the_patron": "the Patron",
        "the_devoted": "the Devoted",
        "the_eternal_ascendant": "the Eternal Ascendant",
        "architect_of_elysium": "Architect of Elysium",
        "voidwalker_ascendant": "Voidwalker Ascendant",
        "keeper_of_the_spire": "Keeper of the Spire",
        "elysium_incarnate": "Elysium Incarnate",
    }

    for milestone in milestones:
        if cumulative >= milestone.get("months", 999):
            if milestone.get("reward_type") == "title":
                raw_value = milestone.get("reward_value", "")
                title_name = title_name_map.get(raw_value, raw_value)
                _grant_title_by_name(player_id, title_name, db)


def _grant_title_by_name(player_id: int, title_name: str, db: Session) -> None:
    """Grant a title to a player by title name (idempotent)."""
    title = db.exec(
        select(Title).where(Title.name == title_name)
    ).first()
    if not title:
        return

    existing = db.exec(
        select(PlayerTitle)
        .where(PlayerTitle.player_id == player_id)
        .where(PlayerTitle.title_id == title.id)
    ).first()
    if not existing:
        pt = PlayerTitle(
            player_id=player_id,
            title_id=title.id,
            earned_at=datetime.now(timezone.utc),
        )
        db.add(pt)


def _grant_ascendant_title(player_id: int, db: Session) -> None:
    """Grant 'the Ascendant' title on subscription activation."""
    _grant_title_by_name(player_id, "the Ascendant", db)


def _unequip_ascendant_title(player_id: int, db: Session) -> None:
    """Unequip 'the Ascendant' title if currently equipped. Do NOT delete it."""
    title = db.exec(
        select(Title).where(Title.name == "the Ascendant")
    ).first()
    if not title:
        return

    pt = db.exec(
        select(PlayerTitle)
        .where(PlayerTitle.player_id == player_id)
        .where(PlayerTitle.title_id == title.id)
    ).first()
    if pt and getattr(pt, "is_equipped", False):
        pt.is_equipped = False
        db.add(pt)


# =============================================================================
# Business-day grace period calculation
# =============================================================================

# US Federal Holidays (observed dates, fixed + floating)
_US_FEDERAL_HOLIDAYS_FIXED = {
    (1, 1),   # New Year's Day
    (6, 19),  # Juneteenth
    (7, 4),   # Independence Day
    (11, 11), # Veterans Day
    (12, 25), # Christmas Day
}


def _us_federal_holidays_for_year(year: int) -> set:
    """Return set of observed US federal holiday dates for a given year."""
    holidays = set()

    # Fixed holidays with observed-date adjustment
    for month, day in _US_FEDERAL_HOLIDAYS_FIXED:
        d = date(year, month, day)
        if d.weekday() == 5:  # Saturday → observed Friday
            d = d - timedelta(days=1)
        elif d.weekday() == 6:  # Sunday → observed Monday
            d = d + timedelta(days=1)
        holidays.add(d)

    # Floating holidays
    # MLK Day: 3rd Monday of January
    holidays.add(_nth_weekday(year, 1, 0, 3))
    # Presidents' Day: 3rd Monday of February
    holidays.add(_nth_weekday(year, 2, 0, 3))
    # Memorial Day: Last Monday of May
    holidays.add(_last_weekday(year, 5, 0))
    # Labor Day: 1st Monday of September
    holidays.add(_nth_weekday(year, 9, 0, 1))
    # Columbus Day: 2nd Monday of October
    holidays.add(_nth_weekday(year, 10, 0, 2))
    # Thanksgiving: 4th Thursday of November
    holidays.add(_nth_weekday(year, 11, 3, 4))

    return holidays


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    """Return the nth occurrence of a weekday in a month (1-indexed)."""
    first = date(year, month, 1)
    diff = (weekday - first.weekday()) % 7
    first_occurrence = first + timedelta(days=diff)
    return first_occurrence + timedelta(weeks=n - 1)


def _last_weekday(year: int, month: int, weekday: int) -> date:
    """Return the last occurrence of a weekday in a month."""
    import calendar
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    diff = (last_day.weekday() - weekday) % 7
    return last_day - timedelta(days=diff)


def _is_business_day(d: date, custom_holidays: set) -> bool:
    """Check if a date is a US business day."""
    if d.weekday() >= 5:  # Saturday or Sunday
        return False
    year_holidays = _us_federal_holidays_for_year(d.year)
    if d in year_holidays:
        return False
    if d in custom_holidays:
        return False
    return True


def _next_business_day(after_date: date, custom_holidays: set) -> date:
    """Find the next business day strictly after the given date."""
    d = after_date + timedelta(days=1)
    while not _is_business_day(d, custom_holidays):
        d += timedelta(days=1)
    return d


def calculate_grace_deadline(failure_time: datetime, db: Session) -> datetime:
    """Calculate grace period deadline: 23:59:59 UTC of the next US business day
    after the UTC calendar day of the payment failure."""
    failure_date = failure_time.date() if hasattr(failure_time, 'date') else failure_time

    # Load custom holidays from game_configs
    custom_holidays_raw = _get_config_json(db, "subscription_custom_holidays", [])
    custom_holidays = set()
    for h in custom_holidays_raw:
        try:
            custom_holidays.add(date.fromisoformat(h))
        except (ValueError, TypeError):
            pass

    next_bd = _next_business_day(failure_date, custom_holidays)
    return datetime(
        next_bd.year, next_bd.month, next_bd.day,
        23, 59, 59, tzinfo=timezone.utc,
    )
