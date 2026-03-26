"""Admin skills and benefit effects CRUD."""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import Skill, SkillAction, BenefitEffectData
from models.character_progression import SkillPrerequisite
from audit import write_audit_log
from routes.admin_game.helpers import _row_to_dict

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SkillActionBody(BaseModel):
    name: str
    display_name: str
    lore_description: str
    level_required: int = 1
    interval_ms: int = 3000
    xp_per_action: int = 10
    sort_order: int = 0


class SkillPrerequisiteBody(BaseModel):
    prerequisite_type: str
    ref_id: Optional[int] = None
    min_value: int = 1
    display_hint: Optional[str] = None


class SkillCreate(BaseModel):
    name: str
    display_name: Optional[str] = None
    category: str
    description: Optional[str] = None
    benefits_json: Optional[Any] = None
    xp_curve_type: str = "standard"
    unlock_scene_id: Optional[int] = None
    unlock_display_text: Optional[str] = None
    idle_flavor_title: Optional[str] = None
    level_0_xp_requirement: int = 0
    class_id: Optional[int] = None
    is_class_exclusive: bool = False
    idle_level_scaling: Optional[Any] = None
    effect_type: Optional[str] = None
    actions: Optional[list[SkillActionBody]] = None
    prerequisites: Optional[list[SkillPrerequisiteBody]] = None


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    benefits_json: Optional[Any] = None
    xp_curve_type: Optional[str] = None
    unlock_scene_id: Optional[int] = None
    unlock_display_text: Optional[str] = None
    idle_flavor_title: Optional[str] = None
    level_0_xp_requirement: Optional[int] = None
    class_id: Optional[int] = None
    is_class_exclusive: Optional[bool] = None
    idle_level_scaling: Optional[Any] = None
    effect_type: Optional[str] = None
    actions: Optional[list[SkillActionBody]] = None
    prerequisites: Optional[list[SkillPrerequisiteBody]] = None


class BenefitEffectCreate(BaseModel):
    effect_key: str
    display_name: str
    description: Optional[str] = None
    value_type: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    category: Optional[str] = None


class BenefitEffectUpdate(BaseModel):
    effect_key: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    value_type: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    category: Optional[str] = None


# ---------------------------------------------------------------------------
# Skills CRUD
# ---------------------------------------------------------------------------

@router.get("/skills")
async def list_skills(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List skills with skill_actions and prerequisites."""
    skills = session.exec(select(Skill)).all()
    result = []
    for skill in skills:
        data = _row_to_dict(skill)
        actions = session.exec(
            select(SkillAction).where(SkillAction.skill_id == skill.id)
        ).all()
        prereqs = session.exec(
            select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill.id)
        ).all()
        data["actions"] = [_row_to_dict(a) for a in actions]
        data["prerequisites"] = [_row_to_dict(p) for p in prereqs]
        result.append(data)
    return result


@router.post("/skills", status_code=201)
async def create_skill(
    body: SkillCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a skill with optional actions and prerequisites."""
    now = datetime.now(timezone.utc)
    skill = Skill(
        name=body.name,
        display_name=body.display_name,
        category=body.category,
        description=body.description,
        benefits_json=body.benefits_json,
        xp_curve_type=body.xp_curve_type,
        unlock_scene_id=body.unlock_scene_id,
        unlock_display_text=body.unlock_display_text,
        idle_flavor_title=body.idle_flavor_title,
        level_0_xp_requirement=body.level_0_xp_requirement,
        class_id=body.class_id,
        is_class_exclusive=body.is_class_exclusive,
        idle_level_scaling=body.idle_level_scaling,
        effect_type=body.effect_type,
        created_at=now,
        updated_at=now,
    )
    session.add(skill)
    session.commit()
    session.refresh(skill)

    if body.actions:
        for act in body.actions:
            row = SkillAction(
                skill_id=skill.id,
                name=act.name,
                display_name=act.display_name,
                lore_description=act.lore_description,
                level_required=act.level_required,
                interval_ms=act.interval_ms,
                xp_per_action=act.xp_per_action,
                sort_order=act.sort_order,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        session.commit()

    if body.prerequisites:
        for prereq in body.prerequisites:
            row = SkillPrerequisite(
                skill_id=skill.id,
                prerequisite_type=prereq.prerequisite_type,
                ref_id=prereq.ref_id,
                min_value=prereq.min_value,
                display_hint=prereq.display_hint,
                created_at=now,
            )
            session.add(row)
        session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="skill_created",
        target_type="skill",
        target_id=str(skill.id),
        details={"name": skill.name, "category": skill.category},
        ip_address=get_client_ip(request),
    )

    actions = session.exec(select(SkillAction).where(SkillAction.skill_id == skill.id)).all()
    prereqs = session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill.id)).all()
    data = _row_to_dict(skill)
    data["actions"] = [_row_to_dict(a) for a in actions]
    data["prerequisites"] = [_row_to_dict(p) for p in prereqs]
    return data


@router.patch("/skills/{skill_id}")
async def update_skill(
    skill_id: int,
    body: SkillUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a skill. If actions or prerequisites are provided, they replace existing ones."""
    skill = session.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True, exclude={"actions", "prerequisites"})
    for field, new_val in update_data.items():
        old_val = getattr(skill, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(skill, field, new_val)

    skill.updated_at = datetime.now(timezone.utc)
    session.add(skill)
    session.commit()
    session.refresh(skill)

    now = datetime.now(timezone.utc)

    if body.actions is not None:
        old_actions = session.exec(select(SkillAction).where(SkillAction.skill_id == skill_id)).all()
        for old in old_actions:
            session.delete(old)
        session.commit()
        for act in body.actions:
            row = SkillAction(
                skill_id=skill_id,
                name=act.name,
                display_name=act.display_name,
                lore_description=act.lore_description,
                level_required=act.level_required,
                interval_ms=act.interval_ms,
                xp_per_action=act.xp_per_action,
                sort_order=act.sort_order,
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        session.commit()
        changes["actions"] = "replaced"

    if body.prerequisites is not None:
        old_prereqs = session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill_id)).all()
        for old in old_prereqs:
            session.delete(old)
        session.commit()
        for prereq in body.prerequisites:
            row = SkillPrerequisite(
                skill_id=skill_id,
                prerequisite_type=prereq.prerequisite_type,
                ref_id=prereq.ref_id,
                min_value=prereq.min_value,
                display_hint=prereq.display_hint,
                created_at=now,
            )
            session.add(row)
        session.commit()
        changes["prerequisites"] = "replaced"

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="skill_updated",
        target_type="skill",
        target_id=str(skill_id),
        details=changes,
        ip_address=get_client_ip(request),
    )

    actions = session.exec(select(SkillAction).where(SkillAction.skill_id == skill_id)).all()
    prereqs = session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill_id)).all()
    data = _row_to_dict(skill)
    data["actions"] = [_row_to_dict(a) for a in actions]
    data["prerequisites"] = [_row_to_dict(p) for p in prereqs]
    return data


@router.delete("/skills/{skill_id}")
async def delete_skill(
    skill_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a skill and its actions/prerequisites."""
    skill = session.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    skill_name = skill.name

    for action in session.exec(select(SkillAction).where(SkillAction.skill_id == skill_id)).all():
        session.delete(action)
    for prereq in session.exec(select(SkillPrerequisite).where(SkillPrerequisite.skill_id == skill_id)).all():
        session.delete(prereq)

    session.delete(skill)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="skill_deleted",
        target_type="skill",
        target_id=str(skill_id),
        details={"name": skill_name},
        ip_address=get_client_ip(request),
    )

    return {"deleted": True, "id": skill_id}


# ---------------------------------------------------------------------------
# Benefit Effects CRUD
# ---------------------------------------------------------------------------

@router.get("/benefits")
async def list_benefit_effects(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all benefit_effect_data."""
    rows = session.exec(select(BenefitEffectData)).all()
    return [_row_to_dict(r) for r in rows]


@router.post("/benefits", status_code=201)
async def create_benefit_effect(
    body: BenefitEffectCreate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Create a new benefit effect."""
    now = datetime.now(timezone.utc)
    effect = BenefitEffectData(
        effect_key=body.effect_key,
        display_name=body.display_name,
        description=body.description,
        value_type=body.value_type,
        min_value=body.min_value,
        max_value=body.max_value,
        category=body.category,
        created_at=now,
        updated_at=now,
    )
    session.add(effect)
    session.commit()
    session.refresh(effect)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="benefit_effect_created",
        target_type="benefit_effect",
        target_id=str(effect.id),
        details={"effect_key": effect.effect_key},
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(effect)


@router.patch("/benefits/{effect_id}")
async def update_benefit_effect(
    effect_id: int,
    body: BenefitEffectUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a benefit effect."""
    effect = session.get(BenefitEffectData, effect_id)
    if not effect:
        raise HTTPException(status_code=404, detail="Benefit effect not found")

    changes: dict = {}
    update_data = body.model_dump(exclude_unset=True)
    for field, new_val in update_data.items():
        old_val = getattr(effect, field)
        if old_val != new_val:
            changes[field] = {"old": old_val, "new": new_val}
            setattr(effect, field, new_val)

    if not changes:
        raise HTTPException(status_code=422, detail="No fields changed")

    effect.updated_at = datetime.now(timezone.utc)
    session.add(effect)
    session.commit()
    session.refresh(effect)

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="benefit_effect_updated",
        target_type="benefit_effect",
        target_id=str(effect_id),
        details=changes,
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(effect)


@router.delete("/benefits/{effect_id}")
async def delete_benefit_effect(
    effect_id: int,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Delete a benefit effect."""
    effect = session.get(BenefitEffectData, effect_id)
    if not effect:
        raise HTTPException(status_code=404, detail="Benefit effect not found")

    effect_key = effect.effect_key
    session.delete(effect)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=token.get("email", "unknown"),
        action="benefit_effect_deleted",
        target_type="benefit_effect",
        target_id=str(effect_id),
        details={"effect_key": effect_key},
        ip_address=get_client_ip(request),
    )

    return {"deleted": True, "id": effect_id}
