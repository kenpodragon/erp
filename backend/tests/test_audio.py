"""Tests for Audio & Music endpoints (REC 2.5)."""

import pytest
from sqlmodel import Session
from models import (
    Player, PlayerSettings, Atmosphere, AudioConfig,
    Book, Chapter, Scene, SceneGameplayData,
    Entity, EntityGameplayData, DevContentAudit,
)
from models.classification import EntityType
from datetime import datetime, timezone


@pytest.fixture
def seed_atmospheres(session: Session):
    """Seed the 3 archetypes needed for hierarchy tests."""
    mundane = Atmosphere(
        name="Mundane Dread",
        archetype="mundane_dread",
        description="Test mundane",
        generator_bpm=100,
        music_definitions={"explore": {"bpm": 100}, "combat": None, "boss": None, "mystery": None},
    )
    domestic = Atmosphere(
        name="Domestic Trauma",
        archetype="domestic_trauma",
        description="Test domestic",
        generator_bpm=80,
    )
    cosmic = Atmosphere(
        name="Cosmic Archive",
        archetype="cosmic_archive",
        description="Test cosmic",
        generator_bpm=120,
    )
    boss_theme = Atmosphere(
        name="Boss Theme Test",
        archetype=None,
        description="Unique boss theme",
        generator_bpm=160,
        music_definitions={"explore": None, "combat": None, "boss": {"bpm": 160}, "mystery": None},
    )
    session.add_all([mundane, domestic, cosmic, boss_theme])
    session.commit()
    session.refresh(mundane)
    session.refresh(domestic)
    session.refresh(cosmic)
    session.refresh(boss_theme)
    return {"mundane": mundane, "domestic": domestic, "cosmic": cosmic, "boss_theme": boss_theme}


@pytest.fixture
def seed_story_hierarchy(session: Session, seed_atmospheres):
    """Create book -> chapter -> scene hierarchy with atmosphere assignments."""
    atm = seed_atmospheres

    book = Book(
        book_number=1,
        title="Test Book",
        source_file="test.docx",
        atmosphere_id=atm["mundane"].id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    chapter = Chapter(
        book_id=book.id,
        chapter_number=1,
        title="Test Chapter",
        sort_order=1,
        atmosphere_id=atm["domestic"].id,
        created_at=datetime.now(timezone.utc),
    )
    session.add(chapter)
    session.commit()
    session.refresh(chapter)

    scene = Scene(
        chapter_id=chapter.id,
        scene_number=1,
        title="Test Scene",
        sort_order=1,
        created_at=datetime.now(timezone.utc),
    )
    session.add(scene)
    session.commit()
    session.refresh(scene)

    scene_data = SceneGameplayData(
        scene_id=scene.id,
        atmosphere_id=atm["cosmic"].id,
    )
    session.add(scene_data)
    session.commit()

    return {"book": book, "chapter": chapter, "scene": scene, "atmospheres": atm}


@pytest.fixture
def seed_sfx_configs(session: Session):
    """Seed a couple of SFX presets."""
    c1 = AudioConfig(
        config_key="sfx_click",
        category="combat",
        display_name="Player Click",
        preset_definition={"oscillator_type": "square", "frequency_start": 660},
        base_volume=0.6,
        pitch_variation=0.08,
        spatial_enabled=True,
    )
    c2 = AudioConfig(
        config_key="sfx_level_up",
        category="progression",
        display_name="Level Up",
        preset_definition=[{"oscillator_type": "square", "frequency_start": 523}],
        base_volume=0.8,
        spatial_enabled=False,
    )
    session.add_all([c1, c2])
    session.commit()
    return [c1, c2]


# ── Atmosphere Resolution Tests ──────────────────────────────────────────────

class TestAtmosphereEndpoint:
    def test_resolves_scene_level(self, client, player_token, seed_story_hierarchy):
        """Should resolve to scene-level atmosphere (cosmic_archive)."""
        scene = seed_story_hierarchy["scene"]
        resp = client.get(f"/api/game/audio/atmosphere?scene_id={scene.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "cosmic_archive"
        assert data["resolution_source"] == "scene"

    def test_resolves_chapter_level(self, client, player_token, session, seed_story_hierarchy):
        """Without scene atmosphere, should fall back to chapter level."""
        scene = seed_story_hierarchy["scene"]
        # Remove scene atmosphere
        scene_data = session.get(SceneGameplayData, scene.id)
        if scene_data:
            from sqlmodel import select
            sd = session.exec(select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)).first()
            sd.atmosphere_id = None
            session.add(sd)
            session.commit()

        resp = client.get(f"/api/game/audio/atmosphere?scene_id={scene.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "domestic_trauma"
        assert data["resolution_source"] == "chapter"

    def test_resolves_book_level(self, client, player_token, session, seed_story_hierarchy):
        """Without scene and chapter atmospheres, should fall back to book level."""
        scene = seed_story_hierarchy["scene"]
        chapter = seed_story_hierarchy["chapter"]

        from sqlmodel import select
        sd = session.exec(select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)).first()
        sd.atmosphere_id = None
        session.add(sd)

        chapter.atmosphere_id = None
        session.add(chapter)
        session.commit()

        resp = client.get(f"/api/game/audio/atmosphere?scene_id={scene.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "mundane_dread"
        assert data["resolution_source"] == "book"

    def test_resolves_global_default_and_logs_audit(self, client, player_token, session, seed_story_hierarchy):
        """Without any atmosphere, should use global default and log to dev_content_audit."""
        scene = seed_story_hierarchy["scene"]
        chapter = seed_story_hierarchy["chapter"]
        book = seed_story_hierarchy["book"]

        from sqlmodel import select
        sd = session.exec(select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)).first()
        sd.atmosphere_id = None
        session.add(sd)

        chapter.atmosphere_id = None
        session.add(chapter)

        book.atmosphere_id = None
        session.add(book)
        session.commit()

        resp = client.get(f"/api/game/audio/atmosphere?scene_id={scene.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "mundane_dread"
        assert data["resolution_source"] == "global_default"

        # Verify audit log entry
        audits = session.exec(
            select(DevContentAudit).where(DevContentAudit.audit_type == "audio_atmosphere_fallback")
        ).all()
        assert len(audits) >= 1

    def test_boss_override(self, client, player_token, session, seed_story_hierarchy):
        """Boss entity with unique theme should override scene atmosphere."""
        scene = seed_story_hierarchy["scene"]
        atm = seed_story_hierarchy["atmospheres"]

        boss_type = EntityType(name="boss", display_name="Boss")
        session.add(boss_type)
        session.commit()
        session.refresh(boss_type)

        entity = Entity(
            canonical_name="Test Boss",
            entity_type_id=boss_type.id,
            created_at=datetime.now(timezone.utc),
        )
        session.add(entity)
        session.commit()
        session.refresh(entity)

        entity_data = EntityGameplayData(
            entity_id=entity.id,
            unique_boss_theme_id=atm["boss_theme"].id,
        )
        session.add(entity_data)
        session.commit()

        resp = client.get(
            f"/api/game/audio/atmosphere?scene_id={scene.id}&boss_entity_id={entity.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["resolution_source"] == "boss_override"
        assert data["boss_theme_id"] == atm["boss_theme"].id

    def test_invalid_scene_id(self, client, player_token, seed_atmospheres):
        """Should return 404 for non-existent scene."""
        resp = client.get("/api/game/audio/atmosphere?scene_id=99999")
        assert resp.status_code == 404

    def test_requires_auth(self, client, seed_atmospheres):
        """Should require authentication."""
        resp = client.get("/api/game/audio/atmosphere?scene_id=1")
        assert resp.status_code in (401, 403)


# ── SFX Configs Tests ────────────────────────────────────────────────────────

class TestSFXConfigsEndpoint:
    def test_returns_all_configs(self, client, player_token, seed_sfx_configs):
        resp = client.get("/api/game/audio/sfx-configs")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        keys = {c["config_key"] for c in data}
        assert "sfx_click" in keys
        assert "sfx_level_up" in keys

    def test_config_fields(self, client, player_token, seed_sfx_configs):
        resp = client.get("/api/game/audio/sfx-configs")
        data = resp.json()
        click = next(c for c in data if c["config_key"] == "sfx_click")
        assert click["category"] == "combat"
        assert click["base_volume"] == 0.6
        assert click["spatial_enabled"] is True
        assert "preset_definition" in click

    def test_requires_auth(self, client, seed_sfx_configs):
        resp = client.get("/api/game/audio/sfx-configs")
        assert resp.status_code in (401, 403)

    def test_empty_when_no_configs(self, client, player_token):
        resp = client.get("/api/game/audio/sfx-configs")
        assert resp.status_code == 200
        assert resp.json() == []


# ── Settings Tests ───────────────────────────────────────────────────────────

class TestAudioSettings:
    def test_update_master_volume(self, client, player_token, session, test_player):
        settings = PlayerSettings(
            player_id=test_player.id,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(settings)
        session.commit()

        resp = client.patch("/api/players/me/settings", json={"master_volume": 50})
        assert resp.status_code == 200
        data = resp.json()
        assert data["master_volume"] == 50

    def test_update_master_muted(self, client, player_token, session, test_player):
        settings = PlayerSettings(
            player_id=test_player.id,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(settings)
        session.commit()

        resp = client.patch("/api/players/me/settings", json={"master_muted": True})
        assert resp.status_code == 200
        data = resp.json()
        assert data["master_muted"] is True

    def test_master_volume_validation(self, client, player_token, session, test_player):
        settings = PlayerSettings(
            player_id=test_player.id,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(settings)
        session.commit()

        resp = client.patch("/api/players/me/settings", json={"master_volume": 150})
        assert resp.status_code == 422
