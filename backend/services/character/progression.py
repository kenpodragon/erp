"""Character progression — stat breakdown, essence, progression editor, boss completions, skills."""

import math
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import (
    PlayerCharacter, CharacterClass, Skill, CharacterSkillLevel,
    StatDefinition, GameConfig, PlayerMetaProgression,
    Book, Chapter, Scene, BossCompletion, PlayerInventory, InventoryItem,
)
from models.admin import AdminEssenceAdjustment
from models.character_progression import (
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat,
    PlayerSceneRecord, SkillPrerequisite,
)
from models.home_base import PlayerArtifact
from models.progress import PlayerEssence
from services.character_progression import recalculate_character_stats, evaluate_prerequisites

logger = logging.getLogger(__name__)


def _get_config_json(session: Session, key: str, default=None):
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    return cfg.value_json if cfg.value_json is not None else default


# ---------------------------------------------------------------------------
# Stat Breakdown
# ---------------------------------------------------------------------------

def get_stat_breakdown(session: Session, character_id: int) -> Optional[dict]:
    """Get full stat breakdown with 6 source detail per stat."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    char_class = session.get(CharacterClass, character.class_id)
    if not char_class:
        return None

    stats = session.exec(select(StatDefinition)).all()
    if not stats:
        return None

    # Load class affinities
    affinities = session.exec(
        select(ClassStatAffinity)
        .where(ClassStatAffinity.class_id == character.class_id)
    ).all()
    affinity_map = {a.stat_id: a for a in affinities}

    # Load idle skill contributions
    contributions = session.exec(select(IdleSkillStatContribution)).all()

    # Load character's skill levels
    skill_levels = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character_id)
    ).all()
    skill_level_map = {sl.skill_id: sl.level for sl in skill_levels}

    # Load skill definitions for names
    all_skills = session.exec(select(Skill)).all()
    skill_name_map = {s.id: s.name for s in all_skills}

    # Lore skill
    lore_skill = session.exec(select(Skill).where(Skill.name == "Lore")).first()
    lore_level = skill_level_map.get(lore_skill.id, 0) if lore_skill else 0
    lore_pool_coeff = 0.6  # default
    cfg = session.get(GameConfig, "lore_pool_coefficient")
    if cfg:
        try:
            lore_pool_coeff = float(cfg.value_json)
        except (TypeError, ValueError):
            pass
    lore_bonus_pool = math.floor(lore_level * lore_pool_coeff)

    # Load equipped items
    equipped = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character_id)
        .where(PlayerInventory.is_equipped == True)
    ).all()
    equipped_items = []
    for eq in equipped:
        item = session.get(InventoryItem, eq.item_id)
        if item:
            equipped_items.append((item, eq.equipped_slot))

    # Load artifacts
    from services.artifact_service import get_artifact_stat_totals
    artifacts = session.exec(
        select(PlayerArtifact).where(PlayerArtifact.character_id == character_id)
    ).all()

    breakdown = {}
    for stat in stats:
        aff = affinity_map.get(stat.id)

        # 1. Class base
        class_base = aff.base_value if aff else 0

        # 2. Idle training
        idle_detail = []
        idle_total = 0
        for contrib in contributions:
            if contrib.stat_id == stat.id:
                level = skill_level_map.get(contrib.idle_skill_id, 0)
                contribution = math.floor(level * float(contrib.coefficient))
                if contribution > 0 or level > 0:
                    idle_detail.append({
                        "skill_id": contrib.idle_skill_id,
                        "skill_name": skill_name_map.get(contrib.idle_skill_id, "Unknown"),
                        "level": level,
                        "contribution": contribution,
                    })
                idle_total += contribution

        # 3. Lore distribution
        lore_bonus = 0
        lore_detail = ""
        if aff and lore_bonus_pool > 0:
            lore_bonus = math.floor(lore_bonus_pool * float(aff.lore_weight))
            lore_detail = f"lore_weight={aff.lore_weight}, total_lore_level={lore_level}"

        # 4. Character level contribution
        level_bonus = 0
        if aff:
            level_bonus = math.floor(character.level * float(aff.level_bonus_per_level))

        # 5. Equipment contribution
        equip_detail = []
        equip_total = 0
        for item, slot in equipped_items:
            if isinstance(item.base_stats, dict):
                bonus = item.base_stats.get(stat.name, 0)
                if bonus > 0:
                    equip_detail.append({
                        "item_name": item.name,
                        "slot": slot,
                        "bonus": bonus,
                    })
                equip_total += bonus

        # 6. Artifact bonuses
        artifact_detail = []
        artifact_total = 0
        for art in artifacts:
            bonuses = art.stat_bonuses or {}
            bonus = bonuses.get(stat.name, 0)
            if bonus > 0:
                artifact_detail.append({
                    "artifact_name": art.name,
                    "rarity": art.rarity,
                    "bonus": bonus,
                })
            artifact_total += bonus

        total = class_base + idle_total + lore_bonus + level_bonus + equip_total + artifact_total

        breakdown[stat.name] = {
            "total": total,
            "sources": {
                "class_base": {"value": class_base, "detail": f"{char_class.name} base"},
                "idle_training": {"value": idle_total, "detail": idle_detail},
                "lore_distribution": {"value": lore_bonus, "detail": lore_detail},
                "character_level": {"value": level_bonus, "detail": f"level × {aff.level_bonus_per_level if aff else 0}"},
                "equipment": {"value": equip_total, "detail": equip_detail},
                "artifacts": {"value": artifact_total, "detail": artifact_detail},
            },
        }

    return {
        "character_id": character_id,
        "character_name": character.character_name,
        "class_name": char_class.name,
        "level": character.level,
        "stats": breakdown,
    }


# ---------------------------------------------------------------------------
# Essence
# ---------------------------------------------------------------------------

def adjust_essence(
    session: Session,
    character_id: int,
    amount: float,
    direction: str,
    reason: str,
    admin_email: str,
) -> dict:
    """Grant or debit Essence. Returns balance before/after."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        raise ValueError("Character not found")

    essence = session.exec(
        select(PlayerEssence).where(PlayerEssence.character_id == character_id)
    ).first()
    if not essence:
        raise ValueError("No essence record for character")

    meta = session.exec(
        select(PlayerMetaProgression).where(PlayerMetaProgression.player_id == character.player_id)
    ).first()

    old_balance = essence.current_balance

    if direction == "grant":
        essence.current_balance += amount
        if meta:
            meta.elysium_essence += amount
            meta.total_essence_earned += amount
    elif direction == "debit":
        if amount > essence.current_balance:
            raise ValueError(f"Debit {amount} exceeds balance {essence.current_balance}")
        essence.current_balance -= amount
        if meta:
            meta.spent_essence += amount
    else:
        raise ValueError(f"Invalid direction: {direction}")

    session.add(essence)
    if meta:
        session.add(meta)

    # Create adjustment record
    adjustment = AdminEssenceAdjustment(
        character_id=character_id,
        player_id=character.player_id,
        admin_email=admin_email,
        adjustment_type=direction,
        amount=amount,
        balance_before=old_balance,
        balance_after=essence.current_balance,
        reason=reason,
    )
    session.add(adjustment)
    session.flush()

    return {
        "balance_before": old_balance,
        "balance_after": essence.current_balance,
        "adjustment_id": adjustment.id,
    }


def get_essence_history(session: Session, character_id: int, page: int = 1, page_size: int = 10) -> dict:
    """Get admin essence adjustment history for a character."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    essence = session.exec(
        select(PlayerEssence).where(PlayerEssence.character_id == character_id)
    ).first()

    total = session.exec(
        select(func.count(AdminEssenceAdjustment.id))
        .where(AdminEssenceAdjustment.character_id == character_id)
    ).one()

    adjustments = session.exec(
        select(AdminEssenceAdjustment)
        .where(AdminEssenceAdjustment.character_id == character_id)
        .order_by(AdminEssenceAdjustment.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "current_balance": essence.current_balance if essence else 0,
        "adjustments": [
            {
                "id": a.id,
                "admin_email": a.admin_email,
                "adjustment_type": a.adjustment_type,
                "amount": a.amount,
                "balance_before": a.balance_before,
                "balance_after": a.balance_after,
                "reason": a.reason,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in adjustments
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ---------------------------------------------------------------------------
# Progression Editor
# ---------------------------------------------------------------------------

def get_content_tree(session: Session) -> dict:
    """Return book -> chapter -> scene tree for cascading dropdowns."""
    books = session.exec(select(Book).order_by(Book.book_number)).all()
    tree = []
    for book in books:
        chapters = session.exec(
            select(Chapter)
            .where(Chapter.book_id == book.id)
            .order_by(Chapter.chapter_number)
        ).all()
        chapter_list = []
        for ch in chapters:
            scenes = session.exec(
                select(Scene)
                .where(Scene.chapter_id == ch.id)
                .order_by(Scene.sort_order)
            ).all()
            chapter_list.append({
                "id": ch.id,
                "chapter_number": ch.chapter_number,
                "title": ch.title,
                "scenes": [
                    {"id": s.id, "scene_number": s.scene_number, "title": s.title, "scene_type": s.scene_type}
                    for s in scenes
                ],
            })
        tree.append({
            "id": book.id,
            "book_number": book.book_number,
            "title": book.title,
            "chapters": chapter_list,
        })
    return {"books": tree}


def set_progression(
    session: Session,
    character_id: int,
    target_book: int,
    target_chapter: int,
    target_scene: int,
) -> dict:
    """Set a character's progression position with backfill for forward jumps."""
    from models.progress import PlayerProgress

    character = session.get(PlayerCharacter, character_id)
    if not character:
        raise ValueError("Character not found")

    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.character_id == character_id)
    ).first()
    if not progress:
        raise ValueError("No progress record for character")

    old_position = (progress.book_number, progress.chapter_number, progress.scene_number)
    new_position = (target_book, target_chapter, target_scene)

    # Validate target exists
    target_scene_obj = session.exec(
        select(Scene).join(Chapter).join(Book)
        .where(Book.book_number == target_book)
        .where(Chapter.chapter_number == target_chapter)
        .where(Scene.scene_number == target_scene)
    ).first()
    if not target_scene_obj:
        raise ValueError("Target scene not found")

    direction = "forward" if new_position > old_position else "backward"

    scenes_backfilled = 0
    bosses_backfilled = 0

    if direction == "forward":
        # Get all scenes before target
        all_scenes = session.exec(
            select(Scene).join(Chapter).join(Book)
            .order_by(Book.book_number, Chapter.chapter_number, Scene.sort_order)
        ).all()

        now = datetime.now(timezone.utc)
        for scene in all_scenes:
            ch = session.get(Chapter, scene.chapter_id)
            if not ch:
                continue
            bk = session.get(Book, ch.book_id)
            if not bk:
                continue

            scene_pos = (bk.book_number, ch.chapter_number, scene.scene_number)
            if scene_pos >= new_position:
                break

            # Backfill PlayerSceneRecord
            existing = session.exec(
                select(PlayerSceneRecord)
                .where(PlayerSceneRecord.player_id == character.player_id)
                .where(PlayerSceneRecord.scene_id == scene.id)
            ).first()
            if not existing:
                record = PlayerSceneRecord(
                    player_id=character.player_id,
                    scene_id=scene.id,
                    first_completed_at=now,
                    best_wave=1,
                    best_time_seconds=0,
                    total_enemies_killed=0,
                    total_runs=1,
                )
                session.add(record)
                scenes_backfilled += 1

            # Backfill boss completions
            if scene.scene_type in ("chapter_boss", "book_boss"):
                existing_boss = session.exec(
                    select(BossCompletion)
                    .where(BossCompletion.player_id == character.player_id)
                    .where(BossCompletion.scene_id == scene.id)
                ).first()
                if not existing_boss:
                    boss = BossCompletion(
                        player_id=character.player_id,
                        scene_id=scene.id,
                        boss_type=scene.scene_type,
                        chapter_id=scene.chapter_id,
                        book_id=ch.book_id if scene.scene_type == "book_boss" else None,
                        completed_at=now,
                    )
                    session.add(boss)
                    bosses_backfilled += 1

    # Update progress
    progress.book_number = target_book
    progress.chapter_number = target_chapter
    progress.scene_number = target_scene
    session.add(progress)
    session.flush()

    return {
        "old_position": {"book": old_position[0], "chapter": old_position[1], "scene": old_position[2]},
        "new_position": {"book": target_book, "chapter": target_chapter, "scene": target_scene},
        "direction": direction,
        "scenes_backfilled": scenes_backfilled,
        "bosses_backfilled": bosses_backfilled,
    }


def get_boss_completions(session: Session, character_id: int) -> Optional[list]:
    """Get all boss completions for a character's player."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    completions = session.exec(
        select(BossCompletion)
        .where(BossCompletion.player_id == character.player_id)
        .order_by(BossCompletion.completed_at.desc())
    ).all()

    result = []
    for bc in completions:
        scene = session.get(Scene, bc.scene_id)
        ch = session.get(Chapter, bc.chapter_id) if bc.chapter_id else None
        bk = session.get(Book, bc.book_id) if bc.book_id else None
        if not scene:
            continue
        if not ch:
            ch = session.get(Chapter, scene.chapter_id) if scene.chapter_id else None
        if not bk and ch:
            bk = session.get(Book, ch.book_id) if ch.book_id else None

        result.append({
            "scene_id": bc.scene_id,
            "scene_title": scene.title if scene else "Unknown",
            "scene_type": bc.boss_type,
            "chapter_title": ch.title if ch else "Unknown",
            "book_title": bk.title if bk else "Unknown",
            "completed_at": bc.completed_at.isoformat() if bc.completed_at else None,
        })

    return result


def reset_boss_completions(session: Session, character_id: int, scene_ids: list[int]) -> int:
    """Delete boss completions for given scene_ids. Returns count deleted."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        raise ValueError("Character not found")

    deleted = 0
    for scene_id in scene_ids:
        bc = session.exec(
            select(BossCompletion)
            .where(BossCompletion.player_id == character.player_id)
            .where(BossCompletion.scene_id == scene_id)
        ).first()
        if bc:
            session.delete(bc)
            deleted += 1
    session.flush()
    return deleted


# ---------------------------------------------------------------------------
# Skill Editor
# ---------------------------------------------------------------------------

def get_character_skills(session: Session, character_id: int) -> Optional[list]:
    """Get all skills with levels and prerequisite status."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    all_skills = session.exec(select(Skill)).all()

    # Load character skill levels
    skill_levels = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character_id)
    ).all()
    skill_level_map = {sl.skill_id: sl for sl in skill_levels}

    result = []
    for skill in all_skills:
        # Only show skills relevant to this class (universal + class exclusive for this class)
        if skill.is_class_exclusive and skill.class_id != character.class_id:
            continue

        sl = skill_level_map.get(skill.id)
        prereq_check = evaluate_prerequisites(session, character_id, skill.id)

        # Get prerequisite details
        prereqs = session.exec(
            select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill.id)
        ).all()
        prereq_list = []
        for p in prereqs:
            if p.prerequisite_type == "idle_skill_level":
                req_skill = session.get(Skill, p.ref_id)
                req_sl = skill_level_map.get(p.ref_id)
                prereq_list.append({
                    "skill_id": p.ref_id,
                    "skill_name": req_skill.name if req_skill else "Unknown",
                    "required_level": p.min_value,
                    "current_level": req_sl.level if req_sl else 0,
                    "met": (req_sl.level if req_sl else 0) >= p.min_value,
                })

        result.append({
            "skill_id": skill.id,
            "skill_name": skill.name,
            "category": skill.category,
            "class_exclusive": skill.is_class_exclusive,
            "current_level": sl.level if sl else None,
            "current_xp": sl.current_xp if sl else None,
            "has_skill_record": sl is not None,
            "prerequisites_met": prereq_check["met"],
            "prerequisites": prereq_list,
        })

    return result


def update_character_skills(
    session: Session,
    character_id: int,
    updates: list[dict],
) -> list[dict]:
    """Batch update skill levels/XP with prerequisite enforcement."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        raise ValueError("Character not found")

    results = []
    for update in updates:
        skill_id = update["skill_id"]
        skill = session.get(Skill, skill_id)
        if not skill:
            raise ValueError(f"Skill {skill_id} not found")

        # Check prerequisites
        prereq_check = evaluate_prerequisites(session, character_id, skill_id)
        if not prereq_check["met"]:
            raise ValueError(f"Skill '{skill.name}' has unmet prerequisites")

        # Get or create CharacterSkillLevel
        csl = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == character_id)
            .where(CharacterSkillLevel.skill_id == skill_id)
        ).first()

        old_level = csl.level if csl else None
        old_xp = csl.current_xp if csl else None

        new_level = max(1, min(999, int(update.get("level", 1))))
        new_xp = max(0, float(update.get("xp", 0)))

        if csl:
            csl.level = new_level
            csl.current_xp = new_xp
            session.add(csl)
        else:
            csl = CharacterSkillLevel(
                character_id=character_id,
                skill_id=skill_id,
                level=new_level,
                current_xp=new_xp,
            )
            session.add(csl)

        results.append({
            "skill_id": skill_id, "skill_name": skill.name,
            "old_level": old_level, "new_level": new_level,
            "old_xp": old_xp, "new_xp": new_xp,
        })

    recalculate_character_stats(session, character_id)
    session.flush()
    return results
