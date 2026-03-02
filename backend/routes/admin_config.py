"""Admin server config management routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import ServerConfig
from audit import write_audit_log
import config_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/config", tags=["admin-config"])


def _validate_config_value(value: str, value_type: str) -> str | None:
    """Validate a config value against its type. Returns error message or None."""
    if value_type == "boolean":
        if value.lower() not in ("true", "false"):
            return "Boolean value must be 'true' or 'false'"
    elif value_type == "integer":
        try:
            int(value)
        except (ValueError, TypeError):
            return f"Value '{value}' is not a valid integer"
    elif value_type == "numeric":
        try:
            float(value)
        except (ValueError, TypeError):
            return f"Value '{value}' is not a valid number"
    return None


@router.get("/")
async def get_admin_config(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Return all config grouped by category.
    FR-8.6
    """
    rows = session.exec(select(ServerConfig)).all()
    grouped: dict[str, list] = {}
    for row in rows:
        entry = {
            "key": row.key,
            "value": row.value,
            "value_type": row.value_type,
            "description": row.description,
            "default_value": row.default_value,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "updated_by": row.updated_by,
        }
        grouped.setdefault(row.category, []).append(entry)
    return grouped


@router.patch("/{key:path}")
async def update_config(
    key: str,
    body: dict,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Update a single config value. Validates against value_type.
    Invalidates cache, logs to audit.
    FR-8.7
    """
    config_row = session.get(ServerConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")

    new_value = body.get("value")
    if new_value is None:
        raise HTTPException(status_code=422, detail="'value' field is required")

    new_value = str(new_value)
    error = _validate_config_value(new_value, config_row.value_type)
    if error:
        raise HTTPException(status_code=422, detail=error)

    old_value = config_row.value
    admin_email = token.get("email", "unknown")

    config_row.value = new_value
    config_row.updated_at = datetime.now(timezone.utc)
    config_row.updated_by = admin_email
    session.add(config_row)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="config_changed",
        target_type="config",
        target_id=key,
        details={"old_value": old_value, "new_value": new_value},
        ip_address=get_client_ip(request),
    )

    config_cache.invalidate()
    config_cache.refresh_if_stale(session)

    return {
        "key": config_row.key,
        "value": config_row.value,
        "updated_at": config_row.updated_at.isoformat() if config_row.updated_at else None,
        "updated_by": config_row.updated_by,
    }


@router.post("/{key:path}/reset")
async def reset_config(
    key: str,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """
    Reset a config value to its default.
    FR-8.8
    """
    config_row = session.get(ServerConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")

    old_value = config_row.value
    admin_email = token.get("email", "unknown")

    config_row.value = config_row.default_value
    config_row.updated_at = datetime.now(timezone.utc)
    config_row.updated_by = admin_email
    session.add(config_row)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="config_reset",
        target_type="config",
        target_id=key,
        details={"old_value": old_value, "reset_to": config_row.default_value},
        ip_address=get_client_ip(request),
    )

    config_cache.invalidate()
    config_cache.refresh_if_stale(session)

    return {
        "key": config_row.key,
        "value": config_row.value,
        "updated_at": config_row.updated_at.isoformat() if config_row.updated_at else None,
        "updated_by": config_row.updated_by,
    }
