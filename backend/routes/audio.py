"""Audio & Music routes (REC 2.5).

Game endpoints:
  GET /api/game/audio/atmosphere?scene_id={id} — resolve atmosphere with hierarchy
  GET /api/game/audio/sfx-configs — all SFX preset definitions

Admin endpoints added in 2.5.3.
"""

import logging
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import (
    Atmosphere, AudioConfig,
    SceneGameplayData, Chapter, Book, Scene,
    EntityGameplayData, DevContentAudit,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/game/audio", tags=["audio"])


@router.get("/atmosphere")
async def get_atmosphere(
    scene_id: Optional[int] = Query(None, description="Scene ID to resolve atmosphere for"),
    archetype: Optional[str] = Query(None, description="Archetype name for direct lookup (e.g. training_grounds)"),
    boss_entity_id: Optional[int] = Query(None, description="Boss entity ID for unique theme override"),
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Resolve the atmosphere definition for a scene using the hierarchy:
    1. Boss override (entity_gameplay_data.unique_boss_theme_id)
    2. Scene level (scene_gameplay_data.atmosphere_id)
    3. Chapter level (chapters.atmosphere_id)
    4. Book level (books.atmosphere_id)
    5. Global default (Mundane Dread) — logs to dev_content_audit

    Alternative: pass `archetype` to get a random atmosphere of that archetype
    (used for Idle Training which picks a random Training Grounds variation).
    """
    # Direct archetype lookup (e.g. for Idle Training)
    if archetype:
        matches = session.exec(
            select(Atmosphere).where(Atmosphere.archetype == archetype)
        ).all()
        if not matches:
            raise HTTPException(status_code=404, detail=f"No atmospheres with archetype '{archetype}'")
        resolved = random.choice(matches)
        return {
            "atmosphere_id": resolved.id,
            "archetype": resolved.archetype,
            "name": resolved.name,
            "music_definitions": resolved.music_definitions,
            "generator_bpm": resolved.generator_bpm,
            "generator_key": resolved.generator_key,
            "generator_scale": resolved.generator_scale,
            "boss_theme_id": None,
            "resolution_source": "archetype_direct",
        }

    if not scene_id:
        raise HTTPException(status_code=400, detail="Either scene_id or archetype is required")

    resolved_atmosphere = None
    resolution_source = None

    # 1. Boss override
    if boss_entity_id:
        entity_data = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == boss_entity_id)
        ).first()
        if entity_data and entity_data.unique_boss_theme_id:
            resolved_atmosphere = session.get(Atmosphere, entity_data.unique_boss_theme_id)
            if resolved_atmosphere:
                resolution_source = "boss_override"

    # 2. Scene level
    if not resolved_atmosphere:
        scene_data = session.exec(
            select(SceneGameplayData).where(SceneGameplayData.scene_id == scene_id)
        ).first()
        if scene_data and scene_data.atmosphere_id:
            resolved_atmosphere = session.get(Atmosphere, scene_data.atmosphere_id)
            if resolved_atmosphere:
                resolution_source = "scene"

    # 3. Chapter level
    if not resolved_atmosphere:
        scene = session.exec(select(Scene).where(Scene.id == scene_id)).first()
        if not scene:
            raise HTTPException(status_code=404, detail="Scene not found")
        chapter = session.get(Chapter, scene.chapter_id)
        if chapter and chapter.atmosphere_id:
            resolved_atmosphere = session.get(Atmosphere, chapter.atmosphere_id)
            if resolved_atmosphere:
                resolution_source = "chapter"

        # 4. Book level
        if not resolved_atmosphere and chapter:
            book = session.get(Book, chapter.book_id)
            if book and book.atmosphere_id:
                resolved_atmosphere = session.get(Atmosphere, book.atmosphere_id)
                if resolved_atmosphere:
                    resolution_source = "book"

    # 5. Global default — log to dev_content_audit
    if not resolved_atmosphere:
        resolved_atmosphere = session.exec(
            select(Atmosphere).where(Atmosphere.archetype == "mundane_dread")
        ).first()
        resolution_source = "global_default"

        # Log fallback to dev_content_audit
        audit = DevContentAudit(
            audit_type="audio_atmosphere_fallback",
            entity_type="scene",
            entity_id=scene_id,
            details=f"No atmosphere assigned. Fell back to global default for scene {scene_id}.",
        )
        session.add(audit)
        session.commit()

    if not resolved_atmosphere:
        raise HTTPException(status_code=500, detail="No atmosphere definitions available")

    # Check for boss theme override info
    boss_theme_id = None
    if boss_entity_id:
        entity_data = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == boss_entity_id)
        ).first()
        if entity_data:
            boss_theme_id = entity_data.unique_boss_theme_id

    return {
        "atmosphere_id": resolved_atmosphere.id,
        "archetype": resolved_atmosphere.archetype,
        "name": resolved_atmosphere.name,
        "music_definitions": resolved_atmosphere.music_definitions,
        "generator_bpm": resolved_atmosphere.generator_bpm,
        "generator_key": resolved_atmosphere.generator_key,
        "generator_scale": resolved_atmosphere.generator_scale,
        "boss_theme_id": boss_theme_id,
        "resolution_source": resolution_source,
    }


@router.get("/sfx-configs")
async def get_sfx_configs(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return all SFX preset definitions for the frontend SFXEngine."""
    configs = session.exec(select(AudioConfig)).all()
    return [
        {
            "config_key": c.config_key,
            "category": c.category,
            "display_name": c.display_name,
            "preset_definition": c.preset_definition,
            "base_volume": c.base_volume,
            "pitch_variation": c.pitch_variation,
            "spatial_enabled": c.spatial_enabled,
        }
        for c in configs
    ]
