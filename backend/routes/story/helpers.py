"""Story Mode shared helpers — config readers, zone math, anti-cheat, character lookups."""

import logging
import math
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlmodel import Session, select, col

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, Scene, Chapter, Book, StoryBeat, Entity, EntityGameplayData,
    Skill, ActivityEvent,
)
from models.story_mode import (
    GameConfig, CharacterSkillLevel, EntitySceneAppearance,
)
from services.chat import manager as chat_manager

logger = logging.getLogger(__name__)

DEFAULT_HP_SCALING = 1.55
DEFAULT_CPS_CAP = 20
DEFAULT_WPM = 200
DEFAULT_CLICK_STRENGTH = 10  # fallback when no character stat


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
    """HP = 10 * (scaling^(zone-1) + zone - 1)"""
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
        "entity_type_id": chosen.entity_type_id,
        "entity_family_id": chosen.entity_family_id,
        "base_hp": gp.base_hp if gp else 50,
        "base_gold": gp.base_gold if gp else 10,
        "sprite_key": gp.sprite_key if gp else None,
    }


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
      base_dps = sum(skill_level * skill.benefits_json["auto_dps_base"])
      bonus_mult = 1 + sum(skill_level * skill.benefits_json["auto_dps_bonus"])
      total_auto_dps = base_dps * bonus_mult
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
