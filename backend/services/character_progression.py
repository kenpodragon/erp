"""Character Progression services — stat calculation, XP accrual, level-up, prerequisites."""

import math
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from models import (
    PlayerCharacter, CharacterClass, GameConfig,
    Skill, CharacterSkillLevel, StatDefinition,
)
from models.character_progression import (
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat,
    PlayerSceneRecord, SkillPrerequisite,
)
from models.inventory import PlayerInventory, InventoryItem

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_config(session: Session, key: str, default, val_type=float):
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return val_type(cfg.value_json)
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------------------
# Stat Calculation Engine (Design §1.1–§1.7)
# ---------------------------------------------------------------------------

def recalculate_character_stats(session: Session, character_id: int) -> dict[str, int]:
    """Recompute all stats for a character and upsert into character_stats.

    Returns dict of {stat_name: computed_total}.
    """
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return {}

    char_class = session.get(CharacterClass, character.class_id)
    if not char_class:
        return {}

    # Load all stat definitions
    stats = session.exec(select(StatDefinition)).all()
    if not stats:
        return {}

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

    # Load Lore skill level
    lore_skill = session.exec(select(Skill).where(Skill.name == "Lore")).first()
    lore_level = skill_level_map.get(lore_skill.id, 0) if lore_skill else 0
    lore_pool_coeff = _get_config(session, "lore_pool_coefficient", 0.6)
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
        if item and item.base_stats:
            equipped_items.append(item)

    results = {}
    now = datetime.now(timezone.utc)

    for stat in stats:
        aff = affinity_map.get(stat.id)

        # 1. Class base
        base = aff.base_value if aff else 0

        # 2. Idle training contribution (Attack→STR, Precision→AGI, Magic→INT)
        idle_bonus = 0
        for contrib in contributions:
            if contrib.stat_id == stat.id:
                level = skill_level_map.get(contrib.idle_skill_id, 0)
                idle_bonus += math.floor(level * float(contrib.coefficient))

        # 3. Lore distribution (class-specific weights)
        lore_bonus = 0
        if aff and lore_bonus_pool > 0:
            lore_bonus = math.floor(lore_bonus_pool * float(aff.lore_weight))

        # 4. Character level contribution
        level_bonus = 0
        if aff:
            level_bonus = math.floor(character.level * float(aff.level_bonus_per_level))

        # 5. Equipment contribution
        equip_bonus = 0
        for item in equipped_items:
            if isinstance(item.base_stats, dict):
                equip_bonus += item.base_stats.get(stat.name, 0)

        total = base + idle_bonus + lore_bonus + level_bonus + equip_bonus

        # Upsert character_stats
        existing = session.exec(
            select(CharacterStat)
            .where(CharacterStat.character_id == character_id)
            .where(CharacterStat.stat_id == stat.id)
        ).first()

        if existing:
            existing.computed_total = total
            existing.last_computed_at = now
            session.add(existing)
        else:
            session.add(CharacterStat(
                character_id=character_id,
                stat_id=stat.id,
                computed_total=total,
                last_computed_at=now,
            ))

        results[stat.name] = total

    session.flush()
    return results


# ---------------------------------------------------------------------------
# Character XP & Level-Up (Design §2.1–§2.3)
# ---------------------------------------------------------------------------

def xp_to_reach_level(level: int) -> int:
    """Quadratic curve: XP_to_reach(N) = K × N²."""
    # K defaults to 1000 but we pass it in where needed
    return 1000 * level * level


def get_character_level(character_xp: int, k: int = 1000) -> int:
    """Derive level from cumulative character XP. XP_to_reach(N) = K*N²."""
    if character_xp <= 0:
        return 1
    level = int(math.sqrt(character_xp / k))
    # Clamp to 99
    return min(max(level, 1), 99)


def award_character_xp(
    session: Session,
    character: PlayerCharacter,
    xp_amount: int,
) -> dict:
    """Add character XP and handle level-up. Returns info about the award."""
    k = int(_get_config(session, "char_level_xp_factor", 1000, int))
    cap = int(_get_config(session, "char_level_cap", 99, int))

    old_level = character.level
    character.character_xp += xp_amount

    new_level = get_character_level(character.character_xp, k)
    new_level = min(new_level, cap)

    leveled_up = new_level > old_level
    if leveled_up:
        character.level = new_level
        # Recalculate stats since level changed
        recalculate_character_stats(session, character.id)

    character.updated_at = datetime.now(timezone.utc)
    session.add(character)

    return {
        "xp_awarded": xp_amount,
        "total_xp": character.character_xp,
        "old_level": old_level,
        "new_level": new_level,
        "leveled_up": leveled_up,
        "xp_to_next": xp_to_reach_level(new_level + 1) - character.character_xp if new_level < cap else 0,
    }


def award_idle_xp_char_xp(session: Session, character: PlayerCharacter, idle_xp_earned: float) -> dict:
    """Convert idle training XP to character XP using the configured ratio."""
    ratio = _get_config(session, "idle_to_char_xp_ratio", 0.1)
    char_xp = max(1, int(idle_xp_earned * ratio))
    return award_character_xp(session, character, char_xp)


def award_scene_completion_char_xp(session: Session, character: PlayerCharacter) -> dict:
    """Award flat character XP for completing a story mode scene."""
    base_xp = int(_get_config(session, "char_xp_per_scene_base", 50, int))
    return award_character_xp(session, character, base_xp)


# ---------------------------------------------------------------------------
# Player Scene Records (Design §2.8 / Schema §2.8)
# ---------------------------------------------------------------------------

def upsert_scene_record(
    session: Session,
    player_id: int,
    scene_id: int,
    wave: int,
    time_seconds: int | None = None,
    enemies_killed: int = 0,
) -> PlayerSceneRecord:
    """Upsert personal bests for a scene."""
    record = session.exec(
        select(PlayerSceneRecord)
        .where(PlayerSceneRecord.player_id == player_id)
        .where(PlayerSceneRecord.scene_id == scene_id)
    ).first()

    now = datetime.now(timezone.utc)

    if record:
        record.best_wave = max(record.best_wave, wave)
        if time_seconds is not None:
            if record.best_time_seconds is None:
                record.best_time_seconds = time_seconds
            else:
                record.best_time_seconds = min(record.best_time_seconds, time_seconds)
        record.total_enemies_killed += enemies_killed
        record.total_runs += 1
        if record.first_completed_at is None and wave > 0:
            record.first_completed_at = now
        record.updated_at = now
    else:
        record = PlayerSceneRecord(
            player_id=player_id,
            scene_id=scene_id,
            best_wave=wave,
            best_time_seconds=time_seconds,
            total_enemies_killed=enemies_killed,
            total_runs=1,
            first_completed_at=now if wave > 0 else None,
            updated_at=now,
        )
        session.add(record)

    session.flush()
    return record


# ---------------------------------------------------------------------------
# Prerequisite Evaluation (Design §5.1 — AND-gated)
# ---------------------------------------------------------------------------

def evaluate_prerequisites(
    session: Session,
    character_id: int,
    skill_id: int,
) -> dict:
    """Check if a character meets all prerequisites for a skill.

    Returns: {"met": bool, "details": [{"type": ..., "required": ..., "current": ..., "met": bool}]}
    """
    prereqs = session.exec(
        select(SkillPrerequisite)
        .where(SkillPrerequisite.skill_id == skill_id)
    ).all()

    if not prereqs:
        return {"met": True, "details": []}

    character = session.get(PlayerCharacter, character_id)
    if not character:
        return {"met": False, "details": []}

    # Load skill levels for this character
    skill_levels = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character_id)
    ).all()
    skill_level_map = {sl.skill_id: sl for sl in skill_levels}

    # Load computed stats
    char_stats = session.exec(
        select(CharacterStat)
        .where(CharacterStat.character_id == character_id)
    ).all()
    stat_map = {cs.stat_id: cs.computed_total for cs in char_stats}

    # Load scene completions (for scene_cleared prereqs)
    from models.character_progression import PlayerSceneRecord
    scene_records = session.exec(
        select(PlayerSceneRecord)
        .where(PlayerSceneRecord.player_id == character.player_id)
    ).all()
    cleared_scenes = {sr.scene_id for sr in scene_records if sr.first_completed_at is not None}

    details = []
    all_met = True

    for p in prereqs:
        met = False
        current = 0

        if p.prerequisite_type == "idle_skill_level":
            sl = skill_level_map.get(p.ref_id)
            current = sl.level if sl else 0
            met = current >= p.min_value

        elif p.prerequisite_type == "active_skill_level":
            sl = skill_level_map.get(p.ref_id)
            current = sl.max_session_level if sl else 0
            met = current >= p.min_value

        elif p.prerequisite_type == "stat_value":
            current = stat_map.get(p.ref_id, 0)
            met = current >= p.min_value

        elif p.prerequisite_type == "character_level":
            current = character.level
            met = current >= p.min_value

        elif p.prerequisite_type == "scene_cleared":
            current = 1 if p.ref_id in cleared_scenes else 0
            met = current >= 1

        if not met:
            all_met = False

        details.append({
            "type": p.prerequisite_type,
            "ref_id": p.ref_id,
            "required": p.min_value,
            "current": current,
            "met": met,
            "hint": p.display_hint,
        })

    return {"met": all_met, "details": details}


def get_skill_tree(session: Session, character_id: int) -> list[dict]:
    """Build full skill tree with lock/unlock status for a character."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return []

    # Get all skills visible to this character's class
    all_skills = session.exec(select(Skill)).all()
    visible_skills = [
        s for s in all_skills
        if not s.is_class_exclusive or s.class_id == character.class_id
    ]

    # Load character skill levels
    skill_levels = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character_id)
    ).all()
    skill_level_map = {sl.skill_id: sl for sl in skill_levels}

    result = []
    for skill in visible_skills:
        sl = skill_level_map.get(skill.id)
        prereq_check = evaluate_prerequisites(session, character_id, skill.id)

        # Level 0 check
        at_level_0 = False
        if skill.level_0_xp_requirement > 0:
            current_xp = sl.current_xp if sl else 0
            current_level = sl.level if sl else 0
            at_level_0 = current_level == 0 and current_xp < skill.level_0_xp_requirement

        result.append({
            "skill_id": skill.id,
            "name": skill.name,
            "display_name": skill.display_name or skill.name,
            "category": skill.category,
            "description": skill.description,
            "is_class_exclusive": skill.is_class_exclusive,
            "effect_type": skill.effect_type,
            "idle_level": sl.level if sl else 0,
            "idle_xp": sl.current_xp if sl else 0,
            "max_session_level": sl.max_session_level if sl else 0,
            "prerequisites_met": prereq_check["met"],
            "prerequisites": prereq_check["details"],
            "at_level_0": at_level_0,
            "level_0_xp_requirement": skill.level_0_xp_requirement,
            "idle_level_scaling": skill.idle_level_scaling,
        })

    return result
