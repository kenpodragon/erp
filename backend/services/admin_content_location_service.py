"""Service layer for admin content location management (REC 5.2.3).

Handles business logic for Location CRUD, LocationAlias management,
and LocationSceneAppearance operations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select, func, col
from sqlalchemy import or_

from models import (
    Location, LocationAlias, LocationSceneAppearance,
    Scene, Chapter, Book, Atmosphere,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Location queries
# ---------------------------------------------------------------------------

def list_locations(
    session: Session,
    *,
    location_type: Optional[str] = None,
    has_archetype: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    """Return paginated locations with aggregated metadata."""

    # Base query
    stmt = select(Location)

    # Filters
    if location_type:
        stmt = stmt.where(Location.location_type == location_type)
    if has_archetype is True:
        stmt = stmt.where(Location.archetype_id.isnot(None))  # type: ignore[union-attr]
    elif has_archetype is False:
        stmt = stmt.where(Location.archetype_id.is_(None))  # type: ignore[union-attr]
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                col(Location.canonical_name).ilike(pattern),
                col(Location.description).ilike(pattern),
            )
        )

    # Total count (before pagination)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = session.exec(count_stmt).one()

    # Paginate
    offset = (page - 1) * page_size
    locations = session.exec(
        stmt.order_by(Location.canonical_name).offset(offset).limit(page_size)
    ).all()

    items = []
    for loc in locations:
        # first_appearance_scene title
        first_scene_title = None
        if loc.first_appearance_scene_id:
            scene = session.get(Scene, loc.first_appearance_scene_id)
            if scene:
                first_scene_title = scene.title

        # archetype name
        archetype_name = None
        if loc.archetype_id:
            atm = session.get(Atmosphere, loc.archetype_id)
            if atm:
                archetype_name = atm.name

        # scene_count (location_scene_appearances)
        scene_count = session.exec(
            select(func.count()).where(
                LocationSceneAppearance.location_id == loc.id
            )
        ).one()

        # alias_count
        alias_count = session.exec(
            select(func.count()).where(LocationAlias.location_id == loc.id)
        ).one()

        items.append({
            "id": loc.id,
            "canonical_name": loc.canonical_name,
            "description": loc.description,
            "location_type": loc.location_type,
            "base_visual": loc.base_visual,
            "base_auditory": loc.base_auditory,
            "base_olfactory": loc.base_olfactory,
            "base_tactile": loc.base_tactile,
            "base_atmosphere": loc.base_atmosphere,
            "first_appearance_scene_id": loc.first_appearance_scene_id,
            "first_appearance_scene_title": first_scene_title,
            "archetype_id": loc.archetype_id,
            "archetype_name": archetype_name,
            "scene_count": scene_count,
            "alias_count": alias_count,
            "created_at": loc.created_at.isoformat() if loc.created_at else None,
            "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_location_detail(session: Session, location_id: int) -> dict:
    """Return a single location with aliases and scene appearances inline."""
    loc = session.get(Location, location_id)
    if not loc:
        return None  # type: ignore[return-value]

    # Aliases
    aliases = session.exec(
        select(LocationAlias).where(LocationAlias.location_id == location_id)
    ).all()
    alias_list = [
        {"id": a.id, "alias": a.alias, "context": a.context}
        for a in aliases
    ]

    # Scene appearances with scene title / chapter / book info
    appearances = session.exec(
        select(LocationSceneAppearance).where(
            LocationSceneAppearance.location_id == location_id
        )
    ).all()
    appearance_list = []
    for app in appearances:
        scene = session.get(Scene, app.scene_id)
        chapter_title = None
        book_title = None
        scene_title = None
        if scene:
            scene_title = scene.title
            chapter = session.get(Chapter, scene.chapter_id)
            if chapter:
                chapter_title = chapter.title
                book = session.get(Book, chapter.book_id)
                if book:
                    book_title = book.title

        appearance_list.append({
            "id": app.id,
            "scene_id": app.scene_id,
            "scene_title": scene_title,
            "chapter_title": chapter_title,
            "book_title": book_title,
            "visual_delta": app.visual_delta,
            "auditory_delta": app.auditory_delta,
            "olfactory_delta": app.olfactory_delta,
            "tactile_delta": app.tactile_delta,
            "atmosphere_delta": app.atmosphere_delta,
            "ai_provider": app.ai_provider,
            "ai_model_id": app.ai_model_id,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })

    # Archetype name
    archetype_name = None
    if loc.archetype_id:
        atm = session.get(Atmosphere, loc.archetype_id)
        if atm:
            archetype_name = atm.name

    # First appearance scene title
    first_scene_title = None
    if loc.first_appearance_scene_id:
        scene = session.get(Scene, loc.first_appearance_scene_id)
        if scene:
            first_scene_title = scene.title

    return {
        "id": loc.id,
        "canonical_name": loc.canonical_name,
        "description": loc.description,
        "location_type": loc.location_type,
        "base_visual": loc.base_visual,
        "base_auditory": loc.base_auditory,
        "base_olfactory": loc.base_olfactory,
        "base_tactile": loc.base_tactile,
        "base_atmosphere": loc.base_atmosphere,
        "first_appearance_scene_id": loc.first_appearance_scene_id,
        "first_appearance_scene_title": first_scene_title,
        "archetype_id": loc.archetype_id,
        "archetype_name": archetype_name,
        "aliases": alias_list,
        "scene_appearances": appearance_list,
        "created_at": loc.created_at.isoformat() if loc.created_at else None,
        "updated_at": loc.updated_at.isoformat() if loc.updated_at else None,
    }


def get_distinct_location_types(session: Session) -> list[str]:
    """Return sorted distinct location_type values (non-null)."""
    rows = session.exec(
        select(Location.location_type)
        .where(Location.location_type.isnot(None))  # type: ignore[union-attr]
        .distinct()
        .order_by(Location.location_type)
    ).all()
    return [r for r in rows if r]


def create_location(session: Session, data: dict) -> Location:
    """Create a new location. Raises ValueError on duplicate canonical_name."""
    existing = session.exec(
        select(Location).where(Location.canonical_name == data["canonical_name"])
    ).first()
    if existing:
        raise ValueError(f"Location with canonical_name '{data['canonical_name']}' already exists")

    # Validate FK references
    if data.get("first_appearance_scene_id"):
        if not session.get(Scene, data["first_appearance_scene_id"]):
            raise ValueError(f"Scene {data['first_appearance_scene_id']} does not exist")
    if data.get("archetype_id"):
        if not session.get(Atmosphere, data["archetype_id"]):
            raise ValueError(f"Atmosphere {data['archetype_id']} does not exist")

    now = datetime.now(timezone.utc)
    loc = Location(
        canonical_name=data["canonical_name"],
        description=data.get("description"),
        location_type=data.get("location_type"),
        base_visual=data.get("base_visual"),
        base_auditory=data.get("base_auditory"),
        base_olfactory=data.get("base_olfactory"),
        base_tactile=data.get("base_tactile"),
        base_atmosphere=data.get("base_atmosphere"),
        first_appearance_scene_id=data.get("first_appearance_scene_id"),
        archetype_id=data.get("archetype_id"),
        created_at=now,
        updated_at=now,
    )
    session.add(loc)
    session.commit()
    session.refresh(loc)
    return loc


def update_location(session: Session, location_id: int, data: dict) -> Location:
    """Update an existing location. Returns the updated record."""
    loc = session.get(Location, location_id)
    if not loc:
        raise LookupError(f"Location {location_id} not found")

    # Validate unique canonical_name if changed
    if "canonical_name" in data and data["canonical_name"] != loc.canonical_name:
        existing = session.exec(
            select(Location).where(Location.canonical_name == data["canonical_name"])
        ).first()
        if existing:
            raise ValueError(f"Location with canonical_name '{data['canonical_name']}' already exists")

    # Validate FK references
    if "first_appearance_scene_id" in data and data["first_appearance_scene_id"] is not None:
        if not session.get(Scene, data["first_appearance_scene_id"]):
            raise ValueError(f"Scene {data['first_appearance_scene_id']} does not exist")
    if "archetype_id" in data and data["archetype_id"] is not None:
        if not session.get(Atmosphere, data["archetype_id"]):
            raise ValueError(f"Atmosphere {data['archetype_id']} does not exist")

    updatable_fields = [
        "canonical_name", "description", "location_type",
        "base_visual", "base_auditory", "base_olfactory",
        "base_tactile", "base_atmosphere",
        "first_appearance_scene_id", "archetype_id",
    ]
    for field in updatable_fields:
        if field in data:
            setattr(loc, field, data[field])

    loc.updated_at = datetime.now(timezone.utc)
    session.add(loc)
    session.commit()
    session.refresh(loc)
    return loc


def delete_location(session: Session, location_id: int) -> None:
    """Delete a location. Raises ValueError if references exist."""
    loc = session.get(Location, location_id)
    if not loc:
        raise LookupError(f"Location {location_id} not found")

    # Check location_scene_appearances references
    lsa_count = session.exec(
        select(func.count()).where(LocationSceneAppearance.location_id == location_id)
    ).one()

    # Check scenes.primary_location_id references
    scene_ref_count = session.exec(
        select(func.count()).where(Scene.primary_location_id == location_id)
    ).one()

    total_refs = lsa_count + scene_ref_count
    if total_refs > 0:
        raise ValueError(f"Cannot delete: {total_refs} references exist")

    # Also delete any aliases
    aliases = session.exec(
        select(LocationAlias).where(LocationAlias.location_id == location_id)
    ).all()
    for alias in aliases:
        session.delete(alias)

    session.delete(loc)
    session.commit()


# ---------------------------------------------------------------------------
# Location Alias operations
# ---------------------------------------------------------------------------

def add_location_alias(session: Session, location_id: int, alias: str, context: Optional[str] = None) -> LocationAlias:
    """Add an alias to a location. Validates uniqueness per location."""
    loc = session.get(Location, location_id)
    if not loc:
        raise LookupError(f"Location {location_id} not found")

    existing = session.exec(
        select(LocationAlias).where(
            LocationAlias.location_id == location_id,
            LocationAlias.alias == alias,
        )
    ).first()
    if existing:
        raise ValueError(f"Alias '{alias}' already exists for location {location_id}")

    la = LocationAlias(
        location_id=location_id,
        alias=alias,
        context=context,
    )
    session.add(la)
    session.commit()
    session.refresh(la)
    return la


def delete_location_alias(session: Session, location_id: int, alias_id: int) -> None:
    """Remove an alias. Validates it belongs to the given location."""
    la = session.get(LocationAlias, alias_id)
    if not la:
        raise LookupError(f"LocationAlias {alias_id} not found")
    if la.location_id != location_id:
        raise ValueError(f"Alias {alias_id} does not belong to location {location_id}")
    session.delete(la)
    session.commit()


# ---------------------------------------------------------------------------
# Location-Scene Appearance operations
# ---------------------------------------------------------------------------

def list_location_scenes(
    session: Session,
    *,
    location_id: Optional[int] = None,
    scene_id: Optional[int] = None,
) -> list[dict]:
    """List location-scene appearances filtered by location_id or scene_id."""
    stmt = select(LocationSceneAppearance)
    if location_id is not None:
        stmt = stmt.where(LocationSceneAppearance.location_id == location_id)
    if scene_id is not None:
        stmt = stmt.where(LocationSceneAppearance.scene_id == scene_id)

    appearances = session.exec(stmt.order_by(LocationSceneAppearance.id)).all()
    results = []
    for app in appearances:
        loc = session.get(Location, app.location_id)
        scene = session.get(Scene, app.scene_id)
        results.append({
            "id": app.id,
            "location_id": app.location_id,
            "location_name": loc.canonical_name if loc else None,
            "scene_id": app.scene_id,
            "scene_title": scene.title if scene else None,
            "visual_delta": app.visual_delta,
            "auditory_delta": app.auditory_delta,
            "olfactory_delta": app.olfactory_delta,
            "tactile_delta": app.tactile_delta,
            "atmosphere_delta": app.atmosphere_delta,
            "ai_provider": app.ai_provider,
            "ai_model_id": app.ai_model_id,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "updated_at": app.updated_at.isoformat() if app.updated_at else None,
        })
    return results


def create_location_scene(session: Session, data: dict) -> LocationSceneAppearance:
    """Create a location-scene appearance. Validates uniqueness on location_id+scene_id."""
    # Validate FKs
    if not session.get(Location, data["location_id"]):
        raise ValueError(f"Location {data['location_id']} does not exist")
    if not session.get(Scene, data["scene_id"]):
        raise ValueError(f"Scene {data['scene_id']} does not exist")

    existing = session.exec(
        select(LocationSceneAppearance).where(
            LocationSceneAppearance.location_id == data["location_id"],
            LocationSceneAppearance.scene_id == data["scene_id"],
        )
    ).first()
    if existing:
        raise ValueError(
            f"Location-scene appearance already exists for "
            f"location {data['location_id']} + scene {data['scene_id']}"
        )

    now = datetime.now(timezone.utc)
    lsa = LocationSceneAppearance(
        location_id=data["location_id"],
        scene_id=data["scene_id"],
        visual_delta=data.get("visual_delta"),
        auditory_delta=data.get("auditory_delta"),
        olfactory_delta=data.get("olfactory_delta"),
        tactile_delta=data.get("tactile_delta"),
        atmosphere_delta=data.get("atmosphere_delta"),
        ai_provider=data.get("ai_provider"),
        ai_model_id=data.get("ai_model_id"),
        created_at=now,
        updated_at=now,
    )
    session.add(lsa)
    session.commit()
    session.refresh(lsa)
    return lsa


def update_location_scene(session: Session, lsa_id: int, data: dict) -> LocationSceneAppearance:
    """Update delta fields on a location-scene appearance."""
    lsa = session.get(LocationSceneAppearance, lsa_id)
    if not lsa:
        raise LookupError(f"LocationSceneAppearance {lsa_id} not found")

    updatable_fields = [
        "visual_delta", "auditory_delta", "olfactory_delta",
        "tactile_delta", "atmosphere_delta",
        "ai_provider", "ai_model_id",
    ]
    for field in updatable_fields:
        if field in data:
            setattr(lsa, field, data[field])

    lsa.updated_at = datetime.now(timezone.utc)
    session.add(lsa)
    session.commit()
    session.refresh(lsa)
    return lsa


def delete_location_scene(session: Session, lsa_id: int) -> None:
    """Delete a location-scene appearance."""
    lsa = session.get(LocationSceneAppearance, lsa_id)
    if not lsa:
        raise LookupError(f"LocationSceneAppearance {lsa_id} not found")
    session.delete(lsa)
    session.commit()
