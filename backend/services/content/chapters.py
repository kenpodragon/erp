"""Content service — Chapters CRUD."""

import logging
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import Book, Chapter, Scene, StoryBeat, Atmosphere
from audit import write_audit_log
from services.content.helpers import _now, _paginate

logger = logging.getLogger(__name__)


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
                if field == "book_id":
                    bk = session.get(Book, new_val)
                    if not bk:
                        raise ValueError(f"Book {new_val} not found")
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
