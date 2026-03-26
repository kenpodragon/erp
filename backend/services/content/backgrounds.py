"""Content service — Backgrounds CRUD."""

import logging

from sqlmodel import Session, select
from sqlalchemy import func

from models import SceneGameplayData, AssetRegistryEntry
from models.content import Background
from audit import write_audit_log
from services.content.helpers import _now

logger = logging.getLogger(__name__)


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
    existing = session.exec(
        select(Background).where(Background.name == payload["name"])
    ).first()
    if existing:
        raise ValueError(f"Background name '{payload['name']}' already exists")

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
                if field == "name":
                    dup = session.exec(
                        select(Background).where(Background.name == new_val).where(Background.id != bg_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Background name '{new_val}' already exists")
                if field == "background_key":
                    dup = session.exec(
                        select(Background).where(Background.background_key == new_val).where(Background.id != bg_id)
                    ).first()
                    if dup:
                        raise ValueError(f"Background key '{new_val}' already exists")
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
