"""Character management routes."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session, select, text

from db import get_session
from auth import get_current_player
from models import PlayerCharacter, CharacterClass, PlayerProgress, PlayerEssence, BossCompletion
from utils import is_profane
from events import log_activity_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/players/me/characters", tags=["characters"])


@router.post("/")
async def create_character(
    request: Request,
    body: dict,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Create a character for the authenticated player.
    Validates name, enforces 1-character MVP limit, copies base stats,
    initializes player_progress and player_essence.
    FR-4.4 through FR-4.6, FR-4.8
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    # MVP: one character per player
    existing = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if existing:
        raise HTTPException(status_code=409, detail={"error": "Character limit reached"})

    character_name = body.get("character_name", "").strip()
    class_id = body.get("class_id")

    if not character_name:
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["character_name is required"]})
    if not class_id:
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["class_id is required"]})

    # Validate name: 3-20 chars, alphanumeric + spaces + hyphens
    if len(character_name) < 3 or len(character_name) > 20:
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["character_name must be 3-20 characters"]})
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -")
    if not all(c in allowed for c in character_name):
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["character_name may only contain letters, numbers, spaces, and hyphens"]})
    if is_profane(character_name):
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["This character name is not allowed"]})

    # Uniqueness (case-insensitive)
    name_taken = session.exec(
        select(PlayerCharacter).where(text("LOWER(character_name) = :n")).params(n=character_name.lower())
    ).first()
    if name_taken:
        raise HTTPException(status_code=409, detail={"error": "This name is already taken", "field": "character_name"})

    # Fetch class
    char_class = session.get(CharacterClass, class_id)
    if not char_class or not char_class.is_available:
        raise HTTPException(status_code=422, detail={"error": "Validation failed", "details": ["Invalid or unavailable class_id"]})

    now = datetime.now(timezone.utc)

    # Create character with stats copied from class
    character = PlayerCharacter(
        player_id=player.id,
        class_id=class_id,
        character_name=character_name,
        level=1,
        strength=char_class.base_strength,
        agility=char_class.base_agility,
        intelligence=char_class.base_intelligence,
        created_at=now,
        last_played_at=now,
        updated_at=now,
    )
    session.add(character)
    session.commit()
    session.refresh(character)

    # Initialize player_progress: Book 1, Ch 1, Scene 1, Beat 1
    progress = PlayerProgress(
        player_id=player.id,
        character_id=character.id,
        book_number=1,
        chapter_number=1,
        scene_number=1,
        beat_number=1,
        created_at=now,
        updated_at=now,
    )
    session.add(progress)

    # Initialize player_essence: balance=0, rate=0
    essence = PlayerEssence(
        player_id=player.id,
        character_id=character.id,
        current_balance=0.0,
        passive_rate=0.0,
        created_at=now,
        updated_at=now,
    )
    session.add(essence)
    session.commit()
    session.refresh(progress)
    session.refresh(essence)
    session.refresh(character)
    session.refresh(char_class)

    log_activity_event(request, player.id, "character_created", {
        "character_id": character.id,
        "character_name": character_name,
        "class_id": class_id,
        "class_name": char_class.name,
    })

    return {
        "character": {**jsonable_encoder(character), "class": jsonable_encoder(char_class)},
        "progress": jsonable_encoder(progress),
        "essence": jsonable_encoder(essence),
    }


@router.get("/")
async def list_characters(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    List the authenticated player's characters with class, progress, and essence info.
    FR-4.9
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()
    result = []
    for char in characters:
        char_class = session.get(CharacterClass, char.class_id)
        progress = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == char.id)).first()
        essence = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == char.id)).first()
        
        result.append({
            **jsonable_encoder(char), 
            "class": jsonable_encoder(char_class) if char_class else None,
            "progress": jsonable_encoder(progress) if progress else None,
            "essence": jsonable_encoder(essence) if essence else None
        })
    return result


@router.delete("/{character_id}")
async def delete_character(
    character_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Delete a player's character (progress/essence removed via DB cascade).
    Verifies ownership before deletion.
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    character = session.get(PlayerCharacter, character_id)
    if not character or character.player_id != player.id:
        raise HTTPException(status_code=404, detail="Character not found")

    # Clear boss completions keyed by player_id (not cascaded by character FK)
    boss_completions = session.exec(
        select(BossCompletion).where(BossCompletion.player_id == player.id)
    ).all()
    for bc in boss_completions:
        session.delete(bc)

    session.delete(character)
    session.commit()
    return {"message": "Character deleted"}


@router.get("/{character_id}")
async def get_character(
    character_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Full character detail: stats, class, progress summary, essence balance.
    Verifies ownership.
    FR-4.10
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    character = session.get(PlayerCharacter, character_id)
    if not character or character.player_id != player.id:
        raise HTTPException(status_code=404, detail="Character not found")

    char_class = session.get(CharacterClass, character.class_id)
    progress = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character_id)).first()
    essence = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == character_id)).first()

    return {
        **character.model_dump(),
        "class": char_class.model_dump() if char_class else None,
        "progress": progress.model_dump() if progress else None,
        "essence": essence.model_dump() if essence else None,
    }
