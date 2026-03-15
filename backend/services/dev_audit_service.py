"""Dev Content Audit service — CRUD + filtering for audit dashboard (5.6)."""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select, col, func

from models.story_mode import DevContentAudit
from models import Scene

logger = logging.getLogger(__name__)

VALID_STATUSES = {"open", "acknowledged", "in_progress", "resolved", "wont_fix"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _audit_to_dict(record: DevContentAudit) -> dict:
    """Convert a DevContentAudit SQLModel instance to a plain dict."""
    return {
        "id": record.id,
        "audit_type": record.audit_type,
        "entity_type": record.entity_type,
        "entity_id": record.entity_id,
        "entity_name": record.entity_name,
        "missing_field": record.missing_field,
        "scene_id": record.scene_id,
        "zone_level": record.zone_level,
        "logged_at": record.logged_at.isoformat() if record.logged_at else None,
        "status": record.status,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def log_content_audit(
    session: Session,
    audit_type: str,
    entity_type: str,
    entity_id: Optional[int],
    entity_name: Optional[str],
    missing_field: Optional[str],
    scene_id: Optional[int] = None,
    zone_level: Optional[int] = None,
) -> Optional[DevContentAudit]:
    """Insert a dev_content_audit record if a matching open/active one doesn't exist.

    Skips creation when a record with the same entity_id + missing_field exists
    and its status is NOT 'resolved' or 'wont_fix'.
    """
    existing = session.exec(
        select(DevContentAudit)
        .where(DevContentAudit.entity_id == entity_id)
        .where(DevContentAudit.missing_field == missing_field)
        .where(col(DevContentAudit.status).notin_(["resolved", "wont_fix"]))
    ).first()
    if existing:
        return None

    audit = DevContentAudit(
        audit_type=audit_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        missing_field=missing_field,
        scene_id=scene_id,
        zone_level=zone_level,
        logged_at=datetime.now(timezone.utc),
    )
    session.add(audit)
    return audit


def list_audit_records(
    session: Session,
    audit_type: Optional[str] = None,
    status: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 50,
    exclude_resolved: bool = True,
) -> dict:
    """Return paginated audit records with optional filters and scene title enrichment."""
    query = select(DevContentAudit)

    if audit_type:
        query = query.where(DevContentAudit.audit_type == audit_type)
    if status:
        query = query.where(DevContentAudit.status == status)
    elif exclude_resolved:
        query = query.where(col(DevContentAudit.status).notin_(["resolved", "wont_fix"]))
    if entity_type:
        query = query.where(DevContentAudit.entity_type == entity_type)
    if search:
        like_pattern = f"%{search}%"
        query = query.where(
            col(DevContentAudit.entity_name).ilike(like_pattern)
            | col(DevContentAudit.missing_field).ilike(like_pattern)
        )
    if date_from:
        query = query.where(DevContentAudit.logged_at >= date_from)
    if date_to:
        query = query.where(DevContentAudit.logged_at <= date_to)

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Paginated results
    offset = (page - 1) * page_size
    query = query.order_by(col(DevContentAudit.logged_at).desc())
    query = query.offset(offset).limit(page_size)
    records = session.exec(query).all()

    # Enrich with scene titles
    scene_ids = {r.scene_id for r in records if r.scene_id is not None}
    scene_titles: dict[int, str] = {}
    if scene_ids:
        scenes = session.exec(
            select(Scene).where(col(Scene.id).in_(list(scene_ids)))
        ).all()
        scene_titles = {s.id: s.title for s in scenes}

    items = []
    for r in records:
        d = _audit_to_dict(r)
        d["scene_title"] = scene_titles.get(r.scene_id) if r.scene_id else None
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_audit_summary(session: Session) -> dict:
    """Return counts grouped by status and by audit_type (non-resolved only)."""
    # Counts by status
    status_rows = session.exec(
        select(DevContentAudit.status, func.count(DevContentAudit.id))
        .group_by(DevContentAudit.status)
    ).all()
    by_status = {row[0]: row[1] for row in status_rows}

    # Counts by audit_type (only active records)
    type_rows = session.exec(
        select(DevContentAudit.audit_type, func.count(DevContentAudit.id))
        .where(col(DevContentAudit.status).notin_(["resolved", "wont_fix"]))
        .group_by(DevContentAudit.audit_type)
    ).all()
    by_type = {row[0]: row[1] for row in type_rows}

    return {"by_status": by_status, "by_type": by_type}


def get_filter_options(session: Session) -> dict:
    """Return distinct audit_types, entity_types (with counts) and valid statuses."""
    type_rows = session.exec(
        select(DevContentAudit.audit_type, func.count(DevContentAudit.id))
        .group_by(DevContentAudit.audit_type)
    ).all()
    audit_types = [{"value": row[0], "count": row[1]} for row in type_rows]

    entity_rows = session.exec(
        select(DevContentAudit.entity_type, func.count(DevContentAudit.id))
        .where(DevContentAudit.entity_type.isnot(None))  # type: ignore[union-attr]
        .group_by(DevContentAudit.entity_type)
    ).all()
    entity_types = [{"value": row[0], "count": row[1]} for row in entity_rows]

    return {
        "audit_types": audit_types,
        "entity_types": entity_types,
        "statuses": sorted(VALID_STATUSES),
    }


def update_audit_status(session: Session, record_id: int, status: str) -> dict:
    """Update the status of a single audit record."""
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {sorted(VALID_STATUSES)}")

    record = session.get(DevContentAudit, record_id)
    if not record:
        raise LookupError(f"Audit record {record_id} not found")

    record.status = status
    session.add(record)
    session.commit()
    session.refresh(record)
    return _audit_to_dict(record)


def bulk_update_status(session: Session, record_ids: list[int], status: str) -> dict:
    """Bulk-update status for multiple audit records."""
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'. Must be one of: {sorted(VALID_STATUSES)}")

    if not record_ids:
        return {"updated": 0, "not_found": []}

    records = session.exec(
        select(DevContentAudit).where(col(DevContentAudit.id).in_(record_ids))
    ).all()

    found_ids = {r.id for r in records}
    not_found = [rid for rid in record_ids if rid not in found_ids]

    for r in records:
        r.status = status
        session.add(r)
    session.commit()

    return {"updated": len(records), "not_found": not_found}
