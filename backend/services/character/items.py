"""Character item management — crafting, inventory, item/artifact editing."""

import math
import random
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import (
    PlayerCharacter, GearSlot, ItemPrefix, ItemQuality, ItemLoreTag,
    ItemTypeBase, ItemSuffix, InventoryItem, PlayerInventory,
)
from models.home_base import (
    CuratedArtifactTier, ArtifactTypeBase,
    ArtifactPrefix, ArtifactSuffix, PlayerArtifact,
)
from services.character_progression import recalculate_character_stats
from services.item_generator import RARITY_MULTIPLIERS, roll_within_range, derive_stat_requirements
from services.artifact_service import _compute_generated_stats

logger = logging.getLogger(__name__)


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
