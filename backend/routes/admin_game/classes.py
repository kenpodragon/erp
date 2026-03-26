"""Admin character classes and stat definitions CRUD."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import StatDefinition, CharacterClass
from models.character_progression import ClassStatAffinity
from audit import write_audit_log
from routes.admin_game.helpers import _row_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class StatDefinitionCreate(BaseModel):
    name: str
    display_name: str
    value_type: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None


class StatDefinitionUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    value_type: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None


class ClassStatAffinityBody(BaseModel):
    stat_id: int
    base_value: int = 10
    lore_weight: float = 0.0
    level_bonus_per_level: float = 0.0


class CharacterClassCreate(BaseModel):
    name: str
    lore_blurb: Optional[str] = None
    base_strength: int = 10
    base_agility: int = 10
    base_intelligence: int = 10
    sprite_key: Optional[str] = None
    is_available: bool = True
    visual_config: Optional[dict] = None
    affinities: Optional[list[ClassStatAffinityBody]] = None


class CharacterClassUpdate(BaseModel):
    name: Optional[str] = None
    lore_blurb: Optional[str] = None
    base_strength: Optional[int] = None
    base_agility: Optional[int] = None
    base_intelligence: Optional[int] = None
    sprite_key: Optional[str] = None
    is_available: Optional[bool] = None
    visual_config: Optional[dict] = None
    affinities: Optional[list[ClassStatAffinityBody]] = None


# ---------------------------------------------------------------------------
# Stat Definitions CRUD
# ---------------------------------------------------------------------------

@router.get("/stats")
async def list_stat_definitions(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all stat_definitions."""
    rows = session.exec(select(StatDefinition)).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/stats", status_code=201)
async def create_stat_definition(
    body: StatDefinitionCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new stat definition."""
    now = datetime.now(timezone.utc)
    stat = StatDefinition(
        name=body.name,
        display_name=body.display_name,
        value_type=body.value_type,
        min_value=body.min_value,
        max_value=body.max_value,
        description=body.description,
        category=body.category,
        created_at=now,
        updated_at=now,
    )
    session.add(stat)
    session.commit()
    session.refresh(stat)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="stat_definition_created",
        target_type="stat_definition",
        target_id=str(stat.id),
        details={"name": stat.name},
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(stat)


@router.patch("/stats/{stat_id}")
async def update_stat_definition(
    stat_id: int,
    body: StatDefinitionUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a stat definition."""
    stat = session.get(StatDefinition, stat_id)
    if not stat:
        raise HTTPException(status_code=404, detail="Stat definition not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True)
    for field, new_val in update_data.items():
        old_val = getattr(stat, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(stat, field, new_val)

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    stat.updated_at = datetime.now(timezone.utc)
    session.add(stat)
    session.commit()
    session.refresh(stat)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="stat_definition_updated",
        target_type="stat_definition",
        target_id=str(stat.id),
        details=changes,
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(stat)


@router.delete("/stats/{stat_id}")
async def delete_stat_definition(
    stat_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a stat definition."""
    stat = session.get(StatDefinition, stat_id)
    if not stat:
        raise HTTPException(status_code=404, detail="Stat definition not found")

    stat_name = stat.name
    session.delete(stat)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="stat_definition_deleted",
        target_type="stat_definition",
        target_id=str(stat_id),
        details={"name": stat_name},
        ip_address=get_client_ip(request),
    )

    return {"deleted": True, "id": stat_id}


# ---------------------------------------------------------------------------
# Character Classes CRUD
# ---------------------------------------------------------------------------

@router.get("/classes")
async def list_character_classes(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List classes with class_stat_affinities and visual_config."""
    classes = session.exec(select(CharacterClass)).all()
    result = []
    for cls in classes:
        data = _row_to_dict(cls)
        affinities = session.exec(
            select(ClassStatAffinity).where(ClassStatAffinity.class_id == cls.id)
        ).all()
        data["affinities"] = [_row_to_dict(a) for a in affinities]
        result.append(data)
    return result


@router.post("/classes", status_code=201)
async def create_character_class(
    body: CharacterClassCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a character class with optional affinities and visual_config."""
    now = datetime.now(timezone.utc)
    cls = CharacterClass(
        name=body.name,
        lore_blurb=body.lore_blurb,
        base_strength=body.base_strength,
        base_agility=body.base_agility,
        base_intelligence=body.base_intelligence,
        sprite_key=body.sprite_key,
        is_available=body.is_available,
        visual_config=body.visual_config,
        created_at=now,
        updated_at=now,
    )
    session.add(cls)
    session.commit()
    session.refresh(cls)

    if body.affinities:
        for aff in body.affinities:
            row = ClassStatAffinity(
                class_id=cls.id,
                stat_id=aff.stat_id,
                base_value=aff.base_value,
                lore_weight=aff.lore_weight,
                level_bonus_per_level=aff.level_bonus_per_level,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="character_class_created",
        target_type="character_class",
        target_id=str(cls.id),
        details={"name": cls.name},
        ip_address=get_client_ip(request),
    )

    affinities = session.exec(
        select(ClassStatAffinity).where(ClassStatAffinity.class_id == cls.id)
    ).all()
    data = _row_to_dict(cls)
    data["affinities"] = [_row_to_dict(a) for a in affinities]
    return data


@router.patch("/classes/{class_id}")
async def update_character_class(
    class_id: int,
    body: CharacterClassUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a character class, including affinities and visual_config."""
    cls = session.get(CharacterClass, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Character class not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True, exclude={"affinities"})
    for field, new_val in update_data.items():
        old_val = getattr(cls, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(cls, field, new_val)

    cls.updated_at = datetime.now(timezone.utc)
    session.add(cls)
    session.commit()
    session.refresh(cls)

    if body.affinities is not None:
        now = datetime.now(timezone.utc)
        old_affs = session.exec(
            select(ClassStatAffinity).where(ClassStatAffinity.class_id == class_id)
        ).all()
        for old in old_affs:
            session.delete(old)
        session.commit()

        for aff in body.affinities:
            row = ClassStatAffinity(
                class_id=class_id,
                stat_id=aff.stat_id,
                base_value=aff.base_value,
                lore_weight=aff.lore_weight,
                level_bonus_per_level=aff.level_bonus_per_level,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        session.commit()
        changes["affinities"] = "replaced"

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="character_class_updated",
        target_type="character_class",
        target_id=str(class_id),
        details=changes,
        ip_address=get_client_ip(request),
    )

    affinities = session.exec(
        select(ClassStatAffinity).where(ClassStatAffinity.class_id == class_id)
    ).all()
    data = _row_to_dict(cls)
    data["affinities"] = [_row_to_dict(a) for a in affinities]
    return data


@router.delete("/classes/{class_id}")
async def delete_character_class(
    class_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a character class and its affinities."""
    cls = session.get(CharacterClass, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Character class not found")

    class_name = cls.name

    affs = session.exec(
        select(ClassStatAffinity).where(ClassStatAffinity.class_id == class_id)
    ).all()
    for aff in affs:
        session.delete(aff)

    session.delete(cls)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="character_class_deleted",
        target_type="character_class",
        target_id=str(class_id),
        details={"name": class_name},
        ip_address=get_client_ip(request),
    )

    return {"deleted": True, "id": class_id}
