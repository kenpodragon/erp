"""Admin server config management routes."""

import os
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import ServerConfig, Player, PlayerCharacter, CharacterClass
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


# ---------------------------------------------------------------------------
# Auth Bypass — Test Player Management
# ---------------------------------------------------------------------------

class CreateTestPlayerRequest(BaseModel):
    alias: str = "TestPlayer"
    class_id: int = 1
    character_name: str = "TestHero"


@router.get("/auth-bypass/status")
async def get_auth_bypass_status(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return current auth bypass configuration and .env gate status."""
    env_allows = os.getenv("ALLOW_AUTH_BYPASS", "").lower() == "true"
    config_cache.refresh_if_stale(session)
    db_enabled = config_cache.get_config_bool("ops.auth_bypass_enabled", False)
    bypass_player_id = config_cache.get_config("ops.auth_bypass_player_id", "")

    # Fetch bypass player details if set
    bypass_player = None
    if bypass_player_id:
        try:
            player = session.exec(
                select(Player).where(Player.id == int(bypass_player_id))
            ).first()
            if player:
                chars = session.exec(
                    select(PlayerCharacter).where(
                        PlayerCharacter.player_id == player.id
                    )
                ).all()
                bypass_player = {
                    "id": player.id,
                    "email": player.email,
                    "alias": player.alias,
                    "is_banned": player.is_banned,
                    "characters": [
                        {
                            "id": c.id,
                            "character_name": c.character_name,
                            "class_id": c.class_id,
                            "level": c.level,
                        }
                        for c in chars
                    ],
                }
        except (ValueError, TypeError):
            pass

    # Fetch available classes for test player creation
    classes = session.exec(
        select(CharacterClass).where(CharacterClass.is_available == True)
    ).all()

    return {
        "env_allows_bypass": env_allows,
        "db_bypass_enabled": db_enabled,
        "bypass_active": env_allows and db_enabled,
        "bypass_player_id": bypass_player_id,
        "bypass_player": bypass_player,
        "available_classes": [
            {"id": c.id, "name": c.name} for c in classes
        ],
    }


@router.post("/auth-bypass/create-test-player")
async def create_test_player(
    body: CreateTestPlayerRequest,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a dedicated test player for auth bypass and auto-set it as the bypass target."""
    env_allows = os.getenv("ALLOW_AUTH_BYPASS", "").lower() == "true"
    if not env_allows:
        raise HTTPException(400, detail="ALLOW_AUTH_BYPASS is not enabled in .env")

    now = datetime.now(timezone.utc)
    test_uid = f"test_bypass_{uuid.uuid4().hex[:12]}"

    # Create player
    player = Player(
        firebase_uid=test_uid,
        email=f"{test_uid}@test.bypass",
        google_display_name=body.alias,
        alias=body.alias,
        terms_accepted_at=now,
        created_at=now,
        last_login_at=now,
        updated_at=now,
    )
    session.add(player)
    session.commit()
    session.refresh(player)

    # Create character
    char_class = session.exec(
        select(CharacterClass).where(CharacterClass.id == body.class_id)
    ).first()
    if not char_class:
        raise HTTPException(400, detail=f"Character class {body.class_id} not found")

    character = PlayerCharacter(
        player_id=player.id,
        class_id=body.class_id,
        character_name=body.character_name,
        level=1,
        character_xp=0,
        strength=char_class.base_strength,
        agility=char_class.base_agility,
        intelligence=char_class.base_intelligence,
        created_at=now,
    )
    session.add(character)

    # Auto-set as bypass player
    bypass_config = session.exec(
        select(ServerConfig).where(ServerConfig.key == "ops.auth_bypass_player_id")
    ).first()
    if bypass_config:
        bypass_config.value = str(player.id)
        bypass_config.updated_at = now
        bypass_config.updated_by = token.get("email", "admin")
        session.add(bypass_config)

    # Enable bypass if not already
    enabled_config = session.exec(
        select(ServerConfig).where(ServerConfig.key == "ops.auth_bypass_enabled")
    ).first()
    if enabled_config and enabled_config.value != "true":
        enabled_config.value = "true"
        enabled_config.updated_at = now
        enabled_config.updated_by = token.get("email", "admin")
        session.add(enabled_config)

    session.commit()
    session.refresh(player)
    session.refresh(character)

    config_cache.invalidate()
    config_cache.refresh_if_stale(session)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "admin"),
        action="auth_bypass_test_player_created",
        target_type="player",
        target_id=str(player.id),
        details=f"Created test player '{body.alias}' (ID {player.id}) with character '{body.character_name}'",
        ip_address=get_client_ip(request),
    )

    return {
        "player_id": player.id,
        "email": player.email,
        "alias": player.alias,
        "character": {
            "id": character.id,
            "character_name": character.character_name,
            "class_id": character.class_id,
            "level": character.level,
        },
        "message": f"Test player created and set as bypass target (ID {player.id})",
    }


@router.post("/auth-bypass/set-player/{player_id}")
async def set_bypass_player(
    player_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Set an existing player as the auth bypass target."""
    env_allows = os.getenv("ALLOW_AUTH_BYPASS", "").lower() == "true"
    if not env_allows:
        raise HTTPException(400, detail="ALLOW_AUTH_BYPASS is not enabled in .env")

    player = session.exec(select(Player).where(Player.id == player_id)).first()
    if not player:
        raise HTTPException(404, detail=f"Player {player_id} not found")

    now = datetime.now(timezone.utc)
    config_row = session.exec(
        select(ServerConfig).where(ServerConfig.key == "ops.auth_bypass_player_id")
    ).first()
    if config_row:
        config_row.value = str(player_id)
        config_row.updated_at = now
        config_row.updated_by = token.get("email", "admin")
        session.add(config_row)
        session.commit()

    config_cache.invalidate()
    config_cache.refresh_if_stale(session)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "admin"),
        action="auth_bypass_player_changed",
        target_type="player",
        target_id=str(player_id),
        details=f"Set bypass target to player '{player.alias or player.email}' (ID {player_id})",
        ip_address=get_client_ip(request),
    )

    return {"message": f"Bypass target set to player {player_id}", "player_id": player_id}
