"""Admin content editor routes for Locations and Location-Scene Appearances (REC 5.2.3).

Endpoints:
  GET    /api/admin/content/locations              — list with filters + aggregates
  GET    /api/admin/content/locations/types         — distinct location_type values
  GET    /api/admin/content/locations/{id}          — full detail (aliases + scenes inline)
  POST   /api/admin/content/locations               — create location
  PATCH  /api/admin/content/locations/{id}          — update location
  DELETE /api/admin/content/locations/{id}          — delete (blocked if referenced)
  POST   /api/admin/content/locations/{id}/aliases          — add alias
  DELETE /api/admin/content/locations/{id}/aliases/{alias_id} — remove alias

  GET    /api/admin/content/location-scenes         — list (filter by location_id or scene_id)
  POST   /api/admin/content/location-scenes         — create (unique location+scene)
  PATCH  /api/admin/content/location-scenes/{id}    — update delta fields
  DELETE /api/admin/content/location-scenes/{id}    — delete
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_admin, get_client_ip
from audit import write_audit_log
from services.admin_content_location_service import (
    list_locations,
    get_location_detail,
    get_distinct_location_types,
    create_location,
    update_location,
    delete_location,
    add_location_alias,
    delete_location_alias,
    list_location_scenes,
    create_location_scene,
    update_location_scene,
    delete_location_scene,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/content", tags=["admin-content-locations"])


# ---------------------------------------------------------------------------
# Pydantic request bodies
# ---------------------------------------------------------------------------

class LocationCreate(BaseModel):
    canonical_name: str
    description: Optional[str] = None
    location_type: Optional[str] = None
    base_visual: Optional[str] = None
    base_auditory: Optional[str] = None
    base_olfactory: Optional[str] = None
    base_tactile: Optional[str] = None
    base_atmosphere: Optional[str] = None
    first_appearance_scene_id: Optional[int] = None
    archetype_id: Optional[int] = None


class LocationUpdate(BaseModel):
    canonical_name: Optional[str] = None
    description: Optional[str] = None
    location_type: Optional[str] = None
    base_visual: Optional[str] = None
    base_auditory: Optional[str] = None
    base_olfactory: Optional[str] = None
    base_tactile: Optional[str] = None
    base_atmosphere: Optional[str] = None
    first_appearance_scene_id: Optional[int] = None
    archetype_id: Optional[int] = None


class AliasCreate(BaseModel):
    alias: str
    context: Optional[str] = None


class LocationSceneCreate(BaseModel):
    location_id: int
    scene_id: int
    visual_delta: Optional[str] = None
    auditory_delta: Optional[str] = None
    olfactory_delta: Optional[str] = None
    tactile_delta: Optional[str] = None
    atmosphere_delta: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_id: Optional[str] = None


class LocationSceneUpdate(BaseModel):
    visual_delta: Optional[str] = None
    auditory_delta: Optional[str] = None
    olfactory_delta: Optional[str] = None
    tactile_delta: Optional[str] = None
    atmosphere_delta: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Location CRUD
# ---------------------------------------------------------------------------

@router.get("/locations")
async def api_list_locations(
    request: Request,
    location_type: Optional[str] = Query(None),
    has_archetype: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List locations with filters, pagination, and aggregated counts."""
    return list_locations(
        session,
        location_type=location_type,
        has_archetype=has_archetype,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/locations/types")
async def api_location_types(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return distinct location_type values for filter dropdowns."""
    return get_distinct_location_types(session)


@router.get("/locations/{location_id}")
async def api_get_location(
    location_id: int,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Get full location detail with aliases and scene appearances."""
    result = get_location_detail(session, location_id)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result


@router.post("/locations", status_code=201)
async def api_create_location(
    body: LocationCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new location."""
    try:
        loc = create_location(session, body.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_created",
        target_type="location",
        target_id=str(loc.id),
        details={"canonical_name": loc.canonical_name},
        ip_address=get_client_ip(request),
    )
    return get_location_detail(session, loc.id)


@router.patch("/locations/{location_id}")
async def api_update_location(
    location_id: int,
    body: LocationUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a location's fields."""
    try:
        loc = update_location(session, location_id, body.model_dump(exclude_unset=True))
    except LookupError:
        raise HTTPException(status_code=404, detail="Location not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_updated",
        target_type="location",
        target_id=str(location_id),
        details=body.model_dump(exclude_unset=True),
        ip_address=get_client_ip(request),
    )
    return get_location_detail(session, loc.id)


@router.delete("/locations/{location_id}")
async def api_delete_location(
    location_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a location. Blocked if referenced by scenes or appearances."""
    try:
        delete_location(session, location_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Location not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_deleted",
        target_type="location",
        target_id=str(location_id),
        ip_address=get_client_ip(request),
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Location Aliases
# ---------------------------------------------------------------------------

@router.post("/locations/{location_id}/aliases", status_code=201)
async def api_add_alias(
    location_id: int,
    body: AliasCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Add an alias to a location."""
    try:
        la = add_location_alias(session, location_id, body.alias, body.context)
    except LookupError:
        raise HTTPException(status_code=404, detail="Location not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_alias_added",
        target_type="location_alias",
        target_id=str(la.id),
        details={"location_id": location_id, "alias": body.alias},
        ip_address=get_client_ip(request),
    )
    return {"id": la.id, "alias": la.alias, "context": la.context}


@router.delete("/locations/{location_id}/aliases/{alias_id}")
async def api_delete_alias(
    location_id: int,
    alias_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Remove an alias from a location."""
    try:
        delete_location_alias(session, location_id, alias_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Alias not found")
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_alias_deleted",
        target_type="location_alias",
        target_id=str(alias_id),
        details={"location_id": location_id},
        ip_address=get_client_ip(request),
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Location-Scene Appearances
# ---------------------------------------------------------------------------

@router.get("/location-scenes")
async def api_list_location_scenes(
    location_id: Optional[int] = Query(None),
    scene_id: Optional[int] = Query(None),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List location-scene appearances filtered by location_id or scene_id."""
    return list_location_scenes(session, location_id=location_id, scene_id=scene_id)


@router.post("/location-scenes", status_code=201)
async def api_create_location_scene(
    body: LocationSceneCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a location-scene appearance (unique location+scene pair)."""
    try:
        lsa = create_location_scene(session, body.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_scene_created",
        target_type="location_scene_appearance",
        target_id=str(lsa.id),
        details={"location_id": body.location_id, "scene_id": body.scene_id},
        ip_address=get_client_ip(request),
    )
    return {
        "id": lsa.id,
        "location_id": lsa.location_id,
        "scene_id": lsa.scene_id,
        "visual_delta": lsa.visual_delta,
        "auditory_delta": lsa.auditory_delta,
        "olfactory_delta": lsa.olfactory_delta,
        "tactile_delta": lsa.tactile_delta,
        "atmosphere_delta": lsa.atmosphere_delta,
        "ai_provider": lsa.ai_provider,
        "ai_model_id": lsa.ai_model_id,
        "created_at": lsa.created_at.isoformat() if lsa.created_at else None,
        "updated_at": lsa.updated_at.isoformat() if lsa.updated_at else None,
    }


@router.patch("/location-scenes/{lsa_id}")
async def api_update_location_scene(
    lsa_id: int,
    body: LocationSceneUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update delta fields on a location-scene appearance."""
    try:
        lsa = update_location_scene(session, lsa_id, body.model_dump(exclude_unset=True))
    except LookupError:
        raise HTTPException(status_code=404, detail="Location-scene appearance not found")

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_scene_updated",
        target_type="location_scene_appearance",
        target_id=str(lsa_id),
        details=body.model_dump(exclude_unset=True),
        ip_address=get_client_ip(request),
    )
    return {
        "id": lsa.id,
        "location_id": lsa.location_id,
        "scene_id": lsa.scene_id,
        "visual_delta": lsa.visual_delta,
        "auditory_delta": lsa.auditory_delta,
        "olfactory_delta": lsa.olfactory_delta,
        "tactile_delta": lsa.tactile_delta,
        "atmosphere_delta": lsa.atmosphere_delta,
        "ai_provider": lsa.ai_provider,
        "ai_model_id": lsa.ai_model_id,
        "created_at": lsa.created_at.isoformat() if lsa.created_at else None,
        "updated_at": lsa.updated_at.isoformat() if lsa.updated_at else None,
    }


@router.delete("/location-scenes/{lsa_id}")
async def api_delete_location_scene(
    lsa_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a location-scene appearance."""
    try:
        delete_location_scene(session, lsa_id)
    except LookupError:
        raise HTTPException(status_code=404, detail="Location-scene appearance not found")

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="location_scene_deleted",
        target_type="location_scene_appearance",
        target_id=str(lsa_id),
        ip_address=get_client_ip(request),
    )
    return {"ok": True}
