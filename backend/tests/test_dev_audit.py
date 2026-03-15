"""Tests for Dev Content Audit dashboard — service layer + admin endpoints (5.6.3)."""

import pytest
from datetime import datetime, timezone
from sqlmodel import select

from models.story_mode import DevContentAudit
from services.dev_audit_service import log_content_audit, VALID_STATUSES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_audit_records(session):
    """Seed 4 audit records covering different types/statuses."""
    records = [
        DevContentAudit(
            audit_type="missing_stat", entity_type="enemy", entity_id=1,
            entity_name="Goblin", missing_field="entity_gameplay_data",
            status="open", logged_at=datetime.now(timezone.utc),
        ),
        DevContentAudit(
            audit_type="missing_stat", entity_type="enemy", entity_id=2,
            entity_name="Orc", missing_field="entity_gameplay_data",
            status="acknowledged", logged_at=datetime.now(timezone.utc),
        ),
        DevContentAudit(
            audit_type="missing_entity", entity_type="scene", entity_id=None,
            entity_name="scene_5", missing_field="enemies", scene_id=None,
            status="open", logged_at=datetime.now(timezone.utc),
        ),
        DevContentAudit(
            audit_type="missing_atmosphere", entity_type="chapter", entity_id=3,
            entity_name="Chapter 3", missing_field="base_atmosphere",
            status="resolved", logged_at=datetime.now(timezone.utc),
        ),
    ]
    for r in records:
        session.add(r)
    session.commit()
    return records


# ===================================================================
# 1. Service-layer tests (direct function calls)
# ===================================================================

class TestLogContentAudit:
    def test_creates_record(self, session):
        record = log_content_audit(
            session, "missing_stat", "enemy", 1, "Goblin",
            "entity_gameplay_data", scene_id=1, zone_level=1,
        )
        session.commit()
        assert record is not None
        assert record.status == "open"
        assert record.audit_type == "missing_stat"
        assert record.entity_id == 1

    def test_dedup_skips_existing(self, session):
        log_content_audit(
            session, "missing_stat", "enemy", 1, "Goblin",
            "entity_gameplay_data",
        )
        session.commit()
        result = log_content_audit(
            session, "missing_stat", "enemy", 1, "Goblin",
            "entity_gameplay_data",
        )
        session.commit()
        assert result is None  # Deduplicated

    def test_dedup_allows_after_resolved(self, session):
        record = log_content_audit(
            session, "missing_stat", "enemy", 1, "Goblin",
            "entity_gameplay_data",
        )
        session.commit()
        record.status = "resolved"
        session.add(record)
        session.commit()

        new_record = log_content_audit(
            session, "missing_stat", "enemy", 1, "Goblin",
            "entity_gameplay_data",
        )
        session.commit()
        assert new_record is not None
        assert new_record.id != record.id


# ===================================================================
# 2. Endpoint tests (admin_client)
# ===================================================================

class TestListEndpoint:
    def test_list_audit_records(self, admin_client, session):
        _seed_audit_records(session)
        response = admin_client.get("/api/admin/dev-audit")
        assert response.status_code == 200
        data = response.json()
        # Default excludes resolved/wont_fix => open + acknowledged + open = 3
        assert data["total"] == 3
        assert len(data["items"]) == 3

    def test_filter_by_type(self, admin_client, session):
        _seed_audit_records(session)
        response = admin_client.get("/api/admin/dev-audit?audit_type=missing_stat")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2

    def test_filter_by_status(self, admin_client, session):
        _seed_audit_records(session)
        response = admin_client.get("/api/admin/dev-audit?status=resolved")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "resolved"


class TestSummaryEndpoint:
    def test_summary(self, admin_client, session):
        _seed_audit_records(session)
        response = admin_client.get("/api/admin/dev-audit/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["by_status"]["open"] == 2
        assert data["by_status"]["acknowledged"] == 1
        assert data["by_status"]["resolved"] == 1
        assert "missing_stat" in data["by_type"]


class TestFilterOptionsEndpoint:
    def test_filter_options(self, admin_client, session):
        _seed_audit_records(session)
        response = admin_client.get("/api/admin/dev-audit/filter-options")
        assert response.status_code == 200
        data = response.json()
        assert len(data["audit_types"]) > 0
        assert len(data["entity_types"]) > 0
        assert "open" in data["statuses"]


class TestStatusUpdateEndpoint:
    def test_update_status(self, admin_client, session):
        _seed_audit_records(session)
        records = session.exec(select(DevContentAudit)).all()
        record_id = records[0].id
        response = admin_client.patch(
            f"/api/admin/dev-audit/{record_id}",
            json={"status": "acknowledged"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "acknowledged"

    def test_update_status_invalid(self, admin_client, session):
        _seed_audit_records(session)
        records = session.exec(select(DevContentAudit)).all()
        record_id = records[0].id
        response = admin_client.patch(
            f"/api/admin/dev-audit/{record_id}",
            json={"status": "invalid"},
        )
        # Service raises ValueError => route returns 400
        assert response.status_code == 400

    def test_update_status_not_found(self, admin_client, session):
        response = admin_client.patch(
            "/api/admin/dev-audit/99999",
            json={"status": "resolved"},
        )
        assert response.status_code == 404


class TestBulkStatusEndpoint:
    def test_bulk_update_status(self, admin_client, session):
        _seed_audit_records(session)
        records = session.exec(select(DevContentAudit)).all()
        ids = [r.id for r in records[:2]]
        response = admin_client.post(
            "/api/admin/dev-audit/bulk-status",
            json={"record_ids": ids, "status": "resolved"},
        )
        assert response.status_code == 200
        assert response.json()["updated"] == 2

    def test_bulk_update_invalid_status(self, admin_client, session):
        response = admin_client.post(
            "/api/admin/dev-audit/bulk-status",
            json={"record_ids": [1], "status": "bad"},
        )
        # Service raises ValueError => route returns 400
        assert response.status_code == 400
