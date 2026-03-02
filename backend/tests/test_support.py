"""
Tests for the Support Ticket System (TODO 7.9):
  Player API:
    POST  /api/support/tickets
    GET   /api/support/tickets
    GET   /api/support/tickets/{id}
    POST  /api/support/tickets/{id}/replies
    PATCH /api/support/tickets/{id}/reopen
    PATCH /api/support/tickets/{id}/close
  Admin API:
    GET   /api/admin/support/tickets
    GET   /api/admin/support/tickets/{id}
    PATCH /api/admin/support/tickets/{id}
    POST  /api/admin/support/tickets/{id}/replies
    POST  /api/admin/support/tickets/{id}/notes
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

from main import app
from db import get_session
from auth import get_current_player, get_current_admin
from models import Player, SupportTicket, SupportReply, ServerConfig
import config_cache

# ---------------------------------------------------------------------------
# Test DB setup
# ---------------------------------------------------------------------------

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)


def seed_config(session: Session):
    """Seed minimal config to prevent maintenance mode errors."""
    rows = [
        ServerConfig(key="ops.maintenance_mode", value="false", value_type="boolean",
                     category="ops", description="", default_value="false"),
        ServerConfig(key="ops.maintenance_message", value="", value_type="text",
                     category="ops", description="", default_value=""),
    ]
    for row in rows:
        session.add(row)
    session.commit()
    config_cache.load_config(session)


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_config(session)
        yield session
    SQLModel.metadata.drop_all(engine)
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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_player(session: Session, uid: str = "support_test_uid", email: str = "player@example.com") -> Player:
    now = datetime.now(timezone.utc)
    player = Player(firebase_uid=uid, email=email, alias="TestPlayer", created_at=now)
    session.add(player)
    session.commit()
    session.refresh(player)
    return player


def _override_player(player: Player):
    def override():
        return {
            "uid": player.firebase_uid,
            "email": player.email,
            "name": "Test Player",
            "picture": None,
            "player_id": player.id,
            "player": player,
        }
    return override


DUMMY_ADMIN_TOKEN = {"email": "admin@example.com", "uid": "admin_uid"}


def override_admin():
    return DUMMY_ADMIN_TOKEN


# ---------------------------------------------------------------------------
# Player: Create Ticket
# ---------------------------------------------------------------------------

def test_create_ticket_success(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    response = client.post("/api/support/tickets", json={
        "category": "bug_report",
        "subject": "Game crashes on login",
        "description": "Every time I try to login, the game crashes immediately after loading.",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ticket"]["category"] == "bug_report"
    assert data["ticket"]["subject"] == "Game crashes on login"
    assert data["ticket"]["status"] == "open"
    assert data["ticket"]["priority"] == "normal"
    assert data["reply"]["content"] == "Every time I try to login, the game crashes immediately after loading."
    assert data["reply"]["author_type"] == "player"


def test_create_ticket_invalid_category(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    response = client.post("/api/support/tickets", json={
        "category": "not_a_category",
        "subject": "Test Subject Here",
        "description": "A" * 25,
    })
    assert response.status_code == 422


def test_create_ticket_short_subject(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    response = client.post("/api/support/tickets", json={
        "category": "bug_report",
        "subject": "Hi",
        "description": "A" * 25,
    })
    assert response.status_code == 422


def test_create_ticket_short_description(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    response = client.post("/api/support/tickets", json={
        "category": "bug_report",
        "subject": "Valid Subject",
        "description": "Too short",
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Player: List Tickets
# ---------------------------------------------------------------------------

def test_list_tickets_empty(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    response = client.get("/api/support/tickets")
    assert response.status_code == 200
    data = response.json()
    assert data["tickets"] == []
    assert data["total"] == 0


def test_list_tickets_with_filter(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    # Create two tickets
    client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Bug ticket here",
        "description": "This is a bug report description.",
    })
    client.post("/api/support/tickets", json={
        "category": "feedback", "subject": "Feedback ticket here",
        "description": "This is feedback description text.",
    })

    # List all
    response = client.get("/api/support/tickets")
    assert response.json()["total"] == 2

    # Filter by status=open
    response = client.get("/api/support/tickets?status=open")
    assert response.json()["total"] == 2

    # Filter by status=closed
    response = client.get("/api/support/tickets?status=closed")
    assert len(response.json()["tickets"]) == 0


# ---------------------------------------------------------------------------
# Player: Ticket Detail
# ---------------------------------------------------------------------------

def test_ticket_detail_success(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "account_issue", "subject": "Cannot change alias",
        "description": "I tried changing my alias but it doesn't save correctly.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.get(f"/api/support/tickets/{ticket_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["ticket"]["id"] == ticket_id
    assert len(data["replies"]) == 1
    assert data["replies"][0]["author_type"] == "player"


def test_ticket_detail_ownership(client: TestClient, session: Session):
    """Players cannot see other players' tickets."""
    player1 = _make_player(session, uid="p1_uid", email="p1@example.com")
    player2 = _make_player(session, uid="p2_uid", email="p2@example.com")

    # Create ticket as player1
    app.dependency_overrides[get_current_player] = _override_player(player1)
    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Player 1 bug issue",
        "description": "This is player 1's bug report.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Try to view as player2
    app.dependency_overrides[get_current_player] = _override_player(player2)
    response = client.get(f"/api/support/tickets/{ticket_id}")
    assert response.status_code == 404


def test_ticket_detail_hides_internal_notes(client: TestClient, session: Session):
    """Internal notes from admins should not be visible to the player."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Bug with notes",
        "description": "This is a bug report with admin notes.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Add an internal note directly
    now = datetime.now(timezone.utc)
    note = SupportReply(
        ticket_id=ticket_id,
        author_type="admin",
        author_email="admin@example.com",
        content="Internal investigation note",
        is_internal_note=True,
        created_at=now,
    )
    session.add(note)
    session.commit()

    # Player should not see the note
    response = client.get(f"/api/support/tickets/{ticket_id}")
    data = response.json()
    for reply in data["replies"]:
        assert reply["is_internal_note"] is False


# ---------------------------------------------------------------------------
# Player: Reply
# ---------------------------------------------------------------------------

def test_reply_to_ticket(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Need to reply test",
        "description": "This is the initial description.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.post(f"/api/support/tickets/{ticket_id}/replies", json={
        "content": "Here is additional information about the bug report.",
    })
    assert response.status_code == 200
    assert response.json()["author_type"] == "player"


def test_reply_to_closed_ticket_fails(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Closed ticket reply",
        "description": "This ticket will be closed shortly.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Close the ticket directly
    ticket = session.get(SupportTicket, ticket_id)
    ticket.status = "closed"
    ticket.closed_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()

    response = client.post(f"/api/support/tickets/{ticket_id}/replies", json={
        "content": "Trying to reply to a closed ticket.",
    })
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Player: Reopen
# ---------------------------------------------------------------------------

def test_reopen_resolved_ticket(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Reopen test ticket",
        "description": "This ticket will be resolved then reopened.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Resolve the ticket
    ticket = session.get(SupportTicket, ticket_id)
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(timezone.utc)
    session.add(ticket)
    session.commit()

    response = client.patch(f"/api/support/tickets/{ticket_id}/reopen", json={
        "reason": "The issue is still happening after the fix.",
    })
    assert response.status_code == 200
    assert response.json()["ticket"]["status"] == "in_progress"
    assert response.json()["reply"]["content"].startswith("[Reopened]")


def test_reopen_open_ticket_fails(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Already open ticket",
        "description": "This ticket is still open, cannot reopen.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/support/tickets/{ticket_id}/reopen", json={
        "reason": "Trying to reopen an already open ticket.",
    })
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Auto-close
# ---------------------------------------------------------------------------

def test_auto_close_resolved_ticket(client: TestClient, session: Session):
    """Tickets resolved for 7+ days should auto-close when accessed."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Auto close test ticket",
        "description": "This ticket should be auto-closed.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Set resolved 8 days ago
    ticket = session.get(SupportTicket, ticket_id)
    ticket.status = "resolved"
    ticket.resolved_at = datetime.now(timezone.utc) - timedelta(days=8)
    session.add(ticket)
    session.commit()

    # Access the ticket — should auto-close
    response = client.get(f"/api/support/tickets/{ticket_id}")
    assert response.status_code == 200
    assert response.json()["ticket"]["status"] == "closed"


# ---------------------------------------------------------------------------
# Admin: List Tickets
# ---------------------------------------------------------------------------

def test_admin_list_tickets(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    # Create a ticket as player
    client.post("/api/support/tickets", json={
        "category": "feedback", "subject": "Admin list test",
        "description": "This ticket should appear in admin list.",
    })

    # List as admin
    response = client.get("/api/admin/support/tickets")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["tickets"][0]["player_alias"] is not None or data["tickets"][0]["player_email"] is not None


def test_admin_list_filter_by_status(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Filter test open",
        "description": "This ticket is open for filter testing.",
    })

    response = client.get("/api/admin/support/tickets?status=open")
    assert response.status_code == 200
    assert all(t["status"] == "open" for t in response.json()["tickets"])

    response = client.get("/api/admin/support/tickets?status=closed")
    assert response.status_code == 200
    assert len(response.json()["tickets"]) == 0


# ---------------------------------------------------------------------------
# Admin: Get Ticket Detail
# ---------------------------------------------------------------------------

def test_admin_get_ticket_detail(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "payment_issue", "subject": "Billing problem",
        "description": "I was charged twice for my subscription.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.get(f"/api/admin/support/tickets/{ticket_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["ticket"]["id"] == ticket_id
    assert data["ticket"]["player_email"] == "player@example.com"
    assert len(data["replies"]) >= 1


# ---------------------------------------------------------------------------
# Admin: Update Ticket
# ---------------------------------------------------------------------------

def test_admin_update_priority(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Priority update test",
        "description": "This ticket's priority will be changed.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/admin/support/tickets/{ticket_id}", json={
        "priority": "critical",
    })
    assert response.status_code == 200
    assert response.json()["priority"] == "critical"


def test_admin_update_status_to_resolved(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Resolve test ticket",
        "description": "This ticket will be resolved by admin.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/admin/support/tickets/{ticket_id}", json={
        "status": "resolved",
    })
    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert response.json()["resolved_at"] is not None


def test_admin_assign_ticket(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "account_issue", "subject": "Assign test ticket",
        "description": "This ticket will be assigned to an admin.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/admin/support/tickets/{ticket_id}", json={
        "assigned_admin": "admin@example.com",
    })
    assert response.status_code == 200
    assert response.json()["assigned_admin"] == "admin@example.com"


# ---------------------------------------------------------------------------
# Admin: Reply and Internal Notes
# ---------------------------------------------------------------------------

def test_admin_reply(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Admin reply test",
        "description": "This ticket will get an admin reply.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.post(f"/api/admin/support/tickets/{ticket_id}/replies", json={
        "content": "We are looking into your issue.",
    })
    assert response.status_code == 200
    assert response.json()["author_type"] == "admin"
    assert response.json()["is_internal_note"] is False


def test_admin_internal_note(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Internal note test",
        "description": "This ticket will get an internal note.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.post(f"/api/admin/support/tickets/{ticket_id}/notes", json={
        "content": "This player has a history of similar reports.",
    })
    assert response.status_code == 200
    assert response.json()["is_internal_note"] is True
    assert response.json()["author_type"] == "admin"


def test_admin_note_in_detail_visible(client: TestClient, session: Session):
    """Admin detail view should show internal notes."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Note visibility test",
        "description": "Testing that admin can see internal notes.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    client.post(f"/api/admin/support/tickets/{ticket_id}/notes", json={
        "content": "Admin-only internal note content.",
    })

    response = client.get(f"/api/admin/support/tickets/{ticket_id}")
    data = response.json()
    has_note = any(r["is_internal_note"] for r in data["replies"])
    assert has_note


# ---------------------------------------------------------------------------
# Player: Close Ticket
# ---------------------------------------------------------------------------

def test_player_close_ticket(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "feedback", "subject": "Close test ticket",
        "description": "This ticket will be closed by the player.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/support/tickets/{ticket_id}/close", json={
        "note": "Issue resolved on my end, thanks!",
    })
    assert response.status_code == 200
    assert response.json()["ticket"]["status"] == "closed"
    assert response.json()["ticket"]["closed_at"] is not None


def test_player_close_ticket_without_note(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Close without note",
        "description": "This ticket will be closed without a note.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    response = client.patch(f"/api/support/tickets/{ticket_id}/close", json={})
    assert response.status_code == 200
    assert response.json()["ticket"]["status"] == "closed"


def test_player_close_already_closed_fails(client: TestClient, session: Session):
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Already closed ticket",
        "description": "This ticket is already closed, cannot close again.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Close it first
    client.patch(f"/api/support/tickets/{ticket_id}/close", json={})
    # Try closing again
    response = client.patch(f"/api/support/tickets/{ticket_id}/close", json={})
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# New Activity Tracking
# ---------------------------------------------------------------------------

def test_new_activity_flag_on_list(client: TestClient, session: Session):
    """Tickets should show has_new_activity when there are unread changes."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Activity flag test",
        "description": "Testing the new activity indicator flag.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # List tickets — should show new activity (never viewed)
    response = client.get("/api/support/tickets")
    tickets = response.json()["tickets"]
    ticket = next(t for t in tickets if t["id"] == ticket_id)
    assert ticket["has_new_activity"] is True

    # View the ticket detail (sets player_last_viewed_at)
    client.get(f"/api/support/tickets/{ticket_id}")

    # List again — should no longer show new activity
    response = client.get("/api/support/tickets")
    tickets = response.json()["tickets"]
    ticket = next(t for t in tickets if t["id"] == ticket_id)
    assert ticket["has_new_activity"] is False

    # Admin replies (updates updated_at)
    client.post(f"/api/admin/support/tickets/{ticket_id}/replies", json={
        "content": "We are looking into this issue.",
    })

    # List again — should show new activity
    response = client.get("/api/support/tickets")
    tickets = response.json()["tickets"]
    ticket = next(t for t in tickets if t["id"] == ticket_id)
    assert ticket["has_new_activity"] is True


def test_admin_new_activity_flag(client: TestClient, session: Session):
    """Admin list should show has_new_activity for unviewed tickets."""
    player = _make_player(session)
    app.dependency_overrides[get_current_player] = _override_player(player)
    app.dependency_overrides[get_current_admin] = override_admin

    create_res = client.post("/api/support/tickets", json={
        "category": "bug_report", "subject": "Admin activity test",
        "description": "Testing admin new activity indicator.",
    })
    ticket_id = create_res.json()["ticket"]["id"]

    # Admin list — never viewed, should have new activity
    response = client.get("/api/admin/support/tickets")
    tickets = response.json()["tickets"]
    ticket = next(t for t in tickets if t["id"] == ticket_id)
    assert ticket["has_new_activity"] is True

    # Admin views detail (sets admin_last_viewed_at)
    client.get(f"/api/admin/support/tickets/{ticket_id}")

    # Admin list again — no new activity
    response = client.get("/api/admin/support/tickets")
    tickets = response.json()["tickets"]
    ticket = next(t for t in tickets if t["id"] == ticket_id)
    assert ticket["has_new_activity"] is False
