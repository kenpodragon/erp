"""Tests for admin visual lookup table CRUD endpoints."""

import pytest
from datetime import datetime, timezone

from models.visual import (
    MovementType,
    SizeClass,
    AnimationStyle,
    SilhouetteType,
    ArmorClass,
)

BASE = "/api/admin/visual"


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


def _make_movement_type(session, name="ground", **kw):
    defaults = dict(
        description="Ground movement",
        y_offset_min=0, y_offset_max=0,
        bob_amplitude=0, bob_frequency=1.0,
        speed_multiplier=1.0, can_change_lane=False,
        trail_effect=None, created_at=_now(),
    )
    defaults.update(kw)
    row = MovementType(name=name, **defaults)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _make_size_class(session, name="medium", **kw):
    defaults = dict(
        description="Medium size",
        scale_min=0.8, scale_max=1.2,
        width_base=40, height_base=40,
        hitbox_radius=20, hp_bar_width=40,
        hp_bar_offset_y=-8, name_tag_visible=True,
        sort_order=0, created_at=_now(),
    )
    defaults.update(kw)
    row = SizeClass(name=name, **defaults)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _make_animation_style(session, name="idle_bounce", **kw):
    defaults = dict(
        description="Bouncy idle",
        idle_scale_x=1.0, idle_scale_y=1.0,
        idle_cycle_ms=2000, idle_translate_x=0, idle_translate_y=0,
        attack_recoil=3.0, death_style="fade",
        death_duration_ms=400, death_particle_count=8,
        created_at=_now(),
    )
    defaults.update(kw)
    row = AnimationStyle(name=name, **defaults)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _make_silhouette_type(session, name="humanoid", **kw):
    defaults = dict(
        description="Humanoid shape",
        body_shape="ellipse", body_ratio_w=1.0, body_ratio_h=1.0,
        corner_radius=0.1, has_limbs=True, limb_count=4,
        has_head=True, has_wings=False, has_weapon_slot=True,
        has_eye_glow=False, sub_unit_count=1,
        created_at=_now(),
    )
    defaults.update(kw)
    row = SilhouetteType(name=name, **defaults)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def _make_armor_class(session, code="med", display_name="Medium Armor", **kw):
    defaults = dict(
        description="Standard armor",
        overlay_opacity=0.6, color_tint_base=None,
        texture_pattern="solid", glow_intensity=0,
        outline_width=1.0, weight_class="medium",
        sort_order=0, created_at=_now(),
    )
    defaults.update(kw)
    row = ArmorClass(code=code, display_name=display_name, **defaults)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


# ---------------------------------------------------------------------------
# LIST tests — one per table
# ---------------------------------------------------------------------------

class TestListEndpoints:
    """GET /{table_name} returns 200 with items list."""

    def test_list_movement_types_empty(self, admin_client):
        r = admin_client.get(f"{BASE}/movement_types")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert data["total"] == 0

    def test_list_size_classes_empty(self, admin_client):
        r = admin_client.get(f"{BASE}/size_classes")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_list_animation_styles_empty(self, admin_client):
        r = admin_client.get(f"{BASE}/animation_styles")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_list_silhouette_types_empty(self, admin_client):
        r = admin_client.get(f"{BASE}/silhouette_types")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_list_armor_classes_empty(self, admin_client):
        r = admin_client.get(f"{BASE}/armor_classes")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_list_movement_types_with_data(self, admin_client, session):
        _make_movement_type(session, "ground")
        _make_movement_type(session, "flying")
        r = admin_client.get(f"{BASE}/movement_types")
        assert r.status_code == 200
        assert r.json()["total"] == 2

    def test_list_unknown_table_404(self, admin_client):
        r = admin_client.get(f"{BASE}/bogus_table")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# CREATE tests
# ---------------------------------------------------------------------------

class TestCreateEndpoints:
    """POST /{table_name} creates rows."""

    def test_create_movement_type(self, admin_client):
        r = admin_client.post(f"{BASE}/movement_types", json={
            "name": "flying",
            "description": "Flying movement",
            "y_offset_min": -20,
            "y_offset_max": -10,
            "bob_amplitude": 5,
            "bob_frequency": 0.5,
            "speed_multiplier": 1.5,
            "can_change_lane": False,
        })
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "flying"
        assert data["id"] is not None

    def test_create_size_class(self, admin_client):
        r = admin_client.post(f"{BASE}/size_classes", json={
            "name": "tiny",
            "scale_min": 0.3,
            "scale_max": 0.5,
            "width_base": 16,
            "height_base": 16,
            "hitbox_radius": 8,
            "hp_bar_width": 20,
        })
        assert r.status_code == 201
        assert r.json()["name"] == "tiny"

    def test_create_armor_class(self, admin_client):
        r = admin_client.post(f"{BASE}/armor_classes", json={
            "code": "heavy",
            "display_name": "Heavy Plate",
            "overlay_opacity": 0.9,
            "weight_class": "heavy",
        })
        assert r.status_code == 201
        assert r.json()["code"] == "heavy"


# ---------------------------------------------------------------------------
# UPDATE tests
# ---------------------------------------------------------------------------

class TestUpdateEndpoints:
    """PUT /{table_name}/{id} updates rows."""

    def test_update_movement_type(self, admin_client, session):
        mt = _make_movement_type(session, "ground")
        r = admin_client.put(f"{BASE}/movement_types/{mt.id}", json={
            "description": "Updated ground movement",
            "speed_multiplier": 0.8,
        })
        assert r.status_code == 200
        assert r.json()["description"] == "Updated ground movement"
        assert r.json()["speed_multiplier"] == 0.8

    def test_update_nonexistent_404(self, admin_client):
        r = admin_client.put(f"{BASE}/movement_types/9999", json={"description": "x"})
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# DELETE tests
# ---------------------------------------------------------------------------

class TestDeleteEndpoints:
    """DELETE /{table_name}/{id} deletes rows."""

    def test_delete_movement_type(self, admin_client, session):
        mt = _make_movement_type(session, "ground")
        r = admin_client.delete(f"{BASE}/movement_types/{mt.id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True
        # Verify gone
        r2 = admin_client.get(f"{BASE}/movement_types")
        assert r2.json()["total"] == 0

    def test_delete_nonexistent_404(self, admin_client):
        r = admin_client.delete(f"{BASE}/size_classes/9999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

class TestAuthGuard:
    """Unauthenticated requests should be rejected."""

    def test_list_requires_admin(self, client):
        r = client.get(f"{BASE}/movement_types")
        assert r.status_code in (401, 403)
