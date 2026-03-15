"""Admin Scaling routes (REC 5.4) — Wave Presets, Difficulty Curves, Difficulty Presets.

Endpoints:
  # Wave Presets
  GET    /api/admin/scaling/wave-presets                              — list all
  POST   /api/admin/scaling/wave-presets                              — create
  PATCH  /api/admin/scaling/wave-presets/{id}                         — update
  DELETE /api/admin/scaling/wave-presets/{id}                         — delete (409 if referenced)
  GET    /api/admin/scaling/wave-presets/{id}/assignments             — list assignments
  POST   /api/admin/scaling/wave-presets/{id}/assignments             — create assignment
  DELETE /api/admin/scaling/wave-presets/assignments/{assignment_id}  — delete assignment
  POST   /api/admin/scaling/wave-presets/{id}/apply-to-scenes        — bulk apply to scenes

  # Difficulty Curves
  GET    /api/admin/scaling/difficulty-curves                         — list all
  POST   /api/admin/scaling/difficulty-curves                         — create
  PATCH  /api/admin/scaling/difficulty-curves/{id}                    — update
  DELETE /api/admin/scaling/difficulty-curves/{id}                    — delete (409 if referenced)
  PATCH  /api/admin/scaling/difficulty-curves/{id}/assign-book        — assign/unassign book

  # Difficulty Presets
  GET    /api/admin/scaling/presets                                   — list all
  POST   /api/admin/scaling/presets                                   — create
  PATCH  /api/admin/scaling/presets/{id}                              — update
  DELETE /api/admin/scaling/presets/{id}                              — delete (409 if active)
  GET    /api/admin/scaling/presets/capture-current                   — capture current config
  POST   /api/admin/scaling/presets/{id}/apply                        — apply preset
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_admin
from services.admin_scaling_service import (
    list_wave_presets,
    create_wave_preset,
    update_wave_preset,
    delete_wave_preset,
    list_wave_preset_assignments,
    create_wave_preset_assignment,
    delete_wave_preset_assignment,
    apply_preset_to_scenes,
    list_difficulty_curves,
    create_difficulty_curve,
    update_difficulty_curve,
    delete_difficulty_curve,
    assign_curve_to_book,
    list_difficulty_presets,
    create_difficulty_preset,
    update_difficulty_preset,
    delete_difficulty_preset,
    capture_current_config,
    apply_preset,
)

router = APIRouter(prefix="/api/admin/scaling", tags=["admin-scaling"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class WavePresetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    config: dict = {}
    is_default: bool = False
    sort_order: Optional[int] = None


class WavePresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[dict] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


class WavePresetAssignCreate(BaseModel):
    book_id: Optional[int] = None
    chapter_id: Optional[int] = None


class ApplyToScenesRequest(BaseModel):
    target: str
    target_id: int
    overwrite_existing: bool = False


class DifficultyCurveCreate(BaseModel):
    name: str
    description: Optional[str] = None
    curve_data: dict = {}
    is_default: bool = False
    sort_order: Optional[int] = None


class DifficultyCurveUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    curve_data: Optional[dict] = None
    is_default: Optional[bool] = None
    sort_order: Optional[int] = None


class AssignBookRequest(BaseModel):
    book_id: int
    unassign: bool = False


class DifficultyPresetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    difficulty_curve_id: Optional[int] = None
    wave_preset_id: Optional[int] = None
    config_snapshot: Optional[dict] = None


class DifficultyPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    difficulty_curve_id: Optional[int] = None
    wave_preset_id: Optional[int] = None
    config_snapshot: Optional[dict] = None


# ===========================================================================
#  WAVE PRESETS
# ===========================================================================

@router.get("/wave-presets")
def get_wave_presets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_wave_presets(session, page=page, page_size=page_size)


@router.post("/wave-presets", status_code=201)
def post_wave_preset(
    body: WavePresetCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_wave_preset(session, body.model_dump())


@router.patch("/wave-presets/{preset_id}")
def patch_wave_preset(
    preset_id: int,
    body: WavePresetUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_wave_preset(session, preset_id, body.model_dump(exclude_unset=True))


@router.delete("/wave-presets/{preset_id}", status_code=204)
def remove_wave_preset(
    preset_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_wave_preset(session, preset_id)


@router.get("/wave-presets/{preset_id}/assignments")
def get_wave_preset_assignments(
    preset_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_wave_preset_assignments(session, preset_id)


@router.post("/wave-presets/{preset_id}/assignments", status_code=201)
def post_wave_preset_assignment(
    preset_id: int,
    body: WavePresetAssignCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_wave_preset_assignment(session, preset_id, body.model_dump())


@router.delete("/wave-presets/assignments/{assignment_id}", status_code=204)
def remove_wave_preset_assignment(
    assignment_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_wave_preset_assignment(session, assignment_id)


@router.post("/wave-presets/{preset_id}/apply-to-scenes")
def post_apply_to_scenes(
    preset_id: int,
    body: ApplyToScenesRequest,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return apply_preset_to_scenes(session, preset_id, body.model_dump())


# ===========================================================================
#  DIFFICULTY CURVES
# ===========================================================================

@router.get("/difficulty-curves")
def get_difficulty_curves(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_difficulty_curves(session, page=page, page_size=page_size)


@router.post("/difficulty-curves", status_code=201)
def post_difficulty_curve(
    body: DifficultyCurveCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_difficulty_curve(session, body.model_dump())


@router.patch("/difficulty-curves/{curve_id}")
def patch_difficulty_curve(
    curve_id: int,
    body: DifficultyCurveUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_difficulty_curve(session, curve_id, body.model_dump(exclude_unset=True))


@router.delete("/difficulty-curves/{curve_id}", status_code=204)
def remove_difficulty_curve(
    curve_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_difficulty_curve(session, curve_id)


@router.patch("/difficulty-curves/{curve_id}/assign-book")
def patch_assign_book(
    curve_id: int,
    body: AssignBookRequest,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return assign_curve_to_book(session, curve_id, body.model_dump())


# ===========================================================================
#  DIFFICULTY PRESETS
# ===========================================================================

@router.get("/presets")
def get_presets(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_difficulty_presets(session, page=page, page_size=page_size)


@router.post("/presets", status_code=201)
def post_preset(
    body: DifficultyPresetCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_difficulty_preset(session, body.model_dump())


@router.patch("/presets/{preset_id}")
def patch_preset(
    preset_id: int,
    body: DifficultyPresetUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_difficulty_preset(session, preset_id, body.model_dump(exclude_unset=True))


@router.delete("/presets/{preset_id}", status_code=204)
def remove_preset(
    preset_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_difficulty_preset(session, preset_id)


@router.get("/presets/capture-current")
def get_capture_current(
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return capture_current_config(session)


@router.post("/presets/{preset_id}/apply")
def post_apply_preset(
    preset_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return apply_preset(session, preset_id)
