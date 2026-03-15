"""Admin Scaling service (REC 5.4) — Wave Presets, Difficulty Curves, Difficulty Presets.

Business logic for the Banner & Scaling Editor admin tooling.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select, col, func, update
from sqlalchemy import or_
from fastapi import HTTPException

from models.scaling import WavePreset, WavePresetAssignment, DifficultyCurve, DifficultyPreset
from models.narrative import Book, Chapter, Scene
from models.content import SceneWaveConfig
from models.story_mode import GameConfig

logger = logging.getLogger(__name__)

VALID_SPAWN_PATTERNS = ["uniform", "front_loaded", "crescendo", "random"]
PRESET_CATEGORIES = ["combat", "upgrades"]
PRESET_EXTRA_KEYS = ["session_gold_multiplier", "first_clear_multiplier"]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Wave Presets — to_dict
# ---------------------------------------------------------------------------

def _wave_preset_to_dict(p: WavePreset) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "config": p.config,
        "is_default": p.is_default,
        "sort_order": p.sort_order,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _validate_wave_config(config: dict) -> None:
    """Validate wave preset config JSONB fields."""
    if "max_enemies_per_wave" in config:
        v = config["max_enemies_per_wave"]
        if not isinstance(v, int) or v < 1 or v > 50:
            raise HTTPException(422, detail="max_enemies_per_wave must be integer 1-50")
    if "wave_count" in config:
        v = config["wave_count"]
        if not isinstance(v, int) or v < 1 or v > 100:
            raise HTTPException(422, detail="wave_count must be integer 1-100")
    if "spawn_interval_ms" in config:
        v = config["spawn_interval_ms"]
        if not isinstance(v, int) or v < 200 or v > 10000:
            raise HTTPException(422, detail="spawn_interval_ms must be integer 200-10000")
    for key in ["scaling_factor", "hp_multiplier", "gold_multiplier"]:
        if key in config:
            v = config[key]
            if not isinstance(v, (int, float)) or v <= 0:
                raise HTTPException(422, detail=f"{key} must be a positive number")
    if "spawn_pattern" in config:
        if config["spawn_pattern"] not in VALID_SPAWN_PATTERNS:
            raise HTTPException(422, detail=f"spawn_pattern must be one of {VALID_SPAWN_PATTERNS}")


# ---------------------------------------------------------------------------
# Wave Presets — CRUD
# ---------------------------------------------------------------------------

def list_wave_presets(session: Session, page: int = 1, page_size: int = 50) -> dict:
    total = session.exec(select(func.count()).select_from(WavePreset)).one()
    presets = session.exec(
        select(WavePreset).order_by(WavePreset.sort_order)
        .offset((page - 1) * page_size).limit(page_size)
    ).all()

    # Batch-load assignment counts
    counts = dict(session.exec(
        select(WavePresetAssignment.wave_preset_id, func.count())
        .group_by(WavePresetAssignment.wave_preset_id)
    ).all())

    items = []
    for p in presets:
        d = _wave_preset_to_dict(p)
        d["assignment_count"] = counts.get(p.id, 0)
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def create_wave_preset(session: Session, data: dict) -> dict:
    name = data.get("name", "").strip()
    if not name or len(name) > 100:
        raise HTTPException(422, detail="name is required and must be <= 100 chars")
    existing = session.exec(select(WavePreset).where(WavePreset.name == name)).first()
    if existing:
        raise HTTPException(422, detail=f"Wave preset '{name}' already exists")

    config = data.get("config", {})
    if not isinstance(config, dict):
        raise HTTPException(422, detail="config must be a JSON object")
    _validate_wave_config(config)

    is_default = data.get("is_default", False)
    if is_default:
        _clear_wave_preset_defaults(session)

    sort_order = data.get("sort_order")
    if sort_order is None:
        max_order = session.exec(select(func.max(WavePreset.sort_order))).one()
        sort_order = (max_order or 0) + 1

    now = _now()
    preset = WavePreset(
        name=name,
        description=data.get("description"),
        config=config,
        is_default=is_default,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return _wave_preset_to_dict(preset)


def update_wave_preset(session: Session, preset_id: int, data: dict) -> dict:
    preset = session.get(WavePreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Wave preset not found")

    if "name" in data:
        name = data["name"].strip()
        if not name or len(name) > 100:
            raise HTTPException(422, detail="name must be <= 100 chars")
        existing = session.exec(
            select(WavePreset).where(WavePreset.name == name, WavePreset.id != preset_id)
        ).first()
        if existing:
            raise HTTPException(422, detail=f"Wave preset '{name}' already exists")
        preset.name = name

    if "description" in data:
        preset.description = data["description"]

    if "config" in data:
        config = data["config"]
        if not isinstance(config, dict):
            raise HTTPException(422, detail="config must be a JSON object")
        _validate_wave_config(config)
        preset.config = config

    if "is_default" in data:
        if data["is_default"]:
            _clear_wave_preset_defaults(session)
        preset.is_default = data["is_default"]

    if "sort_order" in data and data["sort_order"] is not None:
        preset.sort_order = data["sort_order"]

    preset.updated_at = _now()
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return _wave_preset_to_dict(preset)


def delete_wave_preset(session: Session, preset_id: int) -> None:
    preset = session.get(WavePreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Wave preset not found")

    # Check assignments
    assign_count = session.exec(
        select(func.count()).select_from(WavePresetAssignment)
        .where(WavePresetAssignment.wave_preset_id == preset_id)
    ).one()

    # Check difficulty presets
    dp_count = session.exec(
        select(func.count()).select_from(DifficultyPreset)
        .where(DifficultyPreset.wave_preset_id == preset_id)
    ).one()

    if assign_count > 0 or dp_count > 0:
        raise HTTPException(409, detail=f"Cannot delete: {assign_count} assignments and {dp_count} presets reference this wave preset")

    session.delete(preset)
    session.commit()


def _clear_wave_preset_defaults(session: Session) -> None:
    presets = session.exec(select(WavePreset).where(WavePreset.is_default == True)).all()
    for p in presets:
        p.is_default = False
        session.add(p)


# ---------------------------------------------------------------------------
# Wave Preset Assignments
# ---------------------------------------------------------------------------

def list_wave_preset_assignments(session: Session, preset_id: int) -> dict:
    preset = session.get(WavePreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Wave preset not found")

    assignments = session.exec(
        select(WavePresetAssignment).where(WavePresetAssignment.wave_preset_id == preset_id)
    ).all()

    items = []
    for a in assignments:
        d = {
            "id": a.id,
            "book_id": a.book_id,
            "book_title": None,
            "chapter_id": a.chapter_id,
            "chapter_title": None,
        }
        if a.book_id:
            book = session.get(Book, a.book_id)
            d["book_title"] = book.title if book else None
        if a.chapter_id:
            chapter = session.get(Chapter, a.chapter_id)
            if chapter:
                d["chapter_title"] = chapter.title
                book = session.get(Book, chapter.book_id)
                d["book_title"] = book.title if book else None
        items.append(d)

    return {"items": items, "total": len(items)}


def create_wave_preset_assignment(session: Session, preset_id: int, data: dict) -> dict:
    preset = session.get(WavePreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Wave preset not found")

    book_id = data.get("book_id")
    chapter_id = data.get("chapter_id")

    if (book_id is None) == (chapter_id is None):
        raise HTTPException(422, detail="Exactly one of book_id or chapter_id must be provided")

    # Validate target exists
    if book_id:
        if not session.get(Book, book_id):
            raise HTTPException(404, detail="Book not found")
        existing = session.exec(
            select(WavePresetAssignment).where(WavePresetAssignment.book_id == book_id)
        ).first()
        if existing:
            raise HTTPException(409, detail=f"Book already has a wave preset assignment (preset #{existing.wave_preset_id})")
    else:
        if not session.get(Chapter, chapter_id):
            raise HTTPException(404, detail="Chapter not found")
        existing = session.exec(
            select(WavePresetAssignment).where(WavePresetAssignment.chapter_id == chapter_id)
        ).first()
        if existing:
            raise HTTPException(409, detail=f"Chapter already has a wave preset assignment (preset #{existing.wave_preset_id})")

    now = _now()
    assignment = WavePresetAssignment(
        wave_preset_id=preset_id,
        book_id=book_id,
        chapter_id=chapter_id,
        created_at=now,
        updated_at=now,
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return {"id": assignment.id, "wave_preset_id": preset_id, "book_id": book_id, "chapter_id": chapter_id}


def delete_wave_preset_assignment(session: Session, assignment_id: int) -> None:
    assignment = session.get(WavePresetAssignment, assignment_id)
    if not assignment:
        raise HTTPException(404, detail="Assignment not found")
    session.delete(assignment)
    session.commit()


def apply_preset_to_scenes(session: Session, preset_id: int, data: dict) -> dict:
    preset = session.get(WavePreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Wave preset not found")

    target = data.get("target")
    target_id = data.get("target_id")
    overwrite = data.get("overwrite_existing", False)

    if target not in ("book", "chapter"):
        raise HTTPException(422, detail="target must be 'book' or 'chapter'")

    if target == "book":
        scene_ids = session.exec(
            select(Scene.id)
            .join(Chapter, Scene.chapter_id == Chapter.id)
            .where(Chapter.book_id == target_id)
        ).all()
    else:
        scene_ids = session.exec(
            select(Scene.id).where(Scene.chapter_id == target_id)
        ).all()

    created = 0
    skipped = 0
    for sid in scene_ids:
        existing = session.exec(
            select(SceneWaveConfig).where(SceneWaveConfig.scene_id == sid)
        ).first()

        if existing and not overwrite:
            skipped += 1
            continue

        if existing and overwrite:
            for key in ["max_enemies_per_wave", "wave_count", "spawn_interval_ms",
                        "scaling_factor", "hp_multiplier", "gold_multiplier"]:
                if key in preset.config:
                    setattr(existing, key, preset.config[key])
            existing.updated_at = _now()
            session.add(existing)
            created += 1
        else:
            swc = SceneWaveConfig(
                scene_id=sid,
                max_enemies_per_wave=preset.config.get("max_enemies_per_wave", 5),
                wave_count=preset.config.get("wave_count", 10),
                spawn_interval_ms=preset.config.get("spawn_interval_ms", 2000),
                scaling_factor=preset.config.get("scaling_factor", 1.0),
                hp_multiplier=preset.config.get("hp_multiplier", 1.0),
                gold_multiplier=preset.config.get("gold_multiplier", 1.0),
            )
            session.add(swc)
            created += 1

    session.commit()
    return {"created_count": created, "skipped_count": skipped, "skipped_reason": "existing scene_wave_configs"}


# ---------------------------------------------------------------------------
# Difficulty Curves — to_dict
# ---------------------------------------------------------------------------

def _curve_to_dict(c: DifficultyCurve) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "curve_data": c.curve_data,
        "is_default": c.is_default,
        "sort_order": c.sort_order,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _validate_curve_data(curve_data: dict) -> None:
    """Validate difficulty curve data JSONB."""
    if not curve_data:
        raise HTTPException(422, detail="curve_data must have at least one chapter entry")

    for key, entry in curve_data.items():
        try:
            int(key)
        except ValueError:
            raise HTTPException(422, detail=f"curve_data keys must be string integers, got '{key}'")

        if not isinstance(entry, dict):
            raise HTTPException(422, detail=f"curve_data[{key}] must be an object")

        for dim in ["hp", "gold", "wave_density", "spawn_speed"]:
            if dim in entry:
                v = entry[dim]
                if not isinstance(v, (int, float)) or v <= 0:
                    raise HTTPException(422, detail=f"curve_data[{key}].{dim} must be a positive number")


# ---------------------------------------------------------------------------
# Difficulty Curves — CRUD
# ---------------------------------------------------------------------------

def list_difficulty_curves(session: Session, page: int = 1, page_size: int = 50) -> dict:
    total = session.exec(select(func.count()).select_from(DifficultyCurve)).one()
    curves = session.exec(
        select(DifficultyCurve).order_by(DifficultyCurve.sort_order)
        .offset((page - 1) * page_size).limit(page_size)
    ).all()

    book_counts = dict(session.exec(
        select(Book.difficulty_curve_id, func.count())
        .where(Book.difficulty_curve_id.isnot(None))
        .group_by(Book.difficulty_curve_id)
    ).all())

    preset_counts = dict(session.exec(
        select(DifficultyPreset.difficulty_curve_id, func.count())
        .where(DifficultyPreset.difficulty_curve_id.isnot(None))
        .group_by(DifficultyPreset.difficulty_curve_id)
    ).all())

    items = []
    for c in curves:
        d = _curve_to_dict(c)
        d["book_count"] = book_counts.get(c.id, 0)
        d["preset_count"] = preset_counts.get(c.id, 0)
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def create_difficulty_curve(session: Session, data: dict) -> dict:
    name = data.get("name", "").strip()
    if not name or len(name) > 100:
        raise HTTPException(422, detail="name is required and must be <= 100 chars")
    existing = session.exec(select(DifficultyCurve).where(DifficultyCurve.name == name)).first()
    if existing:
        raise HTTPException(422, detail=f"Difficulty curve '{name}' already exists")

    curve_data = data.get("curve_data", {})
    if not isinstance(curve_data, dict):
        raise HTTPException(422, detail="curve_data must be a JSON object")
    _validate_curve_data(curve_data)

    is_default = data.get("is_default", False)
    if is_default:
        _clear_curve_defaults(session)

    sort_order = data.get("sort_order")
    if sort_order is None:
        max_order = session.exec(select(func.max(DifficultyCurve.sort_order))).one()
        sort_order = (max_order or 0) + 1

    now = _now()
    curve = DifficultyCurve(
        name=name,
        description=data.get("description"),
        curve_data=curve_data,
        is_default=is_default,
        sort_order=sort_order,
        created_at=now,
        updated_at=now,
    )
    session.add(curve)
    session.commit()
    session.refresh(curve)
    return _curve_to_dict(curve)


def update_difficulty_curve(session: Session, curve_id: int, data: dict) -> dict:
    curve = session.get(DifficultyCurve, curve_id)
    if not curve:
        raise HTTPException(404, detail="Difficulty curve not found")

    if "name" in data:
        name = data["name"].strip()
        if not name or len(name) > 100:
            raise HTTPException(422, detail="name must be <= 100 chars")
        existing = session.exec(
            select(DifficultyCurve).where(DifficultyCurve.name == name, DifficultyCurve.id != curve_id)
        ).first()
        if existing:
            raise HTTPException(422, detail=f"Difficulty curve '{name}' already exists")
        curve.name = name

    if "description" in data:
        curve.description = data["description"]

    if "curve_data" in data:
        curve_data = data["curve_data"]
        if not isinstance(curve_data, dict):
            raise HTTPException(422, detail="curve_data must be a JSON object")
        _validate_curve_data(curve_data)
        curve.curve_data = curve_data

    if "is_default" in data:
        if data["is_default"]:
            _clear_curve_defaults(session)
        curve.is_default = data["is_default"]

    if "sort_order" in data and data["sort_order"] is not None:
        curve.sort_order = data["sort_order"]

    curve.updated_at = _now()
    session.add(curve)
    session.commit()
    session.refresh(curve)
    return _curve_to_dict(curve)


def delete_difficulty_curve(session: Session, curve_id: int) -> None:
    curve = session.get(DifficultyCurve, curve_id)
    if not curve:
        raise HTTPException(404, detail="Difficulty curve not found")

    book_count = session.exec(
        select(func.count()).select_from(Book).where(Book.difficulty_curve_id == curve_id)
    ).one()
    dp_count = session.exec(
        select(func.count()).select_from(DifficultyPreset)
        .where(DifficultyPreset.difficulty_curve_id == curve_id)
    ).one()

    if book_count > 0 or dp_count > 0:
        raise HTTPException(409, detail=f"Cannot delete: {book_count} books and {dp_count} presets reference this curve")

    session.delete(curve)
    session.commit()


def assign_curve_to_book(session: Session, curve_id: int, data: dict) -> dict:
    curve = session.get(DifficultyCurve, curve_id)
    if not curve:
        raise HTTPException(404, detail="Difficulty curve not found")

    book_id = data.get("book_id")
    if not book_id:
        raise HTTPException(422, detail="book_id is required")

    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(404, detail="Book not found")

    unassign = data.get("unassign", False)
    if unassign:
        book.difficulty_curve_id = None
    else:
        book.difficulty_curve_id = curve_id

    book.updated_at = _now()
    session.add(book)
    session.commit()
    return {"book_id": book_id, "difficulty_curve_id": None if unassign else curve_id}


def _clear_curve_defaults(session: Session) -> None:
    curves = session.exec(select(DifficultyCurve).where(DifficultyCurve.is_default == True)).all()
    for c in curves:
        c.is_default = False
        session.add(c)


# ---------------------------------------------------------------------------
# Difficulty Presets — CRUD (for 5.4.3)
# ---------------------------------------------------------------------------

def _preset_to_dict(p: DifficultyPreset) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "difficulty_curve_id": p.difficulty_curve_id,
        "wave_preset_id": p.wave_preset_id,
        "config_snapshot": p.config_snapshot,
        "is_active": p.is_active,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def list_difficulty_presets(session: Session, page: int = 1, page_size: int = 50) -> dict:
    total = session.exec(select(func.count()).select_from(DifficultyPreset)).one()
    presets = session.exec(
        select(DifficultyPreset).order_by(DifficultyPreset.name)
        .offset((page - 1) * page_size).limit(page_size)
    ).all()

    items = []
    for p in presets:
        d = _preset_to_dict(p)
        # Add referenced names
        d["difficulty_curve_name"] = None
        d["wave_preset_name"] = None
        d["config_key_count"] = len(p.config_snapshot) if p.config_snapshot else 0
        if p.difficulty_curve_id:
            curve = session.get(DifficultyCurve, p.difficulty_curve_id)
            d["difficulty_curve_name"] = curve.name if curve else None
        if p.wave_preset_id:
            wp = session.get(WavePreset, p.wave_preset_id)
            d["wave_preset_name"] = wp.name if wp else None
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def create_difficulty_preset(session: Session, data: dict) -> dict:
    name = data.get("name", "").strip()
    if not name or len(name) > 100:
        raise HTTPException(422, detail="name is required and must be <= 100 chars")
    existing = session.exec(select(DifficultyPreset).where(DifficultyPreset.name == name)).first()
    if existing:
        raise HTTPException(422, detail=f"Difficulty preset '{name}' already exists")

    # Validate FK references
    curve_id = data.get("difficulty_curve_id")
    if curve_id is not None:
        if not session.get(DifficultyCurve, curve_id):
            raise HTTPException(404, detail="Referenced difficulty curve not found")

    wave_id = data.get("wave_preset_id")
    if wave_id is not None:
        if not session.get(WavePreset, wave_id):
            raise HTTPException(404, detail="Referenced wave preset not found")

    # Auto-capture config if not provided
    config_snapshot = data.get("config_snapshot")
    if config_snapshot is None:
        config_snapshot = _capture_config_snapshot(session)

    now = _now()
    preset = DifficultyPreset(
        name=name,
        description=data.get("description"),
        difficulty_curve_id=curve_id,
        wave_preset_id=wave_id,
        config_snapshot=config_snapshot,
        is_active=False,
        created_at=now,
        updated_at=now,
    )
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return _preset_to_dict(preset)


def update_difficulty_preset(session: Session, preset_id: int, data: dict) -> dict:
    preset = session.get(DifficultyPreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Difficulty preset not found")

    if "name" in data:
        name = data["name"].strip()
        if not name or len(name) > 100:
            raise HTTPException(422, detail="name must be <= 100 chars")
        existing = session.exec(
            select(DifficultyPreset).where(DifficultyPreset.name == name, DifficultyPreset.id != preset_id)
        ).first()
        if existing:
            raise HTTPException(422, detail=f"Difficulty preset '{name}' already exists")
        preset.name = name

    if "description" in data:
        preset.description = data["description"]

    if "difficulty_curve_id" in data:
        cid = data["difficulty_curve_id"]
        if cid is not None and not session.get(DifficultyCurve, cid):
            raise HTTPException(404, detail="Referenced difficulty curve not found")
        preset.difficulty_curve_id = cid

    if "wave_preset_id" in data:
        wid = data["wave_preset_id"]
        if wid is not None and not session.get(WavePreset, wid):
            raise HTTPException(404, detail="Referenced wave preset not found")
        preset.wave_preset_id = wid

    if "config_snapshot" in data:
        preset.config_snapshot = data["config_snapshot"]

    preset.updated_at = _now()
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return _preset_to_dict(preset)


def delete_difficulty_preset(session: Session, preset_id: int) -> None:
    preset = session.get(DifficultyPreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Difficulty preset not found")
    if preset.is_active:
        raise HTTPException(409, detail="Cannot delete the currently active preset")
    session.delete(preset)
    session.commit()


def capture_current_config(session: Session) -> dict:
    configs = session.exec(
        select(GameConfig).where(
            or_(
                col(GameConfig.category).in_(PRESET_CATEGORIES),
                col(GameConfig.key).in_(PRESET_EXTRA_KEYS)
            )
        )
    ).all()

    snapshot = {}
    for c in configs:
        # value_json is stored as a string — parse it
        try:
            snapshot[c.key] = json.loads(c.value_json) if isinstance(c.value_json, str) else c.value_json
        except (json.JSONDecodeError, TypeError):
            snapshot[c.key] = c.value_json

    default_curve = session.exec(
        select(DifficultyCurve).where(DifficultyCurve.is_default == True)
    ).first()

    default_wave = session.exec(
        select(WavePreset).where(WavePreset.is_default == True)
    ).first()

    return {
        "config_snapshot": snapshot,
        "captured_categories": PRESET_CATEGORIES,
        "extra_keys": PRESET_EXTRA_KEYS,
        "total_keys": len(snapshot),
        "current_active_curve_id": default_curve.id if default_curve else None,
        "current_active_wave_preset_id": default_wave.id if default_wave else None,
    }


def _capture_config_snapshot(session: Session) -> dict:
    result = capture_current_config(session)
    return result["config_snapshot"]


def apply_preset(session: Session, preset_id: int) -> dict:
    preset = session.get(DifficultyPreset, preset_id)
    if not preset:
        raise HTTPException(404, detail="Preset not found")

    # 1. Write config_snapshot values to game_configs
    configs_updated = 0
    for key, value in preset.config_snapshot.items():
        gc = session.exec(select(GameConfig).where(GameConfig.key == key)).first()
        if gc:
            gc.value_json = json.dumps(value) if not isinstance(value, str) else value
            gc.updated_at = _now()
            session.add(gc)
            configs_updated += 1

    # 2. Assign difficulty curve to all books
    books_updated = 0
    if preset.difficulty_curve_id:
        books = session.exec(select(Book)).all()
        for book in books:
            book.difficulty_curve_id = preset.difficulty_curve_id
            session.add(book)
            books_updated += 1

    # 3. Set wave preset as default
    wave_assigned = False
    if preset.wave_preset_id:
        _clear_wave_preset_defaults(session)
        wave = session.get(WavePreset, preset.wave_preset_id)
        if wave:
            wave.is_default = True
            session.add(wave)
            wave_assigned = True

    # 4. Update active preset
    previous_active = session.exec(
        select(DifficultyPreset).where(DifficultyPreset.is_active == True)
    ).first()
    previous_name = previous_active.name if previous_active else None
    if previous_active and previous_active.id != preset_id:
        previous_active.is_active = False
        session.add(previous_active)

    preset.is_active = True
    session.add(preset)
    session.commit()

    return {
        "configs_updated": configs_updated,
        "curve_assigned_to_books": books_updated,
        "wave_preset_assigned": wave_assigned,
        "previous_active_preset": previous_name,
    }
