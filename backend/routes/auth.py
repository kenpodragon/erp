"""Authentication routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import Player, PlayerSettings, PlayerCharacter, CharacterClass, PlayerProgress, PlayerEssence, PlayerMetaProgression
from events import log_activity_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(request: Request, token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    """
    Validate token, upsert player, return profile + characters + is_new_player.
    FR-3.1, FR-3.2, FR-3.7
    """
    firebase_uid = token.get("uid")
    email = token.get("email")
    display_name = token.get("name")
    avatar_url = token.get("picture")

    logger.info("Login attempt for %s", email)

    player = session.exec(select(Player).where(Player.firebase_uid == firebase_uid)).first()
    is_new_player = False
    now = datetime.now(timezone.utc)

    if not player:
        is_new_player = True
        player = Player(
            firebase_uid=firebase_uid,
            email=email,
            google_display_name=display_name,
            google_avatar_url=avatar_url,
            created_at=now,
            last_login_at=now,
            updated_at=now
        )
        session.add(player)
        session.commit()
        session.refresh(player)

        # Create default player settings
        settings = PlayerSettings(player_id=player.id, updated_at=now)
        session.add(settings)
        session.commit()
    else:
        # Update existing player login time and sync Google info
        player.last_login_at = now
        player.google_display_name = display_name
        player.google_avatar_url = avatar_url
        session.add(player)
        session.commit()
        session.refresh(player)

    # Fetch characters (if any), embedding class, progress, and essence data
    raw_characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()
    
    characters = []
    for char in raw_characters:
        char_class = session.get(CharacterClass, char.class_id)
        # Fetch related objects
        progress = session.exec(
            select(PlayerProgress).where(PlayerProgress.character_id == char.id)
        ).first()
        essence = session.exec(
            select(PlayerEssence).where(PlayerEssence.character_id == char.id)
        ).first()

        characters.append({
            **char.model_dump(),
            "class": char_class.model_dump() if char_class else None,
            "progress": progress.model_dump() if progress else None,
            "essence": essence.model_dump() if essence else None
        })

    # Get settings to include in response
    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()

    log_activity_event(request, player.id, "player_login", {"is_new_player": is_new_player})

    return {
        "player": {**player.model_dump(), "settings": settings.model_dump() if settings else None},
        "characters": characters,
        "is_new_player": is_new_player or player.terms_accepted_at is None
    }


@router.post("/logout")
async def logout(request: Request, token: dict = Depends(get_current_player)):
    """
    Log a player_logout activity event. Firebase sign-out is handled client-side;
    this endpoint exists solely to record the event. FR-9.1
    """
    player = token.get("player")
    if player:
        log_activity_event(request, player.id, "player_logout", {})
    return {"status": "logged_out"}
