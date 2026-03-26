"""Character CRUD — editing, class reassignment, equipment validation."""

import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from models import (
    PlayerCharacter, CharacterClass, Skill, CharacterSkillLevel,
    StatDefinition, InventoryItem, PlayerInventory,
)
from models.character_progression import CharacterStat
from services.character_progression import recalculate_character_stats

logger = logging.getLogger(__name__)


def _snapshot_character(character: PlayerCharacter) -> dict:
    return {
        "character_name": character.character_name,
        "level": character.level,
        "character_xp": character.character_xp,
        "class_id": character.class_id,
    }


def edit_character(
    session: Session,
    character_id: int,
    payload: dict,
) -> dict:
    """Edit character fields: name, level, xp, class_id. Returns updated character + stats."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    old_state = _snapshot_character(character)
    changes = {}

    # Simple field updates
    if "character_name" in payload and payload["character_name"] is not None:
        name = payload["character_name"].strip()
        if len(name) < 3 or len(name) > 20:
            raise ValueError("Character name must be 3–20 characters")
        character.character_name = name
        changes["character_name"] = {"old": old_state["character_name"], "new": name}

    if "level" in payload and payload["level"] is not None:
        level = max(1, min(999, int(payload["level"])))
        character.level = level
        changes["level"] = {"old": old_state["level"], "new": level}

    if "character_xp" in payload and payload["character_xp"] is not None:
        xp = max(0, float(payload["character_xp"]))
        character.character_xp = xp
        changes["character_xp"] = {"old": old_state["character_xp"], "new": xp}

    # Class reassignment (complex flow)
    skill_mapping = None
    if "class_id" in payload and payload["class_id"] is not None:
        new_class_id = int(payload["class_id"])
        if new_class_id != character.class_id:
            skill_mapping = reassign_class(session, character, new_class_id)
            changes["class_reassignment"] = skill_mapping

    character.updated_at = datetime.now(timezone.utc)
    session.add(character)
    recalculate_character_stats(session, character.id)
    session.flush()

    return {
        "character": character,
        "old_state": old_state,
        "changes": changes,
    }


def reassign_class(session: Session, character: PlayerCharacter, new_class_id: int) -> dict:
    """Reassign character class with skill mapping by ID order."""
    new_class = session.get(CharacterClass, new_class_id)
    if not new_class:
        raise ValueError(f"Target class {new_class_id} not found")

    old_class_id = character.class_id

    # Get skills categorized
    all_skills = session.exec(select(Skill)).all()
    old_exclusive = sorted(
        [s for s in all_skills if s.class_id == old_class_id and s.is_class_exclusive],
        key=lambda s: s.id,
    )
    new_exclusive = sorted(
        [s for s in all_skills if s.class_id == new_class_id and s.is_class_exclusive],
        key=lambda s: s.id,
    )

    # Get current skill levels for old exclusive skills
    old_skill_levels = {}
    if old_exclusive:
        old_csls = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == character.id)
            .where(CharacterSkillLevel.skill_id.in_([s.id for s in old_exclusive]))
        ).all()
        old_skill_levels = {csl.skill_id: (csl.level, csl.current_xp) for csl in old_csls}

    # Map by ID order: 1st old -> 1st new
    mapping = []
    for i, new_skill in enumerate(new_exclusive):
        if i < len(old_exclusive):
            old_skill = old_exclusive[i]
            old_level, old_xp = old_skill_levels.get(old_skill.id, (1, 0))

            # Delete old skill level record
            old_csl = session.exec(
                select(CharacterSkillLevel)
                .where(CharacterSkillLevel.character_id == character.id)
                .where(CharacterSkillLevel.skill_id == old_skill.id)
            ).first()
            if old_csl:
                session.delete(old_csl)

            # Create new skill level record with transferred levels
            new_csl = CharacterSkillLevel(
                character_id=character.id,
                skill_id=new_skill.id,
                level=old_level,
                current_xp=old_xp,
            )
            session.add(new_csl)
            mapping.append({
                "old_skill_id": old_skill.id, "old_skill_name": old_skill.name,
                "new_skill_id": new_skill.id, "new_skill_name": new_skill.name,
                "level_transferred": old_level, "xp_transferred": old_xp,
            })
        else:
            # Extra new skill -- start at level 1
            new_csl = CharacterSkillLevel(
                character_id=character.id,
                skill_id=new_skill.id,
                level=1,
                current_xp=0,
            )
            session.add(new_csl)
            mapping.append({
                "old_skill_id": None, "old_skill_name": None,
                "new_skill_id": new_skill.id, "new_skill_name": new_skill.name,
                "level_transferred": 1, "xp_transferred": 0,
            })

    # Excess old skills -- levels lost
    lost = []
    for i in range(len(new_exclusive), len(old_exclusive)):
        old_skill = old_exclusive[i]
        old_level, old_xp = old_skill_levels.get(old_skill.id, (1, 0))
        old_csl = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == character.id)
            .where(CharacterSkillLevel.skill_id == old_skill.id)
        ).first()
        if old_csl:
            session.delete(old_csl)
        lost.append({
            "skill_id": old_skill.id, "skill_name": old_skill.name,
            "level_lost": old_level,
        })

    character.class_id = new_class_id
    session.flush()

    # Check equipment requirements post-reassignment
    equipment_warnings = check_equipment_requirements(session, character)

    return {
        "old_class_id": old_class_id, "new_class_id": new_class_id,
        "skill_mapping": mapping, "skills_lost": lost,
        "equipment_warnings": equipment_warnings,
    }


def check_equipment_requirements(session: Session, character: PlayerCharacter) -> list[str]:
    """Check if equipped items still meet stat requirements after a change."""
    warnings = []
    equipped = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character.id)
        .where(PlayerInventory.is_equipped == True)
    ).all()

    # Get current stats
    char_stats = session.exec(
        select(CharacterStat)
        .where(CharacterStat.character_id == character.id)
    ).all()
    stat_map = {}
    for cs in char_stats:
        stat_def = session.get(StatDefinition, cs.stat_id)
        if stat_def:
            stat_map[stat_def.name] = cs.computed_total

    for eq in equipped:
        item = session.get(InventoryItem, eq.item_id)
        if item and item.stat_requirements:
            for stat_name, required in item.stat_requirements.items():
                current = stat_map.get(stat_name, 0)
                if current < required:
                    warnings.append(
                        f'"{item.name}" requires {stat_name} {required} — '
                        f"character has {current}"
                    )

    return warnings
