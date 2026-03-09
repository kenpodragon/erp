"""Leaderboard computation, caching, and badge tier assignment (2.7.3)."""

import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, select, text

from models.home_base import LeaderboardCache
from models.story_mode import GameConfig

logger = logging.getLogger(__name__)

VALID_CATEGORIES = ("vanguard", "alchemist", "swift", "scholar")

BADGE_THRESHOLDS = [
    ("cosmic", 0.01),   # top 1%
    ("gold",   0.05),   # top 5%
    ("silver", 0.15),   # top 15%
    ("bronze", 0.30),   # top 30%
]


def _get_config(db: Session, key: str, default):
    """Fetch a game_configs value."""
    cfg = db.get(GameConfig, key)
    if cfg and cfg.value_json is not None:
        return cfg.value_json
    return default


def _assign_badge_tier(rank: int, total: int) -> Optional[str]:
    """Assign badge tier based on percentile position."""
    if total == 0:
        return None
    pct = rank / total
    for tier, threshold in BADGE_THRESHOLDS:
        if pct <= threshold:
            return tier
    return None


def _compute_vanguard(db: Session, top_n: int) -> list[dict]:
    """Progression leaderboard: furthest narrative position."""
    sql = text("""
        SELECT pp.player_id, p.alias AS player_alias,
               cc.name AS character_class, pc.level AS character_level,
               t.name AS equipped_title,
               (pp.book_number * 10000 + pp.chapter_number * 100 + pp.scene_number) AS metric
        FROM player_progress pp
        JOIN players p ON p.id = pp.player_id
        JOIN player_characters pc ON pc.player_id = pp.player_id
        JOIN character_classes cc ON cc.id = pc.class_id
        LEFT JOIN titles t ON t.id = pc.equipped_title_id
        ORDER BY pp.book_number DESC, pp.chapter_number DESC, pp.scene_number DESC
        LIMIT :limit
    """)
    rows = db.exec(sql, params={"limit": top_n}).all()
    return [dict(r._mapping) for r in rows]


def _compute_alchemist(db: Session, top_n: int) -> list[dict]:
    """Essence leaderboard: total lifetime essence earned."""
    sql = text("""
        SELECT pmp.player_id, p.alias AS player_alias,
               cc.name AS character_class, pc.level AS character_level,
               t.name AS equipped_title,
               pmp.total_essence_earned AS metric
        FROM player_meta_progression pmp
        JOIN players p ON p.id = pmp.player_id
        JOIN player_characters pc ON pc.player_id = pmp.player_id
        JOIN character_classes cc ON cc.id = pc.class_id
        LEFT JOIN titles t ON t.id = pc.equipped_title_id
        WHERE pmp.total_essence_earned > 0
        ORDER BY pmp.total_essence_earned DESC
        LIMIT :limit
    """)
    rows = db.exec(sql, params={"limit": top_n}).all()
    return [dict(r._mapping) for r in rows]


def _compute_swift(db: Session, top_n: int) -> list[dict]:
    """Speedrun leaderboard: best boss clear times."""
    sql = text("""
        SELECT psr.player_id, p.alias AS player_alias,
               cc.name AS character_class, pc.level AS character_level,
               t.name AS equipped_title,
               MIN(psr.best_time_seconds) AS metric
        FROM player_scene_records psr
        JOIN scenes s ON s.id = psr.scene_id
        JOIN players p ON p.id = psr.player_id
        JOIN player_characters pc ON pc.player_id = psr.player_id
        JOIN character_classes cc ON cc.id = pc.class_id
        LEFT JOIN titles t ON t.id = pc.equipped_title_id
        WHERE s.scene_type IN ('chapter_boss', 'book_boss')
          AND psr.best_time_seconds IS NOT NULL
        GROUP BY psr.player_id, p.alias, cc.name, pc.level, t.name
        ORDER BY MIN(psr.best_time_seconds) ASC
        LIMIT :limit
    """)
    rows = db.exec(sql, params={"limit": top_n}).all()
    return [dict(r._mapping) for r in rows]


def _compute_scholar(db: Session, top_n: int) -> list[dict]:
    """Scholar leaderboard: total story beats unlocked via completed scenes."""
    sql = text("""
        SELECT psr.player_id, p.alias AS player_alias,
               cc.name AS character_class, pc.level AS character_level,
               t.name AS equipped_title,
               COUNT(DISTINCT sb.id) AS metric
        FROM player_scene_records psr
        JOIN scenes s ON s.id = psr.scene_id
        JOIN story_beats sb ON sb.scene_id = s.id
        JOIN players p ON p.id = psr.player_id
        JOIN player_characters pc ON pc.player_id = psr.player_id
        JOIN character_classes cc ON cc.id = pc.class_id
        LEFT JOIN titles t ON t.id = pc.equipped_title_id
        WHERE psr.first_completed_at IS NOT NULL
        GROUP BY psr.player_id, p.alias, cc.name, pc.level, t.name
        ORDER BY COUNT(DISTINCT sb.id) DESC
        LIMIT :limit
    """)
    rows = db.exec(sql, params={"limit": top_n}).all()
    return [dict(r._mapping) for r in rows]


CATEGORY_COMPUTERS = {
    "vanguard": _compute_vanguard,
    "alchemist": _compute_alchemist,
    "swift": _compute_swift,
    "scholar": _compute_scholar,
}


def refresh_leaderboard(category: str, db: Session, force: bool = False) -> None:
    """Refresh the leaderboard cache for a category if TTL has expired."""
    if category not in VALID_CATEGORIES:
        return

    ttl_min = _get_config(db, "leaderboard_refresh_interval_min", 5)
    top_n = _get_config(db, "leaderboard_top_n", 100)

    # Check if cache is still fresh
    if not force:
        latest = db.exec(
            select(LeaderboardCache)
            .where(LeaderboardCache.category == category)
            .order_by(LeaderboardCache.updated_at.desc())
            .limit(1)
        ).first()

        if latest and latest.updated_at:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=ttl_min)
            if latest.updated_at.replace(tzinfo=timezone.utc) > cutoff:
                return  # Cache is still fresh

    # Compute rankings
    compute_fn = CATEGORY_COMPUTERS[category]
    rankings = compute_fn(db, top_n)
    total_players = len(rankings)
    now = datetime.now(timezone.utc)

    # Clear old cache
    db.exec(text("DELETE FROM leaderboard_cache WHERE category = :cat"), params={"cat": category})

    # Insert new cache
    for idx, row in enumerate(rankings):
        rank = idx + 1
        entry = LeaderboardCache(
            category=category,
            rank=rank,
            player_id=row["player_id"],
            player_alias=row["player_alias"],
            character_class=row.get("character_class"),
            character_level=row.get("character_level"),
            equipped_title=row.get("equipped_title"),
            metric_value=Decimal(str(row["metric"])),
            badge_tier=_assign_badge_tier(rank, total_players),
            updated_at=now,
        )
        db.add(entry)

    db.flush()


def get_leaderboard(
    category: str, db: Session, page: int = 1, per_page: int = 25
) -> dict:
    """Get cached leaderboard entries with pagination."""
    refresh_leaderboard(category, db)

    total_q = db.exec(
        select(LeaderboardCache)
        .where(LeaderboardCache.category == category)
    ).all()
    total = len(total_q)

    offset = (page - 1) * per_page
    entries = db.exec(
        select(LeaderboardCache)
        .where(LeaderboardCache.category == category)
        .order_by(LeaderboardCache.rank)
        .offset(offset)
        .limit(per_page)
    ).all()

    return {
        "entries": [
            {
                "rank": e.rank,
                "player_id": e.player_id,
                "player_alias": e.player_alias,
                "character_class": e.character_class,
                "character_level": e.character_level,
                "equipped_title": e.equipped_title,
                "metric_value": float(e.metric_value),
                "badge_tier": e.badge_tier,
            }
            for e in entries
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_player_own_rank(
    category: str, player_id: int, db: Session
) -> Optional[dict]:
    """Get a specific player's rank, even if they're outside the cached top N."""
    cached = db.exec(
        select(LeaderboardCache)
        .where(
            LeaderboardCache.category == category,
            LeaderboardCache.player_id == player_id,
        )
    ).first()

    if cached:
        return {
            "rank": cached.rank,
            "player_alias": cached.player_alias,
            "character_class": cached.character_class,
            "character_level": cached.character_level,
            "equipped_title": cached.equipped_title,
            "metric_value": float(cached.metric_value),
            "badge_tier": cached.badge_tier,
        }

    # Not in cache — compute on the fly
    return None
