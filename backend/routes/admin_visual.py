"""Admin CRUD routes for visual lookup tables."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin
from audit import write_audit_log
from models.visual import (
    MovementType,
    SizeClass,
    AnimationStyle,
    SilhouetteType,
    ArmorClass,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/visual", tags=["admin-visual"])

# ---------------------------------------------------------------------------
# Table registry — maps URL path segment to SQLModel class
# ---------------------------------------------------------------------------

TABLE_MAP: Dict[str, Any] = {
    "movement_types": MovementType,
    "size_classes": SizeClass,
    "animation_styles": AnimationStyle,
    "silhouette_types": SilhouetteType,
    "armor_classes": ArmorClass,
}


def _get_model(table_name: str):
    model = TABLE_MAP.get(table_name)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown table: {table_name}. Valid: {', '.join(TABLE_MAP.keys())}",
        )
    return model


def _row_to_dict(row) -> dict:
    """Convert a SQLModel row to a plain dict, excluding internal attrs."""
    data = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name, None)
        if isinstance(val, datetime):
            val = val.isoformat()
        data[col.name] = val
    return data


# ---------------------------------------------------------------------------
# Generic CRUD endpoints
# ---------------------------------------------------------------------------

@router.get("/{table_name}")
def list_rows(
    table_name: str,
    session: Session = Depends(get_session),
    _admin: dict = Depends(get_current_admin),
):
    """List all rows in a visual lookup table."""
    model = _get_model(table_name)
    rows = session.exec(select(model)).all()
    return {"items": [_row_to_dict(row) for row in rows], "total": len(rows)}


@router.post("/{table_name}", status_code=201)
def create_row(
    table_name: str,
    body: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Create a new row in a visual lookup table."""
    model = _get_model(table_name)
    # Strip id and created_at — let the DB handle them
    body.pop("id", None)
    body.pop("created_at", None)
    try:
        row = model(**body, created_at=datetime.now(timezone.utc))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    session.add(row)
    session.commit()
    session.refresh(row)
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"create_{table_name}",
        target_type=table_name,
        target_id=str(row.id),
        details=body,
    )
    return _row_to_dict(row)


@router.put("/{table_name}/{row_id}")
def update_row(
    table_name: str,
    row_id: int,
    body: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Update a row in a visual lookup table."""
    model = _get_model(table_name)
    row = session.get(model, row_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"{table_name} row {row_id} not found")
    # Don't allow overwriting id or created_at
    body.pop("id", None)
    body.pop("created_at", None)
    for key, value in body.items():
        if hasattr(row, key):
            setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"update_{table_name}",
        target_type=table_name,
        target_id=str(row_id),
        details=body,
    )
    return _row_to_dict(row)


@router.delete("/{table_name}/{row_id}")
def delete_row(
    table_name: str,
    row_id: int,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Delete a row from a visual lookup table."""
    model = _get_model(table_name)
    row = session.get(model, row_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"{table_name} row {row_id} not found")
    session.delete(row)
    session.commit()
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"delete_{table_name}",
        target_type=table_name,
        target_id=str(row_id),
        details={},
    )
    return {"ok": True, "deleted_id": row_id}
