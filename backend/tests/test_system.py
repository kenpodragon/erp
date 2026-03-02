import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, text
from sqlalchemy.pool import StaticPool
from main import app
from db import get_session
from auth import get_current_admin

# --- Test DB Setup ---
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

# --- Public Endpoints ---

def test_read_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome to the ERP API" in response.json()["message"]

def test_health_check_healthy(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
    assert response.json()["database"] == "connected"

def test_hello_endpoint(client: TestClient):
    response = client.get("/hello")
    assert response.status_code == 200
    assert "Hello from the ERP Backend" in response.json()["message"]

def test_debug_routes(client: TestClient):
    response = client.get("/debug-routes")
    assert response.status_code == 200
    routes = response.json()
    assert any(r["path"] == "/health" for r in routes)
    assert any(r["path"] == "/api/players/me" for r in routes)

# --- Admin Endpoints ---

def test_admin_ping_unauthorized(client: TestClient):
    # No auth provided
    response = client.get("/api/admin/ping")
    assert response.status_code == 401 # Backend returns 401 for missing/invalid token

def test_admin_ping_authorized(client: TestClient):
    def override_get_current_admin():
        return {"email": "admin@example.com", "uid": "admin_uid"}
    
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    
    response = client.get("/api/admin/ping")
    assert response.status_code == 200
    assert response.json()["message"] == "Admin access confirmed"
    assert response.json()["admin_email"] == "admin@example.com"
