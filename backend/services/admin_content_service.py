"""Admin Content Editor service (REC 5.2.1) — Books, Chapters, Scenes, Backgrounds, Wave Configs.

Business logic for the admin content management endpoints.
All mutating functions accept admin_email and ip for audit trail.
"""

import logging
from datetime import datetime, timezone
from typing import Optional, List, Any

from sqlmodel import Session, select
from sqlalchemy import func

from models import (
    Book, Chapter, Scene, StoryBeat, Location,
    SceneGameplayData, Entity, EntityGameplayData,
    Atmosphere, AssetRegistryEntry,
)
from models.content import Background, SceneWaveConfig, EntityBeatAppearance
from models.story_mode import EntitySceneAppearance
from audit import write_audit_log

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _paginate(query, page: int, page_size: int):
    """Return (offset, limit) for the given page parameters."""
    offset = (page - 1) * page_size
    return offset, page_size


# ===========================================================================
#  BOOKS
# ===========================================================================

def list_books(session: Session) -> list[dict]:
    """Return all books with chapter_count, scene_count, atmosphere_name."""
    books = session.exec(select(Book).order_by(Book.book_number)).all()
    results = []
    for b in books:
        chapter_count = session.exec(
            select(func.count()).select_from(Chapter).where(Chapter.book_id == b.id)
        ).one()
        scene_count = session.exec(
            select(func.count())
            .select_from(Scene)
            .join(Chapter, Scene.chapter_id == Chapter.id)
            .where(Chapter.book_id == b.id)
        ).one()
        atmosphere_name = None
        if b.atmosphere_id:
            atm = session.get(Atmosphere, b.atmosphere_id)
            if atm:
                atmosphere_name = atm.name
        results.append({
            "id": b.id,
            "book_number": b.book_number,
            "title": b.title,
            "source_file": b.source_file,
            "transition_lore_text": b.transition_lore_text,
            "recommended_level": b.recommended_level,
            "min_level": b.min_level,
            "atmosphere_id": b.atmosphere_id,
            "atmosphere_name": atmosphere_name,
            "chapter_count": chapter_count,
            "scene_count": scene_count,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "updated_at": b.updated_at.isoformat() if b.updated_at else None,
        })
    return results


def get_book(session: Session, book_id: int) -> dict:
    """Return a single book with counts."""
    b = session.get(Book, book_id)
    if not b:
        return None
    chapter_count = session.exec(
        select(func.count()).select_from(Chapter).where(Chapter.book_id == b.id)
    ).one()
    scene_count = session.exec(
        select(func.count())
        .select_from(Scene)
        .join(Chapter, Scene.chapter_id == Chapter.id)
        .where(Chapter.book_id == b.id)
    ).one()
    atmosphere_name = None
    if b.atmosphere_id:
        atm = session.get(Atmosphere, b.atmosphere_id)
        if atm:
            atmosphere_name = atm.name
    return {
        "id": b.id,
        "book_number": b.book_number,
        "title": b.title,
        "source_file": b.source_file,
        "transition_lore_text": b.transition_lore_text,
        "recommended_level": b.recommended_level,
        "min_level": b.min_level,
        "atmosphere_id": b.atmosphere_id,
        "atmosphere_name": atmosphere_name,
        "chapter_count": chapter_count,
        "scene_count": scene_count,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def create_book(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create a new book. Validates unique book_number and optional atmosphere FK."""
    # Unique book_number
    existing = session.exec(
        select(Book).where(Book.book_number == payload["book_number"])
    ).first()
    if existing:
        raise ValueError(f"Book number {payload['book_number']} already exists")

    # Validate atmosphere FK
    if payload.get("atmosphere_id"):
        atm = session.get(Atmosphere, payload["atmosphere_id"])
        if not atm:
            raise ValueError(f"Atmosphere {payload['atmosphere_id']} not found")

    now = _now()
    book = Book(
        book_number=payload["book_number"],
        title=payload["title"],
        source_file=payload.get("source_file", ""),
        transition_lore_text=payload.get("transition_lore_text"),
        recommended_level=payload.get("recommended_level"),
        min_level=payload.get("min_level"),
        atmosphere_id=payload.get("atmosphere_id"),
        created_at=now,
        updated_at=now,
    )
    session.add(book)
    session.commit()
    session.refresh(book)

    write_audit_log(
        session, admin_email, "create_book", "book",
        str(book.id), {"title": book.title, "book_number": book.book_number}, ip,
    )
    return get_book(session, book.id)


def update_book(
    session: Session, book_id: int, payload: dict, admin_email: str, ip: str
) -> dict:
    """Partial update of a book."""
    book = session.get(Book, book_id)
    if not book:
        return None

    changes = {}
    for field in [
        "book_number", "title", "source_file", "transition_lore_text",
        "recommended_level", "min_level", "atmosphere_id",
    ]:
        if field in payload:
            old_val = getattr(book, field)
            new_val = payload[field]
            if old_val != new_val:
                # Validate uniqueness for book_number
                if field == "book_number":
                    dup = session.exec(
                        select(Book).where(Book.book_number == new_val).where(Book.id != book_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Book number {new_val} already exists")
                # Validate atmosphere FK
                if field == "atmosphere_id" and new_val is not None:
                    atm = session.get(Atmosphere, new_val)
                    if not atm:
                        raise ValueError(f"Atmosphere {new_val} not found")
                changes[field] = {"old": old_val, "new": new_val}
                setattr(book, field, new_val)

    if not changes:
        return get_book(session, book_id)

    book.updated_at = _now()
    session.add(book)
    session.commit()
    session.refresh(book)

    write_audit_log(
        session, admin_email, "update_book", "book",
        str(book_id), changes, ip,
    )
    return get_book(session, book_id)


def delete_book(session: Session, book_id: int, admin_email: str, ip: str) -> dict:
    """Delete a book. Block with child counts if chapters exist."""
    book = session.get(Book, book_id)
    if not book:
        return None

    chapter_count = session.exec(
        select(func.count()).select_from(Chapter).where(Chapter.book_id == book_id)
    ).one()
    if chapter_count > 0:
        return {"blocked": True, "child_type": "chapters", "child_count": chapter_count}

    title = book.title
    session.delete(book)
    session.commit()

    write_audit_log(
        session, admin_email, "delete_book", "book",
        str(book_id), {"title": title}, ip,
    )
    return {"deleted": True}


# ===========================================================================
#  CHAPTERS
# ===========================================================================

def list_chapters(
    session: Session,
    book_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Return paginated chapters with book_title, scene_count, beat_count, atmosphere_name."""
    base = select(Chapter)
    count_q = select(func.count()).select_from(Chapter)
    if book_id is not None:
        base = base.where(Chapter.book_id == book_id)
        count_q = count_q.where(Chapter.book_id == book_id)

    total = session.exec(count_q).one()
    offset, limit = _paginate(base, page, page_size)
    chapters = session.exec(
        base.order_by(Chapter.book_id, Chapter.sort_order).offset(offset).limit(limit)
    ).all()

    results = []
    for ch in chapters:
        book = session.get(Book, ch.book_id)
        scene_count = session.exec(
            select(func.count()).select_from(Scene).where(Scene.chapter_id == ch.id)
        ).one()
        beat_count = session.exec(
            select(func.count())
            .select_from(StoryBeat)
            .join(Scene, StoryBeat.scene_id == Scene.id)
            .where(Scene.chapter_id == ch.id)
        ).one()
        atmosphere_name = None
        if ch.atmosphere_id:
            atm = session.get(Atmosphere, ch.atmosphere_id)
            if atm:
                atmosphere_name = atm.name
        results.append({
            "id": ch.id,
            "book_id": ch.book_id,
            "book_title": book.title if book else None,
            "chapter_number": ch.chapter_number,
            "title": ch.title,
            "sort_order": ch.sort_order,
            "processing_status": ch.processing_status,
            "transition_lore_text": ch.transition_lore_text,
            "recommended_level": ch.recommended_level,
            "min_level": ch.min_level,
            "atmosphere_id": ch.atmosphere_id,
            "atmosphere_name": atmosphere_name,
            "scene_count": scene_count,
            "beat_count": beat_count,
            "created_at": ch.created_at.isoformat() if ch.created_at else None,
            "updated_at": ch.updated_at.isoformat() if ch.updated_at else None,
        })

    return {"items": results, "total": total, "page": page, "page_size": page_size}


def get_chapter(session: Session, chapter_id: int) -> dict:
    """Full detail including raw_text."""
    ch = session.get(Chapter, chapter_id)
    if not ch:
        return None
    book = session.get(Book, ch.book_id)
    scene_count = session.exec(
        select(func.count()).select_from(Scene).where(Scene.chapter_id == ch.id)
    ).one()
    beat_count = session.exec(
        select(func.count())
        .select_from(StoryBeat)
        .join(Scene, StoryBeat.scene_id == Scene.id)
        .where(Scene.chapter_id == ch.id)
    ).one()
    atmosphere_name = None
    if ch.atmosphere_id:
        atm = session.get(Atmosphere, ch.atmosphere_id)
        if atm:
            atmosphere_name = atm.name
    return {
        "id": ch.id,
        "book_id": ch.book_id,
        "book_title": book.title if book else None,
        "chapter_number": ch.chapter_number,
        "title": ch.title,
        "raw_text": ch.raw_text,
        "sort_order": ch.sort_order,
        "processing_status": ch.processing_status,
        "transition_lore_text": ch.transition_lore_text,
        "recommended_level": ch.recommended_level,
        "min_level": ch.min_level,
        "atmosphere_id": ch.atmosphere_id,
        "atmosphere_name": atmosphere_name,
        "scene_count": scene_count,
        "beat_count": beat_count,
        "created_at": ch.created_at.isoformat() if ch.created_at else None,
        "updated_at": ch.updated_at.isoformat() if ch.updated_at else None,
    }


def create_chapter(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create a chapter. Validates book_id FK and unique (book_id, chapter_number)."""
    book = session.get(Book, payload["book_id"])
    if not book:
        raise ValueError(f"Book {payload['book_id']} not found")

    existing = session.exec(
        select(Chapter)
        .where(Chapter.book_id == payload["book_id"])
        .where(Chapter.chapter_number == payload["chapter_number"])
    ).first()
    if existing:
        raise ValueError(
            f"Chapter {payload['chapter_number']} already exists in book {payload['book_id']}"
        )

    # Validate atmosphere FK
    if payload.get("atmosphere_id"):
        atm = session.get(Atmosphere, payload["atmosphere_id"])
        if not atm:
            raise ValueError(f"Atmosphere {payload['atmosphere_id']} not found")

    now = _now()
    ch = Chapter(
        book_id=payload["book_id"],
        chapter_number=payload["chapter_number"],
        title=payload.get("title"),
        raw_text=payload.get("raw_text"),
        sort_order=payload.get("sort_order", payload["chapter_number"]),
        processing_status=payload.get("processing_status", "not_started"),
        transition_lore_text=payload.get("transition_lore_text"),
        recommended_level=payload.get("recommended_level"),
        min_level=payload.get("min_level"),
        atmosphere_id=payload.get("atmosphere_id"),
        created_at=now,
        updated_at=now,
    )
    session.add(ch)
    session.commit()
    session.refresh(ch)

    write_audit_log(
        session, admin_email, "create_chapter", "chapter",
        str(ch.id), {"title": ch.title, "book_id": ch.book_id, "chapter_number": ch.chapter_number}, ip,
    )
    return get_chapter(session, ch.id)


def update_chapter(
    session: Session, chapter_id: int, payload: dict, admin_email: str, ip: str
) -> dict:
    """Partial update of a chapter."""
    ch = session.get(Chapter, chapter_id)
    if not ch:
        return None

    changes = {}
    for field in [
        "book_id", "chapter_number", "title", "raw_text", "sort_order",
        "processing_status", "transition_lore_text",
        "recommended_level", "min_level", "atmosphere_id",
    ]:
        if field in payload:
            old_val = getattr(ch, field)
            new_val = payload[field]
            if old_val != new_val:
                # Validate book FK
                if field == "book_id":
                    bk = session.get(Book, new_val)
                    if not bk:
                        raise ValueError(f"Book {new_val} not found")
                # Validate unique (book_id, chapter_number)
                if field in ("book_id", "chapter_number"):
                    check_book = payload.get("book_id", ch.book_id)
                    check_num = payload.get("chapter_number", ch.chapter_number)
                    dup = session.exec(
                        select(Chapter)
                        .where(Chapter.book_id == check_book)
                        .where(Chapter.chapter_number == check_num)
                        .where(Chapter.id != chapter_id)
                    ).first()
                    if dup:
                        raise ValueError(
                            f"Chapter {check_num} already exists in book {check_book}"
                        )
                # Validate atmosphere FK
                if field == "atmosphere_id" and new_val is not None:
                    atm = session.get(Atmosphere, new_val)
                    if not atm:
                        raise ValueError(f"Atmosphere {new_val} not found")
                changes[field] = {"old": old_val, "new": new_val}
                setattr(ch, field, new_val)

    if not changes:
        return get_chapter(session, chapter_id)

    ch.updated_at = _now()
    session.add(ch)
    session.commit()
    session.refresh(ch)

    write_audit_log(
        session, admin_email, "update_chapter", "chapter",
        str(chapter_id), changes, ip,
    )
    return get_chapter(session, chapter_id)


def delete_chapter(session: Session, chapter_id: int, admin_email: str, ip: str) -> dict:
    """Delete a chapter. Block if scenes exist."""
    ch = session.get(Chapter, chapter_id)
    if not ch:
        return None

    scene_count = session.exec(
        select(func.count()).select_from(Scene).where(Scene.chapter_id == chapter_id)
    ).one()
    if scene_count > 0:
        return {"blocked": True, "child_type": "scenes", "child_count": scene_count}

    title = ch.title
    book_id = ch.book_id
    session.delete(ch)
    session.commit()

    write_audit_log(
        session, admin_email, "delete_chapter", "chapter",
        str(chapter_id), {"title": title, "book_id": book_id}, ip,
    )
    return {"deleted": True}


# ===========================================================================
#  SCENES
# ===========================================================================

VALID_SCENE_TYPES = {"normal", "chapter_boss", "book_boss", "interlude", "tutorial"}
VALID_INTERRUPT_TYPES = {"click_burst", "target_zone", "whack_sequence"}


def _scene_detail(session: Session, scene: Scene) -> dict:
    """Build full scene detail dict."""
    ch = session.get(Chapter, scene.chapter_id)
    book = session.get(Book, ch.book_id) if ch else None

    # Location
    location_name = None
    if scene.primary_location_id:
        loc = session.get(Location, scene.primary_location_id)
        if loc:
            location_name = loc.canonical_name

    # Counts
    beat_count = session.exec(
        select(func.count()).select_from(StoryBeat).where(StoryBeat.scene_id == scene.id)
    ).one()
    entity_count = session.exec(
        select(func.count()).select_from(EntitySceneAppearance)
        .where(EntitySceneAppearance.scene_id == scene.id)
    ).one()

    # Gameplay data
    gd = session.exec(
        select(SceneGameplayData).where(SceneGameplayData.scene_id == scene.id)
    ).first()
    gameplay_data = None
    if gd:
        gameplay_data = {
            "id": gd.id,
            "required_time_seconds": gd.required_time_seconds,
            "background_sprite_key": gd.background_sprite_key,
            "background_id": gd.background_id,
            "is_boss_scene": gd.is_boss_scene,
            "atmosphere_id": gd.atmosphere_id,
        }

    # Wave config
    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene.id)
    ).first()

    return {
        "id": scene.id,
        "chapter_id": scene.chapter_id,
        "chapter_title": ch.title if ch else None,
        "book_id": ch.book_id if ch else None,
        "book_title": book.title if book else None,
        "scene_number": scene.scene_number,
        "title": scene.title,
        "summary": scene.summary,
        "raw_text": scene.raw_text,
        "sort_order": scene.sort_order,
        "primary_location_id": scene.primary_location_id,
        "location_name": location_name,
        "has_hard_break": scene.has_hard_break,
        "scene_type": scene.scene_type,
        "boss_config": scene.boss_config,
        "gameplay_data": gameplay_data,
        "has_wave_config": wc is not None,
        "beat_count": beat_count,
        "entity_count": entity_count,
        "created_at": scene.created_at.isoformat() if scene.created_at else None,
        "updated_at": scene.updated_at.isoformat() if scene.updated_at else None,
    }


def list_scenes(
    session: Session,
    chapter_id: Optional[int] = None,
    scene_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> dict:
    """Paginated scenes list with chapter/book titles, gameplay data inline."""
    base = select(Scene)
    count_q = select(func.count()).select_from(Scene)

    if chapter_id is not None:
        base = base.where(Scene.chapter_id == chapter_id)
        count_q = count_q.where(Scene.chapter_id == chapter_id)
    if scene_type is not None:
        base = base.where(Scene.scene_type == scene_type)
        count_q = count_q.where(Scene.scene_type == scene_type)

    total = session.exec(count_q).one()
    offset, limit = _paginate(base, page, page_size)
    scenes = session.exec(
        base.order_by(Scene.chapter_id, Scene.sort_order).offset(offset).limit(limit)
    ).all()

    items = [_scene_detail(session, s) for s in scenes]
    # Strip raw_text from list view
    for item in items:
        item.pop("raw_text", None)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_scene(session: Session, scene_id: int) -> dict:
    """Full scene detail with gameplay_data, boss_config."""
    scene = session.get(Scene, scene_id)
    if not scene:
        return None
    return _scene_detail(session, scene)


def _validate_boss_config(session: Session, boss_config: dict) -> None:
    """Validate boss_config structure."""
    if not isinstance(boss_config, dict):
        raise ValueError("boss_config must be a JSON object")

    entity_id = boss_config.get("entity_id")
    if entity_id is not None:
        ent = session.get(Entity, entity_id)
        if not ent:
            raise ValueError(f"boss_config.entity_id {entity_id}: entity not found")

    interrupts = boss_config.get("interrupts")
    if interrupts is not None:
        if not isinstance(interrupts, list):
            raise ValueError("boss_config.interrupts must be a list")
        for idx, intr in enumerate(interrupts):
            if not isinstance(intr, dict):
                raise ValueError(f"boss_config.interrupts[{idx}] must be an object")
            itype = intr.get("type")
            if itype and itype not in VALID_INTERRUPT_TYPES:
                raise ValueError(
                    f"boss_config.interrupts[{idx}].type '{itype}' invalid. "
                    f"Must be one of: {', '.join(sorted(VALID_INTERRUPT_TYPES))}"
                )


def create_scene(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create a scene. Validates chapter_id FK and unique (chapter_id, scene_number).
    Auto-creates SceneGameplayData if gameplay_data provided."""
    ch = session.get(Chapter, payload["chapter_id"])
    if not ch:
        raise ValueError(f"Chapter {payload['chapter_id']} not found")

    existing = session.exec(
        select(Scene)
        .where(Scene.chapter_id == payload["chapter_id"])
        .where(Scene.scene_number == payload["scene_number"])
    ).first()
    if existing:
        raise ValueError(
            f"Scene {payload['scene_number']} already exists in chapter {payload['chapter_id']}"
        )

    # Validate location FK
    if payload.get("primary_location_id"):
        loc = session.get(Location, payload["primary_location_id"])
        if not loc:
            raise ValueError(f"Location {payload['primary_location_id']} not found")

    # Validate scene_type
    scene_type = payload.get("scene_type", "normal")
    if scene_type not in VALID_SCENE_TYPES:
        raise ValueError(f"Invalid scene_type '{scene_type}'. Must be one of: {', '.join(sorted(VALID_SCENE_TYPES))}")

    # Validate boss_config
    boss_config = payload.get("boss_config")
    if boss_config:
        _validate_boss_config(session, boss_config)

    now = _now()
    scene = Scene(
        chapter_id=payload["chapter_id"],
        scene_number=payload["scene_number"],
        title=payload.get("title"),
        summary=payload.get("summary"),
        raw_text=payload.get("raw_text"),
        sort_order=payload.get("sort_order", payload["scene_number"]),
        primary_location_id=payload.get("primary_location_id"),
        has_hard_break=payload.get("has_hard_break", False),
        scene_type=scene_type,
        boss_config=boss_config,
        created_at=now,
        updated_at=now,
    )
    session.add(scene)
    session.commit()
    session.refresh(scene)

    # Auto-create gameplay_data
    gd_payload = payload.get("gameplay_data")
    if gd_payload:
        _upsert_gameplay_data(session, scene.id, gd_payload)

    write_audit_log(
        session, admin_email, "create_scene", "scene",
        str(scene.id),
        {"title": scene.title, "chapter_id": scene.chapter_id, "scene_number": scene.scene_number},
        ip,
    )
    return get_scene(session, scene.id)


def _upsert_gameplay_data(session: Session, scene_id: int, gd_payload: dict) -> None:
    """Create or update SceneGameplayData for a scene."""
    gd = session.exec(
        select(SceneGameplayData).where(SceneGameplayData.scene_id == scene_id)
    ).first()

    # Validate background FK
    bg_id = gd_payload.get("background_id")
    if bg_id is not None:
        bg = session.get(Background, bg_id)
        if not bg:
            raise ValueError(f"Background {bg_id} not found")

    # Validate atmosphere FK
    atm_id = gd_payload.get("atmosphere_id")
    if atm_id is not None:
        atm = session.get(Atmosphere, atm_id)
        if not atm:
            raise ValueError(f"Atmosphere {atm_id} not found")

    now = _now()
    if gd:
        for field in [
            "required_time_seconds", "background_sprite_key", "background_id",
            "is_boss_scene", "atmosphere_id",
        ]:
            if field in gd_payload:
                setattr(gd, field, gd_payload[field])
        gd.updated_at = now
        session.add(gd)
    else:
        gd = SceneGameplayData(
            scene_id=scene_id,
            required_time_seconds=gd_payload.get("required_time_seconds", 0),
            background_sprite_key=gd_payload.get("background_sprite_key"),
            background_id=bg_id,
            is_boss_scene=gd_payload.get("is_boss_scene", False),
            atmosphere_id=atm_id,
            created_at=now,
            updated_at=now,
        )
        session.add(gd)
    session.commit()


def update_scene(
    session: Session, scene_id: int, payload: dict, admin_email: str, ip: str
) -> dict:
    """Update core scene fields + gameplay_data + boss_config in one call."""
    scene = session.get(Scene, scene_id)
    if not scene:
        return None

    changes = {}
    for field in [
        "chapter_id", "scene_number", "title", "summary", "raw_text",
        "sort_order", "primary_location_id", "has_hard_break", "scene_type",
    ]:
        if field in payload:
            old_val = getattr(scene, field)
            new_val = payload[field]
            if old_val != new_val:
                # Validate chapter FK
                if field == "chapter_id":
                    ch = session.get(Chapter, new_val)
                    if not ch:
                        raise ValueError(f"Chapter {new_val} not found")
                # Validate unique (chapter_id, scene_number)
                if field in ("chapter_id", "scene_number"):
                    check_ch = payload.get("chapter_id", scene.chapter_id)
                    check_num = payload.get("scene_number", scene.scene_number)
                    dup = session.exec(
                        select(Scene)
                        .where(Scene.chapter_id == check_ch)
                        .where(Scene.scene_number == check_num)
                        .where(Scene.id != scene_id)
                    ).first()
                    if dup:
                        raise ValueError(
                            f"Scene {check_num} already exists in chapter {check_ch}"
                        )
                # Validate location FK
                if field == "primary_location_id" and new_val is not None:
                    loc = session.get(Location, new_val)
                    if not loc:
                        raise ValueError(f"Location {new_val} not found")
                # Validate scene_type
                if field == "scene_type" and new_val not in VALID_SCENE_TYPES:
                    raise ValueError(
                        f"Invalid scene_type '{new_val}'. Must be one of: {', '.join(sorted(VALID_SCENE_TYPES))}"
                    )
                changes[field] = {"old": old_val, "new": new_val}
                setattr(scene, field, new_val)

    # Handle boss_config
    if "boss_config" in payload:
        bc = payload["boss_config"]
        if bc is not None:
            _validate_boss_config(session, bc)
        if scene.boss_config != bc:
            changes["boss_config"] = {"old": "...", "new": "..."}
            scene.boss_config = bc

    # Handle gameplay_data
    gd_payload = payload.get("gameplay_data")
    if gd_payload:
        _upsert_gameplay_data(session, scene_id, gd_payload)
        changes["gameplay_data"] = {"updated": True}

    if not changes:
        return get_scene(session, scene_id)

    scene.updated_at = _now()
    session.add(scene)
    session.commit()
    session.refresh(scene)

    write_audit_log(
        session, admin_email, "update_scene", "scene",
        str(scene_id), changes, ip,
    )
    return get_scene(session, scene_id)


def delete_scene(session: Session, scene_id: int, admin_email: str, ip: str) -> dict:
    """Delete a scene. Block if story_beats exist."""
    scene = session.get(Scene, scene_id)
    if not scene:
        return None

    beat_count = session.exec(
        select(func.count()).select_from(StoryBeat).where(StoryBeat.scene_id == scene_id)
    ).one()
    if beat_count > 0:
        return {"blocked": True, "child_type": "story_beats", "child_count": beat_count}

    title = scene.title
    chapter_id = scene.chapter_id

    # Clean up gameplay_data and wave_config
    gd = session.exec(
        select(SceneGameplayData).where(SceneGameplayData.scene_id == scene_id)
    ).first()
    if gd:
        session.delete(gd)

    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene_id)
    ).first()
    if wc:
        session.delete(wc)

    # Clean up entity_scene_appearances
    esas = session.exec(
        select(EntitySceneAppearance).where(EntitySceneAppearance.scene_id == scene_id)
    ).all()
    for esa in esas:
        session.delete(esa)

    session.delete(scene)
    session.commit()

    write_audit_log(
        session, admin_email, "delete_scene", "scene",
        str(scene_id), {"title": title, "chapter_id": chapter_id}, ip,
    )
    return {"deleted": True}


# ===========================================================================
#  BACKGROUNDS
# ===========================================================================

def list_backgrounds(session: Session) -> list[dict]:
    """Return all backgrounds with scene_count and asset_exists flag."""
    backgrounds = session.exec(select(Background).order_by(Background.name)).all()
    results = []
    for bg in backgrounds:
        scene_count = session.exec(
            select(func.count()).select_from(SceneGameplayData)
            .where(SceneGameplayData.background_id == bg.id)
        ).one()
        asset_exists = session.exec(
            select(func.count()).select_from(AssetRegistryEntry)
            .where(AssetRegistryEntry.asset_key == bg.background_key)
            .where(AssetRegistryEntry.category == "background")
        ).one() > 0
        results.append({
            "id": bg.id,
            "name": bg.name,
            "description": bg.description,
            "background_key": bg.background_key,
            "parallax_config": bg.parallax_config,
            "time_of_day": bg.time_of_day,
            "mood": bg.mood,
            "color_palette": bg.color_palette,
            "scene_count": scene_count,
            "asset_exists": asset_exists,
            "created_at": bg.created_at.isoformat() if bg.created_at else None,
            "updated_at": bg.updated_at.isoformat() if bg.updated_at else None,
        })
    return results


def get_background(session: Session, bg_id: int) -> dict:
    """Single background detail."""
    bg = session.get(Background, bg_id)
    if not bg:
        return None
    scene_count = session.exec(
        select(func.count()).select_from(SceneGameplayData)
        .where(SceneGameplayData.background_id == bg.id)
    ).one()
    asset_exists = session.exec(
        select(func.count()).select_from(AssetRegistryEntry)
        .where(AssetRegistryEntry.asset_key == bg.background_key)
        .where(AssetRegistryEntry.category == "background")
    ).one() > 0
    return {
        "id": bg.id,
        "name": bg.name,
        "description": bg.description,
        "background_key": bg.background_key,
        "parallax_config": bg.parallax_config,
        "time_of_day": bg.time_of_day,
        "mood": bg.mood,
        "color_palette": bg.color_palette,
        "scene_count": scene_count,
        "asset_exists": asset_exists,
        "created_at": bg.created_at.isoformat() if bg.created_at else None,
        "updated_at": bg.updated_at.isoformat() if bg.updated_at else None,
    }


def create_background(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create a background. Validates unique name and background_key."""
    # Check unique name
    existing = session.exec(
        select(Background).where(Background.name == payload["name"])
    ).first()
    if existing:
        raise ValueError(f"Background name '{payload['name']}' already exists")

    # Check unique background_key
    existing_key = session.exec(
        select(Background).where(Background.background_key == payload["background_key"])
    ).first()
    if existing_key:
        raise ValueError(f"Background key '{payload['background_key']}' already exists")

    now = _now()
    bg = Background(
        name=payload["name"],
        description=payload.get("description"),
        background_key=payload["background_key"],
        parallax_config=payload.get("parallax_config"),
        time_of_day=payload.get("time_of_day"),
        mood=payload.get("mood"),
        color_palette=payload.get("color_palette"),
        created_at=now,
        updated_at=now,
    )
    session.add(bg)
    session.commit()
    session.refresh(bg)

    write_audit_log(
        session, admin_email, "create_background", "background",
        str(bg.id), {"name": bg.name, "background_key": bg.background_key}, ip,
    )
    return get_background(session, bg.id)


def update_background(
    session: Session, bg_id: int, payload: dict, admin_email: str, ip: str
) -> dict:
    """Partial update of a background."""
    bg = session.get(Background, bg_id)
    if not bg:
        return None

    changes = {}
    for field in [
        "name", "description", "background_key",
        "parallax_config", "time_of_day", "mood", "color_palette",
    ]:
        if field in payload:
            old_val = getattr(bg, field)
            new_val = payload[field]
            if old_val != new_val:
                # Validate unique name
                if field == "name":
                    dup = session.exec(
                        select(Background).where(Background.name == new_val).where(Background.id != bg_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Background name '{new_val}' already exists")
                # Validate unique key
                if field == "background_key":
                    dup = session.exec(
                        select(Background).where(Background.background_key == new_val).where(Background.id != bg_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Background key '{new_val}' already exists")
                # Don't log large JSON diffs
                if field in ("parallax_config", "color_palette"):
                    changes[field] = {"updated": True}
                else:
                    changes[field] = {"old": old_val, "new": new_val}
                setattr(bg, field, new_val)

    if not changes:
        return get_background(session, bg_id)

    bg.updated_at = _now()
    session.add(bg)
    session.commit()
    session.refresh(bg)

    write_audit_log(
        session, admin_email, "update_background", "background",
        str(bg_id), changes, ip,
    )
    return get_background(session, bg_id)


def delete_background(session: Session, bg_id: int, admin_email: str, ip: str) -> dict:
    """Delete a background. Block if scene_gameplay_data references it."""
    bg = session.get(Background, bg_id)
    if not bg:
        return None

    ref_count = session.exec(
        select(func.count()).select_from(SceneGameplayData)
        .where(SceneGameplayData.background_id == bg_id)
    ).one()
    if ref_count > 0:
        return {"blocked": True, "child_type": "scenes", "child_count": ref_count}

    name = bg.name
    session.delete(bg)
    session.commit()

    write_audit_log(
        session, admin_email, "delete_background", "background",
        str(bg_id), {"name": name}, ip,
    )
    return {"deleted": True}


# ===========================================================================
#  WAVE CONFIGS
# ===========================================================================

def get_wave_config(session: Session, scene_id: int) -> dict:
    """Get wave config for a scene."""
    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene_id)
    ).first()
    if not wc:
        return None

    scene = session.get(Scene, scene_id)
    return {
        "id": wc.id,
        "scene_id": wc.scene_id,
        "scene_title": scene.title if scene else None,
        "max_enemies_per_wave": wc.max_enemies_per_wave,
        "wave_count": wc.wave_count,
        "spawn_interval_ms": wc.spawn_interval_ms,
        "scaling_factor": wc.scaling_factor,
        "hp_multiplier": wc.hp_multiplier,
        "gold_multiplier": wc.gold_multiplier,
        "entity_pool": wc.entity_pool,
        "boss_entity_id": wc.boss_entity_id,
        "created_at": wc.created_at.isoformat() if wc.created_at else None,
        "updated_at": wc.updated_at.isoformat() if wc.updated_at else None,
    }


def _validate_entity_pool(session: Session, entity_pool: list) -> None:
    """Validate that all entity IDs in the pool exist."""
    if not isinstance(entity_pool, list):
        raise ValueError("entity_pool must be a list")
    for idx, entry in enumerate(entity_pool):
        if not isinstance(entry, dict):
            raise ValueError(f"entity_pool[{idx}] must be an object")
        eid = entry.get("entity_id")
        if eid is not None:
            ent = session.get(Entity, eid)
            if not ent:
                raise ValueError(f"entity_pool[{idx}].entity_id {eid}: entity not found")


def upsert_wave_config(
    session: Session, scene_id: int, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create or update wave config for a scene."""
    scene = session.get(Scene, scene_id)
    if not scene:
        raise ValueError(f"Scene {scene_id} not found")

    # Validate entity_pool
    entity_pool = payload.get("entity_pool")
    if entity_pool is not None:
        _validate_entity_pool(session, entity_pool)

    # Validate boss_entity_id
    boss_eid = payload.get("boss_entity_id")
    if boss_eid is not None:
        ent = session.get(Entity, boss_eid)
        if not ent:
            raise ValueError(f"boss_entity_id {boss_eid}: entity not found")

    now = _now()
    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene_id)
    ).first()

    action = "update_wave_config"
    if wc:
        for field in [
            "max_enemies_per_wave", "wave_count", "spawn_interval_ms",
            "scaling_factor", "hp_multiplier", "gold_multiplier",
            "entity_pool", "boss_entity_id",
        ]:
            if field in payload:
                setattr(wc, field, payload[field])
        wc.updated_at = now
        session.add(wc)
    else:
        action = "create_wave_config"
        wc = SceneWaveConfig(
            scene_id=scene_id,
            max_enemies_per_wave=payload.get("max_enemies_per_wave", 5),
            wave_count=payload.get("wave_count", 10),
            spawn_interval_ms=payload.get("spawn_interval_ms", 2000),
            scaling_factor=payload.get("scaling_factor", 1.0),
            hp_multiplier=payload.get("hp_multiplier", 1.0),
            gold_multiplier=payload.get("gold_multiplier", 1.0),
            entity_pool=entity_pool or [],
            boss_entity_id=boss_eid,
            created_at=now,
            updated_at=now,
        )
        session.add(wc)

    session.commit()
    session.refresh(wc)

    write_audit_log(
        session, admin_email, action, "wave_config",
        str(scene_id), {"scene_id": scene_id}, ip,
    )
    return get_wave_config(session, scene_id)


def delete_wave_config(session: Session, scene_id: int, admin_email: str, ip: str) -> dict:
    """Delete wave config for a scene."""
    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene_id)
    ).first()
    if not wc:
        return None

    session.delete(wc)
    session.commit()

    write_audit_log(
        session, admin_email, "delete_wave_config", "wave_config",
        str(scene_id), {"scene_id": scene_id}, ip,
    )
    return {"deleted": True}


def list_wave_configs(session: Session, chapter_id: int) -> list[dict]:
    """List all wave configs for scenes in a chapter."""
    scenes = session.exec(
        select(Scene).where(Scene.chapter_id == chapter_id).order_by(Scene.sort_order)
    ).all()

    results = []
    for scene in scenes:
        wc = session.exec(
            select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene.id)
        ).first()
        if wc:
            results.append({
                "id": wc.id,
                "scene_id": wc.scene_id,
                "scene_title": scene.title,
                "scene_number": scene.scene_number,
                "max_enemies_per_wave": wc.max_enemies_per_wave,
                "wave_count": wc.wave_count,
                "spawn_interval_ms": wc.spawn_interval_ms,
                "scaling_factor": wc.scaling_factor,
                "hp_multiplier": wc.hp_multiplier,
                "gold_multiplier": wc.gold_multiplier,
                "entity_pool": wc.entity_pool,
                "boss_entity_id": wc.boss_entity_id,
                "created_at": wc.created_at.isoformat() if wc.created_at else None,
                "updated_at": wc.updated_at.isoformat() if wc.updated_at else None,
            })
    return results


def apply_wave_template(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Bulk apply a wave template to all scenes in a chapter or book.

    payload:
        scope: "chapter" | "book"
        scope_id: int
        template: dict with base wave config values
        scaling_increment: float (per-scene multiplier step, e.g. 0.1 means
            scene 1 = 1.0, scene 2 = 1.1, scene 3 = 1.2 ...)
        overwrite: bool — if False, skip scenes that already have a config
    """
    scope = payload.get("scope")
    scope_id = payload.get("scope_id")
    template = payload.get("template", {})
    scaling_increment = payload.get("scaling_increment", 0.0)
    overwrite = payload.get("overwrite", False)

    if scope not in ("chapter", "book"):
        raise ValueError("scope must be 'chapter' or 'book'")

    # Gather target scenes
    if scope == "chapter":
        ch = session.get(Chapter, scope_id)
        if not ch:
            raise ValueError(f"Chapter {scope_id} not found")
        scenes = session.exec(
            select(Scene)
            .where(Scene.chapter_id == scope_id)
            .where(Scene.scene_type == "normal")
            .order_by(Scene.sort_order)
        ).all()
    else:
        book = session.get(Book, scope_id)
        if not book:
            raise ValueError(f"Book {scope_id} not found")
        scenes = session.exec(
            select(Scene)
            .join(Chapter, Scene.chapter_id == Chapter.id)
            .where(Chapter.book_id == scope_id)
            .where(Scene.scene_type == "normal")
            .order_by(Chapter.sort_order, Scene.sort_order)
        ).all()

    created = 0
    updated = 0
    skipped = 0

    for idx, scene in enumerate(scenes):
        existing = session.exec(
            select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene.id)
        ).first()

        if existing and not overwrite:
            skipped += 1
            continue

        now = _now()
        scale = 1.0 + (scaling_increment * idx)

        if existing:
            for field in [
                "max_enemies_per_wave", "wave_count", "spawn_interval_ms", "entity_pool",
            ]:
                if field in template:
                    setattr(existing, field, template[field])
            existing.scaling_factor = template.get("scaling_factor", 1.0) * scale
            existing.hp_multiplier = template.get("hp_multiplier", 1.0) * scale
            existing.gold_multiplier = template.get("gold_multiplier", 1.0) * scale
            existing.updated_at = now
            session.add(existing)
            updated += 1
        else:
            wc = SceneWaveConfig(
                scene_id=scene.id,
                max_enemies_per_wave=template.get("max_enemies_per_wave", 5),
                wave_count=template.get("wave_count", 10),
                spawn_interval_ms=template.get("spawn_interval_ms", 2000),
                scaling_factor=template.get("scaling_factor", 1.0) * scale,
                hp_multiplier=template.get("hp_multiplier", 1.0) * scale,
                gold_multiplier=template.get("gold_multiplier", 1.0) * scale,
                entity_pool=template.get("entity_pool", []),
                boss_entity_id=template.get("boss_entity_id"),
                created_at=now,
                updated_at=now,
            )
            session.add(wc)
            created += 1

    session.commit()

    write_audit_log(
        session, admin_email, "apply_wave_template", "wave_config",
        f"{scope}:{scope_id}",
        {"scope": scope, "scope_id": scope_id, "created": created, "updated": updated, "skipped": skipped},
        ip,
    )
    return {"created": created, "updated": updated, "skipped": skipped, "total_scenes": len(scenes)}


def bulk_adjust_multipliers(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Adjust HP/gold multipliers for selected scenes.

    payload:
        scene_ids: list[int]
        hp_multiplier_delta: float (added to current)
        gold_multiplier_delta: float (added to current)
    """
    scene_ids = payload.get("scene_ids", [])
    hp_delta = payload.get("hp_multiplier_delta", 0.0)
    gold_delta = payload.get("gold_multiplier_delta", 0.0)

    if not scene_ids:
        raise ValueError("scene_ids is required")
    if hp_delta == 0.0 and gold_delta == 0.0:
        raise ValueError("At least one multiplier delta must be non-zero")

    adjusted = 0
    not_found = 0

    for sid in scene_ids:
        wc = session.exec(
            select(SceneWaveConfig).where(SceneWaveConfig.scene_id == sid)
        ).first()
        if not wc:
            not_found += 1
            continue

        if hp_delta != 0.0:
            wc.hp_multiplier = max(0.1, wc.hp_multiplier + hp_delta)
        if gold_delta != 0.0:
            wc.gold_multiplier = max(0.1, wc.gold_multiplier + gold_delta)
        wc.updated_at = _now()
        session.add(wc)
        adjusted += 1

    session.commit()

    write_audit_log(
        session, admin_email, "bulk_adjust_multipliers", "wave_config",
        f"batch:{len(scene_ids)}",
        {"scene_ids": scene_ids, "hp_delta": hp_delta, "gold_delta": gold_delta, "adjusted": adjusted},
        ip,
    )
    return {"adjusted": adjusted, "not_found": not_found}


def auto_populate_wave_config(
    session: Session, scene_id: int, admin_email: str, ip: str
) -> dict:
    """Generate entity_pool from entity_scene_appearances for the scene."""
    scene = session.get(Scene, scene_id)
    if not scene:
        raise ValueError(f"Scene {scene_id} not found")

    appearances = session.exec(
        select(EntitySceneAppearance).where(EntitySceneAppearance.scene_id == scene_id)
    ).all()

    entity_pool = []
    for esa in appearances:
        ent = session.get(Entity, esa.entity_id)
        if not ent:
            continue
        # Only include non-player entities
        if ent.entity_type in ("ally", "player", "npc"):
            continue
        gd = session.exec(
            select(EntityGameplayData).where(EntityGameplayData.entity_id == ent.id)
        ).first()
        entity_pool.append({
            "entity_id": ent.id,
            "canonical_name": ent.canonical_name,
            "weight": gd.appearance_rate if gd else 1.0,
        })

    if not entity_pool:
        raise ValueError(f"No combatable entities found for scene {scene_id}")

    # Upsert the wave config with generated pool
    wc = session.exec(
        select(SceneWaveConfig).where(SceneWaveConfig.scene_id == scene_id)
    ).first()

    now = _now()
    if wc:
        wc.entity_pool = entity_pool
        wc.updated_at = now
        session.add(wc)
    else:
        wc = SceneWaveConfig(
            scene_id=scene_id,
            entity_pool=entity_pool,
            created_at=now,
            updated_at=now,
        )
        session.add(wc)

    session.commit()
    session.refresh(wc)

    write_audit_log(
        session, admin_email, "auto_populate_wave_config", "wave_config",
        str(scene_id), {"entity_count": len(entity_pool)}, ip,
    )
    return get_wave_config(session, scene_id)
