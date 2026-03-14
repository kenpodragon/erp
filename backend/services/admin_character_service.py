"""Admin Character Management service — character editing, item crafting, essence, progression, skills, timeline."""

import math
import random
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func, text

from models import (
    PlayerCharacter, CharacterClass, Skill, CharacterSkillLevel,
    StatDefinition, GameConfig, PlayerMetaProgression,
    Book, Chapter, Scene, BossCompletion,
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag, ItemTypeBase, ItemSuffix,
    InventoryItem, PlayerInventory,
    PlayerStorySession, PlayerAchievement, Achievement,
    ActivityEvent, AdminAuditLog, SupportTicket,
    ShardTransaction,
)
from models.admin import AdminEssenceAdjustment
from models.character_progression import (
    IdleSkillStatContribution, ClassStatAffinity, CharacterStat,
    PlayerSceneRecord, SkillPrerequisite,
)
from models.home_base import (
    CuratedArtifact, CuratedArtifactTier, ArtifactTypeBase,
    ArtifactPrefix, ArtifactSuffix, PlayerArtifact,
)
from models.progress import PlayerEssence
from models.payments import PaymentOrder
from services.character_progression import recalculate_character_stats, evaluate_prerequisites
from services.item_generator import RARITY_MULTIPLIERS, roll_within_range, derive_stat_requirements
from services.artifact_service import _compute_generated_stats, RARITY_ORDER

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_config_json(session: Session, key: str, default=None):
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    return cfg.value_json if cfg.value_json is not None else default


def _snapshot_character(character: PlayerCharacter) -> dict:
    return {
        "character_name": character.character_name,
        "level": character.level,
        "character_xp": character.character_xp,
        "class_id": character.class_id,
    }


# ---------------------------------------------------------------------------
# §2 — Character Deep Editor
# ---------------------------------------------------------------------------

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

    # Map by ID order: 1st old → 1st new
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
            # Extra new skill — start at level 1
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

    # Excess old skills — levels lost
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


# ---------------------------------------------------------------------------
# §2.3 — Stat Breakdown
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
# §3 — Item Crafting Tool
# ---------------------------------------------------------------------------

def get_item_components(session: Session) -> dict:
    """Return all item component options for crafting UI."""
    gear_slots = session.exec(select(GearSlot)).all()
    type_bases = session.exec(select(ItemTypeBase)).all()
    prefixes = session.exec(select(ItemPrefix)).all()
    qualities = session.exec(select(ItemQuality)).all()
    lore_tags = session.exec(select(ItemLoreTag)).all()
    suffixes = session.exec(select(ItemSuffix)).all()

    # Artifact components
    art_prefixes = session.exec(select(ArtifactPrefix)).all()
    art_suffixes = session.exec(select(ArtifactSuffix)).all()
    art_type_bases = session.exec(select(ArtifactTypeBase)).all()

    return {
        "gear_slots": [{"id": s.id, "name": s.name, "display_name": s.display_name} for s in gear_slots],
        "type_bases": [
            {
                "id": t.id, "code": t.code, "display_name": t.display_name,
                "gear_slot_id": t.gear_slot_id,
                "base_stat_range": t.base_stat_range or {},
            }
            for t in type_bases
        ],
        "prefixes": [
            {"id": p.id, "code": p.code, "display_name": p.display_name, "stat_bonuses": p.stat_bonuses or {}}
            for p in prefixes
        ],
        "qualities": [{"id": q.id, "code": q.code, "display_name": q.display_name} for q in qualities],
        "lore_tags": [
            {"id": l.id, "code": l.code, "display_name": l.display_name, "narrative_context": l.narrative_context or ""}
            for l in lore_tags
        ],
        "suffixes": [
            {"id": s.id, "code": s.code, "display_name": s.display_name, "stat_bonuses": s.stat_bonuses or {}}
            for s in suffixes
        ],
        "rarities": list(RARITY_MULTIPLIERS.keys()),
        "rarity_multipliers": RARITY_MULTIPLIERS,
        "artifact_prefixes": [
            {"id": p.id, "code": p.code, "display_name": p.display_name, "stat_bonuses": p.stat_bonuses or {}}
            for p in art_prefixes
        ],
        "artifact_suffixes": [
            {"id": s.id, "code": s.code, "display_name": s.display_name, "stat_bonuses": s.stat_bonuses or {}}
            for s in art_suffixes
        ],
        "artifact_type_bases": [
            {"id": t.id, "code": t.code, "display_name": t.display_name, "base_stat_range": t.base_stat_range or {}}
            for t in art_type_bases
        ],
    }


def craft_item_manual(session: Session, character: PlayerCharacter, payload: dict) -> InventoryItem:
    """Craft item with full component selection."""
    type_base = session.get(ItemTypeBase, payload["type_base_id"])
    prefix = session.get(ItemPrefix, payload["prefix_id"])
    quality = session.get(ItemQuality, payload["quality_id"])
    lore_tag = session.get(ItemLoreTag, payload["lore_tag_id"])
    suffix = session.get(ItemSuffix, payload["suffix_id"])

    if not all([type_base, prefix, quality, lore_tag, suffix]):
        raise ValueError("One or more item components not found")

    rarity = payload.get("rarity", "common")
    if rarity not in RARITY_MULTIPLIERS:
        raise ValueError(f"Invalid rarity: {rarity}")

    # Validate base_stat_values within range
    base_stat_values = payload.get("base_stat_values", {})
    if not base_stat_values:
        base_stat_values = roll_within_range(type_base.base_stat_range or {})
    else:
        for stat, value in base_stat_values.items():
            range_vals = (type_base.base_stat_range or {}).get(stat, [0, 0])
            if isinstance(range_vals, list) and len(range_vals) == 2:
                if not (range_vals[0] <= value <= range_vals[1]):
                    raise ValueError(f"{stat} value {value} outside range [{range_vals[0]}, {range_vals[1]}]")

    # Calculate final stats
    rarity_mult = RARITY_MULTIPLIERS[rarity]
    prefix_bonus = prefix.stat_bonuses or {}
    suffix_bonus = suffix.stat_bonuses or {}
    all_stats = set(list(base_stat_values.keys()) + list(prefix_bonus.keys()) + list(suffix_bonus.keys()))
    final_stats = {}
    for stat in all_stats:
        base = base_stat_values.get(stat, 0)
        pbonus = prefix_bonus.get(stat, 0)
        sbonus = suffix_bonus.get(stat, 0)
        final_stats[stat] = math.floor((base + pbonus + sbonus) * rarity_mult)

    # Build item code and name
    item_code = f"{prefix.code}_{quality.code}_{lore_tag.code}_{type_base.code}_{suffix.code}"
    name = f"{prefix.display_name} {quality.display_name} {lore_tag.display_name} {type_base.display_name} of {suffix.display_name}"

    # Level and requirements
    item_level = payload.get("item_level") or character.level
    stat_requirements = derive_stat_requirements(final_stats, rarity)

    now = datetime.now(timezone.utc)
    item = InventoryItem(
        name=name,
        description=f"A {rarity} item crafted by an admin.",
        item_type=type_base.display_name,
        rarity=rarity,
        base_stats=final_stats,
        item_code=item_code,
        item_level=item_level,
        min_char_level=max(1, item_level - 2),
        stat_requirements=stat_requirements,
        gear_slot_id=payload["gear_slot_id"],
        is_dream_item=True,
        acquired_from="admin_grant",
        created_at=now,
    )
    session.add(item)
    session.flush()
    return item


def craft_item_random(session: Session, character: PlayerCharacter, payload: dict) -> InventoryItem:
    """Craft item with random components, optional gear_slot/rarity constraints."""
    from services.item_generator import roll_gear_slot, roll_rarity

    # Gear slot
    gear_slot_id = payload.get("gear_slot_id")
    if gear_slot_id:
        slot = session.get(GearSlot, gear_slot_id)
        if not slot:
            raise ValueError(f"Gear slot {gear_slot_id} not found")
    else:
        slot = roll_gear_slot(session)

    # Rarity
    rarity = payload.get("rarity")
    if not rarity:
        rarity = roll_rarity(session, 1)

    # Random components
    item_types = session.exec(select(ItemTypeBase).where(ItemTypeBase.gear_slot_id == slot.id)).all()
    if not item_types:
        raise ValueError(f"No item types for gear slot {slot.name}")

    type_base = random.choice(item_types)
    prefix = random.choice(session.exec(select(ItemPrefix)).all())
    quality = random.choice(session.exec(select(ItemQuality)).all())
    lore_tag = random.choice(session.exec(select(ItemLoreTag)).all())
    suffix = random.choice(session.exec(select(ItemSuffix)).all())

    return craft_item_manual(session, character, {
        "gear_slot_id": slot.id,
        "type_base_id": type_base.id,
        "prefix_id": prefix.id,
        "quality_id": quality.id,
        "lore_tag_id": lore_tag.id,
        "suffix_id": suffix.id,
        "rarity": rarity,
        "item_level": character.level,
        "base_stat_values": roll_within_range(type_base.base_stat_range or {}),
    })


def grant_crafted_item(session: Session, character_id: int, item: InventoryItem) -> dict:
    """Add a crafted item to character's bag. Returns bag_warning flag."""
    bag_count = session.exec(
        select(func.count(PlayerInventory.id))
        .where(PlayerInventory.character_id == character_id)
        .where(PlayerInventory.is_equipped == False)
    ).one()

    inv = PlayerInventory(
        character_id=character_id,
        item_id=item.id,
        is_equipped=False,
        equipped_slot=None,
        quantity=1,
    )
    session.add(inv)
    session.flush()

    return {
        "inventory_id": inv.id,
        "bag_count": bag_count + 1,
        "bag_warning": bag_count >= 10,
    }


def get_character_inventory(session: Session, character_id: int) -> dict:
    """Get character's full inventory: equipped, bag, artifacts."""
    character = session.get(PlayerCharacter, character_id)
    if not character:
        return None

    inventory = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.character_id == character_id)
    ).all()

    equipped = []
    bag = []
    for inv in inventory:
        item = session.get(InventoryItem, inv.item_id)
        if not item:
            continue
        entry = {
            "inventory_id": inv.id,
            "item_id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "rarity": item.rarity,
            "base_stats": item.base_stats or {},
            "item_level": item.item_level,
            "item_code": item.item_code,
            "gear_slot_id": item.gear_slot_id,
            "is_equipped": inv.is_equipped,
            "equipped_slot": inv.equipped_slot,
        }
        if inv.is_equipped:
            equipped.append(entry)
        else:
            bag.append(entry)

    # Artifacts
    artifacts = session.exec(
        select(PlayerArtifact).where(PlayerArtifact.character_id == character_id)
    ).all()
    artifact_list = [
        {
            "id": a.id,
            "name": a.name,
            "rarity": a.rarity,
            "artifact_type": a.artifact_type,
            "artifact_code": a.artifact_code,
            "stat_bonuses": a.stat_bonuses or {},
            "curated_artifact_id": a.curated_artifact_id,
            "icon_sprite_key": a.icon_sprite_key,
        }
        for a in artifacts
    ]

    return {
        "character_id": character_id,
        "equipped": equipped,
        "bag": bag,
        "bag_count": len(bag),
        "bag_capacity": 10,
        "artifacts": artifact_list,
    }


# ---------------------------------------------------------------------------
# §3.4 — Edit Existing Item
# ---------------------------------------------------------------------------

def edit_item(session: Session, item_id: int, payload: dict) -> Optional[dict]:
    """Edit item components and recalculate stats. Returns before/after."""
    item = session.get(InventoryItem, item_id)
    if not item:
        return None

    # Parse current item_code to find components
    parts = (item.item_code or "").split("_")
    if len(parts) != 5:
        raise ValueError(f"Invalid item_code format: {item.item_code}")

    old_prefix_code, old_quality_code, old_lore_code, type_code, old_suffix_code = parts

    # Load current components by code
    prefix_map = {p.code: p for p in session.exec(select(ItemPrefix)).all()}
    quality_map = {q.code: q for q in session.exec(select(ItemQuality)).all()}
    lore_map = {l.code: l for l in session.exec(select(ItemLoreTag)).all()}
    type_map = {t.code: t for t in session.exec(select(ItemTypeBase)).all()}
    suffix_map = {s.code: s for s in session.exec(select(ItemSuffix)).all()}

    # Resolve components (use new if provided, else keep old)
    prefix = session.get(ItemPrefix, payload["prefix_id"]) if "prefix_id" in payload and payload["prefix_id"] else prefix_map.get(old_prefix_code)
    quality = session.get(ItemQuality, payload["quality_id"]) if "quality_id" in payload and payload["quality_id"] else quality_map.get(old_quality_code)
    lore_tag = session.get(ItemLoreTag, payload["lore_tag_id"]) if "lore_tag_id" in payload and payload["lore_tag_id"] else lore_map.get(old_lore_code)
    suffix = session.get(ItemSuffix, payload["suffix_id"]) if "suffix_id" in payload and payload["suffix_id"] else suffix_map.get(old_suffix_code)
    type_base = type_map.get(type_code)

    if not all([prefix, quality, lore_tag, suffix, type_base]):
        raise ValueError("Could not resolve all item components")

    rarity = payload.get("rarity", item.rarity)
    if rarity not in RARITY_MULTIPLIERS:
        raise ValueError(f"Invalid rarity: {rarity}")

    before_stats = dict(item.base_stats or {})
    before_name = item.name

    # Recalculate stats
    base_stat_values = roll_within_range(type_base.base_stat_range or {})
    rarity_mult = RARITY_MULTIPLIERS[rarity]
    prefix_bonus = prefix.stat_bonuses or {}
    suffix_bonus = suffix.stat_bonuses or {}
    all_stat_names = set(list(base_stat_values.keys()) + list(prefix_bonus.keys()) + list(suffix_bonus.keys()))
    final_stats = {}
    for stat in all_stat_names:
        base = base_stat_values.get(stat, 0)
        pb = prefix_bonus.get(stat, 0)
        sb = suffix_bonus.get(stat, 0)
        final_stats[stat] = math.floor((base + pb + sb) * rarity_mult)

    # Update item
    item.item_code = f"{prefix.code}_{quality.code}_{lore_tag.code}_{type_base.code}_{suffix.code}"
    item.name = f"{prefix.display_name} {quality.display_name} {lore_tag.display_name} {type_base.display_name} of {suffix.display_name}"
    item.rarity = rarity
    item.base_stats = final_stats
    item.stat_requirements = derive_stat_requirements(final_stats, rarity)
    session.add(item)
    session.flush()

    # If equipped, recalculate character stats
    inv = session.exec(
        select(PlayerInventory)
        .where(PlayerInventory.item_id == item_id)
        .where(PlayerInventory.is_equipped == True)
    ).first()
    if inv:
        recalculate_character_stats(session, inv.character_id)

    return {
        "item_id": item_id,
        "before": {"name": before_name, "stats": before_stats, "rarity": item.rarity},
        "after": {"name": item.name, "stats": final_stats, "rarity": rarity},
    }


def delete_item(session: Session, item_id: int) -> Optional[dict]:
    """Delete an item and its inventory entry."""
    item = session.get(InventoryItem, item_id)
    if not item:
        return None

    # Find inventory entry
    inv = session.exec(
        select(PlayerInventory).where(PlayerInventory.item_id == item_id)
    ).first()

    was_equipped = inv.is_equipped if inv else False
    character_id = inv.character_id if inv else None

    if inv:
        session.delete(inv)
    session.delete(item)
    session.flush()

    # Recalculate if was equipped
    if was_equipped and character_id:
        recalculate_character_stats(session, character_id)

    return {
        "item_id": item_id,
        "item_name": item.name,
        "was_equipped": was_equipped,
        "character_id": character_id,
    }


# ---------------------------------------------------------------------------
# §3.5 — Edit Artifact
# ---------------------------------------------------------------------------

def edit_artifact(session: Session, artifact_id: int, payload: dict) -> Optional[dict]:
    """Edit artifact components and recalculate stat bonuses."""
    artifact = session.get(PlayerArtifact, artifact_id)
    if not artifact:
        return None

    before = {
        "name": artifact.name,
        "rarity": artifact.rarity,
        "stat_bonuses": dict(artifact.stat_bonuses or {}),
    }

    if artifact.artifact_type == "curated":
        # Curated: only rarity is editable
        new_rarity = payload.get("rarity")
        if not new_rarity:
            raise ValueError("Curated artifacts only support rarity changes")

        tier = session.exec(
            select(CuratedArtifactTier).where(
                CuratedArtifactTier.curated_artifact_id == artifact.curated_artifact_id,
                CuratedArtifactTier.rarity == new_rarity,
            )
        ).first()
        if not tier:
            raise ValueError(f"No tier exists for rarity '{new_rarity}' on this curated artifact")

        artifact.rarity = new_rarity
        artifact.stat_bonuses = tier.stat_bonuses or {}

    else:
        # Generated: prefix, suffix, rarity editable
        # Parse existing artifact_code
        code_parts = (artifact.artifact_code or "").split("_")
        if len(code_parts) != 3:
            raise ValueError(f"Invalid artifact_code format: {artifact.artifact_code}")

        old_prefix_code, type_code, old_suffix_code = code_parts

        # Load component tables
        art_prefix_map = {p.code: p for p in session.exec(select(ArtifactPrefix)).all()}
        art_suffix_map = {s.code: s for s in session.exec(select(ArtifactSuffix)).all()}
        art_type_map = {t.code: t for t in session.exec(select(ArtifactTypeBase)).all()}

        prefix_code = payload.get("prefix_code", old_prefix_code)
        suffix_code = payload.get("suffix_code", old_suffix_code)
        new_rarity = payload.get("rarity", artifact.rarity)

        prefix = art_prefix_map.get(prefix_code)
        suffix = art_suffix_map.get(suffix_code)
        art_type = art_type_map.get(type_code)

        if not all([prefix, suffix, art_type]):
            raise ValueError("Could not resolve artifact components")

        # Recalculate stats
        artifact.stat_bonuses = _compute_generated_stats(session, art_type, prefix, suffix, new_rarity)
        artifact.artifact_code = f"{prefix_code}_{type_code}_{suffix_code}"
        artifact.name = f"{prefix.display_name} {art_type.display_name} {suffix.display_name}"
        artifact.rarity = new_rarity

    session.add(artifact)
    session.flush()
    recalculate_character_stats(session, artifact.character_id)

    return {
        "artifact_id": artifact_id,
        "before": before,
        "after": {
            "name": artifact.name,
            "rarity": artifact.rarity,
            "stat_bonuses": dict(artifact.stat_bonuses or {}),
        },
    }


# ---------------------------------------------------------------------------
# §4 — Currency Editor (Essence)
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
# §5 — Progression Editor
# ---------------------------------------------------------------------------

def get_content_tree(session: Session) -> dict:
    """Return book → chapter → scene tree for cascading dropdowns."""
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
# §6 — Skill Editor
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


# ---------------------------------------------------------------------------
# §7 — Activity Timeline
# ---------------------------------------------------------------------------

def get_player_timeline(
    session: Session,
    player_id: int,
    categories: list[str],
    before: Optional[datetime] = None,
    limit: int = 50,
) -> dict:
    """Aggregate player activity timeline from multiple sources."""
    if not before:
        before = datetime.now(timezone.utc)

    events = []

    # Get character IDs for this player
    characters = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).all()
    character_ids = [c.id for c in characters]

    if "gameplay" in categories:
        # Story sessions
        sessions = session.exec(
            select(PlayerStorySession)
            .where(PlayerStorySession.player_id == player_id)
            .where(PlayerStorySession.created_at < before)
            .order_by(PlayerStorySession.created_at.desc())
            .limit(limit)
        ).all()
        for s in sessions:
            scene = session.get(Scene, s.scene_id) if s.scene_id else None
            scene_title = scene.title if scene else "Unknown"

            events.append({
                "timestamp": s.created_at.isoformat() if s.created_at else None,
                "category": "gameplay",
                "type": "session_start",
                "summary": f"Started session on '{scene_title}'",
                "detail": {"session_id": str(s.id), "scene_id": s.scene_id},
            })
            if not s.is_active and s.updated_at:
                duration = (s.updated_at - s.created_at).total_seconds() if s.created_at else 0
                events.append({
                    "timestamp": s.updated_at.isoformat(),
                    "category": "gameplay",
                    "type": "session_complete",
                    "summary": f"Completed session on '{scene_title}'",
                    "detail": {
                        "session_id": str(s.id),
                        "waves_completed": s.current_wave,
                        "session_gold": s.session_gold,
                        "deaths": s.deaths,
                        "dark_ritual_multiplier": s.dark_ritual_multiplier,
                        "duration_seconds": duration,
                    },
                })

        # Achievements
        achievements = session.exec(
            select(PlayerAchievement)
            .where(PlayerAchievement.player_id == player_id)
            .where(PlayerAchievement.is_completed == True)
            .where(PlayerAchievement.earned_at < before)
            .order_by(PlayerAchievement.earned_at.desc())
            .limit(limit)
        ).all()
        for a in achievements:
            ach = session.get(Achievement, a.achievement_id)
            events.append({
                "timestamp": a.earned_at.isoformat() if a.earned_at else None,
                "category": "gameplay",
                "type": "achievement_unlocked",
                "summary": f"Unlocked '{ach.name}'" if ach else "Unlocked achievement",
                "detail": {
                    "achievement_id": a.achievement_id,
                    "category": ach.category if ach else None,
                },
            })

    if "economy" in categories:
        # Payment orders
        orders = session.exec(
            select(PaymentOrder)
            .where(PaymentOrder.player_id == player_id)
            .where(PaymentOrder.created_at < before)
            .order_by(PaymentOrder.created_at.desc())
            .limit(limit)
        ).all()
        for o in orders:
            events.append({
                "timestamp": o.created_at.isoformat() if o.created_at else None,
                "category": "economy",
                "type": "purchase",
                "summary": f"Purchase: {o.product_type} — ${o.amount_cents / 100:.2f}" if o.amount_cents else f"Purchase: {o.product_type}",
                "detail": {"order_id": o.id, "status": o.status},
            })

        # Shard transactions
        shard_txns = session.exec(
            select(ShardTransaction)
            .where(ShardTransaction.player_id == player_id)
            .where(ShardTransaction.created_at < before)
            .order_by(ShardTransaction.created_at.desc())
            .limit(limit)
        ).all()
        for t in shard_txns:
            events.append({
                "timestamp": t.created_at.isoformat() if t.created_at else None,
                "category": "economy",
                "type": "shard_transaction",
                "summary": f"Shards {t.source_type}: {'+' if t.amount > 0 else ''}{t.amount}",
                "detail": {"transaction_id": t.id, "source_type": t.source_type, "amount": t.amount},
            })

        # Essence adjustments
        if character_ids:
            essence_adjs = session.exec(
                select(AdminEssenceAdjustment)
                .where(AdminEssenceAdjustment.player_id == player_id)
                .where(AdminEssenceAdjustment.created_at < before)
                .order_by(AdminEssenceAdjustment.created_at.desc())
                .limit(limit)
            ).all()
            for ea in essence_adjs:
                sign = "+" if ea.adjustment_type == "grant" else "-"
                events.append({
                    "timestamp": ea.created_at.isoformat() if ea.created_at else None,
                    "category": "economy",
                    "type": "essence_adjustment",
                    "summary": f"Admin: Essence {ea.adjustment_type} {sign}{ea.amount} by {ea.admin_email}",
                    "detail": {
                        "amount": ea.amount, "direction": ea.adjustment_type,
                        "reason": ea.reason,
                        "balance_before": ea.balance_before, "balance_after": ea.balance_after,
                    },
                })

    if "admin" in categories:
        # Admin audit log entries targeting this player
        audit_entries = session.exec(
            select(AdminAuditLog)
            .where(AdminAuditLog.target_type == "player")
            .where(AdminAuditLog.target_id == str(player_id))
            .where(AdminAuditLog.created_at < before)
            .order_by(AdminAuditLog.created_at.desc())
            .limit(limit)
        ).all()
        # Also include character-targeted entries
        if character_ids:
            char_entries = session.exec(
                select(AdminAuditLog)
                .where(AdminAuditLog.target_type == "character")
                .where(AdminAuditLog.target_id.in_([str(cid) for cid in character_ids]))
                .where(AdminAuditLog.created_at < before)
                .order_by(AdminAuditLog.created_at.desc())
                .limit(limit)
            ).all()
            audit_entries = list(audit_entries) + list(char_entries)

        for entry in audit_entries:
            events.append({
                "timestamp": entry.created_at.isoformat() if entry.created_at else None,
                "category": "admin",
                "type": entry.action,
                "summary": f"Admin: {entry.action} by {entry.admin_email}",
                "detail": entry.details or {},
            })

    if "social" in categories:
        tickets = session.exec(
            select(SupportTicket)
            .where(SupportTicket.player_id == player_id)
            .where(SupportTicket.created_at < before)
            .order_by(SupportTicket.created_at.desc())
            .limit(limit)
        ).all()
        for t in tickets:
            events.append({
                "timestamp": t.created_at.isoformat() if t.created_at else None,
                "category": "social",
                "type": "ticket_created",
                "summary": f"Support ticket: '{t.subject}'",
                "detail": {"ticket_id": t.id, "status": t.status},
            })

    if "anticheat" in categories:
        anomalies = session.exec(
            select(ActivityEvent)
            .where(ActivityEvent.player_id == player_id)
            .where(ActivityEvent.event_type == "anti_cheat_anomaly")
            .where(ActivityEvent.created_at < before)
            .order_by(ActivityEvent.created_at.desc())
            .limit(limit)
        ).all()
        for a in anomalies:
            events.append({
                "timestamp": a.created_at.isoformat() if a.created_at else None,
                "category": "anticheat",
                "type": "anti_cheat_anomaly",
                "summary": "Anti-cheat anomaly detected",
                "detail": a.event_data or {},
            })

    # Sort all events by timestamp descending
    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)
    events = events[:limit]

    return {
        "events": events,
        "next_cursor": events[-1]["timestamp"] if events else None,
        "has_more": len(events) == limit,
    }
