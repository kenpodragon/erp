"""Service layer for 5.2.2 Game Content Editor — Entities, Entity-Scenes,
Entity-Beats, Story Beats, and Semantic Tags.

Keeps route handlers thin by encapsulating query logic, FK validation,
duplicate detection, and bulk operations here.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Session, select, func, col
from fastapi import HTTPException

from models import (
    Entity, EntityGameplayData, EntitySceneAppearance,
    EntityAlias, EntityAttackType, AttackType,
    StoryBeat, Scene, SemanticTag,
    EntityType, EntityFamily,
)
from models.content import EntityBeatAppearance

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _paginated(items: list, total: int, page: int, page_size: int) -> dict:
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------

def list_entities(
    session: Session,
    *,
    entity_type_id: Optional[int] = None,
    entity_family_id: Optional[int] = None,
    has_gameplay: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """List entities with optional filters and aggregated counts."""
    count_q = select(func.count()).select_from(Entity)

    filters = []
    if entity_type_id is not None:
        filters.append(Entity.entity_type_id == entity_type_id)
    if entity_family_id is not None:
        filters.append(Entity.entity_family_id == entity_family_id)
    if search:
        filters.append(col(Entity.canonical_name).ilike(f"%{search}%"))

    for f in filters:
        count_q = count_q.where(f)

    # If filtering by has_gameplay, we need a subquery
    if has_gameplay is not None:
        gp_ids = select(EntityGameplayData.entity_id)
        if has_gameplay:
            count_q = count_q.where(col(Entity.id).in_(gp_ids))
        else:
            count_q = count_q.where(col(Entity.id).not_in(gp_ids))

    total = session.exec(count_q).one()

    # Join EntityType and EntityFamily for display info
    detail_q = (
        select(Entity, EntityType, EntityFamily)
        .join(EntityType, Entity.entity_type_id == EntityType.id)
        .outerjoin(EntityFamily, Entity.entity_family_id == EntityFamily.id)
    )
    for f in filters:
        detail_q = detail_q.where(f)
    if has_gameplay is not None:
        gp_ids = select(EntityGameplayData.entity_id)
        if has_gameplay:
            detail_q = detail_q.where(col(Entity.id).in_(gp_ids))
        else:
            detail_q = detail_q.where(col(Entity.id).not_in(gp_ids))

    rows = session.exec(
        detail_q.order_by(Entity.canonical_name)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    entities = [row[0] for row in rows]
    type_map = {row[0].id: row[1] for row in rows}
    family_map = {row[0].id: row[2] for row in rows if row[2]}

    # Batch-load counts for the page
    entity_ids = [e.id for e in entities]
    if not entity_ids:
        return _paginated([], total, page, page_size)

    # scene_appearance_count
    scene_counts = dict(
        session.exec(
            select(EntitySceneAppearance.entity_id, func.count())
            .where(col(EntitySceneAppearance.entity_id).in_(entity_ids))
            .group_by(EntitySceneAppearance.entity_id)
        ).all()
    )
    # beat_appearance_count
    beat_counts = dict(
        session.exec(
            select(EntityBeatAppearance.entity_id, func.count())
            .where(col(EntityBeatAppearance.entity_id).in_(entity_ids))
            .group_by(EntityBeatAppearance.entity_id)
        ).all()
    )
    # alias_count
    alias_counts = dict(
        session.exec(
            select(EntityAlias.entity_id, func.count())
            .where(col(EntityAlias.entity_id).in_(entity_ids))
            .group_by(EntityAlias.entity_id)
        ).all()
    )
    # attack_type_count
    attack_counts = dict(
        session.exec(
            select(EntityAttackType.entity_id, func.count())
            .where(col(EntityAttackType.entity_id).in_(entity_ids))
            .group_by(EntityAttackType.entity_id)
        ).all()
    )
    # has_gameplay_data
    gp_set = set(
        session.exec(
            select(EntityGameplayData.entity_id)
            .where(col(EntityGameplayData.entity_id).in_(entity_ids))
        ).all()
    )

    items = []
    for e in entities:
        d = _entity_to_dict(
            e,
            entity_type=type_map.get(e.id),
            entity_family=family_map.get(e.id),
        )
        d["scene_appearance_count"] = scene_counts.get(e.id, 0)
        d["beat_appearance_count"] = beat_counts.get(e.id, 0)
        d["alias_count"] = alias_counts.get(e.id, 0)
        d["attack_type_count"] = attack_counts.get(e.id, 0)
        d["has_gameplay_data"] = e.id in gp_set
        items.append(d)

    return _paginated(items, total, page, page_size)


def get_entity_detail(session: Session, entity_id: int) -> dict:
    """Full entity detail with gameplay_data, aliases, attack_types inline."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    # Lookup entity type and family for display info
    et = session.get(EntityType, entity.entity_type_id) if entity.entity_type_id else None
    ef = session.get(EntityFamily, entity.entity_family_id) if entity.entity_family_id else None

    d = _entity_to_dict(entity, entity_type=et, entity_family=ef)

    # Gameplay data
    gp = session.exec(
        select(EntityGameplayData).where(EntityGameplayData.entity_id == entity_id)
    ).first()
    d["gameplay_data"] = _gameplay_to_dict(gp) if gp else None

    # Aliases
    aliases = session.exec(
        select(EntityAlias).where(EntityAlias.entity_id == entity_id)
    ).all()
    d["aliases"] = [{"id": a.id, "alias": a.alias, "context": a.context} for a in aliases]

    # Attack types
    ats = session.exec(
        select(EntityAttackType, AttackType)
        .join(AttackType, EntityAttackType.attack_type_id == AttackType.id)
        .where(EntityAttackType.entity_id == entity_id)
    ).all()
    d["attack_types"] = [
        {
            "id": eat.id,
            "attack_type_id": eat.attack_type_id,
            "attack_type_name": at.name,
            "attack_type_display_name": at.display_name,
            "is_primary": eat.is_primary,
        }
        for eat, at in ats
    ]

    return d


def get_entity_families(session: Session) -> list[dict]:
    """All entity families from the entity_families table for filter dropdown."""
    rows = session.exec(
        select(EntityFamily).order_by(EntityFamily.sort_order, EntityFamily.name)
    ).all()
    return [
        {
            "id": f.id,
            "name": f.name,
            "display_name": f.display_name,
            "description": f.description,
            "icon_key": f.icon_key,
        }
        for f in rows
    ]


def create_entity(session: Session, data: dict) -> dict:
    """Create a new entity."""
    # Validate unique canonical_name
    existing = session.exec(
        select(Entity).where(Entity.canonical_name == data["canonical_name"])
    ).first()
    if existing:
        raise HTTPException(409, detail=f"Entity with canonical_name '{data['canonical_name']}' already exists")

    # Validate entity_type_id FK
    et = session.get(EntityType, data["entity_type_id"])
    if not et:
        raise HTTPException(400, detail="entity_type_id references nonexistent entity type")

    # Validate entity_family_id FK
    ef = None
    if data.get("entity_family_id"):
        ef = session.get(EntityFamily, data["entity_family_id"])
        if not ef:
            raise HTTPException(400, detail="entity_family_id references nonexistent entity family")

    # Validate first_appearance_scene_id FK
    if data.get("first_appearance_scene_id"):
        scene = session.get(Scene, data["first_appearance_scene_id"])
        if not scene:
            raise HTTPException(400, detail="first_appearance_scene_id references nonexistent scene")

    now = _now()
    entity = Entity(**data, created_at=now, updated_at=now)
    session.add(entity)
    session.commit()
    session.refresh(entity)
    return _entity_to_dict(entity, entity_type=et, entity_family=ef)


def update_entity(session: Session, entity_id: int, data: dict) -> dict:
    """Update entity core fields."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    # Check unique canonical_name if changing
    if "canonical_name" in data and data["canonical_name"] != entity.canonical_name:
        existing = session.exec(
            select(Entity).where(Entity.canonical_name == data["canonical_name"])
        ).first()
        if existing:
            raise HTTPException(409, detail=f"canonical_name '{data['canonical_name']}' already in use")

    # Validate entity_type_id FK if changing
    if "entity_type_id" in data:
        if not session.get(EntityType, data["entity_type_id"]):
            raise HTTPException(400, detail="entity_type_id references nonexistent entity type")

    # Validate entity_family_id FK if changing
    if "entity_family_id" in data and data["entity_family_id"] is not None:
        if not session.get(EntityFamily, data["entity_family_id"]):
            raise HTTPException(400, detail="entity_family_id references nonexistent entity family")

    # Validate first_appearance_scene_id FK if changing
    if data.get("first_appearance_scene_id"):
        scene = session.get(Scene, data["first_appearance_scene_id"])
        if not scene:
            raise HTTPException(400, detail="first_appearance_scene_id references nonexistent scene")

    for key, val in data.items():
        setattr(entity, key, val)
    entity.updated_at = _now()
    session.add(entity)
    session.commit()
    session.refresh(entity)

    # Lookup entity type and family for display info
    et = session.get(EntityType, entity.entity_type_id) if entity.entity_type_id else None
    ef = session.get(EntityFamily, entity.entity_family_id) if entity.entity_family_id else None
    return _entity_to_dict(entity, entity_type=et, entity_family=ef)


def delete_entity(session: Session, entity_id: int) -> None:
    """Delete entity — block if references exist."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    scene_count = session.exec(
        select(func.count()).select_from(EntitySceneAppearance)
        .where(EntitySceneAppearance.entity_id == entity_id)
    ).one()
    beat_count = session.exec(
        select(func.count()).select_from(EntityBeatAppearance)
        .where(EntityBeatAppearance.entity_id == entity_id)
    ).one()
    total_refs = scene_count + beat_count
    if total_refs > 0:
        raise HTTPException(
            409,
            detail=f"Cannot delete: {total_refs} references exist ({scene_count} scene appearances, {beat_count} beat appearances)"
        )

    session.delete(entity)
    session.commit()


def upsert_gameplay_data(session: Session, entity_id: int, data: dict) -> dict:
    """Upsert EntityGameplayData for an entity."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    gp = session.exec(
        select(EntityGameplayData).where(EntityGameplayData.entity_id == entity_id)
    ).first()

    now = _now()
    if gp:
        for key, val in data.items():
            setattr(gp, key, val)
        gp.updated_at = now
    else:
        gp = EntityGameplayData(entity_id=entity_id, **data, created_at=now, updated_at=now)

    session.add(gp)
    session.commit()
    session.refresh(gp)
    return _gameplay_to_dict(gp)


def delete_gameplay_data(session: Session, entity_id: int) -> None:
    """Delete EntityGameplayData for an entity."""
    gp = session.exec(
        select(EntityGameplayData).where(EntityGameplayData.entity_id == entity_id)
    ).first()
    if not gp:
        raise HTTPException(404, detail="No gameplay data found for this entity")
    session.delete(gp)
    session.commit()


def replace_attack_types(session: Session, entity_id: int, assignments: list[dict]) -> list[dict]:
    """Replace all attack type assignments. Validate at most 1 primary."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    primary_count = sum(1 for a in assignments if a.get("is_primary", False))
    if primary_count > 1:
        raise HTTPException(400, detail="At most 1 attack type can be marked as primary")

    # Validate all attack_type_ids exist
    for a in assignments:
        at = session.get(AttackType, a["attack_type_id"])
        if not at:
            raise HTTPException(400, detail=f"AttackType with id {a['attack_type_id']} not found")

    # Delete existing
    existing = session.exec(
        select(EntityAttackType).where(EntityAttackType.entity_id == entity_id)
    ).all()
    for e in existing:
        session.delete(e)

    # Create new
    now = _now()
    result = []
    for a in assignments:
        eat = EntityAttackType(
            entity_id=entity_id,
            attack_type_id=a["attack_type_id"],
            is_primary=a.get("is_primary", False),
            created_at=now,
        )
        session.add(eat)
        session.flush()
        result.append({
            "id": eat.id,
            "attack_type_id": eat.attack_type_id,
            "is_primary": eat.is_primary,
        })

    session.commit()
    return result


def add_alias(session: Session, entity_id: int, alias: str, context: Optional[str] = None) -> dict:
    """Add an alias for an entity. Validate unique per entity."""
    entity = session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(404, detail="Entity not found")

    existing = session.exec(
        select(EntityAlias)
        .where(EntityAlias.entity_id == entity_id)
        .where(EntityAlias.alias == alias)
    ).first()
    if existing:
        raise HTTPException(409, detail=f"Alias '{alias}' already exists for this entity")

    ea = EntityAlias(entity_id=entity_id, alias=alias, context=context)
    session.add(ea)
    session.commit()
    session.refresh(ea)
    return {"id": ea.id, "entity_id": ea.entity_id, "alias": ea.alias, "context": ea.context}


def remove_alias(session: Session, entity_id: int, alias_id: int) -> None:
    """Remove an alias."""
    ea = session.get(EntityAlias, alias_id)
    if not ea or ea.entity_id != entity_id:
        raise HTTPException(404, detail="Alias not found for this entity")
    session.delete(ea)
    session.commit()


# ---------------------------------------------------------------------------
# Entity-Scene Appearances
# ---------------------------------------------------------------------------

def list_entity_scenes(
    session: Session,
    *,
    scene_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    base = select(EntitySceneAppearance)
    count_q = select(func.count()).select_from(EntitySceneAppearance)

    if scene_id:
        base = base.where(EntitySceneAppearance.scene_id == scene_id)
        count_q = count_q.where(EntitySceneAppearance.scene_id == scene_id)
    if entity_id:
        base = base.where(EntitySceneAppearance.entity_id == entity_id)
        count_q = count_q.where(EntitySceneAppearance.entity_id == entity_id)

    total = session.exec(count_q).one()
    rows = session.exec(base.offset((page - 1) * page_size).limit(page_size)).all()
    items = [_esa_to_dict(r) for r in rows]
    return _paginated(items, total, page, page_size)


def create_entity_scene(session: Session, data: dict) -> dict:
    """Create a single entity-scene appearance."""
    _validate_entity_scene_fks(session, data["entity_id"], data["scene_id"])
    now = _now()
    esa = EntitySceneAppearance(**data, created_at=now, updated_at=now)
    session.add(esa)
    session.commit()
    session.refresh(esa)
    return _esa_to_dict(esa)


def bulk_create_entity_scenes(session: Session, items: list[dict]) -> dict:
    """Bulk create entity-scene appearances, skipping duplicates."""
    created = 0
    skipped = 0

    for item in items:
        entity_id = item["entity_id"]
        scene_id = item["scene_id"]

        # Check for existing
        existing = session.exec(
            select(EntitySceneAppearance)
            .where(EntitySceneAppearance.entity_id == entity_id)
            .where(EntitySceneAppearance.scene_id == scene_id)
        ).first()

        if existing:
            skipped += 1
            continue

        _validate_entity_scene_fks(session, entity_id, scene_id)
        now = _now()
        esa = EntitySceneAppearance(**item, created_at=now, updated_at=now)
        session.add(esa)
        created += 1

    session.commit()
    return {"created": created, "skipped": skipped}


def copy_entity_scenes(session: Session, source_scene_id: int, target_scene_id: int) -> dict:
    """Copy all entity-scene appearances from one scene to another."""
    # Validate target scene exists
    target = session.get(Scene, target_scene_id)
    if not target:
        raise HTTPException(400, detail="Target scene not found")

    source_rows = session.exec(
        select(EntitySceneAppearance).where(EntitySceneAppearance.scene_id == source_scene_id)
    ).all()

    if not source_rows:
        return {"created": 0, "skipped": 0}

    created = 0
    skipped = 0
    now = _now()

    for row in source_rows:
        # Check for duplicate in target
        existing = session.exec(
            select(EntitySceneAppearance)
            .where(EntitySceneAppearance.entity_id == row.entity_id)
            .where(EntitySceneAppearance.scene_id == target_scene_id)
        ).first()
        if existing:
            skipped += 1
            continue

        esa = EntitySceneAppearance(
            entity_id=row.entity_id,
            scene_id=target_scene_id,
            role=row.role,
            is_present=row.is_present,
            description_delta=row.description_delta,
            emotional_state_delta=row.emotional_state_delta,
            equipment_delta=row.equipment_delta,
            exit_reason=row.exit_reason,
            entry_context=row.entry_context,
            relationships=row.relationships,
            created_at=now,
            updated_at=now,
        )
        session.add(esa)
        created += 1

    session.commit()
    return {"created": created, "skipped": skipped}


def update_entity_scene(session: Session, esa_id: int, data: dict) -> dict:
    esa = session.get(EntitySceneAppearance, esa_id)
    if not esa:
        raise HTTPException(404, detail="Entity-scene appearance not found")
    for key, val in data.items():
        setattr(esa, key, val)
    esa.updated_at = _now()
    session.add(esa)
    session.commit()
    session.refresh(esa)
    return _esa_to_dict(esa)


def delete_entity_scene(session: Session, esa_id: int) -> None:
    esa = session.get(EntitySceneAppearance, esa_id)
    if not esa:
        raise HTTPException(404, detail="Entity-scene appearance not found")
    session.delete(esa)
    session.commit()


# ---------------------------------------------------------------------------
# Entity-Beat Appearances
# ---------------------------------------------------------------------------

def list_entity_beats(
    session: Session,
    *,
    story_beat_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    base = select(EntityBeatAppearance)
    count_q = select(func.count()).select_from(EntityBeatAppearance)

    if story_beat_id:
        base = base.where(EntityBeatAppearance.story_beat_id == story_beat_id)
        count_q = count_q.where(EntityBeatAppearance.story_beat_id == story_beat_id)
    if entity_id:
        base = base.where(EntityBeatAppearance.entity_id == entity_id)
        count_q = count_q.where(EntityBeatAppearance.entity_id == entity_id)

    total = session.exec(count_q).one()
    rows = session.exec(base.offset((page - 1) * page_size).limit(page_size)).all()
    items = [_eba_to_dict(r) for r in rows]
    return _paginated(items, total, page, page_size)


def create_entity_beat(session: Session, data: dict) -> dict:
    _validate_entity_beat_fks(session, data["entity_id"], data["story_beat_id"])
    now = _now()
    eba = EntityBeatAppearance(**data, created_at=now)
    session.add(eba)
    session.commit()
    session.refresh(eba)
    return _eba_to_dict(eba)


def bulk_create_entity_beats(session: Session, items: list[dict]) -> dict:
    created = 0
    skipped = 0

    for item in items:
        existing = session.exec(
            select(EntityBeatAppearance)
            .where(EntityBeatAppearance.entity_id == item["entity_id"])
            .where(EntityBeatAppearance.story_beat_id == item["story_beat_id"])
        ).first()
        if existing:
            skipped += 1
            continue

        _validate_entity_beat_fks(session, item["entity_id"], item["story_beat_id"])
        now = _now()
        eba = EntityBeatAppearance(**item, created_at=now)
        session.add(eba)
        created += 1

    session.commit()
    return {"created": created, "skipped": skipped}


def update_entity_beat(session: Session, eba_id: int, data: dict) -> dict:
    eba = session.get(EntityBeatAppearance, eba_id)
    if not eba:
        raise HTTPException(404, detail="Entity-beat appearance not found")
    for key, val in data.items():
        setattr(eba, key, val)
    session.add(eba)
    session.commit()
    session.refresh(eba)
    return _eba_to_dict(eba)


def delete_entity_beat(session: Session, eba_id: int) -> None:
    eba = session.get(EntityBeatAppearance, eba_id)
    if not eba:
        raise HTTPException(404, detail="Entity-beat appearance not found")
    session.delete(eba)
    session.commit()


# ---------------------------------------------------------------------------
# Story Beats
# ---------------------------------------------------------------------------

def list_beats(
    session: Session,
    *,
    scene_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    base = select(StoryBeat)
    count_q = select(func.count()).select_from(StoryBeat)

    if scene_id:
        base = base.where(StoryBeat.scene_id == scene_id)
        count_q = count_q.where(StoryBeat.scene_id == scene_id)

    total = session.exec(count_q).one()
    beats = session.exec(
        base.order_by(StoryBeat.sort_order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    beat_ids = [b.id for b in beats]
    if not beat_ids:
        return _paginated([], total, page, page_size)

    # semantic_tag_count
    tag_counts = dict(
        session.exec(
            select(SemanticTag.story_beat_id, func.count())
            .where(col(SemanticTag.story_beat_id).in_(beat_ids))
            .group_by(SemanticTag.story_beat_id)
        ).all()
    )
    # entity_appearance_count
    eba_counts = dict(
        session.exec(
            select(EntityBeatAppearance.story_beat_id, func.count())
            .where(col(EntityBeatAppearance.story_beat_id).in_(beat_ids))
            .group_by(EntityBeatAppearance.story_beat_id)
        ).all()
    )

    items = []
    for b in beats:
        d = _beat_to_dict(b)
        d["semantic_tag_count"] = tag_counts.get(b.id, 0)
        d["entity_appearance_count"] = eba_counts.get(b.id, 0)
        items.append(d)

    return _paginated(items, total, page, page_size)


def get_beat_detail(session: Session, beat_id: int) -> dict:
    beat = session.get(StoryBeat, beat_id)
    if not beat:
        raise HTTPException(404, detail="Story beat not found")
    return _beat_to_dict(beat)


def create_beat(session: Session, data: dict) -> dict:
    # Validate scene_id FK
    scene = session.get(Scene, data["scene_id"])
    if not scene:
        raise HTTPException(400, detail="scene_id references nonexistent scene")

    now = _now()
    beat = StoryBeat(**data, created_at=now, updated_at=now)
    session.add(beat)
    session.commit()
    session.refresh(beat)
    return _beat_to_dict(beat)


def update_beat(session: Session, beat_id: int, data: dict) -> dict:
    beat = session.get(StoryBeat, beat_id)
    if not beat:
        raise HTTPException(404, detail="Story beat not found")
    for key, val in data.items():
        setattr(beat, key, val)
    beat.updated_at = _now()
    session.add(beat)
    session.commit()
    session.refresh(beat)
    return _beat_to_dict(beat)


def reorder_beats(session: Session, scene_id: int, beat_ids: list[int]) -> list[dict]:
    """Reorder beats within a scene by assigning new sort_order values."""
    scene = session.get(Scene, scene_id)
    if not scene:
        raise HTTPException(400, detail="Scene not found")

    beats = session.exec(
        select(StoryBeat).where(StoryBeat.scene_id == scene_id)
    ).all()
    beat_map = {b.id: b for b in beats}

    # Validate all beat_ids belong to this scene
    for bid in beat_ids:
        if bid not in beat_map:
            raise HTTPException(400, detail=f"Beat {bid} does not belong to scene {scene_id}")

    now = _now()
    result = []
    for idx, bid in enumerate(beat_ids):
        beat = beat_map[bid]
        beat.sort_order = idx + 1
        beat.updated_at = now
        session.add(beat)
        result.append(_beat_to_dict(beat))

    session.commit()
    return result


def delete_beat(session: Session, beat_id: int) -> None:
    beat = session.get(StoryBeat, beat_id)
    if not beat:
        raise HTTPException(404, detail="Story beat not found")

    eba_count = session.exec(
        select(func.count()).select_from(EntityBeatAppearance)
        .where(EntityBeatAppearance.story_beat_id == beat_id)
    ).one()
    tag_count = session.exec(
        select(func.count()).select_from(SemanticTag)
        .where(SemanticTag.story_beat_id == beat_id)
    ).one()
    total_refs = eba_count + tag_count
    if total_refs > 0:
        raise HTTPException(
            409,
            detail=f"Cannot delete: {total_refs} references exist ({eba_count} entity appearances, {tag_count} semantic tags)"
        )

    session.delete(beat)
    session.commit()


# ---------------------------------------------------------------------------
# Semantic Tags
# ---------------------------------------------------------------------------

def list_semantic_tags(
    session: Session,
    *,
    story_beat_id: Optional[int] = None,
    category: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    base = select(SemanticTag)
    count_q = select(func.count()).select_from(SemanticTag)

    if story_beat_id:
        base = base.where(SemanticTag.story_beat_id == story_beat_id)
        count_q = count_q.where(SemanticTag.story_beat_id == story_beat_id)
    if category:
        base = base.where(SemanticTag.category == category)
        count_q = count_q.where(SemanticTag.category == category)

    total = session.exec(count_q).one()
    rows = session.exec(base.offset((page - 1) * page_size).limit(page_size)).all()
    items = [_tag_to_dict(r) for r in rows]
    return _paginated(items, total, page, page_size)


def semantic_tag_analytics(session: Session) -> dict:
    """Aggregate analytics for semantic tags."""
    total_tags = session.exec(select(func.count()).select_from(SemanticTag)).one()
    total_beats = session.exec(select(func.count()).select_from(StoryBeat)).one()

    # Category counts
    cat_rows = session.exec(
        select(SemanticTag.category, func.count())
        .group_by(SemanticTag.category)
        .order_by(func.count().desc())
    ).all()
    category_counts = {cat: cnt for cat, cnt in cat_rows}

    # Top values (top 20)
    val_rows = session.exec(
        select(SemanticTag.value, func.count())
        .group_by(SemanticTag.value)
        .order_by(func.count().desc())
        .limit(20)
    ).all()
    top_values = [{"value": v, "count": c} for v, c in val_rows]

    # Orphan beats (beats with no semantic tags)
    tagged_beat_ids = select(SemanticTag.story_beat_id).distinct()
    orphan_count = session.exec(
        select(func.count()).select_from(StoryBeat)
        .where(col(StoryBeat.id).not_in(tagged_beat_ids))
    ).one()

    return {
        "total_tags": total_tags,
        "total_beats": total_beats,
        "category_counts": category_counts,
        "top_values": top_values,
        "orphan_beat_count": orphan_count,
    }


def create_semantic_tag(session: Session, data: dict) -> dict:
    # Validate story_beat_id FK
    beat = session.get(StoryBeat, data["story_beat_id"])
    if not beat:
        raise HTTPException(400, detail="story_beat_id references nonexistent beat")

    now = _now()
    tag = SemanticTag(**data, created_at=now, updated_at=now)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _tag_to_dict(tag)


def bulk_create_semantic_tags(session: Session, story_beat_id: int, tags: list[dict]) -> dict:
    """Bulk create semantic tags for a single beat."""
    beat = session.get(StoryBeat, story_beat_id)
    if not beat:
        raise HTTPException(400, detail="story_beat_id references nonexistent beat")

    created = 0
    now = _now()
    for t in tags:
        tag = SemanticTag(
            story_beat_id=story_beat_id,
            category=t["category"],
            value=t["value"],
            canonical_value=t.get("canonical_value"),
            notes=t.get("notes"),
            ai_provider=t.get("ai_provider"),
            ai_model_id=t.get("ai_model_id"),
            created_at=now,
            updated_at=now,
        )
        session.add(tag)
        created += 1

    session.commit()
    return {"created": created}


def update_semantic_tag(session: Session, tag_id: int, data: dict) -> dict:
    tag = session.get(SemanticTag, tag_id)
    if not tag:
        raise HTTPException(404, detail="Semantic tag not found")
    for key, val in data.items():
        setattr(tag, key, val)
    tag.updated_at = _now()
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return _tag_to_dict(tag)


def rename_semantic_tag_value(session: Session, category: str, old_value: str, new_value: str) -> dict:
    """Rename a value across all tags in a category."""
    tags = session.exec(
        select(SemanticTag)
        .where(SemanticTag.category == category)
        .where(SemanticTag.value == old_value)
    ).all()

    if not tags:
        raise HTTPException(404, detail=f"No tags found with category='{category}' and value='{old_value}'")

    now = _now()
    for tag in tags:
        tag.value = new_value
        tag.updated_at = now
        session.add(tag)

    session.commit()
    return {"updated": len(tags)}


def delete_semantic_tag(session: Session, tag_id: int) -> None:
    tag = session.get(SemanticTag, tag_id)
    if not tag:
        raise HTTPException(404, detail="Semantic tag not found")
    session.delete(tag)
    session.commit()


# ---------------------------------------------------------------------------
# FK Validation helpers
# ---------------------------------------------------------------------------

def _validate_entity_scene_fks(session: Session, entity_id: int, scene_id: int) -> None:
    if not session.get(Entity, entity_id):
        raise HTTPException(400, detail=f"Entity {entity_id} not found")
    if not session.get(Scene, scene_id):
        raise HTTPException(400, detail=f"Scene {scene_id} not found")


def _validate_entity_beat_fks(session: Session, entity_id: int, story_beat_id: int) -> None:
    if not session.get(Entity, entity_id):
        raise HTTPException(400, detail=f"Entity {entity_id} not found")
    if not session.get(StoryBeat, story_beat_id):
        raise HTTPException(400, detail=f"StoryBeat {story_beat_id} not found")


# ---------------------------------------------------------------------------
# Serialization helpers
# ---------------------------------------------------------------------------

def _entity_to_dict(e: Entity, *, entity_type: Optional[EntityType] = None, entity_family: Optional[EntityFamily] = None) -> dict:
    return {
        "id": e.id,
        "canonical_name": e.canonical_name,
        "entity_type_id": e.entity_type_id,
        "entity_type_name": entity_type.name if entity_type else None,
        "entity_type_display_name": entity_type.display_name if entity_type else None,
        "entity_type_color_hex": entity_type.color_hex if entity_type else None,
        "entity_family_id": e.entity_family_id,
        "entity_family_name": entity_family.name if entity_family else None,
        "entity_family_display_name": entity_family.display_name if entity_family else None,
        "is_generated": e.is_generated,
        "base_description": e.base_description,
        "base_emotional_state": e.base_emotional_state,
        "base_sounds": e.base_sounds,
        "base_smells": e.base_smells,
        "base_equipment": e.base_equipment,
        "base_abilities": e.base_abilities,
        "boss_text_references": e.boss_text_references,
        "boss_action_quote": e.boss_action_quote,
        "boss_variant_differences": e.boss_variant_differences,
        "first_appearance_scene_id": e.first_appearance_scene_id,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }


def _gameplay_to_dict(gp: EntityGameplayData) -> dict:
    return {
        "id": gp.id,
        "entity_id": gp.entity_id,
        "sprite_key": gp.sprite_key,
        "base_hp": gp.base_hp,
        "base_gold": gp.base_gold,
        "appearance_rate": gp.appearance_rate,
        "stat_block": gp.stat_block,
        "unique_boss_theme_id": gp.unique_boss_theme_id,
        "death_sfx_key": gp.death_sfx_key,
        "created_at": gp.created_at.isoformat() if gp.created_at else None,
        "updated_at": gp.updated_at.isoformat() if gp.updated_at else None,
    }


def _esa_to_dict(esa: EntitySceneAppearance) -> dict:
    return {
        "id": esa.id,
        "entity_id": esa.entity_id,
        "scene_id": esa.scene_id,
        "role": esa.role,
        "is_present": esa.is_present,
        "description_delta": esa.description_delta,
        "emotional_state_delta": esa.emotional_state_delta,
        "equipment_delta": esa.equipment_delta,
        "exit_reason": esa.exit_reason,
        "entry_context": esa.entry_context,
        "relationships": esa.relationships,
        "created_at": esa.created_at.isoformat() if esa.created_at else None,
        "updated_at": esa.updated_at.isoformat() if esa.updated_at else None,
    }


def _eba_to_dict(eba: EntityBeatAppearance) -> dict:
    return {
        "id": eba.id,
        "entity_id": eba.entity_id,
        "story_beat_id": eba.story_beat_id,
        "role": eba.role,
        "is_primary": eba.is_primary,
        "beat_context": eba.beat_context,
        "created_at": eba.created_at.isoformat() if eba.created_at else None,
    }


def _beat_to_dict(b: StoryBeat) -> dict:
    return {
        "id": b.id,
        "scene_id": b.scene_id,
        "beat_number": b.beat_number,
        "summary": b.summary,
        "raw_text": b.raw_text,
        "sort_order": b.sort_order,
        "location_id": b.location_id,
        "intensity": b.intensity,
        "pacing": b.pacing,
        "timeline_context": b.timeline_context,
        "hidden_lore_text": b.hidden_lore_text,
        "lore_intelligence_threshold": b.lore_intelligence_threshold,
        "content_image_path": b.content_image_path,
        "audio_path": b.audio_path,
        "audio_duration_seconds": b.audio_duration_seconds,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _tag_to_dict(t: SemanticTag) -> dict:
    return {
        "id": t.id,
        "story_beat_id": t.story_beat_id,
        "category": t.category,
        "value": t.value,
        "canonical_value": t.canonical_value,
        "notes": t.notes,
        "ai_provider": t.ai_provider,
        "ai_model_id": t.ai_model_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }
