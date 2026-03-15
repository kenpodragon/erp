"""Admin Classification routes (REC 5.3) — Entity Types, Entity Families, Visual Behaviors, Attack Types.

Endpoints:
  # Entity Types
  GET    /api/admin/classification/entity-types              — list all
  POST   /api/admin/classification/entity-types              — create
  PATCH  /api/admin/classification/entity-types/{type_id}    — update
  DELETE /api/admin/classification/entity-types/{type_id}    — delete (409 if entities)

  # Entity Families
  GET    /api/admin/classification/entity-families                    — list (query: search, page, page_size)
  POST   /api/admin/classification/entity-families                    — create
  PATCH  /api/admin/classification/entity-families/{family_id}        — update
  DELETE /api/admin/classification/entity-families/{family_id}        — delete (409 if entities)

  # Visual Behaviors
  GET    /api/admin/classification/visual-behaviors                       — list all
  POST   /api/admin/classification/visual-behaviors                       — create
  PATCH  /api/admin/classification/visual-behaviors/{behavior_id}         — update
  DELETE /api/admin/classification/visual-behaviors/{behavior_id}         — delete (409 if attack types)

  # Attack Types (Extended)
  GET    /api/admin/classification/attack-types                           — list all (extended)
  PATCH  /api/admin/classification/attack-types/{attack_type_id}          — update (extended)

  # Bulk Assignment
  GET    /api/admin/classification/bulk-assign/entities                   — search entities for bulk panel
  POST   /api/admin/classification/bulk-assign                            — bulk assign classification

  # Audit
  GET    /api/admin/classification/audit                                  — audit summary + incomplete entities

  # Template Application
  POST   /api/admin/classification/apply-template                         — preview/apply stat templates
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session

from db import get_session
from auth import get_current_admin
from services.admin_classification_service import (
    list_entity_types,
    create_entity_type,
    update_entity_type,
    delete_entity_type,
    list_entity_families,
    create_entity_family,
    update_entity_family,
    delete_entity_family,
    list_visual_behaviors,
    create_visual_behavior,
    update_visual_behavior,
    delete_visual_behavior,
    list_attack_types_extended,
    update_attack_type_extended,
    search_entities_for_bulk,
    bulk_assign,
    get_audit_summary,
    apply_template,
)

router = APIRouter(prefix="/api/admin/classification", tags=["admin-classification"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class EntityTypeCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color_hex: Optional[str] = None
    sort_order: Optional[int] = None


class EntityTypeUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    color_hex: Optional[str] = None
    sort_order: Optional[int] = None


class EntityFamilyCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    icon_key: Optional[str] = None
    lore_reference: Optional[str] = None
    base_stat_template: Optional[dict] = None
    sort_order: Optional[int] = None


class EntityFamilyUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    icon_key: Optional[str] = None
    lore_reference: Optional[str] = None
    base_stat_template: Optional[dict] = None
    sort_order: Optional[int] = None


class VisualBehaviorCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    animation_config: dict = {}
    sort_order: Optional[int] = None


class VisualBehaviorUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    animation_config: Optional[dict] = None
    stat_weights: Optional[dict] = None
    sort_order: Optional[int] = None


class AttackTypeExtendedUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_physical: Optional[bool] = None
    lore_reference: Optional[str] = None
    visual_behavior_id: Optional[int] = None
    stat_multipliers: Optional[dict] = None


class BulkAssignRequest(BaseModel):
    entity_ids: list[int]
    action: str  # assign_type, assign_family, create_family, add_attack_types, replace_attack_types, set_primary
    payload: dict


class TemplateApplyRequest(BaseModel):
    entity_ids: list[int]
    preview_only: bool = True


# ===========================================================================
#  ENTITY TYPES
# ===========================================================================

@router.get("/entity-types")
def get_entity_types(
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_entity_types(session)


@router.post("/entity-types", status_code=201)
def post_entity_type(
    body: EntityTypeCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_entity_type(session, body.model_dump())


@router.patch("/entity-types/{type_id}")
def patch_entity_type(
    type_id: int,
    body: EntityTypeUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_entity_type(session, type_id, body.model_dump(exclude_unset=True))


@router.delete("/entity-types/{type_id}", status_code=204)
def remove_entity_type(
    type_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_entity_type(session, type_id)


# ===========================================================================
#  ENTITY FAMILIES
# ===========================================================================

@router.get("/entity-families")
def get_entity_families(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_entity_families(session, search=search, page=page, page_size=page_size)


@router.post("/entity-families", status_code=201)
def post_entity_family(
    body: EntityFamilyCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_entity_family(session, body.model_dump())


@router.patch("/entity-families/{family_id}")
def patch_entity_family(
    family_id: int,
    body: EntityFamilyUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_entity_family(session, family_id, body.model_dump(exclude_unset=True))


@router.delete("/entity-families/{family_id}", status_code=204)
def remove_entity_family(
    family_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_entity_family(session, family_id)


# ===========================================================================
#  VISUAL BEHAVIORS
# ===========================================================================

@router.get("/visual-behaviors")
def get_visual_behaviors(
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_visual_behaviors(session)


@router.post("/visual-behaviors", status_code=201)
def post_visual_behavior(
    body: VisualBehaviorCreate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return create_visual_behavior(session, body.model_dump())


@router.patch("/visual-behaviors/{behavior_id}")
def patch_visual_behavior(
    behavior_id: int,
    body: VisualBehaviorUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_visual_behavior(session, behavior_id, body.model_dump(exclude_unset=True))


@router.delete("/visual-behaviors/{behavior_id}", status_code=204)
def remove_visual_behavior(
    behavior_id: int,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    delete_visual_behavior(session, behavior_id)


# ===========================================================================
#  ATTACK TYPES (Extended)
# ===========================================================================

@router.get("/attack-types")
def get_attack_types_extended(
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return list_attack_types_extended(session)


@router.patch("/attack-types/{attack_type_id}")
def patch_attack_type_extended(
    attack_type_id: int,
    body: AttackTypeExtendedUpdate,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return update_attack_type_extended(session, attack_type_id, body.model_dump(exclude_unset=True))


# ===========================================================================
#  BULK ASSIGNMENT
# ===========================================================================

@router.get("/bulk-assign/entities")
def get_bulk_assign_entities(
    search: Optional[str] = Query(None),
    entity_type_id: Optional[int] = Query(None),
    entity_family_id: Optional[int] = Query(None),
    has_attack_types: Optional[bool] = Query(None),
    has_stat_block: Optional[bool] = Query(None),
    book_id: Optional[int] = Query(None),
    chapter_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return search_entities_for_bulk(
        session, search=search, entity_type_id=entity_type_id,
        entity_family_id=entity_family_id, has_attack_types=has_attack_types,
        has_stat_block=has_stat_block, book_id=book_id, chapter_id=chapter_id,
        page=page, page_size=page_size,
    )


@router.post("/bulk-assign")
def post_bulk_assign(
    body: BulkAssignRequest,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return bulk_assign(session, body.entity_ids, body.action, body.payload)


# ===========================================================================
#  AUDIT
# ===========================================================================

@router.get("/audit")
def get_audit(
    missing: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return get_audit_summary(session, missing=missing, search=search, page=page, page_size=page_size)


# ===========================================================================
#  TEMPLATE APPLICATION
# ===========================================================================

@router.post("/apply-template")
def post_apply_template(
    body: TemplateApplyRequest,
    _admin: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    return apply_template(session, body.entity_ids, body.preview_only)
