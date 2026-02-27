import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("Main script starting...")

from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
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
    from models import Player, PlayerSettings, PlayerCharacter
    logger.info("Imported models")
    from utils import load_profanity_blocklist, is_profane, process_avatar
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

    # Fetch characters (if any)
    characters = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).all()

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


@app.post("/api/players/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session)
):
    """
    Multipart upload, validate type/size, resize, store, update DB.
    FR-3.4, FR-3.10
    """
    player = token.get("player")
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    # Max size 2MB
    MAX_SIZE = 2 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=422, detail="Image file is too large (max 2MB)")
    await file.seek(0)  # Reset for process_avatar

    try:
        results = process_avatar(file, player.id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # We store the 256x256 version as the main custom_avatar_url
    player.custom_avatar_url = results["url_256"]
    player.updated_at = datetime.now(timezone.utc)
    session.add(player)
    session.commit()
    session.refresh(player)

    return {"message": "Avatar uploaded successfully", "avatar_url": player.custom_avatar_url}


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
