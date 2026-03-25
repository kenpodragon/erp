"""Tests for 2.6 features: Anti-Cheat, Discovery, and Chat."""

import time
import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from models import (
    Player, CharacterClass, PlayerCharacter, PlayerProgress,
    Scene, Chapter, Book, Entity, EntityGameplayData, Skill,
    ActivityEvent, EntityType, EntityFamily,
)
from models.discovery import PlayerEntityDiscovery, PlayerDiscoveryLog
from models.chat import ChatChannel
from models.story_mode import GameConfig, PlayerStorySession


# ---------------------------------------------------------------------------
# Anti-Cheat (2.6.1) — helper imports
# ---------------------------------------------------------------------------


def _seed_rank_configs(session: Session):
    """Seed game_configs used by _compute_rank in story_mode."""
    for key, val in [
        ("codex_rank_ss", 500),
        ("codex_rank_a", 100),
        ("codex_rank_c", 25),
        ("codex_rank_e", 1),
    ]:
        session.add(GameConfig(key=key, value_json=val, description=key))
    session.commit()


def _seed_base_configs(session: Session):
    """Seed minimum configs for story sessions."""
    for key, val, desc in [
        ("click_rate_cap", 20, "CPS cap"),
        ("hp_scaling_factor", 1.55, "HP scale"),
        ("crit_multiplier", 2.0, "Crit mult"),
        ("session_gold_tolerance", 3.0, "Gold tolerance"),
        ("wave_validation_tolerance", 2.0, "Wave tolerance"),
    ]:
        existing = session.get(GameConfig, key)
        if not existing:
            session.add(GameConfig(key=key, value_json=val, description=desc))
    session.commit()


# ---------------------------------------------------------------------------
# Additional fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_book(session: Session) -> Book:
    book = Book(
        book_number=1, title="Test Book I", source_file="test.docx",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


@pytest.fixture
def test_chapter(session: Session, test_book: Book) -> Chapter:
    ch = Chapter(
        book_id=test_book.id, chapter_number=1, title="Chapter One",
        sort_order=1, processing_status="done",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(ch)
    session.commit()
    session.refresh(ch)
    return ch


@pytest.fixture
def test_scene(session: Session, test_chapter: Chapter) -> Scene:
    sc = Scene(
        chapter_id=test_chapter.id, scene_number=1, title="Test Scene",
        summary="A test scene.", sort_order=1,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(sc)
    session.commit()
    session.refresh(sc)
    return sc


@pytest.fixture
def test_entity_type(session: Session) -> EntityType:
    et = EntityType(
        name="enemy", display_name="Enemy", sort_order=0,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(et)
    session.commit()
    session.refresh(et)
    return et


@pytest.fixture
def test_entity_family(session: Session) -> EntityFamily:
    ef = EntityFamily(
        name="goblin", display_name="Goblin", sort_order=0,
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(ef)
    session.commit()
    session.refresh(ef)
    return ef


@pytest.fixture
def test_entity(session: Session, test_entity_type: EntityType, test_entity_family: EntityFamily) -> Entity:
    e = Entity(
        canonical_name="Goblin Scout", entity_type_id=test_entity_type.id,
        entity_family_id=test_entity_family.id,
        base_description="A sneaky goblin scout lurking in the shadows.",
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


@pytest.fixture
def test_entity_gameplay(session: Session, test_entity: Entity) -> EntityGameplayData:
    gd = EntityGameplayData(
        entity_id=test_entity.id,
        base_hp=100,
        base_gold=10,
        sprite_key="goblin_scout",
        stat_block={"str": 5, "agi": 8},
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
    )
    session.add(gd)
    session.commit()
    session.refresh(gd)
    return gd


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


@pytest.fixture
def admin_full_client(session: Session, test_player: Player, test_character: PlayerCharacter):
    """Client with admin-level player auth mocked."""
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


# ===========================================================================
# Anti-Cheat (2.6.1)
# ===========================================================================


class TestComputeRankThresholds:
    """Test _compute_rank returns correct ranks for various kill counts."""

    def test_rank_none_for_zero_kills(self, session: Session):
        _seed_rank_configs(session)
        from routes.story_mode import _compute_rank
        assert _compute_rank(0, session) is None

    def test_rank_e_for_low_kills(self, session: Session):
        _seed_rank_configs(session)
        from routes.story_mode import _compute_rank
        assert _compute_rank(1, session) == "E"
        assert _compute_rank(10, session) == "E"
        assert _compute_rank(24, session) == "E"

    def test_rank_c_threshold(self, session: Session):
        _seed_rank_configs(session)
        from routes.story_mode import _compute_rank
        assert _compute_rank(25, session) == "C"
        assert _compute_rank(50, session) == "C"
        assert _compute_rank(99, session) == "C"

    def test_rank_a_threshold(self, session: Session):
        _seed_rank_configs(session)
        from routes.story_mode import _compute_rank
        assert _compute_rank(100, session) == "A"
        assert _compute_rank(250, session) == "A"
        assert _compute_rank(499, session) == "A"

    def test_rank_ss_threshold(self, session: Session):
        _seed_rank_configs(session)
        from routes.story_mode import _compute_rank
        assert _compute_rank(500, session) == "SS"
        assert _compute_rank(1000, session) == "SS"


class TestWaveValidationClampsExcessiveWaves:
    """Test that _validate_waves clamps when waves exceed DPS ceiling."""

    def test_clamps_excessive_waves(self, session: Session, test_character: PlayerCharacter):
        _seed_base_configs(session)
        from routes.story_mode import _validate_waves

        # Create a minimal story session to pass to _validate_waves
        story_session = PlayerStorySession(
            id=uuid.uuid4(),
            player_id=test_character.player_id,
            scene_id=1,
            current_zone=1,
            current_wave=1,
            session_gold=0.0,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(story_session)
        session.commit()

        # Request an absurdly high wave count in a tiny time window
        result = _validate_waves(
            session, story_session,
            character_id=test_character.id,
            waves_delta=99999,
            elapsed_ms=1000,  # 1 second
            zone=1,
            hp_scaling=1.55,
        )
        # Should be clamped significantly below the requested amount
        assert result < 99999

    def test_zero_waves_pass_through(self, session: Session, test_character: PlayerCharacter):
        _seed_base_configs(session)
        from routes.story_mode import _validate_waves

        story_session = PlayerStorySession(
            id=uuid.uuid4(),
            player_id=test_character.player_id,
            scene_id=1,
            current_zone=1,
            current_wave=1,
            session_gold=0.0,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(story_session)
        session.commit()

        result = _validate_waves(
            session, story_session,
            character_id=test_character.id,
            waves_delta=0,
            elapsed_ms=1000,
            zone=1,
            hp_scaling=1.55,
        )
        assert result == 0


class TestSessionIntegrityCheck:
    """Test that /complete corrects gold that exceeds plausibility threshold."""

    def test_gold_corrected_on_complete(
        self, full_client, test_scene, session: Session, test_character
    ):
        _seed_base_configs(session)

        # Start a session
        resp = full_client.post(
            "/api/game/story/session/start",
            json={"scene_id": test_scene.id},
        )
        assert resp.status_code == 200
        sid = resp.json()["session_id"]

        # Inject absurdly high gold directly into the session record
        db_session = session.get(PlayerStorySession, uuid.UUID(sid))
        db_session.session_gold = 999_999_999.0
        session.add(db_session)
        session.commit()

        # Complete — the integrity check should cap the gold
        resp = full_client.post(f"/api/game/story/session/{sid}/complete")
        assert resp.status_code == 200

        # Verify the gold was corrected (should be far less than injected)
        session.refresh(db_session)
        assert db_session.session_gold < 999_999_999.0


class TestAnomalyLogging:
    """Test that _log_anomaly creates an ActivityEvent with correct payload."""

    def test_log_anomaly_creates_event(self, session: Session, test_player: Player):
        from routes.story_mode import _log_anomaly

        fake_session_id = uuid.uuid4()
        _log_anomaly(
            session, test_player.id, fake_session_id,
            anomaly_type="test_anomaly",
            reported_value=9999.0,
            corrected_value=100.0,
            zone=5,
            elapsed_ms=3000,
        )
        session.commit()

        events = session.exec(
            select(ActivityEvent).where(ActivityEvent.player_id == test_player.id)
        ).all()
        assert len(events) == 1
        event = events[0]
        assert event.event_type == "anti_cheat_anomaly"
        assert event.event_data["anomaly_type"] == "test_anomaly"
        assert event.event_data["reported_value"] == 9999.0
        assert event.event_data["corrected_value"] == 100.0
        assert event.event_data["zone"] == 5
        assert event.event_data["elapsed_ms"] == 3000
        assert event.event_data["session_id"] == str(fake_session_id)


class TestRareSpawnEngine:
    """Test _check_rare_spawn helper."""

    def test_no_spawn_with_zero_waves(self, session: Session, test_chapter):
        from routes.story_mode import _check_rare_spawn
        result = _check_rare_spawn(session, 0, test_chapter.id)
        assert result is None

    def test_no_spawn_with_zero_chance(self, session: Session, test_chapter):
        from routes.story_mode import _check_rare_spawn
        # Set base chance to 0
        session.add(GameConfig(key="rare_spawn_base_chance", value_json=0, description="test"))
        session.commit()
        result = _check_rare_spawn(session, 100, test_chapter.id)
        assert result is None

    def test_spawn_with_guaranteed_chance(self, session: Session, test_chapter, test_entity_type):
        from routes.story_mode import _check_rare_spawn
        # Set base chance to 1 (100%)
        session.add(GameConfig(key="rare_spawn_base_chance", value_json=1.0, description="test"))
        session.commit()

        # Need an entity with NO scene appearances and no first_appearance_scene_id
        rare_entity = Entity(
            canonical_name="Rare Beast", entity_type_id=test_entity_type.id,
            first_appearance_scene_id=None,
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        )
        session.add(rare_entity)
        session.commit()

        result = _check_rare_spawn(session, 1, test_chapter.id)
        assert result is not None
        assert result["entity_id"] == rare_entity.id
        assert result["canonical_name"] == "Rare Beast"

    def test_spawn_returns_none_when_no_rare_pool(
        self, session: Session, test_chapter, test_scene, test_entity_type
    ):
        from routes.story_mode import _check_rare_spawn
        from models.story_mode import EntitySceneAppearance

        session.add(GameConfig(key="rare_spawn_base_chance", value_json=1.0, description="test"))
        # Create entity WITH scene appearance (not rare)
        entity = Entity(
            canonical_name="Common Entity", entity_type_id=test_entity_type.id,
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        )
        session.add(entity)
        session.commit()
        session.refresh(entity)

        esa = EntitySceneAppearance(
            entity_id=entity.id, scene_id=test_scene.id,
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        )
        session.add(esa)
        session.commit()

        result = _check_rare_spawn(session, 1, test_chapter.id)
        assert result is None


class TestTickEntityEncounters:
    """Test that /tick processes entity_encounters and returns new_ranks."""

    def test_tick_creates_discovery_record(
        self, full_client, test_scene, test_entity, session: Session, test_player, test_character
    ):
        _seed_base_configs(session)
        _seed_rank_configs(session)

        # Start session
        resp = full_client.post(
            "/api/game/story/session/start",
            json={"scene_id": test_scene.id},
        )
        assert resp.status_code == 200
        sid = resp.json()["session_id"]

        # Send tick with entity encounters
        resp = full_client.post(f"/api/game/story/session/{sid}/tick", json={
            "clicks": 10,
            "elapsed_ms": 2000,
            "zone": 1,
            "wave": 1,
            "gold_delta": 0,
            "waves_completed_delta": 0,
            "entity_encounters": [
                {"entity_id": test_entity.id, "encounters": 5, "kills": 3},
            ],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("new_discoveries", 0) == 1

        # Verify discovery record exists
        discovery = session.exec(
            select(PlayerEntityDiscovery)
            .where(PlayerEntityDiscovery.player_id == test_player.id)
            .where(PlayerEntityDiscovery.entity_id == test_entity.id)
        ).first()
        assert discovery is not None
        assert discovery.encounters == 5
        assert discovery.kills == 3

    def test_tick_updates_existing_discovery(
        self, full_client, test_scene, test_entity, session: Session, test_player, test_character
    ):
        _seed_base_configs(session)
        _seed_rank_configs(session)

        # Seed existing discovery
        existing = PlayerEntityDiscovery(
            player_id=test_player.id, entity_id=test_entity.id,
            encounters=10, kills=5, rank="E",
            first_seen_at=datetime.now(timezone.utc), is_new=False,
        )
        session.add(existing)
        session.commit()

        # Start session
        resp = full_client.post(
            "/api/game/story/session/start",
            json={"scene_id": test_scene.id},
        )
        assert resp.status_code == 200
        sid = resp.json()["session_id"]

        # Tick with more encounters
        resp = full_client.post(f"/api/game/story/session/{sid}/tick", json={
            "clicks": 5,
            "elapsed_ms": 2000,
            "zone": 1,
            "wave": 1,
            "gold_delta": 0,
            "waves_completed_delta": 0,
            "entity_encounters": [
                {"entity_id": test_entity.id, "encounters": 20, "kills": 20},
            ],
        })
        assert resp.status_code == 200

        session.refresh(existing)
        assert existing.encounters == 30  # 10 + 20
        assert existing.kills == 25  # 5 + 20


# ===========================================================================
# Discovery (2.6.2)
# ===========================================================================


class TestDiscoveryEntitiesEndpoint:
    """Test GET /api/game/registry/entities returns paginated results."""

    def test_returns_entities(self, full_client, test_entity, session: Session):
        resp = full_client.get("/api/game/registry/entities")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)
        assert "entities" in data
        entities = data["entities"]
        assert isinstance(entities, list)
        assert len(entities) >= 1
        # Entity should appear (possibly as "mist" since no discovery record)
        entity_ids = [e["entity_id"] for e in entities]
        assert test_entity.id in entity_ids

    def test_pagination(self, full_client, session: Session, test_entity_type):
        # Seed multiple entities
        for i in range(5):
            session.add(Entity(
                canonical_name=f"Entity_{i}", entity_type_id=test_entity_type.id,
                created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
            ))
        session.commit()

        resp = full_client.get("/api/game/registry/entities?page=1&per_page=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["entities"]) <= 2

    def test_family_filter(self, full_client, test_entity, session: Session):
        # test_entity has family="goblin" via entity_family_id FK
        resp = full_client.get("/api/game/registry/entities?family=goblin")
        assert resp.status_code == 200
        data = resp.json()
        entities = data["entities"]
        assert all(
            e["family"] == "goblin" or e["family"] is None
            for e in entities
        )


class TestDiscoveryEntityDetailRankGating:
    """Test that entity detail returns appropriate fields based on rank."""

    def test_low_rank_hides_stats(
        self, full_client, test_entity, test_entity_gameplay, session: Session, test_player
    ):
        # Create a discovery with rank E (low rank)
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=1,
            kills=0,
            rank="E",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        resp = full_client.get(f"/api/game/registry/entities/{test_entity.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rank"] == "E"
        # E rank should NOT reveal base_hp, base_gold, stat_block, hidden_lore
        assert data["base_hp"] is None
        assert data["base_gold"] is None
        assert data["stat_block"] is None
        assert data["hidden_lore"] is None

    def test_c_rank_reveals_hp_gold(
        self, full_client, test_entity, test_entity_gameplay, session: Session, test_player
    ):
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=20,
            kills=10,
            rank="C",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        resp = full_client.get(f"/api/game/registry/entities/{test_entity.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rank"] == "C"
        assert data["base_hp"] == 100
        assert data["base_gold"] == 10
        assert data["stat_block"] is None  # Not revealed until A rank
        assert data["hidden_lore"] is None

    def test_a_rank_reveals_stat_block(
        self, full_client, test_entity, test_entity_gameplay, session: Session, test_player
    ):
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=50,
            kills=50,
            rank="A",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        resp = full_client.get(f"/api/game/registry/entities/{test_entity.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rank"] == "A"
        assert data["stat_block"] is not None
        assert data["hidden_lore"] is None  # Not revealed until SS

    def test_ss_rank_reveals_hidden_lore(
        self, full_client, test_entity, test_entity_gameplay, session: Session, test_player
    ):
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=200,
            kills=200,
            rank="SS",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        resp = full_client.get(f"/api/game/registry/entities/{test_entity.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["rank"] == "SS"
        assert data["hidden_lore"] == "A sneaky goblin scout lurking in the shadows."

    def test_entity_not_found(self, full_client):
        resp = full_client.get("/api/game/registry/entities/99999")
        assert resp.status_code == 404


class TestDiscoveryStats:
    """Test GET /api/game/registry/stats returns correct counters."""

    def test_stats_empty(self, full_client):
        resp = full_client.get("/api/game/registry/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_entities"] == 0
        assert data["discovered_entities"] == 0
        assert data["entity_completion_pct"] == 0.0

    def test_stats_with_discoveries(
        self, full_client, test_entity, session: Session, test_player
    ):
        # Add a discovery
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=5,
            kills=3,
            rank="D",
            first_seen_at=datetime.now(timezone.utc),
        )
        session.add(discovery)
        session.commit()

        resp = full_client.get("/api/game/registry/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_entities"] == 1
        assert data["discovered_entities"] == 1
        assert data["entity_completion_pct"] == 100.0

    def test_stats_with_skills(
        self, full_client, session: Session, test_player
    ):
        # Add a skill and a discovery log for it
        skill = Skill(
            name="Fireball", category="combat", description="A ball of fire",
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),
        )
        session.add(skill)
        session.commit()
        session.refresh(skill)

        log = PlayerDiscoveryLog(
            player_id=test_player.id,
            discovery_type="skill",
            reference_id=skill.id,
            discovered_at=datetime.now(timezone.utc),
            is_new=True,
        )
        session.add(log)
        session.commit()

        resp = full_client.get("/api/game/registry/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_skills"] == 1
        assert data["discovered_skills"] == 1
        assert data["skill_completion_pct"] == 100.0


class TestDiscoveryUnlockBatch:
    """Test POST /api/game/registry/unlock-batch creates/updates records."""

    def test_creates_new_discovery(
        self, full_client, test_entity, session: Session, test_player
    ):
        resp = full_client.post("/api/game/registry/unlock-batch", json={
            "entries": [{"entity_id": test_entity.id, "encounters": 10, "kills": 5}],
        })
        assert resp.status_code == 200
        data = resp.json()

        # Verify record was created
        discovery = session.exec(
            select(PlayerEntityDiscovery).where(
                PlayerEntityDiscovery.player_id == test_player.id,
                PlayerEntityDiscovery.entity_id == test_entity.id,
            )
        ).first()
        assert discovery is not None
        assert discovery.encounters == 10
        assert discovery.kills == 5
        assert discovery.is_new is True

    def test_updates_existing_discovery(
        self, full_client, test_entity, session: Session, test_player
    ):
        # Seed an initial discovery
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=5,
            kills=2,
            rank="D",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        resp = full_client.post("/api/game/registry/unlock-batch", json={
            "entries": [{"entity_id": test_entity.id, "encounters": 20, "kills": 10}],
        })
        assert resp.status_code == 200

        session.refresh(discovery)
        assert discovery.encounters == 25  # 5 + 20
        assert discovery.kills == 12  # 2 + 10

    def test_rank_change_reported(
        self, full_client, test_entity, session: Session, test_player
    ):
        # Seed at E rank (encounters=1, kills=0)
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=1,
            kills=0,
            rank="E",
            first_seen_at=datetime.now(timezone.utc),
            is_new=False,
        )
        session.add(discovery)
        session.commit()

        # Add enough to push to a higher rank
        # _compute_rank in discovery.py: score = encounters + kills*2; >= 200 -> S
        resp = full_client.post("/api/game/registry/unlock-batch", json={
            "entries": [{"entity_id": test_entity.id, "encounters": 100, "kills": 100}],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["new_ranks"]) >= 1
        rank_change = data["new_ranks"][0]
        assert rank_change["entity_id"] == test_entity.id
        assert rank_change["old_rank"] == "E"


class TestDiscoveryClearNew:
    """Test PATCH /api/game/registry/clear-new updates is_new flags."""

    def test_clear_entity_new_flags(
        self, full_client, test_entity, session: Session, test_player
    ):
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=5,
            kills=3,
            rank="D",
            first_seen_at=datetime.now(timezone.utc),
            is_new=True,
        )
        session.add(discovery)
        session.commit()
        session.refresh(discovery)

        resp = full_client.patch("/api/game/registry/clear-new", json={
            "type": "entities",
            "ids": [discovery.id],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["cleared"] == 1

        session.refresh(discovery)
        assert discovery.is_new is False

    def test_clear_library_new_flags(
        self, full_client, session: Session, test_player
    ):
        log = PlayerDiscoveryLog(
            player_id=test_player.id,
            discovery_type="skill",
            reference_id=1,
            discovered_at=datetime.now(timezone.utc),
            is_new=True,
        )
        session.add(log)
        session.commit()
        session.refresh(log)

        resp = full_client.patch("/api/game/registry/clear-new", json={
            "type": "library",
            "ids": [log.id],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["cleared"] == 1

        session.refresh(log)
        assert log.is_new is False

    def test_invalid_type_returns_400(self, full_client):
        resp = full_client.patch("/api/game/registry/clear-new", json={
            "type": "invalid",
            "ids": [1],
        })
        assert resp.status_code == 400


# ===========================================================================
# Chat (2.6.4)
# ===========================================================================


class TestChatRateLimiter:
    """Test ChatRateLimiter allows/blocks based on rate."""

    def test_allows_under_limit(self):
        from services.chat import ChatRateLimiter
        limiter = ChatRateLimiter(max_per_minute=5)
        for _ in range(5):
            assert limiter.is_allowed(player_id=1) is True

    def test_blocks_over_limit(self):
        from services.chat import ChatRateLimiter
        limiter = ChatRateLimiter(max_per_minute=3)
        for _ in range(3):
            limiter.is_allowed(player_id=1)
        assert limiter.is_allowed(player_id=1) is False

    def test_separate_player_limits(self):
        from services.chat import ChatRateLimiter
        limiter = ChatRateLimiter(max_per_minute=2)
        limiter.is_allowed(player_id=1)
        limiter.is_allowed(player_id=1)
        # Player 1 is at limit
        assert limiter.is_allowed(player_id=1) is False
        # Player 2 should still be allowed
        assert limiter.is_allowed(player_id=2) is True


class TestBroadcastRateLimiter:
    """Test BroadcastRateLimiter."""

    def test_allows_under_limit(self):
        from services.chat import BroadcastRateLimiter
        limiter = BroadcastRateLimiter(max_per_minute=5)
        for _ in range(5):
            assert limiter.is_allowed() is True

    def test_blocks_over_limit(self):
        from services.chat import BroadcastRateLimiter
        limiter = BroadcastRateLimiter(max_per_minute=3)
        for _ in range(3):
            limiter.is_allowed()
        assert limiter.is_allowed() is False


class TestConnectionManagerConnectDisconnect:
    """Test ConnectionManager connect/disconnect."""

    def test_connect_and_disconnect(self):
        import asyncio
        from services.chat import ConnectionManager
        mgr = ConnectionManager()

        ws = AsyncMock()
        asyncio.new_event_loop().run_until_complete(mgr.connect(player_id=42, websocket=ws))
        ws.accept.assert_awaited_once()
        assert 42 in mgr.active_connections
        assert len(mgr.active_connections[42]) == 1

        mgr.disconnect(player_id=42, websocket=ws)
        assert 42 not in mgr.active_connections

    def test_multiple_connections_same_player(self):
        """Second connect replaces the first (last-connection-wins design)."""
        import asyncio
        from services.chat import ConnectionManager
        mgr = ConnectionManager()

        ws1 = AsyncMock()
        ws2 = AsyncMock()
        loop = asyncio.new_event_loop()
        loop.run_until_complete(mgr.connect(player_id=1, websocket=ws1))
        loop.run_until_complete(mgr.connect(player_id=1, websocket=ws2))
        # Second connect replaces first — stale ws1 was closed
        assert len(mgr.active_connections[1]) == 1
        assert mgr.active_connections[1][0] is ws2
        ws1.close.assert_called_once()

        mgr.disconnect(player_id=1, websocket=ws2)
        assert 1 not in mgr.active_connections

    def test_get_history(self):
        from services.chat import ConnectionManager
        mgr = ConnectionManager()
        mgr.message_buffer.append({"type": "message", "content": "hello"})
        history = mgr.get_history()
        assert len(history) == 1
        assert history[0]["content"] == "hello"


class TestProfanityFilter:
    """Test check_profanity replaces blocked words."""

    def test_replaces_blocked_words(self):
        from utils import check_profanity, _profanity_blocklist

        # Manually seed the blocklist for testing
        _profanity_blocklist.clear()
        _profanity_blocklist.add("badword")
        _profanity_blocklist.add("curse")

        result = check_profanity("hello badword world")
        assert result == "hello ***** world"

        result = check_profanity("no curse allowed here")
        assert result == "no ***** allowed here"

    def test_no_replacement_for_clean_text(self):
        from utils import check_profanity, _profanity_blocklist

        _profanity_blocklist.clear()
        _profanity_blocklist.add("badword")

        result = check_profanity("this is perfectly clean")
        assert result == "this is perfectly clean"

    def test_empty_text_returns_empty(self):
        from utils import check_profanity
        assert check_profanity("") == ""

    def test_case_insensitive(self):
        from utils import check_profanity, _profanity_blocklist

        _profanity_blocklist.clear()
        _profanity_blocklist.add("badword")

        result = check_profanity("this BADWORD here")
        assert result == "this ***** here"


class TestAdminChatChannels:
    """Test GET /api/admin/chat/channels."""

    def test_list_channels(self, admin_full_client, session: Session):
        channel = ChatChannel(
            id="global",
            name="Global Chat",
            channel_type="global",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(channel)
        session.commit()

        resp = admin_full_client.get("/api/admin/chat/channels")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["id"] == "global"
        assert data[0]["name"] == "Global Chat"
        assert data[0]["is_active"] is True

    def test_list_channels_empty(self, admin_full_client):
        resp = admin_full_client.get("/api/admin/chat/channels")
        assert resp.status_code == 200
        assert resp.json() == []


class TestAdminChatMute:
    """Test POST /api/admin/chat/mute."""

    def test_mute_player(self, admin_full_client, session: Session, test_player: Player):
        resp = admin_full_client.post("/api/admin/chat/mute", json={
            "player_id": test_player.id,
            "muted": True,
            "until": "2030-12-31T00:00:00Z",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["chat_muted"] is True
        assert data["chat_muted_until"] == "2030-12-31T00:00:00Z"

    def test_mute_nonexistent_player(self, admin_full_client):
        resp = admin_full_client.post("/api/admin/chat/mute", json={
            "player_id": 99999,
            "muted": True,
        })
        assert resp.status_code == 404


# ===========================================================================
# Model Tests
# ===========================================================================


class TestDiscoveryModels:
    """Test PlayerEntityDiscovery and PlayerDiscoveryLog model creation."""

    def test_player_entity_discovery_creation(self, session: Session, test_player, test_entity):
        discovery = PlayerEntityDiscovery(
            player_id=test_player.id,
            entity_id=test_entity.id,
            encounters=10,
            kills=5,
            rank="D",
            first_seen_at=datetime.now(timezone.utc),
            is_new=True,
        )
        session.add(discovery)
        session.commit()
        session.refresh(discovery)

        assert discovery.id is not None
        assert discovery.player_id == test_player.id
        assert discovery.entity_id == test_entity.id
        assert discovery.encounters == 10
        assert discovery.kills == 5
        assert discovery.rank == "D"
        assert discovery.is_new is True

    def test_player_discovery_log_creation(self, session: Session, test_player):
        log = PlayerDiscoveryLog(
            player_id=test_player.id,
            discovery_type="skill",
            reference_id=42,
            discovered_at=datetime.now(timezone.utc),
            is_new=True,
        )
        session.add(log)
        session.commit()
        session.refresh(log)

        assert log.id is not None
        assert log.player_id == test_player.id
        assert log.discovery_type == "skill"
        assert log.reference_id == 42
        assert log.is_new is True


class TestChatChannelModel:
    """Test ChatChannel model creation."""

    def test_chat_channel_creation(self, session: Session):
        channel = ChatChannel(
            id="test_channel",
            name="Test Channel",
            channel_type="guild",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        session.add(channel)
        session.commit()

        retrieved = session.get(ChatChannel, "test_channel")
        assert retrieved is not None
        assert retrieved.name == "Test Channel"
        assert retrieved.channel_type == "guild"
        assert retrieved.is_active is True

    def test_chat_channel_defaults(self, session: Session):
        channel = ChatChannel(
            id="minimal",
            name="Minimal Channel",
        )
        session.add(channel)
        session.commit()

        retrieved = session.get(ChatChannel, "minimal")
        assert retrieved.channel_type == "global"
        assert retrieved.is_active is True
        assert retrieved.created_by is None
