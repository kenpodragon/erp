"""Player profile management routes."""

import os
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Request
from sqlmodel import Session, select, text

from db import get_session
from auth import get_current_player
from models import Player, PlayerSettings, PlayerCharacter
from utils import is_profane, sanitize_text
from events import log_activity_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/players", tags=["players"])

uploads_dir = os.getenv("UPLOADS_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))


@router.get("/me")
async def get_my_profile(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    """
    Return full player profile with settings.
    FR-3.8
    """
    player = token.get("player")
    if not player:
        firebase_uid = token.get("uid")
        player = session.exec(select(Player).where(Player.firebase_uid == firebase_uid)).first()
        if not player:
            logger.warning("Profile not found in DB for Firebase UID: %s", firebase_uid)
            raise HTTPException(status_code=404, detail="Player profile not found. Please login first.")

    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()
    if not settings:
        settings = PlayerSettings(player_id=player.id, updated_at=datetime.now(timezone.utc))
        session.add(settings)
        session.commit()
        session.refresh(settings)

    return {**player.model_dump(), "settings": settings.model_dump() if settings else None}


@router.post("/me/reset")
async def reset_player(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    """
    DEBUG ONLY: Reset player state to 'new'.
    Clears character, terms_accepted_at, alias, and avatar.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    # Delete characters (cascades to progress/essence)
    characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()
    for char in characters:
        session.delete(char)

    # Reset player fields
    player.terms_accepted_at = None
    player.alias = None
    player.avatar_preset_key = None
    player.custom_avatar_url = None
    player.updated_at = datetime.now(timezone.utc)

    session.add(player)
    session.commit()
    session.refresh(player)

    return {"message": "Player state reset successfully", "player": player}


@router.get("/check-alias")
async def check_alias(alias: str, session: Session = Depends(get_session)):
    """
    Check if an alias is available (uniqueness + format + profanity).
    Used for real-time validation on frontend.
    """
    if not alias or len(alias) < 3 or len(alias) > 20:
        return {"available": False, "reason": "Length must be 3-20 characters"}

    if not alias.replace("_", "").replace("-", "").isalnum():
        return {"available": False, "reason": "Only alphanumeric, underscores, and hyphens allowed"}

    if is_profane(alias):
        return {"available": False, "reason": "This alias is not allowed"}

    # Uniqueness check (case-insensitive)
    existing = session.exec(select(Player).where(text("LOWER(alias) = :alias")).params(alias=alias.lower())).first()
    if existing:
        return {"available": False, "reason": "This alias is already taken"}

    return {"available": True}


@router.patch("/me")
async def update_profile(
    request: Request,
    update_data: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Update alias (validate uniqueness, format, profanity filter) and/or avatar preset.
    FR-3.3, FR-3.9
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    if "alias" in update_data:
        alias = sanitize_text(update_data["alias"], max_length=20)
        # Validation
        if not alias or len(alias) < 3:
            raise HTTPException(status_code=422, detail="Alias must be between 3 and 20 characters")
        if not alias.replace("_", "").replace("-", "").isalnum():
            raise HTTPException(status_code=422, detail="Alias must be alphanumeric (underscores/hyphens allowed)")
        if is_profane(alias):
            raise HTTPException(status_code=422, detail="This alias is not allowed")

        # Uniqueness check (case-insensitive)
        existing = session.exec(select(Player).where(text("LOWER(alias) = :alias")).params(alias=alias.lower())).first()
        if existing and existing.id != player.id:
            raise HTTPException(status_code=409, detail="This alias is already taken")

        player.alias = alias

    if "avatar_preset_key" in update_data:
        player.avatar_preset_key = update_data["avatar_preset_key"]
        player.custom_avatar_url = None # Clear custom if preset selected

    player.updated_at = datetime.now(timezone.utc)
    session.add(player)
    session.commit()
    session.refresh(player)

    log_activity_event(request, player.id, "profile_updated", {
        "fields_changed": [k for k in ("alias", "avatar_preset_key") if k in update_data]
    })

    return player


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Upload and store a custom avatar image.
    FR-3.10
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="File must be an image")

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(uploads_dir, "avatars", filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
    except Exception as e:
        logger.error("Failed to save avatar: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save avatar")

    # Update player profile
    avatar_url = f"/uploads/avatars/{filename}"
    player.custom_avatar_url = avatar_url
    player.avatar_preset_key = None # Clear preset if custom uploaded
    player.updated_at = datetime.now(timezone.utc)

    session.add(player)
    session.commit()
    session.refresh(player)

    return {"avatar_url": avatar_url}


@router.post("/me/accept-terms")
async def accept_terms(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    """
    Set terms_accepted_at = NOW(), idempotent.
    FR-3.5, FR-3.11
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    if player.terms_accepted_at is None:
        player.terms_accepted_at = datetime.now(timezone.utc)
        player.updated_at = datetime.now(timezone.utc)
        session.add(player)
        session.commit()
        session.refresh(player)

    return {"message": "Terms accepted", "terms_accepted_at": player.terms_accepted_at}


@router.patch("/me/settings")
async def update_settings(
    update_data: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Update audio_enabled, music_volume, sfx_volume, narration_speed with validation.
    FR-3.12
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    logger.info("Updating settings for player %s: %s", player.id, update_data)

    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()
    if not settings:
        logger.info("Creating new settings for player %s", player.id)
        settings = PlayerSettings(player_id=player.id, updated_at=datetime.now(timezone.utc))

    if "audio_enabled" in update_data:
        settings.audio_enabled = update_data["audio_enabled"]
    if "music_volume" in update_data:
        v = update_data["music_volume"]
        if not (0 <= v <= 100):
            raise HTTPException(status_code=422, detail="music_volume must be between 0 and 100")
        settings.music_volume = v
    if "sfx_volume" in update_data:
        v = update_data["sfx_volume"]
        if not (0 <= v <= 100):
            raise HTTPException(status_code=422, detail="sfx_volume must be between 0 and 100")
        settings.sfx_volume = v
    if "master_volume" in update_data:
        v = update_data["master_volume"]
        if not (0 <= v <= 100):
            raise HTTPException(status_code=422, detail="master_volume must be between 0 and 100")
        settings.master_volume = v
    if "master_muted" in update_data:
        settings.master_muted = bool(update_data["master_muted"])
    if "narration_speed" in update_data:
        s = update_data["narration_speed"]
        if not (0.5 <= s <= 2.0):
            raise HTTPException(status_code=422, detail="narration_speed must be between 0.5 and 2.0")
        settings.narration_speed = s
    if "narration_wpm" in update_data:
        w = update_data["narration_wpm"]
        if not (150 <= w <= 600):
            raise HTTPException(status_code=422, detail="narration_wpm must be between 150 and 600")
        settings.narration_wpm = w
    if "narration_font_size" in update_data:
        fs = update_data["narration_font_size"]
        if not (8 <= fs <= 28):
            raise HTTPException(status_code=422, detail="narration_font_size must be between 8 and 28")
        settings.narration_font_size = fs
    if "narration_block_height" in update_data:
        bh = update_data["narration_block_height"]
        if not (10 <= bh <= 100):
            raise HTTPException(status_code=422, detail="narration_block_height must be between 10 and 100")
        settings.narration_block_height = bh
    if "ui_scale" in update_data:
        us = update_data["ui_scale"]
        if not (0.5 <= us <= 3.0):
            raise HTTPException(status_code=422, detail="ui_scale must be between 0.5 and 3.0")
        settings.ui_scale = us
    if "game_text_scale" in update_data:
        ts = update_data["game_text_scale"]
        if not (1.0 <= ts <= 5.0):
            raise HTTPException(status_code=422, detail="game_text_scale must be between 1.0 and 5.0")
        settings.game_text_scale = ts

    # Home Base terminal visit timestamps (2.7)
    if "akashic_last_visited_at" in update_data:
        settings.akashic_last_visited_at = datetime.now(timezone.utc)
    if "gallery_last_visited_at" in update_data:
        settings.gallery_last_visited_at = datetime.now(timezone.utc)
    if "achievements_last_visited_at" in update_data:
        settings.achievements_last_visited_at = datetime.now(timezone.utc)

    settings.updated_at = datetime.now(timezone.utc)
    session.add(settings)
    session.commit()
    session.refresh(settings)

    logger.info("Settings updated successfully for player %s", player.id)

    return settings
