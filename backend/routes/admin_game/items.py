"""Admin item components, gear slots, avatar options, and attack types CRUD."""

import logging
import os
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import (
    GearSlot, ItemPrefix, ItemQuality, ItemLoreTag, ItemTypeBase, ItemSuffix,
    AttackType, EntityAttackType, TypeBaseAttackType,
)
from audit import write_audit_log
from routes.admin_game.helpers import _row_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()

ITEM_COMPONENT_MAP: dict[str, type] = {
    "prefixes": ItemPrefix,
    "qualities": ItemQuality,
    "lore_tags": ItemLoreTag,
    "type_bases": ItemTypeBase,
    "suffixes": ItemSuffix,
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ItemComponentCreate(BaseModel):
    code: str
    display_name: str
    stat_bonuses: Optional[Any] = None
    lore_reference: Optional[str] = None
    narrative_context: Optional[str] = None
    gear_slot_id: Optional[int] = None
    base_stat_range: Optional[Any] = None


class ItemComponentUpdate(BaseModel):
    code: Optional[str] = None
    display_name: Optional[str] = None
    stat_bonuses: Optional[Any] = None
    lore_reference: Optional[str] = None
    narrative_context: Optional[str] = None
    gear_slot_id: Optional[int] = None
    base_stat_range: Optional[Any] = None


class AttackTypeCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    is_physical: bool = False
    lore_reference: Optional[str] = None


class AttackTypeUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_physical: Optional[bool] = None
    lore_reference: Optional[str] = None


class GearSlotCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    sort_order: int = 0


class GearSlotUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None


# ---------------------------------------------------------------------------
# Item Components CRUD
# ---------------------------------------------------------------------------

@router.get("/items/components")
async def list_item_components(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all item component types in one response."""
    result = {}
    for comp_name, model_cls in ITEM_COMPONENT_MAP.items():
        rows = session.exec(select(model_cls)).all()
        result[comp_name] = [_row_to_dict(r) for r in rows]
    return result


@router.post("/items/{component_type}", status_code=201)
async def create_item_component(
    component_type: str,
    body: ItemComponentCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new item component of the given type."""
    model_cls = ITEM_COMPONENT_MAP.get(component_type)
    if not model_cls:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid component type '{component_type}'. Must be one of: {list(ITEM_COMPONENT_MAP.keys())}",
        )

    now = datetime.now(timezone.utc)
    kwargs: dict[str, Any] = {"code": body.code, "display_name": body.display_name, "created_at": now}

    table_cols = {c.name for c in model_cls.__table__.columns}
    if "stat_bonuses" in table_cols and body.stat_bonuses is not None:
        kwargs["stat_bonuses"] = body.stat_bonuses
    if "lore_reference" in table_cols and body.lore_reference is not None:
        kwargs["lore_reference"] = body.lore_reference
    if "narrative_context" in table_cols and body.narrative_context is not None:
        kwargs["narrative_context"] = body.narrative_context
    if "gear_slot_id" in table_cols and body.gear_slot_id is not None:
        kwargs["gear_slot_id"] = body.gear_slot_id
    if "base_stat_range" in table_cols and body.base_stat_range is not None:
        kwargs["base_stat_range"] = body.base_stat_range
    if "updated_at" in table_cols:
        kwargs["updated_at"] = now

    component = model_cls(**kwargs)
    session.add(component)
    session.commit()
    session.refresh(component)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action=f"item_{component_type}_created",
        target_type=f"item_{component_type}",
        target_id=str(component.id),
        details={"code": body.code, "display_name": body.display_name},
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(component)


@router.patch("/items/{component_type}/{component_id}")
async def update_item_component(
    component_type: str,
    component_id: int,
    body: ItemComponentUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an item component."""
    model_cls = ITEM_COMPONENT_MAP.get(component_type)
    if not model_cls:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid component type '{component_type}'. Must be one of: {list(ITEM_COMPONENT_MAP.keys())}",
        )

    component = session.get(model_cls, component_id)
    if not component:
        raise HTTPException(status_code=404, detail=f"{component_type} component {component_id} not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True)
    table_cols = {c.name for c in model_cls.__table__.columns}

    for field, new_val in update_data.items():
        if field not in table_cols:
            continue
        old_val = getattr(component, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(component, field, new_val)

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    if "updated_at" in table_cols:
        component.updated_at = datetime.now(timezone.utc)
    session.add(component)
    session.commit()
    session.refresh(component)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action=f"item_{component_type}_updated",
        target_type=f"item_{component_type}",
        target_id=str(component_id),
        details=changes,
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(component)


@router.delete("/items/{component_type}/{component_id}")
async def delete_item_component(
    component_type: str,
    component_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete an item component."""
    model_cls = ITEM_COMPONENT_MAP.get(component_type)
    if not model_cls:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid component type '{component_type}'. Must be one of: {list(ITEM_COMPONENT_MAP.keys())}",
        )

    component = session.get(model_cls, component_id)
    if not component:
        raise HTTPException(status_code=404, detail=f"{component_type} component {component_id} not found")

    comp_code = getattr(component, "code", str(component_id))
    session.delete(component)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action=f"item_{component_type}_deleted",
        target_type=f"item_{component_type}",
        target_id=str(component_id),
        details={"code": comp_code},
        ip_address=get_client_ip(request),
    )

    return {"deleted": True, "id": component_id}


# ---------------------------------------------------------------------------
# Gear Slots
# ---------------------------------------------------------------------------

@router.get("/gear-slots")
async def list_gear_slots(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all gear slots for dropdown selectors."""
    rows = session.exec(select(GearSlot).order_by(GearSlot.sort_order)).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/gear-slots", status_code=201)
async def create_gear_slot(
    body: GearSlotCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new gear slot."""
    now = datetime.now(timezone.utc)
    gs = GearSlot(
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        sort_order=body.sort_order,
        created_at=now,
    )
    session.add(gs)
    session.commit()
    session.refresh(gs)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="gear_slot_created",
        target_type="gear_slot",
        target_id=str(gs.id),
        details={"name": gs.name},
        ip_address=get_client_ip(request),
    )
    return _row_to_dict(gs)


@router.patch("/gear-slots/{slot_id}")
async def update_gear_slot(
    slot_id: int,
    body: GearSlotUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a gear slot."""
    gs = session.get(GearSlot, slot_id)
    if not gs:
        raise HTTPException(status_code=404, detail="Gear slot not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True)
    for field, new_val in update_data.items():
        old_val = getattr(gs, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(gs, field, new_val)

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    session.add(gs)
    session.commit()
    session.refresh(gs)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="gear_slot_updated",
        target_type="gear_slot",
        target_id=str(slot_id),
        details=changes,
        ip_address=get_client_ip(request),
    )
    return _row_to_dict(gs)


@router.delete("/gear-slots/{slot_id}")
async def delete_gear_slot(
    slot_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a gear slot."""
    gs = session.get(GearSlot, slot_id)
    if not gs:
        raise HTTPException(status_code=404, detail="Gear slot not found")

    gs_name = gs.name
    session.delete(gs)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="gear_slot_deleted",
        target_type="gear_slot",
        target_id=str(slot_id),
        details={"name": gs_name},
        ip_address=get_client_ip(request),
    )
    return {"deleted": True, "id": slot_id}


# ---------------------------------------------------------------------------
# Avatar Options
# ---------------------------------------------------------------------------

@router.get("/avatar-options")
async def list_avatar_options(
    token: dict = Depends(get_current_admin),
):
    """List available avatar PNG files from the frontend public assets."""
    avatars_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend", "public", "assets", "avatars",
    )
    classes_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "frontend", "public", "assets", "game", "classes",
    )
    options = []
    for d, prefix in [(avatars_dir, "/assets/avatars/"), (classes_dir, "/assets/game/classes/")]:
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.lower().endswith((".png", ".jpg", ".svg")):
                    options.append({"path": prefix + f, "filename": f})
    return options


# ---------------------------------------------------------------------------
# Attack Types CRUD
# ---------------------------------------------------------------------------

@router.get("/attack-types")
async def list_attack_types(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all attack types."""
    rows = session.exec(select(AttackType).order_by(AttackType.name)).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/attack-types", status_code=201)
async def create_attack_type(
    body: AttackTypeCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new attack type."""
    now = datetime.now(timezone.utc)
    at = AttackType(
        name=body.name,
        display_name=body.display_name,
        description=body.description,
        is_physical=body.is_physical,
        lore_reference=body.lore_reference,
        created_at=now,
        updated_at=now,
    )
    session.add(at)
    session.commit()
    session.refresh(at)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="attack_type_created",
        target_type="attack_type",
        target_id=str(at.id),
        details={"name": at.name},
        ip_address=get_client_ip(request),
    )
    return _row_to_dict(at)


@router.patch("/attack-types/{attack_type_id}")
async def update_attack_type(
    attack_type_id: int,
    body: AttackTypeUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update an attack type."""
    at = session.get(AttackType, attack_type_id)
    if not at:
        raise HTTPException(status_code=404, detail="Attack type not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True)
    for field, new_val in update_data.items():
        old_val = getattr(at, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(at, field, new_val)

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    at.updated_at = datetime.now(timezone.utc)
    session.add(at)
    session.commit()
    session.refresh(at)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="attack_type_updated",
        target_type="attack_type",
        target_id=str(attack_type_id),
        details=changes,
        ip_address=get_client_ip(request),
    )
    return _row_to_dict(at)


@router.delete("/attack-types/{attack_type_id}")
async def delete_attack_type(
    attack_type_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete an attack type."""
    at = session.get(AttackType, attack_type_id)
    if not at:
        raise HTTPException(status_code=404, detail="Attack type not found")

    at_name = at.name
    session.delete(at)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="attack_type_deleted",
        target_type="attack_type",
        target_id=str(attack_type_id),
        details={"name": at_name},
        ip_address=get_client_ip(request),
    )
    return {"deleted": True, "id": attack_type_id}
