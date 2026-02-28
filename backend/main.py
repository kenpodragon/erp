import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Main script starting...")

from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select, text
from fastapi.encoders import jsonable_encoder

# Load from environment (handled by Cloud Run or local shell)
DATABASE_URL = os.getenv("DATABASE_URL")
logger.info("DATABASE_URL is: %s", DATABASE_URL[:20] if DATABASE_URL else "None")

logger.info("Importing local modules...")
try:
    from db import get_session
    logger.info("Imported db")
    from auth import init_firebase, get_current_player, get_current_admin
    logger.info("Imported auth")
    from models import Player, PlayerSettings, CharacterClass, PlayerCharacter, PlayerProgress, PlayerEssence
    logger.info("Imported models")
    from utils import load_profanity_blocklist, is_profane
    logger.info("Imported utils")
except Exception as e:
    logger.error("Failed to import local modules: %s", e, exc_info=True)
    raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    init_firebase()
    load_profanity_blocklist()
    yield
    # Shutdown logic (if any)

app = FastAPI(title="ERP API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://erp-frontend-223240539839.us-east1.run.app",
        "https://erp-admin-223240539839.us-east1.run.app",
        "https://play.does-god-exist.org",
        "https://admin.does-god-exist.org"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------

@app.get("/")
def read_default():
    return {
        "message": "Welcome to the ERP API",
        "endpoints": {
            "health": "/health",
            "hello": "/hello"
        }
    }


@app.get("/health")
def health_check(session: Session = Depends(get_session)):
    db_status = "connected"
    error = None
    try:
        session.exec(text("SELECT 1"))
    except Exception as e:
        db_status = "disconnected"
        error = str(e)

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "database_error": error,
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/hello")
def read_root():
    return {"message": "Hello from the ERP Backend!"}


# ---------------------------------------------------------------------------
# Player-authenticated endpoints (Firebase token required)
# ---------------------------------------------------------------------------

@app.post("/api/auth/login")
async def login(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
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

    # Fetch characters (if any), embedding class data
    raw_characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()
    characters = []
    for char in raw_characters:
        char_class = session.get(CharacterClass, char.class_id)
        characters.append({**char.model_dump(), "class": char_class.model_dump() if char_class else None})

    # Get settings to include in response
    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()

    return {
        "player": {**player.model_dump(), "settings": settings.model_dump() if settings else None},
        "characters": characters,
        "is_new_player": is_new_player and player.terms_accepted_at is None
    }


@app.get("/debug-routes")
def list_routes():
    return [{"path": route.path, "name": route.name} for route in app.routes]

@app.get("/api/players/me")
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


@app.post("/api/players/me/reset")
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


@app.get("/api/players/check-alias")
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


@app.patch("/api/players/me")
async def update_profile(
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
        alias = update_data["alias"]
        # Validation
        if not alias or len(alias) < 3 or len(alias) > 20:
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

    player.updated_at = datetime.now(timezone.utc)
    session.add(player)
    session.commit()
    session.refresh(player)

    return player


@app.post("/api/players/me/accept-terms")
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


@app.patch("/api/players/me/settings")
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

    settings = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()
    if not settings:
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
    if "narration_speed" in update_data:
        s = update_data["narration_speed"]
        if not (0.5 <= s <= 2.0):
            raise HTTPException(status_code=422, detail="narration_speed must be between 0.5 and 2.0")
        settings.narration_speed = s

    settings.updated_at = datetime.now(timezone.utc)
    session.add(settings)
    session.commit()
    session.refresh(settings)

    return settings


# ---------------------------------------------------------------------------
# Game / Character endpoints
# ---------------------------------------------------------------------------

@app.get("/api/game/classes")
def get_classes(session: Session = Depends(get_session)):
    """
    Public endpoint — return available character classes.
    FR-4.11
    """
    classes = session.exec(select(CharacterClass).where(CharacterClass.is_available == True)).all()
    return classes


@app.post("/api/players/me/characters")
async def create_character(
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

    return {
        "character": {**character.model_dump(), "class": char_class.model_dump()},
        "progress": progress.model_dump(),
        "essence": essence.model_dump(),
    }


@app.get("/api/players/me/characters")
async def list_characters(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    List the authenticated player's characters with class info.
    FR-4.9
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()
    result = []
    for char in characters:
        char_class = session.get(CharacterClass, char.class_id)
        result.append({**char.model_dump(), "class": char_class.model_dump() if char_class else None})
    return result


@app.delete("/api/players/me/characters/{character_id}")
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

    session.delete(character)
    session.commit()
    return {"message": "Character deleted"}


@app.get("/api/players/me/characters/{character_id}")
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


# ---------------------------------------------------------------------------
# Admin-authenticated endpoints (admin email + IP whitelist)
# ---------------------------------------------------------------------------

@app.get("/api/admin/ping")
async def admin_ping(token: dict = Depends(get_current_admin)):
    """Stub — verifies admin auth pipeline is working end-to-end."""
    return {
        "message": "Admin access confirmed",
        "admin_email": token.get("email"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
