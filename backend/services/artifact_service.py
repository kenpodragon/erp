"""Artifact generation and drop evaluation service (2.7.0)."""

import math
import random
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import GameConfig, Chapter, Book, Scene
from models.home_base import (
    CuratedArtifact, CuratedArtifactTier, ArtifactTypeBase,
    ArtifactPrefix, ArtifactSuffix, PlayerArtifact,
)
from models.character_progression import PlayerSceneRecord

logger = logging.getLogger(__name__)

# Rarity ordering for comparison
RARITY_ORDER = {"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "cosmic": 4}
RARITY_LIST = ["common", "uncommon", "rare", "epic", "cosmic"]


def _get_config_json(session: Session, key: str, default=None):
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    return cfg.value_json if cfg.value_json is not None else default


def _get_book_number(session: Session, chapter_id: Optional[int]) -> int:
    """Resolve book_number from a chapter_id."""
    if not chapter_id:
        return 1
    chapter = session.get(Chapter, chapter_id)
    if not chapter:
        return 1
    book = session.get(Book, chapter.book_id)
    return book.book_number if book else 1


# =============================================================================
# Generated Artifact Pipeline
# =============================================================================

def roll_artifact_rarity(session: Session, book_number: int) -> str:
    """Weighted random rarity selection for generated artifacts."""
    config_key = f"artifact_rarity_weight_book_{book_number}"
    default = {"common": 70, "uncommon": 20, "rare": 8, "epic": 1.8, "cosmic": 0.2}
    weights = _get_config_json(session, config_key, default)

    rarities = list(weights.keys())
    rarity_weights = [float(w) for w in weights.values()]
    return random.choices(rarities, weights=rarity_weights, k=1)[0]


def generate_artifact(
    session: Session,
    player_id: int,
    character_id: int,
    chapter_id: Optional[int],
    acquired_from: str = "scene_complete",
) -> Optional[PlayerArtifact]:
    """Generate a procedural artifact from component tables.

    Returns the PlayerArtifact if successfully created/upgraded, or None if
    the artifact was a duplicate at the same or higher rarity (discarded).
    """
    book_number = _get_book_number(session, chapter_id)

    # Load components
    type_bases = session.exec(select(ArtifactTypeBase)).all()
    prefixes = session.exec(select(ArtifactPrefix)).all()
    suffixes = session.exec(select(ArtifactSuffix)).all()

    if not all([type_bases, prefixes, suffixes]):
        logger.warning("Artifact component tables not seeded — skipping generation")
        return None

    # Roll rarity
    rarity = roll_artifact_rarity(session, book_number)

    # Select components
    art_type = random.choice(type_bases)
    prefix = random.choice(prefixes)
    suffix = random.choice(suffixes)

    # Generate artifact code
    artifact_code = f"{prefix.code}_{art_type.code}_{suffix.code}"

    # Check ownership
    existing = session.exec(
        select(PlayerArtifact).where(
            PlayerArtifact.character_id == character_id,
            PlayerArtifact.artifact_code == artifact_code,
        )
    ).first()

    if existing:
        existing_rank = RARITY_ORDER.get(existing.rarity, 0)
        new_rank = RARITY_ORDER.get(rarity, 0)
        if new_rank <= existing_rank:
            # Same or lower rarity — discard
            return None
        # Upgrade: update existing row
        existing.rarity = rarity
        existing.stat_bonuses = _compute_generated_stats(
            session, art_type, prefix, suffix, rarity
        )
        existing.is_new = True
        session.add(existing)
        session.flush()
        return existing

    # Compute stats
    stat_bonuses = _compute_generated_stats(session, art_type, prefix, suffix, rarity)

    # Build display name
    display_name = f"{prefix.display_name} {art_type.display_name} {suffix.display_name}"

    now = datetime.now(timezone.utc)
    artifact = PlayerArtifact(
        player_id=player_id,
        character_id=character_id,
        artifact_type="generated",
        artifact_code=artifact_code,
        name=display_name,
        rarity=rarity,
        icon_sprite_key=f"artifact_gen_{art_type.code.lower()}",
        stat_bonuses=stat_bonuses,
        acquired_from=acquired_from,
        is_new=True,
        acquired_at=now,
    )
    session.add(artifact)
    session.flush()
    return artifact


def _compute_generated_stats(
    session: Session,
    art_type: ArtifactTypeBase,
    prefix: ArtifactPrefix,
    suffix: ArtifactSuffix,
    rarity: str,
) -> dict:
    """Compute stat bonuses for a generated artifact."""
    multipliers = _get_config_json(
        session, "artifact_rarity_stat_multiplier",
        {"common": 1.0, "uncommon": 1.2, "rare": 1.5, "epic": 2.0, "cosmic": 3.0}
    )
    rarity_mult = float(multipliers.get(rarity, 1.0))

    # Roll base stats from type range
    base_stats = {}
    base_range = art_type.base_stat_range or {}
    for stat, range_val in base_range.items():
        if isinstance(range_val, list) and len(range_val) == 2:
            base_stats[stat] = random.randint(range_val[0], range_val[1])
        elif isinstance(range_val, (int, float)):
            base_stats[stat] = int(range_val)

    # Merge prefix + suffix bonuses
    prefix_bonus = prefix.stat_bonuses or {}
    suffix_bonus = suffix.stat_bonuses or {}

    all_stats = set(list(base_stats.keys()) + list(prefix_bonus.keys()) + list(suffix_bonus.keys()))
    final = {}
    for stat in all_stats:
        base = base_stats.get(stat, 0)
        pb = prefix_bonus.get(stat, 0)
        sb = suffix_bonus.get(stat, 0)
        val = math.floor((base + pb + sb) * rarity_mult)
        if val > 0:
            final[stat] = val

    return final


# =============================================================================
# Curated Artifact Drop Evaluation
# =============================================================================

def evaluate_curated_drops(
    session: Session,
    player_id: int,
    character_id: int,
    scene_id: Optional[int] = None,
    chapter_id: Optional[int] = None,
    is_boss: bool = False,
    rare_spawn_kill_count: int = 0,
) -> list[dict]:
    """Evaluate curated artifact drop chances at session completion.

    Returns list of dicts describing dropped/upgraded artifacts for
    PostBattleSummary display.
    """
    drops = []

    # 1. Boss-sourced artifacts
    if is_boss and scene_id:
        boss_artifacts = session.exec(
            select(CuratedArtifact).where(
                CuratedArtifact.source_type == "boss",
                CuratedArtifact.source_id == scene_id,
                CuratedArtifact.is_active == True,
            )
        ).all()
        for ca in boss_artifacts:
            result = _try_curated_drop(session, ca, player_id, character_id, "boss_drop")
            if result:
                drops.append(result)

    # 2. Chapter-sourced artifacts (chapter mastery check)
    if chapter_id:
        mastery = _check_chapter_mastery(session, player_id, chapter_id)
        if mastery:
            chapter_artifacts = session.exec(
                select(CuratedArtifact).where(
                    CuratedArtifact.source_type == "chapter",
                    CuratedArtifact.is_active == True,
                )
            ).all()
            # Filter to artifacts whose source_hint mentions this chapter
            # (source_id isn't set for all — use app-level matching)
            for ca in chapter_artifacts:
                if ca.source_id and ca.source_id == chapter_id:
                    result = _try_curated_drop(session, ca, player_id, character_id, "chapter_mastery")
                    if result:
                        drops.append(result)

    # 3. Rare-spawn-sourced artifacts
    if rare_spawn_kill_count > 0:
        rare_artifacts = session.exec(
            select(CuratedArtifact).where(
                CuratedArtifact.source_type == "rare_spawn",
                CuratedArtifact.is_active == True,
            )
        ).all()
        for ca in rare_artifacts:
            # Each rare spawn kill is one evaluation chance
            for _ in range(rare_spawn_kill_count):
                result = _try_curated_drop(session, ca, player_id, character_id, "rare_spawn")
                if result:
                    drops.append(result)
                    break  # One drop per artifact per session

    return drops


def _try_curated_drop(
    session: Session,
    curated: CuratedArtifact,
    player_id: int,
    character_id: int,
    acquired_from: str,
) -> Optional[dict]:
    """Attempt to drop a curated artifact, rolling from Cosmic down to Common.

    Returns a dict describing the drop for response payload, or None.
    """
    # Load tiers ordered Cosmic -> Common
    tiers = session.exec(
        select(CuratedArtifactTier).where(
            CuratedArtifactTier.curated_artifact_id == curated.id
        )
    ).all()

    if not tiers:
        return None

    # Sort by rarity: cosmic first
    tier_map = {t.rarity: t for t in tiers}

    # Check existing ownership
    existing = session.exec(
        select(PlayerArtifact).where(
            PlayerArtifact.character_id == character_id,
            PlayerArtifact.curated_artifact_id == curated.id,
        )
    ).first()

    existing_rank = RARITY_ORDER.get(existing.rarity, -1) if existing else -1

    # Roll from highest rarity down
    for rarity in reversed(RARITY_LIST):
        tier = tier_map.get(rarity)
        if not tier:
            continue

        rarity_rank = RARITY_ORDER[rarity]
        if rarity_rank <= existing_rank:
            continue  # Already own at this rarity or higher

        drop_chance = float(curated.base_drop_chance) * float(tier.drop_chance_multiplier)
        if random.random() < drop_chance:
            # Drop succeeded at this rarity
            is_upgrade = existing is not None
            stat_bonuses = tier.stat_bonuses or {}

            if is_upgrade:
                # Upgrade existing artifact
                existing.rarity = rarity
                existing.stat_bonuses = stat_bonuses
                existing.is_new = True
                session.add(existing)
                session.flush()
                artifact_id = existing.id
            else:
                # Grant new artifact
                now = datetime.now(timezone.utc)
                pa = PlayerArtifact(
                    player_id=player_id,
                    character_id=character_id,
                    artifact_type="curated",
                    curated_artifact_id=curated.id,
                    name=curated.name,
                    rarity=rarity,
                    icon_sprite_key=curated.icon_sprite_key,
                    stat_bonuses=stat_bonuses,
                    acquired_from=acquired_from,
                    is_new=True,
                    acquired_at=now,
                )
                session.add(pa)
                session.flush()
                artifact_id = pa.id

            return {
                "id": artifact_id,
                "name": curated.name,
                "rarity": rarity,
                "type": "curated",
                "is_upgrade": is_upgrade,
                "stat_bonuses": stat_bonuses,
                "icon_sprite_key": curated.icon_sprite_key,
            }

    return None


def _check_chapter_mastery(session: Session, player_id: int, chapter_id: int) -> bool:
    """Check if the player has completed all non-boss scenes in a chapter."""
    # Get all non-boss scenes in the chapter
    all_scenes = session.exec(
        select(Scene.id).where(
            Scene.chapter_id == chapter_id,
            Scene.scene_type == "normal",
        )
    ).all()

    if not all_scenes:
        return False

    # Get player's completed scenes
    completed = session.exec(
        select(PlayerSceneRecord.scene_id).where(
            PlayerSceneRecord.player_id == player_id,
            PlayerSceneRecord.scene_id.in_(all_scenes),
        )
    ).all()

    return len(completed) >= len(all_scenes)


# =============================================================================
# Full Artifact Evaluation (called from /complete)
# =============================================================================

def evaluate_artifact_drops(
    session: Session,
    player_id: int,
    character_id: int,
    scene_id: int,
    chapter_id: int,
    is_boss: bool = False,
    rare_spawn_kill_count: int = 0,
) -> list[dict]:
    """Full artifact evaluation: curated drops + generated artifact roll.

    Returns list of drop info dicts for PostBattleSummary display.
    """
    all_drops = []

    # 1. Curated artifact evaluation
    curated_drops = evaluate_curated_drops(
        session, player_id, character_id,
        scene_id=scene_id, chapter_id=chapter_id,
        is_boss=is_boss, rare_spawn_kill_count=rare_spawn_kill_count,
    )
    all_drops.extend(curated_drops)

    # 2. Generated artifact roll
    if is_boss:
        drop_chance_key = "artifact_gen_drop_chance_boss"
    else:
        drop_chance_key = "artifact_gen_drop_chance_scene"

    drop_chance = float(_get_config_json(session, drop_chance_key, 0.05))

    # Check chapter mastery for higher drop chance
    mastery = _check_chapter_mastery(session, player_id, chapter_id)
    if mastery:
        mastery_chance = float(_get_config_json(
            session, "artifact_gen_drop_chance_mastery", 0.30
        ))
        drop_chance = max(drop_chance, mastery_chance)

    if random.random() < drop_chance:
        acquired_from = "boss_drop" if is_boss else "scene_complete"
        artifact = generate_artifact(
            session, player_id, character_id, chapter_id,
            acquired_from=acquired_from,
        )
        if artifact:
            all_drops.append({
                "id": artifact.id,
                "name": artifact.name,
                "rarity": artifact.rarity,
                "type": "generated",
                "is_upgrade": False,  # generate_artifact handles upgrades internally
                "stat_bonuses": artifact.stat_bonuses or {},
                "icon_sprite_key": artifact.icon_sprite_key,
            })

    return all_drops


# =============================================================================
# Artifact Stat Aggregation (for recalculate_character_stats)
# =============================================================================

def get_artifact_stat_totals(character_id: int, session: Session) -> dict:
    """Sum all artifact stat bonuses for a character.

    Returns dict like {"strength": 12, "agility": 5, "crit_chance_pct": 2.0}
    """
    artifacts = session.exec(
        select(PlayerArtifact).where(
            PlayerArtifact.character_id == character_id,
        )
    ).all()

    totals = {}
    for art in artifacts:
        bonuses = art.stat_bonuses or {}
        for stat, value in bonuses.items():
            totals[stat] = totals.get(stat, 0) + value

    return totals
