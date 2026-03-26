"""Story Mode scene endpoints — configs, narrative, enemies, transitions."""

import logging
import math
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col

from db import get_session
from auth import get_current_player
from models import (
    Scene, Chapter, Book, StoryBeat, Entity, EntityGameplayData,
    PlayerSettings,
)
from models.story_mode import GameConfig, EntitySceneAppearance
from services.dev_audit_service import log_content_audit

from routes.story.helpers import (
    _get_config_float, _get_config_int,
    _calc_zone_hp, _calc_zone_gold,
    DEFAULT_HP_SCALING, DEFAULT_WPM,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/configs")
async def get_game_configs(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return all game_configs as a flat key->value dict for the combat engine."""
    configs = session.exec(select(GameConfig)).all()
    return {c.key: c.value_json for c in configs}


@router.get("/scenes/{scene_id}/narrative")
async def get_scene_narrative(
    scene_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Return story beats for the scene, annotated with word counts and display delays.
    total_estimated_seconds is pulled from SceneGameplayData if available.
    """
    scene = session.get(Scene, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    player = token.get("player")
    wpm = _get_config_int(session, "default_player_wpm", DEFAULT_WPM)
    if player:
        settings = session.exec(
            select(PlayerSettings).where(PlayerSettings.player_id == player.id)
        ).first()
        if settings and hasattr(settings, "narration_wpm") and settings.narration_wpm:
            wpm = settings.narration_wpm

    beats = session.exec(
        select(StoryBeat)
        .where(StoryBeat.scene_id == scene_id)
        .order_by(StoryBeat.sort_order.asc())
    ).all()

    result = []
    for beat in beats:
        text = beat.raw_text or beat.summary or ""
        word_count = len(text.split()) if text.strip() else 0
        delay_s = max(2.0, (word_count / max(wpm, 1)) * 60.0)
        result.append({
            "id": beat.id,
            "beat_number": beat.beat_number,
            "sort_order": beat.sort_order,
            "text": text,
            "word_count": word_count,
            "display_delay_seconds": round(delay_s, 2),
            "intensity": beat.intensity,
            "pacing": beat.pacing,
            "image_path": beat.content_image_path,
        })

    total_words = sum(b["word_count"] for b in result)
    # Reverted to word-count based duration.
    # Force 1 wave for Chapter 1 Scene 1 of Book 1.
    if scene.scene_number == 1 and scene.chapter.chapter_number == 1 and scene.chapter.book.book_number == 1:
        total_estimated_seconds = 10.0
    else:
        total_estimated_seconds = round((total_words / max(wpm, 1)) * 60.0, 1)

    return {
        "scene_id": scene_id,
        "scene_title": scene.title,
        "beats": result,
        "total_beats": len(result),
        "total_words": total_words,
        "total_estimated_seconds": total_estimated_seconds,
        "user_wpm": wpm,
    }


@router.get("/scenes/{scene_id}/enemies")
async def get_scene_enemies(
    scene_id: int,
    zone: int = 1,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """
    Return 10 random enemies for the scene, pulling from the current scene or earlier.
    Excludes boss/mini_boss entities.
    """
    scaling = _get_config_float(session, "hp_scaling_factor", DEFAULT_HP_SCALING)
    z_hp = _calc_zone_hp(zone, scaling)
    z_gold = _calc_zone_gold(zone)

    # 1. Fetch current scene hierarchy
    current_scene = session.get(Scene, scene_id)
    if not current_scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    current_chapter = current_scene.chapter
    current_book = current_chapter.book

    # 2. Find all scenes at or before this one
    earlier_scenes_query = (
        select(Scene.id)
        .join(Chapter, Scene.chapter_id == Chapter.id)
        .join(Book, Chapter.book_id == Book.id)
        .where(
            (Book.book_number < current_book.book_number) |
            ((Book.book_number == current_book.book_number) & (Chapter.chapter_number < current_chapter.chapter_number)) |
            ((Book.book_number == current_book.book_number) & (Chapter.chapter_number == current_chapter.chapter_number) & (Scene.scene_number <= current_scene.scene_number))
        )
    )
    earlier_scene_ids = session.exec(earlier_scenes_query).all()

    # Scene progression scaling: later scenes have tougher mobs.
    scene_position = max(len(earlier_scene_ids), 1)
    scene_hp_scale_base = _get_config_float(session, "scene_hp_scaling_base", 1.012)
    scene_hp_multiplier = math.pow(scene_hp_scale_base, scene_position - 1)
    scene_gold_scale_base = _get_config_float(session, "scene_gold_scaling_base", 1.008)
    scene_gold_multiplier = math.pow(scene_gold_scale_base, scene_position - 1)

    # Max HP cap: per-scene override from scene_gameplay_data, or global fallback
    scene_gd = current_scene.gameplay_data
    if scene_gd and scene_gd.max_enemy_hp:
        max_hp_for_scene = float(scene_gd.max_enemy_hp)
    else:
        max_base_hp_cap = _get_config_float(session, "max_scene_base_hp", 500.0)
        max_hp_for_scene = max_base_hp_cap * scene_hp_multiplier

    # Apply scene scaling to zone fallback values
    z_hp = min(z_hp * scene_hp_multiplier, max_hp_for_scene)
    z_gold = z_gold * scene_gold_multiplier

    # 3. Find eligible entities from those scenes
    boss_roles = ["boss", "mini_boss", "big-boss", "mini-boss"]
    boss_entity_ids_subquery = (
        select(EntitySceneAppearance.entity_id)
        .where(col(EntitySceneAppearance.role).in_(boss_roles))
    )

    eligible_entities_query = (
        select(Entity)
        .where(
            (col(Entity.first_appearance_scene_id).in_(earlier_scene_ids)) |
            (col(Entity.id).in_(
                select(EntitySceneAppearance.entity_id)
                .where(col(EntitySceneAppearance.scene_id).in_(earlier_scene_ids))
                .where(col(EntitySceneAppearance.role).notin_(boss_roles))
            ))
        )
        .where(col(Entity.id).notin_(boss_entity_ids_subquery))
    )

    final_eligible = session.exec(eligible_entities_query).all()

    # 5. Pick 10 random entities (allowing repeats)
    results = []
    if not final_eligible:
        # Fallback if no entities found
        log_content_audit(session, "missing_entity", "scene", None,
                   f"scene_{scene_id}", "enemies", scene_id, zone)
        session.commit()

        fallback_enemy = {
            "entity_id": None,
            "canonical_name": "Shadow Wraith",
            "role": "enemy",
            "sprite_key": None,
            "base_hp": round(z_hp, 2),
            "base_gold": round(z_gold, 2),
            "is_boss": False,
            "is_fallback": True,
            "description": "A formless shadow that haunts the Tower.",
        }
        results = [fallback_enemy] * 10
    else:
        chosen_entities = random.choices(final_eligible, k=10)
        for entity in chosen_entities:
            gd = session.exec(
                select(EntityGameplayData)
                .where(EntityGameplayData.entity_id == entity.id)
            ).first()

            is_fallback = False
            if gd is None:
                log_content_audit(session, "missing_stat", "enemy", entity.id,
                           entity.canonical_name, "entity_gameplay_data", scene_id, zone)
                hp = z_hp
                gold = z_gold
                sprite_key = None
                is_fallback = True
            else:
                hp = float(gd.base_hp) if gd.base_hp else None
                gold = float(gd.base_gold) if gd.base_gold else None
                sprite_key = gd.sprite_key

                if not hp:
                    log_content_audit(session, "missing_stat", "enemy", entity.id,
                               entity.canonical_name, "base_hp", scene_id, zone)
                    hp = z_hp  # already scene-scaled
                    is_fallback = True
                else:
                    # Scale entity's base_hp by scene progression, capped
                    hp = min(hp * scene_hp_multiplier, max_hp_for_scene)

                if not gold:
                    log_content_audit(session, "missing_stat", "enemy", entity.id,
                               entity.canonical_name, "base_gold", scene_id, zone)
                    gold = z_gold  # already scene-scaled
                    is_fallback = True
                else:
                    # Scale entity's base_gold by scene progression
                    gold = gold * scene_gold_multiplier

                if not sprite_key:
                    log_content_audit(session, "missing_sprite", "enemy", entity.id,
                               entity.canonical_name, "sprite_key", scene_id, zone)

            results.append({
                "entity_id": entity.id,
                "canonical_name": entity.canonical_name,
                "role": "enemy",
                "sprite_key": sprite_key,
                "base_hp": round(hp, 2),
                "base_gold": round(gold, 2),
                "is_boss": False,
                "is_fallback": is_fallback,
                "description": entity.base_description,
            })
        session.commit()

    return {
        "scene_id": scene_id,
        "zone": zone,
        "scene_position": scene_position,
        "scene_hp_multiplier": round(scene_hp_multiplier, 4),
        "enemies": results,
    }


# ---------------------------------------------------------------------------
# Boss Transition Lore Endpoints
# ---------------------------------------------------------------------------

@router.get("/chapter/{chapter_id}/transition")
async def get_chapter_transition(
    chapter_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return transition lore text shown after clearing a chapter boss."""
    chapter = session.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {
        "chapter_id": chapter_id,
        "chapter_title": chapter.title,
        "transition_lore_text": chapter.transition_lore_text,
        "unlocks": [],
    }


@router.get("/book/{book_id}/transition")
async def get_book_transition(
    book_id: int,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return transition lore text shown after clearing a book boss."""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return {
        "book_id": book_id,
        "book_title": book.title,
        "transition_lore_text": book.transition_lore_text,
        "unlocks": [],
    }
