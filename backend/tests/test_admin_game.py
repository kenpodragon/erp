"""Tests for admin game CRUD endpoints (admin_game.py)."""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session, select

from models import (
    GameConfig,
    StatDefinition,
    CharacterClass,
    Skill,
    SkillAction,
    BenefitEffectData,
    ItemPrefix,
    ItemQuality,
    ItemLoreTag,
    ItemTypeBase,
    ItemSuffix,
    GearSlot,
)
from models.character_progression import ClassStatAffinity, SkillPrerequisite


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def game_config(session: Session):
    """Seed a GameConfig row."""
    cfg = GameConfig(
        key="test_scaling_factor",
        value_json=1.5,
        description="Test scaling factor",
        category="combat",
        game_impact="Affects damage scaling",
    )
    session.add(cfg)
    session.commit()
    session.refresh(cfg)
    return cfg


@pytest.fixture
def game_config_extra(session: Session):
    """Seed a second GameConfig for search filtering tests."""
    cfg = GameConfig(
        key="idle_xp_rate",
        value_json=10,
        description="XP earned per idle tick",
        category="idle",
        game_impact="Controls idle training speed",
    )
    session.add(cfg)
    session.commit()
    session.refresh(cfg)
    return cfg


@pytest.fixture
def stat_def(session: Session):
    now = datetime.now(timezone.utc)
    s = StatDefinition(
        name="strength",
        display_name="Strength",
        value_type="integer",
        min_value=1,
        max_value=999,
        description="Physical power",
        category="core",
        created_at=now,
        updated_at=now,
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@pytest.fixture
def char_class(session: Session):
    now = datetime.now(timezone.utc)
    cls = CharacterClass(
        name="Drifter",
        lore_blurb="A wanderer between worlds.",
        base_strength=12,
        base_agility=14,
        base_intelligence=8,
        is_available=True,
        created_at=now,
        updated_at=now,
    )
    session.add(cls)
    session.commit()
    session.refresh(cls)
    return cls


@pytest.fixture
def skill(session: Session):
    now = datetime.now(timezone.utc)
    s = Skill(
        name="blade_mastery",
        display_name="Blade Mastery",
        category="active",
        description="Mastery of bladed weapons",
        xp_curve_type="standard",
        level_0_xp_requirement=0,
        created_at=now,
        updated_at=now,
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@pytest.fixture
def benefit_effect(session: Session):
    now = datetime.now(timezone.utc)
    b = BenefitEffectData(
        effect_key="click_dmg_flat",
        display_name="Click Damage (Flat)",
        description="Adds flat damage to clicks",
        value_type="float",
        min_value=0,
        max_value=9999,
        category="combat",
        created_at=now,
        updated_at=now,
    )
    session.add(b)
    session.commit()
    session.refresh(b)
    return b


@pytest.fixture
def gear_slot(session: Session):
    gs = GearSlot(
        name="weapon",
        display_name="Weapon",
        description="Main hand weapon",
        sort_order=1,
        created_at=datetime.now(timezone.utc),
    )
    session.add(gs)
    session.commit()
    session.refresh(gs)
    return gs


@pytest.fixture
def item_prefix(session: Session):
    now = datetime.now(timezone.utc)
    ip = ItemPrefix(
        code="FLM",
        display_name="Flaming",
        stat_bonuses={"str": 2},
        lore_reference="Book 1 Ch 3",
        created_at=now,
        updated_at=now,
    )
    session.add(ip)
    session.commit()
    session.refresh(ip)
    return ip


# =========================================================================
# 1. Game Configs
# =========================================================================

class TestGameConfigs:
    def test_list_configs(self, admin_client, game_config):
        resp = admin_client.get("/api/admin/game/configs")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        keys = [c["key"] for c in data]
        assert "test_scaling_factor" in keys

    def test_list_configs_search_match(self, admin_client, game_config, game_config_extra):
        resp = admin_client.get("/api/admin/game/configs?search=combat")
        assert resp.status_code == 200
        data = resp.json()
        keys = [c["key"] for c in data]
        assert "test_scaling_factor" in keys
        assert "idle_xp_rate" not in keys

    def test_list_configs_search_no_match(self, admin_client, game_config):
        resp = admin_client.get("/api/admin/game/configs?search=nonexistent_zzz")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_update_config_meta(self, admin_client, game_config):
        resp = admin_client.patch(
            f"/api/admin/game/configs/{game_config.key}/meta",
            json={"description": "Updated desc", "category": "progression"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["description"] == "Updated desc"
        assert data["category"] == "progression"

    def test_update_config_meta_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/configs/nonexistent_key/meta",
            json={"description": "x"},
        )
        assert resp.status_code == 404

    def test_update_config_meta_no_change(self, admin_client, game_config):
        resp = admin_client.patch(
            f"/api/admin/game/configs/{game_config.key}/meta",
            json={},
        )
        assert resp.status_code == 422


# =========================================================================
# 2. Stat Definitions
# =========================================================================

class TestStatDefinitions:
    def test_list_stats(self, admin_client, stat_def):
        resp = admin_client.get("/api/admin/game/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "strength"

    def test_create_stat(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/stats",
            json={
                "name": "agility",
                "display_name": "Agility",
                "value_type": "integer",
                "min_value": 1,
                "max_value": 999,
                "description": "Speed and dexterity",
                "category": "core",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "agility"
        assert data["display_name"] == "Agility"
        assert data["id"] is not None

    def test_update_stat(self, admin_client, stat_def):
        resp = admin_client.patch(
            f"/api/admin/game/stats/{stat_def.id}",
            json={"display_name": "STR", "max_value": 1500},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "STR"
        assert data["max_value"] == 1500

    def test_update_stat_no_change(self, admin_client, stat_def):
        resp = admin_client.patch(
            f"/api/admin/game/stats/{stat_def.id}",
            json={"name": "strength"},
        )
        assert resp.status_code == 422

    def test_update_stat_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/stats/99999",
            json={"name": "x"},
        )
        assert resp.status_code == 404

    def test_delete_stat(self, admin_client, stat_def):
        resp = admin_client.delete(f"/api/admin/game/stats/{stat_def.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted"] is True
        assert data["id"] == stat_def.id

    def test_delete_stat_not_found(self, admin_client):
        resp = admin_client.delete("/api/admin/game/stats/99999")
        assert resp.status_code == 404


# =========================================================================
# 3. Character Classes
# =========================================================================

class TestCharacterClasses:
    def test_list_classes(self, admin_client, char_class):
        resp = admin_client.get("/api/admin/game/classes")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Drifter"
        assert "affinities" in data[0]

    def test_create_class_basic(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/classes",
            json={
                "name": "Engineer",
                "base_strength": 8,
                "base_agility": 10,
                "base_intelligence": 15,
                "is_available": True,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Engineer"
        assert data["base_intelligence"] == 15
        assert data["affinities"] == []

    def test_create_class_with_affinities(self, admin_client, stat_def):
        resp = admin_client.post(
            "/api/admin/game/classes",
            json={
                "name": "Conduit",
                "base_strength": 6,
                "base_agility": 10,
                "base_intelligence": 18,
                "affinities": [
                    {
                        "stat_id": stat_def.id,
                        "base_value": 18,
                        "lore_weight": 0.8,
                        "level_bonus_per_level": 2.0,
                    }
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Conduit"
        assert len(data["affinities"]) == 1
        assert data["affinities"][0]["stat_id"] == stat_def.id
        assert data["affinities"][0]["base_value"] == 18

    def test_update_class(self, admin_client, char_class):
        resp = admin_client.patch(
            f"/api/admin/game/classes/{char_class.id}",
            json={"lore_blurb": "Updated lore", "base_strength": 20},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["lore_blurb"] == "Updated lore"
        assert data["base_strength"] == 20

    def test_update_class_with_affinities(self, admin_client, char_class, stat_def):
        resp = admin_client.patch(
            f"/api/admin/game/classes/{char_class.id}",
            json={
                "affinities": [
                    {"stat_id": stat_def.id, "base_value": 25, "lore_weight": 0.5, "level_bonus_per_level": 1.0}
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["affinities"]) == 1
        assert data["affinities"][0]["base_value"] == 25

    def test_update_class_no_change(self, admin_client, char_class):
        resp = admin_client.patch(
            f"/api/admin/game/classes/{char_class.id}",
            json={"name": "Drifter"},
        )
        assert resp.status_code == 422

    def test_update_class_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/classes/99999",
            json={"name": "x"},
        )
        assert resp.status_code == 404

    def test_delete_class(self, admin_client, char_class):
        resp = admin_client.delete(f"/api/admin/game/classes/{char_class.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted"] is True
        assert data["id"] == char_class.id

    def test_delete_class_not_found(self, admin_client):
        resp = admin_client.delete("/api/admin/game/classes/99999")
        assert resp.status_code == 404

    def test_delete_class_removes_affinities(self, admin_client, session, stat_def):
        """Deleting a class should also remove its affinities."""
        # Create class with affinities
        create_resp = admin_client.post(
            "/api/admin/game/classes",
            json={
                "name": "Vessel",
                "base_strength": 15,
                "base_agility": 8,
                "base_intelligence": 10,
                "affinities": [
                    {"stat_id": stat_def.id, "base_value": 15, "lore_weight": 0.3, "level_bonus_per_level": 1.5}
                ],
            },
        )
        assert create_resp.status_code == 201
        class_id = create_resp.json()["id"]

        # Verify affinity exists
        affs = session.exec(
            select(ClassStatAffinity).where(ClassStatAffinity.class_id == class_id)
        ).all()
        assert len(affs) == 1

        # Delete class
        del_resp = admin_client.delete(f"/api/admin/game/classes/{class_id}")
        assert del_resp.status_code == 200

        # Verify affinities removed
        affs_after = session.exec(
            select(ClassStatAffinity).where(ClassStatAffinity.class_id == class_id)
        ).all()
        assert len(affs_after) == 0


# =========================================================================
# 4. Skills
# =========================================================================

class TestSkills:
    def test_list_skills(self, admin_client, skill):
        resp = admin_client.get("/api/admin/game/skills")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["name"] == "blade_mastery"
        assert "actions" in data[0]
        assert "prerequisites" in data[0]

    def test_create_skill_basic(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/skills",
            json={
                "name": "fire_magic",
                "display_name": "Fire Magic",
                "category": "active",
                "description": "Harness flames",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "fire_magic"
        assert data["actions"] == []
        assert data["prerequisites"] == []

    def test_create_skill_with_actions(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/skills",
            json={
                "name": "swordsmanship",
                "category": "active",
                "actions": [
                    {
                        "name": "slash",
                        "display_name": "Slash",
                        "lore_description": "A basic horizontal cut.",
                        "level_required": 1,
                        "interval_ms": 2000,
                        "xp_per_action": 15,
                        "sort_order": 0,
                    },
                    {
                        "name": "thrust",
                        "display_name": "Thrust",
                        "lore_description": "A piercing forward strike.",
                        "level_required": 5,
                        "interval_ms": 2500,
                        "xp_per_action": 25,
                        "sort_order": 1,
                    },
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "swordsmanship"
        assert len(data["actions"]) == 2
        action_names = [a["name"] for a in data["actions"]]
        assert "slash" in action_names
        assert "thrust" in action_names

    def test_create_skill_with_prerequisites(self, admin_client, skill):
        resp = admin_client.post(
            "/api/admin/game/skills",
            json={
                "name": "advanced_blade",
                "category": "active",
                "prerequisites": [
                    {
                        "prerequisite_type": "skill_level",
                        "ref_id": skill.id,
                        "min_value": 10,
                        "display_hint": "Requires Blade Mastery Lv.10",
                    }
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["prerequisites"]) == 1
        assert data["prerequisites"][0]["prerequisite_type"] == "skill_level"
        assert data["prerequisites"][0]["ref_id"] == skill.id

    def test_update_skill(self, admin_client, skill):
        resp = admin_client.patch(
            f"/api/admin/game/skills/{skill.id}",
            json={"display_name": "Blade Arts", "description": "Updated mastery desc"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "Blade Arts"
        assert data["description"] == "Updated mastery desc"

    def test_update_skill_replace_actions(self, admin_client, session, skill):
        """Providing actions on update replaces all existing actions."""
        # Add an action first
        action = SkillAction(
            skill_id=skill.id,
            name="old_action",
            display_name="Old",
            lore_description="Old desc",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(action)
        session.commit()

        resp = admin_client.patch(
            f"/api/admin/game/skills/{skill.id}",
            json={
                "actions": [
                    {
                        "name": "new_action",
                        "display_name": "New",
                        "lore_description": "New desc",
                        "level_required": 1,
                        "interval_ms": 3000,
                        "xp_per_action": 10,
                        "sort_order": 0,
                    }
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) == 1
        assert data["actions"][0]["name"] == "new_action"

    def test_update_skill_no_change(self, admin_client, skill):
        resp = admin_client.patch(
            f"/api/admin/game/skills/{skill.id}",
            json={"name": "blade_mastery"},
        )
        assert resp.status_code == 422

    def test_update_skill_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/skills/99999",
            json={"name": "x"},
        )
        assert resp.status_code == 404

    def test_delete_skill(self, admin_client, skill):
        resp = admin_client.delete(f"/api/admin/game/skills/{skill.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted"] is True
        assert data["id"] == skill.id

    def test_delete_skill_not_found(self, admin_client):
        resp = admin_client.delete("/api/admin/game/skills/99999")
        assert resp.status_code == 404

    def test_delete_skill_removes_children(self, admin_client, session):
        """Deleting a skill should also remove its actions and prerequisites."""
        # Create skill with action and prerequisite
        create_resp = admin_client.post(
            "/api/admin/game/skills",
            json={
                "name": "doomed_skill",
                "category": "idle",
                "actions": [
                    {
                        "name": "act1",
                        "display_name": "Act 1",
                        "lore_description": "Test",
                        "level_required": 1,
                        "interval_ms": 3000,
                        "xp_per_action": 10,
                        "sort_order": 0,
                    }
                ],
                "prerequisites": [
                    {
                        "prerequisite_type": "character_level",
                        "min_value": 5,
                        "display_hint": "Requires level 5",
                    }
                ],
            },
        )
        assert create_resp.status_code == 201
        skill_id = create_resp.json()["id"]

        # Verify children exist
        actions = session.exec(select(SkillAction).where(SkillAction.skill_id == skill_id)).all()
        prereqs = session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill_id)).all()
        assert len(actions) == 1
        assert len(prereqs) == 1

        # Delete
        del_resp = admin_client.delete(f"/api/admin/game/skills/{skill_id}")
        assert del_resp.status_code == 200

        # Verify children removed
        assert len(session.exec(select(SkillAction).where(SkillAction.skill_id == skill_id)).all()) == 0
        assert len(session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill_id)).all()) == 0


# =========================================================================
# 5. Benefit Effects
# =========================================================================

class TestBenefitEffects:
    def test_list_benefits(self, admin_client, benefit_effect):
        resp = admin_client.get("/api/admin/game/benefits")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["effect_key"] == "click_dmg_flat"

    def test_create_benefit(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/benefits",
            json={
                "effect_key": "auto_dps_mult",
                "display_name": "Auto-DPS Multiplier",
                "description": "Multiplies auto DPS",
                "value_type": "float",
                "min_value": 0.0,
                "max_value": 100.0,
                "category": "combat",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["effect_key"] == "auto_dps_mult"
        assert data["id"] is not None

    def test_update_benefit(self, admin_client, benefit_effect):
        resp = admin_client.patch(
            f"/api/admin/game/benefits/{benefit_effect.id}",
            json={"display_name": "Click DMG+", "max_value": 50000},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "Click DMG+"
        assert data["max_value"] == 50000

    def test_update_benefit_no_change(self, admin_client, benefit_effect):
        resp = admin_client.patch(
            f"/api/admin/game/benefits/{benefit_effect.id}",
            json={"effect_key": "click_dmg_flat"},
        )
        assert resp.status_code == 422

    def test_update_benefit_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/benefits/99999",
            json={"display_name": "x"},
        )
        assert resp.status_code == 404

    def test_delete_benefit(self, admin_client, benefit_effect):
        resp = admin_client.delete(f"/api/admin/game/benefits/{benefit_effect.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted"] is True
        assert data["id"] == benefit_effect.id

    def test_delete_benefit_not_found(self, admin_client):
        resp = admin_client.delete("/api/admin/game/benefits/99999")
        assert resp.status_code == 404


# =========================================================================
# 6. Item Components
# =========================================================================

class TestItemComponents:
    def test_list_all_components(self, admin_client, item_prefix):
        resp = admin_client.get("/api/admin/game/items/components")
        assert resp.status_code == 200
        data = resp.json()
        # Should have all 5 component types as keys
        for key in ["prefixes", "qualities", "lore_tags", "type_bases", "suffixes"]:
            assert key in data
        # Our seeded prefix should be present
        prefix_codes = [p["code"] for p in data["prefixes"]]
        assert "FLM" in prefix_codes

    # --- Prefixes (full CRUD) ---

    def test_create_prefix(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/items/prefixes",
            json={
                "code": "ICY",
                "display_name": "Icy",
                "stat_bonuses": {"int": 3},
                "lore_reference": "Book 2 Ch 7",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["code"] == "ICY"
        assert data["display_name"] == "Icy"

    def test_update_prefix(self, admin_client, item_prefix):
        resp = admin_client.patch(
            f"/api/admin/game/items/prefixes/{item_prefix.id}",
            json={"display_name": "Blazing", "stat_bonuses": {"str": 5}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "Blazing"

    def test_update_prefix_no_change(self, admin_client, item_prefix):
        resp = admin_client.patch(
            f"/api/admin/game/items/prefixes/{item_prefix.id}",
            json={"code": "FLM"},
        )
        assert resp.status_code == 422

    def test_update_prefix_not_found(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/items/prefixes/99999",
            json={"display_name": "x"},
        )
        assert resp.status_code == 404

    def test_delete_prefix(self, admin_client, item_prefix):
        resp = admin_client.delete(f"/api/admin/game/items/prefixes/{item_prefix.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["deleted"] is True
        assert data["id"] == item_prefix.id

    def test_delete_prefix_not_found(self, admin_client):
        resp = admin_client.delete("/api/admin/game/items/prefixes/99999")
        assert resp.status_code == 404

    # --- Qualities ---

    def test_create_quality(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/items/qualities",
            json={"code": "SUP", "display_name": "Superior"},
        )
        assert resp.status_code == 201
        assert resp.json()["code"] == "SUP"

    # --- Lore Tags ---

    def test_create_lore_tag(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/items/lore_tags",
            json={"code": "ANC", "display_name": "Ancient", "narrative_context": "From the old world"},
        )
        assert resp.status_code == 201
        assert resp.json()["code"] == "ANC"

    # --- Type Bases ---

    def test_create_type_base(self, admin_client, gear_slot):
        resp = admin_client.post(
            "/api/admin/game/items/type_bases",
            json={
                "code": "SWD",
                "display_name": "Sword",
                "gear_slot_id": gear_slot.id,
                "base_stat_range": {"min": 10, "max": 50},
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["code"] == "SWD"
        assert data["gear_slot_id"] == gear_slot.id

    # --- Suffixes ---

    def test_create_suffix(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/items/suffixes",
            json={
                "code": "PWR",
                "display_name": "of Power",
                "stat_bonuses": {"str": 10},
                "lore_reference": "Book 3 Ch 1",
            },
        )
        assert resp.status_code == 201
        assert resp.json()["code"] == "PWR"

    # --- Invalid component type ---

    def test_create_invalid_component_type(self, admin_client):
        resp = admin_client.post(
            "/api/admin/game/items/invalid_type",
            json={"code": "X", "display_name": "X"},
        )
        assert resp.status_code == 400

    def test_update_invalid_component_type(self, admin_client):
        resp = admin_client.patch(
            "/api/admin/game/items/invalid_type/1",
            json={"code": "X"},
        )
        assert resp.status_code == 400

    def test_delete_invalid_component_type(self, admin_client):
        resp = admin_client.delete("/api/admin/game/items/invalid_type/1")
        assert resp.status_code == 400
