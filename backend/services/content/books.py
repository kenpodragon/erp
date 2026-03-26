"""Content service — Books CRUD."""

import logging
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import Book, Chapter, Scene, Atmosphere
from audit import write_audit_log
from services.content.helpers import _now

logger = logging.getLogger(__name__)


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
    existing = session.exec(
        select(Book).where(Book.book_number == payload["book_number"])
    ).first()
    if existing:
        raise ValueError(f"Book number {payload['book_number']} already exists")

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
                if field == "book_number":
                    dup = session.exec(
                        select(Book).where(Book.book_number == new_val).where(Book.id != book_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Book number {new_val} already exists")
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
