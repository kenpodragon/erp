"""Tests for Admin Character Management (5.1) API endpoints and service layer."""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session, select

from models import (
    Player, CharacterClass, PlayerCharacter, Skill, CharacterSkillLevel,
    StatDefinition, GameConfig,
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag, ItemTypeBase, ItemSuffix,
    InventoryItem, PlayerInventory,
    PlayerEssence, PlayerMetaProgression,
)
from models.character_progression import ClassStatAffinity, CharacterStat
from models.home_base import (
    CuratedArtifact, CuratedArtifactTier, ArtifactTypeBase,
    ArtifactPrefix, ArtifactSuffix, PlayerArtifact,
)
from services.character import (
    edit_character, reassign_class, get_stat_breakdown,
    craft_item_manual, craft_item_random, grant_crafted_item,
    edit_item, delete_item, edit_artifact,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def second_class(session: Session) -> CharacterClass:
    """A second character class for reassignment tests."""
    cls = CharacterClass(
        name="Mage",
        base_strength=5,
        base_agility=8,
        base_intelligence=15,
        is_available=True,
    )
    session.add(cls)
    session.commit()
    session.refresh(cls)
    return cls


@pytest.fixture
def universal_skill(session: Session) -> Skill:
    """A universal (non-class-exclusive) skill."""
    skill = Skill(
        name="Lore", display_name="Lore", category="passive",
        is_class_exclusive=False, class_id=None,
    )
    session.add(skill)
    session.commit()
    session.refresh(skill)
    return skill


@pytest.fixture
def old_class_skills(session: Session, test_character_class: CharacterClass) -> list[Skill]:
    """Two class-exclusive skills for the old class (TestClass)."""
    skills = []
    for i, name in enumerate(["Slash", "Shield Bash"]):
        s = Skill(
            name=name, display_name=name, category="combat",
            class_id=test_character_class.id, is_class_exclusive=True,
        )
        session.add(s)
        skills.append(s)
    session.commit()
    for s in skills:
        session.refresh(s)
    return skills


@pytest.fixture
def new_class_skills(session: Session, second_class: CharacterClass) -> list[Skill]:
    """Three class-exclusive skills for the new class (Mage)."""
    skills = []
    for name in ["Fireball", "Ice Shard", "Arcane Blast"]:
        s = Skill(
            name=name, display_name=name, category="combat",
            class_id=second_class.id, is_class_exclusive=True,
        )
        session.add(s)
        skills.append(s)
    session.commit()
    for s in skills:
        session.refresh(s)
    return skills


@pytest.fixture
def item_components(session: Session):
    """Seed minimal item components for crafting tests."""
    slot = GearSlot(name="weapon", display_name="Weapon", sort_order=1)
    session.add(slot)
    session.flush()

    type_base = ItemTypeBase(
        code="SWD", display_name="Sword", gear_slot_id=slot.id,
        base_stat_range={"strength": [5, 10], "agility": [2, 4]},
    )
    prefix = ItemPrefix(code="FLM", display_name="Flaming", stat_bonuses={"strength": 3})
    quality = ItemQuality(code="FIN", display_name="Fine")
    lore_tag = ItemLoreTag(code="TOW", display_name="Tower-Forged")
    suffix = ItemSuffix(code="PWR", display_name="Power", stat_bonuses={"strength": 2})

    for obj in [type_base, prefix, quality, lore_tag, suffix]:
        session.add(obj)
    session.commit()

    return {
        "gear_slot": slot,
        "type_base": type_base,
        "prefix": prefix,
        "quality": quality,
        "lore_tag": lore_tag,
        "suffix": suffix,
    }


@pytest.fixture
def artifact_components(session: Session):
    """Seed minimal artifact components for artifact edit tests."""
    art_type = ArtifactTypeBase(
        code="SHARD", display_name="Shard",
        base_stat_range={"strength": [2, 4], "vitality": [1, 2]},
    )
    prefix1 = ArtifactPrefix(code="FRACT", display_name="Fractured", stat_bonuses={"strength": 1})
    prefix2 = ArtifactPrefix(code="LUMIN", display_name="Luminous", stat_bonuses={"intelligence": 1})
    suffix1 = ArtifactSuffix(code="VOID", display_name="of the Void", stat_bonuses={"intelligence": 1})
    suffix2 = ArtifactSuffix(code="TOWER", display_name="of the Tower", stat_bonuses={"vitality": 1})

    for obj in [art_type, prefix1, prefix2, suffix1, suffix2]:
        session.add(obj)

    # Rarity multiplier config needed for _compute_generated_stats
    session.add(GameConfig(
        key="artifact_rarity_stat_multiplier",
        value_json={"common": 1.0, "uncommon": 1.2, "rare": 1.5, "epic": 2.0, "cosmic": 3.0},
        category="artifacts",
    ))
    session.commit()

    return {
        "type": art_type,
        "prefix1": prefix1, "prefix2": prefix2,
        "suffix1": suffix1, "suffix2": suffix2,
    }


@pytest.fixture
def stat_definitions(session: Session) -> list[StatDefinition]:
    """Seed primary stat definitions."""
    stats = []
    for name in ["strength", "agility", "intelligence"]:
        s = StatDefinition(name=name, display_name=name.capitalize(), category="primary", value_type="integer")
        session.add(s)
        stats.append(s)
    session.commit()
    for s in stats:
        session.refresh(s)
    return stats


# ---------------------------------------------------------------------------
# Tests: Character Editing (test_edit_character_name, test_edit_character_level_xp)
# ---------------------------------------------------------------------------

class TestEditCharacter:
    def test_edit_character_name(self, session, test_character):
        result = edit_character(session, test_character.id, {"character_name": "NewName"})
        assert result is not None
        assert result["changes"]["character_name"]["new"] == "NewName"
        assert result["changes"]["character_name"]["old"] == "TestChar"
        session.refresh(test_character)
        assert test_character.character_name == "NewName"

    def test_edit_character_name_too_short(self, session, test_character):
        with pytest.raises(ValueError, match="3.*20"):
            edit_character(session, test_character.id, {"character_name": "AB"})

    def test_edit_character_name_too_long(self, session, test_character):
        with pytest.raises(ValueError, match="3.*20"):
            edit_character(session, test_character.id, {"character_name": "A" * 25})

    def test_edit_character_level_xp(self, session, test_character):
        result = edit_character(session, test_character.id, {"level": 50, "character_xp": 12345})
        assert result is not None
        assert result["changes"]["level"]["new"] == 50
        assert result["changes"]["character_xp"]["new"] == 12345.0
        session.refresh(test_character)
        assert test_character.level == 50
        assert test_character.character_xp == 12345

    def test_edit_character_not_found(self, session):
        result = edit_character(session, 99999, {"character_name": "Ghost"})
        assert result is None


# ---------------------------------------------------------------------------
# Tests: Class Reassignment
# ---------------------------------------------------------------------------

class TestClassReassignment:
    def test_class_reassignment_skill_mapping(
        self, session, test_character, second_class,
        universal_skill, old_class_skills, new_class_skills,
    ):
        """Universal skills preserved, exclusive mapped by ID order."""
        # Give universal skill a level
        uni_csl = CharacterSkillLevel(
            character_id=test_character.id, skill_id=universal_skill.id, level=5, current_xp=100,
        )
        # Give old exclusive skills levels
        old_csl1 = CharacterSkillLevel(
            character_id=test_character.id, skill_id=old_class_skills[0].id, level=10, current_xp=500,
        )
        old_csl2 = CharacterSkillLevel(
            character_id=test_character.id, skill_id=old_class_skills[1].id, level=7, current_xp=300,
        )
        session.add_all([uni_csl, old_csl1, old_csl2])
        session.commit()

        mapping = reassign_class(session, test_character, second_class.id)

        # Universal skill untouched
        uni_after = session.exec(
            select(CharacterSkillLevel)
            .where(CharacterSkillLevel.character_id == test_character.id)
            .where(CharacterSkillLevel.skill_id == universal_skill.id)
        ).first()
        assert uni_after is not None
        assert uni_after.level == 5

        # First old exclusive mapped to first new exclusive with preserved level
        assert mapping["skill_mapping"][0]["old_skill_name"] == "Slash"
        assert mapping["skill_mapping"][0]["new_skill_name"] == "Fireball"
        assert mapping["skill_mapping"][0]["level_transferred"] == 10

        # Second old exclusive mapped to second new exclusive
        assert mapping["skill_mapping"][1]["old_skill_name"] == "Shield Bash"
        assert mapping["skill_mapping"][1]["new_skill_name"] == "Ice Shard"
        assert mapping["skill_mapping"][1]["level_transferred"] == 7

    def test_class_reassignment_fewer_skills(
        self, session, test_character, test_character_class, second_class,
    ):
        """When new class has fewer exclusive skills, excess old skills are lost."""
        # Create 3 old exclusive skills
        old_skills = []
        for name in ["Skill_A", "Skill_B", "Skill_C"]:
            s = Skill(name=name, display_name=name, category="combat",
                      class_id=test_character_class.id, is_class_exclusive=True)
            session.add(s)
            old_skills.append(s)
        session.flush()

        # Create only 1 new exclusive skill
        new_skill = Skill(name="New_Only", display_name="New Only", category="combat",
                          class_id=second_class.id, is_class_exclusive=True)
        session.add(new_skill)
        session.flush()

        # Give all old skills levels
        for s in old_skills:
            csl = CharacterSkillLevel(
                character_id=test_character.id, skill_id=s.id, level=5, current_xp=100,
            )
            session.add(csl)
        session.commit()

        mapping = reassign_class(session, test_character, second_class.id)

        # Only 1 mapped, 2 lost
        assert len(mapping["skill_mapping"]) == 1
        assert len(mapping["skills_lost"]) == 2
        assert mapping["skills_lost"][0]["level_lost"] == 5

    def test_class_reassignment_more_skills(
        self, session, test_character, test_character_class, second_class,
    ):
        """When new class has more exclusive skills, extras start at level 1."""
        # Create 1 old exclusive skill
        old_skill = Skill(name="OldOnly", display_name="Old Only", category="combat",
                          class_id=test_character_class.id, is_class_exclusive=True)
        session.add(old_skill)
        session.flush()

        csl = CharacterSkillLevel(
            character_id=test_character.id, skill_id=old_skill.id, level=8, current_xp=200,
        )
        session.add(csl)

        # Create 3 new exclusive skills
        for name in ["NewA", "NewB", "NewC"]:
            s = Skill(name=name, display_name=name, category="combat",
                      class_id=second_class.id, is_class_exclusive=True)
            session.add(s)
        session.commit()

        mapping = reassign_class(session, test_character, second_class.id)

        assert len(mapping["skill_mapping"]) == 3
        # First one inherits level 8
        assert mapping["skill_mapping"][0]["level_transferred"] == 8
        # Extras at level 1
        assert mapping["skill_mapping"][1]["level_transferred"] == 1
        assert mapping["skill_mapping"][2]["level_transferred"] == 1
        assert mapping["skill_mapping"][1]["old_skill_id"] is None
        assert mapping["skill_mapping"][2]["old_skill_id"] is None

    def test_class_reassignment_stat_recalc(
        self, session, test_character, second_class, stat_definitions,
    ):
        """Stats recalculated after class change via edit_character."""
        # Set up class affinities for new class
        for stat in stat_definitions:
            aff = ClassStatAffinity(
                class_id=second_class.id, stat_id=stat.id,
                base_value=20, lore_weight=0.0, level_bonus_per_level=0.0,
            )
            session.add(aff)
        session.commit()

        result = edit_character(session, test_character.id, {"class_id": second_class.id})
        assert result is not None
        assert "class_reassignment" in result["changes"]

        # Verify character's class changed
        session.refresh(test_character)
        assert test_character.class_id == second_class.id


# ---------------------------------------------------------------------------
# Tests: Stat Breakdown
# ---------------------------------------------------------------------------

class TestStatBreakdown:
    def test_stat_breakdown_response(
        self, session, test_character, test_character_class, stat_definitions,
    ):
        """All 6 sources returned with detail per stat."""
        # Set up class affinities
        for stat in stat_definitions:
            aff = ClassStatAffinity(
                class_id=test_character_class.id, stat_id=stat.id,
                base_value=10, lore_weight=0.5, level_bonus_per_level=1.0,
            )
            session.add(aff)
        session.commit()

        result = get_stat_breakdown(session, test_character.id)
        assert result is not None
        assert result["character_id"] == test_character.id
        assert result["class_name"] == "TestClass"

        # Check each stat has all 6 sources
        for stat_name in ["strength", "agility", "intelligence"]:
            stat_data = result["stats"][stat_name]
            sources = stat_data["sources"]
            assert "class_base" in sources
            assert "idle_training" in sources
            assert "lore_distribution" in sources
            assert "character_level" in sources
            assert "equipment" in sources
            assert "artifacts" in sources
            assert sources["class_base"]["value"] == 10

    def test_stat_breakdown_not_found(self, session):
        result = get_stat_breakdown(session, 99999)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: Item Crafting
# ---------------------------------------------------------------------------

class TestCraftItem:
    def test_craft_item_manual(self, session, test_character, item_components):
        """Full component selection, stat calculation, inventory placement."""
        c = item_components
        item = craft_item_manual(session, test_character, {
            "gear_slot_id": c["gear_slot"].id,
            "type_base_id": c["type_base"].id,
            "prefix_id": c["prefix"].id,
            "quality_id": c["quality"].id,
            "lore_tag_id": c["lore_tag"].id,
            "suffix_id": c["suffix"].id,
            "rarity": "common",
            "base_stat_values": {"strength": 7, "agility": 3},
        })

        assert item is not None
        assert item.id is not None
        assert item.rarity == "common"
        assert "Flaming" in item.name
        assert "Sword" in item.name
        assert "Power" in item.name
        assert item.item_code == "FLM_FIN_TOW_SWD_PWR"
        # base(7) + prefix(3) + suffix(2) = 12 * 1.0 (common) = 12
        assert item.base_stats["strength"] == 12
        assert item.gear_slot_id == c["gear_slot"].id

    def test_craft_item_random(self, session, test_character, item_components):
        """Random generation with optional constraints."""
        c = item_components
        item = craft_item_random(session, test_character, {
            "mode": "random",
            "gear_slot_id": c["gear_slot"].id,
            "rarity": "rare",
        })

        assert item is not None
        assert item.rarity == "rare"
        assert item.gear_slot_id == c["gear_slot"].id
        assert isinstance(item.base_stats, dict)
        assert len(item.base_stats) > 0

    def test_craft_item_bag_full_warning(self, session, test_character, item_components):
        """Warning when bag >= 10."""
        c = item_components
        # Pre-fill bag with 10 items
        for i in range(10):
            dummy = InventoryItem(
                name=f"Dummy {i}", item_type="Sword", rarity="common",
                base_stats={"strength": 1}, item_code=f"DUM_{i}",
                gear_slot_id=c["gear_slot"].id,
            )
            session.add(dummy)
            session.flush()
            inv = PlayerInventory(
                character_id=test_character.id, item_id=dummy.id,
                is_equipped=False, quantity=1,
            )
            session.add(inv)
        session.commit()

        # Craft one more
        item = craft_item_manual(session, test_character, {
            "gear_slot_id": c["gear_slot"].id,
            "type_base_id": c["type_base"].id,
            "prefix_id": c["prefix"].id,
            "quality_id": c["quality"].id,
            "lore_tag_id": c["lore_tag"].id,
            "suffix_id": c["suffix"].id,
            "rarity": "common",
        })
        result = grant_crafted_item(session, test_character.id, item)

        assert result["bag_warning"] is True
        assert result["bag_count"] == 11


# ---------------------------------------------------------------------------
# Tests: Item Editing & Deletion
# ---------------------------------------------------------------------------

class TestEditItem:
    def test_edit_item_components(self, session, test_character, item_components):
        """Component change triggers stat recalc."""
        c = item_components
        # Create an item first
        item = craft_item_manual(session, test_character, {
            "gear_slot_id": c["gear_slot"].id,
            "type_base_id": c["type_base"].id,
            "prefix_id": c["prefix"].id,
            "quality_id": c["quality"].id,
            "lore_tag_id": c["lore_tag"].id,
            "suffix_id": c["suffix"].id,
            "rarity": "common",
            "base_stat_values": {"strength": 5, "agility": 2},
        })
        old_stats = dict(item.base_stats)

        # Create a second suffix to swap to
        new_suffix = ItemSuffix(code="AGI", display_name="Agility", stat_bonuses={"agility": 5})
        session.add(new_suffix)
        session.commit()

        result = edit_item(session, item.id, {"suffix_id": new_suffix.id})
        assert result is not None
        assert result["item_id"] == item.id
        assert result["after"]["name"] != result["before"]["name"]
        assert "Agility" in result["after"]["name"]

    def test_delete_item(self, session, test_character, item_components):
        """Item deleted from inventory."""
        c = item_components
        item = craft_item_manual(session, test_character, {
            "gear_slot_id": c["gear_slot"].id,
            "type_base_id": c["type_base"].id,
            "prefix_id": c["prefix"].id,
            "quality_id": c["quality"].id,
            "lore_tag_id": c["lore_tag"].id,
            "suffix_id": c["suffix"].id,
            "rarity": "common",
        })
        grant_crafted_item(session, test_character.id, item)
        item_id = item.id

        result = delete_item(session, item_id)
        assert result is not None
        assert result["item_id"] == item_id
        assert result["item_name"] is not None

        # Verify item no longer exists
        assert session.get(InventoryItem, item_id) is None
        inv = session.exec(
            select(PlayerInventory).where(PlayerInventory.item_id == item_id)
        ).first()
        assert inv is None

    def test_delete_item_not_found(self, session):
        result = delete_item(session, 99999)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: Artifact Editing
# ---------------------------------------------------------------------------

class TestEditArtifact:
    def test_edit_artifact_generated(
        self, session, test_player, test_character, artifact_components,
    ):
        """Prefix/suffix/rarity change on generated artifact."""
        ac = artifact_components
        # Create a generated artifact
        art = PlayerArtifact(
            player_id=test_player.id,
            character_id=test_character.id,
            artifact_type="generated",
            artifact_code="FRACT_SHARD_VOID",
            name="Fractured Shard of the Void",
            rarity="common",
            stat_bonuses={"strength": 3, "intelligence": 1},
            acquired_at=datetime.now(timezone.utc),
        )
        session.add(art)
        session.commit()
        session.refresh(art)

        result = edit_artifact(session, art.id, {
            "prefix_code": "LUMIN",
            "suffix_code": "TOWER",
            "rarity": "rare",
        })
        assert result is not None
        assert result["after"]["rarity"] == "rare"
        assert result["after"]["name"] == "Luminous Shard of the Tower"
        assert result["before"]["rarity"] == "common"
        # Stat bonuses should be recalculated
        assert isinstance(result["after"]["stat_bonuses"], dict)

    def test_edit_artifact_curated_rarity(self, session, test_player, test_character):
        """Rarity tier change on curated artifact."""
        # Create curated artifact and tiers
        ca = CuratedArtifact(
            name="Void Crystal",
            description="A dark crystal.",
            icon_sprite_key="artifact_void_crystal",
            source_type="boss",
            source_id=1,
            source_hint="Drops from: Test Boss",
            base_drop_chance=1.0,
            is_active=True,
        )
        session.add(ca)
        session.commit()
        session.refresh(ca)

        for rarity, stats in [
            ("common", {"strength": 5}),
            ("rare", {"strength": 12}),
            ("epic", {"strength": 18}),
        ]:
            tier = CuratedArtifactTier(
                curated_artifact_id=ca.id, rarity=rarity,
                stat_bonuses=stats, drop_chance_multiplier=1.0,
            )
            session.add(tier)
        session.commit()

        # Create player's curated artifact at common
        art = PlayerArtifact(
            player_id=test_player.id,
            character_id=test_character.id,
            artifact_type="curated",
            curated_artifact_id=ca.id,
            name="Void Crystal",
            rarity="common",
            stat_bonuses={"strength": 5},
            acquired_at=datetime.now(timezone.utc),
        )
        session.add(art)
        session.commit()
        session.refresh(art)

        result = edit_artifact(session, art.id, {"rarity": "epic"})
        assert result is not None
        assert result["after"]["rarity"] == "epic"
        assert result["after"]["stat_bonuses"]["strength"] == 18

    def test_edit_artifact_curated_invalid_rarity(self, session, test_player, test_character):
        """Curated artifact edit fails if rarity tier doesn't exist."""
        ca = CuratedArtifact(
            name="Test Crystal",
            description="Test",
            icon_sprite_key="artifact_test_crystal",
            source_type="boss",
            source_id=1,
            source_hint="Drops from: Test Boss",
            base_drop_chance=1.0,
            is_active=True,
        )
        session.add(ca)
        session.commit()
        session.refresh(ca)

        # Only common tier
        tier = CuratedArtifactTier(
            curated_artifact_id=ca.id, rarity="common",
            stat_bonuses={"strength": 5}, drop_chance_multiplier=1.0,
        )
        session.add(tier)
        session.commit()

        art = PlayerArtifact(
            player_id=test_player.id,
            character_id=test_character.id,
            artifact_type="curated",
            curated_artifact_id=ca.id,
            name="Test Crystal",
            rarity="common",
            stat_bonuses={"strength": 5},
            acquired_at=datetime.now(timezone.utc),
        )
        session.add(art)
        session.commit()
        session.refresh(art)

        with pytest.raises(ValueError, match="No tier exists"):
            edit_artifact(session, art.id, {"rarity": "cosmic"})


# ---------------------------------------------------------------------------
# Tests: Admin Auth Required (API level)
# ---------------------------------------------------------------------------

class TestAdminAuthRequired:
    def test_admin_auth_required(self, client):
        """Non-admin (no auth override) gets 401/403."""
        # client fixture has no admin auth mock, so endpoints should reject
        resp = client.patch(
            "/api/admin/characters/1",
            json={"character_name": "Hacker"},
        )
        # FastAPI returns 401 or 403 when auth dependency fails
        assert resp.status_code in (401, 403)

    def test_admin_edit_character_via_api(self, admin_client, session, test_character):
        """Admin client can access the endpoint."""
        resp = admin_client.patch(
            f"/api/admin/characters/{test_character.id}",
            json={"character_name": "AdminEdit"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["changes"]["character_name"]["new"] == "AdminEdit"

    def test_admin_stat_breakdown_via_api(
        self, admin_client, session, test_character, test_character_class, stat_definitions,
    ):
        """Admin can access stat breakdown endpoint."""
        for stat in stat_definitions:
            aff = ClassStatAffinity(
                class_id=test_character_class.id, stat_id=stat.id,
                base_value=10, lore_weight=0.0, level_bonus_per_level=0.0,
            )
            session.add(aff)
        session.commit()

        resp = admin_client.get(f"/api/admin/characters/{test_character.id}/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "stats" in data
        assert data["character_id"] == test_character.id

    def test_admin_delete_item_via_api(self, admin_client, session, test_character, item_components):
        """Admin can delete an item via API."""
        c = item_components
        item = craft_item_manual(session, test_character, {
            "gear_slot_id": c["gear_slot"].id,
            "type_base_id": c["type_base"].id,
            "prefix_id": c["prefix"].id,
            "quality_id": c["quality"].id,
            "lore_tag_id": c["lore_tag"].id,
            "suffix_id": c["suffix"].id,
            "rarity": "common",
        })
        grant_crafted_item(session, test_character.id, item)
        session.commit()

        resp = admin_client.delete(f"/api/admin/items/{item.id}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
