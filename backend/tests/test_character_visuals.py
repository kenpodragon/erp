"""Tests for GET /api/game/character/visuals endpoint."""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session

from models import (
    Player, CharacterClass, PlayerCharacter,
    GearSlot, ItemTypeBase, ArmorClass,
)
from models.inventory import InventoryItem, PlayerInventory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_gear_slot(session: Session, name: str, display_name: str,
                    paperdoll_layer: int | None, sort_order: int = 0) -> GearSlot:
    gs = GearSlot(
        name=name,
        display_name=display_name,
        paperdoll_layer=paperdoll_layer,
        sort_order=sort_order,
        created_at=datetime.now(timezone.utc),
    )
    session.add(gs)
    session.commit()
    session.refresh(gs)
    return gs


def _make_armor_class(session: Session, code: str, display_name: str,
                      overlay_opacity: float = 0.5,
                      texture_pattern: str = "solid",
                      glow_intensity: float = 0) -> ArmorClass:
    ac = ArmorClass(
        code=code,
        display_name=display_name,
        overlay_opacity=overlay_opacity,
        texture_pattern=texture_pattern,
        glow_intensity=glow_intensity,
        created_at=datetime.now(timezone.utc),
    )
    session.add(ac)
    session.commit()
    session.refresh(ac)
    return ac


def _make_item_type_base(session: Session, code: str, gear_slot_id: int,
                         armor_class_id: int | None = None,
                         player_attack_animation: str | None = None) -> ItemTypeBase:
    tb = ItemTypeBase(
        code=code,
        display_name=code.replace("_", " ").title(),
        gear_slot_id=gear_slot_id,
        armor_class_id=armor_class_id,
        player_attack_animation=player_attack_animation,
        created_at=datetime.now(timezone.utc),
    )
    session.add(tb)
    session.commit()
    session.refresh(tb)
    return tb


def _make_inventory_item(session: Session, name: str, gear_slot_id: int,
                         sprite_key: str, item_code: str | None = None) -> InventoryItem:
    item = InventoryItem(
        name=name,
        description="test item",
        item_type="equipment",
        rarity="rare",
        sprite_key=sprite_key,
        gear_slot_id=gear_slot_id,
        item_code=item_code,
        created_at=datetime.now(timezone.utc),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def _equip_item(session: Session, character_id: int, item_id: int) -> PlayerInventory:
    pi = PlayerInventory(
        character_id=character_id,
        item_id=item_id,
        is_equipped=True,
        quantity=1,
        acquired_at=datetime.now(timezone.utc),
    )
    session.add(pi)
    session.commit()
    session.refresh(pi)
    return pi


# ---------------------------------------------------------------------------
# Aura tier unit tests
# ---------------------------------------------------------------------------

class TestAuraTier:
    """Unit tests for the _aura_tier helper."""

    def test_aura_tiers(self):
        from routes.game import _aura_tier
        assert _aura_tier(1) is None
        assert _aura_tier(20) is None
        assert _aura_tier(21) == "bronze"
        assert _aura_tier(40) == "bronze"
        assert _aura_tier(41) == "silver"
        assert _aura_tier(60) == "silver"
        assert _aura_tier(61) == "gold"
        assert _aura_tier(80) == "gold"
        assert _aura_tier(81) == "cyan"
        assert _aura_tier(100) == "cyan"


# ---------------------------------------------------------------------------
# Endpoint integration tests
# ---------------------------------------------------------------------------

class TestCharacterVisuals:
    def test_no_character_returns_404(self, client, player_token):
        """Player with no character gets 404."""
        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 404

    def test_empty_equipment(self, client, session, player_token, test_character):
        """Character with no equipped items returns empty equipped_layers."""
        # Create some gear slots so unequipped_layers is populated
        _make_gear_slot(session, "chest", "Chest", paperdoll_layer=3)
        _make_gear_slot(session, "head", "Head", paperdoll_layer=6)

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()
        assert data["character_id"] == test_character.id
        assert data["level"] == test_character.level
        assert data["aura_tier"] is None  # level 1
        assert data["equipped_layers"] == []
        assert sorted(data["unequipped_layers"]) == [3, 6]

    def test_equipped_item_with_armor_class(self, client, session, player_token, test_character):
        """Equipped item with armor class appears in equipped_layers."""
        gs = _make_gear_slot(session, "chest", "Chest", paperdoll_layer=3)
        gs2 = _make_gear_slot(session, "head", "Head", paperdoll_layer=6)
        ac = _make_armor_class(session, "chain", "Chain Mail",
                               overlay_opacity=0.5,
                               texture_pattern="crosshatch")
        _make_item_type_base(session, "chain_chest", gs.id, armor_class_id=ac.id)
        item = _make_inventory_item(session, "Chain Chest Rare", gs.id,
                                    sprite_key="chain_chest_rare",
                                    item_code="chain_chest")
        _equip_item(session, test_character.id, item.id)

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["equipped_layers"]) == 1
        layer = data["equipped_layers"][0]
        assert layer["layer"] == 3
        assert layer["slot"] == "chest"
        assert layer["sprite_key"] == "chain_chest_rare"
        assert layer["armor_class"]["code"] == "chain"
        assert layer["armor_class"]["overlay_opacity"] == 0.5
        assert layer["armor_class"]["texture_pattern"] == "crosshatch"
        # head slot should be unequipped
        assert 6 in data["unequipped_layers"]

    def test_weapon_with_attack_animation(self, client, session, player_token, test_character):
        """Weapon item includes player_attack_animation."""
        gs = _make_gear_slot(session, "main_hand", "Main Hand", paperdoll_layer=7)
        _make_item_type_base(session, "greatsword", gs.id,
                             player_attack_animation="melee_swing")
        item = _make_inventory_item(session, "Greatsword Rare", gs.id,
                                    sprite_key="weapon_greatsword_rare",
                                    item_code="greatsword")
        _equip_item(session, test_character.id, item.id)

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()

        assert len(data["equipped_layers"]) == 1
        layer = data["equipped_layers"][0]
        assert layer["layer"] == 7
        assert layer["slot"] == "main_hand"
        assert layer["player_attack_animation"] == "melee_swing"
        assert "armor_class" not in layer

    def test_aura_tier_silver(self, client, session, player_token, test_character):
        """Level 45 character gets silver aura."""
        test_character.level = 45
        session.add(test_character)
        session.commit()

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()
        assert data["aura_tier"] == "silver"

    def test_slots_without_paperdoll_layer_excluded(self, client, session, player_token, test_character):
        """Gear slots with paperdoll_layer=null are excluded from unequipped_layers."""
        _make_gear_slot(session, "ring", "Ring", paperdoll_layer=None)
        _make_gear_slot(session, "chest", "Chest", paperdoll_layer=3)

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()
        # Only chest (layer 3) should appear in unequipped, not ring
        assert data["unequipped_layers"] == [3]

    def test_multiple_equipped_sorted_by_layer(self, client, session, player_token, test_character):
        """Multiple equipped items are sorted by layer number."""
        gs_head = _make_gear_slot(session, "head", "Head", paperdoll_layer=6)
        gs_chest = _make_gear_slot(session, "chest", "Chest", paperdoll_layer=3)

        item_head = _make_inventory_item(session, "Helm", gs_head.id,
                                         sprite_key="helm_common")
        item_chest = _make_inventory_item(session, "Plate", gs_chest.id,
                                          sprite_key="plate_common")
        _equip_item(session, test_character.id, item_head.id)
        _equip_item(session, test_character.id, item_chest.id)

        resp = client.get("/api/game/character/visuals")
        assert resp.status_code == 200
        data = resp.json()
        layers = [e["layer"] for e in data["equipped_layers"]]
        assert layers == [3, 6]
        assert data["unequipped_layers"] == []

    def test_unauthenticated_returns_error(self, client):
        """Request without auth returns error."""
        resp = client.get("/api/game/character/visuals")
        # Without player_token fixture the auth dependency is not overridden
        # so it should fail (401 or 403 depending on auth implementation)
        assert resp.status_code in (401, 403, 422)
