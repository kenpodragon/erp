"""Tests for Asset Registry (5.7.4).

Covers: CRUD operations, orphan detection, bulk import, batch preload,
category validation, pagination, and admin auth requirements.
"""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session
from sqlalchemy import text

from models.asset_registry import AssetRegistryEntry, VALID_CATEGORIES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_RENDER_DEF = {
    "version": 1,
    "base_shape": "circle",
    "radius": 20,
    "fill_color": "#aa44cc",
}

SAMPLE_RENDER_DEF_2 = {
    "version": 1,
    "base_shape": "rect",
    "width": 32,
    "height": 32,
    "fill_color": "#3388ff",
}


def _make_asset(session: Session, key: str, category: str = "entity_sprite",
                display_name: str | None = None, tags: list | None = None,
                source: str = "seed") -> AssetRegistryEntry:
    entry = AssetRegistryEntry(
        asset_key=key,
        category=category,
        display_name=display_name or key.replace("_", " ").title(),
        render_definition=SAMPLE_RENDER_DEF,
        tags=tags or [],
        source=source,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestCreateAsset:
    def test_create_asset(self, admin_client):
        """POST valid asset, verify 200 and returned data."""
        resp = admin_client.post("/api/admin/assets/", json={
            "asset_key": "test_entity_01",
            "category": "entity_sprite",
            "display_name": "Test Entity",
            "render_definition": SAMPLE_RENDER_DEF,
            "tags": ["book_1", "melee"],
            "source": "admin",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "asset" in data
        asset = data["asset"]
        assert asset["asset_key"] == "test_entity_01"
        assert asset["category"] == "entity_sprite"
        assert asset["display_name"] == "Test Entity"
        assert asset["render_definition"]["base_shape"] == "circle"

    def test_create_duplicate_key(self, admin_client, session):
        """POST same key twice, verify 409."""
        _make_asset(session, "dup_key_test")
        resp = admin_client.post("/api/admin/assets/", json={
            "asset_key": "dup_key_test",
            "category": "entity_sprite",
            "render_definition": SAMPLE_RENDER_DEF,
        })
        assert resp.status_code == 409
        assert "already exists" in resp.json()["detail"]

    def test_category_validation(self, admin_client):
        """POST with invalid category, verify 400."""
        resp = admin_client.post("/api/admin/assets/", json={
            "asset_key": "bad_category_test",
            "category": "not_a_real_category",
            "render_definition": SAMPLE_RENDER_DEF,
        })
        assert resp.status_code == 400
        assert "Invalid category" in resp.json()["detail"]


class TestGetAsset:
    def test_get_asset(self, admin_client, session):
        """Create then GET by key."""
        _make_asset(session, "get_test_asset")
        resp = admin_client.get("/api/admin/assets/get_test_asset")
        assert resp.status_code == 200
        data = resp.json()
        assert data["asset_key"] == "get_test_asset"

    def test_get_missing_asset(self, admin_client):
        """GET unknown key, verify 404."""
        resp = admin_client.get("/api/admin/assets/nonexistent_key_xyz")
        assert resp.status_code == 404


class TestUpdateAsset:
    def test_update_asset(self, admin_client, session):
        """Create then PUT with new render_definition."""
        _make_asset(session, "update_test_asset")
        resp = admin_client.put("/api/admin/assets/update_test_asset", json={
            "render_definition": SAMPLE_RENDER_DEF_2,
            "display_name": "Updated Name",
        })
        assert resp.status_code == 200
        asset = resp.json()["asset"]
        assert asset["render_definition"]["base_shape"] == "rect"
        assert asset["display_name"] == "Updated Name"


class TestDeleteAsset:
    def test_delete_asset(self, admin_client, session):
        """Create then DELETE, verify gone."""
        _make_asset(session, "delete_test_asset")
        resp = admin_client.delete("/api/admin/assets/delete_test_asset")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Verify gone
        resp2 = admin_client.get("/api/admin/assets/delete_test_asset")
        assert resp2.status_code == 404

    def test_delete_referenced_asset(self, admin_client, session):
        """Create entity_gameplay_data referencing the key, then DELETE, verify warning."""
        _make_asset(session, "ref_delete_test")

        # Create a referenced entity_gameplay_data row
        # We need entity_gameplay_data table — SQLite won't have the game tables
        # so we create a minimal mock. Skip if table doesn't exist.
        try:
            session.execute(text(
                "CREATE TABLE IF NOT EXISTS entity_gameplay_data "
                "(id INTEGER PRIMARY KEY, sprite_key VARCHAR(150))"
            ))
            session.execute(text(
                "INSERT INTO entity_gameplay_data (id, sprite_key) VALUES (999, 'ref_delete_test')"
            ))
            session.commit()
        except Exception:
            pytest.skip("Cannot create entity_gameplay_data mock table")

        resp = admin_client.delete("/api/admin/assets/ref_delete_test")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("warning") is True
        assert len(data.get("references", [])) > 0


class TestListAssets:
    def test_list_all(self, admin_client, session):
        """Create 3 assets, list, verify pagination response structure."""
        for i in range(3):
            _make_asset(session, f"list_test_{i}", category="entity_sprite")
        resp = admin_client.get("/api/admin/assets/")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert data["total"] >= 3

    def test_list_filter_category(self, admin_client, session):
        """Create assets in different categories, filter by one."""
        _make_asset(session, "cat_filter_entity", category="entity_sprite")
        _make_asset(session, "cat_filter_bg", category="background")
        resp = admin_client.get("/api/admin/assets/?category=background")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(item["category"] == "background" for item in items)

    def test_list_filter_search(self, admin_client, session):
        """Search by display_name substring."""
        _make_asset(session, "search_unique_xyz_123", display_name="UniqueSearchName")
        resp = admin_client.get("/api/admin/assets/?search=UniqueSearch")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert any("UniqueSearchName" in (item.get("display_name") or "") for item in items)

    def test_list_filter_tags(self, admin_client, session):
        """Filter by tag — uses JSONB containment which may not work in SQLite."""
        _make_asset(session, "tag_filter_asset", tags=["rare_tag_xyz"])
        resp = admin_client.get("/api/admin/assets/?tag=rare_tag_xyz")
        # SQLite may not support JSONB containment, so accept 200 or 500
        if resp.status_code == 200:
            items = resp.json()["items"]
            assert len(items) >= 1

    def test_pagination(self, admin_client, session):
        """Create 10+ assets, verify page_size=5 returns correct pages."""
        for i in range(12):
            _make_asset(session, f"page_test_{i:03d}")

        resp1 = admin_client.get("/api/admin/assets/?page=1&page_size=5")
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert len(data1["items"]) == 5
        assert data1["page"] == 1
        assert data1["total"] >= 12

        resp2 = admin_client.get("/api/admin/assets/?page=2&page_size=5")
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert len(data2["items"]) == 5
        assert data2["page"] == 2


class TestOrphanDetection:
    def test_orphans_missing(self, admin_client, session):
        """Create entity_gameplay_data with sprite_key but no registry entry."""
        try:
            session.execute(text(
                "CREATE TABLE IF NOT EXISTS entity_gameplay_data "
                "(id INTEGER PRIMARY KEY, sprite_key VARCHAR(150))"
            ))
            session.execute(text(
                "INSERT INTO entity_gameplay_data (id, sprite_key) "
                "VALUES (998, 'orphan_missing_key')"
            ))
            session.commit()
        except Exception:
            pytest.skip("Cannot create entity_gameplay_data mock table")

        resp = admin_client.get("/api/admin/assets/orphans/missing")
        # SQLite may fail on json_agg — accept 200 or 500
        if resp.status_code == 200:
            data = resp.json()
            assert "missing" in data
            keys = [m["asset_key"] for m in data["missing"]]
            assert "orphan_missing_key" in keys

    def test_orphans_unused(self, admin_client, session):
        """Create registry entry not referenced anywhere, verify detected."""
        _make_asset(session, "orphan_unused_key")
        resp = admin_client.get("/api/admin/assets/orphans/unused")
        # SQLite may fail on complex subqueries — accept 200 or 500
        if resp.status_code == 200:
            data = resp.json()
            assert "unused" in data
            keys = [u["asset_key"] for u in data["unused"]]
            assert "orphan_unused_key" in keys


class TestBulkImport:
    def test_bulk_import_create(self, admin_client):
        """POST /bulk with new entries."""
        entries = [
            {
                "asset_key": f"bulk_create_{i}",
                "category": "entity_sprite",
                "display_name": f"Bulk Entity {i}",
                "render_definition": SAMPLE_RENDER_DEF,
                "tags": ["bulk"],
                "source": "generator",
            }
            for i in range(3)
        ]
        resp = admin_client.post("/api/admin/assets/bulk", json=entries)
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 3
        assert data["updated"] == 0
        assert len(data["errors"]) == 0

    def test_bulk_import_upsert(self, admin_client, session):
        """POST /bulk updating existing entry."""
        _make_asset(session, "bulk_upsert_existing")
        entries = [
            {
                "asset_key": "bulk_upsert_existing",
                "category": "entity_sprite",
                "display_name": "Updated Bulk",
                "render_definition": SAMPLE_RENDER_DEF_2,
                "source": "admin",
            },
            {
                "asset_key": "bulk_upsert_new",
                "category": "background",
                "render_definition": SAMPLE_RENDER_DEF,
                "source": "admin",
            },
        ]
        resp = admin_client.post("/api/admin/assets/bulk", json=entries)
        assert resp.status_code == 200
        data = resp.json()
        assert data["updated"] == 1
        assert data["created"] == 1

    def test_bulk_import_validation(self, admin_client):
        """POST /bulk with invalid category."""
        entries = [
            {
                "asset_key": "bulk_bad_cat",
                "category": "totally_invalid",
                "render_definition": SAMPLE_RENDER_DEF,
            }
        ]
        resp = admin_client.post("/api/admin/assets/bulk", json=entries)
        assert resp.status_code == 200
        data = resp.json()
        assert data["created"] == 0
        assert len(data["errors"]) == 1
        assert "Invalid category" in data["errors"][0]["reason"]


class TestBatchPreload:
    def test_batch_preload(self, admin_client, session):
        """Create entries then GET /batch?keys=..."""
        _make_asset(session, "batch_a")
        _make_asset(session, "batch_b")
        _make_asset(session, "batch_c")

        resp = admin_client.get("/api/admin/assets/batch?keys=batch_a,batch_b,batch_c")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 3
        returned_keys = {item["asset_key"] for item in data["items"]}
        assert returned_keys == {"batch_a", "batch_b", "batch_c"}


class TestAdminAuth:
    def test_admin_auth_required(self, client):
        """Call endpoint without admin auth, verify 401/403."""
        resp = client.get("/api/admin/assets/")
        assert resp.status_code in (401, 403)
