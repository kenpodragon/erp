"""Tests for Story Mode (Loop B) API endpoints."""

import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session

from models import (
    Player, CharacterClass, PlayerCharacter, PlayerProgress,
    Scene, Chapter, Book, StoryBeat,
)
from models.story_mode import (
    GameConfig, PlayerStorySession, PlayerMetaProgression,
    CharacterSkillLevel, EntitySceneAppearance, DevContentAudit,
)
from models.gameplay import Skill, Entity, EntityGameplayData


# ---------------------------------------------------------------------------
# Additional fixtures
# ---------------------------------------------------------------------------

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
                 sort_order=1, processing_status="done",
                 created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(ch)
    session.commit()
    session.refresh(ch)
    return ch


@pytest.fixture
def test_scene(session: Session, test_chapter: Chapter) -> Scene:
    sc = Scene(chapter_id=test_chapter.id, scene_number=1, title="First Steps",
               summary="Player enters the Tower.", sort_order=1,
               created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(sc)
    session.commit()
    session.refresh(sc)
    return sc


@pytest.fixture
def test_beats(session: Session, test_scene: Scene) -> list[StoryBeat]:
    beats = [
        StoryBeat(scene_id=test_scene.id, beat_number=i + 1, sort_order=i + 1,
                  raw_text=f"The traveller walked forward into the darkness. {'word ' * (20 * (i + 1))}",
                  intensity=2, pacing="steady",
                  created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        for i in range(3)
    ]
    for b in beats:
        session.add(b)
    session.commit()
    return beats


@pytest.fixture
def test_entity(session: Session) -> Entity:
    e = Entity(canonical_name="Shadow Wraith", entity_type="enemy",
               base_description="A wraith from the void.",
               created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


@pytest.fixture
def test_entity_appearance(session: Session, test_entity: Entity, test_scene: Scene):
    ea = EntitySceneAppearance(
        entity_id=test_entity.id, scene_id=test_scene.id, role="enemy", is_present=True,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(ea)
    session.commit()
    session.refresh(ea)
    return ea


@pytest.fixture
def game_configs(session: Session):
    configs = [
        GameConfig(key="click_rate_cap", value_json=20, description="CPS cap"),
        GameConfig(key="hp_scaling_factor", value_json=1.55, description="HP scale"),
        GameConfig(key="crit_multiplier", value_json=2.0, description="Crit mult"),
    ]
    for c in configs:
        session.add(c)
    session.commit()


@pytest.fixture
def full_client(session: Session, test_player: Player, test_character: PlayerCharacter):
    """Client with auth mocked and a full character set up."""
    from main import app
    from db import get_session
    from auth import get_current_player

    def get_session_override():
        return session

    def get_current_player_override():
        return {"uid": test_player.firebase_uid, "email": test_player.email, "player": test_player}

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_player] = get_current_player_override

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests: GET /configs
# ---------------------------------------------------------------------------

class TestGetConfigs:
    def test_returns_all_configs(self, full_client, game_configs):
        resp = full_client.get("/api/game/story/configs")
        assert resp.status_code == 200
        data = resp.json()
        assert "click_rate_cap" in data
        assert data["click_rate_cap"] == 20

    def test_empty_when_no_configs(self, full_client):
        resp = full_client.get("/api/game/story/configs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)


# ---------------------------------------------------------------------------
# Tests: GET /scenes/{scene_id}/narrative
# ---------------------------------------------------------------------------

class TestGetNarrative:
    def test_returns_beats_with_word_counts(self, full_client, test_scene, test_beats):
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/narrative")
        assert resp.status_code == 200
        data = resp.json()
        assert data["scene_id"] == test_scene.id
        assert len(data["beats"]) == 3
        for beat in data["beats"]:
            assert beat["word_count"] > 0
            assert beat["display_delay_seconds"] >= 2.0

    def test_delay_scales_with_word_count(self, full_client, test_scene, test_beats):
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/narrative")
        data = resp.json()
        delays = [b["display_delay_seconds"] for b in data["beats"]]
        # Each beat has more words than the previous (20, 40, 60 extra words)
        assert delays[1] > delays[0]
        assert delays[2] > delays[1]

    def test_scene_not_found(self, full_client):
        resp = full_client.get("/api/game/story/scenes/99999/narrative")
        assert resp.status_code == 404

    def test_total_words_sum(self, full_client, test_scene, test_beats):
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/narrative")
        data = resp.json()
        assert data["total_words"] == sum(b["word_count"] for b in data["beats"])


# ---------------------------------------------------------------------------
# Tests: GET /scenes/{scene_id}/enemies
# ---------------------------------------------------------------------------

class TestGetEnemies:
    def test_returns_scene_enemies(self, full_client, test_scene, test_entity,
                                   test_entity_appearance):
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/enemies?zone=1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["enemies"]) >= 1
        enemy = data["enemies"][0]
        assert enemy["canonical_name"] == "Shadow Wraith"

    def test_fallback_stats_when_no_gameplay_data(self, full_client, test_scene,
                                                   test_entity, test_entity_appearance,
                                                   session: Session):
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/enemies?zone=3")
        data = resp.json()
        enemy = data["enemies"][0]
        assert enemy["is_fallback"] is True
        assert enemy["base_hp"] > 0

    def test_fallback_enemy_when_no_entities(self, full_client, test_scene):
        # No entity_scene_appearances seeded → generic fallback
        resp = full_client.get(f"/api/game/story/scenes/{test_scene.id}/enemies?zone=1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["enemies"]) >= 1
        assert data["enemies"][0]["is_fallback"] is True

    def test_logs_to_dev_content_audit(self, full_client, test_scene, test_entity,
                                        test_entity_appearance, session: Session):
        full_client.get(f"/api/game/story/scenes/{test_scene.id}/enemies?zone=1")
        audit_rows = session.exec(
            __import__("sqlmodel", fromlist=["select"]).select(DevContentAudit)
        ).all()
        assert len(audit_rows) > 0


# ---------------------------------------------------------------------------
# Tests: POST /session/start
# ---------------------------------------------------------------------------

class TestSessionStart:
    def test_creates_new_session(self, full_client, test_scene, game_configs):
        resp = full_client.post("/api/game/story/session/start",
                                json={"scene_id": test_scene.id})
        assert resp.status_code == 200
        data = resp.json()
        assert "session_id" in data
        assert data["scene_id"] == test_scene.id
        assert data["current_zone"] == 1
        assert data["current_wave"] == 1
        assert data["session_gold"] == 0.0
        assert data["dark_ritual_multiplier"] == 1.0

    def test_includes_character_combat_stats(self, full_client, test_scene, game_configs):
        resp = full_client.post("/api/game/story/session/start",
                                json={"scene_id": test_scene.id})
        data = resp.json()
        assert "character_strength" in data
        assert "auto_dps_per_second" in data

    def test_scene_not_found(self, full_client):
        resp = full_client.post("/api/game/story/session/start",
                                json={"scene_id": 99999})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests: POST /session/{id}/tick
# ---------------------------------------------------------------------------

class TestCombatTick:
    def _start_session(self, client, scene_id: int) -> str:
        resp = client.post("/api/game/story/session/start", json={"scene_id": scene_id})
        return resp.json()["session_id"]

    def test_awards_gold_on_tick(self, full_client, test_scene, game_configs):
        sid = self._start_session(full_client, test_scene.id)
        resp = full_client.post(f"/api/game/story/session/{sid}/tick", json={
            "clicks": 10, "elapsed_ms": 2000, "zone": 1, "wave": 3,
            "gold_delta": 50.0, "waves_completed_delta": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["session_gold"] > 0
        assert data["cps_valid"] is True

    def test_cps_violation_corrects_clicks(self, full_client, test_scene, game_configs):
        sid = self._start_session(full_client, test_scene.id)
        # 100 clicks in 1 second = 100 CPS — violates the 20 CPS cap
        resp = full_client.post(f"/api/game/story/session/{sid}/tick", json={
            "clicks": 100, "elapsed_ms": 1000, "zone": 1, "wave": 1,
            "gold_delta": 5.0, "waves_completed_delta": 0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["cps_valid"] is False

    def test_gold_anomaly_is_capped(self, full_client, test_scene, game_configs):
        sid = self._start_session(full_client, test_scene.id)
        # Claim an absurdly high gold amount
        resp = full_client.post(f"/api/game/story/session/{sid}/tick", json={
            "clicks": 10, "elapsed_ms": 2000, "zone": 1, "wave": 1,
            "gold_delta": 999999999.0, "waves_completed_delta": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        # Corrected gold should be far less than claimed
        assert data["gold_corrected"] is True
        assert data["gold_awarded"] < 999999999.0

    def test_session_not_found(self, full_client):
        resp = full_client.post(f"/api/game/story/session/{uuid.uuid4()}/tick", json={
            "clicks": 5, "elapsed_ms": 1000, "zone": 1, "wave": 1,
            "gold_delta": 10.0, "waves_completed_delta": 0,
        })
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tests: POST /session/{id}/narrative
# ---------------------------------------------------------------------------

class TestNarrativeProgress:
    def test_updates_progress(self, full_client, test_scene, game_configs):
        sid_resp = full_client.post("/api/game/story/session/start",
                                    json={"scene_id": test_scene.id})
        sid = sid_resp.json()["session_id"]
        resp = full_client.post(f"/api/game/story/session/{sid}/narrative",
                                json={"progress_pct": 75.0})
        assert resp.status_code == 200
        data = resp.json()
        assert data["narrative_progress_pct"] == 75.0
        assert data["narrative_complete"] is False

    def test_complete_at_100(self, full_client, test_scene, game_configs):
        sid_resp = full_client.post("/api/game/story/session/start",
                                    json={"scene_id": test_scene.id})
        sid = sid_resp.json()["session_id"]
        resp = full_client.post(f"/api/game/story/session/{sid}/narrative",
                                json={"progress_pct": 100.0})
        assert resp.json()["narrative_complete"] is True

    def test_clamps_above_100(self, full_client, test_scene, game_configs):
        sid_resp = full_client.post("/api/game/story/session/start",
                                    json={"scene_id": test_scene.id})
        sid = sid_resp.json()["session_id"]
        resp = full_client.post(f"/api/game/story/session/{sid}/narrative",
                                json={"progress_pct": 150.0})
        assert resp.json()["narrative_progress_pct"] == 100.0


# ---------------------------------------------------------------------------
# Tests: POST /session/{id}/complete
# ---------------------------------------------------------------------------

class TestSessionComplete:
    def test_completes_and_returns_essence(self, full_client, test_scene, game_configs):
        sid_resp = full_client.post("/api/game/story/session/start",
                                    json={"scene_id": test_scene.id})
        sid = sid_resp.json()["session_id"]

        resp = full_client.post(f"/api/game/story/session/{sid}/complete")
        assert resp.status_code == 200
        data = resp.json()
        assert data["essence_earned"] >= 0
        assert "total_essence" in data

    def test_session_closed_after_complete(self, full_client, test_scene,
                                            game_configs, session: Session):
        sid_resp = full_client.post("/api/game/story/session/start",
                                    json={"scene_id": test_scene.id})
        sid = sid_resp.json()["session_id"]
        full_client.post(f"/api/game/story/session/{sid}/complete")

        db_session = session.get(PlayerStorySession, sid)
        assert db_session is not None
        assert db_session.is_active is False
