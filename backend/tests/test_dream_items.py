"""Tests for 2.4.2 Dream Item System — item generation, run achievements, and inventory endpoints."""

import math
import pytest
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from main import app
from db import get_session
from auth import get_current_player
from models import (
    Player, CharacterClass, PlayerCharacter, Book, Chapter, Scene,
    GameConfig, StatDefinition,
)
from models.inventory import (
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag,
    ItemTypeBase, ItemSuffix, InventoryItem, PlayerInventory,
)
from models.character_progression import CharacterStat
from services.item_generator import (
    generate_dream_item, regenerate_item_names, check_run_achievements,
    roll_rarity, roll_gear_slot, roll_within_range, derive_stat_requirements,
    RARITY_MULTIPLIERS,
)
from routes.inventory import MAX_BAG_SLOTS


# ---------------------------------------------------------------------------
# Fixtures — Item component seed data
# ---------------------------------------------------------------------------

@pytest.fixture
def gear_slots(session: Session) -> list[GearSlot]:
    slots = [
        GearSlot(name="weapon", display_name="Weapon", description="Primary weapon", sort_order=1),
        GearSlot(name="armor", display_name="Armor", description="Body armor", sort_order=2),
        GearSlot(name="trinket", display_name="Trinket", description="Trinket slot", sort_order=3),
    ]
    for s in slots:
        session.add(s)
    session.commit()
    for s in slots:
        session.refresh(s)
    return slots


@pytest.fixture
def item_prefixes(session: Session) -> list[ItemPrefix]:
    prefixes = [
        ItemPrefix(code="SHD", display_name="Shadow", stat_bonuses={"strength": 3}),
        ItemPrefix(code="RAD", display_name="Radiant", stat_bonuses={"intelligence": 5}),
    ]
    for p in prefixes:
        session.add(p)
    session.commit()
    for p in prefixes:
        session.refresh(p)
    return prefixes


@pytest.fixture
def item_qualities(session: Session) -> list[ItemQuality]:
    qualities = [
        ItemQuality(code="FRG", display_name="Forged"),
        ItemQuality(code="TMP", display_name="Tempered"),
    ]
    for q in qualities:
        session.add(q)
    session.commit()
    for q in qualities:
        session.refresh(q)
    return qualities


@pytest.fixture
def item_lore_tags(session: Session) -> list[ItemLoreTag]:
    tags = [
        ItemLoreTag(code="ELY", display_name="Elysian"),
        ItemLoreTag(code="VID", display_name="Void-touched"),
    ]
    for t in tags:
        session.add(t)
    session.commit()
    for t in tags:
        session.refresh(t)
    return tags


@pytest.fixture
def item_type_bases(session: Session, gear_slots: list[GearSlot]) -> list[ItemTypeBase]:
    weapon_slot = next(s for s in gear_slots if s.name == "weapon")
    armor_slot = next(s for s in gear_slots if s.name == "armor")
    trinket_slot = next(s for s in gear_slots if s.name == "trinket")
    bases = [
        ItemTypeBase(
            code="SWD", display_name="Sword",
            gear_slot_id=weapon_slot.id,
            base_stat_range={"strength": [5, 10], "agility": [2, 4]},
        ),
        ItemTypeBase(
            code="PLT", display_name="Plate",
            gear_slot_id=armor_slot.id,
            base_stat_range={"strength": [3, 6], "intelligence": [1, 3]},
        ),
        ItemTypeBase(
            code="AMU", display_name="Amulet",
            gear_slot_id=trinket_slot.id,
            base_stat_range={"intelligence": [3, 8], "agility": [1, 3]},
        ),
    ]
    for b in bases:
        session.add(b)
    session.commit()
    for b in bases:
        session.refresh(b)
    return bases


@pytest.fixture
def item_suffixes(session: Session) -> list[ItemSuffix]:
    suffixes = [
        ItemSuffix(code="FLM", display_name="Flames", stat_bonuses={"strength": 2}),
        ItemSuffix(code="ICE", display_name="Ice", stat_bonuses={"intelligence": 4}),
    ]
    for s in suffixes:
        session.add(s)
    session.commit()
    for s in suffixes:
        session.refresh(s)
    return suffixes


@pytest.fixture
def all_item_components(gear_slots, item_prefixes, item_qualities, item_lore_tags,
                         item_type_bases, item_suffixes):
    """Convenience fixture that triggers all component seeds."""
    return {
        "gear_slots": gear_slots,
        "prefixes": item_prefixes,
        "qualities": item_qualities,
        "lore_tags": item_lore_tags,
        "type_bases": item_type_bases,
        "suffixes": item_suffixes,
    }


@pytest.fixture
def test_book(session: Session) -> Book:
    book = Book(book_number=1, title="Towers of Elysium I", source_file="book1.docx",
                created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture
def test_chapter(session: Session, test_book: Book) -> Chapter:
    ch = Chapter(book_id=test_book.id, chapter_number=1, title="The Ascent",
                 sort_order=1, recommended_level=5,
                 created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(ch)
    session.commit()
    session.refresh(ch)
    return ch


@pytest.fixture
def test_scene(session: Session, test_chapter: Chapter) -> Scene:
    sc = Scene(chapter_id=test_chapter.id, scene_number=1, title="First Steps",
               summary="Enter the tower.", sort_order=1, scene_type="combat",
               created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(sc)
    session.commit()
    session.refresh(sc)
    return sc


@pytest.fixture
def stat_definitions(session: Session) -> list[StatDefinition]:
    stats = [
        StatDefinition(name="strength", display_name="Strength", value_type="integer"),
        StatDefinition(name="agility", display_name="Agility", value_type="integer"),
        StatDefinition(name="intelligence", display_name="Intelligence", value_type="integer"),
    ]
    for s in stats:
        session.add(s)
    session.commit()
    for s in stats:
        session.refresh(s)
    return stats


@pytest.fixture
def character_stats(session: Session, test_character: PlayerCharacter,
                     stat_definitions: list[StatDefinition]) -> list[CharacterStat]:
    """Create CharacterStat rows so _get_char_stats returns meaningful values."""
    rows = []
    stat_values = {"strength": 20, "agility": 15, "intelligence": 10}
    for sd in stat_definitions:
        cs = CharacterStat(
            character_id=test_character.id,
            stat_id=sd.id,
            computed_total=stat_values.get(sd.name, 10),
        )
        session.add(cs)
        rows.append(cs)
    session.commit()
    for r in rows:
        session.refresh(r)
    return rows


@pytest.fixture
def inv_client(session: Session, test_player: Player, test_character: PlayerCharacter):
    """TestClient with auth mocked for inventory endpoints — returns Player directly."""
    def get_session_override():
        return session

    def get_current_player_override():
        return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player}

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_player] = get_current_player_override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


def _make_item(session: Session, gear_slot_id: int, **overrides) -> InventoryItem:
    """Helper to create an InventoryItem with sensible defaults."""
    defaults = dict(
        name="Test Sword",
        description="A test weapon.",
        item_type="Sword",
        rarity="common",
        base_stats={"strength": 10},
        item_code="SHD_FRG_ELY_SWD_FLM",
        item_level=1,
        min_char_level=1,
        stat_requirements={"strength": 3},
        gear_slot_id=gear_slot_id,
        is_dream_item=True,
        acquired_from="dream_drop",
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    item = InventoryItem(**defaults)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def _add_to_inventory(session: Session, character_id: int, item_id: int,
                       is_equipped: bool = False, equipped_slot: str | None = None) -> PlayerInventory:
    """Helper to add an item to player inventory."""
    inv = PlayerInventory(
        character_id=character_id,
        item_id=item_id,
        is_equipped=is_equipped,
        equipped_slot=equipped_slot,
        quantity=1,
        acquired_at=datetime.now(timezone.utc),
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


# ===========================================================================
# SECTION 1: Item Generator Unit Tests
# ===========================================================================

class TestRollWithinRange:
    def test_rolls_within_bounds(self):
        base_range = {"strength": [5, 10], "agility": [1, 3]}
        for _ in range(50):
            result = roll_within_range(base_range)
            assert 5 <= result["strength"] <= 10
            assert 1 <= result["agility"] <= 3

    def test_scalar_values_returned_as_int(self):
        result = roll_within_range({"fixed": 7})
        assert result["fixed"] == 7

    def test_empty_range_returns_empty(self):
        assert roll_within_range({}) == {}


class TestDeriveStatRequirements:
    def test_common_fraction(self):
        stats = {"strength": 10, "agility": 20}
        reqs = derive_stat_requirements(stats, "common")
        assert reqs["strength"] == max(1, math.floor(10 * 0.3))
        assert reqs["agility"] == max(1, math.floor(20 * 0.3))

    def test_cosmic_fraction_is_highest(self):
        stats = {"strength": 100}
        common_reqs = derive_stat_requirements(stats, "common")
        cosmic_reqs = derive_stat_requirements(stats, "cosmic")
        assert cosmic_reqs["strength"] > common_reqs["strength"]

    def test_zero_stats_excluded(self):
        stats = {"strength": 10, "agility": 0}
        reqs = derive_stat_requirements(stats, "rare")
        assert "agility" not in reqs

    def test_min_requirement_is_one(self):
        stats = {"strength": 1}
        reqs = derive_stat_requirements(stats, "common")
        assert reqs["strength"] >= 1

    def test_unknown_rarity_defaults(self):
        stats = {"strength": 10}
        reqs = derive_stat_requirements(stats, "nonexistent")
        # Falls back to 0.3 fraction
        assert reqs["strength"] == max(1, math.floor(10 * 0.3))


class TestRollRarity:
    def test_returns_valid_rarity(self, session: Session):
        for _ in range(20):
            rarity = roll_rarity(session, 1)
            assert rarity in RARITY_MULTIPLIERS

    def test_custom_weights_from_config(self, session: Session):
        cfg = GameConfig(key="rarity_weight_book_1", value_json={"cosmic": 100})
        session.add(cfg)
        session.commit()
        # With 100% cosmic weight, should always get cosmic
        for _ in range(10):
            assert roll_rarity(session, 1) == "cosmic"


class TestRollGearSlot:
    def test_returns_a_gear_slot(self, session: Session, gear_slots: list[GearSlot]):
        slot = roll_gear_slot(session)
        assert isinstance(slot, GearSlot)
        assert slot.name in ("weapon", "armor", "trinket")

    def test_raises_without_gear_slots(self, session: Session):
        with pytest.raises(ValueError, match="No gear slots defined"):
            roll_gear_slot(session)


class TestGenerateDreamItem:
    def test_generates_valid_item(self, session: Session, all_item_components,
                                   test_character: PlayerCharacter, test_scene: Scene,
                                   test_chapter: Chapter, test_book: Book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.id is not None
        assert item.is_dream_item is True
        assert item.acquired_from == "dream_drop"

    def test_item_code_five_components(self, session: Session, all_item_components,
                                        test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        parts = item.item_code.split("_")
        assert len(parts) == 5, f"Expected 5-part code, got: {item.item_code}"

    def test_display_name_contains_of(self, session: Session, all_item_components,
                                       test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert " of " in item.name

    def test_rarity_is_valid(self, session: Session, all_item_components,
                              test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.rarity in RARITY_MULTIPLIERS

    def test_item_level_capped_by_character_level(self, session: Session, all_item_components,
                                                    test_character, test_scene, test_chapter,
                                                    test_book):
        # Character level 1, chapter recommended_level 5
        # item_level = min(recommended_level, char_level) = min(5, 1) = 1
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.item_level <= test_character.level

    def test_item_level_uses_recommended_when_lower(self, session: Session, all_item_components,
                                                      test_character, test_scene, test_chapter,
                                                      test_book):
        # Set character level higher than recommended
        test_character.level = 50
        session.add(test_character)
        session.commit()

        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        # recommended_level = 5, char_level = 50 -> min(5, 50) = 5
        assert item.item_level == test_chapter.recommended_level

    def test_base_stats_are_computed(self, session: Session, all_item_components,
                                      test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert isinstance(item.base_stats, dict)
        assert len(item.base_stats) > 0

    def test_stat_requirements_generated(self, session: Session, all_item_components,
                                          test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert isinstance(item.stat_requirements, dict)
        for stat_name, req_val in item.stat_requirements.items():
            assert req_val >= 1

    def test_gear_slot_assigned(self, session: Session, all_item_components,
                                 test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.gear_slot_id is not None

    def test_raises_without_component_tables(self, session: Session, gear_slots,
                                               test_character, test_scene, test_chapter, test_book):
        # Has gear_slots + item_type_bases but missing prefixes/qualities/lore_tags/suffixes
        # Need at least one item_type_base for every gear slot to avoid "No item types" error
        for gs in gear_slots:
            itb = ItemTypeBase(code=f"T{gs.id}", display_name=f"Type{gs.id}",
                               gear_slot_id=gs.id, base_stat_range={"strength": [1, 5]})
            session.add(itb)
        session.commit()

        with pytest.raises(ValueError, match="Item component tables are not seeded"):
            generate_dream_item(session, test_character, test_scene, test_chapter)

    def test_min_char_level_derived(self, session: Session, all_item_components,
                                     test_character, test_scene, test_chapter, test_book):
        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.min_char_level >= 1
        assert item.min_char_level <= item.item_level

    def test_sprite_key_set_when_armor_class_exists(self, session: Session, all_item_components,
                                                      test_character, test_scene, test_chapter,
                                                      test_book, gear_slots):
        """sprite_key = armor_class.code + gear_slot.name + rarity when armor_class_id is set."""
        from models.visual import ArmorClass
        ac = ArmorClass(code="plate", display_name="Plate Armor")
        session.add(ac)
        session.commit()
        session.refresh(ac)

        # Set all item_type_bases to reference this armor_class
        bases = session.exec(select(ItemTypeBase)).all()
        for b in bases:
            b.armor_class_id = ac.id
            session.add(b)
        session.commit()

        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.sprite_key is not None
        parts = item.sprite_key.split("_")
        assert parts[0] == "plate"  # armor_class.code
        assert parts[-1] in RARITY_MULTIPLIERS  # rarity
        # middle part(s) should be the gear slot name
        slot = session.get(GearSlot, item.gear_slot_id)
        expected = f"plate_{slot.name}_{item.rarity}"
        assert item.sprite_key == expected

    def test_sprite_key_none_when_no_armor_class(self, session: Session, all_item_components,
                                                   test_character, test_scene, test_chapter,
                                                   test_book):
        """sprite_key is None when item_type_base has no armor_class_id."""
        # Default item_type_bases fixture has no armor_class_id set
        bases = session.exec(select(ItemTypeBase)).all()
        for b in bases:
            assert b.armor_class_id is None  # precondition

        item = generate_dream_item(session, test_character, test_scene, test_chapter)
        assert item.sprite_key is None


class TestRarityDistribution:
    """Basic probability sanity check over many rolls."""

    def test_common_most_frequent_with_default_weights(self, session: Session):
        counts = {"common": 0, "uncommon": 0, "rare": 0, "epic": 0, "cosmic": 0}
        n = 500
        for _ in range(n):
            r = roll_rarity(session, 1)
            counts[r] += 1

        # With defaults {common:60, uncommon:25, rare:10, epic:4, cosmic:1}
        # Common should be the most frequent
        assert counts["common"] > counts["uncommon"]
        assert counts["common"] > counts["rare"]
        # Cosmic should be the rarest
        assert counts["cosmic"] < counts["uncommon"]


# ===========================================================================
# SECTION 2: regenerate_item_names
# ===========================================================================

class TestRegenerateItemNames:
    def test_rebuilds_names_from_codes(self, session: Session, all_item_components, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        comps = all_item_components
        prefix = comps["prefixes"][0]
        quality = comps["qualities"][0]
        lore_tag = comps["lore_tags"][0]
        type_base = comps["type_bases"][0]
        suffix = comps["suffixes"][0]

        code = f"{prefix.code}_{quality.code}_{lore_tag.code}_{type_base.code}_{suffix.code}"
        item = InventoryItem(
            name="Wrong Name",
            item_type=type_base.display_name,
            rarity="common",
            item_code=code,
            gear_slot_id=weapon_slot.id,
            is_dream_item=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(item)
        session.commit()

        count = regenerate_item_names(session)
        assert count == 1

        session.refresh(item)
        expected = f"{prefix.display_name} {quality.display_name} {lore_tag.display_name} {type_base.display_name} of {suffix.display_name}"
        assert item.name == expected

    def test_skips_non_dream_items(self, session: Session, all_item_components, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = InventoryItem(
            name="Static Item", item_type="Sword", rarity="common",
            item_code="SHD_FRG_ELY_SWD_FLM",
            gear_slot_id=weapon_slot.id, is_dream_item=False,
            created_at=datetime.now(timezone.utc),
        )
        session.add(item)
        session.commit()

        count = regenerate_item_names(session)
        assert count == 0

    def test_skips_invalid_code_format(self, session: Session, all_item_components, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = InventoryItem(
            name="Bad Code Item", item_type="Sword", rarity="common",
            item_code="ONLY_TWO",
            gear_slot_id=weapon_slot.id, is_dream_item=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(item)
        session.commit()

        count = regenerate_item_names(session)
        assert count == 0

    def test_no_change_when_name_matches(self, session: Session, all_item_components, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        comps = all_item_components
        p, q, l, t, s_ = comps["prefixes"][0], comps["qualities"][0], comps["lore_tags"][0], comps["type_bases"][0], comps["suffixes"][0]
        correct_name = f"{p.display_name} {q.display_name} {l.display_name} {t.display_name} of {s_.display_name}"
        code = f"{p.code}_{q.code}_{l.code}_{t.code}_{s_.code}"

        item = InventoryItem(
            name=correct_name, item_type=t.display_name, rarity="common",
            item_code=code, gear_slot_id=weapon_slot.id, is_dream_item=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(item)
        session.commit()

        count = regenerate_item_names(session)
        assert count == 0


# ===========================================================================
# SECTION 3: Run Achievement Tests
# ===========================================================================

class TestCheckRunAchievements:
    @pytest.fixture
    def achievement_config(self, session: Session):
        cfg = GameConfig(
            key="run_achievement_config",
            value_json={
                "achievements": [
                    {
                        "id": "wave_5",
                        "display": "Reach wave 5",
                        "threshold_type": "max_wave_reached",
                        "threshold_value": 5,
                        "drop_chance_pct": 100,
                    },
                    {
                        "id": "kills_50",
                        "display": "Kill 50 enemies",
                        "threshold_type": "enemies_killed",
                        "threshold_value": 50,
                        "drop_chance_pct": 100,
                    },
                    {
                        "id": "speed_run",
                        "display": "Complete in under 60s",
                        "threshold_type": "completion_time_seconds",
                        "threshold_value": 60,
                        "drop_chance_pct": 100,
                    },
                    {
                        "id": "no_death",
                        "display": "Deathless run",
                        "threshold_type": "death_count",
                        "threshold_value": 0,
                        "drop_chance_pct": 100,
                    },
                    {
                        "id": "boss_slayer",
                        "display": "Slay the boss",
                        "threshold_type": "boss_killed",
                        "threshold_value": 1,
                        "drop_chance_pct": 100,
                    },
                    {
                        "id": "personal_best",
                        "display": "New personal best",
                        "threshold_type": "personal_best_wave",
                        "threshold_value": 0,
                        "drop_chance_pct": 100,
                    },
                ],
            },
            description="Test achievements",
        )
        session.add(cfg)
        session.commit()
        return cfg

    def test_wave_threshold_met(self, session: Session, achievement_config,
                                 all_item_components, test_character, test_scene,
                                 test_chapter, test_book):
        stats = {"max_wave_reached": 10, "enemies_killed": 0, "death_count": 5}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        wave_result = next(r for r in results if r["achievement_id"] == "wave_5")
        assert wave_result["met"] is True

    def test_wave_threshold_not_met(self, session: Session, achievement_config,
                                     all_item_components, test_character, test_scene,
                                     test_chapter, test_book):
        stats = {"max_wave_reached": 3}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        wave_result = next(r for r in results if r["achievement_id"] == "wave_5")
        assert wave_result["met"] is False

    def test_completion_time_threshold(self, session: Session, achievement_config,
                                        all_item_components, test_character, test_scene,
                                        test_chapter, test_book):
        stats = {"completion_time_seconds": 30}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        speed_result = next(r for r in results if r["achievement_id"] == "speed_run")
        assert speed_result["met"] is True

    def test_death_count_threshold(self, session: Session, achievement_config,
                                    all_item_components, test_character, test_scene,
                                    test_chapter, test_book):
        # death_count <= 0 required
        stats = {"death_count": 0}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        deathless = next(r for r in results if r["achievement_id"] == "no_death")
        assert deathless["met"] is True

        stats_died = {"death_count": 1}
        _, results_died = check_run_achievements(session, stats_died, test_character, test_scene, test_chapter)
        deathless_died = next(r for r in results_died if r["achievement_id"] == "no_death")
        assert deathless_died["met"] is False

    def test_boss_killed_threshold(self, session: Session, achievement_config,
                                    all_item_components, test_character, test_scene,
                                    test_chapter, test_book):
        stats = {"boss_killed": 1}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        boss_result = next(r for r in results if r["achievement_id"] == "boss_slayer")
        assert boss_result["met"] is True

    def test_personal_best_threshold(self, session: Session, achievement_config,
                                      all_item_components, test_character, test_scene,
                                      test_chapter, test_book):
        stats = {"is_personal_best": True}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        pb = next(r for r in results if r["achievement_id"] == "personal_best")
        assert pb["met"] is True

    def test_each_achievement_rolls_independently(self, session: Session, achievement_config,
                                                    all_item_components, test_character,
                                                    test_scene, test_chapter, test_book):
        """All thresholds met with 100% drop chance -> each generates an item independently."""
        stats = {
            "max_wave_reached": 100,
            "enemies_killed": 100,
            "completion_time_seconds": 10,
            "death_count": 0,
            "boss_killed": 5,
            "is_personal_best": True,
        }
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        # All 6 should be met and rolled
        for r in results:
            assert r["met"] is True
            assert r["rolled"] is True
            assert r["item"] is not None
        assert len(drops) == 6

    def test_drop_chance_zero_means_no_item(self, session: Session, all_item_components,
                                              test_character, test_scene, test_chapter, test_book):
        cfg = GameConfig(
            key="run_achievement_config",
            value_json={
                "achievements": [
                    {
                        "id": "wave_1",
                        "display": "Reach wave 1",
                        "threshold_type": "max_wave_reached",
                        "threshold_value": 1,
                        "drop_chance_pct": 0,
                    },
                ],
            },
        )
        session.add(cfg)
        session.commit()

        stats = {"max_wave_reached": 10}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        assert results[0]["met"] is True
        assert results[0]["rolled"] is False
        assert len(drops) == 0

    def test_no_achievements_config_returns_empty(self, session: Session,
                                                    test_character, test_scene, test_chapter):
        stats = {"max_wave_reached": 10}
        drops, results = check_run_achievements(session, stats, test_character, test_scene, test_chapter)
        assert drops == []
        assert results == []


# ===========================================================================
# SECTION 4: Inventory Endpoint Tests
# ===========================================================================

class TestGetInventory:
    def test_returns_empty_inventory(self, inv_client, test_character, gear_slots):
        resp = inv_client.get("/api/game/inventory")
        assert resp.status_code == 200
        data = resp.json()
        assert data["equipped"] == []
        assert data["stored"] == []
        assert data["bag_capacity"] == MAX_BAG_SLOTS
        assert data["bag_used"] == 0
        assert len(data["gear_slots"]) == len(gear_slots)

    def test_returns_equipped_and_stored(self, inv_client, session: Session,
                                          test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item_eq = _make_item(session, weapon_slot.id, name="Equipped Sword")
        item_bag = _make_item(session, weapon_slot.id, name="Bag Sword")

        _add_to_inventory(session, test_character.id, item_eq.id,
                          is_equipped=True, equipped_slot="weapon")
        _add_to_inventory(session, test_character.id, item_bag.id)

        resp = inv_client.get("/api/game/inventory")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["equipped"]) == 1
        assert len(data["stored"]) == 1
        assert data["equipped"][0]["name"] == "Equipped Sword"
        assert data["stored"][0]["name"] == "Bag Sword"
        assert data["bag_used"] == 1

    def test_includes_meets_requirements_flag(self, inv_client, session: Session,
                                               test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        # Item with requirements the character meets
        item_ok = _make_item(session, weapon_slot.id, name="Passable Sword", stat_requirements={"strength": 5}, min_char_level=1)
        # Item with requirements the character doesn't meet
        item_fail = _make_item(session, weapon_slot.id, name="Impossible Sword", stat_requirements={"strength": 999}, min_char_level=1)

        _add_to_inventory(session, test_character.id, item_ok.id)
        _add_to_inventory(session, test_character.id, item_fail.id)

        resp = inv_client.get("/api/game/inventory")
        data = resp.json()
        items = {i["name"]: i for i in data["stored"]}
        assert items[item_ok.name]["meets_requirements"] is True
        assert items[item_fail.name]["meets_requirements"] is False

    def test_404_no_character(self, session: Session, test_player: Player):
        """Player with no character gets 404."""
        # Create a fresh player without a character
        player_no_char = Player(
            firebase_uid="no_char_uid", email="nochar@test.com", alias="NoChar",
            created_at=datetime.now(timezone.utc), last_login_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(player_no_char)
        session.commit()
        session.refresh(player_no_char)

        def override_session():
            return session
        def override_player():
            return {"uid": player_no_char.firebase_uid, "email": player_no_char.email, "player": player_no_char}

        app.dependency_overrides[get_session] = override_session
        app.dependency_overrides[get_current_player] = override_player

        with TestClient(app) as c:
            resp = c.get("/api/game/inventory")
        app.dependency_overrides.clear()

        assert resp.status_code == 404


class TestEquipItem:
    def test_equip_from_bag(self, inv_client, session: Session,
                             test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, stat_requirements={"strength": 1})
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "equipped"
        assert data["slot"] == "weapon"
        assert data["swapped_inventory_id"] is None

    def test_equip_swaps_existing(self, inv_client, session: Session,
                                   test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        old_item = _make_item(session, weapon_slot.id, name="Old Sword",
                              stat_requirements={"strength": 1})
        new_item = _make_item(session, weapon_slot.id, name="New Sword",
                              stat_requirements={"strength": 1})

        old_inv = _add_to_inventory(session, test_character.id, old_item.id,
                                    is_equipped=True, equipped_slot="weapon")
        new_inv = _add_to_inventory(session, test_character.id, new_item.id)

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": new_inv.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "equipped"
        assert data["swapped_inventory_id"] == old_inv.id

        # Old item should be unequipped now
        session.refresh(old_inv)
        assert old_inv.is_equipped is False
        assert old_inv.equipped_slot is None

    def test_equip_already_equipped_fails(self, inv_client, session: Session,
                                           test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, stat_requirements={"strength": 1})
        inv = _add_to_inventory(session, test_character.id, item.id,
                                is_equipped=True, equipped_slot="weapon")

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 400
        assert "already equipped" in resp.json()["detail"].lower()

    def test_equip_fails_requirements_not_met(self, inv_client, session: Session,
                                                test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, stat_requirements={"strength": 9999})
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 400
        assert "requirements" in resp.json()["detail"].lower()

    def test_equip_fails_level_requirement(self, inv_client, session: Session,
                                             test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, min_char_level=99,
                          stat_requirements={})
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 400

    def test_equip_not_found(self, inv_client, test_character, gear_slots):
        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": 99999})
        assert resp.status_code == 404

    def test_equip_no_gear_slot(self, inv_client, session: Session,
                                 test_character, gear_slots, character_stats):
        item = _make_item(session, gear_slot_id=None)
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/equip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 400
        assert "cannot be equipped" in resp.json()["detail"].lower()


class TestUnequipItem:
    def test_unequip_to_bag(self, inv_client, session: Session,
                             test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)
        inv = _add_to_inventory(session, test_character.id, item.id,
                                is_equipped=True, equipped_slot="weapon")

        resp = inv_client.post("/api/game/inventory/unequip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "unequipped"

        session.refresh(inv)
        assert inv.is_equipped is False
        assert inv.equipped_slot is None

    def test_unequip_not_equipped_fails(self, inv_client, session: Session,
                                         test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/unequip",
                               json={"inventory_id": inv.id})
        assert resp.status_code == 400
        assert "not equipped" in resp.json()["detail"].lower()

    def test_unequip_bag_full_fails(self, inv_client, session: Session,
                                     test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")

        # Fill the bag to MAX_BAG_SLOTS
        for i in range(MAX_BAG_SLOTS):
            bag_item = _make_item(session, weapon_slot.id, name=f"BagItem{i}")
            _add_to_inventory(session, test_character.id, bag_item.id)

        # Try to unequip an equipped item
        eq_item = _make_item(session, weapon_slot.id, name="EquippedItem")
        eq_inv = _add_to_inventory(session, test_character.id, eq_item.id,
                                   is_equipped=True, equipped_slot="weapon")

        resp = inv_client.post("/api/game/inventory/unequip",
                               json={"inventory_id": eq_inv.id})
        assert resp.status_code == 400
        assert "bag is full" in resp.json()["detail"].lower()

    def test_unequip_not_found(self, inv_client, test_character, gear_slots):
        resp = inv_client.post("/api/game/inventory/unequip",
                               json={"inventory_id": 99999})
        assert resp.status_code == 404


class TestDiscardItem:
    def test_discard_unequipped_item(self, inv_client, session: Session,
                                      test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)
        inv = _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.delete(f"/api/game/inventory/{inv.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "discarded"

        # Verify removed from inventory
        deleted = session.get(PlayerInventory, inv.id)
        assert deleted is None

    def test_discard_equipped_fails(self, inv_client, session: Session,
                                     test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)
        inv = _add_to_inventory(session, test_character.id, item.id,
                                is_equipped=True, equipped_slot="weapon")

        resp = inv_client.delete(f"/api/game/inventory/{inv.id}")
        assert resp.status_code == 400
        assert "unequip it first" in resp.json()["detail"].lower()

    def test_discard_not_found(self, inv_client, test_character, gear_slots):
        resp = inv_client.delete("/api/game/inventory/99999")
        assert resp.status_code == 404


class TestKeepDrop:
    def test_keep_auto_equips_if_slot_empty(self, inv_client, session: Session,
                                              test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, stat_requirements={"strength": 1})

        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": item.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "kept"
        assert data["placed_in"] == "equipped"
        assert data["slot"] == "weapon"

    def test_keep_goes_to_bag_if_slot_occupied(self, inv_client, session: Session,
                                                 test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")

        # First equip an item
        existing = _make_item(session, weapon_slot.id, name="Existing", stat_requirements={"strength": 1})
        _add_to_inventory(session, test_character.id, existing.id,
                          is_equipped=True, equipped_slot="weapon")

        # Keep a new drop
        new_item = _make_item(session, weapon_slot.id, name="New Drop", stat_requirements={"strength": 1})

        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": new_item.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["placed_in"] == "bag"
        assert data["slot"] is None

    def test_keep_goes_to_bag_if_requirements_not_met(self, inv_client, session: Session,
                                                        test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id, stat_requirements={"strength": 9999})

        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": item.id})
        assert resp.status_code == 200
        data = resp.json()
        assert data["placed_in"] == "bag"

    def test_keep_bag_full_returns_409(self, inv_client, session: Session,
                                        test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")

        # Occupy the weapon slot so new drop goes to bag
        existing = _make_item(session, weapon_slot.id, name="Equipped", stat_requirements={"strength": 1})
        _add_to_inventory(session, test_character.id, existing.id,
                          is_equipped=True, equipped_slot="weapon")

        # Fill the bag
        for i in range(MAX_BAG_SLOTS):
            bag_item = _make_item(session, weapon_slot.id, name=f"BagItem{i}")
            _add_to_inventory(session, test_character.id, bag_item.id)

        # Try to keep another drop
        drop = _make_item(session, weapon_slot.id, name="Overflow", stat_requirements={"strength": 1})

        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": drop.id})
        assert resp.status_code == 409
        detail = resp.json()["detail"]
        assert detail["bag_capacity"] == MAX_BAG_SLOTS
        assert len(detail["stored_items"]) == MAX_BAG_SLOTS

    def test_keep_already_owned_fails(self, inv_client, session: Session,
                                       test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)
        _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": item.id})
        assert resp.status_code == 400
        assert "already own" in resp.json()["detail"].lower()

    def test_keep_item_not_found(self, inv_client, test_character, gear_slots):
        resp = inv_client.post("/api/game/inventory/keep-drop",
                               json={"item_id": 99999})
        assert resp.status_code == 404

    def test_keep_auto_equip_to_different_slots(self, inv_client, session: Session,
                                                  test_character, gear_slots, character_stats):
        """Items for different slots can all auto-equip."""
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        armor_slot = next(s for s in gear_slots if s.name == "armor")

        weapon = _make_item(session, weapon_slot.id, name="Weapon Drop", stat_requirements={"strength": 1})
        armor = _make_item(session, armor_slot.id, name="Armor Drop", item_type="Plate",
                           stat_requirements={"strength": 1})

        resp1 = inv_client.post("/api/game/inventory/keep-drop",
                                json={"item_id": weapon.id})
        assert resp1.json()["placed_in"] == "equipped"
        assert resp1.json()["slot"] == "weapon"

        resp2 = inv_client.post("/api/game/inventory/keep-drop",
                                json={"item_id": armor.id})
        assert resp2.json()["placed_in"] == "equipped"
        assert resp2.json()["slot"] == "armor"


class TestDismissDrop:
    def test_dismiss_returns_acknowledged(self, inv_client, test_character, gear_slots):
        resp = inv_client.post("/api/game/inventory/dismiss-drop",
                               json={"item_id": 42})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "dismissed"
        assert data["item_id"] == 42

    def test_dismiss_no_db_change(self, inv_client, session: Session,
                                    test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")
        item = _make_item(session, weapon_slot.id)

        resp = inv_client.post("/api/game/inventory/dismiss-drop",
                               json={"item_id": item.id})
        assert resp.status_code == 200

        # Item should still exist in DB
        still_exists = session.get(InventoryItem, item.id)
        assert still_exists is not None


# ===========================================================================
# SECTION 5: Bag Capacity Enforcement
# ===========================================================================

class TestBagCapacity:
    def test_bag_capacity_limit_is_ten(self):
        assert MAX_BAG_SLOTS == 10

    def test_exactly_max_items_allowed_in_bag(self, inv_client, session: Session,
                                                test_character, gear_slots):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")

        # Fill bag to exactly MAX_BAG_SLOTS
        for i in range(MAX_BAG_SLOTS):
            item = _make_item(session, weapon_slot.id, name=f"Item{i}")
            _add_to_inventory(session, test_character.id, item.id)

        resp = inv_client.get("/api/game/inventory")
        assert resp.json()["bag_used"] == MAX_BAG_SLOTS

    def test_equipped_items_dont_count_toward_bag(self, inv_client, session: Session,
                                                    test_character, gear_slots, character_stats):
        weapon_slot = next(s for s in gear_slots if s.name == "weapon")

        # Equip one item
        eq_item = _make_item(session, weapon_slot.id, name="Equipped", stat_requirements={"strength": 1})
        _add_to_inventory(session, test_character.id, eq_item.id,
                          is_equipped=True, equipped_slot="weapon")

        # Fill bag
        for i in range(MAX_BAG_SLOTS):
            bag_item = _make_item(session, weapon_slot.id, name=f"Bag{i}")
            _add_to_inventory(session, test_character.id, bag_item.id)

        resp = inv_client.get("/api/game/inventory")
        data = resp.json()
        assert data["bag_used"] == MAX_BAG_SLOTS
        assert len(data["equipped"]) == 1
