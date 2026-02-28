import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from datetime import datetime, timezone

from main import app, get_session, get_current_player, get_current_admin
from models import ServerConfig, AdminAuditLog
import config_cache

# --- Test DB Setup ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_config.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})


def seed_config(session: Session):
    """Insert default config rows for testing."""
    rows = [
        ServerConfig(key="game.essence_per_click", value="1.0", value_type="numeric", category="game",
                     description="Base essence earned per click.", default_value="1.0"),
        ServerConfig(key="game.crit_chance", value="0.05", value_type="numeric", category="game",
                     description="Probability of a critical click.", default_value="0.05"),
        ServerConfig(key="game.max_characters_per_player", value="1", value_type="integer", category="game",
                     description="Character creation limit.", default_value="1"),
        ServerConfig(key="ops.maintenance_mode", value="false", value_type="boolean", category="ops",
                     description="Block all player API access.", default_value="false"),
        ServerConfig(key="ops.maintenance_message", value="Maintenance in progress.", value_type="text", category="ops",
                     description="Message shown during maintenance.", default_value="Maintenance in progress."),
        ServerConfig(key="ops.registration_open", value="true", value_type="boolean", category="ops",
                     description="Allow new player registration.", default_value="true"),
        ServerConfig(key="ops.announcement_banner", value="", value_type="text", category="ops",
                     description="Banner text.", default_value=""),
        ServerConfig(key="ops.announcement_banner_type", value="info", value_type="string", category="ops",
                     description="Banner color type.", default_value="info"),
    ]
    for row in rows:
        session.add(row)
    session.commit()
    # Load into cache
    config_cache.load_config(session)


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_config(session)
        yield session
    SQLModel.metadata.drop_all(engine)
    # Reset cache to prevent leaking maintenance_mode=true to other test files
    config_cache._cache.clear()
    config_cache._last_refresh = 0.0


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


# --- Auth Mocking ---

DUMMY_ADMIN_TOKEN = {"email": "admin@example.com", "uid": "admin_uid"}
DUMMY_PLAYER_TOKEN = {
    "uid": "player_uid",
    "email": "player@example.com",
    "name": "Test Player",
    "picture": "http://example.com/pic.jpg",
}


def override_admin():
    return DUMMY_ADMIN_TOKEN


def override_player():
    return DUMMY_PLAYER_TOKEN


# --- Tests: Public Config ---

def test_get_public_config(client: TestClient):
    """GET /api/config/public returns only public keys, no auth needed."""
    response = client.get("/api/config/public")
    assert response.status_code == 200
    data = response.json()

    # Should contain these keys
    assert "ops.maintenance_mode" in data
    assert "ops.maintenance_message" in data
    assert "ops.announcement_banner" in data
    assert "ops.announcement_banner_type" in data
    assert "ops.registration_open" in data

    # Should NOT contain game keys
    assert "game.essence_per_click" not in data
    assert "game.crit_chance" not in data

    # Booleans should be actual booleans
    assert data["ops.maintenance_mode"] is False
    assert data["ops.registration_open"] is True


def test_public_config_no_game_keys(client: TestClient):
    """Public config must never expose game tuning values."""
    response = client.get("/api/config/public")
    data = response.json()
    for key in data:
        assert not key.startswith("game."), f"Game key '{key}' should not be in public config"


# --- Tests: Admin Config ---

def test_get_admin_config(client: TestClient):
    """GET /api/admin/config returns all config grouped by category."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.get("/api/admin/config")
    assert response.status_code == 200
    data = response.json()

    assert "game" in data
    assert "ops" in data
    assert len(data["game"]) >= 3
    assert len(data["ops"]) >= 5

    # Each entry should have expected fields
    entry = data["game"][0]
    assert "key" in entry
    assert "value" in entry
    assert "value_type" in entry
    assert "description" in entry
    assert "default_value" in entry


def test_get_admin_config_unauthorized(client: TestClient):
    """GET /api/admin/config without auth returns 401."""
    response = client.get("/api/admin/config")
    assert response.status_code == 401


# --- Tests: Patch Config ---

def test_patch_config_numeric(client: TestClient, session: Session):
    """PATCH /api/admin/config/{key} updates a numeric value."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/game.essence_per_click", json={"value": "2.5"})
    assert response.status_code == 200
    data = response.json()
    assert data["value"] == "2.5"
    assert data["updated_by"] == "admin@example.com"

    # Verify DB
    row = session.get(ServerConfig, "game.essence_per_click")
    assert row.value == "2.5"


def test_patch_config_boolean(client: TestClient, session: Session):
    """PATCH boolean config value."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/ops.maintenance_mode", json={"value": "true"})
    assert response.status_code == 200
    assert response.json()["value"] == "true"


def test_patch_config_integer(client: TestClient, session: Session):
    """PATCH integer config value."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/game.max_characters_per_player", json={"value": "3"})
    assert response.status_code == 200
    assert response.json()["value"] == "3"


def test_patch_config_invalid_integer(client: TestClient):
    """PATCH with non-integer value for integer field returns 422."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/game.max_characters_per_player", json={"value": "abc"})
    assert response.status_code == 422


def test_patch_config_invalid_boolean(client: TestClient):
    """PATCH with non-boolean value for boolean field returns 422."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/ops.maintenance_mode", json={"value": "maybe"})
    assert response.status_code == 422


def test_patch_config_invalid_numeric(client: TestClient):
    """PATCH with non-numeric value for numeric field returns 422."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/game.essence_per_click", json={"value": "not_a_number"})
    assert response.status_code == 422


def test_patch_config_unknown_key(client: TestClient):
    """PATCH with unknown key returns 404."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/nonexistent.key", json={"value": "1"})
    assert response.status_code == 404


def test_patch_config_missing_value(client: TestClient):
    """PATCH without value field returns 422."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.patch("/api/admin/config/game.essence_per_click", json={})
    assert response.status_code == 422


# --- Tests: Reset Config ---

def test_reset_config(client: TestClient, session: Session):
    """POST /api/admin/config/{key}/reset resets to default."""
    app.dependency_overrides[get_current_admin] = override_admin

    # First change the value
    client.patch("/api/admin/config/game.essence_per_click", json={"value": "99.0"})

    # Now reset
    response = client.post("/api/admin/config/game.essence_per_click/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["value"] == "1.0"

    # Verify DB
    row = session.get(ServerConfig, "game.essence_per_click")
    assert row.value == "1.0"


def test_reset_config_unknown_key(client: TestClient):
    """Reset unknown key returns 404."""
    app.dependency_overrides[get_current_admin] = override_admin

    response = client.post("/api/admin/config/nonexistent.key/reset")
    assert response.status_code == 404


# --- Tests: Audit Log ---

def test_audit_log_on_config_change(client: TestClient, session: Session):
    """Changing a config value creates an audit log entry."""
    app.dependency_overrides[get_current_admin] = override_admin

    client.patch("/api/admin/config/game.essence_per_click", json={"value": "5.0"})

    logs = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "config_changed")).all()
    assert len(logs) >= 1
    log = logs[-1]
    assert log.admin_email == "admin@example.com"
    assert log.target_type == "config"
    assert log.target_id == "game.essence_per_click"
    assert log.details["new_value"] == "5.0"


def test_audit_log_on_config_reset(client: TestClient, session: Session):
    """Resetting a config value creates an audit log entry."""
    app.dependency_overrides[get_current_admin] = override_admin

    client.patch("/api/admin/config/game.crit_chance", json={"value": "0.99"})
    client.post("/api/admin/config/game.crit_chance/reset")

    logs = session.exec(select(AdminAuditLog).where(AdminAuditLog.action == "config_reset")).all()
    assert len(logs) >= 1
    log = logs[-1]
    assert log.target_id == "game.crit_chance"
    assert log.details["reset_to"] == "0.05"


# --- Tests: Maintenance Middleware ---

def test_maintenance_blocks_player_endpoints(client: TestClient, session: Session):
    """When maintenance_mode=true, player API endpoints return 503."""
    app.dependency_overrides[get_current_admin] = override_admin
    app.dependency_overrides[get_current_player] = override_player

    # Enable maintenance mode
    client.patch("/api/admin/config/ops.maintenance_mode", json={"value": "true"})
    # Force cache reload
    config_cache.load_config(session)

    # Player endpoints should return 503
    response = client.get("/api/players/me")
    assert response.status_code == 503
    assert "error" in response.json()


def test_maintenance_allows_public_config(client: TestClient, session: Session):
    """Public config endpoint still works during maintenance."""
    app.dependency_overrides[get_current_admin] = override_admin

    # Enable maintenance mode
    client.patch("/api/admin/config/ops.maintenance_mode", json={"value": "true"})
    config_cache.load_config(session)

    response = client.get("/api/config/public")
    assert response.status_code == 200
    data = response.json()
    assert data["ops.maintenance_mode"] is True


def test_maintenance_allows_admin_endpoints(client: TestClient, session: Session):
    """Admin endpoints still work during maintenance."""
    app.dependency_overrides[get_current_admin] = override_admin

    # Enable maintenance mode
    client.patch("/api/admin/config/ops.maintenance_mode", json={"value": "true"})
    config_cache.load_config(session)

    # Admin ping should still work
    response = client.get("/api/admin/ping")
    assert response.status_code == 200
