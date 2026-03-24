"""Admin CRUD routes for visual lookup tables."""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text as sa_text
from sqlmodel import Session, select

from db import get_session
from auth import get_current_admin
from audit import write_audit_log
from models.visual import (
    MovementType,
    SizeClass,
    AnimationStyle,
    SilhouetteType,
    ArmorClass,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/visual", tags=["admin-visual"])

# ---------------------------------------------------------------------------
# Table registry — maps URL path segment to SQLModel class
# ---------------------------------------------------------------------------

TABLE_MAP: Dict[str, Any] = {
    "movement_types": MovementType,
    "size_classes": SizeClass,
    "animation_styles": AnimationStyle,
    "silhouette_types": SilhouetteType,
    "armor_classes": ArmorClass,
}


def _get_model(table_name: str):
    model = TABLE_MAP.get(table_name)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown table: {table_name}. Valid: {', '.join(TABLE_MAP.keys())}",
        )
    return model


def _row_to_dict(row) -> dict:
    """Convert a SQLModel row to a plain dict, excluding internal attrs."""
    data = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name, None)
        if isinstance(val, datetime):
            val = val.isoformat()
        data[col.name] = val
    return data


# ---------------------------------------------------------------------------
# Asset preview — aggregated read-only endpoint for the Asset Viewer page
# Must be defined BEFORE the /{table_name} catch-all below.
# ---------------------------------------------------------------------------

@router.get("/asset-preview")
def get_asset_preview(
    session: Session = Depends(get_session),
    _admin: dict = Depends(get_current_admin),
):
    """Return all visual asset data for the Asset Viewer admin page."""

    # 1. Backgrounds
    bg_rows = session.exec(
        sa_text("""
            SELECT id, name, background_key, mood, parallax_config, color_palette
            FROM backgrounds ORDER BY mood, name
        """)
    ).mappings().all()
    backgrounds = [dict(r) for r in bg_rows]

    # 2. Entity sprites (with visual FK names)
    entity_rows = session.exec(
        sa_text("""
            SELECT
                egd.id, egd.sprite_key, egd.color_primary, egd.color_secondary,
                e.canonical_name, et.name AS entity_type,
                mt.name AS movement_name,
                sc.name AS size_name,
                ans.name AS animation_name,
                st.name AS silhouette_name
            FROM entity_gameplay_data egd
            JOIN entities e ON e.id = egd.entity_id
            LEFT JOIN entity_types et ON et.id = e.entity_type_id
            LEFT JOIN movement_types mt ON mt.id = egd.movement_type_id
            LEFT JOIN size_classes sc ON sc.id = egd.size_class_id
            LEFT JOIN animation_styles ans ON ans.id = egd.animation_style_id
            LEFT JOIN silhouette_types st ON st.id = egd.silhouette_type_id
            ORDER BY e.canonical_name
            LIMIT 500
        """)
    ).mappings().all()
    entities = [dict(r) for r in entity_rows]

    # 3. Attack types
    atk_rows = session.exec(
        sa_text("""
            SELECT id, name, attack_animation_type, projectile_color,
                   trail_type, impact_effect
            FROM attack_types ORDER BY name
        """)
    ).mappings().all()
    attack_types = [dict(r) for r in atk_rows]

    # 4. Item sprites from asset_registry
    item_rows = session.exec(
        sa_text("""
            SELECT id, asset_key, display_name, category, render_definition, tags
            FROM asset_registry
            WHERE category = 'item_sprite'
            ORDER BY asset_key
        """)
    ).mappings().all()
    item_sprites = [dict(r) for r in item_rows]

    # 5a. Achievements with icon keys
    ach_rows = session.exec(
        sa_text("""
            SELECT a.id, a.name, a.description, a.category, a.icon_sprite_key,
                   ar.render_definition AS icon_render
            FROM achievements a
            LEFT JOIN asset_registry ar ON ar.asset_key = a.icon_sprite_key
            ORDER BY a.category, a.name
        """)
    ).mappings().all()
    achievements = [dict(r) for r in ach_rows]

    # 5b. Curated artifacts with best-tier rarity
    ca_rows = session.exec(
        sa_text("""
            SELECT ca.id, ca.name, ca.source_type, ca.icon_sprite_key,
                   ar.render_definition AS icon_render,
                   cat.rarity
            FROM curated_artifacts ca
            LEFT JOIN asset_registry ar ON ar.asset_key = ca.icon_sprite_key
            LEFT JOIN curated_artifact_tiers cat ON cat.curated_artifact_id = ca.id
            ORDER BY ca.name
        """)
    ).mappings().all()
    curated_artifacts = [dict(r) for r in ca_rows]

    # 6. Entity family distribution
    fam_rows = session.exec(
        sa_text("""
            SELECT ef.name AS family_name, COUNT(e.id) AS count
            FROM entity_families ef
            LEFT JOIN entities e ON e.entity_family_id = ef.id
            GROUP BY ef.name
            ORDER BY count DESC
        """)
    ).mappings().all()
    entity_families = [dict(r) for r in fam_rows]

    # 7. Boss lore samples
    lore_rows = session.exec(
        sa_text("""
            SELECT c.id, c.title, c.chapter_number, c.transition_lore_text,
                   b.title AS book_title
            FROM chapters c
            JOIN books b ON b.id = c.book_id
            WHERE c.transition_lore_text IS NOT NULL
                AND c.transition_lore_text != ''
            ORDER BY c.id
            LIMIT 5
        """)
    ).mappings().all()
    boss_lore = [dict(r) for r in lore_rows]

    # 8. Scene assignment coverage
    cov_row = session.exec(
        sa_text("""
            SELECT
                COUNT(*) AS total_scenes,
                COUNT(atmosphere_id) AS with_atmosphere,
                COUNT(background_id) AS with_background,
                COUNT(*) - COUNT(atmosphere_id) AS missing_atmosphere,
                COUNT(*) - COUNT(background_id) AS missing_background
            FROM scene_gameplay_data
        """)
    ).mappings().first()
    scene_coverage = dict(cov_row) if cov_row else {}

    return {
        "backgrounds": backgrounds,
        "entities": entities,
        "attack_types": attack_types,
        "item_sprites": item_sprites,
        "achievements": achievements,
        "curated_artifacts": curated_artifacts,
        "entity_families": entity_families,
        "boss_lore": boss_lore,
        "scene_coverage": scene_coverage,
    }


# ---------------------------------------------------------------------------
# Generic CRUD endpoints
# ---------------------------------------------------------------------------

@router.get("/{table_name}")
def list_rows(
    table_name: str,
    session: Session = Depends(get_session),
    _admin: dict = Depends(get_current_admin),
):
    """List all rows in a visual lookup table."""
    model = _get_model(table_name)
    rows = session.exec(select(model)).all()
    return {"items": [_row_to_dict(row) for row in rows], "total": len(rows)}


@router.post("/{table_name}", status_code=201)
def create_row(
    table_name: str,
    body: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Create a new row in a visual lookup table."""
    model = _get_model(table_name)
    # Strip id and created_at — let the DB handle them
    body.pop("id", None)
    body.pop("created_at", None)
    try:
        row = model(**body, created_at=datetime.now(timezone.utc))
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    session.add(row)
    session.commit()
    session.refresh(row)
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"create_{table_name}",
        target_type=table_name,
        target_id=str(row.id),
        details=body,
    )
    return _row_to_dict(row)


@router.put("/{table_name}/{row_id}")
def update_row(
    table_name: str,
    row_id: int,
    body: dict,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Update a row in a visual lookup table."""
    model = _get_model(table_name)
    row = session.get(model, row_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"{table_name} row {row_id} not found")
    # Don't allow overwriting id or created_at
    body.pop("id", None)
    body.pop("created_at", None)
    for key, value in body.items():
        if hasattr(row, key):
            setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"update_{table_name}",
        target_type=table_name,
        target_id=str(row_id),
        details=body,
    )
    return _row_to_dict(row)


@router.delete("/{table_name}/{row_id}")
def delete_row(
    table_name: str,
    row_id: int,
    session: Session = Depends(get_session),
    admin: dict = Depends(get_current_admin),
):
    """Delete a row from a visual lookup table."""
    model = _get_model(table_name)
    row = session.get(model, row_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"{table_name} row {row_id} not found")
    session.delete(row)
    session.commit()
    write_audit_log(
        session,
        admin_email=admin.get("email", "unknown"),
        action=f"delete_{table_name}",
        target_type=table_name,
        target_id=str(row_id),
        details={},
    )
    return {"ok": True, "deleted_id": row_id}
