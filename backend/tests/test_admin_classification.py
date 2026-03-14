"""Comprehensive tests for 5.3 Entity Classification admin endpoints.

Covers:
  - Entity Types CRUD
  - Entity Families CRUD
  - Visual Behaviors CRUD
  - Attack Types (Extended)
  - Bulk Assignment
  - Audit Summary
  - Template Application
"""

import pytest
from datetime import datetime, timezone

from models import (
    Entity, EntityGameplayData, AttackType, EntityAttackType,
    EntityType, EntityFamily, VisualBehavior,
)

BASE = "/api/admin/classification"


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


def _make_entity_type(session, name="enemy", display_name="Enemy",
                      color_hex="#FF4444", sort_order=1, description=None):
    et = EntityType(name=name, display_name=display_name, color_hex=color_hex,
                    sort_order=sort_order, description=description,
                    created_at=_now(), updated_at=_now())
    session.add(et)
    session.commit()
    session.refresh(et)
    return et


def _make_entity_family(session, name="Wraith", display_name="Wraith",
                        base_stat_template=None, sort_order=1,
                        description=None, icon_key=None, lore_reference=None):
    ef = EntityFamily(name=name, display_name=display_name,
                      base_stat_template=base_stat_template,
                      sort_order=sort_order, description=description,
                      icon_key=icon_key, lore_reference=lore_reference,
                      created_at=_now(), updated_at=_now())
    session.add(ef)
    session.commit()
    session.refresh(ef)
    return ef


def _make_entity(session, name="Goblin", entity_type_id=None,
                 entity_family_id=None):
    e = Entity(canonical_name=name, entity_type_id=entity_type_id,
               entity_family_id=entity_family_id,
               created_at=_now(), updated_at=_now())
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


def _make_visual_behavior(session, name="melee_swing", display_name="Melee Swing",
                          animation_config=None, sort_order=1):
    vb = VisualBehavior(name=name, display_name=display_name,
                        animation_config=animation_config or {},
                        sort_order=sort_order,
                        created_at=_now(), updated_at=_now())
    session.add(vb)
    session.commit()
    session.refresh(vb)
    return vb


def _make_attack_type(session, name="slash", display_name="Slash",
                      is_physical=True, visual_behavior_id=None,
                      stat_multipliers=None):
    at = AttackType(name=name, display_name=display_name,
                    is_physical=is_physical,
                    visual_behavior_id=visual_behavior_id,
                    stat_multipliers=stat_multipliers,
                    created_at=_now(), updated_at=_now())
    session.add(at)
    session.commit()
    session.refresh(at)
    return at


def _make_entity_attack_type(session, entity_id, attack_type_id,
                              is_primary=False):
    eat = EntityAttackType(entity_id=entity_id, attack_type_id=attack_type_id,
                           is_primary=is_primary, created_at=_now())
    session.add(eat)
    session.commit()
    session.refresh(eat)
    return eat


def _make_gameplay_data(session, entity_id, base_hp=100, base_gold=10,
                        stat_block=None):
    gp = EntityGameplayData(entity_id=entity_id, base_hp=base_hp,
                            base_gold=base_gold, stat_block=stat_block,
                            created_at=_now(), updated_at=_now())
    session.add(gp)
    session.commit()
    session.refresh(gp)
    return gp


# ===========================================================================
#  ENTITY TYPE CRUD
# ===========================================================================

class TestEntityTypeCRUD:

    def test_list_entity_types(self, admin_client, session):
        """Create types, list them, verify response format and entity counts."""
        et1 = _make_entity_type(session, name="enemy", display_name="Enemy", sort_order=1)
        et2 = _make_entity_type(session, name="npc", display_name="NPC", sort_order=2)
        # Create an entity referencing et1
        _make_entity(session, name="Goblin", entity_type_id=et1.id)
        _make_entity(session, name="Orc", entity_type_id=et1.id)

        resp = admin_client.get(f"{BASE}/entity-types")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert data["total"] == 2

        # First item (sort_order=1) should be "enemy" with 2 entities
        items = data["items"]
        enemy_item = next(i for i in items if i["name"] == "enemy")
        assert enemy_item["display_name"] == "Enemy"
        assert enemy_item["entity_count"] == 2
        assert enemy_item["color_hex"] == "#FF4444"

        npc_item = next(i for i in items if i["name"] == "npc")
        assert npc_item["entity_count"] == 0

    def test_create_entity_type(self, admin_client, session):
        """Create with valid data, verify all fields returned."""
        resp = admin_client.post(f"{BASE}/entity-types", json={
            "name": "boss",
            "display_name": "Boss",
            "description": "A boss entity",
            "color_hex": "#AA0000",
            "sort_order": 5,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "boss"
        assert data["display_name"] == "Boss"
        assert data["description"] == "A boss entity"
        assert data["color_hex"] == "#AA0000"
        assert data["sort_order"] == 5
        assert data["id"] is not None
        assert data["created_at"] is not None

    def test_create_entity_type_duplicate(self, admin_client, session):
        """Duplicate name returns 422."""
        _make_entity_type(session, name="enemy", display_name="Enemy")
        resp = admin_client.post(f"{BASE}/entity-types", json={
            "name": "enemy",
            "display_name": "Enemy 2",
        })
        assert resp.status_code == 422
        assert "already exists" in resp.json()["detail"]

    def test_create_entity_type_invalid_name(self, admin_client, session):
        """Invalid name format (uppercase, spaces) returns 422."""
        resp = admin_client.post(f"{BASE}/entity-types", json={
            "name": "Bad Name!",
            "display_name": "Bad",
        })
        assert resp.status_code == 422

    def test_update_entity_type(self, admin_client, session):
        """Partial update, verify fields changed."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        resp = admin_client.patch(f"{BASE}/entity-types/{et.id}", json={
            "display_name": "Hostile Enemy",
            "color_hex": "#BB0000",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "Hostile Enemy"
        assert data["color_hex"] == "#BB0000"
        # Name should be unchanged
        assert data["name"] == "enemy"

    def test_delete_entity_type(self, admin_client, session):
        """Delete with no entities referencing it, verify 200/204."""
        et = _make_entity_type(session, name="temp_type", display_name="Temp")
        resp = admin_client.delete(f"{BASE}/entity-types/{et.id}")
        assert resp.status_code == 204

        # Verify it's gone
        resp2 = admin_client.get(f"{BASE}/entity-types")
        names = [i["name"] for i in resp2.json()["items"]]
        assert "temp_type" not in names

    def test_delete_entity_type_blocked(self, admin_client, session):
        """Delete with entities referencing it returns 409."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        _make_entity(session, name="Goblin", entity_type_id=et.id)

        resp = admin_client.delete(f"{BASE}/entity-types/{et.id}")
        assert resp.status_code == 409
        assert "Cannot delete" in resp.json()["detail"]


# ===========================================================================
#  ENTITY FAMILY CRUD
# ===========================================================================

class TestEntityFamilyCRUD:

    def test_list_entity_families(self, admin_client, session):
        """List with search filter and pagination."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        _make_entity_family(session, name="Wraith", display_name="Wraith", sort_order=1)
        _make_entity_family(session, name="Golem", display_name="Golem", sort_order=2)
        _make_entity_family(session, name="Spirit", display_name="Spirit", sort_order=3)

        # List all
        resp = admin_client.get(f"{BASE}/entity-families")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3

        # Search filter
        resp2 = admin_client.get(f"{BASE}/entity-families?search=wra")
        data2 = resp2.json()
        assert data2["total"] == 1
        assert data2["items"][0]["name"] == "Wraith"

        # Pagination
        resp3 = admin_client.get(f"{BASE}/entity-families?page=1&page_size=2")
        data3 = resp3.json()
        assert len(data3["items"]) == 2
        assert data3["total"] == 3

    def test_create_entity_family(self, admin_client, session):
        """Create with base_stat_template."""
        template = {"strength": 10, "agility": 5, "intelligence": 3,
                    "base_hp": 100, "base_gold": 50}
        resp = admin_client.post(f"{BASE}/entity-families", json={
            "name": "Demon",
            "display_name": "Demon",
            "description": "Fiery demons",
            "icon_key": "demon_icon",
            "lore_reference": "Book 1, Chapter 3",
            "base_stat_template": template,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Demon"
        assert data["base_stat_template"] == template
        assert data["icon_key"] == "demon_icon"
        assert data["lore_reference"] == "Book 1, Chapter 3"

    def test_create_entity_family_duplicate(self, admin_client, session):
        """Duplicate name returns 422."""
        _make_entity_family(session, name="Wraith", display_name="Wraith")
        resp = admin_client.post(f"{BASE}/entity-families", json={
            "name": "Wraith",
            "display_name": "Wraith 2",
        })
        assert resp.status_code == 422
        assert "already exists" in resp.json()["detail"]

    def test_update_entity_family(self, admin_client, session):
        """Partial update."""
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith")
        resp = admin_client.patch(f"{BASE}/entity-families/{ef.id}", json={
            "display_name": "Dark Wraith",
            "description": "Shadowy wraiths",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["display_name"] == "Dark Wraith"
        assert data["description"] == "Shadowy wraiths"
        assert data["name"] == "Wraith"

    def test_delete_entity_family_blocked(self, admin_client, session):
        """Delete with entities referencing it returns 409."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith")
        _make_entity(session, name="Shadow Wraith", entity_type_id=et.id,
                     entity_family_id=ef.id)

        resp = admin_client.delete(f"{BASE}/entity-families/{ef.id}")
        assert resp.status_code == 409
        assert "Cannot delete" in resp.json()["detail"]


# ===========================================================================
#  VISUAL BEHAVIOR CRUD
# ===========================================================================

class TestVisualBehaviorCRUD:

    def test_list_visual_behaviors(self, admin_client, session):
        """List with attack_type_count and transitive_entity_count."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        vb = _make_visual_behavior(session, name="melee_swing",
                                   display_name="Melee Swing")
        at = _make_attack_type(session, name="slash", display_name="Slash",
                               visual_behavior_id=vb.id)
        # Create entity with primary attack type using this visual behavior
        e = _make_entity(session, name="Goblin", entity_type_id=et.id)
        _make_entity_attack_type(session, e.id, at.id, is_primary=True)

        resp = admin_client.get(f"{BASE}/visual-behaviors")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        item = data["items"][0]
        assert item["name"] == "melee_swing"
        assert item["attack_type_count"] == 1
        assert item["transitive_entity_count"] == 1

    def test_create_visual_behavior(self, admin_client, session):
        """Create with animation_config."""
        config = {"frames": 8, "speed": 0.15, "loop": True}
        resp = admin_client.post(f"{BASE}/visual-behaviors", json={
            "name": "ranged_cast",
            "display_name": "Ranged Cast",
            "description": "Casting animation",
            "animation_config": config,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "ranged_cast"
        assert data["animation_config"] == config
        assert data["description"] == "Casting animation"

    def test_delete_visual_behavior_blocked(self, admin_client, session):
        """Delete when attack types reference it returns 409."""
        vb = _make_visual_behavior(session, name="melee_swing",
                                   display_name="Melee Swing")
        _make_attack_type(session, name="slash", display_name="Slash",
                          visual_behavior_id=vb.id)

        resp = admin_client.delete(f"{BASE}/visual-behaviors/{vb.id}")
        assert resp.status_code == 409
        assert "Cannot delete" in resp.json()["detail"]


# ===========================================================================
#  ATTACK TYPES (Extended)
# ===========================================================================

class TestAttackTypeExtended:

    def test_list_attack_types_extended(self, admin_client, session):
        """Verify visual_behavior_name and entity_count included."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        vb = _make_visual_behavior(session, name="melee_swing",
                                   display_name="Melee Swing")
        at = _make_attack_type(session, name="slash", display_name="Slash",
                               visual_behavior_id=vb.id)
        e = _make_entity(session, name="Goblin", entity_type_id=et.id)
        _make_entity_attack_type(session, e.id, at.id, is_primary=True)

        resp = admin_client.get(f"{BASE}/attack-types")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        item = data["items"][0]
        assert item["visual_behavior_name"] == "melee_swing"
        assert item["entity_count"] == 1
        assert item["name"] == "slash"

    def test_update_attack_type_visual_behavior(self, admin_client, session):
        """Set visual_behavior_id on an attack type."""
        vb = _make_visual_behavior(session, name="ranged_cast",
                                   display_name="Ranged Cast")
        at = _make_attack_type(session, name="fireball", display_name="Fireball",
                               is_physical=False)

        resp = admin_client.patch(f"{BASE}/attack-types/{at.id}", json={
            "visual_behavior_id": vb.id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["visual_behavior_id"] == vb.id
        assert data["visual_behavior_name"] == "ranged_cast"

    def test_update_attack_type_stat_multipliers(self, admin_client, session):
        """Set stat_multipliers JSON."""
        at = _make_attack_type(session, name="slash", display_name="Slash")
        multipliers = {"strength": 1.5, "hp_multiplier": 1.2,
                       "gold_multiplier": 0.8}

        resp = admin_client.patch(f"{BASE}/attack-types/{at.id}", json={
            "stat_multipliers": multipliers,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["stat_multipliers"] == multipliers


# ===========================================================================
#  BULK ASSIGNMENT
# ===========================================================================

class TestBulkAssignment:

    def _setup_entities(self, session):
        """Create 3 entities with a type for bulk operations."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        e1 = _make_entity(session, name="Goblin", entity_type_id=et.id)
        e2 = _make_entity(session, name="Orc", entity_type_id=et.id)
        e3 = _make_entity(session, name="Troll", entity_type_id=et.id)
        return et, e1, e2, e3

    def test_bulk_assign_type(self, admin_client, session):
        """Assign type to multiple entities."""
        et1 = _make_entity_type(session, name="enemy", display_name="Enemy")
        et2 = _make_entity_type(session, name="boss", display_name="Boss")
        e1 = _make_entity(session, name="Goblin", entity_type_id=et1.id)
        e2 = _make_entity(session, name="Orc", entity_type_id=et1.id)

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id, e2.id],
            "action": "assign_type",
            "payload": {"entity_type_id": et2.id},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 2
        assert data["error_count"] == 0

        # Verify change
        session.expire_all()
        e1_updated = session.get(Entity, e1.id)
        assert e1_updated.entity_type_id == et2.id

    def test_bulk_assign_family(self, admin_client, session):
        """Assign family to multiple entities."""
        et, e1, e2, e3 = self._setup_entities(session)
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith")

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id, e2.id, e3.id],
            "action": "assign_family",
            "payload": {"entity_family_id": ef.id},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 3

        session.expire_all()
        assert session.get(Entity, e1.id).entity_family_id == ef.id

    def test_bulk_add_attack_types(self, admin_client, session):
        """Add attack types to entities (additive)."""
        et, e1, e2, _ = self._setup_entities(session)
        at1 = _make_attack_type(session, name="slash", display_name="Slash")
        at2 = _make_attack_type(session, name="bite", display_name="Bite")

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id, e2.id],
            "action": "add_attack_types",
            "payload": {"attack_type_ids": [at1.id, at2.id]},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 2

        # Verify entity1 has both attack types
        from sqlmodel import select
        eats = session.exec(
            select(EntityAttackType).where(EntityAttackType.entity_id == e1.id)
        ).all()
        assert len(eats) == 2

    def test_bulk_replace_attack_types(self, admin_client, session):
        """Replace all attack types."""
        et, e1, _, _ = self._setup_entities(session)
        at1 = _make_attack_type(session, name="slash", display_name="Slash")
        at2 = _make_attack_type(session, name="bite", display_name="Bite")
        # Pre-assign at1
        _make_entity_attack_type(session, e1.id, at1.id, is_primary=True)

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id],
            "action": "replace_attack_types",
            "payload": {"attack_type_ids": [at2.id], "primary_id": at2.id},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 1

        # Verify only at2 remains, and it's primary
        from sqlmodel import select
        session.expire_all()
        eats = session.exec(
            select(EntityAttackType).where(EntityAttackType.entity_id == e1.id)
        ).all()
        assert len(eats) == 1
        assert eats[0].attack_type_id == at2.id
        assert eats[0].is_primary is True

    def test_bulk_set_primary(self, admin_client, session):
        """Set primary attack type."""
        et, e1, _, _ = self._setup_entities(session)
        at1 = _make_attack_type(session, name="slash", display_name="Slash")
        at2 = _make_attack_type(session, name="bite", display_name="Bite")
        _make_entity_attack_type(session, e1.id, at1.id, is_primary=True)
        _make_entity_attack_type(session, e1.id, at2.id, is_primary=False)

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id],
            "action": "set_primary",
            "payload": {"attack_type_id": at2.id},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 1

        # Verify at2 is now primary, at1 is not
        from sqlmodel import select
        session.expire_all()
        eats = session.exec(
            select(EntityAttackType).where(EntityAttackType.entity_id == e1.id)
        ).all()
        at_map = {r.attack_type_id: r.is_primary for r in eats}
        assert at_map[at1.id] is False
        assert at_map[at2.id] is True

    def test_bulk_create_family(self, admin_client, session):
        """Create new family and assign to entities."""
        et, e1, e2, _ = self._setup_entities(session)

        resp = admin_client.post(f"{BASE}/bulk-assign", json={
            "entity_ids": [e1.id, e2.id],
            "action": "create_family",
            "payload": {
                "family_name": "NewFamily",
                "family_display_name": "New Family",
            },
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success_count"] == 2

        # Verify new family exists and entities are assigned
        from sqlmodel import select
        session.expire_all()
        ef = session.exec(
            select(EntityFamily).where(EntityFamily.name == "NewFamily")
        ).first()
        assert ef is not None
        assert session.get(Entity, e1.id).entity_family_id == ef.id
        assert session.get(Entity, e2.id).entity_family_id == ef.id


# ===========================================================================
#  AUDIT
# ===========================================================================

class TestAudit:

    def test_audit_summary(self, admin_client, session):
        """Verify summary counts."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith")
        at = _make_attack_type(session, name="slash", display_name="Slash")

        # Entity 1: fully classified
        e1 = _make_entity(session, name="Goblin", entity_type_id=et.id,
                          entity_family_id=ef.id)
        _make_entity_attack_type(session, e1.id, at.id, is_primary=True)
        _make_gameplay_data(session, e1.id, stat_block={"strength": 10})

        # Entity 2: missing family, attack types, stat block
        e2 = _make_entity(session, name="Orc", entity_type_id=et.id)

        resp = admin_client.get(f"{BASE}/audit")
        assert resp.status_code == 200
        data = resp.json()
        summary = data["summary"]
        assert summary["total_entities"] == 2
        assert summary["with_type"] == 2
        assert summary["with_family"] == 1
        assert summary["with_attack_types"] == 1
        assert summary["with_primary_attack_type"] == 1
        assert summary["with_stat_block"] == 1

    def test_audit_incomplete_entities(self, admin_client, session):
        """Verify incomplete entities listed correctly."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith")
        at = _make_attack_type(session, name="slash", display_name="Slash")

        # Fully classified — should NOT appear in incomplete
        e1 = _make_entity(session, name="Complete", entity_type_id=et.id,
                          entity_family_id=ef.id)
        _make_entity_attack_type(session, e1.id, at.id, is_primary=True)
        vb = _make_visual_behavior(session, name="melee_swing",
                                   display_name="Melee Swing")
        # Update attack type to have visual behavior
        at_obj = session.get(AttackType, at.id)
        at_obj.visual_behavior_id = vb.id
        session.add(at_obj)
        session.commit()
        _make_gameplay_data(session, e1.id, stat_block={"strength": 10})

        # Incomplete — missing family, attack_types, stat_block
        e2 = _make_entity(session, name="Incomplete", entity_type_id=et.id)

        resp = admin_client.get(f"{BASE}/audit")
        data = resp.json()
        incomplete = data["incomplete_entities"]
        assert incomplete["total"] >= 1
        names = [i["canonical_name"] for i in incomplete["items"]]
        assert "Incomplete" in names
        # "Complete" should NOT be in incomplete list
        assert "Complete" not in names

        # Check missing fields for the incomplete entity
        inc_item = next(i for i in incomplete["items"]
                        if i["canonical_name"] == "Incomplete")
        assert "family" in inc_item["missing"]
        assert "attack_types" in inc_item["missing"]

        # Filter by missing=family
        resp2 = admin_client.get(f"{BASE}/audit?missing=family")
        data2 = resp2.json()
        names2 = [i["canonical_name"] for i in data2["incomplete_entities"]["items"]]
        assert "Incomplete" in names2


# ===========================================================================
#  TEMPLATE APPLICATION
# ===========================================================================

class TestTemplateApplication:

    def test_apply_template_preview(self, admin_client, session):
        """Preview returns proposed stat blocks."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith",
                                 base_stat_template={
                                     "strength": 20, "agility": 15,
                                     "intelligence": 10,
                                     "base_hp": 200, "base_gold": 100,
                                 })
        at = _make_attack_type(session, name="slash", display_name="Slash",
                               stat_multipliers={
                                   "strength": 1.5, "agility": 1.0,
                                   "intelligence": 0.5,
                                   "hp_multiplier": 2.0,
                                   "gold_multiplier": 1.5,
                               })
        e = _make_entity(session, name="Shadow", entity_type_id=et.id,
                         entity_family_id=ef.id)
        _make_entity_attack_type(session, e.id, at.id, is_primary=True)

        resp = admin_client.post(f"{BASE}/apply-template", json={
            "entity_ids": [e.id],
            "preview_only": True,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["applicable_count"] == 1
        assert data["skipped_count"] == 0

        preview = data["previews"][0]
        assert preview["entity_id"] == e.id
        assert preview["can_apply"] is True
        assert preview["proposed_stat_block"]["strength"] == 30  # 20 * 1.5
        assert preview["proposed_stat_block"]["agility"] == 15   # 15 * 1.0
        assert preview["proposed_stat_block"]["intelligence"] == 5  # 10 * 0.5
        assert preview["proposed_base_hp"] == 400   # 200 * 2.0
        assert preview["proposed_base_gold"] == 150  # 100 * 1.5

        # Preview should NOT write to DB
        from sqlmodel import select
        gp = session.exec(
            select(EntityGameplayData).where(
                EntityGameplayData.entity_id == e.id)
        ).first()
        assert gp is None

    def test_apply_template_commit(self, admin_client, session):
        """Commit writes stat blocks to DB."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        ef = _make_entity_family(session, name="Wraith", display_name="Wraith",
                                 base_stat_template={
                                     "strength": 10, "agility": 10,
                                     "intelligence": 10,
                                     "base_hp": 100, "base_gold": 50,
                                 })
        at = _make_attack_type(session, name="slash", display_name="Slash",
                               stat_multipliers={
                                   "strength": 2.0,
                                   "hp_multiplier": 1.5,
                                   "gold_multiplier": 2.0,
                               })
        e = _make_entity(session, name="Shadow", entity_type_id=et.id,
                         entity_family_id=ef.id)
        _make_entity_attack_type(session, e.id, at.id, is_primary=True)

        resp = admin_client.post(f"{BASE}/apply-template", json={
            "entity_ids": [e.id],
            "preview_only": False,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["applicable_count"] == 1

        # Verify data written to DB
        from sqlmodel import select
        session.expire_all()
        gp = session.exec(
            select(EntityGameplayData).where(
                EntityGameplayData.entity_id == e.id)
        ).first()
        assert gp is not None
        assert gp.stat_block["strength"] == 20  # 10 * 2.0
        assert gp.base_hp == 150  # 100 * 1.5
        assert gp.base_gold == 100  # 50 * 2.0

    def test_apply_template_no_family(self, admin_client, session):
        """Entity without family shows warning and cannot apply."""
        et = _make_entity_type(session, name="enemy", display_name="Enemy")
        e = _make_entity(session, name="Orphan", entity_type_id=et.id)

        resp = admin_client.post(f"{BASE}/apply-template", json={
            "entity_ids": [e.id],
            "preview_only": True,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["applicable_count"] == 0
        assert data["skipped_count"] == 1

        preview = data["previews"][0]
        assert preview["can_apply"] is False
        assert len(preview["warnings"]) > 0
        assert any("family" in w.lower() for w in preview["warnings"])
