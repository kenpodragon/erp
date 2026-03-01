"""
Tests for admin analytics and audit log endpoints.
FR-9.12 through FR-9.17
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session

from models import (
    Player, ActivityEvent, AdminAuditLog, SupportTicket,
    PlayerCharacter, PlayerProgress, CharacterClass,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _player(session: Session, uid: str = "uid1", email: str = "p@test.com", **kwargs) -> Player:
    now = datetime.now(timezone.utc)
    p = Player(
        firebase_uid=uid, email=email,
        created_at=kwargs.get("created_at", now),
        last_login_at=kwargs.get("last_login_at", now),
        updated_at=now,
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


def _event(session: Session, player_id: int, event_type: str, days_ago: int = 0) -> ActivityEvent:
    ts = datetime.now(timezone.utc) - timedelta(days=days_ago)
    ev = ActivityEvent(
        player_id=player_id,
        event_type=event_type,
        event_data=None,
        created_at=ts,
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


def _audit(session: Session, admin: str, action: str, target_type: str = "player", target_id: str = "1") -> AdminAuditLog:
    entry = AdminAuditLog(
        admin_email=admin,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details={"note": "test"},
        created_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Overview endpoint
# ---------------------------------------------------------------------------

class TestAnalyticsOverview:
    def test_empty_state(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        assert data["players"]["total"] == 0
        assert data["tickets"]["open"] == 0
        assert data["registrations"]["today"] == 0

    def test_counts_players(self, admin_client: TestClient, session: Session):
        _player(session, "u1", "a@t.com")
        _player(session, "u2", "b@t.com")
        res = admin_client.get("/api/admin/analytics/overview")
        assert res.json()["players"]["total"] == 2

    def test_active_counts(self, admin_client: TestClient, session: Session):
        now = datetime.now(timezone.utc)
        # Active 1 hour ago
        _player(session, "u1", "a@t.com", last_login_at=now - timedelta(hours=1))
        # Active 3 days ago
        _player(session, "u2", "b@t.com", last_login_at=now - timedelta(days=3))
        # Active 40 days ago (inactive)
        _player(session, "u3", "c@t.com", last_login_at=now - timedelta(days=40))

        data = admin_client.get("/api/admin/analytics/overview").json()
        assert data["players"]["active_24h"] == 1
        assert data["players"]["active_7d"] == 2
        assert data["players"]["active_30d"] == 2

    def test_open_ticket_count(self, admin_client: TestClient, session: Session):
        p = _player(session)
        now = datetime.now(timezone.utc)
        for status in ("open", "open", "in_progress", "closed"):
            session.add(SupportTicket(
                player_id=p.id, subject="Test", status=status,
                created_at=now, updated_at=now,
            ))
        session.commit()
        data = admin_client.get("/api/admin/analytics/overview").json()
        assert data["tickets"]["open"] == 2

    def test_registration_today(self, admin_client: TestClient, session: Session):
        _player(session)  # created now
        data = admin_client.get("/api/admin/analytics/overview").json()
        assert data["registrations"]["today"] == 1


# ---------------------------------------------------------------------------
# DAU endpoint
# ---------------------------------------------------------------------------

class TestAnalyticsDau:
    def test_empty(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/dau?range=30d")
        assert res.status_code == 200
        data = res.json()
        assert data["range"] == "30d"
        assert data["data"] == []

    def test_counts_unique_players_per_day(self, admin_client: TestClient, session: Session):
        p1 = _player(session, "u1", "a@t.com")
        p2 = _player(session, "u2", "b@t.com")
        # Two logins today from two different players
        _event(session, p1.id, "player_login", days_ago=0)
        _event(session, p2.id, "player_login", days_ago=0)
        # Same player logging in twice on same day should count as 1
        _event(session, p1.id, "player_login", days_ago=0)
        # One login yesterday
        _event(session, p1.id, "player_login", days_ago=1)

        res = admin_client.get("/api/admin/analytics/dau?range=7d")
        data = res.json()["data"]
        # We should have 2 days
        assert len(data) == 2
        counts = {d["count"] for d in data}
        assert 2 in counts  # today
        assert 1 in counts  # yesterday

    def test_ignores_non_login_events(self, admin_client: TestClient, session: Session):
        p = _player(session)
        _event(session, p.id, "profile_updated", days_ago=0)
        data = admin_client.get("/api/admin/analytics/dau?range=7d").json()["data"]
        assert data == []

    def test_default_range_is_30d(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/dau")
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# Registrations endpoint
# ---------------------------------------------------------------------------

class TestAnalyticsRegistrations:
    def test_empty(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/registrations?range=30d")
        assert res.status_code == 200
        assert res.json()["data"] == []

    def test_counts_new_players(self, admin_client: TestClient, session: Session):
        _player(session, "u1", "a@t.com")
        _player(session, "u2", "b@t.com")
        data = admin_client.get("/api/admin/analytics/registrations?range=30d").json()["data"]
        total = sum(d["count"] for d in data)
        assert total == 2


# ---------------------------------------------------------------------------
# Chapter distribution endpoint
# ---------------------------------------------------------------------------

class TestChapterDistribution:
    def test_empty(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/chapter-distribution")
        assert res.status_code == 200
        assert res.json()["data"] == []

    def test_groups_by_chapter(self, admin_client: TestClient, session: Session):
        now = datetime.now(timezone.utc)
        cc = CharacterClass(name="T", base_strength=10, base_agility=10, base_intelligence=10, is_available=True)
        session.add(cc)
        session.commit()
        session.refresh(cc)

        for i in range(3):
            p = _player(session, f"u{i}", f"u{i}@t.com")
            ch = PlayerCharacter(
                player_id=p.id, class_id=cc.id,
                character_name=f"Char{i}", level=1,
                created_at=now, updated_at=now,
            )
            session.add(ch)
            session.commit()
            session.refresh(ch)
            chapter = 1 if i < 2 else 2
            prog = PlayerProgress(
                player_id=p.id, character_id=ch.id,
                book_number=1, chapter_number=chapter,
                scene_number=1, beat_number=1,
                created_at=now, updated_at=now,
            )
            session.add(prog)
        session.commit()

        data = admin_client.get("/api/admin/analytics/chapter-distribution").json()["data"]
        assert len(data) == 2
        ch1 = next(d for d in data if d["chapter"] == 1)
        ch2 = next(d for d in data if d["chapter"] == 2)
        assert ch1["count"] == 2
        assert ch2["count"] == 1


# ---------------------------------------------------------------------------
# Activity events endpoint
# ---------------------------------------------------------------------------

class TestAnalyticsEvents:
    def test_empty(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/analytics/events")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0
        assert data["events"] == []

    def test_returns_events(self, admin_client: TestClient, session: Session):
        p = _player(session)
        _event(session, p.id, "player_login")
        _event(session, p.id, "character_created")
        data = admin_client.get("/api/admin/analytics/events").json()
        assert data["total"] == 2
        assert len(data["events"]) == 2

    def test_filter_by_event_type(self, admin_client: TestClient, session: Session):
        p = _player(session)
        _event(session, p.id, "player_login")
        _event(session, p.id, "profile_updated")
        data = admin_client.get("/api/admin/analytics/events?event_type=player_login").json()
        assert data["total"] == 1
        assert data["events"][0]["event_type"] == "player_login"

    def test_includes_player_alias(self, admin_client: TestClient, session: Session):
        p = _player(session)
        p.alias = "ElysiumChad"
        session.add(p)
        session.commit()
        _event(session, p.id, "player_login")
        data = admin_client.get("/api/admin/analytics/events").json()
        assert data["events"][0]["player_alias"] == "ElysiumChad"

    def test_pagination(self, admin_client: TestClient, session: Session):
        p = _player(session)
        for _ in range(10):
            _event(session, p.id, "player_login")
        data = admin_client.get("/api/admin/analytics/events?limit=3&offset=0").json()
        assert data["total"] == 10
        assert len(data["events"]) == 3


# ---------------------------------------------------------------------------
# Audit log endpoint
# ---------------------------------------------------------------------------

class TestAuditLog:
    def test_empty(self, admin_client: TestClient):
        res = admin_client.get("/api/admin/audit-log")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0
        assert data["entries"] == []

    def test_returns_entries(self, admin_client: TestClient, session: Session):
        _audit(session, "admin@example.com", "player_banned")
        _audit(session, "admin@example.com", "config_changed", target_type="config", target_id="game.xp")
        data = admin_client.get("/api/admin/audit-log").json()
        assert data["total"] == 2

    def test_filter_by_admin(self, admin_client: TestClient, session: Session):
        _audit(session, "alice@example.com", "player_banned")
        _audit(session, "bob@example.com", "config_changed", target_type="config", target_id="x")
        data = admin_client.get("/api/admin/audit-log?admin=alice").json()
        assert data["total"] == 1
        assert data["entries"][0]["admin_email"] == "alice@example.com"

    def test_filter_by_action(self, admin_client: TestClient, session: Session):
        _audit(session, "admin@example.com", "player_banned")
        _audit(session, "admin@example.com", "config_changed", target_type="config", target_id="x")
        data = admin_client.get("/api/admin/audit-log?action=player_banned").json()
        assert data["total"] == 1

    def test_filter_by_target_type(self, admin_client: TestClient, session: Session):
        _audit(session, "admin@example.com", "player_banned", target_type="player")
        _audit(session, "admin@example.com", "config_changed", target_type="config", target_id="x")
        data = admin_client.get("/api/admin/audit-log?target_type=config").json()
        assert data["total"] == 1

    def test_pagination(self, admin_client: TestClient, session: Session):
        for i in range(10):
            _audit(session, "admin@example.com", "player_banned", target_id=str(i))
        data = admin_client.get("/api/admin/audit-log?limit=3&offset=0").json()
        assert data["total"] == 10
        assert len(data["entries"]) == 3

    def test_ordered_newest_first(self, admin_client: TestClient, session: Session):
        e1 = _audit(session, "admin@example.com", "player_banned", target_id="1")
        e2 = _audit(session, "admin@example.com", "player_unbanned", target_id="2")
        data = admin_client.get("/api/admin/audit-log").json()
        # Newest (e2) should be first
        assert data["entries"][0]["id"] == e2.id

    def test_requires_admin_auth(self, client: TestClient):
        """Unauthenticated client must get 401/403."""
        res = client.get("/api/admin/audit-log")
        assert res.status_code in (401, 403)
