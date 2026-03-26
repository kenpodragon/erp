"""Story Mode session completion — essence, XP, loot, achievements, progression."""

import logging
import math
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, PlayerProgress, PlayerEssence,
    Scene, Chapter, Book, StoryBeat, Skill, PlayerSettings,
)
from models.story_mode import (
    PlayerStorySession, SessionUpgrade,
    PlayerMetaProgression,
    CharacterSkillLevel, BossCompletion,
)
from services.character_progression import (
    award_scene_completion_char_xp, upsert_scene_record,
)
from services.item_generator import check_run_achievements
from services.artifact_service import evaluate_artifact_drops
from services.boost_service import get_effective_multipliers
from services.shop_service import increment_booster_time
from services.achievement_service import evaluate_achievements
from services.dev_audit_service import log_content_audit

from routes.story.helpers import (
    _get_config_float, _get_config_int,
    _calc_zone_hp, _calc_zone_gold, _calc_auto_dps,
    _get_character, _get_idle_training_bonuses,
    _log_anomaly, _system_broadcast,
    DEFAULT_HP_SCALING, DEFAULT_CPS_CAP, DEFAULT_CLICK_STRENGTH, DEFAULT_WPM,
)
from routes.story.schemas import _calc_multipliers

logger = logging.getLogger(__name__)
router = APIRouter()


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

    # -- Boss session completion path --
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
                        pass  # end of all content

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

        # 5.6.2: Log missing lore text for dev_content_audit
        if scene and not transition_lore_text:
            if scene.scene_type == 'book_boss':
                log_content_audit(
                    session, "missing_lore_text", "book", scene.chapter.book.id,
                    scene.chapter.book.title, "transition_lore_text", scene_id=scene.id
                )
            else:
                log_content_audit(
                    session, "missing_lore_text", "chapter", scene.chapter.id,
                    scene.chapter.title, "transition_lore_text", scene_id=scene.id
                )

        # 2.7: Upsert scene record for boss completion
        if story_session.scene_id:
            upsert_scene_record(
                session,
                player_id=player.id,
                scene_id=story_session.scene_id,
                wave=story_session.current_zone,
                enemies_killed=0,
            )

        # 2.7: Artifact drop evaluation for boss kills (with 3.3 combined boost)
        boss_sub_mult = get_effective_multipliers(player.id, session)
        artifact_drops = []
        try:
            artifact_drops = evaluate_artifact_drops(
                session,
                player_id=player.id,
                character_id=char.id,
                scene_id=story_session.scene_id,
                chapter_id=story_session.chapter_id or (scene.chapter_id if scene else 0),
                is_boss=True,
                rare_spawn_kill_count=0,
                drop_rate_multiplier=boss_sub_mult["drop_rate"],
            )
        except Exception:
            logger.warning("Boss artifact evaluation failed", exc_info=True)

        story_session.is_active = False
        story_session.updated_at = datetime.now(timezone.utc)
        session.add(story_session)
        session.commit()

        # 3.3: Increment booster elapsed time for boss session duration
        if story_session.created_at:
            boss_created = story_session.created_at
            if boss_created.tzinfo is None:
                boss_created = boss_created.replace(tzinfo=timezone.utc)
            boss_duration_s = int((datetime.now(timezone.utc) - boss_created).total_seconds())
            increment_booster_time(player.id, boss_duration_s, session)

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
            "artifact_drops": artifact_drops,
        }

    # -- Normal session completion path --
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
    base_rate = _get_config_float(session, "gold_to_essence_base_rate", 1000.0)
    growth_factor = _get_config_float(session, "gold_to_essence_growth_factor", 1.07)
    effective_rate = base_rate * math.pow(growth_factor, max(0, story_session.current_zone - 1))
    converted_essence = story_session.session_gold / max(effective_rate, 1.0)

    # Existing essence_earned (legacy meta-progression logic)
    essence_earned = (story_session.current_zone * 10 + bosses_defeated * 50) * first_clear_bonus

    # --- NEW: Apply Lore Essence Multiplier (Loop C) ---
    idle_bonuses = _get_idle_training_bonuses(session, char.id)
    essence_mult = idle_bonuses.get('essence_multiplier', 1.0)
    essence_earned *= essence_mult
    converted_essence *= essence_mult

    # --- 3.2/3.3: Apply Ascendant subscription + shop booster boosts ---
    sub_multipliers = get_effective_multipliers(player.id, session)
    essence_earned *= sub_multipliers["essence"]
    converted_essence *= sub_multipliers["essence"]

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
                next_chapter = session.exec(
                    select(Chapter)
                    .where(Chapter.book_id == scene.chapter.book_id)
                    .where(Chapter.chapter_number > scene.chapter.chapter_number)
                    .order_by(Chapter.chapter_number.asc())
                ).first()

                if next_chapter:
                    progress.chapter_number = next_chapter.chapter_number
                    progress.scene_number = 1  # Start at first scene of new chapter
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

    # 2.4: Award Character XP for scene completion (with 3.2 subscription boost)
    from services.character_progression import award_character_xp
    base_scene_xp = int(_get_config_float(session, "char_xp_per_scene_base", 50.0))
    boosted_scene_xp = int(base_scene_xp * sub_multipliers["xp"])
    char_xp_result = award_character_xp(session, char, boosted_scene_xp)

    # 2.4: Upsert player_scene_records
    if story_session.scene_id:
        upsert_scene_record(
            session,
            player_id=player.id,
            scene_id=story_session.scene_id,
            wave=story_session.current_zone,
            enemies_killed=0,
        )

    # 2.4.2: Run achievement check -> item drop generation
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

    # 2.7: Artifact drop evaluation for normal session
    artifact_drops = []
    try:
        artifact_drops = evaluate_artifact_drops(
            session,
            player_id=player.id,
            character_id=char.id,
            scene_id=story_session.scene_id or 0,
            chapter_id=story_session.chapter_id or (scene.chapter_id if scene else 0),
            is_boss=False,
            rare_spawn_kill_count=0,  # TODO: pass from client payload
            drop_rate_multiplier=sub_multipliers["drop_rate"],
        )
    except Exception:
        logger.warning("Artifact evaluation failed", exc_info=True)

    # 2.7.3: Achievement evaluation at session boundary
    achievements_earned = []
    try:
        achievements_earned = evaluate_achievements(player.id, session)
    except Exception:
        logger.warning("Achievement evaluation failed", exc_info=True)

    story_session.is_active = False
    story_session.updated_at = datetime.now(timezone.utc)
    session.add(story_session)
    session.commit()

    # 3.3: Increment booster elapsed time for normal session duration
    if story_session.created_at:
        sess_created = story_session.created_at
        if sess_created.tzinfo is None:
            sess_created = sess_created.replace(tzinfo=timezone.utc)
        session_duration_s = int((datetime.now(timezone.utc) - sess_created).total_seconds())
        increment_booster_time(player.id, session_duration_s, session)

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
        "artifact_drops": artifact_drops,
        "achievement_results": [
            {
                "achievement_id": r.get("achievement_id"),
                "display": r.get("display"),
                "met": r.get("met"),
                "rolled": r.get("rolled"),
            }
            for r in achievement_results
        ],
        "achievements_earned": achievements_earned,
    }
