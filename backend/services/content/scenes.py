"""Content service — Scenes CRUD with gameplay data and boss config."""

import logging
from typing import Optional

from sqlmodel import Session, select
from sqlalchemy import func

from models import (
    Book, Chapter, Scene, StoryBeat, Location,
    SceneGameplayData, Entity, Atmosphere,
)
from models.content import Background, SceneWaveConfig, EntityBeatAppearance
from models.story_mode import EntitySceneAppearance
from audit import write_audit_log
from services.content.helpers import _now, _paginate

logger = logging.getLogger(__name__)

VALID_SCENE_TYPES = {"normal", "chapter_boss", "book_boss", "interlude", "tutorial"}
VALID_INTERRUPT_TYPES = {"click_burst", "target_zone", "whack_sequence"}


def _scene_detail(session: Session, scene: Scene) -> dict:
    """Build full scene detail dict."""
    ch = session.get(Chapter, scene.chapter_id)
    book = session.get(Book, ch.book_id) if ch else None

    location_name = None
    if scene.primary_location_id:
        loc = session.get(Location, scene.primary_location_id)
        if loc:
            location_name = loc.canonical_name

    beat_count = session.exec(
        select(func.count()).select_from(StoryBeat).where(StoryBeat.scene_id == scene.id)
    ).one()
    entity_count = session.exec(
        select(func.count()).select_from(EntitySceneAppearance)
        .where(EntitySceneAppearance.scene_id == scene.id)
    ).one()

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


def _upsert_gameplay_data(session: Session, scene_id: int, gd_payload: dict) -> None:
    """Create or update SceneGameplayData for a scene."""
    gd = session.exec(
        select(SceneGameplayData).where(SceneGameplayData.scene_id == scene_id)
    ).first()

    bg_id = gd_payload.get("background_id")
    if bg_id is not None:
        bg = session.get(Background, bg_id)
        if not bg:
            raise ValueError(f"Background {bg_id} not found")

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


def create_scene(
    session: Session, payload: dict, admin_email: str, ip: str
) -> dict:
    """Create a scene. Validates chapter_id FK and unique (chapter_id, scene_number)."""
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

    if payload.get("primary_location_id"):
        loc = session.get(Location, payload["primary_location_id"])
        if not loc:
            raise ValueError(f"Location {payload['primary_location_id']} not found")

    scene_type = payload.get("scene_type", "normal")
    if scene_type not in VALID_SCENE_TYPES:
        raise ValueError(f"Invalid scene_type '{scene_type}'. Must be one of: {', '.join(sorted(VALID_SCENE_TYPES))}")

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
                if field == "chapter_id":
                    ch = session.get(Chapter, new_val)
                    if not ch:
                        raise ValueError(f"Chapter {new_val} not found")
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
                if field == "primary_location_id" and new_val is not None:
                    loc = session.get(Location, new_val)
                    if not loc:
                        raise ValueError(f"Location {new_val} not found")
                if field == "scene_type" and new_val not in VALID_SCENE_TYPES:
                    raise ValueError(
                        f"Invalid scene_type '{new_val}'. Must be one of: {', '.join(sorted(VALID_SCENE_TYPES))}"
                    )
                changes[field] = {"old": old_val, "new": new_val}
                setattr(scene, field, new_val)

    if "boss_config" in payload:
        bc = payload["boss_config"]
        if bc is not None:
            _validate_boss_config(session, bc)
        if scene.boss_config != bc:
            changes["boss_config"] = {"old": "...", "new": "..."}
            scene.boss_config = bc

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
