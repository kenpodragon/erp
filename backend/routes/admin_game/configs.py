"""Admin game config management — browse, update meta/value, list categories."""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import GameConfig
from audit import write_audit_log
from routes.admin_game.helpers import _row_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()


class GameConfigMetaUpdate(BaseModel):
    description: Optional[str] = None
    game_impact: Optional[str] = None
    category: Optional[str] = None


class GameConfigValueUpdate(BaseModel):
    value_json: Any


@router.get("/configs")
async def list_game_configs(
    search: Optional[str] = Query(None),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return all game_configs entries. Optional ?search= filters by key, description, or category."""
    stmt = select(GameConfig)
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        entry = _row_to_dict(row)
        if search:
            needle = search.lower()
            haystack = " ".join(
                str(v).lower() for v in [row.key, row.description, row.category, row.game_impact] if v
            )
            if needle not in haystack:
                continue
        results.append(entry)
    return results


@router.patch("/configs/{key:path}/meta")
async def update_game_config_meta(
    key: str,
    body: GameConfigMetaUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update description, game_impact, or category on a game_config entry."""
    config_row = session.get(GameConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Game config '{key}' not found")

    admin_email = token.get("email", "unknown")
    changes: dict = {}

    if body.description is not None:
        changes["description"] = {"old": config_row.description, "new": body.description}
        config_row.description = body.description
    if body.game_impact is not None:
        changes["game_impact"] = {"old": config_row.game_impact, "new": body.game_impact}
        config_row.game_impact = body.game_impact
    if body.category is not None:
        changes["category"] = {"old": config_row.category, "new": body.category}
        config_row.category = body.category

    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")

    config_row.updated_at = datetime.now(timezone.utc)
    session.add(config_row)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="game_config_meta_updated",
        target_type="game_config",
        target_id=key,
        details=changes,
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(config_row)


@router.patch("/configs/{key:path}/value")
async def update_game_config_value(
    key: str,
    body: GameConfigValueUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update the value_json of a game_config entry."""
    config_row = session.get(GameConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Game config '{key}' not found")

    admin_email = token.get("email", "unknown")
    old_value = config_row.value_json

    config_row.value_json = body.value_json
    config_row.updated_at = datetime.now(timezone.utc)
    session.add(config_row)
    session.commit()
    session.refresh(config_row)

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="game_config_value_updated",
        target_type="game_config",
        target_id=key,
        details={"old_value": old_value, "new_value": body.value_json},
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(config_row)


@router.get("/configs/categories")
async def list_game_config_categories(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return distinct non-null category values from game_configs."""
    rows = session.exec(select(GameConfig.category).distinct()).all()
    return sorted([c for c in rows if c])
