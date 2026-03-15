"""Admin Classification service (REC 5.3) — Entity Types, Entity Families, Visual Behaviors.

CRUD operations for the entity classification taxonomy used by the World Builder.
"""

import re
import logging
from typing import Optional
from datetime import datetime, timezone

from sqlmodel import Session, select, col, func
from sqlalchemy import and_
from fastapi import HTTPException

from models.classification import EntityType, EntityFamily, VisualBehavior
from models.gameplay import Entity
from models.attack_types import AttackType, EntityAttackType

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NAME_RE = re.compile(r"^[a-z0-9_]+$")
_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _entity_type_to_dict(t: EntityType) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "display_name": t.display_name,
        "description": t.description,
        "color_hex": t.color_hex,
        "sort_order": t.sort_order,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _entity_family_to_dict(f: EntityFamily) -> dict:
    return {
        "id": f.id,
        "name": f.name,
        "display_name": f.display_name,
        "description": f.description,
        "icon_key": f.icon_key,
        "lore_reference": f.lore_reference,
        "base_stat_template": f.base_stat_template,
        "sort_order": f.sort_order,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }


# ===========================================================================
#  ENTITY TYPES
# ===========================================================================

def list_entity_types(session: Session) -> dict:
    """Return all entity types with entity_count, ordered by sort_order."""
    types = session.exec(select(EntityType).order_by(EntityType.sort_order)).all()
    items = []
    for t in types:
        count = session.exec(
            select(func.count()).select_from(Entity).where(Entity.entity_type_id == t.id)
        ).one()
        d = _entity_type_to_dict(t)
        d["entity_count"] = count
        items.append(d)
    return {"items": items, "total": len(items)}


def create_entity_type(session: Session, data: dict) -> dict:
    """Create a new entity type with validation."""
    name = data.get("name", "").strip()
    display_name = data.get("display_name", "").strip()

    # Validate name
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    if len(name) > 50:
        raise HTTPException(status_code=422, detail="name must be at most 50 characters")
    if not _NAME_RE.match(name):
        raise HTTPException(status_code=422, detail="name must be lowercase alphanumeric with underscores only")

    # Validate display_name
    if not display_name:
        raise HTTPException(status_code=422, detail="display_name is required")
    if len(display_name) > 100:
        raise HTTPException(status_code=422, detail="display_name must be at most 100 characters")

    # Validate color_hex
    color_hex = data.get("color_hex")
    if color_hex is not None:
        if not _COLOR_RE.match(color_hex):
            raise HTTPException(status_code=422, detail="color_hex must match #XXXXXX pattern")

    # Check uniqueness
    existing = session.exec(select(EntityType).where(EntityType.name == name)).first()
    if existing:
        raise HTTPException(status_code=422, detail=f"Entity type with name '{name}' already exists")

    # Default sort_order
    sort_order = data.get("sort_order")
    if sort_order is None:
        max_order = session.exec(select(func.max(EntityType.sort_order))).one()
        sort_order = (max_order or 0) + 1

    now = _now()
    entity_type = EntityType(
        name=name,
        display_name=display_name,
        description=data.get("description"),
        color_hex=color_hex,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    session.add(entity_type)
    session.commit()
    session.refresh(entity_type)
    return _entity_type_to_dict(entity_type)


def update_entity_type(session: Session, type_id: int, data: dict) -> dict:
    """Partial update of an entity type."""
    entity_type = session.get(EntityType, type_id)
    if not entity_type:
        raise HTTPException(status_code=404, detail="Entity type not found")

    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=422, detail="name cannot be empty")
        if len(name) > 50:
            raise HTTPException(status_code=422, detail="name must be at most 50 characters")
        if not _NAME_RE.match(name):
            raise HTTPException(status_code=422, detail="name must be lowercase alphanumeric with underscores only")
        existing = session.exec(
            select(EntityType).where(and_(EntityType.name == name, EntityType.id != type_id))
        ).first()
        if existing:
            raise HTTPException(status_code=422, detail=f"Entity type with name '{name}' already exists")
        entity_type.name = name

    if "display_name" in data and data["display_name"] is not None:
        display_name = data["display_name"].strip()
        if not display_name:
            raise HTTPException(status_code=422, detail="display_name cannot be empty")
        if len(display_name) > 100:
            raise HTTPException(status_code=422, detail="display_name must be at most 100 characters")
        entity_type.display_name = display_name

    if "description" in data:
        entity_type.description = data["description"]

    if "color_hex" in data:
        color_hex = data["color_hex"]
        if color_hex is not None and not _COLOR_RE.match(color_hex):
            raise HTTPException(status_code=422, detail="color_hex must match #XXXXXX pattern")
        entity_type.color_hex = color_hex

    if "sort_order" in data and data["sort_order"] is not None:
        entity_type.sort_order = data["sort_order"]

    entity_type.updated_at = _now()
    session.add(entity_type)
    session.commit()
    session.refresh(entity_type)
    return _entity_type_to_dict(entity_type)


def delete_entity_type(session: Session, type_id: int) -> None:
    """Delete an entity type. 409 if entities reference it."""
    entity_type = session.get(EntityType, type_id)
    if not entity_type:
        raise HTTPException(status_code=404, detail="Entity type not found")

    count = session.exec(
        select(func.count()).select_from(Entity).where(Entity.entity_type_id == type_id)
    ).one()
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} entities reference this type",
        )

    session.delete(entity_type)
    session.commit()


# ===========================================================================
#  ENTITY FAMILIES
# ===========================================================================

def list_entity_families(
    session: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Return paginated entity families with entity_count."""
    query = select(EntityFamily)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            col(EntityFamily.name).ilike(pattern) | col(EntityFamily.display_name).ilike(pattern)
        )

    # Total count
    count_query = select(func.count()).select_from(EntityFamily)
    if search:
        pattern = f"%{search}%"
        count_query = count_query.where(
            col(EntityFamily.name).ilike(pattern) | col(EntityFamily.display_name).ilike(pattern)
        )
    total = session.exec(count_query).one()

    # Paginated results
    offset = (page - 1) * page_size
    families = session.exec(
        query.order_by(EntityFamily.sort_order).offset(offset).limit(page_size)
    ).all()

    items = []
    for f in families:
        count = session.exec(
            select(func.count()).select_from(Entity).where(Entity.entity_family_id == f.id)
        ).one()
        d = _entity_family_to_dict(f)
        d["entity_count"] = count
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def create_entity_family(session: Session, data: dict) -> dict:
    """Create a new entity family with validation."""
    name = data.get("name", "").strip()
    display_name = data.get("display_name", "").strip()

    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    if len(name) > 100:
        raise HTTPException(status_code=422, detail="name must be at most 100 characters")

    if not display_name:
        raise HTTPException(status_code=422, detail="display_name is required")

    # Check uniqueness
    existing = session.exec(select(EntityFamily).where(EntityFamily.name == name)).first()
    if existing:
        raise HTTPException(status_code=422, detail=f"Entity family with name '{name}' already exists")

    # Validate base_stat_template keys are numeric
    base_stat_template = data.get("base_stat_template")
    if base_stat_template is not None:
        for key, value in base_stat_template.items():
            try:
                float(value)
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=422,
                    detail=f"base_stat_template values must be numeric, got '{value}' for key '{key}'",
                )

    # Default sort_order
    sort_order = data.get("sort_order")
    if sort_order is None:
        max_order = session.exec(select(func.max(EntityFamily.sort_order))).one()
        sort_order = (max_order or 0) + 1

    now = _now()
    family = EntityFamily(
        name=name,
        display_name=display_name,
        description=data.get("description"),
        icon_key=data.get("icon_key"),
        lore_reference=data.get("lore_reference"),
        base_stat_template=base_stat_template,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    session.add(family)
    session.commit()
    session.refresh(family)
    return _entity_family_to_dict(family)


def update_entity_family(session: Session, family_id: int, data: dict) -> dict:
    """Partial update of an entity family."""
    family = session.get(EntityFamily, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Entity family not found")

    if "name" in data and data["name"] is not None:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=422, detail="name cannot be empty")
        if len(name) > 100:
            raise HTTPException(status_code=422, detail="name must be at most 100 characters")
        existing = session.exec(
            select(EntityFamily).where(and_(EntityFamily.name == name, EntityFamily.id != family_id))
        ).first()
        if existing:
            raise HTTPException(status_code=422, detail=f"Entity family with name '{name}' already exists")
        family.name = name

    if "display_name" in data and data["display_name"] is not None:
        display_name = data["display_name"].strip()
        if not display_name:
            raise HTTPException(status_code=422, detail="display_name cannot be empty")
        family.display_name = display_name

    if "description" in data:
        family.description = data["description"]

    if "icon_key" in data:
        family.icon_key = data["icon_key"]

    if "lore_reference" in data:
        family.lore_reference = data["lore_reference"]

    if "base_stat_template" in data:
        bst = data["base_stat_template"]
        if bst is not None:
            for key, value in bst.items():
                try:
                    float(value)
                except (ValueError, TypeError):
                    raise HTTPException(
                        status_code=422,
                        detail=f"base_stat_template values must be numeric, got '{value}' for key '{key}'",
                    )
        family.base_stat_template = bst

    if "sort_order" in data and data["sort_order"] is not None:
        family.sort_order = data["sort_order"]

    family.updated_at = _now()
    session.add(family)
    session.commit()
    session.refresh(family)
    return _entity_family_to_dict(family)


def delete_entity_family(session: Session, family_id: int) -> None:
    """Delete an entity family. 409 if entities reference it."""
    family = session.get(EntityFamily, family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Entity family not found")

    count = session.exec(
        select(func.count()).select_from(Entity).where(Entity.entity_family_id == family_id)
    ).one()
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete: {count} entities reference this family",
        )

    session.delete(family)
    session.commit()


def validate_stat_weights(stat_weights: dict) -> None:
    """Validate stat_weights JSONB structure for visual behaviors."""
    PROPERTIES = ["size", "speed", "vfx_intensity"]
    STATS = ["strength", "agility", "intelligence"]

    for prop in PROPERTIES:
        if prop in stat_weights:
            if not isinstance(stat_weights[prop], dict):
                raise HTTPException(422, detail=f"stat_weights.{prop} must be an object")
            for stat in STATS:
                val = stat_weights[prop].get(stat, 0)
                if not isinstance(val, (int, float)) or val < 0.0 or val > 1.0:
                    raise HTTPException(422, detail=f"stat_weights.{prop}.{stat} must be between 0.0 and 1.0")

    if "clamps" in stat_weights:
        if not isinstance(stat_weights["clamps"], dict):
            raise HTTPException(422, detail="stat_weights.clamps must be an object")
        for prop in PROPERTIES:
            if prop in stat_weights["clamps"]:
                clamp = stat_weights["clamps"][prop]
                if not (isinstance(clamp, list) and len(clamp) == 2):
                    raise HTTPException(422, detail=f"stat_weights.clamps.{prop} must be [min, max]")
                if not all(isinstance(v, (int, float)) for v in clamp):
                    raise HTTPException(422, detail=f"stat_weights.clamps.{prop} values must be numeric")
                if clamp[0] > clamp[1]:
                    raise HTTPException(422, detail=f"stat_weights.clamps.{prop} min must be <= max")


# ===========================================================================
#  VISUAL BEHAVIORS
# ===========================================================================

def list_visual_behaviors(session: Session) -> dict:
    """Return all visual behaviors with attack_type_count and transitive_entity_count."""
    behaviors = session.exec(
        select(VisualBehavior).order_by(VisualBehavior.sort_order)
    ).all()

    items = []
    for b in behaviors:
        d = _visual_behavior_to_dict(b)
        # Count attack types mapped to this behavior
        at_count = session.exec(
            select(func.count()).select_from(AttackType)
            .where(AttackType.visual_behavior_id == b.id)
        ).one()
        d["attack_type_count"] = at_count
        # Transitive entity count via primary attack types
        d["transitive_entity_count"] = _get_transitive_entity_count(session, b.id)
        items.append(d)

    return {"items": items, "total": len(items)}


def create_visual_behavior(session: Session, data: dict) -> dict:
    """Create a new visual behavior with validation."""
    # Validate name: required, max 50, unique, lowercase alphanum + underscore
    name = data.get("name", "").strip()
    if not name or len(name) > 50:
        raise HTTPException(422, detail="name is required and must be <= 50 chars")
    if not _NAME_RE.match(name):
        raise HTTPException(422, detail="name must be lowercase alphanumeric + underscore")

    existing = session.exec(select(VisualBehavior).where(VisualBehavior.name == name)).first()
    if existing:
        raise HTTPException(422, detail=f"Visual behavior '{name}' already exists")

    display_name = data.get("display_name", "").strip()
    if not display_name or len(display_name) > 100:
        raise HTTPException(422, detail="display_name is required and must be <= 100 chars")

    animation_config = data.get("animation_config", {})
    if not isinstance(animation_config, dict):
        raise HTTPException(422, detail="animation_config must be a JSON object")

    now = _now()
    sort_order = data.get("sort_order")
    if sort_order is None:
        max_order = session.exec(select(func.max(VisualBehavior.sort_order))).one()
        sort_order = (max_order or 0) + 1

    vb = VisualBehavior(
        name=name,
        display_name=display_name,
        description=data.get("description"),
        animation_config=animation_config,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    session.add(vb)
    session.commit()
    session.refresh(vb)
    return _visual_behavior_to_dict(vb)


def update_visual_behavior(session: Session, behavior_id: int, data: dict) -> dict:
    """Partial update of a visual behavior."""
    vb = session.get(VisualBehavior, behavior_id)
    if not vb:
        raise HTTPException(404, detail="Visual behavior not found")

    if "name" in data:
        name = data["name"].strip()
        if not _NAME_RE.match(name):
            raise HTTPException(422, detail="name must be lowercase alphanumeric + underscore")
        existing = session.exec(
            select(VisualBehavior).where(VisualBehavior.name == name, VisualBehavior.id != behavior_id)
        ).first()
        if existing:
            raise HTTPException(422, detail=f"Visual behavior '{name}' already exists")
        vb.name = name

    if "stat_weights" in data:
        if data["stat_weights"] is not None:
            validate_stat_weights(data["stat_weights"])
        vb.stat_weights = data["stat_weights"]

    for field in ["display_name", "description", "animation_config", "sort_order"]:
        if field in data:
            setattr(vb, field, data[field])

    vb.updated_at = _now()
    session.add(vb)
    session.commit()
    session.refresh(vb)
    return _visual_behavior_to_dict(vb)


def delete_visual_behavior(session: Session, behavior_id: int) -> None:
    """Delete a visual behavior. 409 if attack types reference it."""
    vb = session.get(VisualBehavior, behavior_id)
    if not vb:
        raise HTTPException(404, detail="Visual behavior not found")

    at_count = session.exec(
        select(func.count()).select_from(AttackType)
        .where(AttackType.visual_behavior_id == behavior_id)
    ).one()
    if at_count > 0:
        raise HTTPException(409, detail=f"Cannot delete: {at_count} attack types reference this behavior")

    session.delete(vb)
    session.commit()


def _visual_behavior_to_dict(vb: VisualBehavior) -> dict:
    return {
        "id": vb.id,
        "name": vb.name,
        "display_name": vb.display_name,
        "description": vb.description,
        "animation_config": vb.animation_config,
        "stat_weights": vb.stat_weights,
        "sort_order": vb.sort_order,
        "created_at": vb.created_at.isoformat() if vb.created_at else None,
        "updated_at": vb.updated_at.isoformat() if vb.updated_at else None,
    }


def _get_transitive_entity_count(session: Session, behavior_id: int) -> int:
    """Count entities whose primary attack type uses this visual behavior."""
    at_ids = session.exec(
        select(AttackType.id).where(AttackType.visual_behavior_id == behavior_id)
    ).all()
    if not at_ids:
        return 0
    return session.exec(
        select(func.count()).select_from(EntityAttackType)
        .where(EntityAttackType.is_primary == True)
        .where(col(EntityAttackType.attack_type_id).in_(at_ids))
    ).one()


# ===========================================================================
#  ATTACK TYPES (Extended)
# ===========================================================================

def list_attack_types_extended(session: Session) -> dict:
    """Return all attack types with visual behavior name and entity count."""
    attack_types = session.exec(select(AttackType).order_by(AttackType.name)).all()

    items = []
    for at in attack_types:
        d = {
            "id": at.id,
            "name": at.name,
            "display_name": at.display_name,
            "description": at.description,
            "is_physical": at.is_physical,
            "lore_reference": at.lore_reference,
            "visual_behavior_id": at.visual_behavior_id,
            "visual_behavior_name": None,
            "stat_multipliers": at.stat_multipliers,
            "entity_count": 0,
            "created_at": at.created_at.isoformat() if at.created_at else None,
            "updated_at": at.updated_at.isoformat() if at.updated_at else None,
        }
        if at.visual_behavior_id:
            vb = session.get(VisualBehavior, at.visual_behavior_id)
            if vb:
                d["visual_behavior_name"] = vb.name

        entity_count = session.exec(
            select(func.count()).select_from(EntityAttackType)
            .where(EntityAttackType.attack_type_id == at.id)
        ).one()
        d["entity_count"] = entity_count
        items.append(d)

    return {"items": items, "total": len(items)}


def search_entities_for_bulk(session: Session, search: str = None, entity_type_id: int = None,
                              entity_family_id: int = None, has_attack_types: bool = None,
                              has_stat_block: bool = None, book_id: int = None,
                              chapter_id: int = None, page: int = 1, page_size: int = 50) -> dict:
    """Search entities with extended filters for the bulk assignment panel."""
    query = select(Entity)
    count_query = select(func.count()).select_from(Entity)

    conditions = []
    if search:
        conditions.append(Entity.canonical_name.ilike(f"%{search}%"))
    if entity_type_id is not None:
        conditions.append(Entity.entity_type_id == entity_type_id)
    if entity_family_id is not None:
        conditions.append(Entity.entity_family_id == entity_family_id)

    if conditions:
        for c in conditions:
            query = query.where(c)
            count_query = count_query.where(c)

    total = session.exec(count_query).one()

    entities = session.exec(
        query.order_by(Entity.canonical_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for e in entities:
        # Get entity type name
        et = session.get(EntityType, e.entity_type_id)
        # Get entity family name
        ef = session.get(EntityFamily, e.entity_family_id) if e.entity_family_id else None
        # Get attack type info
        eat_records = session.exec(
            select(EntityAttackType).where(EntityAttackType.entity_id == e.id)
        ).all()
        primary_eat = next((r for r in eat_records if r.is_primary), None)
        primary_at = None
        visual_behavior_name = None
        if primary_eat:
            primary_at = session.get(AttackType, primary_eat.attack_type_id)
            if primary_at and primary_at.visual_behavior_id:
                vb = session.get(VisualBehavior, primary_at.visual_behavior_id)
                visual_behavior_name = vb.name if vb else None

        # Check stat block
        from models.gameplay import EntityGameplayData
        gp = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == e.id)
        ).first()
        has_sb = bool(gp and gp.stat_block)

        items.append({
            "id": e.id,
            "canonical_name": e.canonical_name,
            "entity_type_id": e.entity_type_id,
            "entity_type_name": et.name if et else None,
            "entity_family_id": e.entity_family_id,
            "entity_family_name": ef.name if ef else None,
            "attack_type_count": len(eat_records),
            "primary_attack_type_name": primary_at.name if primary_at else None,
            "has_stat_block": has_sb,
            "visual_behavior_name": visual_behavior_name,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def bulk_assign(session: Session, entity_ids: list, action: str, payload: dict) -> dict:
    """Perform bulk classification assignment on entities."""
    success = 0
    skipped = 0
    errors = []

    entities = session.exec(
        select(Entity).where(col(Entity.id).in_(entity_ids))
    ).all()
    entity_map = {e.id: e for e in entities}

    # For create_family action, create the family first
    new_family = None
    if action == "create_family":
        family_name = payload.get("family_name", "").strip()
        family_display = payload.get("family_display_name", family_name).strip()
        if not family_name:
            raise HTTPException(422, detail="family_name is required for create_family action")
        existing = session.exec(select(EntityFamily).where(EntityFamily.name == family_name)).first()
        if existing:
            raise HTTPException(422, detail=f"Family '{family_name}' already exists")
        now = _now()
        new_family = EntityFamily(name=family_name, display_name=family_display, created_at=now, updated_at=now)
        session.add(new_family)
        session.flush()  # Get the ID

    for eid in entity_ids:
        entity = entity_map.get(eid)
        if not entity:
            errors.append({"entity_id": eid, "error": "Entity not found"})
            continue

        try:
            if action == "assign_type":
                entity.entity_type_id = payload["entity_type_id"]
                entity.updated_at = _now()
                session.add(entity)
                success += 1
            elif action == "assign_family":
                entity.entity_family_id = payload["entity_family_id"]
                entity.updated_at = _now()
                session.add(entity)
                success += 1
            elif action == "create_family":
                entity.entity_family_id = new_family.id
                entity.updated_at = _now()
                session.add(entity)
                success += 1
            elif action == "add_attack_types":
                at_ids = payload.get("attack_type_ids", [])
                existing_at_ids = set(r.attack_type_id for r in session.exec(
                    select(EntityAttackType).where(EntityAttackType.entity_id == eid)
                ).all())
                for at_id in at_ids:
                    if at_id not in existing_at_ids:
                        session.add(EntityAttackType(
                            entity_id=eid, attack_type_id=at_id, is_primary=False, created_at=_now()
                        ))
                success += 1
            elif action == "replace_attack_types":
                # Delete existing
                existing = session.exec(
                    select(EntityAttackType).where(EntityAttackType.entity_id == eid)
                ).all()
                for r in existing:
                    session.delete(r)
                # Add new
                at_ids = payload.get("attack_type_ids", [])
                primary_id = payload.get("primary_id")
                for at_id in at_ids:
                    session.add(EntityAttackType(
                        entity_id=eid, attack_type_id=at_id,
                        is_primary=(at_id == primary_id), created_at=_now()
                    ))
                success += 1
            elif action == "set_primary":
                target_at_id = payload["attack_type_id"]
                eat_records = session.exec(
                    select(EntityAttackType).where(EntityAttackType.entity_id == eid)
                ).all()
                found = False
                for r in eat_records:
                    if r.attack_type_id == target_at_id:
                        r.is_primary = True
                        found = True
                    else:
                        r.is_primary = False
                    session.add(r)
                if not found:
                    errors.append({"entity_id": eid, "error": f"Attack type {target_at_id} not assigned to entity"})
                    continue
                success += 1
            else:
                errors.append({"entity_id": eid, "error": f"Unknown action: {action}"})
                continue
        except Exception as e:
            errors.append({"entity_id": eid, "error": str(e)})

    session.commit()
    return {"success_count": success, "skip_count": skipped, "error_count": len(errors), "errors": errors}


def get_audit_summary(session: Session, missing: str = None, search: str = None,
                       page: int = 1, page_size: int = 50) -> dict:
    """Get classification audit summary and incomplete entities."""
    from models.gameplay import EntityGameplayData

    total = session.exec(select(func.count()).select_from(Entity)).one()
    with_type = session.exec(
        select(func.count()).select_from(Entity).where(Entity.entity_type_id.isnot(None))
    ).one()
    with_family = session.exec(
        select(func.count()).select_from(Entity).where(Entity.entity_family_id.isnot(None))
    ).one()
    with_attack_types = session.exec(
        select(func.count(func.distinct(EntityAttackType.entity_id))).select_from(EntityAttackType)
    ).one()
    with_primary = session.exec(
        select(func.count(func.distinct(EntityAttackType.entity_id))).select_from(EntityAttackType)
        .where(EntityAttackType.is_primary == True)
    ).one()
    with_stat_block = session.exec(
        select(func.count()).select_from(EntityGameplayData)
        .where(EntityGameplayData.stat_block.isnot(None))
    ).one()

    # Visual behavior count (entities with primary attack type that has a visual behavior)
    with_visual = session.exec(
        select(func.count(func.distinct(EntityAttackType.entity_id)))
        .select_from(EntityAttackType)
        .join(AttackType, EntityAttackType.attack_type_id == AttackType.id)
        .where(EntityAttackType.is_primary == True)
        .where(AttackType.visual_behavior_id.isnot(None))
    ).one()

    summary = {
        "total_entities": total,
        "with_type": with_type,
        "with_family": with_family,
        "with_attack_types": with_attack_types,
        "with_primary_attack_type": with_primary,
        "with_stat_block": with_stat_block,
        "with_visual_behavior": with_visual,
    }

    # Build incomplete entities query
    # Get all entities, then filter to those missing at least one classification
    all_entities = session.exec(
        select(Entity).order_by(Entity.canonical_name)
    ).all()

    incomplete = []
    for e in all_entities:
        et = session.get(EntityType, e.entity_type_id) if e.entity_type_id else None
        ef = session.get(EntityFamily, e.entity_family_id) if e.entity_family_id else None

        eat_records = session.exec(
            select(EntityAttackType).where(EntityAttackType.entity_id == e.id)
        ).all()
        primary_eat = next((r for r in eat_records if r.is_primary), None)
        primary_at = None
        vb_name = None
        if primary_eat:
            primary_at = session.get(AttackType, primary_eat.attack_type_id)
            if primary_at and primary_at.visual_behavior_id:
                vb = session.get(VisualBehavior, primary_at.visual_behavior_id)
                vb_name = vb.name if vb else None

        gp = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == e.id)
        ).first()
        has_sb = bool(gp and gp.stat_block)

        missing_list = []
        if not e.entity_type_id:
            missing_list.append("type")
        if not e.entity_family_id:
            missing_list.append("family")
        if len(eat_records) == 0:
            missing_list.append("attack_types")
        if not primary_eat:
            missing_list.append("primary_attack_type")
        if not has_sb:
            missing_list.append("stat_block")
        if not vb_name:
            missing_list.append("visual_behavior")

        if not missing_list:
            continue

        # Apply missing filter
        if missing:
            required = set(missing.split(","))
            if not required.intersection(set(missing_list)):
                continue

        # Apply search filter
        if search and search.lower() not in e.canonical_name.lower():
            continue

        incomplete.append({
            "id": e.id,
            "canonical_name": e.canonical_name,
            "entity_type_name": et.name if et else None,
            "entity_family_name": ef.name if ef else None,
            "attack_type_count": len(eat_records),
            "primary_attack_type_name": primary_at.name if primary_at else None,
            "has_stat_block": has_sb,
            "visual_behavior_name": vb_name,
            "missing": missing_list,
        })

    total_incomplete = len(incomplete)
    # Paginate
    start = (page - 1) * page_size
    page_items = incomplete[start:start + page_size]

    return {
        "summary": summary,
        "incomplete_entities": {
            "items": page_items,
            "total": total_incomplete,
            "page": page,
            "page_size": page_size,
        }
    }


def apply_template(session: Session, entity_ids: list, preview_only: bool = True) -> dict:
    """Apply stat templates to entities (preview or commit)."""
    from models.gameplay import EntityGameplayData

    previews = []
    for eid in entity_ids:
        entity = session.get(Entity, eid)
        if not entity:
            continue

        family = session.get(EntityFamily, entity.entity_family_id) if entity.entity_family_id else None
        primary_eat = session.exec(
            select(EntityAttackType)
            .where(EntityAttackType.entity_id == eid)
            .where(EntityAttackType.is_primary == True)
        ).first()
        attack_type = session.get(AttackType, primary_eat.attack_type_id) if primary_eat else None

        base = family.base_stat_template if family and family.base_stat_template else None
        multipliers = attack_type.stat_multipliers if attack_type and attack_type.stat_multipliers else {}

        warnings = []
        can_apply = True
        proposed = None
        proposed_hp = None
        proposed_gold = None

        if not base:
            if not family:
                warnings.append("No family assigned — cannot compute base template")
            else:
                warnings.append("Family has no base_stat_template defined")
            can_apply = False
        else:
            proposed = {}
            for key in ["strength", "agility", "intelligence"]:
                proposed[key] = round(base.get(key, 0) * multipliers.get(key, 1.0))
            proposed_hp = round(base.get("base_hp", 0) * multipliers.get("hp_multiplier", 1.0))
            proposed_gold = round(base.get("base_gold", 0) * multipliers.get("gold_multiplier", 1.0))

        gp = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == eid)
        ).first()

        preview = {
            "entity_id": eid,
            "entity_name": entity.canonical_name,
            "family_name": family.name if family else None,
            "primary_attack_type": attack_type.name if attack_type else None,
            "current_stat_block": gp.stat_block if gp else None,
            "proposed_stat_block": proposed,
            "current_base_hp": gp.base_hp if gp else 0,
            "proposed_base_hp": proposed_hp,
            "current_base_gold": gp.base_gold if gp else 0,
            "proposed_base_gold": proposed_gold,
            "can_apply": can_apply,
            "warnings": warnings,
        }
        previews.append(preview)

        if not preview_only and can_apply:
            now = _now()
            if not gp:
                gp = EntityGameplayData(entity_id=eid, created_at=now, updated_at=now)
            gp.stat_block = proposed
            gp.base_hp = proposed_hp
            gp.base_gold = proposed_gold
            gp.updated_at = now
            session.add(gp)

    if not preview_only:
        session.commit()

    applicable = sum(1 for p in previews if p["can_apply"])
    return {
        "previews": previews,
        "applicable_count": applicable,
        "skipped_count": len(previews) - applicable,
    }


def update_attack_type_extended(session: Session, attack_type_id: int, data: dict) -> dict:
    """Update an attack type with extended fields (visual_behavior_id, stat_multipliers)."""
    at = session.get(AttackType, attack_type_id)
    if not at:
        raise HTTPException(404, detail="Attack type not found")

    if "visual_behavior_id" in data:
        vb_id = data["visual_behavior_id"]
        if vb_id is not None:
            vb = session.get(VisualBehavior, vb_id)
            if not vb:
                raise HTTPException(422, detail=f"Visual behavior {vb_id} not found")
        at.visual_behavior_id = vb_id

    if "stat_multipliers" in data:
        sm = data["stat_multipliers"]
        if sm is not None:
            if not isinstance(sm, dict):
                raise HTTPException(422, detail="stat_multipliers must be a JSON object")
            for k, v in sm.items():
                if not isinstance(v, (int, float)) or v < 0:
                    raise HTTPException(422, detail=f"stat_multipliers.{k} must be a non-negative number")
        at.stat_multipliers = sm

    # Also allow updating standard fields
    for field in ["name", "display_name", "description", "is_physical", "lore_reference"]:
        if field in data:
            setattr(at, field, data[field])

    at.updated_at = _now()
    session.add(at)
    session.commit()
    session.refresh(at)

    # Build response
    d = {
        "id": at.id,
        "name": at.name,
        "display_name": at.display_name,
        "description": at.description,
        "is_physical": at.is_physical,
        "lore_reference": at.lore_reference,
        "visual_behavior_id": at.visual_behavior_id,
        "visual_behavior_name": None,
        "stat_multipliers": at.stat_multipliers,
        "created_at": at.created_at.isoformat() if at.created_at else None,
        "updated_at": at.updated_at.isoformat() if at.updated_at else None,
    }
    if at.visual_behavior_id:
        vb = session.get(VisualBehavior, at.visual_behavior_id)
        if vb:
            d["visual_behavior_name"] = vb.name
    return d
