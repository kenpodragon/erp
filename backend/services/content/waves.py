"""Content service — Wave configs, templates, bulk operations, auto-populate."""

import logging

from sqlmodel import Session, select

from models import Book, Chapter, Scene, Entity, EntityGameplayData, EntityType
from models.content import SceneWaveConfig
from models.story_mode import EntitySceneAppearance
from audit import write_audit_log
from services.content.helpers import _now

logger = logging.getLogger(__name__)


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

    entity_pool = payload.get("entity_pool")
    if entity_pool is not None:
        _validate_entity_pool(session, entity_pool)

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
    """Bulk apply a wave template to all scenes in a chapter or book."""
    scope = payload.get("scope")
    scope_id = payload.get("scope_id")
    template = payload.get("template", {})
    scaling_increment = payload.get("scaling_increment", 0.0)
    overwrite = payload.get("overwrite", False)

    if scope not in ("chapter", "book"):
        raise ValueError("scope must be 'chapter' or 'book'")

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
    """Adjust HP/gold multipliers for selected scenes."""
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
        et = session.get(EntityType, ent.entity_type_id) if ent.entity_type_id else None
        if et and et.name in ("ally", "player", "npc"):
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
