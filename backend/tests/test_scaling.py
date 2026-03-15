"""Tests for Admin Scaling routes (5.4) — Wave Presets, Difficulty Curves, Difficulty Presets."""

import pytest
from datetime import datetime, timezone
from models.narrative import Book, Chapter, Scene
from models.scaling import WavePreset, WavePresetAssignment, DifficultyCurve, DifficultyPreset
from models.story_mode import GameConfig


# ===========================================================================
# Helpers
# ===========================================================================

def _seed_book(session, book_number=1, title="Test Book"):
    book = Book(
        book_number=book_number,
        title=title,
        source_file="test.docx",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


def _seed_chapter(session, book_id, chapter_number=1, title="Test Chapter"):
    ch = Chapter(
        book_id=book_id,
        chapter_number=chapter_number,
        title=title,
        sort_order=chapter_number,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(ch)
    session.commit()
    session.refresh(ch)
    return ch


def _seed_scene(session, chapter_id, scene_number=1):
    sc = Scene(
        chapter_id=chapter_id,
        scene_number=scene_number,
        title=f"Scene {scene_number}",
        sort_order=scene_number,
        scene_type="combat",
    )
    session.add(sc)
    session.commit()
    session.refresh(sc)
    return sc


def _seed_game_config(session, key, value, category="combat"):
    import json
    gc = GameConfig(
        key=key,
        value_json=json.dumps(value) if not isinstance(value, str) else value,
        category=category,
        description=f"Test config {key}",
    )
    session.add(gc)
    session.commit()
    return gc


# ===========================================================================
# Wave Preset CRUD
# ===========================================================================

class TestWavePresetCRUD:
    def test_create_wave_preset(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Standard Combat",
            "description": "Default wave config",
            "config": {
                "max_enemies_per_wave": 5,
                "wave_count": 10,
                "spawn_interval_ms": 2000,
                "spawn_pattern": "uniform",
            },
        })
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Standard Combat"
        assert data["config"]["max_enemies_per_wave"] == 5

    def test_list_wave_presets(self, admin_client, session):
        # Create two presets
        admin_client.post("/api/admin/scaling/wave-presets", json={"name": "Preset A", "config": {}})
        admin_client.post("/api/admin/scaling/wave-presets", json={"name": "Preset B", "config": {}})

        res = admin_client.get("/api/admin/scaling/wave-presets")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_update_wave_preset(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Original",
            "config": {"wave_count": 5},
        })
        pid = create.json()["id"]

        res = admin_client.patch(f"/api/admin/scaling/wave-presets/{pid}", json={
            "name": "Updated",
            "config": {"wave_count": 20},
        })
        assert res.status_code == 200
        assert res.json()["name"] == "Updated"
        assert res.json()["config"]["wave_count"] == 20

    def test_delete_wave_preset(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "ToDelete", "config": {}})
        pid = create.json()["id"]

        res = admin_client.delete(f"/api/admin/scaling/wave-presets/{pid}")
        assert res.status_code == 204

        # Verify gone
        res = admin_client.get("/api/admin/scaling/wave-presets")
        assert res.json()["total"] == 0

    def test_delete_wave_preset_blocked_by_assignment(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "Referenced", "config": {}})
        pid = create.json()["id"]

        admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})

        res = admin_client.delete(f"/api/admin/scaling/wave-presets/{pid}")
        assert res.status_code == 409
        assert "Cannot delete" in res.json()["detail"]


# ===========================================================================
# Wave Preset Validation
# ===========================================================================

class TestWavePresetValidation:
    def test_name_uniqueness(self, admin_client, session):
        admin_client.post("/api/admin/scaling/wave-presets", json={"name": "Unique", "config": {}})
        res = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "Unique", "config": {}})
        assert res.status_code == 422
        assert "already exists" in res.json()["detail"]

    def test_invalid_spawn_pattern(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Bad Pattern",
            "config": {"spawn_pattern": "invalid_pattern"},
        })
        assert res.status_code == 422
        assert "spawn_pattern" in res.json()["detail"]

    def test_out_of_range_max_enemies(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Too Many",
            "config": {"max_enemies_per_wave": 999},
        })
        assert res.status_code == 422
        assert "max_enemies_per_wave" in res.json()["detail"]

    def test_out_of_range_spawn_interval(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Too Fast",
            "config": {"spawn_interval_ms": 50},
        })
        assert res.status_code == 422
        assert "spawn_interval_ms" in res.json()["detail"]

    def test_negative_hp_multiplier(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Neg HP",
            "config": {"hp_multiplier": -1.0},
        })
        assert res.status_code == 422
        assert "hp_multiplier" in res.json()["detail"]


# ===========================================================================
# Wave Preset Default Toggle
# ===========================================================================

class TestWavePresetDefault:
    def test_setting_default_clears_old(self, admin_client, session):
        # Create first as default
        r1 = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "First Default",
            "config": {},
            "is_default": True,
        })
        pid1 = r1.json()["id"]

        # Create second as default
        r2 = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "Second Default",
            "config": {},
            "is_default": True,
        })
        pid2 = r2.json()["id"]

        # List and check: only second should be default
        res = admin_client.get("/api/admin/scaling/wave-presets")
        items = res.json()["items"]
        defaults = [i for i in items if i["is_default"]]
        assert len(defaults) == 1
        assert defaults[0]["id"] == pid2


# ===========================================================================
# Wave Preset Assignments
# ===========================================================================

class TestWavePresetAssignments:
    def test_create_book_assignment(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "WP1", "config": {}})
        pid = create.json()["id"]

        res = admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})
        assert res.status_code == 201
        assert res.json()["book_id"] == book.id

    def test_list_assignments(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "WP2", "config": {}})
        pid = create.json()["id"]

        admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})

        res = admin_client.get(f"/api/admin/scaling/wave-presets/{pid}/assignments")
        assert res.status_code == 200
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["book_title"] == "Test Book"

    def test_delete_assignment(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "WP3", "config": {}})
        pid = create.json()["id"]

        assign_res = admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})
        aid = assign_res.json()["id"]

        res = admin_client.delete(f"/api/admin/scaling/wave-presets/assignments/{aid}")
        assert res.status_code == 204

    def test_duplicate_book_assignment_blocked(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "WP4", "config": {}})
        pid = create.json()["id"]

        admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})
        res = admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={"book_id": book.id})
        assert res.status_code == 409
        assert "already has" in res.json()["detail"]

    def test_must_provide_book_or_chapter(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/wave-presets", json={"name": "WP5", "config": {}})
        pid = create.json()["id"]

        # Neither book nor chapter
        res = admin_client.post(f"/api/admin/scaling/wave-presets/{pid}/assignments", json={})
        assert res.status_code == 422


# ===========================================================================
# Difficulty Curve CRUD
# ===========================================================================

class TestDifficultyCurveCRUD:
    def test_create_difficulty_curve(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Linear",
            "description": "Linear progression",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        assert res.status_code == 201
        assert res.json()["name"] == "Linear"

    def test_list_difficulty_curves(self, admin_client, session):
        admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Curve A",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Curve B",
            "curve_data": {"1": {"hp": 1.5, "gold": 1.2, "wave_density": 1.0, "spawn_speed": 1.0}},
        })

        res = admin_client.get("/api/admin/scaling/difficulty-curves")
        assert res.status_code == 200
        assert res.json()["total"] == 2

    def test_update_difficulty_curve(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Original Curve",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        cid = create.json()["id"]

        res = admin_client.patch(f"/api/admin/scaling/difficulty-curves/{cid}", json={
            "name": "Renamed Curve",
        })
        assert res.status_code == 200
        assert res.json()["name"] == "Renamed Curve"

    def test_delete_difficulty_curve(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "ToDelete",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        cid = create.json()["id"]

        res = admin_client.delete(f"/api/admin/scaling/difficulty-curves/{cid}")
        assert res.status_code == 204

    def test_delete_curve_blocked_by_book(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Book Curve",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        cid = create.json()["id"]

        book = _seed_book(session)
        book.difficulty_curve_id = cid
        session.add(book)
        session.commit()

        res = admin_client.delete(f"/api/admin/scaling/difficulty-curves/{cid}")
        assert res.status_code == 409
        assert "Cannot delete" in res.json()["detail"]


# ===========================================================================
# Difficulty Curve Validation
# ===========================================================================

class TestDifficultyCurveValidation:
    def test_invalid_curve_key(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Bad Keys",
            "curve_data": {"abc": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        assert res.status_code == 422
        assert "string integers" in res.json()["detail"]

    def test_non_positive_hp(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Neg HP",
            "curve_data": {"1": {"hp": -0.5, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        assert res.status_code == 422
        assert "positive number" in res.json()["detail"]

    def test_empty_curve_data(self, admin_client, session):
        res = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Empty",
            "curve_data": {},
        })
        assert res.status_code == 422
        assert "at least one" in res.json()["detail"]


# ===========================================================================
# Difficulty Curve Book Assignment
# ===========================================================================

class TestCurveBookAssignment:
    def test_assign_book_to_curve(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Assign Curve",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        cid = create.json()["id"]

        res = admin_client.patch(f"/api/admin/scaling/difficulty-curves/{cid}/assign-book", json={
            "book_id": book.id,
        })
        assert res.status_code == 200
        assert res.json()["difficulty_curve_id"] == cid

    def test_unassign_book_from_curve(self, admin_client, session):
        book = _seed_book(session)
        create = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "Unassign Curve",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        cid = create.json()["id"]

        admin_client.patch(f"/api/admin/scaling/difficulty-curves/{cid}/assign-book", json={
            "book_id": book.id,
        })

        res = admin_client.patch(f"/api/admin/scaling/difficulty-curves/{cid}/assign-book", json={
            "book_id": book.id,
            "unassign": True,
        })
        assert res.status_code == 200
        assert res.json()["difficulty_curve_id"] is None


# ===========================================================================
# Difficulty Preset CRUD
# ===========================================================================

class TestDifficultyPresetCRUD:
    def test_create_preset_with_auto_capture(self, admin_client, session):
        # Seed some game_configs in the 'combat' category
        _seed_game_config(session, "hp_scaling_factor", 1.15, "combat")
        _seed_game_config(session, "session_gold_multiplier", 1.0, "combat")

        res = admin_client.post("/api/admin/scaling/presets", json={
            "name": "Easy Mode",
            "description": "Lower difficulty",
        })
        assert res.status_code == 201
        data = res.json()
        assert data["name"] == "Easy Mode"
        # Should have auto-captured config
        assert isinstance(data["config_snapshot"], dict)
        assert "hp_scaling_factor" in data["config_snapshot"]

    def test_list_presets(self, admin_client, session):
        admin_client.post("/api/admin/scaling/presets", json={"name": "P1"})
        admin_client.post("/api/admin/scaling/presets", json={"name": "P2"})

        res = admin_client.get("/api/admin/scaling/presets")
        assert res.status_code == 200
        assert res.json()["total"] == 2

    def test_update_preset(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/presets", json={"name": "Original Preset"})
        pid = create.json()["id"]

        res = admin_client.patch(f"/api/admin/scaling/presets/{pid}", json={
            "name": "Renamed Preset",
            "description": "Updated desc",
        })
        assert res.status_code == 200
        assert res.json()["name"] == "Renamed Preset"

    def test_delete_preset(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/presets", json={"name": "DeleteMe"})
        pid = create.json()["id"]

        res = admin_client.delete(f"/api/admin/scaling/presets/{pid}")
        assert res.status_code == 204

    def test_delete_active_preset_blocked(self, admin_client, session):
        create = admin_client.post("/api/admin/scaling/presets", json={"name": "ActivePreset"})
        pid = create.json()["id"]

        # Apply to make active
        admin_client.post(f"/api/admin/scaling/presets/{pid}/apply")

        res = admin_client.delete(f"/api/admin/scaling/presets/{pid}")
        assert res.status_code == 409
        assert "active" in res.json()["detail"].lower()

    def test_create_preset_with_curve_and_wave(self, admin_client, session):
        curve = admin_client.post("/api/admin/scaling/difficulty-curves", json={
            "name": "TestCurve",
            "curve_data": {"1": {"hp": 1.0, "gold": 1.0, "wave_density": 1.0, "spawn_speed": 1.0}},
        })
        wave = admin_client.post("/api/admin/scaling/wave-presets", json={
            "name": "TestWave",
            "config": {},
        })

        res = admin_client.post("/api/admin/scaling/presets", json={
            "name": "Full Preset",
            "difficulty_curve_id": curve.json()["id"],
            "wave_preset_id": wave.json()["id"],
        })
        assert res.status_code == 201
        assert res.json()["difficulty_curve_id"] == curve.json()["id"]
        assert res.json()["wave_preset_id"] == wave.json()["id"]


# ===========================================================================
# Difficulty Preset Apply
# ===========================================================================

class TestDifficultyPresetApply:
    def test_apply_preset(self, admin_client, session):
        _seed_game_config(session, "hp_scaling_factor", 1.15, "combat")

        create = admin_client.post("/api/admin/scaling/presets", json={
            "name": "Apply Test",
            "config_snapshot": {"hp_scaling_factor": 2.0},
        })
        pid = create.json()["id"]

        res = admin_client.post(f"/api/admin/scaling/presets/{pid}/apply")
        assert res.status_code == 200
        data = res.json()
        assert data["configs_updated"] >= 1

        # Verify preset is now active
        presets = admin_client.get("/api/admin/scaling/presets").json()
        active = [p for p in presets["items"] if p["is_active"]]
        assert len(active) == 1
        assert active[0]["id"] == pid

    def test_apply_preset_clears_previous_active(self, admin_client, session):
        p1 = admin_client.post("/api/admin/scaling/presets", json={"name": "First"})
        p2 = admin_client.post("/api/admin/scaling/presets", json={"name": "Second"})

        admin_client.post(f"/api/admin/scaling/presets/{p1.json()['id']}/apply")
        admin_client.post(f"/api/admin/scaling/presets/{p2.json()['id']}/apply")

        presets = admin_client.get("/api/admin/scaling/presets").json()
        active = [p for p in presets["items"] if p["is_active"]]
        assert len(active) == 1
        assert active[0]["id"] == p2.json()["id"]


# ===========================================================================
# Stat Weights via Visual Behavior
# ===========================================================================

class TestStatWeightsValidation:
    def test_update_visual_behavior_stat_weights(self, admin_client, session):
        # Create a visual behavior first
        from models.classification import VisualBehavior as VB
        vb = VB(name="test_melee", display_name="Test Melee", sort_order=1)
        session.add(vb)
        session.commit()
        session.refresh(vb)

        res = admin_client.patch(f"/api/admin/classification/visual-behaviors/{vb.id}", json={
            "stat_weights": {
                "size": {"strength": 0.6, "agility": 0.2, "intelligence": 0.2},
                "speed": {"strength": 0.2, "agility": 0.6, "intelligence": 0.2},
                "vfx_intensity": {"strength": 0.3, "agility": 0.3, "intelligence": 0.4},
                "clamps": {"size": [0.5, 2.5], "speed": [0.3, 1.5], "vfx_intensity": [0.0, 1.0]},
            },
        })
        assert res.status_code == 200
        assert res.json()["stat_weights"]["size"]["strength"] == 0.6
