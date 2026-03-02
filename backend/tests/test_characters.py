"""
Tests for the Character System API (TODO 7.4):
  GET  /api/game/classes
  POST /api/players/me/characters
  GET  /api/players/me/characters
  GET  /api/players/me/characters/{character_id}
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone

from main import app
from db import get_session
from auth import get_current_player
import models
from models import Player, PlayerSettings, CharacterClass, PlayerCharacter, PlayerProgress, PlayerEssence

# ---------------------------------------------------------------------------
# Test DB setup (SQLite, in-memory enough for unit tests)
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DUMMY_TOKEN = {
    "uid": "char_test_uid",
    "email": "chartest@example.com",
    "name": "Char Tester",
    "picture": "http://example.com/pic.jpg",
}


def _make_player(session: Session, uid: str = "char_test_uid", email: str = "chartest@example.com") -> Player:
    now = datetime.now(timezone.utc)
    player = Player(firebase_uid=uid, email=email, created_at=now)
    session.add(player)
    session.commit()
    session.refresh(player)
    return player


def _make_class(session: Session, name: str = "Sentinel", available: bool = True) -> CharacterClass:
    now = datetime.now(timezone.utc)
    cls = CharacterClass(
        name=name,
        lore_blurb="A stalwart defender.",
        base_strength=15,
        base_agility=8,
        base_intelligence=10,
        is_available=available,
        created_at=now,
        updated_at=now,
    )
    session.add(cls)
    session.commit()
    session.refresh(cls)
    return cls


def _auth_override(player: Player):
    def override():
        token = DUMMY_TOKEN.copy()
        token["player"] = player
        return token
    return override


# ---------------------------------------------------------------------------
# GET /api/game/classes
# ---------------------------------------------------------------------------

def test_get_classes_empty(client: TestClient):
    """Returns empty list when no classes seeded."""
    response = client.get("/api/game/classes")
    assert response.status_code == 200
    assert response.json() == []


def test_get_classes_returns_available(client: TestClient, session: Session):
    """Only available classes are returned."""
    _make_class(session, "Sentinel", available=True)
    _make_class(session, "HiddenClass", available=False)

    response = client.get("/api/game/classes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Sentinel"


def test_get_classes_no_auth_required(client: TestClient, session: Session):
    """Public endpoint — no Authorization header needed."""
    _make_class(session, "Arcanist")
    response = client.get("/api/game/classes")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/players/me/characters
# ---------------------------------------------------------------------------

def test_create_character_success(client: TestClient, session: Session):
    """Creates a character and initializes progress + essence."""
    player = _make_player(session)
    cls = _make_class(session, "Sentinel")
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={
        "character_name": "Aldric",
        "class_id": cls.id,
    })
    assert response.status_code == 200
    data = response.json()
    print(f"\nDEBUG character data: {data['character']}")

    assert data["character"]["character_name"] == "Aldric"
    assert data["character"]["strength"] == cls.base_strength
    assert data["character"]["agility"] == cls.base_agility
    assert data["character"]["intelligence"] == cls.base_intelligence
    assert data["character"]["class"]["name"] == "Sentinel"

    # Progress initialized at Book 1, Ch 1, Scene 1, Beat 1
    assert data["progress"]["book_number"] == 1
    assert data["progress"]["chapter_number"] == 1
    assert data["progress"]["scene_number"] == 1
    assert data["progress"]["beat_number"] == 1

    # Essence initialized at 0
    assert data["essence"]["current_balance"] == 0.0
    assert data["essence"]["passive_rate"] == 0.0

    # Verify DB rows
    char = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    assert char is not None
    prog = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == char.id)).first()
    assert prog is not None
    ess = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == char.id)).first()
    assert ess is not None


def test_create_character_enforces_mvp_limit(client: TestClient, session: Session):
    """409 if player already has a character (MVP 1-char limit)."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    # Create first character
    client.post("/api/players/me/characters", json={"character_name": "First", "class_id": cls.id})

    # Second attempt should 409
    response = client.post("/api/players/me/characters", json={"character_name": "Second", "class_id": cls.id})
    assert response.status_code == 409
    assert "Character limit" in str(response.json())


def test_create_character_name_too_short(client: TestClient, session: Session):
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={"character_name": "Ab", "class_id": cls.id})
    assert response.status_code == 422


def test_create_character_name_too_long(client: TestClient, session: Session):
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={
        "character_name": "A" * 21,
        "class_id": cls.id,
    })
    assert response.status_code == 422


def test_create_character_invalid_chars(client: TestClient, session: Session):
    """Name with special chars rejected."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={
        "character_name": "Name@Bad!",
        "class_id": cls.id,
    })
    assert response.status_code == 422


def test_create_character_profane_name(client: TestClient, session: Session):
    """Profanity filter rejects banned words."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={
        "character_name": "admin",  # in profanity blocklist
        "class_id": cls.id,
    })
    assert response.status_code == 422


def test_create_character_name_uniqueness(client: TestClient, session: Session):
    """409 if character name already taken (case-insensitive)."""
    player1 = _make_player(session, uid="uid1", email="p1@example.com")
    player2 = _make_player(session, uid="uid2", email="p2@example.com")
    cls = _make_class(session)

    # Player 1 creates 'Aldric'
    app.dependency_overrides[get_current_player] = _auth_override(player1)
    client.post("/api/players/me/characters", json={"character_name": "Aldric", "class_id": cls.id})

    # Player 2 tries 'aldric' (case-insensitive clash)
    app.dependency_overrides[get_current_player] = _auth_override(player2)
    response = client.post("/api/players/me/characters", json={"character_name": "aldric", "class_id": cls.id})
    assert response.status_code == 409
    assert "already taken" in str(response.json()).lower()


def test_create_character_invalid_class(client: TestClient, session: Session):
    """422 if class_id does not exist."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={"character_name": "Aldric", "class_id": 9999})
    assert response.status_code == 422


def test_create_character_unavailable_class(client: TestClient, session: Session):
    """422 if class exists but is_available=False."""
    player = _make_player(session)
    cls = _make_class(session, "Locked", available=False)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.post("/api/players/me/characters", json={"character_name": "Aldric", "class_id": cls.id})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/players/me/characters
# ---------------------------------------------------------------------------

def test_list_characters_empty(client: TestClient, session: Session):
    """Returns empty list when player has no characters."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.get("/api/players/me/characters")
    assert response.status_code == 200
    assert response.json() == []


def test_list_characters_with_one(client: TestClient, session: Session):
    """Returns character list with class info."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    client.post("/api/players/me/characters", json={"character_name": "Aldric", "class_id": cls.id})

    response = client.get("/api/players/me/characters")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["character_name"] == "Aldric"
    assert data[0]["class"]["name"] == "Sentinel"


# ---------------------------------------------------------------------------
# GET /api/players/me/characters/{character_id}
# ---------------------------------------------------------------------------

def test_get_character_detail(client: TestClient, session: Session):
    """Returns full detail including class, progress, essence."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    create_res = client.post("/api/players/me/characters", json={"character_name": "Aldric", "class_id": cls.id})
    char_id = create_res.json()["character"]["id"]

    response = client.get(f"/api/players/me/characters/{char_id}")
    assert response.status_code == 200
    data = response.json()

    assert data["character_name"] == "Aldric"
    assert data["class"] is not None
    assert data["progress"] is not None
    assert data["essence"] is not None


def test_get_character_enforces_ownership(client: TestClient, session: Session):
    """404 when requesting another player's character."""
    player1 = _make_player(session, uid="own1", email="own1@example.com")
    player2 = _make_player(session, uid="own2", email="own2@example.com")
    cls = _make_class(session)

    # Player1 creates character
    app.dependency_overrides[get_current_player] = _auth_override(player1)
    create_res = client.post("/api/players/me/characters", json={"character_name": "HeroOne", "class_id": cls.id})
    char_id = create_res.json()["character"]["id"]

    # Player2 tries to access it
    app.dependency_overrides[get_current_player] = _auth_override(player2)
    response = client.get(f"/api/players/me/characters/{char_id}")
    assert response.status_code == 404


def test_get_character_not_found(client: TestClient, session: Session):
    """404 for non-existent character_id."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.get("/api/players/me/characters/99999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/players/me/characters/{character_id}
# ---------------------------------------------------------------------------

def test_delete_character_success(client: TestClient, session: Session):
    """Character is deleted and removed from DB."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    create_res = client.post("/api/players/me/characters", json={"character_name": "Doomed", "class_id": cls.id})
    char_id = create_res.json()["character"]["id"]

    response = client.delete(f"/api/players/me/characters/{char_id}")
    assert response.status_code == 200
    assert "deleted" in response.json()["message"]

    # Should be gone from list
    list_res = client.get("/api/players/me/characters")
    assert list_res.json() == []


def test_delete_character_enforces_ownership(client: TestClient, session: Session):
    """404 when trying to delete another player's character."""
    player1 = _make_player(session, uid="del1", email="del1@example.com")
    player2 = _make_player(session, uid="del2", email="del2@example.com")
    cls = _make_class(session)

    app.dependency_overrides[get_current_player] = _auth_override(player1)
    create_res = client.post("/api/players/me/characters", json={"character_name": "OwnerChar", "class_id": cls.id})
    char_id = create_res.json()["character"]["id"]

    app.dependency_overrides[get_current_player] = _auth_override(player2)
    response = client.delete(f"/api/players/me/characters/{char_id}")
    assert response.status_code == 404


def test_delete_character_not_found(client: TestClient, session: Session):
    """404 for non-existent character_id."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    response = client.delete("/api/players/me/characters/99999")
    assert response.status_code == 404


def test_delete_allows_new_character_after(client: TestClient, session: Session):
    """After deletion the player can create a new character (MVP limit reset)."""
    player = _make_player(session)
    cls = _make_class(session)
    app.dependency_overrides[get_current_player] = _auth_override(player)

    create_res = client.post("/api/players/me/characters", json={"character_name": "First", "class_id": cls.id})
    char_id = create_res.json()["character"]["id"]

    client.delete(f"/api/players/me/characters/{char_id}")

    # Should now be able to create a new one
    new_res = client.post("/api/players/me/characters", json={"character_name": "Second", "class_id": cls.id})
    assert new_res.status_code == 200
    assert new_res.json()["character"]["character_name"] == "Second"
