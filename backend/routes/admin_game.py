"""Admin game content management routes (2.4.3)."""

import logging
from datetime import datetime, timezone
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin, get_client_ip
from models import (
    GameConfig,
    StatDefinition,
    CharacterClass,
    Skill,
    SkillAction,
    BenefitEffectData,
    GearSlot,
    ItemPrefix,
    ItemQuality,
    ItemLoreTag,
    ItemTypeBase,
    ItemSuffix,
    AttackType,
    EntityAttackType,
    TypeBaseAttackType,
)
from models.character_progression import ClassStatAffinity, SkillPrerequisite
from audit import write_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/game", tags=["admin-game"])


# ---------------------------------------------------------------------------
# Pydantic request/response bodies
# ---------------------------------------------------------------------------

class GameConfigMetaUpdate(BaseModel):
    description: Optional[str] = None
    game_impact: Optional[str] = None
    category: Optional[str] = None


class GameConfigValueUpdate(BaseModel):
    value_json: Any


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
# Helpers
# ---------------------------------------------------------------------------

ITEM_COMPONENT_MAP: dict[str, type] = {
    "prefixes": ItemPrefix,
    "qualities": ItemQuality,
    "lore_tags": ItemLoreTag,
    "type_bases": ItemTypeBase,
    "suffixes": ItemSuffix,
}


def _row_to_dict(row) -> dict:
    """Convert a SQLModel row to a plain dict, excluding internal attrs."""
    data = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name, None)
        if isinstance(val, datetime):
            val = val.isoformat()
        data[col.name] = val
    return data


# =========================================================================
# 1. Game Configs Browser
# =========================================================================

@router.get("/configs")
async def list_game_configs(
    search: Optional[str] = Query(None),
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return all game_configs entries. Optional ?search= filters by key, description, or category."""
    stmt = select(GameConfig)
    rows = session.exec(stmt).all()
    results = []
    for row in rows:
        entry = _row_to_dict(row)
        if search:
            needle = search.lower()
            haystack = " ".join(
                str(v).lower() for v in [row.key, row.description, row.category, row.game_impact] if v
            )
            if needle not in haystack:
                continue
        results.append(entry)
    return results


@router.patch("/configs/{key:path}/meta")
async def update_game_config_meta(
    key: str,
    body: GameConfigMetaUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update description, game_impact, or category on a game_config entry."""
    config_row = session.get(GameConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Game config '{key}' not found")

    admin_email = token.get("email", "unknown")
    changes: dict = {}

    if body.description is not None:
        changes["description"] = {"old": config_row.description, "new": body.description}
        config_row.description = body.description
    if body.game_impact is not None:
        changes["game_impact"] = {"old": config_row.game_impact, "new": body.game_impact}
        config_row.game_impact = body.game_impact
    if body.category is not None:
        changes["category"] = {"old": config_row.category, "new": body.category}
        config_row.category = body.category

    if not changes:
        raise HTTPException(status_code=422, detail="No fields to update")

    config_row.updated_at = datetime.now(timezone.utc)
    session.add(config_row)
    session.commit()

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="game_config_meta_updated",
        target_type="game_config",
        target_id=key,
        details=changes,
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(config_row)


@router.patch("/configs/{key:path}/value")
async def update_game_config_value(
    key: str,
    body: GameConfigValueUpdate,
    request: Request,
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update the value_json of a game_config entry."""
    config_row = session.get(GameConfig, key)
    if not config_row:
        raise HTTPException(status_code=404, detail=f"Game config '{key}' not found")

    admin_email = token.get("email", "unknown")
    old_value = config_row.value_json

    config_row.value_json = body.value_json
    config_row.updated_at = datetime.now(timezone.utc)
    session.add(config_row)
    session.commit()
    session.refresh(config_row)

    write_audit_log(
        session=session,
        admin_email=admin_email,
        action="game_config_value_updated",
        target_type="game_config",
        target_id=key,
        details={"old_value": old_value, "new_value": body.value_json},
        ip_address=get_client_ip(request),
    )

    return _row_to_dict(config_row)


@router.get("/configs/categories")
async def list_game_config_categories(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Return distinct non-null category values from game_configs."""
    rows = session.exec(select(GameConfig.category).distinct()).all()
    return sorted([c for c in rows if c])


# =========================================================================
# 2. Stat Definitions CRUD
# =========================================================================

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


# =========================================================================
# 3. Character Classes CRUD
# =========================================================================

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

    # Create affinities if provided
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

    # Re-fetch with affinities for response
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

    # Replace affinities if provided
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

    # Delete affinities first
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


# =========================================================================
# 4. Skills CRUD
# =========================================================================

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

    # Build response with actions and prerequisites
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

    # Replace actions if provided
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

    # Replace prerequisites if provided
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

    # Delete child rows first
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


# =========================================================================
# 5. Benefit Effects CRUD
# =========================================================================

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


# =========================================================================
# 6. Item Components CRUD
# =========================================================================

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
    # Build kwargs based on model columns
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


# =========================================================================
# 7. Lookup Endpoints (for admin UI dropdowns/pickers)
# =========================================================================

@router.get("/gear-slots")
async def list_gear_slots(
    token: dict = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """List all gear slots for dropdown selectors."""
    rows = session.exec(select(GearSlot).order_by(GearSlot.sort_order)).all()
    return [_row_to_dict(r) for r in rows]


@router.get("/avatar-options")
async def list_avatar_options(
    token: dict = Depends(get_current_admin),
):
    """List available avatar PNG files from the frontend public assets."""
    import os
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


# =========================================================================
# 8. Attack Types CRUD
# =========================================================================

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


# =========================================================================
# 9. Gear Slots CRUD
# =========================================================================

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
