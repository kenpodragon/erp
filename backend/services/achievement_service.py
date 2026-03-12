"""Achievement evaluation engine: stats aggregation, check/grant, rewards (2.7.3)."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, select, text, func

from models.home_base import (
    Achievement, PlayerAchievement, PlayerTitle, Title,
    ShardTransaction, PlayerArtifact,
)
from models.story_mode import BossCompletion, PlayerMetaProgression
from models.character_progression import PlayerSceneRecord
from models.discovery import PlayerEntityDiscovery

logger = logging.getLogger(__name__)


def get_player_cumulative_stats(player_id: int, db: Session) -> dict:
    """Aggregate all trackable stats for a player across multiple tables."""
    stats: dict = {}

    # --- Scene records aggregates ---
    row = db.exec(text("""
        SELECT COALESCE(SUM(total_enemies_killed), 0) AS total_enemies_killed,
               COALESCE(SUM(total_runs), 0) AS total_sessions,
               COALESCE(MAX(best_wave), 0) AS max_wave_reached,
               COALESCE(MAX(best_session_damage), 0) AS max_session_damage,
               COALESCE(SUM(total_damage_dealt), 0) AS total_damage_dealt,
               COUNT(CASE WHEN first_completed_at IS NOT NULL THEN 1 END) AS scenes_completed
        FROM player_scene_records
        WHERE player_id = :pid
    """), params={"pid": player_id}).first()

    if row:
        m = row._mapping
        stats["total_enemies_killed"] = int(m["total_enemies_killed"])
        stats["total_sessions"] = int(m["total_sessions"])
        stats["max_wave_reached"] = int(m["max_wave_reached"])
        stats["max_session_damage"] = int(m["max_session_damage"])
        stats["total_damage_dealt"] = int(m["total_damage_dealt"])
        stats["scenes_completed"] = int(m["scenes_completed"])

    # --- Boss completions ---
    boss_count = db.exec(text(
        "SELECT COUNT(*) FROM boss_completions WHERE player_id = :pid"
    ), params={"pid": player_id}).first()
    stats["total_bosses_killed"] = int(boss_count[0]) if boss_count else 0

    # --- Chapters completed (distinct chapters with all scenes cleared) ---
    chapters_done = db.exec(text("""
        SELECT COUNT(DISTINCT s.chapter_id)
        FROM player_scene_records psr
        JOIN scenes s ON s.id = psr.scene_id
        WHERE psr.player_id = :pid
          AND psr.first_completed_at IS NOT NULL
          AND s.scene_type NOT IN ('chapter_boss', 'book_boss')
    """), params={"pid": player_id}).first()
    stats["chapters_with_progress"] = int(chapters_done[0]) if chapters_done else 0

    # --- Books completed (via boss completions) ---
    books_done = db.exec(text("""
        SELECT COUNT(DISTINCT book_id)
        FROM boss_completions
        WHERE player_id = :pid AND boss_type = 'book_boss'
    """), params={"pid": player_id}).first()
    stats["books_completed"] = int(books_done[0]) if books_done else 0

    # --- Meta progression ---
    meta = db.exec(
        select(PlayerMetaProgression)
        .where(PlayerMetaProgression.player_id == player_id)
    ).first()
    if meta:
        stats["total_essence_earned"] = float(meta.total_essence_earned)
        stats["shard_balance"] = meta.shard_balance
    else:
        stats["total_essence_earned"] = 0.0
        stats["shard_balance"] = 0

    # --- Artifacts owned ---
    art_count = db.exec(text(
        "SELECT COUNT(*) FROM player_artifacts WHERE player_id = :pid"
    ), params={"pid": player_id}).first()
    stats["total_artifacts_owned"] = int(art_count[0]) if art_count else 0

    # --- Story beats unlocked (via completed scenes) ---
    beats_count = db.exec(text("""
        SELECT COUNT(DISTINCT sb.id)
        FROM player_scene_records psr
        JOIN scenes s ON s.id = psr.scene_id
        JOIN story_beats sb ON sb.scene_id = s.id
        WHERE psr.player_id = :pid
          AND psr.first_completed_at IS NOT NULL
    """), params={"pid": player_id}).first()
    stats["total_beats_unlocked"] = int(beats_count[0]) if beats_count else 0

    # --- Entity discoveries ---
    disc_row = db.exec(text("""
        SELECT COUNT(*) AS total_discovered,
               COUNT(CASE WHEN rank = 'SS' THEN 1 END) AS ss_rank_count
        FROM player_entity_discovery
        WHERE player_id = :pid
    """), params={"pid": player_id}).first()
    if disc_row:
        m = disc_row._mapping
        stats["entities_discovered"] = int(m["total_discovered"])
        stats["ss_rank_count"] = int(m["ss_rank_count"])
    else:
        stats["entities_discovered"] = 0
        stats["ss_rank_count"] = 0

    # --- Character level ---
    char_row = db.exec(text("""
        SELECT level FROM player_characters WHERE player_id = :pid LIMIT 1
    """), params={"pid": player_id}).first()
    stats["character_level"] = int(char_row[0]) if char_row else 1

    # --- Subscription stats ---
    player_row = db.exec(text("""
        SELECT COALESCE(cumulative_subscription_months, 0) AS cumulative_sub_months
        FROM players WHERE id = :pid
    """), params={"pid": player_id}).first()
    stats["cumulative_sub_months"] = int(player_row[0]) if player_row else 0

    sub_row = db.exec(text("""
        SELECT COALESCE(continuous_streak, 0) AS continuous_sub_streak
        FROM player_subscriptions
        WHERE player_id = :pid AND status IN ('active', 'canceling', 'past_due')
        ORDER BY created_at DESC LIMIT 1
    """), params={"pid": player_id}).first()
    stats["continuous_sub_streak"] = int(sub_row[0]) if sub_row else 0

    # --- Shard purchase / spend totals ---
    shard_row = db.exec(text("""
        SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS shards_purchased,
               COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS shards_spent
        FROM shard_transactions
        WHERE player_id = :pid
    """), params={"pid": player_id}).first()
    if shard_row:
        m = shard_row._mapping
        stats["shards_purchased"] = int(m["shards_purchased"])
        stats["shards_spent"] = int(m["shards_spent"])
    else:
        stats["shards_purchased"] = 0
        stats["shards_spent"] = 0

    # --- Marketplace stats (3.5) ---
    try:
        listing_count = db.exec(text(
            "SELECT COUNT(*) FROM marketplace_listings WHERE seller_id = :pid"
        ), params={"pid": player_id}).first()
        stats["marketplace_listings"] = int(listing_count[0]) if listing_count else 0

        sales_row = db.exec(text("""
            SELECT COUNT(*) AS sales_count,
                   COALESCE(MAX(price_shards), 0) AS max_sale_price,
                   COALESCE(SUM(seller_proceeds), 0) AS total_earned
            FROM marketplace_trades
            WHERE seller_id = :pid
        """), params={"pid": player_id}).first()
        if sales_row:
            m = sales_row._mapping
            stats["marketplace_sales"] = int(m["sales_count"])
            stats["marketplace_single_sale_max"] = int(m["max_sale_price"])
            stats["marketplace_total_earned"] = int(m["total_earned"])
        else:
            stats["marketplace_sales"] = 0
            stats["marketplace_single_sale_max"] = 0
            stats["marketplace_total_earned"] = 0

        purchase_count = db.exec(text(
            "SELECT COUNT(*) FROM marketplace_trades WHERE buyer_id = :pid"
        ), params={"pid": player_id}).first()
        stats["marketplace_purchases"] = int(purchase_count[0]) if purchase_count else 0

        salvage_count = db.exec(text(
            "SELECT COUNT(*) FROM activity_events WHERE player_id = :pid AND event_type = 'item_salvaged'"
        ), params={"pid": player_id}).first()
        stats["marketplace_salvages"] = int(salvage_count[0]) if salvage_count else 0
    except Exception:
        stats["marketplace_listings"] = 0
        stats["marketplace_sales"] = 0
        stats["marketplace_purchases"] = 0
        stats["marketplace_salvages"] = 0
        stats["marketplace_single_sale_max"] = 0
        stats["marketplace_total_earned"] = 0

    return stats


def _check_achievement_met(
    achievement: Achievement, stats: dict, completed_ids: set
) -> bool:
    """Check if a single achievement's condition is met."""
    # Parent must be completed first
    if achievement.parent_achievement_id is not None:
        if achievement.parent_achievement_id not in completed_ids:
            return False

    source = achievement.tracking_source
    threshold = float(achievement.threshold_value)

    if achievement.tracking_type == "boolean":
        return bool(stats.get(source, False))

    # cumulative / threshold
    current = float(stats.get(source, 0))
    return current >= threshold


def _get_progress_value(achievement: Achievement, stats: dict) -> float:
    """Get current progress value for an achievement."""
    if achievement.tracking_type == "boolean":
        return 1.0 if stats.get(achievement.tracking_source, False) else 0.0
    return float(stats.get(achievement.tracking_source, 0))


def evaluate_achievements(
    player_id: int, db: Session, context: Optional[dict] = None
) -> list[dict]:
    """Evaluate all pending achievements for a player. Returns newly earned list."""
    # Get all completed achievement IDs
    completed_rows = db.exec(
        select(PlayerAchievement.achievement_id)
        .where(
            PlayerAchievement.player_id == player_id,
            PlayerAchievement.is_completed == True,
        )
    ).all()
    completed_ids = set(completed_rows)

    # Get all active achievements not yet completed
    all_achievements = db.exec(
        select(Achievement).where(Achievement.is_active == True)
    ).all()

    pending = [a for a in all_achievements if a.id not in completed_ids]
    if not pending:
        return []

    # Aggregate stats
    stats = get_player_cumulative_stats(player_id, db)
    if context:
        stats.update(context)

    newly_earned: list[dict] = []

    for ach in pending:
        if _check_achievement_met(ach, stats, completed_ids):
            # Grant achievement
            now = datetime.now(timezone.utc)

            # Upsert PlayerAchievement
            existing = db.exec(
                select(PlayerAchievement).where(
                    PlayerAchievement.player_id == player_id,
                    PlayerAchievement.achievement_id == ach.id,
                )
            ).first()

            if existing:
                existing.is_completed = True
                existing.is_new = True
                existing.earned_at = now
                existing.progress_value = ach.threshold_value
            else:
                pa = PlayerAchievement(
                    player_id=player_id,
                    achievement_id=ach.id,
                    progress_value=ach.threshold_value,
                    is_completed=True,
                    is_new=True,
                    earned_at=now,
                )
                db.add(pa)

            # Mark as completed so children can evaluate in same pass
            completed_ids.add(ach.id)

            # Distribute rewards
            reward_title_name = None

            if ach.reward_shards > 0:
                _grant_shards(player_id, ach.reward_shards, ach.id, db)

            if ach.reward_essence > 0:
                # 3.2/3.3: Apply Ascendant + shop booster essence multiplier
                from services.boost_service import get_effective_multipliers
                sub_mult = get_effective_multipliers(player_id, db)
                boosted_essence = int(ach.reward_essence * sub_mult["essence"])
                _grant_essence(player_id, boosted_essence, db)

            if ach.reward_title_id:
                reward_title_name = _grant_title(
                    player_id, ach.reward_title_id, db
                )

            newly_earned.append({
                "id": ach.id,
                "name": ach.name,
                "description": ach.description,
                "category": ach.category,
                "icon_sprite_key": ach.icon_sprite_key,
                "reward_shards": ach.reward_shards,
                "reward_essence": ach.reward_essence,
                "reward_title": reward_title_name,
            })

    db.flush()
    return newly_earned


def update_achievement_progress(player_id: int, db: Session) -> None:
    """Update progress_value on all player_achievements (for display)."""
    stats = get_player_cumulative_stats(player_id, db)

    all_pa = db.exec(
        select(PlayerAchievement)
        .where(
            PlayerAchievement.player_id == player_id,
            PlayerAchievement.is_completed == False,
        )
    ).all()

    for pa in all_pa:
        ach = db.get(Achievement, pa.achievement_id)
        if ach:
            pa.progress_value = Decimal(str(_get_progress_value(ach, stats)))

    db.flush()


def _grant_shards(player_id: int, amount: int, achievement_id: int, db: Session):
    """Add shards to player balance and record transaction."""
    meta = db.exec(
        select(PlayerMetaProgression)
        .where(PlayerMetaProgression.player_id == player_id)
    ).first()
    if not meta:
        return

    meta.shard_balance += amount
    meta.total_shards_earned += amount

    txn = ShardTransaction(
        player_id=player_id,
        amount=amount,
        balance_after=meta.shard_balance,
        source_type="achievement",
        source_id=achievement_id,
        description=f"Achievement reward ({amount} shards)",
        created_at=datetime.now(timezone.utc),
    )
    db.add(txn)


def _grant_essence(player_id: int, amount: int, db: Session):
    """Add essence reward to player."""
    from models.progress import PlayerEssence

    essence = db.exec(
        select(PlayerEssence).where(PlayerEssence.player_id == player_id)
    ).first()
    if essence:
        essence.current_balance += amount

    meta = db.exec(
        select(PlayerMetaProgression)
        .where(PlayerMetaProgression.player_id == player_id)
    ).first()
    if meta:
        meta.elysium_essence += amount
        meta.total_essence_earned += amount


def _grant_title(player_id: int, title_id: int, db: Session) -> Optional[str]:
    """Grant a title to the player. Returns title name."""
    title = db.get(Title, title_id)
    if not title:
        return None

    existing = db.exec(
        select(PlayerTitle).where(
            PlayerTitle.player_id == player_id,
            PlayerTitle.title_id == title_id,
        )
    ).first()

    if not existing:
        pt = PlayerTitle(
            player_id=player_id,
            title_id=title_id,
            earned_at=datetime.now(timezone.utc),
        )
        db.add(pt)

    return title.name
