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
    PlayerCharacter, PlayerProgress, PlayerEssence, CharacterClass,
    Scene, Chapter, Book, StoryBeat, Entity, EntityGameplayData,
    Skill, PlayerSettings, ActivityEvent,
)
from models.story_mode import (
    GameConfig, PlayerStorySession, SessionUpgrade,
    PlayerMetaProgression, DevContentAudit,
    CharacterSkillLevel, EntitySceneAppearance, BossCompletion,
)
from services.character_progression import (
    award_scene_completion_char_xp, upsert_scene_record,
    recalculate_character_stats, get_skill_tree,
)
from services.item_generator import check_run_achievements
from services.chat import manager as chat_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/game/story", tags=["story_mode"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEFAULT_HP_SCALING = 1.55
DEFAULT_CPS_CAP = 20
DEFAULT_WPM = 200


async def _system_broadcast(event_type: str, player_name: str, detail: str) -> None:
    """Fire a rate-limited system broadcast to all connected chat clients."""
    if not chat_manager.broadcast_rate_limiter.is_allowed():
        return
    await chat_manager.broadcast({
        "type": "system_broadcast",
        "event_type": event_type,
        "player_name": player_name,
        "detail": detail,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_system": True,
    })
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


def _compute_rank(kills: int, session: Session) -> Optional[str]:
    """Compute codex rank from kill count using game_configs thresholds."""
    ss = _get_config_int(session, "codex_rank_ss", 500)
    a = _get_config_int(session, "codex_rank_a", 100)
    c = _get_config_int(session, "codex_rank_c", 25)
    e = _get_config_int(session, "codex_rank_e", 1)
    if kills >= ss:
        return "SS"
    if kills >= a:
        return "A"
    if kills >= c:
        return "C"
    if kills >= e:
        return "E"
    return None


def _log_anomaly(session: Session, player_id: int, session_id,
                 anomaly_type: str, reported_value, corrected_value,
                 zone: int = 0, elapsed_ms: int = 0) -> None:
    """Log an anti-cheat anomaly to activity_events."""
    event = ActivityEvent(
        player_id=player_id,
        event_type="anti_cheat_anomaly",
        event_data={
            "anomaly_type": anomaly_type,
            "session_id": str(session_id),
            "reported_value": reported_value,
            "corrected_value": corrected_value,
            "zone": zone,
            "elapsed_ms": elapsed_ms,
        },
        created_at=datetime.now(timezone.utc),
    )
    session.add(event)


def _validate_waves(session: Session, story_session, character_id: int,
                    waves_delta: int, elapsed_ms: int, zone: int,
                    hp_scaling: float) -> int:
    """
    Validate waves_completed_delta against theoretical DPS ceiling.
    Returns the clamped waves count.
    """
    if waves_delta <= 0:
        return waves_delta

    tolerance = _get_config_float(session, "wave_validation_tolerance", 2.0)
    elapsed_s = max(elapsed_ms / 1000.0, 0.001)

    # Calculate theoretical max DPS
    auto_dps = _calc_auto_dps(session, character_id)
    cps_cap = _get_config_float(session, "click_rate_cap", DEFAULT_CPS_CAP)
    click_strength = _get_config_float(session, "default_click_strength", DEFAULT_CLICK_STRENGTH)
    max_click_dps = click_strength * cps_cap * 10  # generous estimate with upgrades
    theoretical_max_dps = max_click_dps + auto_dps * 5  # generous multiplier

    if theoretical_max_dps <= 0:
        return waves_delta

    # Calculate max plausible waves in elapsed time
    max_waves = 0
    time_remaining = elapsed_s
    for z in range(max(1, zone - waves_delta), zone + 1):
        zone_hp = _calc_zone_hp(z, hp_scaling)
        if zone_hp <= 0:
            max_waves += 1
            continue
        time_per_wave = zone_hp / theoretical_max_dps
        if time_remaining >= time_per_wave:
            time_remaining -= time_per_wave
            max_waves += 1
        else:
            break

    max_waves = max(1, int(max_waves * tolerance))

    if waves_delta > max_waves:
        return max_waves
    return waves_delta


def _check_rare_spawn(
    session: Session,
    waves_delta: int,
    chapter_id: Optional[int],
) -> Optional[dict]:
    """Roll for a rare spawn across `waves_delta` waves.

    Rare pool = entities with NO entity_scene_appearances record.
    Returns entity data dict if triggered, else None.
    """
    if waves_delta <= 0:
        return None

    base_chance = _get_config_float(session, "rare_spawn_base_chance", 0.005)
    if base_chance <= 0:
        return None

    # Resolve book/chapter numbers for modifier lookup
    book_number = None
    chapter_number = None
    if chapter_id:
        chapter = session.get(Chapter, chapter_id)
        if chapter:
            chapter_number = chapter.chapter_number
            book = session.get(Book, chapter.book_id)
            if book:
                book_number = book.book_number

    book_mod = 1.0
    chapter_mod = 1.0
    if book_number is not None:
        book_mod = _get_config_float(
            session, f"rare_spawn_book_{book_number}_modifier", 1.0
        )
    if chapter_number is not None:
        chapter_mod = _get_config_float(
            session, f"rare_spawn_chapter_{chapter_number}_modifier", 1.0
        )

    effective_chance = base_chance * book_mod * chapter_mod

    # Roll once per wave
    triggered = False
    for _ in range(waves_delta):
        if random.random() < effective_chance:
            triggered = True
            break

    if not triggered:
        return None

    # Build rare pool: entities with NO entity_scene_appearances record
    from sqlalchemy import exists as sa_exists

    rare_pool_stmt = (
        select(Entity)
        .where(
            ~sa_exists(
                select(EntitySceneAppearance.id)
                .where(EntitySceneAppearance.entity_id == Entity.id)
                .correlate(Entity)
            )
        )
        .where(Entity.first_appearance_scene_id.is_(None))  # type: ignore[union-attr]
    )
    rare_entities = session.exec(rare_pool_stmt).all()

    if not rare_entities:
        return None

    chosen = random.choice(rare_entities)

    # Get gameplay data if available
    gp = session.exec(
        select(EntityGameplayData)
        .where(EntityGameplayData.entity_id == chosen.id)
    ).first()

    return {
        "entity_id": chosen.id,
        "canonical_name": chosen.canonical_name,
        "entity_type": chosen.entity_type,
        "entity_family": chosen.entity_family,
        "base_hp": gp.base_hp if gp else 50,
        "base_gold": gp.base_gold if gp else 10,
        "sprite_key": gp.sprite_key if gp else None,
    }


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


def _get_idle_training_bonuses(session: Session, character_id: int) -> dict:
    """Calculate permanent bonuses from Idle Training levels."""
    rows = session.exec(
        select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character_id)
    ).all()
    
    levels = {row.skill_id: row.level for row in rows}
    
    # We need the skill IDs for Attack, Magic, Lore, Precision
    all_skills = session.exec(select(Skill)).all()
    skill_map = {s.name: s.id for s in all_skills}
    
    attack_lvl = levels.get(skill_map.get('Attack'), 1)
    magic_lvl = levels.get(skill_map.get('Magic'), 1)
    lore_lvl = levels.get(skill_map.get('Lore'), 1)
    precision_lvl = levels.get(skill_map.get('Precision'), 1)
    
    return {
        'attack_lvl': attack_lvl,
        'magic_lvl': magic_lvl,
        'lore_lvl': lore_lvl,
        'precision_lvl': precision_lvl,
        'click_damage_floor': attack_lvl // 2,
        'auto_dps_multiplier': 1.0 + (magic_lvl * 0.01),
        'gate_reduction_pct': min(lore_lvl * 0.003, 0.25),
        'essence_multiplier': 1.0 + (lore_lvl * 0.008),
        'crit_chance_bonus': precision_lvl * 0.001,
        'crit_multiplier_total': 2.0 + (precision_lvl * 0.01),
    }


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


class EntityEncounterTick(BaseModel):
    entity_id: int
    encounters: int = 0
    kills: int = 0


class ItemDiscoveryTick(BaseModel):
    type: str        # 'item_prefix', 'item_suffix', 'item_quality', 'lore_tag', 'skill', 'effect'
    reference_id: int


class TickRequest(BaseModel):
    clicks: int
    elapsed_ms: int
    zone: int
    wave: int
    gold_delta: float          # Client-reported gold from kills this tick
    waves_completed_delta: int  # Waves completed since last tick
    # Discovery fields (2.6.2)
    entity_encounters: Optional[List[EntityEncounterTick]] = None
    item_discoveries: Optional[List[ItemDiscoveryTick]] = None


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

    # 2.4: min_level hard gate
    chapter = session.get(Chapter, scene.chapter_id)
    if chapter and chapter.min_level and char.level < chapter.min_level:
        raise HTTPException(
            status_code=403,
            detail=f"Character level {char.level} is below the minimum level {chapter.min_level} required for this chapter."
        )

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
    char_class = session.get(CharacterClass, char.class_id)
    strength = char.strength or (char_class.base_strength if char_class else DEFAULT_CLICK_STRENGTH)
    
    idle_bonuses = _get_idle_training_bonuses(session, char.id)

    all_upgrades = session.exec(
        select(SessionUpgrade).where(SessionUpgrade.session_id == new_session.id)
    ).all()
    click_mult, auto_mult, click_lvl, auto_lvl = _calc_multipliers(session, all_upgrades)

    # --- NEW: Fetch boss name for display ---
    boss_name = "Guardian"
    if is_boss_session:
        boss_entity = session.exec(
            select(Entity)
            .join(EntitySceneAppearance, Entity.id == EntitySceneAppearance.entity_id)
            .where(EntitySceneAppearance.scene_id == body.scene_id)
            .where(col(EntitySceneAppearance.role).in_(["boss", "big-boss", "big_boss"]))
        ).first()
        if boss_entity:
            boss_name = boss_entity.canonical_name

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
        # Idle Training Bonuses (Loop C)
        "idle_bonuses": idle_bonuses,
        # Boss session fields
        "is_boss_session": is_boss_session,
        "boss_type": scene.scene_type if is_boss_session else None,
        "boss_name": boss_name,
        "boss_config": boss_config if is_boss_session else None,
        "is_replay": is_replay,
        # 2.4: Class visual identity
        "visual_config": char_class.visual_config if char_class else None,
        # 2.4.1: Skill tree state for UpgradeMenu / Hotbar
        "skill_tree": get_skill_tree(session, char.id),
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

    idle_bonuses = _get_idle_training_bonuses(session, char.id)
    skill_tree = get_skill_tree(session, char.id)

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
        "idle_bonuses": idle_bonuses,
        "skill_tree": skill_tree,
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

    char = _get_character(session, player.id)

    cps_cap = _get_config_float(session, "click_rate_cap", DEFAULT_CPS_CAP)
    elapsed_s = max(body.elapsed_ms / 1000.0, 0.001)

    reported_cps = body.clicks / elapsed_s
    cps_valid = reported_cps <= cps_cap
    validated_clicks = body.clicks
    if not cps_valid:
        validated_clicks = int(cps_cap * elapsed_s)
        _log_anomaly(session, player.id, session_id, "cps_violation",
                     round(reported_cps, 2), round(cps_cap, 2),
                     body.zone, body.elapsed_ms)

    # --- 2.6.1: Wave completion validation ---
    hp_scaling = _get_config_float(session, "hp_scaling", DEFAULT_HP_SCALING)
    validated_waves = _validate_waves(
        session, story_session, char.id,
        body.waves_completed_delta, body.elapsed_ms, body.zone, hp_scaling,
    )
    waves_clamped = validated_waves < body.waves_completed_delta
    if waves_clamped:
        _log_anomaly(session, player.id, session_id, "wave_clamp",
                     body.waves_completed_delta, validated_waves,
                     body.zone, body.elapsed_ms)

    # --- 2.6.2: Rare spawn check ---
    rare_spawn = _check_rare_spawn(session, validated_waves, story_session.chapter_id)

    z_gold = _calc_zone_gold(body.zone)
    expected_gold = z_gold * validated_waves  # use clamped waves

    gold_corrected = False
    awarded_gold = body.gold_delta
    if validated_waves > 0 and body.gold_delta > expected_gold * 20:
        awarded_gold = expected_gold * 5
        gold_corrected = True
        _log_anomaly(session, player.id, session_id, "gold_correction",
                     round(body.gold_delta, 2), round(awarded_gold, 2),
                     body.zone, body.elapsed_ms)

    story_session.session_gold += awarded_gold
    story_session.current_zone = body.zone
    story_session.current_wave = body.wave

    # Check if this tick included a required zone completion
    if validated_waves > 0:
        story_session.required_waves_finished = True

    # --- 2.6.2: Process discovery data ---
    new_ranks = []
    new_discoveries = 0
    if body.entity_encounters:
        try:
            from models.discovery import PlayerEntityDiscovery
            for enc in body.entity_encounters:
                existing = session.exec(
                    select(PlayerEntityDiscovery)
                    .where(PlayerEntityDiscovery.player_id == player.id)
                    .where(PlayerEntityDiscovery.entity_id == enc.entity_id)
                ).first()
                if existing:
                    old_rank = existing.rank
                    existing.encounters += enc.encounters
                    existing.kills += enc.kills
                    new_rank = _compute_rank(existing.kills, session)
                    if new_rank != old_rank:
                        existing.rank = new_rank
                        new_ranks.append({"entity_id": enc.entity_id, "old_rank": old_rank, "new_rank": new_rank})
                    session.add(existing)
                else:
                    new_rank = _compute_rank(enc.kills, session)
                    discovery = PlayerEntityDiscovery(
                        player_id=player.id,
                        entity_id=enc.entity_id,
                        encounters=enc.encounters,
                        kills=enc.kills,
                        rank=new_rank,
                        first_seen_at=datetime.now(timezone.utc),
                        is_new=True,
                    )
                    session.add(discovery)
                    new_discoveries += 1
        except ImportError:
            logger.warning("Discovery models not available yet")

    if body.item_discoveries:
        try:
            from models.discovery import PlayerDiscoveryLog
            for item in body.item_discoveries:
                existing = session.exec(
                    select(PlayerDiscoveryLog)
                    .where(PlayerDiscoveryLog.player_id == player.id)
                    .where(PlayerDiscoveryLog.discovery_type == item.type)
                    .where(PlayerDiscoveryLog.reference_id == item.reference_id)
                ).first()
                if not existing:
                    log = PlayerDiscoveryLog(
                        player_id=player.id,
                        discovery_type=item.type,
                        reference_id=item.reference_id,
                        discovered_at=datetime.now(timezone.utc),
                        is_new=True,
                    )
                    session.add(log)
                    new_discoveries += 1
        except ImportError:
            logger.warning("Discovery models not available yet")

    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    result = {
        "session_gold": round(story_session.session_gold, 2),
        "current_zone": story_session.current_zone,
        "current_wave": story_session.current_wave,
        "cps_valid": cps_valid,
        "gold_corrected": gold_corrected,
        "gold_awarded": round(awarded_gold, 2),
    }
    if new_ranks:
        result["new_ranks"] = new_ranks
    if new_discoveries > 0:
        result["new_discoveries"] = new_discoveries
    if rare_spawn:
        result["rare_spawn"] = rare_spawn
    return result


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

    # Enforce Magic level gates for hotbar skills
    if body.upgrade_type == "skill_unlock" and body.target_id:
        skill = session.get(Skill, body.target_id)
        if skill and skill.category == "hotbar":
            # Map of Magic level gates (hardcoded as per 2.3 spec §7)
            # This could be moved to game_configs later.
            magic_gates = {
                "Clickstorm": 5, "Powersurge": 10, "Lucky Strikes": 18,
                "Metal Detector": 25, "Golden Clicks": 35, "Super Clicks": 45,
                "Energize": 58, "Reload": 72, "The Dark Ritual": 87
            }
            required_lvl = magic_gates.get(skill.name)
            if required_lvl:
                char = _get_character(session, player.id)
                magic_skill = session.exec(select(Skill).where(Skill.name == "Magic")).first()
                if magic_skill:
                    char_skill = session.exec(
                        select(CharacterSkillLevel)
                        .where(CharacterSkillLevel.character_id == char.id)
                        .where(CharacterSkillLevel.skill_id == magic_skill.id)
                    ).first()
                    current_magic_lvl = char_skill.level if char_skill else 1
                    if current_magic_lvl < required_lvl:
                        raise HTTPException(
                            status_code=403, 
                            detail=f"Magic level {required_lvl} required to unlock {skill.name}"
                        )

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

    # --- 2.6.1: Session integrity check ---
    session_gold_tolerance = _get_config_float(session, "session_gold_tolerance", 3.0)
    hp_scaling = _get_config_float(session, "hp_scaling", DEFAULT_HP_SCALING)
    if story_session.created_at:
        created = story_session.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        session_duration_s = (datetime.now(timezone.utc) - created).total_seconds()
        session_duration_s = max(session_duration_s, 1.0)
        z_gold = _calc_zone_gold(story_session.current_zone)
        z_hp = _calc_zone_hp(story_session.current_zone, hp_scaling)
        auto_dps = _calc_auto_dps(session, char.id)
        cps_cap = _get_config_float(session, "click_rate_cap", DEFAULT_CPS_CAP)
        max_dps = auto_dps * 5 + cps_cap * DEFAULT_CLICK_STRENGTH * 10
        max_waves_per_s = max_dps / max(z_hp, 1.0)
        max_gold_per_s = z_gold * max_waves_per_s
        plausible_max_gold = max_gold_per_s * session_duration_s * session_gold_tolerance
        if story_session.session_gold > plausible_max_gold and plausible_max_gold > 0:
            _log_anomaly(session, player.id, session_id, "session_integrity",
                         round(story_session.session_gold, 2), round(plausible_max_gold, 2),
                         story_session.current_zone, int(session_duration_s * 1000))
            story_session.session_gold = plausible_max_gold

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

            # --- NEW: Advance progress after boss defeat ---
            if progress and scene:
                # 1. Try finding next chapter in current book
                next_chapter = session.exec(
                    select(Chapter)
                    .where(Chapter.book_id == scene.chapter.book_id)
                    .where(Chapter.chapter_number > scene.chapter.chapter_number)
                    .order_by(Chapter.chapter_number.asc())
                ).first()

                if next_chapter:
                    progress.chapter_number = next_chapter.chapter_number
                    progress.scene_number = 1
                else:
                    # 2. Try finding next book
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
                        pass # end of all content
                
                progress.beat_number = 1
                progress.updated_at = datetime.now(timezone.utc)
                session.add(progress)

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

        # 2.6.4: System broadcast for first boss defeat
        if first_clear:
            char_name = char.character_name or "A brave Vessel"
            boss_label = "Chapter Boss" if scene.scene_type == "chapter_boss" else "Book Boss"
            try:
                await _system_broadcast(
                    "boss_defeat", char_name,
                    f"{char_name} defeated the {boss_label}!"
                )
            except Exception:
                logger.debug("Broadcast failed (non-fatal)")

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

    # --- NEW: Apply Lore Essence Multiplier (Loop C) ---
    idle_bonuses = _get_idle_training_bonuses(session, char.id)
    essence_mult = idle_bonuses.get('essence_multiplier', 1.0)
    essence_earned *= essence_mult
    converted_essence *= essence_mult

    # Update PlayerMetaProgression (Elysium Essence - Global pool)
    meta = session.get(PlayerMetaProgression, player.id)
    if not meta:
        meta = PlayerMetaProgression(
            player_id=player.id,
            elysium_essence=0, total_essence_earned=0, spent_essence=0,
        )
    
    total_gained = essence_earned + converted_essence
    meta.elysium_essence += total_gained
    meta.total_essence_earned += total_gained
    meta.updated_at = datetime.now(timezone.utc)
    session.add(meta)

    # Update PlayerEssence (Character-specific for Idle Training stability)
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
    char_essence.current_balance += total_gained
    char_essence.updated_at = datetime.now(timezone.utc)
    session.add(char_essence)

    # Narrative AND minimum waves must be cleared
    both_complete = (story_session.current_zone >= required_waves and
                     story_session.narrative_progress_pct >= 100.0)
    
    # --- NEW: Check for skill unlocks (Loop C) ---
    unlocked_skills = []
    if both_complete and scene:
        newly_unlocked = session.exec(
            select(Skill).where(Skill.unlock_scene_id == scene.id)
        ).all()
        unlocked_skills = [s.name for s in newly_unlocked]

    if both_complete and progress and scene:
        # Check if this was the current 'active' progress level
        if (progress.book_number == scene.chapter.book.book_number and
            progress.chapter_number == scene.chapter.chapter_number and
            progress.scene_number == scene.scene_number):

            # 1. Try finding next scene in current chapter (including boss scenes)
            next_scene = session.exec(
                select(Scene)
                .where(Scene.chapter_id == scene.chapter_id)
                .where(Scene.scene_number > scene.scene_number)
                .order_by(Scene.scene_number.asc())
            ).first()

            if next_scene:
                progress.scene_number = next_scene.scene_number
            else:
                # 2. Try finding next chapter in current book
                # (Only happens if NO more scenes, including bosses, exist in the current chapter)
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

    # 2.4: Track max_session_level for skill upgrades
    skill_upgrades = session.exec(
        select(SessionUpgrade)
        .where(SessionUpgrade.session_id == session_id)
        .where(SessionUpgrade.upgrade_type == "skill_level")
    ).all()
    for su in skill_upgrades:
        if su.target_id:
            csl = session.exec(
                select(CharacterSkillLevel)
                .where(CharacterSkillLevel.character_id == char.id)
                .where(CharacterSkillLevel.skill_id == su.target_id)
            ).first()
            if csl and su.level > csl.max_session_level:
                csl.max_session_level = su.level
                session.add(csl)

    # 2.4: Award Character XP for scene completion
    char_xp_result = award_scene_completion_char_xp(session, char)

    # 2.4: Upsert player_scene_records
    if story_session.scene_id:
        upsert_scene_record(
            session,
            player_id=player.id,
            scene_id=story_session.scene_id,
            wave=story_session.current_zone,
            enemies_killed=0,
        )

    # 2.4.2: Run achievement check → item drop generation
    session_stats = {
        "max_wave_reached": story_session.current_zone,
        "boss_killed": bosses_defeated,
        "enemies_killed": 0,  # TODO: track total enemies killed in session
        "is_personal_best": False,  # Set by upsert_scene_record if applicable
    }
    dropped_items = []
    achievement_results = []
    try:
        drops, results = check_run_achievements(
            session, session_stats, char, scene, scene.chapter if scene else None,
        )
        achievement_results = results
        for item in drops:
            dropped_items.append({
                "item_id": item.id,
                "name": item.name,
                "rarity": item.rarity,
                "item_type": item.item_type,
                "base_stats": item.base_stats,
                "item_code": item.item_code,
                "item_level": item.item_level,
                "min_char_level": item.min_char_level,
                "stat_requirements": item.stat_requirements,
                "gear_slot_id": item.gear_slot_id,
            })
    except Exception:
        logger.warning("Item drop generation failed", exc_info=True)

    story_session.is_active = False
    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    # 2.6.4: System broadcasts for completions and rare drops
    char_name = char.character_name or "A brave Vessel"
    try:
        # Broadcast rare item finds (legendary+)
        broadcast_min = _get_config_int(session, "broadcast_rarity_min", 4)
        rarity_order = {"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "legendary": 4, "mythic": 5}
        for item_data in dropped_items:
            if rarity_order.get(item_data.get("rarity", ""), 0) >= broadcast_min:
                await _system_broadcast(
                    "rare_item", char_name,
                    f"{char_name} found a {item_data['rarity']} {item_data['name']}!"
                )
        # Broadcast chapter/book completion
        if both_complete and scene:
            ch = scene.chapter
            if ch:
                await _system_broadcast(
                    "chapter_complete", char_name,
                    f"{char_name} completed Chapter {ch.chapter_number}: {ch.title or 'Unknown'}!"
                )
    except Exception:
        logger.debug("Broadcast failed (non-fatal)")

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
        "unlocked_skills": unlocked_skills,
        "idle_bonuses": idle_bonuses,
        "character_xp": char_xp_result,
        "dropped_items": dropped_items,
        "achievement_results": [
            {
                "achievement_id": r.get("achievement_id"),
                "display": r.get("display"),
                "met": r.get("met"),
                "rolled": r.get("rolled"),
            }
            for r in achievement_results
        ],
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
