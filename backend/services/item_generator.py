"""Dream Item generator — procedural item creation from component tables."""

import math
import random
import logging
from datetime import datetime, timezone

from sqlmodel import Session, select

from models import GameConfig, Chapter
from models.inventory import (
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag,
    ItemTypeBase, ItemSuffix, InventoryItem, PlayerInventory,
)

logger = logging.getLogger(__name__)

# Rarity multipliers (Design §4.3)
RARITY_MULTIPLIERS = {
    "common": 1.0,
    "uncommon": 1.3,
    "rare": 1.7,
    "epic": 2.2,
    "cosmic": 3.0,
}


def _get_config_json(session: Session, key: str, default=None):
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    return cfg.value_json if cfg.value_json is not None else default


def roll_gear_slot(session: Session, scene_type: str = "combat") -> GearSlot:
    """Weighted random gear slot selection."""
    config_key = f"gear_slot_weights_{scene_type}" if scene_type in ("combat", "narrative") else "gear_slot_weights_combat"
    weights = _get_config_json(session, config_key, {"weapon": 50, "armor": 30, "trinket": 20})

    slots = session.exec(select(GearSlot)).all()
    if not slots:
        raise ValueError("No gear slots defined")

    slot_map = {s.name: s for s in slots}
    choices = []
    slot_weights = []
    for name, weight in weights.items():
        if name in slot_map:
            choices.append(slot_map[name])
            slot_weights.append(weight)

    return random.choices(choices, weights=slot_weights, k=1)[0]


def roll_rarity(session: Session, book_number: int) -> str:
    """Weighted random rarity selection based on book number."""
    config_key = f"rarity_weight_book_{book_number}"
    default = {"common": 60, "uncommon": 25, "rare": 10, "epic": 4, "cosmic": 1}
    weights = _get_config_json(session, config_key, default)

    rarities = list(weights.keys())
    rarity_weights = list(weights.values())
    return random.choices(rarities, weights=rarity_weights, k=1)[0]


def roll_within_range(base_stat_range: dict) -> dict:
    """Roll random stats within the base_stat_range of an item type."""
    result = {}
    for stat, range_val in base_stat_range.items():
        if isinstance(range_val, list) and len(range_val) == 2:
            result[stat] = random.randint(range_val[0], range_val[1])
        elif isinstance(range_val, (int, float)):
            result[stat] = int(range_val)
    return result


def derive_stat_requirements(final_stats: dict, rarity: str) -> dict:
    """Derive equip stat requirements from final item stats."""
    req_fractions = {
        "common": 0.3, "uncommon": 0.35, "rare": 0.40,
        "epic": 0.45, "cosmic": 0.50,
    }
    fraction = req_fractions.get(rarity, 0.3)
    return {stat: max(1, math.floor(val * fraction)) for stat, val in final_stats.items() if val > 0}


def generate_dream_item(
    session: Session,
    character,  # PlayerCharacter
    scene,      # Scene
    chapter,    # Chapter
) -> InventoryItem:
    """Generate a procedural dream item from component tables."""
    # Step 1: Gear slot
    scene_type = getattr(scene, "scene_type", "combat") or "combat"
    slot = roll_gear_slot(session, scene_type)

    # Step 2: Rarity
    book = session.get(Chapter, chapter.id) if chapter else None
    book_number = getattr(chapter, "book_number", 1) if not hasattr(chapter, "book_id") else 1
    # Get book_number from chapter's book
    if hasattr(chapter, "book_id") and chapter.book_id:
        from models import Book
        book_obj = session.get(Book, chapter.book_id)
        if book_obj:
            book_number = book_obj.book_number
    rarity = roll_rarity(session, book_number)

    # Step 3: Item type for gear slot
    item_types = session.exec(
        select(ItemTypeBase).where(ItemTypeBase.gear_slot_id == slot.id)
    ).all()
    if not item_types:
        raise ValueError(f"No item types defined for gear slot {slot.name}")
    item_type = random.choice(item_types)

    # Step 4: Name components
    prefixes = session.exec(select(ItemPrefix)).all()
    qualities = session.exec(select(ItemQuality)).all()
    lore_tags = session.exec(select(ItemLoreTag)).all()
    suffixes = session.exec(select(ItemSuffix)).all()

    if not all([prefixes, qualities, lore_tags, suffixes]):
        raise ValueError("Item component tables are not seeded")

    prefix = random.choice(prefixes)
    quality = random.choice(qualities)
    lore_tag = random.choice(lore_tags)
    suffix = random.choice(suffixes)

    # Step 5: Stat calculation
    base_stats = roll_within_range(item_type.base_stat_range or {})
    prefix_bonus = prefix.stat_bonuses or {}
    suffix_bonus = suffix.stat_bonuses or {}
    rarity_mult = RARITY_MULTIPLIERS.get(rarity, 1.0)

    # Merge all stat sources
    all_stats = set(list(base_stats.keys()) + list(prefix_bonus.keys()) + list(suffix_bonus.keys()))
    final_stats = {}
    for stat in all_stats:
        base = base_stats.get(stat, 0)
        pbonus = prefix_bonus.get(stat, 0)
        sbonus = suffix_bonus.get(stat, 0)
        final_stats[stat] = math.floor((base + pbonus + sbonus) * rarity_mult)

    # Step 6: Item level
    rec_level = getattr(chapter, "recommended_level", None) or 1
    char_level = getattr(character, "level", 1)
    item_level = min(rec_level, char_level) if rec_level else char_level

    # Step 7: Requirements
    min_char_level = max(1, item_level - 2)
    stat_requirements = derive_stat_requirements(final_stats, rarity)

    # Step 8: Assemble
    item_code = f"{prefix.code}_{quality.code}_{lore_tag.code}_{item_type.code}_{suffix.code}"
    display_name = f"{prefix.display_name} {quality.display_name} {lore_tag.display_name} {item_type.display_name} of {suffix.display_name}"

    now = datetime.now(timezone.utc)
    item = InventoryItem(
        name=display_name,
        description=f"A {rarity} dream item forged in the depths of Elysium.",
        item_type=item_type.display_name,
        rarity=rarity,
        base_stats=final_stats,
        item_code=item_code,
        item_level=item_level,
        min_char_level=min_char_level,
        stat_requirements=stat_requirements,
        gear_slot_id=slot.id,
        is_dream_item=True,
        acquired_from="dream_drop",
        created_at=now,
    )
    session.add(item)
    session.flush()
    return item


def regenerate_item_names(session: Session) -> int:
    """Rebuild all dream item display names from their item_codes. Returns count updated."""
    items = session.exec(
        select(InventoryItem).where(InventoryItem.is_dream_item == True)
    ).all()

    prefix_map = {p.code: p for p in session.exec(select(ItemPrefix)).all()}
    quality_map = {q.code: q for q in session.exec(select(ItemQuality)).all()}
    lore_tag_map = {l.code: l for l in session.exec(select(ItemLoreTag)).all()}
    type_map = {t.code: t for t in session.exec(select(ItemTypeBase)).all()}
    suffix_map = {s.code: s for s in session.exec(select(ItemSuffix)).all()}

    count = 0
    for item in items:
        if not item.item_code:
            continue
        parts = item.item_code.split("_")
        if len(parts) != 5:
            logger.warning(f"Invalid item_code format: {item.item_code}")
            continue

        p = prefix_map.get(parts[0])
        q = quality_map.get(parts[1])
        l = lore_tag_map.get(parts[2])
        t = type_map.get(parts[3])
        s = suffix_map.get(parts[4])

        if all([p, q, l, t, s]):
            new_name = f"{p.display_name} {q.display_name} {l.display_name} {t.display_name} of {s.display_name}"
            if item.name != new_name:
                item.name = new_name
                session.add(item)
                count += 1

    session.flush()
    return count


def check_run_achievements(
    session: Session,
    session_stats: dict,
    character,
    scene,
    chapter,
) -> list[InventoryItem]:
    """Evaluate run achievements and generate dream items for successful rolls."""
    config = _get_config_json(session, "run_achievement_config", {})
    achievements = config.get("achievements", []) if isinstance(config, dict) else []

    drops = []
    results = []

    for achievement in achievements:
        threshold_type = achievement.get("threshold_type", "")
        threshold_value = achievement.get("threshold_value", 0)
        drop_chance = achievement.get("drop_chance_pct", 0)

        met = False
        if threshold_type == "completion_time_seconds":
            met = session_stats.get("completion_time_seconds", float("inf")) <= threshold_value
        elif threshold_type == "enemies_killed":
            met = session_stats.get("enemies_killed", 0) >= threshold_value
        elif threshold_type == "max_wave_reached":
            met = session_stats.get("max_wave_reached", 0) >= threshold_value
        elif threshold_type == "death_count":
            met = session_stats.get("death_count", 0) <= threshold_value
        elif threshold_type == "boss_killed":
            met = session_stats.get("boss_killed", 0) >= threshold_value
        elif threshold_type == "personal_best_wave":
            met = session_stats.get("is_personal_best", False)

        rolled = False
        item = None
        if met:
            rolled = random.random() < (drop_chance / 100)
            if rolled:
                item = generate_dream_item(session, character, scene, chapter)
                drops.append(item)

        results.append({
            "achievement_id": achievement.get("id"),
            "display": achievement.get("display"),
            "met": met,
            "rolled": rolled,
            "item": item,
        })

    return drops, results
