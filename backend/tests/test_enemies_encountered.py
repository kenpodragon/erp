"""Tests for GET /api/game/enemies/encountered endpoint.

Covers: discovery-based filtering, visual data inlining, attack types,
graceful handling of missing gameplay data, and empty discovery list.
"""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session

from models import (
    Player, Entity, EntityGameplayData,
    MovementType, SizeClass, AnimationStyle, SilhouetteType,
    AttackType, EntityType,
)
from models.discovery import PlayerEntityDiscovery
from auth import get_current_player
from main import app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_entity_type(session: Session, name: str = "enemy") -> "EntityType":
    et = EntityType(name=name, display_name=name.title())
    session.add(et)
    session.commit()
    session.refresh(et)
    return et


def _make_entity(session: Session, canonical_name: str, entity_type_id: int) -> Entity:
    e = Entity(
        canonical_name=canonical_name,
        entity_type_id=entity_type_id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


def _make_movement(session: Session) -> MovementType:
    m = MovementType(
        name="hover", y_offset_min=15, y_offset_max=30,
        bob_amplitude=4, bob_frequency=0.8, speed_multiplier=0.9,
        trail_effect="shadow",
    )
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


def _make_size(session: Session) -> SizeClass:
    s = SizeClass(
        name="medium", scale_min=1.0, scale_max=1.2,
        width_base=24, height_base=30, hitbox_radius=16,
        hp_bar_width=40,
    )
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


def _make_animation(session: Session) -> AnimationStyle:
    a = AnimationStyle(
        name="pulse", idle_scale_x=1.05, idle_cycle_ms=2500,
        death_style="shatter", death_particle_count=12,
    )
    session.add(a)
    session.commit()
    session.refresh(a)
    return a


def _make_silhouette(session: Session) -> SilhouetteType:
    si = SilhouetteType(
        name="orb", body_shape="circle",
        has_eye_glow=True, sub_unit_count=1,
    )
    session.add(si)
    session.commit()
    session.refresh(si)
    return si


def _make_attack_type(session: Session, name: str = "magic_bolt") -> AttackType:
    at = AttackType(
        name=name, display_name=name.replace("_", " ").title(),
        attack_animation_type="magic_cast",
        projectile_color="#8844cc", cooldown_ms=2000,
    )
    session.add(at)
    session.commit()
    session.refresh(at)
    return at


def _discover(session: Session, player_id: int, entity_id: int):
    d = PlayerEntityDiscovery(
        player_id=player_id, entity_id=entity_id,
        encounters=1, kills=0,
        first_seen_at=datetime.now(timezone.utc),
    )
    session.add(d)
    session.commit()


def _auth_override(player):
    """Return a dependency override for get_current_player."""
    def override():
        return {"player": player}
    return override


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestEncounteredEnemies:
    """Tests for /api/game/enemies/encountered."""

    def test_empty_discovery_returns_empty_list(self, client, test_player):
        """Player with no discoveries gets an empty list, not an error."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        resp = client.get("/api/game/enemies/encountered")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_only_discovered_entities_returned(self, session, client, test_player):
        """Only entities in player_entity_discovery are returned."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        et = _make_entity_type(session, "enemy")
        e1 = _make_entity(session, "Shadow Wraith", et.id)
        e2 = _make_entity(session, "Fire Golem", et.id)

        # Discover only e1
        _discover(session, test_player.id, e1.id)

        resp = client.get("/api/game/enemies/encountered")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["entity_id"] == e1.id
        assert data[0]["name"] == "Shadow Wraith"

    def test_entity_without_gameplay_data_returns_nulls(self, session, client, test_player):
        """Entities without entity_gameplay_data return null for all visual fields."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        et = _make_entity_type(session, "enemy")
        e = _make_entity(session, "Unknown Beast", et.id)
        _discover(session, test_player.id, e.id)

        resp = client.get("/api/game/enemies/encountered")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        item = data[0]
        assert item["entity_id"] == e.id
        assert item["sprite_key"] is None
        assert item["base_hp"] is None
        assert item["movement"] is None
        assert item["size"] is None
        assert item["animation"] is None
        assert item["silhouette"] is None
        assert item["primary_attack"] is None
        assert item["secondary_attack"] is None
        assert item["tertiary_attack"] is None

    def test_full_visual_data_inlined(self, session, client, test_player):
        """Entity with full gameplay data returns inlined visual dicts."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        et = _make_entity_type(session, "enemy")
        e = _make_entity(session, "Shadow Wraith", et.id)

        mov = _make_movement(session)
        size = _make_size(session)
        anim = _make_animation(session)
        sil = _make_silhouette(session)
        atk = _make_attack_type(session, "magic_bolt")

        gd = EntityGameplayData(
            entity_id=e.id, sprite_key="enemy_wraith",
            base_hp=25, base_gold=10,
            color_primary="#8844cc", color_secondary="#662299",
            movement_type_id=mov.id, size_class_id=size.id,
            animation_style_id=anim.id, silhouette_type_id=sil.id,
            primary_attack_type_id=atk.id,
        )
        session.add(gd)
        session.commit()

        _discover(session, test_player.id, e.id)

        resp = client.get("/api/game/enemies/encountered")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        item = data[0]

        assert item["entity_id"] == e.id
        assert item["sprite_key"] == "enemy_wraith"
        assert item["base_hp"] == 25
        assert item["base_gold"] == 10
        assert item["color_primary"] == "#8844cc"

        # Movement
        assert item["movement"]["name"] == "hover"
        assert item["movement"]["bob_amplitude"] == 4
        assert item["movement"]["trail_effect"] == "shadow"

        # Size
        assert item["size"]["name"] == "medium"
        assert item["size"]["hitbox_radius"] == 16

        # Animation
        assert item["animation"]["name"] == "pulse"
        assert item["animation"]["death_style"] == "shatter"

        # Silhouette
        assert item["silhouette"]["name"] == "orb"
        assert item["silhouette"]["body_shape"] == "circle"
        assert item["silhouette"]["has_eye_glow"] is True

        # Attack
        assert item["primary_attack"]["name"] == "magic_bolt"
        assert item["primary_attack"]["cooldown_ms"] == 2000
        assert item["secondary_attack"] is None
        assert item["tertiary_attack"] is None

    def test_multiple_attack_types(self, session, client, test_player):
        """Entity with primary, secondary, and tertiary attacks returns all three."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        et = _make_entity_type(session, "enemy")
        e = _make_entity(session, "Multi Attacker", et.id)

        atk1 = _make_attack_type(session, "slash")
        atk2 = _make_attack_type(session, "fireball")
        atk3 = _make_attack_type(session, "ice_shard")

        gd = EntityGameplayData(
            entity_id=e.id, base_hp=50, base_gold=20,
            primary_attack_type_id=atk1.id,
            secondary_attack_type_id=atk2.id,
            tertiary_attack_type_id=atk3.id,
        )
        session.add(gd)
        session.commit()

        _discover(session, test_player.id, e.id)

        resp = client.get("/api/game/enemies/encountered")
        data = resp.json()
        assert len(data) == 1
        item = data[0]
        assert item["primary_attack"]["name"] == "slash"
        assert item["secondary_attack"]["name"] == "fireball"
        assert item["tertiary_attack"]["name"] == "ice_shard"

    def test_non_discovered_entities_excluded(self, session, client, test_player):
        """Entities not in player_entity_discovery are excluded even if they exist."""
        app.dependency_overrides[get_current_player] = _auth_override(test_player)
        et = _make_entity_type(session, "enemy")
        _make_entity(session, "Hidden Monster", et.id)
        _make_entity(session, "Secret Boss", et.id)

        resp = client.get("/api/game/enemies/encountered")
        assert resp.status_code == 200
        assert resp.json() == []
