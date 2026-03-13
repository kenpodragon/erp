"""Admin asset registry management routes (REC 5.7.1).

Endpoints:
  GET    /api/admin/assets/              — list assets (paginated, filterable)
  GET    /api/admin/assets/orphans/missing — missing asset detection
  GET    /api/admin/assets/orphans/unused  — unused asset detection
  GET    /api/admin/assets/batch          — batch preload by keys
  POST   /api/admin/assets/bulk           — bulk import (upsert)
  GET    /api/admin/assets/{asset_key}    — single asset
  POST   /api/admin/assets/              — create asset
  PUT    /api/admin/assets/{asset_key}    — update asset
  DELETE /api/admin/assets/{asset_key}    — delete asset (with reference check)
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select, func
from sqlalchemy import text

from db import get_session
from auth import get_current_admin
from models.asset_registry import AssetRegistryEntry, VALID_CATEGORIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/assets", tags=["admin-assets"])


# ---------------------------------------------------------------------------
# Pydantic bodies
# ---------------------------------------------------------------------------

class AssetCreate(BaseModel):
    asset_key: str
    category: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    render_definition: Optional[Any] = None
    tags: Optional[list] = None
    source: str = "admin"


class AssetUpdate(BaseModel):
    category: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    render_definition: Optional[Any] = None
    tags: Optional[list] = None
    source: Optional[str] = None


class BulkAssetEntry(BaseModel):
    asset_key: str
    category: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    render_definition: Optional[Any] = None
    tags: Optional[list] = None
    source: str = "admin"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# All game table references for orphan detection
REFERENCE_TABLES = [
    ("entity_gameplay_data", "sprite_key", "entity_sprite"),
    ("character_classes", "sprite_key", "class_sprite"),
    ("scene_gameplay_data", "background_sprite_key", "background"),
    ("inventory_items", "sprite_key", "item_icon"),
    ("curated_artifacts", "icon_sprite_key", "artifact_icon"),
    ("player_artifacts", "icon_sprite_key", "artifact_icon"),
    ("achievements", "icon_sprite_key", "achievement_icon"),
    ("shop_items", "icon_asset_key", "ui_icon"),
    ("shop_bundles", "icon_asset_key", "ui_icon"),
    ("players", "avatar_preset_key", "avatar"),
]


def _validate_category(category: str) -> None:
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category '{category}'. Valid: {VALID_CATEGORIES}",
        )


# ---------------------------------------------------------------------------
# 1. List assets (paginated, filterable)
# ---------------------------------------------------------------------------

@router.get("/")
async def list_assets(
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all assets with pagination and optional filters."""
    query = select(AssetRegistryEntry)

    if category:
        query = query.where(AssetRegistryEntry.category == category)

    if tag:
        # Use JSONB containment: tags @> '["tag_value"]'
        query = query.where(
            AssetRegistryEntry.tags.contains([tag])  # type: ignore[union-attr]
        )

    if search:
        like_pattern = f"%{search}%"
        query = query.where(
            (AssetRegistryEntry.asset_key.ilike(like_pattern))  # type: ignore[union-attr]
            | (AssetRegistryEntry.display_name.ilike(like_pattern))  # type: ignore[union-attr]
        )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply pagination
    query = query.order_by(AssetRegistryEntry.category, AssetRegistryEntry.asset_key)
    query = query.offset((page - 1) * page_size).limit(page_size)

    items = session.exec(query).all()
    return {
        "items": [item.dict() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ---------------------------------------------------------------------------
# 2. Orphan detection: Missing assets
# ---------------------------------------------------------------------------

@router.get("/orphans/missing")
async def detect_missing_assets(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Find asset keys referenced in game tables but not registered in asset_registry."""
    union_parts = []
    for table, column, suggested_cat in REFERENCE_TABLES:
        union_parts.append(
            f"SELECT DISTINCT {column} AS asset_key, '{table}' AS source_table, "
            f"'{column}' AS source_column, '{suggested_cat}' AS suggested_category "
            f"FROM {table} WHERE {column} IS NOT NULL"
        )

    union_sql = " UNION ALL ".join(union_parts)
    sql = text(f"""
        WITH all_references AS (
            {union_sql}
        )
        SELECT r.asset_key, r.suggested_category,
               json_agg(json_build_object('table', r.source_table, 'column', r.source_column)) AS referenced_in
        FROM all_references r
        LEFT JOIN asset_registry ar ON ar.asset_key = r.asset_key
        WHERE ar.id IS NULL
        GROUP BY r.asset_key, r.suggested_category
        ORDER BY r.suggested_category, r.asset_key
    """)

    rows = session.exec(sql).all()  # type: ignore[arg-type]
    missing = []
    for row in rows:
        missing.append({
            "asset_key": row[0],
            "suggested_category": row[1],
            "referenced_in": row[2],
        })

    return {"missing": missing, "total": len(missing)}


# ---------------------------------------------------------------------------
# 3. Orphan detection: Unused assets
# ---------------------------------------------------------------------------

@router.get("/orphans/unused")
async def detect_unused_assets(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Find asset_registry entries not referenced in any game table."""
    conditions = []
    for table, column, _ in REFERENCE_TABLES:
        conditions.append(
            f"NOT EXISTS (SELECT 1 FROM {table} WHERE {column} = ar.asset_key)"
        )

    where_clause = " AND ".join(conditions)
    sql = text(f"""
        SELECT ar.asset_key, ar.category, ar.source, ar.created_at
        FROM asset_registry ar
        WHERE {where_clause}
        ORDER BY ar.category, ar.asset_key
    """)

    rows = session.exec(sql).all()  # type: ignore[arg-type]
    unused = []
    for row in rows:
        unused.append({
            "asset_key": row[0],
            "category": row[1],
            "source": row[2],
            "created_at": row[3].isoformat() if hasattr(row[3], 'isoformat') else str(row[3]) if row[3] else None,
        })

    return {"unused": unused, "total": len(unused)}


# ---------------------------------------------------------------------------
# 4. Batch preload
# ---------------------------------------------------------------------------

@router.get("/batch")
async def batch_preload(
    keys: str = Query(..., description="Comma-separated asset keys"),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Fetch multiple assets by key in a single request."""
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    if not key_list:
        return {"items": []}

    items = session.exec(
        select(AssetRegistryEntry).where(AssetRegistryEntry.asset_key.in_(key_list))  # type: ignore[union-attr]
    ).all()

    return {"items": [item.dict() for item in items]}


# ---------------------------------------------------------------------------
# 5. Bulk import (upsert)
# ---------------------------------------------------------------------------

@router.post("/bulk")
async def bulk_import(
    entries: list[BulkAssetEntry],
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Bulk import/upsert asset registry entries."""
    created = 0
    updated = 0
    errors = []

    for entry in entries:
        # Validate category
        if entry.category not in VALID_CATEGORIES:
            errors.append({
                "asset_key": entry.asset_key,
                "reason": f"Invalid category '{entry.category}'",
            })
            continue

        existing = session.exec(
            select(AssetRegistryEntry).where(
                AssetRegistryEntry.asset_key == entry.asset_key
            )
        ).first()

        if existing:
            # Update
            existing.category = entry.category
            if entry.display_name is not None:
                existing.display_name = entry.display_name
            if entry.description is not None:
                existing.description = entry.description
            if entry.render_definition is not None:
                existing.render_definition = entry.render_definition
            if entry.tags is not None:
                existing.tags = entry.tags
            existing.source = entry.source
            existing.updated_at = datetime.now(timezone.utc)
            session.add(existing)
            updated += 1
        else:
            # Create
            new_entry = AssetRegistryEntry(
                asset_key=entry.asset_key,
                category=entry.category,
                display_name=entry.display_name,
                description=entry.description,
                render_definition=entry.render_definition or {},
                tags=entry.tags or [],
                source=entry.source,
            )
            session.add(new_entry)
            created += 1

    session.commit()
    return {"created": created, "updated": updated, "errors": errors}


# ---------------------------------------------------------------------------
# 6. Get single asset
# ---------------------------------------------------------------------------

@router.get("/{asset_key}")
async def get_asset(
    asset_key: str,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get a single asset by key."""
    entry = session.exec(
        select(AssetRegistryEntry).where(AssetRegistryEntry.asset_key == asset_key)
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_key}' not found")
    return entry.dict()


# ---------------------------------------------------------------------------
# 7. Create asset
# ---------------------------------------------------------------------------

@router.post("/")
async def create_asset(
    body: AssetCreate,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new asset registry entry."""
    _validate_category(body.category)

    # Check for duplicate key
    existing = session.exec(
        select(AssetRegistryEntry).where(AssetRegistryEntry.asset_key == body.asset_key)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Asset key '{body.asset_key}' already exists",
        )

    entry = AssetRegistryEntry(
        asset_key=body.asset_key,
        category=body.category,
        display_name=body.display_name,
        description=body.description,
        render_definition=body.render_definition or {},
        tags=body.tags or [],
        source=body.source,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return {"asset": entry.dict()}


# ---------------------------------------------------------------------------
# 8. Update asset
# ---------------------------------------------------------------------------

@router.put("/{asset_key}")
async def update_asset(
    asset_key: str,
    body: AssetUpdate,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an existing asset registry entry."""
    entry = session.exec(
        select(AssetRegistryEntry).where(AssetRegistryEntry.asset_key == asset_key)
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_key}' not found")

    if body.category is not None:
        _validate_category(body.category)
        entry.category = body.category

    for field in ("display_name", "description", "render_definition", "tags", "source"):
        value = getattr(body, field, None)
        if value is not None:
            setattr(entry, field, value)

    entry.updated_at = datetime.now(timezone.utc)
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return {"asset": entry.dict()}


# ---------------------------------------------------------------------------
# 9. Delete asset
# ---------------------------------------------------------------------------

@router.delete("/{asset_key}")
async def delete_asset(
    asset_key: str,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete an asset registry entry. Warns if referenced in game tables."""
    entry = session.exec(
        select(AssetRegistryEntry).where(AssetRegistryEntry.asset_key == asset_key)
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_key}' not found")

    # Check references
    references = []
    for table, column, _ in REFERENCE_TABLES:
        try:
            count_sql = text(
                f"SELECT COUNT(*) FROM {table} WHERE {column} = :key"
            )
            row = session.exec(count_sql, params={"key": asset_key}).one()  # type: ignore[arg-type]
            count = row[0] if isinstance(row, (tuple, list)) else row
            if count and count > 0:
                references.append({"table": table, "column": column, "count": count})
        except Exception:
            # Table may not exist (e.g., in test environments)
            pass

    session.delete(entry)
    session.commit()

    if references:
        return {
            "status": "ok",
            "warning": True,
            "message": f"Asset '{asset_key}' deleted, but was referenced in {len(references)} table(s).",
            "references": references,
        }

    return {"status": "ok", "message": f"Asset '{asset_key}' deleted"}
