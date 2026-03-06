"""Tests for Admin Audio endpoints (REC 2.5.3)."""

import pytest
from sqlmodel import Session
from models import Atmosphere, AudioConfig, Book, Chapter, Scene, SceneGameplayData
from datetime import datetime, timezone


@pytest.fixture
def seed_atmospheres(session: Session):
    """Seed test atmospheres."""
    atm1 = Atmosphere(
        name="Test Mundane",
        archetype="mundane_dread",
        description="Test mundane desc",
        generator_bpm=100,
        music_definitions={"explore": {"bpm": 100}},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    atm2 = Atmosphere(
        name="Test Occult",
        archetype="occult_sanctum",
        description="Test occult desc",
        generator_bpm=80,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add_all([atm1, atm2])
    session.commit()
    session.refresh(atm1)
    session.refresh(atm2)
    return {"mundane": atm1, "occult": atm2}


@pytest.fixture
def seed_hierarchy(session: Session, seed_atmospheres):
    """Seed book -> chapter -> scene hierarchy for batch assign tests."""
    book = Book(
        book_number=1, title="Admin Test Book", source_file="test.docx",
        created_at=datetime.now(timezone.utc),
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    chapter = Chapter(
        book_id=book.id, chapter_number=1, title="Admin Test Chapter",
        sort_order=1, created_at=datetime.now(timezone.utc),
    )
    session.add(chapter)
    session.commit()
    session.refresh(chapter)

    scenes = []
    for i in range(3):
        scene = Scene(
            chapter_id=chapter.id, scene_number=i + 1,
            title=f"Scene {i + 1}", sort_order=i + 1,
            created_at=datetime.now(timezone.utc),
        )
        session.add(scene)
        session.commit()
        session.refresh(scene)
        scenes.append(scene)

    return {"book": book, "chapter": chapter, "scenes": scenes, "atm": seed_atmospheres}


@pytest.fixture
def seed_sfx(session: Session):
    """Seed SFX configs."""
    c1 = AudioConfig(
        config_key="sfx_test_click",
        category="combat",
        display_name="Test Click",
        preset_definition={"oscillator_type": "square", "frequency_start": 660},
        base_volume=0.6,
        spatial_enabled=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(c1)
    session.commit()
    session.refresh(c1)
    return c1


# ── Atmosphere CRUD Tests ─────────────────────────────────────────────

class TestAdminAtmosphereList:
    def test_list_atmospheres(self, admin_client, seed_atmospheres):
        resp = admin_client.get("/api/admin/atmospheres")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2
        names = [a["name"] for a in data]
        assert "Test Mundane" in names
        assert "Test Occult" in names

    def test_list_includes_counts(self, admin_client, seed_atmospheres):
        resp = admin_client.get("/api/admin/atmospheres")
        assert resp.status_code == 200
        data = resp.json()
        atm = next(a for a in data if a["name"] == "Test Mundane")
        assert "scene_count" in atm
        assert "chapter_count" in atm
        assert "book_count" in atm


class TestAdminAtmosphereDetail:
    def test_get_detail(self, admin_client, seed_atmospheres):
        atm_id = seed_atmospheres["mundane"].id
        resp = admin_client.get(f"/api/admin/atmospheres/{atm_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Mundane"
        assert data["music_definitions"] is not None
        assert "assigned_scene_ids" in data
        assert "assigned_chapters" in data
        assert "assigned_books" in data

    def test_get_nonexistent(self, admin_client):
        resp = admin_client.get("/api/admin/atmospheres/99999")
        assert resp.status_code == 404


class TestAdminAtmosphereCreate:
    def test_create_atmosphere(self, admin_client):
        resp = admin_client.post("/api/admin/atmospheres", json={
            "name": "Brand New Atmosphere",
            "archetype": "tech_utopia",
            "description": "Shiny future",
            "generator_bpm": 120,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Brand New Atmosphere"
        assert "id" in data

    def test_create_duplicate_name(self, admin_client, seed_atmospheres):
        resp = admin_client.post("/api/admin/atmospheres", json={
            "name": "Test Mundane",
        })
        assert resp.status_code == 409


class TestAdminAtmosphereUpdate:
    def test_update_atmosphere(self, admin_client, seed_atmospheres):
        atm_id = seed_atmospheres["mundane"].id
        resp = admin_client.put(f"/api/admin/atmospheres/{atm_id}", json={
            "description": "Updated description",
            "generator_bpm": 110,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "description" in data["updated_fields"]
        assert "generator_bpm" in data["updated_fields"]

    def test_update_nonexistent(self, admin_client):
        resp = admin_client.put("/api/admin/atmospheres/99999", json={"name": "X"})
        assert resp.status_code == 404


class TestAdminAtmosphereDelete:
    def test_delete_unreferenced(self, admin_client, seed_atmospheres):
        atm_id = seed_atmospheres["occult"].id
        resp = admin_client.delete(f"/api/admin/atmospheres/{atm_id}")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

    def test_delete_nonexistent(self, admin_client):
        resp = admin_client.delete("/api/admin/atmospheres/99999")
        assert resp.status_code == 404

    def test_delete_referenced_blocked(self, admin_client, session, seed_atmospheres):
        """Cannot delete an atmosphere referenced by a chapter."""
        atm = seed_atmospheres["mundane"]
        book = Book(
            book_number=99, title="Ref Book", source_file="ref.docx",
            created_at=datetime.now(timezone.utc),
        )
        session.add(book)
        session.commit()
        session.refresh(book)
        chapter = Chapter(
            book_id=book.id, chapter_number=99, title="Ref Chapter",
            sort_order=99, atmosphere_id=atm.id,
            created_at=datetime.now(timezone.utc),
        )
        session.add(chapter)
        session.commit()

        resp = admin_client.delete(f"/api/admin/atmospheres/{atm.id}")
        assert resp.status_code == 409
        assert "referenced" in resp.json()["detail"].lower()


class TestAdminMusicDefinitions:
    def test_update_music_definitions(self, admin_client, seed_atmospheres):
        atm_id = seed_atmospheres["mundane"].id
        new_defs = {"explore": {"bpm": 200}, "combat": {"bpm": 250}}
        resp = admin_client.put(f"/api/admin/atmospheres/{atm_id}/music", json={
            "music_definitions": new_defs,
        })
        assert resp.status_code == 200

        # Verify
        detail = admin_client.get(f"/api/admin/atmospheres/{atm_id}").json()
        assert detail["music_definitions"]["explore"]["bpm"] == 200


# ── Batch Assignment Tests ────────────────────────────────────────────

class TestBatchAssign:
    def test_batch_assign_chapter(self, admin_client, seed_hierarchy):
        chapter = seed_hierarchy["chapter"]
        atm = seed_hierarchy["atm"]["mundane"]

        resp = admin_client.post("/api/admin/atmospheres/batch-assign", json={
            "target_type": "chapter",
            "target_id": chapter.id,
            "atmosphere_id": atm.id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenes_updated"] == 3

    def test_batch_assign_book(self, admin_client, seed_hierarchy):
        book = seed_hierarchy["book"]
        atm = seed_hierarchy["atm"]["occult"]

        resp = admin_client.post("/api/admin/atmospheres/batch-assign", json={
            "target_type": "book",
            "target_id": book.id,
            "atmosphere_id": atm.id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenes_updated"] == 3

    def test_batch_assign_invalid_type(self, admin_client, seed_hierarchy):
        resp = admin_client.post("/api/admin/atmospheres/batch-assign", json={
            "target_type": "invalid",
            "target_id": 1,
            "atmosphere_id": 1,
        })
        assert resp.status_code == 400

    def test_batch_assign_nonexistent_atmosphere(self, admin_client, seed_hierarchy):
        resp = admin_client.post("/api/admin/atmospheres/batch-assign", json={
            "target_type": "chapter",
            "target_id": seed_hierarchy["chapter"].id,
            "atmosphere_id": 99999,
        })
        assert resp.status_code == 404


# ── Audio Config (SFX) Tests ─────────────────────────────────────────

class TestAdminAudioConfigs:
    def test_list_configs(self, admin_client, seed_sfx):
        resp = admin_client.get("/api/admin/audio-configs")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        keys = [c["config_key"] for c in data]
        assert "sfx_test_click" in keys

    def test_update_config(self, admin_client, seed_sfx):
        resp = admin_client.put(f"/api/admin/audio-configs/{seed_sfx.id}", json={
            "base_volume": 0.9,
            "preset_definition": {"oscillator_type": "triangle", "frequency_start": 880},
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "base_volume" in data["updated_fields"]
        assert "preset_definition" in data["updated_fields"]

    def test_update_nonexistent(self, admin_client):
        resp = admin_client.put("/api/admin/audio-configs/99999", json={
            "base_volume": 0.5,
        })
        assert resp.status_code == 404
