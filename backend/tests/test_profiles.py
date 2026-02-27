import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from datetime import datetime, timezone

from main import app, get_session, get_current_player
from models import Player, PlayerSettings

# --- Test DB Setup ---

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

def override_get_session():
    with Session(engine) as session:
        yield session

# Create all tables in sqlite
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

# --- Auth Mocking ---

DUMMY_TOKEN = {
    "uid": "test_uid",
    "email": "test@example.com",
    "name": "Test User",
    "picture": "http://example.com/test.jpg"
}

def override_get_current_player_new_user():
    # Return dummy token with no player object (simulates first login)
    return DUMMY_TOKEN

# --- Tests ---

def test_login_new_user(client: TestClient, session: Session):
    """Test POST /api/auth/login for a brand new user."""
    app.dependency_overrides[get_current_player] = override_get_current_player_new_user
    
    response = client.post("/api/auth/login")
    assert response.status_code == 200
    
    data = response.json()
    assert data["is_new_player"] is True
    assert data["player"]["email"] == "test@example.com"
    assert data["player"]["firebase_uid"] == "test_uid"
    
    # Check if player settings were created
    player_id = data["player"]["id"]
    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player_id)).first()
    assert settings is not None
    assert settings.audio_enabled is True

def test_get_me_existing_user(client: TestClient, session: Session):
    """Test GET /api/players/me for an existing user."""
    # Pre-create a player
    player = Player(
        firebase_uid="existing_uid",
        email="existing@example.com",
        created_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    
    # Pre-create settings
    settings = PlayerSettings(player_id=player.id)
    session.add(settings)
    session.commit()
    
    # Auth mock for existing player
    def override_get_current_player_existing():
        token = DUMMY_TOKEN.copy()
        token["uid"] = "existing_uid"
        token["player"] = player
        return token
    
    app.dependency_overrides[get_current_player] = override_get_current_player_existing
    
    response = client.get("/api/players/me")
    assert response.status_code == 200
    assert response.json()["email"] == "existing@example.com"
    assert response.json()["settings"]["audio_enabled"] is True

def test_update_profile_alias(client: TestClient, session: Session):
    """Test PATCH /api/players/me for alias updates."""
    # Pre-create a player
    player = Player(
        firebase_uid="update_uid",
        email="update@example.com",
        created_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    
    # Auth mock
    def override_get_current_player_update():
        token = DUMMY_TOKEN.copy()
        token["uid"] = "update_uid"
        token["player"] = player
        return token
    
    app.dependency_overrides[get_current_player] = override_get_current_player_update
    
    # 1. Successful update
    response = client.patch("/api/players/me", json={"alias": "NewAlias"})
    assert response.status_code == 200
    assert response.json()["alias"] == "NewAlias"
    
    # 2. Profane alias
    response = client.patch("/api/players/me", json={"alias": "admin"})
    assert response.status_code == 422
    assert "not allowed" in response.json()["detail"]
    
    # 3. Short alias
    response = client.patch("/api/players/me", json={"alias": "hi"})
    assert response.status_code == 422
    assert "between 3 and 20" in response.json()["detail"]

def test_accept_terms(client: TestClient, session: Session):
    """Test POST /api/players/me/accept-terms."""
    player = Player(
        firebase_uid="terms_uid",
        email="terms@example.com",
        created_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    
    def override_get_current_player_terms():
        token = DUMMY_TOKEN.copy()
        token["uid"] = "terms_uid"
        token["player"] = player
        return token
    
    app.dependency_overrides[get_current_player] = override_get_current_player_terms
    
    assert player.terms_accepted_at is None
    
    response = client.post("/api/players/me/accept-terms")
    assert response.status_code == 200
    assert response.json()["terms_accepted_at"] is not None
    
    # Check DB
    session.refresh(player)
    assert player.terms_accepted_at is not None

def test_update_settings(client: TestClient, session: Session):
    """Test PATCH /api/players/me/settings."""
    player = Player(
        firebase_uid="settings_uid",
        email="settings@example.com",
        created_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    
    settings = PlayerSettings(player_id=player.id)
    session.add(settings)
    session.commit()
    
    def override_get_current_player_settings():
        token = DUMMY_TOKEN.copy()
        token["uid"] = "settings_uid"
        token["player"] = player
        return token
    
    app.dependency_overrides[get_current_player] = override_get_current_player_settings
    
    response = client.patch("/api/players/me/settings", json={
        "audio_enabled": False,
        "music_volume": 50,
        "narration_speed": 1.5
    })
    assert response.status_code == 200
    data = response.json()
    assert data["audio_enabled"] is False
    assert data["music_volume"] == 50
    assert data["narration_speed"] == 1.5
    
    # Invalid volume
    response = client.patch("/api/players/me/settings", json={"music_volume": 150})
    assert response.status_code == 422

def test_upload_avatar(client: TestClient, session: Session):
    """Test POST /api/players/me/avatar."""
    player = Player(
        firebase_uid="avatar_uid",
        email="avatar@example.com",
        created_at=datetime.now(timezone.utc)
    )
    session.add(player)
    session.commit()
    session.refresh(player)
    
    def override_get_current_player_avatar():
        token = DUMMY_TOKEN.copy()
        token["uid"] = "avatar_uid"
        token["player"] = player
        return token
    
    app.dependency_overrides[get_current_player] = override_get_current_player_avatar
    
    # Create a dummy image
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    response = client.post(
        "/api/players/me/avatar",
        files={"file": ("test.png", img_byte_arr, "image/png")}
    )
    
    assert response.status_code == 200
    assert "avatar_url" in response.json()
    assert "/uploads/avatars/" in response.json()["avatar_url"]
    
    # Check DB
    session.refresh(player)
    assert player.custom_avatar_url is not None
    assert "/uploads/avatars/" in player.custom_avatar_url
