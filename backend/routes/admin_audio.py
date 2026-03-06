"""Admin audio management routes (REC 2.5.3).

Endpoints:
  GET    /api/admin/atmospheres           — list all atmospheres
  GET    /api/admin/atmospheres/{id}      — single atmosphere detail
  POST   /api/admin/atmospheres           — create atmosphere
  PUT    /api/admin/atmospheres/{id}      — update atmosphere
  DELETE /api/admin/atmospheres/{id}      — delete (if unreferenced)
  PUT    /api/admin/atmospheres/{id}/music — replace music definitions
  POST   /api/admin/atmospheres/batch-assign — assign to chapter/book scenes
  GET    /api/admin/audio-configs         — list all SFX configs
  PUT    /api/admin/audio-configs/{id}    — update SFX config
"""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select, func

from db import get_session
from auth import get_current_admin, get_client_ip
from models import Atmosphere, AudioConfig, SceneGameplayData, Chapter, Book, Scene
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin-audio"])


# ---------------------------------------------------------------------------
# Pydantic bodies
# ---------------------------------------------------------------------------

class AtmosphereCreate(BaseModel):
    name: str
    archetype: Optional[str] = None
    description: Optional[str] = None
    music_definitions: Optional[Any] = None
    generator_bpm: int = 120
    generator_key: str = "C"
    generator_scale: str = "minor"
    generator_complexity: int = 5
    generator_seed: Optional[int] = None


class AtmosphereUpdate(BaseModel):
    name: Optional[str] = None
    archetype: Optional[str] = None
    description: Optional[str] = None
    music_definitions: Optional[Any] = None
    generator_bpm: Optional[int] = None
    generator_key: Optional[str] = None
    generator_scale: Optional[str] = None
    generator_complexity: Optional[int] = None
    generator_seed: Optional[int] = None


class MusicDefinitionsUpdate(BaseModel):
    music_definitions: Any


class BatchAssignBody(BaseModel):
    target_type: str  # "chapter" or "book"
    target_id: int
    atmosphere_id: int


class AudioConfigUpdate(BaseModel):
    display_name: Optional[str] = None
    category: Optional[str] = None
    preset_definition: Optional[Any] = None
    base_volume: Optional[float] = None
    pitch_variation: Optional[float] = None
    spatial_enabled: Optional[bool] = None


# ---------------------------------------------------------------------------
# Atmosphere CRUD
# ---------------------------------------------------------------------------

@router.get("/atmospheres")
async def list_atmospheres(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all atmospheres with assignment counts."""
    atmospheres = session.exec(select(Atmosphere).order_by(Atmosphere.id)).all()

    results = []
    for atm in atmospheres:
        scene_count = session.exec(
            select(func.count()).where(SceneGameplayData.atmosphere_id == atm.id)
        ).one()
        chapter_count = session.exec(
            select(func.count()).where(Chapter.atmosphere_id == atm.id)
        ).one()
        book_count = session.exec(
            select(func.count()).where(Book.atmosphere_id == atm.id)
        ).one()

        results.append({
            "id": atm.id,
            "name": atm.name,
            "archetype": atm.archetype,
            "description": atm.description,
            "generator_bpm": atm.generator_bpm,
            "generator_key": atm.generator_key,
            "generator_scale": atm.generator_scale,
            "generator_complexity": atm.generator_complexity,
            "scene_count": scene_count,
            "chapter_count": chapter_count,
            "book_count": book_count,
        })

    return results


@router.get("/atmospheres/{atmosphere_id}")
async def get_atmosphere(
    atmosphere_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get single atmosphere with full music definitions and assignment info."""
    atm = session.get(Atmosphere, atmosphere_id)
    if not atm:
        raise HTTPException(status_code=404, detail="Atmosphere not found")

    # Get assigned scenes
    scene_rows = session.exec(
        select(SceneGameplayData.scene_id).where(
            SceneGameplayData.atmosphere_id == atmosphere_id
        )
    ).all()

    # Get assigned chapters
    chapter_rows = session.exec(
        select(Chapter.id, Chapter.title).where(Chapter.atmosphere_id == atmosphere_id)
    ).all()

    # Get assigned books
    book_rows = session.exec(
        select(Book.id, Book.title).where(Book.atmosphere_id == atmosphere_id)
    ).all()

    return {
        "id": atm.id,
        "name": atm.name,
        "archetype": atm.archetype,
        "description": atm.description,
        "music_definitions": atm.music_definitions,
        "generator_bpm": atm.generator_bpm,
        "generator_key": atm.generator_key,
        "generator_scale": atm.generator_scale,
        "generator_complexity": atm.generator_complexity,
        "generator_seed": atm.generator_seed,
        "assigned_scene_ids": list(scene_rows),
        "assigned_chapters": [{"id": c[0], "title": c[1]} for c in chapter_rows],
        "assigned_books": [{"id": b[0], "title": b[1]} for b in book_rows],
    }


@router.post("/atmospheres", status_code=201)
async def create_atmosphere(
    body: AtmosphereCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new atmosphere."""
    existing = session.exec(
        select(Atmosphere).where(Atmosphere.name == body.name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Atmosphere '{body.name}' already exists")

    now = datetime.now(timezone.utc)
    atm = Atmosphere(
        name=body.name,
        archetype=body.archetype,
        description=body.description,
        music_definitions=body.music_definitions,
        generator_bpm=body.generator_bpm,
        generator_key=body.generator_key,
        generator_scale=body.generator_scale,
        generator_complexity=body.generator_complexity,
        generator_seed=body.generator_seed,
        created_at=now,
        updated_at=now,
    )
    session.add(atm)
    session.commit()
    session.refresh(atm)

    write_audit_log(
        session, admin["email"], "create_atmosphere", "atmosphere",
        str(atm.id), {"name": atm.name, "archetype": atm.archetype},
        get_client_ip(request),
    )

    return {"id": atm.id, "name": atm.name}


@router.put("/atmospheres/{atmosphere_id}")
async def update_atmosphere(
    atmosphere_id: int,
    body: AtmosphereUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an atmosphere."""
    atm = session.get(Atmosphere, atmosphere_id)
    if not atm:
        raise HTTPException(status_code=404, detail="Atmosphere not found")

    changes = {}
    for field in body.model_fields_set:
        val = getattr(body, field)
        setattr(atm, field, val)
        changes[field] = val if not isinstance(val, dict) else "<json>"

    atm.updated_at = datetime.now(timezone.utc)
    session.add(atm)
    session.commit()
    session.refresh(atm)

    write_audit_log(
        session, admin["email"], "update_atmosphere", "atmosphere",
        str(atmosphere_id), changes, get_client_ip(request),
    )

    return {"id": atm.id, "name": atm.name, "updated_fields": list(changes.keys())}


@router.delete("/atmospheres/{atmosphere_id}")
async def delete_atmosphere(
    atmosphere_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete an atmosphere only if not referenced."""
    atm = session.get(Atmosphere, atmosphere_id)
    if not atm:
        raise HTTPException(status_code=404, detail="Atmosphere not found")

    # Check references
    scene_refs = session.exec(
        select(func.count()).where(SceneGameplayData.atmosphere_id == atmosphere_id)
    ).one()
    chapter_refs = session.exec(
        select(func.count()).where(Chapter.atmosphere_id == atmosphere_id)
    ).one()
    book_refs = session.exec(
        select(func.count()).where(Book.atmosphere_id == atmosphere_id)
    ).one()

    total = scene_refs + chapter_refs + book_refs
    if total > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: atmosphere is referenced by {scene_refs} scenes, {chapter_refs} chapters, {book_refs} books",
        )

    name = atm.name
    session.delete(atm)
    session.commit()

    write_audit_log(
        session, admin["email"], "delete_atmosphere", "atmosphere",
        str(atmosphere_id), {"name": name}, get_client_ip(request),
    )

    return {"deleted": True}


@router.put("/atmospheres/{atmosphere_id}/music")
async def update_music_definitions(
    atmosphere_id: int,
    body: MusicDefinitionsUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Replace the music_definitions JSON for an atmosphere."""
    atm = session.get(Atmosphere, atmosphere_id)
    if not atm:
        raise HTTPException(status_code=404, detail="Atmosphere not found")

    atm.music_definitions = body.music_definitions
    atm.updated_at = datetime.now(timezone.utc)
    session.add(atm)
    session.commit()

    write_audit_log(
        session, admin["email"], "update_atmosphere_music", "atmosphere",
        str(atmosphere_id), {"name": atm.name}, get_client_ip(request),
    )

    return {"id": atm.id, "name": atm.name, "updated": True}


@router.post("/atmospheres/batch-assign")
async def batch_assign_atmosphere(
    body: BatchAssignBody,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Assign an atmosphere to all scenes in a chapter or book."""
    # Verify atmosphere exists
    atm = session.get(Atmosphere, body.atmosphere_id)
    if not atm:
        raise HTTPException(status_code=404, detail="Atmosphere not found")

    if body.target_type == "chapter":
        chapter = session.get(Chapter, body.target_id)
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")

        scenes = session.exec(
            select(Scene).where(Scene.chapter_id == body.target_id)
        ).all()

        updated = 0
        for scene in scenes:
            sgd = session.exec(
                select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)
            ).first()
            if sgd:
                sgd.atmosphere_id = body.atmosphere_id
                session.add(sgd)
            else:
                sgd = SceneGameplayData(
                    scene_id=scene.id,
                    atmosphere_id=body.atmosphere_id,
                )
                session.add(sgd)
            updated += 1

        session.commit()

        write_audit_log(
            session, admin["email"], "batch_assign_atmosphere", "chapter",
            str(body.target_id),
            {"atmosphere_id": body.atmosphere_id, "atmosphere_name": atm.name, "scenes_updated": updated},
            get_client_ip(request),
        )

        return {"target_type": "chapter", "target_id": body.target_id, "scenes_updated": updated}

    elif body.target_type == "book":
        book = session.get(Book, body.target_id)
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        chapters = session.exec(
            select(Chapter).where(Chapter.book_id == body.target_id)
        ).all()

        updated = 0
        for chapter in chapters:
            scenes = session.exec(
                select(Scene).where(Scene.chapter_id == chapter.id)
            ).all()
            for scene in scenes:
                sgd = session.exec(
                    select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)
                ).first()
                if sgd:
                    sgd.atmosphere_id = body.atmosphere_id
                    session.add(sgd)
                else:
                    sgd = SceneGameplayData(
                        scene_id=scene.id,
                        atmosphere_id=body.atmosphere_id,
                    )
                    session.add(sgd)
                updated += 1

        session.commit()

        write_audit_log(
            session, admin["email"], "batch_assign_atmosphere", "book",
            str(body.target_id),
            {"atmosphere_id": body.atmosphere_id, "atmosphere_name": atm.name, "scenes_updated": updated},
            get_client_ip(request),
        )

        return {"target_type": "book", "target_id": body.target_id, "scenes_updated": updated}

    else:
        raise HTTPException(status_code=400, detail="target_type must be 'chapter' or 'book'")


# ---------------------------------------------------------------------------
# Audio Config (SFX) management
# ---------------------------------------------------------------------------

@router.get("/audio-configs")
async def list_audio_configs(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all SFX audio configs."""
    configs = session.exec(select(AudioConfig).order_by(AudioConfig.id)).all()
    return [
        {
            "id": c.id,
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


@router.put("/audio-configs/{config_id}")
async def update_audio_config(
    config_id: int,
    body: AudioConfigUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an SFX config preset."""
    config = session.get(AudioConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Audio config not found")

    changes = {}
    for field in body.model_fields_set:
        val = getattr(body, field)
        setattr(config, field, val)
        changes[field] = val if not isinstance(val, dict) else "<json>"

    config.updated_at = datetime.now(timezone.utc)
    session.add(config)
    session.commit()
    session.refresh(config)

    write_audit_log(
        session, admin["email"], "update_audio_config", "audio_config",
        str(config_id), {"config_key": config.config_key, **changes},
        get_client_ip(request),
    )

    return {
        "id": config.id,
        "config_key": config.config_key,
        "updated_fields": list(changes.keys()),
    }
