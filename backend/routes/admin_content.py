"""Admin Content Editor routes (REC 5.2.1) — Books, Chapters, Scenes, Backgrounds, Wave Configs.

Endpoints:
  # Books
  GET    /api/admin/content/books                        — list all
  GET    /api/admin/content/books/{id}                   — get detail
  POST   /api/admin/content/books                        — create
  PATCH  /api/admin/content/books/{id}                   — update
  DELETE /api/admin/content/books/{id}                   — delete (409 if chapters)

  # Chapters
  GET    /api/admin/content/chapters                     — list (query: book_id, page, page_size)
  GET    /api/admin/content/chapters/{id}                — get detail
  POST   /api/admin/content/chapters                     — create
  PATCH  /api/admin/content/chapters/{id}                — update
  DELETE /api/admin/content/chapters/{id}                — delete (409 if scenes)

  # Scenes
  GET    /api/admin/content/scenes                       — list (query: chapter_id, scene_type, page, page_size)
  GET    /api/admin/content/scenes/{id}                  — get detail
  POST   /api/admin/content/scenes                       — create (auto-creates gameplay_data)
  PATCH  /api/admin/content/scenes/{id}                  — update (includes gameplay_data + boss_config)
  DELETE /api/admin/content/scenes/{id}                  — delete (409 if story_beats)

  # Backgrounds
  GET    /api/admin/content/backgrounds                  — list all
  GET    /api/admin/content/backgrounds/{id}             — get detail
  POST   /api/admin/content/backgrounds                  — create
  PATCH  /api/admin/content/backgrounds/{id}             — update
  DELETE /api/admin/content/backgrounds/{id}             — delete (409 if scenes reference)

  # Wave Configs
  GET    /api/admin/content/wave-configs/{scene_id}      — get config for scene
  PUT    /api/admin/content/wave-configs/{scene_id}      — upsert config
  DELETE /api/admin/content/wave-configs/{scene_id}      — delete config
  GET    /api/admin/content/wave-configs                  — list (query: chapter_id)
  POST   /api/admin/content/wave-configs/bulk-template   — apply template to chapter/book
  PATCH  /api/admin/content/wave-configs/bulk-multipliers — adjust multipliers
  POST   /api/admin/content/wave-configs/auto-populate/{scene_id} — auto-generate entity_pool
"""

import logging
from typing import Optional, Any, List

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_admin, get_client_ip
from services.admin_content_service import (
    list_books, get_book, create_book, update_book, delete_book,
    list_chapters, get_chapter, create_chapter, update_chapter, delete_chapter,
    list_scenes, get_scene, create_scene, update_scene, delete_scene,
    list_backgrounds, get_background, create_background, update_background, delete_background,
    get_wave_config, upsert_wave_config, delete_wave_config,
    list_wave_configs, apply_wave_template, bulk_adjust_multipliers,
    auto_populate_wave_config,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/content", tags=["admin-content"])


# ---------------------------------------------------------------------------
# Pydantic request bodies
# ---------------------------------------------------------------------------

# -- Books --

class BookCreate(BaseModel):
    book_number: int
    title: str
    source_file: str = ""
    transition_lore_text: Optional[str] = None
    recommended_level: Optional[int] = None
    min_level: Optional[int] = None
    atmosphere_id: Optional[int] = None


class BookUpdate(BaseModel):
    book_number: Optional[int] = None
    title: Optional[str] = None
    source_file: Optional[str] = None
    transition_lore_text: Optional[str] = None
    recommended_level: Optional[int] = None
    min_level: Optional[int] = None
    atmosphere_id: Optional[int] = None


# -- Chapters --

class ChapterCreate(BaseModel):
    book_id: int
    chapter_number: int
    title: Optional[str] = None
    raw_text: Optional[str] = None
    sort_order: Optional[int] = None
    processing_status: Optional[str] = "not_started"
    transition_lore_text: Optional[str] = None
    recommended_level: Optional[int] = None
    min_level: Optional[int] = None
    atmosphere_id: Optional[int] = None


class ChapterUpdate(BaseModel):
    book_id: Optional[int] = None
    chapter_number: Optional[int] = None
    title: Optional[str] = None
    raw_text: Optional[str] = None
    sort_order: Optional[int] = None
    processing_status: Optional[str] = None
    transition_lore_text: Optional[str] = None
    recommended_level: Optional[int] = None
    min_level: Optional[int] = None
    atmosphere_id: Optional[int] = None


# -- Scenes --

class GameplayDataPayload(BaseModel):
    required_time_seconds: Optional[int] = None
    background_sprite_key: Optional[str] = None
    background_id: Optional[int] = None
    is_boss_scene: Optional[bool] = None
    atmosphere_id: Optional[int] = None


class SceneCreate(BaseModel):
    chapter_id: int
    scene_number: int
    title: Optional[str] = None
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    sort_order: Optional[int] = None
    primary_location_id: Optional[int] = None
    has_hard_break: bool = False
    scene_type: str = "normal"
    boss_config: Optional[Any] = None
    gameplay_data: Optional[GameplayDataPayload] = None


class SceneUpdate(BaseModel):
    chapter_id: Optional[int] = None
    scene_number: Optional[int] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    raw_text: Optional[str] = None
    sort_order: Optional[int] = None
    primary_location_id: Optional[int] = None
    has_hard_break: Optional[bool] = None
    scene_type: Optional[str] = None
    boss_config: Optional[Any] = None
    gameplay_data: Optional[GameplayDataPayload] = None


# -- Backgrounds --

class BackgroundCreate(BaseModel):
    name: str
    description: Optional[str] = None
    background_key: str
    parallax_config: Optional[Any] = None
    time_of_day: Optional[str] = None
    mood: Optional[str] = None
    color_palette: Optional[Any] = None


class BackgroundUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    background_key: Optional[str] = None
    parallax_config: Optional[Any] = None
    time_of_day: Optional[str] = None
    mood: Optional[str] = None
    color_palette: Optional[Any] = None


# -- Wave Configs --

class WaveConfigUpsert(BaseModel):
    max_enemies_per_wave: Optional[int] = None
    wave_count: Optional[int] = None
    spawn_interval_ms: Optional[int] = None
    scaling_factor: Optional[float] = None
    hp_multiplier: Optional[float] = None
    gold_multiplier: Optional[float] = None
    entity_pool: Optional[List[Any]] = None
    boss_entity_id: Optional[int] = None


class WaveTemplateBulk(BaseModel):
    scope: str  # "chapter" or "book"
    scope_id: int
    template: dict = {}
    scaling_increment: float = 0.0
    overwrite: bool = False


class WaveMultiplierBulk(BaseModel):
    scene_ids: List[int]
    hp_multiplier_delta: float = 0.0
    gold_multiplier_delta: float = 0.0


# ===========================================================================
#  BOOK ENDPOINTS
# ===========================================================================

@router.get("/books")
async def api_list_books(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all books with chapter/scene counts and atmosphere name."""
    return list_books(session)


@router.get("/books/{book_id}")
async def api_get_book(
    book_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get a single book with counts."""
    result = get_book(session, book_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return result


@router.post("/books", status_code=201)
async def api_create_book(
    body: BookCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new book."""
    try:
        return create_book(
            session,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/books/{book_id}")
async def api_update_book(
    book_id: int,
    body: BookUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Partial update of a book."""
    try:
        result = update_book(
            session, book_id,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return result


@router.delete("/books/{book_id}")
async def api_delete_book(
    book_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a book. Returns 409 if chapters exist."""
    result = delete_book(
        session, book_id,
        admin.get("email", "unknown"),
        get_client_ip(request),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if result.get("blocked"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {result['child_count']} {result['child_type']} reference this book",
        )
    return {"ok": True}


# ===========================================================================
#  CHAPTER ENDPOINTS
# ===========================================================================

@router.get("/chapters")
async def api_list_chapters(
    book_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Paginated chapter list with book info and counts."""
    return list_chapters(session, book_id=book_id, page=page, page_size=page_size)


@router.get("/chapters/{chapter_id}")
async def api_get_chapter(
    chapter_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get a single chapter with full detail including raw_text."""
    result = get_chapter(session, chapter_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return result


@router.post("/chapters", status_code=201)
async def api_create_chapter(
    body: ChapterCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new chapter."""
    try:
        return create_chapter(
            session,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/chapters/{chapter_id}")
async def api_update_chapter(
    chapter_id: int,
    body: ChapterUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Partial update of a chapter."""
    try:
        result = update_chapter(
            session, chapter_id,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return result


@router.delete("/chapters/{chapter_id}")
async def api_delete_chapter(
    chapter_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a chapter. Returns 409 if scenes exist."""
    result = delete_chapter(
        session, chapter_id,
        admin.get("email", "unknown"),
        get_client_ip(request),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if result.get("blocked"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {result['child_count']} {result['child_type']} reference this chapter",
        )
    return {"ok": True}


# ===========================================================================
#  SCENE ENDPOINTS
# ===========================================================================

@router.get("/scenes")
async def api_list_scenes(
    chapter_id: Optional[int] = Query(None),
    scene_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Paginated scene list with chapter/book info and gameplay data inline."""
    return list_scenes(
        session, chapter_id=chapter_id, scene_type=scene_type,
        page=page, page_size=page_size,
    )


@router.get("/scenes/{scene_id}")
async def api_get_scene(
    scene_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get full scene detail with gameplay_data and boss_config."""
    result = get_scene(session, scene_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return result


@router.post("/scenes", status_code=201)
async def api_create_scene(
    body: SceneCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new scene. Auto-creates SceneGameplayData if gameplay_data provided."""
    payload = body.model_dump(exclude_unset=True)
    # Convert nested model to dict
    if "gameplay_data" in payload and payload["gameplay_data"] is not None:
        if isinstance(payload["gameplay_data"], BaseModel):
            payload["gameplay_data"] = payload["gameplay_data"].model_dump(exclude_unset=True)
    try:
        return create_scene(
            session, payload,
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/scenes/{scene_id}")
async def api_update_scene(
    scene_id: int,
    body: SceneUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update scene core fields + gameplay_data + boss_config in one call."""
    payload = body.model_dump(exclude_unset=True)
    if "gameplay_data" in payload and payload["gameplay_data"] is not None:
        if isinstance(payload["gameplay_data"], BaseModel):
            payload["gameplay_data"] = payload["gameplay_data"].model_dump(exclude_unset=True)
    try:
        result = update_scene(
            session, scene_id, payload,
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    return result


@router.delete("/scenes/{scene_id}")
async def api_delete_scene(
    scene_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a scene. Returns 409 if story_beats exist."""
    result = delete_scene(
        session, scene_id,
        admin.get("email", "unknown"),
        get_client_ip(request),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Scene not found")
    if result.get("blocked"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {result['child_count']} {result['child_type']} reference this scene",
        )
    return {"ok": True}


# ===========================================================================
#  BACKGROUND ENDPOINTS
# ===========================================================================

@router.get("/backgrounds")
async def api_list_backgrounds(
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all backgrounds with scene_count and asset_exists flag."""
    return list_backgrounds(session)


@router.get("/backgrounds/{bg_id}")
async def api_get_background(
    bg_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get a single background detail."""
    result = get_background(session, bg_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Background not found")
    return result


@router.post("/backgrounds", status_code=201)
async def api_create_background(
    body: BackgroundCreate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new background."""
    try:
        return create_background(
            session,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.patch("/backgrounds/{bg_id}")
async def api_update_background(
    bg_id: int,
    body: BackgroundUpdate,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Partial update of a background."""
    try:
        result = update_background(
            session, bg_id,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Background not found")
    return result


@router.delete("/backgrounds/{bg_id}")
async def api_delete_background(
    bg_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a background. Returns 409 if scenes reference it."""
    result = delete_background(
        session, bg_id,
        admin.get("email", "unknown"),
        get_client_ip(request),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Background not found")
    if result.get("blocked"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {result['child_count']} {result['child_type']} reference this background",
        )
    return {"ok": True}


# ===========================================================================
#  WAVE CONFIG ENDPOINTS
# ===========================================================================

# NOTE: Bulk routes MUST be registered BEFORE parameterized routes to avoid
# FastAPI matching "bulk-template" as a {scene_id} parameter.

@router.get("/wave-configs", name="list_wave_configs")
async def api_list_wave_configs(
    chapter_id: int = Query(...),
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all wave configs for scenes in a chapter."""
    return list_wave_configs(session, chapter_id)


@router.post("/wave-configs/bulk-template")
async def api_apply_wave_template(
    body: WaveTemplateBulk,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Apply a wave config template to all normal scenes in a chapter or book."""
    try:
        return apply_wave_template(
            session,
            body.model_dump(),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/wave-configs/bulk-multipliers")
async def api_bulk_adjust_multipliers(
    body: WaveMultiplierBulk,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Adjust HP/gold multipliers for selected scenes."""
    try:
        return bulk_adjust_multipliers(
            session,
            body.model_dump(),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wave-configs/auto-populate/{scene_id}")
async def api_auto_populate_wave_config(
    scene_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Auto-generate entity_pool from entity_scene_appearances."""
    try:
        return auto_populate_wave_config(
            session, scene_id,
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wave-configs/{scene_id}")
async def api_get_wave_config(
    scene_id: int,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get wave config for a scene."""
    result = get_wave_config(session, scene_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Wave config not found for this scene")
    return result


@router.put("/wave-configs/{scene_id}")
async def api_upsert_wave_config(
    scene_id: int,
    body: WaveConfigUpsert,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create or update wave config for a scene."""
    try:
        return upsert_wave_config(
            session, scene_id,
            body.model_dump(exclude_unset=True),
            admin.get("email", "unknown"),
            get_client_ip(request),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/wave-configs/{scene_id}")
async def api_delete_wave_config(
    scene_id: int,
    request: Request,
    admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete wave config for a scene."""
    result = delete_wave_config(
        session, scene_id,
        admin.get("email", "unknown"),
        get_client_ip(request),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Wave config not found for this scene")
    return {"ok": True}
