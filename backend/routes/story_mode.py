"""Story Mode (Loop B) API routes.

Endpoints:
  GET  /api/game/story/configs                          — game_configs for combat engine
  GET  /api/game/story/scenes/{scene_id}/narrative      — story beats with word counts / delays
  GET  /api/game/story/scenes/{scene_id}/enemies        — enemies for scene w/ fallback stat injection
  POST /api/game/story/session/start                    — create or resume session
  GET  /api/game/story/session/{session_id}             — get session state
  POST /api/game/story/session/{session_id}/tick        — batch combat tick (CPS validation)
  POST /api/game/story/session/{session_id}/upgrade     — purchase session upgrade
  POST /api/game/story/session/{session_id}/skill       — activate active skill
  POST /api/game/story/session/{session_id}/narrative   — update narrative progress
  POST /api/game/story/session/{session_id}/complete    — finalise session → Essence
"""

import logging
import uuid
import math
import random
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, col

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, PlayerProgress, PlayerEssence,
    Scene, Chapter, Book, StoryBeat, Entity, EntityGameplayData,
    Skill, PlayerSettings,
)
from models.story_mode import (
    GameConfig, PlayerStorySession, SessionUpgrade,
    PlayerMetaProgression, DevContentAudit,
    CharacterSkillLevel, EntitySceneAppearance, BossCompletion,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/game/story", tags=["story_mode"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEFAULT_HP_SCALING = 1.55
DEFAULT_CPS_CAP = 20
DEFAULT_WPM = 200
DEFAULT_CLICK_STRENGTH = 10  # fallback when no character stat


def _get_config_float(session: Session, key: str, default: float) -> float:
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return float(cfg.value_json)
    except (TypeError, ValueError):
        return default


def _get_config_int(session: Session, key: str, default: int) -> int:
    cfg = session.get(GameConfig, key)
    if cfg is None:
        return default
    try:
        return int(float(cfg.value_json))
    except (TypeError, ValueError):
        return default


def _calc_zone_hp(zone: int, scaling: float) -> float:
    """HP = 10 × (scaling^(zone-1) + zone - 1)"""
    if scaling <= 1.0:
        scaling = 1.15
    return 10.0 * (math.pow(scaling, zone - 1) + zone - 1)


def _calc_zone_gold(zone: int) -> float:
    """Base gold per monster kill at zone. Exponential scaling."""
    scaling = 1.1
    return 5.0 * (math.pow(scaling, zone - 1) + zone - 1)


def _log_audit(session: Session, audit_type: str, entity_type: str,
               entity_id: Optional[int], entity_name: Optional[str],
               missing_field: Optional[str], scene_id: Optional[int],
               zone_level: Optional[int]) -> None:
    """Insert a dev_content_audit record if one doesn't already exist."""
    existing = session.exec(
        select(DevContentAudit)
        .where(DevContentAudit.entity_id == entity_id)
        .where(DevContentAudit.missing_field == missing_field)
        .where(DevContentAudit.resolved == False)
    ).first()
    if existing:
        return
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


def _get_character(session: Session, player_id: int) -> PlayerCharacter:
    char = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


def _calc_auto_dps(session: Session, character_id: int) -> float:
    """
    Sum auto_dps_base contributions from all character skill levels.

    Formula:
      base_dps = Σ(skill_level × skill.benefits_json["auto_dps_base"])
      bonus_mult = 1 + Σ(skill_level × skill.benefits_json["auto_dps_bonus"])
      total_auto_dps = base_dps × bonus_mult
    """
    skills = session.exec(select(Skill)).all()
    skill_levels: dict[int, int] = {}

    rows = session.exec(
        select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character_id)
    ).all()
    for row in rows:
        skill_levels[row.skill_id] = row.level

    base_dps = 0.0
    bonus_mult = 1.0

    for skill in skills:
        benefits = skill.benefits_json or {}
        level = skill_levels.get(skill.id, 1)  # default level 1

        if "auto_dps_base" in benefits:
            try:
                base_dps += level * float(benefits["auto_dps_base"])
            except (TypeError, ValueError):
                pass

        if "auto_dps_bonus" in benefits:
            try:
                bonus_mult += level * float(benefits["auto_dps_bonus"])
            except (TypeError, ValueError):
                pass

    return base_dps * bonus_mult


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SessionStartRequest(BaseModel):
    scene_id: int


class TickRequest(BaseModel):
    clicks: int
    elapsed_ms: int
    zone: int
    wave: int
    gold_delta: float          # Client-reported gold from kills this tick
    waves_completed_delta: int  # Waves completed since last tick


class UpgradeRequest(BaseModel):
    upgrade_type: str   # 'click_dmg' | 'auto_dps' | 'skill_unlock' | 'skill_level'
    target_id: Optional[int] = None  # skill ID for skill upgrades
    quantity: int = 1   # x1/x10/x100/MAX handled by client; always an integer ≥ 1


class SkillActivateRequest(BaseModel):
    skill_id: int


class NarrativeUpdateRequest(BaseModel):
    progress_pct: float  # 0.0–100.0


def _calc_multipliers(session: Session, upgrades: List[SessionUpgrade]) -> tuple[float, float, int, int]:
    """
    Calculate aggregate multipliers from all session upgrades.
    Includes base per-level multiplier and milestone bonuses.
    Returns (click_mult, auto_mult, click_level, auto_level)
    """
    click_lvl = sum(u.level for u in upgrades if u.upgrade_type == "click_dmg")
    auto_lvl = sum(u.level for u in upgrades if u.upgrade_type == "auto_dps")

    m_start = _get_config_int(session, "milestone_start", 200)
    m_interval = _get_config_int(session, "milestone_interval", 25)
    c_mult_step = _get_config_float(session, "click_dmg_mult_per_level", 0.05)
    a_mult_step = _get_config_float(session, "auto_dps_mult_per_level", 0.05)

    def get_mult(level: int, step: float):
        # Base multiplier: 1 + (level * step)
        mult = 1.0 + (level * step)
        
        # 4x bonus every 25 levels starting at 200
        if level >= m_start:
            milestones = (level - (m_start - m_interval)) // m_interval
            mult *= (4 ** milestones)
            
        # 10x bonus every 1000 levels
        grand_milestones = level // 1000
        mult *= (10 ** grand_milestones)
        return mult

    return get_mult(click_lvl, c_mult_step), get_mult(auto_lvl, a_mult_step), click_lvl, auto_lvl


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/configs")
async def get_game_configs(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Return all game_configs as a flat key→value dict for the combat engine."""
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

    # 3. Find eligible entities from those scenes
    # We look at entities whose first_appearance is in these scenes OR they have an appearance record.
    # Requirement: "anything not marked as boss or miniboss"
    # We exclude any entity that is EVER marked as a boss or mini_boss.
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
        _log_audit(session, "missing_entity", "scene", None,
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
                _log_audit(session, "missing_stat", "enemy", entity.id,
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
                    _log_audit(session, "missing_stat", "enemy", entity.id,
                               entity.canonical_name, "base_hp", scene_id, zone)
                    hp = z_hp
                    is_fallback = True

                if not gold:
                    _log_audit(session, "missing_stat", "enemy", entity.id,
                               entity.canonical_name, "base_gold", scene_id, zone)
                    gold = z_gold
                    is_fallback = True

                if not sprite_key:
                    _log_audit(session, "missing_sprite", "enemy", entity.id,
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

    return {"scene_id": scene_id, "zone": zone, "enemies": results}


@router.post("/session/start")
async def start_session(
    body: SessionStartRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    char = _get_character(session, player.id)

    scene = session.get(Scene, body.scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    chapter_id = scene.chapter_id
    is_boss_session = scene.scene_type in ('chapter_boss', 'book_boss')
    boss_config = scene.boss_config or {}
    
    # Global override for refill time as requested
    if is_boss_session and boss_config:
        boss_config["interrupt_refill_seconds"] = 3

    # ── Boss session gate: validate all normal scenes in chapter are mastered ─
    # Uses the same logic as the map endpoint's all_chapter_normal_mastered check.
    if is_boss_session:
        progress_check = session.exec(
            select(PlayerProgress).where(PlayerProgress.character_id == char.id)
        ).first()

        if not progress_check:
            raise HTTPException(
                status_code=403,
                detail="All scenes in this chapter must be completed before challenging the boss."
            )

        p_book = progress_check.book_number
        p_chapter = progress_check.chapter_number
        p_scene = progress_check.scene_number

        boss_chapter = scene.chapter
        boss_book_num = boss_chapter.book.book_number
        boss_chap_num = boss_chapter.chapter_number

        if p_book > boss_book_num:
            chapter_cleared = True
        elif p_book == boss_book_num and p_chapter > boss_chap_num:
            chapter_cleared = True
        elif p_book == boss_book_num and p_chapter == boss_chap_num:
            # Player is still in the same chapter — check if they're past all normal scenes
            normal_scenes = session.exec(
                select(Scene)
                .where(Scene.chapter_id == chapter_id)
                .where(Scene.scene_type == 'normal')
            ).all()
            max_normal_scene_num = max((ns.scene_number for ns in normal_scenes), default=0)
            chapter_cleared = p_scene > max_normal_scene_num
        else:
            chapter_cleared = False

        if not chapter_cleared:
            raise HTTPException(
                status_code=403,
                detail="All scenes in this chapter must be completed before challenging the boss."
            )

    # ── Check boss replay (already completed) ───────────────────────────────
    is_replay = False
    if is_boss_session:
        existing_completion = session.exec(
            select(BossCompletion)
            .where(BossCompletion.player_id == player.id)
            .where(BossCompletion.scene_id == body.scene_id)
        ).first()
        is_replay = existing_completion is not None

    # If the user is starting a scene they ALREADY completed, force a fresh start.
    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.character_id == char.id)
    ).first()

    previously_completed = False
    if progress and not is_boss_session:
        if scene.chapter.chapter_number < progress.chapter_number:
            previously_completed = True
        elif scene.chapter.chapter_number == progress.chapter_number and scene.scene_number < progress.scene_number:
            previously_completed = True

    active_session = session.exec(
        select(PlayerStorySession)
        .where(PlayerStorySession.player_id == player.id)
        .where(PlayerStorySession.scene_id == body.scene_id)
        .where(PlayerStorySession.is_active == True)
    ).first()

    if active_session and (previously_completed or is_boss_session):
        # Force fresh start for completed scenes and all boss sessions (no resume for bosses)
        active_session.is_active = False
        session.add(active_session)
        session.commit()
        active_session = None

    if active_session and not is_boss_session:
        new_session = active_session
    else:
        dark_ritual = 1.0
        # Calculate effective zone for scaling (Chapter X Boss ≈ Level X*10)
        eff_zone = 1
        if is_boss_session:
            b_num = scene.chapter.book.book_number
            c_num = scene.chapter.chapter_number
            eff_zone = (b_num - 1) * 100 + c_num * 3
            if scene.scene_type == 'book_boss':
                eff_zone += 2 # slight boost for book bosses

        if not is_boss_session:
            chapter_session = session.exec(
                select(PlayerStorySession)
                .where(PlayerStorySession.player_id == player.id)
                .where(PlayerStorySession.chapter_id == chapter_id)
                .where(PlayerStorySession.is_active == True)
            ).first()
            if chapter_session:
                dark_ritual = chapter_session.dark_ritual_multiplier

        new_session = PlayerStorySession(
            id=uuid.uuid4(),
            player_id=player.id,
            scene_id=body.scene_id,
            chapter_id=chapter_id,
            current_zone=eff_zone,
            current_wave=1,
            session_gold=0,
            dark_ritual_multiplier=dark_ritual,
            narrative_progress_pct=100 if is_boss_session else 0,  # no narrative in boss mode
            required_waves_finished=False,
            audio_finished=False,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(new_session)

        if not is_boss_session:
            # Normal session: Initialize Click Damage and Auto-DPS at Level 1
            for u_type in ["click_dmg", "auto_dps"]:
                upg = SessionUpgrade(
                    id=uuid.uuid4(),
                    session_id=new_session.id,
                    upgrade_type=u_type,
                    target_id=None,
                    level=1,
                    total_cost_paid=0.0,
                    current_multiplier=1.0,
                )
                session.add(upg)

        session.commit()
        session.refresh(new_session)

    auto_dps = _calc_auto_dps(session, char.id)
    strength = char.strength or (char.character_class.base_strength if char.character_class else DEFAULT_CLICK_STRENGTH)

    all_upgrades = session.exec(
        select(SessionUpgrade).where(SessionUpgrade.session_id == new_session.id)
    ).all()
    click_mult, auto_mult, click_lvl, auto_lvl = _calc_multipliers(session, all_upgrades)

    return {
        "session_id": new_session.id,
        "scene_id": new_session.scene_id,
        "chapter_id": new_session.chapter_id,
        "current_zone": new_session.current_zone,
        "current_wave": new_session.current_wave,
        "session_gold": new_session.session_gold,
        "dark_ritual_multiplier": new_session.dark_ritual_multiplier,
        "narrative_progress_pct": new_session.narrative_progress_pct,
        "required_waves_finished": new_session.required_waves_finished,
        "previously_completed": previously_completed,
        "character_strength": strength,
        "auto_dps_per_second": round(auto_dps, 4),
        "click_dmg_multiplier": round(click_mult, 4),
        "auto_dps_multiplier": round(auto_mult, 4),
        "click_upgrade_level": click_lvl,
        "auto_upgrade_level": auto_lvl,
        # Boss session fields
        "is_boss_session": is_boss_session,
        "boss_type": scene.scene_type if is_boss_session else None,
        "boss_config": boss_config if is_boss_session else None,
        "is_replay": is_replay,
    }


@router.get("/session/{session_id}")
async def get_session_state(
    session_id: uuid.UUID,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    upgrades = session.exec(
        select(SessionUpgrade).where(SessionUpgrade.session_id == session_id)
    ).all()

    char = _get_character(session, player.id)
    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.character_id == char.id)
    ).first()
    
    scene = session.get(Scene, story_session.scene_id)
    previously_completed = False
    if progress and scene:
        if scene.chapter.chapter_number < progress.chapter_number:
            previously_completed = True
        elif scene.chapter.chapter_number == progress.chapter_number and scene.scene_number < progress.scene_number:
            previously_completed = True

    click_mult, auto_mult, click_lvl, auto_lvl = _calc_multipliers(session, upgrades)

    # --- NEW: Gold to Essence Conversion ---
    base_rate = _get_config_float(session, "gold_to_essence_base_rate", 1000.0)
    growth_factor = _get_config_float(session, "gold_to_essence_growth_factor", 1.07)
    effective_rate = base_rate * math.pow(growth_factor, max(0, story_session.current_zone - 1))
    converted_essence = story_session.session_gold / max(effective_rate, 1.0)
    
    # Calculate legacy essence_earned
    first_clear_bonus = 2.0 if not previously_completed else 1.0
    bosses_defeated = story_session.current_zone // 10
    essence_earned = (story_session.current_zone * 10 + bosses_defeated * 50) * first_clear_bonus

    return {
        **story_session.model_dump(),
        "upgrades": [u.model_dump() for u in upgrades],
        "previously_completed": previously_completed,
        "click_dmg_multiplier": round(click_mult, 4),
        "auto_dps_multiplier": round(auto_mult, 4),
        "click_upgrade_level": click_lvl,
        "auto_upgrade_level": auto_lvl,
        "essence_earned": round(essence_earned, 2),
        "converted_essence": round(converted_essence, 2),
    }


@router.post("/session/{session_id}/tick")
async def combat_tick(
    session_id: uuid.UUID,
    body: TickRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    cps_cap = _get_config_float(session, "click_rate_cap", DEFAULT_CPS_CAP)
    elapsed_s = max(body.elapsed_ms / 1000.0, 0.001)

    reported_cps = body.clicks / elapsed_s
    cps_valid = reported_cps <= cps_cap
    validated_clicks = body.clicks
    if not cps_valid:
        validated_clicks = int(cps_cap * elapsed_s)

    z_gold = _calc_zone_gold(body.zone)
    expected_gold = z_gold * body.waves_completed_delta

    gold_corrected = False
    awarded_gold = body.gold_delta
    if body.waves_completed_delta > 0 and body.gold_delta > expected_gold * 20:
        awarded_gold = expected_gold * 5
        gold_corrected = True

    story_session.session_gold += awarded_gold
    story_session.current_zone = body.zone
    story_session.current_wave = body.wave
    
    # Check if this tick included a required zone completion
    if body.waves_completed_delta > 0:
        story_session.required_waves_finished = True

    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    return {
        "session_gold": round(story_session.session_gold, 2),
        "current_zone": story_session.current_zone,
        "current_wave": story_session.current_wave,
        "cps_valid": cps_valid,
        "gold_corrected": gold_corrected,
        "gold_awarded": round(awarded_gold, 2),
    }


@router.post("/session/{session_id}/upgrade")
async def purchase_upgrade(
    session_id: uuid.UUID,
    body: UpgradeRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    UPGRADE_BASE_COSTS = {
        "click_dmg": _get_config_float(session, "base_click_upgrade_cost", 10.0),
        "auto_dps": _get_config_float(session, "base_auto_dps_upgrade_cost", 25.0),
        "skill_unlock": _get_config_float(session, "base_skill_unlock_cost", 50.0),
        "skill_level": _get_config_float(session, "base_skill_level_upgrade_cost", 100.0),
    }
    COST_SCALING = _get_config_float(session, "upgrade_cost_scaling", 1.07)

    if body.upgrade_type not in UPGRADE_BASE_COSTS:
        raise HTTPException(status_code=400, detail=f"Unknown upgrade_type: {body.upgrade_type}")

    upgrade = session.exec(
        select(SessionUpgrade)
        .where(SessionUpgrade.session_id == session_id)
        .where(SessionUpgrade.upgrade_type == body.upgrade_type)
        .where(SessionUpgrade.target_id == body.target_id)
    ).first()

    current_level = upgrade.level if upgrade else 0
    base_cost = UPGRADE_BASE_COSTS[body.upgrade_type]

    total_cost = 0.0
    for i in range(body.quantity):
        total_cost += base_cost * math.pow(COST_SCALING, current_level + i)

    if story_session.session_gold < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient session gold")

    story_session.session_gold -= total_cost
    story_session.updated_at = datetime.now(timezone.utc)

    if upgrade is None:
        upgrade = SessionUpgrade(
            id=uuid.uuid4(),
            session_id=session_id,
            upgrade_type=body.upgrade_type,
            target_id=body.target_id,
            level=body.quantity,
            total_cost_paid=total_cost,
            current_multiplier=1.0,
        )
    else:
        upgrade.level += body.quantity
        upgrade.total_cost_paid += total_cost

    session.add(upgrade)
    session.add(story_session)
    session.commit()

    all_upgrades = session.exec(
        select(SessionUpgrade).where(SessionUpgrade.session_id == session_id)
    ).all()
    click_mult, auto_mult, click_lvl, auto_lvl = _calc_multipliers(session, all_upgrades)

    return {
        "upgrade_type": body.upgrade_type,
        "target_id": body.target_id,
        "click_upgrade_level": click_lvl,
        "auto_upgrade_level": auto_lvl,
        "click_dmg_multiplier": round(click_mult, 4),
        "auto_dps_multiplier": round(auto_mult, 4),
        "cost_paid": round(total_cost, 2),
        "session_gold": round(story_session.session_gold, 2),
    }


@router.post("/session/{session_id}/skill")
async def activate_skill(
    session_id: uuid.UUID,
    body: SkillActivateRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    skill = session.get(Skill, body.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    unlock = session.exec(
        select(SessionUpgrade)
        .where(SessionUpgrade.session_id == session_id)
        .where(SessionUpgrade.upgrade_type == "skill_unlock")
        .where(SessionUpgrade.target_id == body.skill_id)
    ).first()

    if not unlock:
        raise HTTPException(status_code=403, detail="Skill not purchased for this session")

    benefits = skill.benefits_json or {}
    if "dark_ritual_multiplier" in benefits:
        try:
            dr_mult = float(benefits["dark_ritual_multiplier"])
            story_session.dark_ritual_multiplier *= dr_mult
            story_session.updated_at = datetime.now(timezone.utc)
            session.add(story_session)
            session.commit()
        except (TypeError, ValueError):
            pass

    return {
        "skill_id": skill.id,
        "skill_name": skill.name,
        "benefits": skill.benefits_json,
        "dark_ritual_multiplier": story_session.dark_ritual_multiplier,
        "activated": True,
    }


@router.post("/session/{session_id}/narrative")
async def update_narrative_progress(
    session_id: uuid.UUID,
    body: NarrativeUpdateRequest,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    pct = max(0.0, min(100.0, body.progress_pct))
    story_session.narrative_progress_pct = pct
    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    return {
        "narrative_progress_pct": pct,
        "narrative_complete": pct >= 100.0,
    }


@router.post("/session/{session_id}/complete")
async def complete_session(
    session_id: uuid.UUID,
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    player = token.get("player")
    story_session = session.get(PlayerStorySession, session_id)
    if not story_session or story_session.player_id != player.id:
        raise HTTPException(status_code=404, detail="Session not found")

    char = _get_character(session, player.id)
    bosses_defeated = story_session.current_zone // 1

    progress = session.exec(
        select(PlayerProgress).where(PlayerProgress.character_id == char.id)
    ).first()

    scene = session.get(Scene, story_session.scene_id)
    is_boss_session = scene and scene.scene_type in ('chapter_boss', 'book_boss')

    # ── Boss session completion path ─────────────────────────────────────────
    if is_boss_session:
        # Only insert boss_completions on first clear
        existing = session.exec(
            select(BossCompletion)
            .where(BossCompletion.player_id == player.id)
            .where(BossCompletion.scene_id == story_session.scene_id)
        ).first()
        first_clear = existing is None

        if first_clear:
            completion = BossCompletion(
                player_id=player.id,
                scene_id=story_session.scene_id,
                boss_type=scene.scene_type,
                chapter_id=story_session.chapter_id,
                book_id=scene.chapter.book_id if scene else None,
                session_id=session_id,
                completed_at=datetime.now(timezone.utc),
            )
            session.add(completion)

        # Fetch transition lore text from chapter or book
        transition_lore_text = None
        if scene:
            if scene.scene_type == 'book_boss':
                transition_lore_text = scene.chapter.book.transition_lore_text
            else:
                transition_lore_text = scene.chapter.transition_lore_text

        story_session.is_active = False
        story_session.updated_at = datetime.now(timezone.utc)
        session.add(story_session)
        session.commit()

        return {
            "session_id": session_id,
            "is_boss_session": True,
            "boss_type": scene.scene_type,
            "first_clear": first_clear,
            "transition_lore_text": transition_lore_text,
            "unlocks": [],
            "session_gold": round(story_session.session_gold, 2),
        }

    # ── Normal session completion path ───────────────────────────────────────
    first_clear_mult = _get_config_float(session, "first_clear_multiplier", 1.5)

    first_clear_bonus = 1.0
    if scene and progress:
        # Check if they are currently on THIS level or a LATER one
        if scene.chapter.chapter_number > progress.chapter_number:
             first_clear_bonus = first_clear_mult
        elif scene.chapter.chapter_number == progress.chapter_number and scene.scene_number >= progress.scene_number:
             first_clear_bonus = first_clear_mult

    # Calculate required waves (formerly zones) based on narrative total time
    wpm = _get_config_int(session, "default_player_wpm", 200)
    if player:
        setts = session.exec(select(PlayerSettings).where(PlayerSettings.player_id == player.id)).first()
        if setts and setts.narration_wpm:
            wpm = setts.narration_wpm

    # Force 1 wave for Chapter 1 Scene 1 of Book 1.
    if scene and scene.scene_number == 1 and scene.chapter.chapter_number == 1 and scene.chapter.book.book_number == 1:
        total_est_s = 10.0
    else:
        beats = session.exec(select(StoryBeat).where(StoryBeat.scene_id == story_session.scene_id)).all()
        total_words = sum(len((b.raw_text or b.summary or "").split()) for b in beats)
        total_est_s = (total_words / max(wpm, 1)) * 60.0

    wave_dur = _get_config_float(session, "wave_duration_seconds", 30.0)
    required_waves = max(1, math.ceil(total_est_s / (wave_dur * 1.1)))

    # --- NEW: Gold to Essence Conversion ---
    # Formula: Essence = session_gold / (base_rate * growth_factor^(zone - 1))
    base_rate = _get_config_float(session, "gold_to_essence_base_rate", 1000.0)
    growth_factor = _get_config_float(session, "gold_to_essence_growth_factor", 1.07)
    
    # Calculate effective conversion rate for the current zone
    # If Zone 1, rate is just base_rate.
    effective_rate = base_rate * math.pow(growth_factor, max(0, story_session.current_zone - 1))
    converted_essence = story_session.session_gold / max(effective_rate, 1.0)
    
    # Existing essence_earned (legacy meta-progression logic)
    essence_earned = (story_session.current_zone * 10 + bosses_defeated * 50) * first_clear_bonus

    # Update PlayerMetaProgression (Elysium Essence)
    meta = session.get(PlayerMetaProgression, player.id)
    if not meta:
        meta = PlayerMetaProgression(
            player_id=player.id,
            elysium_essence=0, total_essence_earned=0, spent_essence=0,
        )
    meta.elysium_essence += essence_earned
    meta.total_essence_earned += essence_earned
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    # Update PlayerEssence (Character-specific for Idle Training)
    char_essence = session.exec(
        select(PlayerEssence).where(PlayerEssence.character_id == char.id)
    ).first()
    if not char_essence:
        char_essence = PlayerEssence(
            player_id=player.id,
            character_id=char.id,
            current_balance=0.0,
            passive_rate=0.0,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    char_essence.current_balance += converted_essence
    char_essence.updated_at = datetime.now(timezone.utc)
    session.add(char_essence)

    # Narrative AND minimum waves must be cleared
    both_complete = (story_session.current_zone >= required_waves and
                     story_session.narrative_progress_pct >= 100.0)

    if both_complete and progress and scene:
        # Check if this was the current 'active' progress level
        if (progress.book_number == scene.chapter.book.book_number and
            progress.chapter_number == scene.chapter.chapter_number and
            progress.scene_number == scene.scene_number):

            # 1. Try finding next scene in current chapter (skip boss scenes)
            next_scene = session.exec(
                select(Scene)
                .where(Scene.chapter_id == scene.chapter_id)
                .where(Scene.scene_number > scene.scene_number)
                .where(Scene.scene_type == 'normal')
                .order_by(Scene.scene_number.asc())
            ).first()

            if next_scene:
                progress.scene_number = next_scene.scene_number
            else:
                # 2. Try finding next chapter in current book
                next_chapter = session.exec(
                    select(Chapter)
                    .where(Chapter.book_id == scene.chapter.book_id)
                    .where(Chapter.chapter_number > scene.chapter.chapter_number)
                    .order_by(Chapter.chapter_number.asc())
                ).first()

                if next_chapter:
                    progress.chapter_number = next_chapter.chapter_number
                    progress.scene_number = 1 # Start at first scene of new chapter
                else:
                    # 3. Try finding next book
                    next_book = session.exec(
                        select(Book)
                        .where(Book.book_number > scene.chapter.book.book_number)
                        .order_by(Book.book_number.asc())
                    ).first()

                    if next_book:
                        progress.book_number = next_book.book_number
                        progress.chapter_number = 1
                        progress.scene_number = 1
                    else:
                        pass  # End of all content

            progress.beat_number = 1
            progress.updated_at = datetime.now(timezone.utc)
            session.add(progress)

    story_session.is_active = False
    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    return {
        "session_id": session_id,
        "is_boss_session": False,
        "essence_earned": round(essence_earned, 2),
        "converted_essence": round(converted_essence, 2),
        "first_clear_bonus": first_clear_bonus,
        "bosses_defeated": bosses_defeated,
        "highest_zone": story_session.current_zone,
        "session_gold": round(story_session.session_gold, 2),
        "progress_advanced": both_complete,
        "total_essence": round(meta.elysium_essence, 2),
        "total_character_essence": round(char_essence.current_balance, 2),
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
