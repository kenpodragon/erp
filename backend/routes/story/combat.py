"""Story Mode combat endpoints — session start, tick, upgrades, skills, narrative."""

import logging
import math
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select, col

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, PlayerProgress, CharacterClass,
    Scene, Chapter, Book, Skill, PlayerSettings,
    Entity, EntityGameplayData,
)
from models.story_mode import (
    GameConfig, PlayerStorySession, SessionUpgrade,
    CharacterSkillLevel, EntitySceneAppearance, BossCompletion,
)
from services.character_progression import get_skill_tree

from routes.story.helpers import (
    _get_config_float, _get_config_int,
    _calc_zone_hp, _calc_zone_gold, _calc_auto_dps,
    _get_character, _get_idle_training_bonuses,
    _log_anomaly, _validate_waves, _check_rare_spawn, _compute_rank,
    DEFAULT_HP_SCALING, DEFAULT_CPS_CAP, DEFAULT_CLICK_STRENGTH, DEFAULT_WPM,
)
from routes.story.schemas import (
    SessionStartRequest, TickRequest, UpgradeRequest,
    SkillActivateRequest, NarrativeUpdateRequest,
    _calc_multipliers,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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

    # -- Boss session gate: validate all normal scenes in chapter are mastered --
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
            # Player is still in the same chapter -- check if they're past all normal scenes
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

    # -- Check boss replay (already completed) --
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
        # Calculate effective zone for scaling (Chapter X Boss ~ Level X*10)
        eff_zone = 1
        if is_boss_session:
            b_num = scene.chapter.book.book_number
            c_num = scene.chapter.chapter_number
            eff_zone = (b_num - 1) * 100 + c_num * 3
            if scene.scene_type == 'book_boss':
                eff_zone += 2  # slight boost for book bosses

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

    # --- Fetch boss name + compute boss HP from DB ---
    boss_name = "Guardian"
    boss_base_hp = None
    if is_boss_session:
        boss_entity = session.exec(
            select(Entity)
            .join(EntitySceneAppearance, Entity.id == EntitySceneAppearance.entity_id)
            .where(EntitySceneAppearance.scene_id == body.scene_id)
            .where(col(EntitySceneAppearance.role).in_(["boss", "big-boss", "big_boss"]))
        ).first()
        if boss_entity:
            boss_name = boss_entity.canonical_name

        # Compute boss HP using story mode scene_hp formula
        boss_book = session.get(Book, chapter.book_id)
        boss_book_num = boss_book.book_number if boss_book else 1
        earlier_scenes = session.exec(
            select(func.count()).select_from(Scene)
            .join(Chapter, Scene.chapter_id == Chapter.id)
            .join(Book, Chapter.book_id == Book.id)
            .where(
                (Book.book_number < boss_book_num) |
                ((Book.book_number == boss_book_num) & (Chapter.sort_order < chapter.sort_order)) |
                ((Chapter.id == chapter.id) & (Scene.sort_order <= scene.sort_order))
            )
        ).one()
        scene_position = max(earlier_scenes, 1)
        scene_hp_scale = _get_config_float(session, "scene_hp_scaling_base", 1.012)
        scene_hp_mult = math.pow(scene_hp_scale, scene_position - 1)
        hp_multiplier = boss_config.get("hp_multiplier", 8)

        # Boss entity base_hp from DB, or fallback
        boss_gp = None
        if boss_entity:
            boss_gp = session.exec(
                select(EntityGameplayData).where(EntityGameplayData.entity_id == boss_entity.id)
            ).first()
        entity_base_hp = float(boss_gp.base_hp) if boss_gp and boss_gp.base_hp else 50.0
        max_base_hp_cap = _get_config_float(session, "max_scene_base_hp", 500.0)
        boss_base_hp = round(min(entity_base_hp * scene_hp_mult, max_base_hp_cap * scene_hp_mult) * hp_multiplier, 2)

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
        "boss_base_hp": boss_base_hp,
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
            # Map of Magic level gates (hardcoded as per 2.3 spec S7)
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
