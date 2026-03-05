import math
from datetime import datetime, timezone
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, CharacterClass, Skill, SkillAction, 
    CharacterSkillLevel, PlayerEssence, GameConfig, PlayerMetaProgression
)

router = APIRouter(prefix="/api/game/training", tags=["Idle Training"])


# --- Helpers ---

def get_xp_for_level(level: int) -> int:
    if level <= 1:
        return 0
    total = 0
    for i in range(1, level):
        total += math.floor(i + 300 * (2 ** (i / 7.0)))
    return math.floor(total / 4)

def get_level_from_xp(xp: float) -> int:
    # 99 is hard cap for 2.3
    for lvl in range(2, 100):
        if xp < get_xp_for_level(lvl):
            return lvl - 1
    return 99

def get_config_val(session: Session, key: str, default: Any, val_type=float) -> Any:
    conf = session.exec(select(GameConfig).where(GameConfig.key == key)).first()
    if not conf:
        return default
    try:
        return val_type(conf.value_json)
    except:
        return default

def get_essence_xp_rate(session: Session, essence_pct: float) -> float:
    if essence_pct <= 0:
        return 0.01 # 1% rate if empty
        
    full = get_config_val(session, 'idle_essence_xp_full_threshold', 0.75)
    mid = get_config_val(session, 'idle_essence_xp_mid_threshold', 0.40)
    low = get_config_val(session, 'idle_essence_xp_low_threshold', 0.15)
    crit = get_config_val(session, 'idle_essence_xp_critical_threshold', 0.01)

    if essence_pct >= full:  return 1.00
    if essence_pct >= mid:   return 0.75
    if essence_pct >= low:   return 0.50
    if essence_pct >= crit:  return 0.25
    return 0.10 # 10% rate floor if any essence exists

def apply_offline_calc(session: Session, character: PlayerCharacter) -> Optional[dict]:
    active_row = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.is_active_training == True)
    ).first()

    if not active_row or not active_row.active_action_id:
        return None

    now = datetime.now(timezone.utc)
    last_calc = active_row.last_offline_calc_at
    if last_calc and last_calc.tzinfo is None:
        last_calc = last_calc.replace(tzinfo=timezone.utc)
    
    last_calc = last_calc or now
    elapsed_seconds = (now - last_calc).total_seconds()
    
    if elapsed_seconds < 1:
        return None 
        
    cap_hours = get_config_val(session, 'idle_offline_cap_hours', 24)
    capped_seconds = min(elapsed_seconds, cap_hours * 3600)

    action = session.exec(select(SkillAction).where(SkillAction.id == active_row.active_action_id)).first()
    if not action:
        return None

    skill = session.exec(select(Skill).where(Skill.id == active_row.skill_id)).first()
    char_class = session.exec(select(CharacterClass).where(CharacterClass.id == character.class_id)).first()
    affinity_mult = 1.25 if (char_class and char_class.name == skill.name) else 1.0

    essence_rec = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == character.id)).first()
    essence_cap = get_config_val(session, 'idle_essence_capacity', 1000)
    
    current_essence = essence_rec.current_balance if essence_rec else 0.0
    drain_per_tick = action.level_required
    actions_completed = int(capped_seconds / (action.interval_ms / 1000))
    
    if actions_completed < 1:
        return None

    # Granular Simulation of Drain Curve
    ticks_remaining = actions_completed
    total_xp_earned = 0.0
    temp_essence = current_essence
    
    # 1. Ticks possible with essence
    ticks_with_essence = int(temp_essence / drain_per_tick) if drain_per_tick > 0 else ticks_remaining
    ticks_to_process_with_essence = min(ticks_remaining, ticks_with_essence)
    ticks_at_empty = max(0, ticks_remaining - ticks_to_process_with_essence)
    
    # Process "Empty" Ticks first (1% rate)
    total_xp_earned += ticks_at_empty * action.xp_per_action * 0.01 * affinity_mult
    
    # Process "Essence" Ticks in chunks to approximate threshold crossings
    if ticks_to_process_with_essence > 0:
        chunks = 10
        ticks_per_chunk = ticks_to_process_with_essence // chunks
        leftover = ticks_to_process_with_essence % chunks
        
        for _ in range(chunks):
            pct = min(1.0, temp_essence / essence_cap) if essence_cap > 0 else 0
            rate = get_essence_xp_rate(session, pct)
            total_xp_earned += ticks_per_chunk * action.xp_per_action * rate * affinity_mult
            temp_essence -= (ticks_per_chunk * drain_per_tick)
            
        if leftover > 0:
            pct = min(1.0, temp_essence / essence_cap) if essence_cap > 0 else 0
            rate = get_essence_xp_rate(session, pct)
            total_xp_earned += leftover * action.xp_per_action * rate * affinity_mult
            temp_essence -= (leftover * drain_per_tick)

    xp_earned = total_xp_earned
    potential_xp = float(actions_completed * action.xp_per_action * affinity_mult)

    # Apply XP and Level
    old_level = active_row.level
    active_row.current_xp += xp_earned
    new_level = get_level_from_xp(active_row.current_xp)
    active_row.level = new_level
    levels_gained = new_level - old_level

    if essence_rec:
        essence_rec.current_balance = max(0.0, temp_essence)
        session.add(essence_rec)

    active_row.last_offline_calc_at = now
    session.add(active_row)
    session.commit()

    return {
        "offline_duration_seconds": capped_seconds,
        "cap_hours": cap_hours,
        "skill_name": skill.name,
        "action_name": action.display_name,
        "actions_completed": actions_completed,
        "xp_earned": round(xp_earned, 2),
        "potential_xp": round(potential_xp, 2),
        "affinity_applied": affinity_mult > 1.0,
        "old_level": old_level,
        "new_level": new_level,
        "levels_gained": levels_gained,
        "essence_consumed": round(current_essence - max(0.0, temp_essence), 2),
        "remaining_essence": round(max(0.0, temp_essence), 2),
        "new_actions_unlocked": [] # Placeholder for future logic
    }

# --- Schemas ---

class StartTrainingRequest(BaseModel):
    skill_id: int
    action_id: int

class SwitchActionRequest(BaseModel):
    skill_id: int
    action_id: int

class ExitActiveModeRequest(BaseModel):
    xp_earned: int


# --- Endpoints ---

@router.get("/status")
def get_training_status(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    skills = session.exec(select(Skill).where(Skill.idle_flavor_title != None)).all()
    char_skills = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character.id)).all()
    char_skills_map = {cs.skill_id: cs for cs in char_skills}

    essence_rec = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == character.id)).first()
    essence_cap = get_config_val(session, 'idle_essence_capacity', 1000)
    
    essence_balance = essence_rec.current_balance if essence_rec else 0.0
    essence_pct = min(1.0, essence_balance / essence_cap) if essence_cap > 0 else 0
    xp_rate_modifier = get_essence_xp_rate(session, essence_pct)

    res = []
    char_class = session.exec(select(CharacterClass).where(CharacterClass.id == character.class_id)).first()
    
    active_drain = 0
    for skill in skills:
        cs = char_skills_map.get(skill.id)
        if not cs:
            cs = CharacterSkillLevel(character_id=character.id, skill_id=skill.id)
            session.add(cs)
            session.commit()
            session.refresh(cs)

        affinity_mult = 1.25 if (char_class and char_class.name == skill.name) else 1.0

        action_data = None
        if cs.active_action_id:
            action = session.exec(select(SkillAction).where(SkillAction.id == cs.active_action_id)).first()
            if action:
                action_data = {
                    "id": action.id,
                    "name": action.name,
                    "display_name": action.display_name,
                    "interval_ms": action.interval_ms,
                    "xp_per_action": action.xp_per_action,
                    "level_required": action.level_required
                }
                if cs.is_active_training:
                    active_drain = action.level_required

        next_level_xp = get_xp_for_level(cs.level + 1) if cs.level < 99 else get_xp_for_level(99)
        
        # Simple unlock check
        is_unlocked = True
        if skill.unlock_scene_id:
            from models import PlayerProgress, Scene
            prog = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character.id)).first()
            if prog:
                gate_scene = session.exec(select(Scene).where(Scene.id == skill.unlock_scene_id)).first()
                if gate_scene:
                    is_unlocked = (prog.book_number > gate_scene.chapter.book_id) or \
                                  (prog.book_number == gate_scene.chapter.book_id and prog.chapter_number > gate_scene.chapter_id) or \
                                  (prog.book_number == gate_scene.chapter.book_id and prog.chapter_number == gate_scene.chapter_id and prog.scene_number > gate_scene.scene_number)
            else:
                is_unlocked = False

        res.append({
            "skill_id": skill.id,
            "skill_name": skill.name,
            "flavor_title": skill.idle_flavor_title,
            "level": cs.level,
            "current_xp": cs.current_xp,
            "next_level_xp": next_level_xp,
            "is_active_training": cs.is_active_training,
            "is_in_active_mode": cs.is_in_active_mode,
            "action_started_at": cs.action_started_at,
            "active_action": action_data,
            "is_unlocked": is_unlocked,
            "unlock_display_text": skill.unlock_display_text if not is_unlocked else None,
            "affinity_multiplier": affinity_mult
        })

    return {
        "essence_pct": essence_pct,
        "essence_balance": essence_balance,
        "essence_capacity": essence_cap,
        "essence_drain_per_tick": active_drain,
        "xp_rate_modifier": xp_rate_modifier,
        "skills": res
    }

@router.get("/offline-report")
def get_offline_report(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")

    report = apply_offline_calc(session, character)
    if report:
        return {"has_report": True, "report": report}
    return {"has_report": False}


@router.post("/start")
def start_training(req: StartTrainingRequest, token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    apply_offline_calc(session, character)
    
    all_skills = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character.id)).all()
    for s in all_skills:
        s.is_active_training = False
        s.is_in_active_mode = False
        session.add(s)

    target = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.skill_id == req.skill_id)
    ).first()
    
    if not target:
        target = CharacterSkillLevel(character_id=character.id, skill_id=req.skill_id)

    target.is_active_training = True
    target.active_action_id = req.action_id
    target.action_started_at = datetime.now(timezone.utc)
    target.last_offline_calc_at = datetime.now(timezone.utc)
    
    session.add(target)
    session.commit()
    return {"status": "success"}


@router.post("/stop")
def stop_training(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    apply_offline_calc(session, character)
    
    all_skills = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character.id)).all()
    for s in all_skills:
        s.is_active_training = False
        s.is_in_active_mode = False
        session.add(s)
    session.commit()
    return {"status": "success"}


@router.post("/switch-action")
def switch_action(req: SwitchActionRequest, token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    apply_offline_calc(session, character)

    target = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.skill_id == req.skill_id)
    ).first()

    if not target or not target.is_active_training:
        raise HTTPException(status_code=400, detail="Skill is not actively training")

    target.active_action_id = req.action_id
    target.action_started_at = datetime.now(timezone.utc)
    target.last_offline_calc_at = datetime.now(timezone.utc)
    session.add(target)
    session.commit()
    return {"status": "success"}


@router.post("/active-mode/enter")
def enter_active_mode(token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()
    apply_offline_calc(session, character)

    active_row = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.is_active_training == True)
    ).first()

    if not active_row:
        raise HTTPException(status_code=400, detail="No active training")

    active_row.is_in_active_mode = True
    active_row.active_mode_started_at = datetime.now(timezone.utc)
    session.add(active_row)
    session.commit()
    return {"status": "success"}


@router.post("/active-mode/exit")
def exit_active_mode(req: ExitActiveModeRequest, token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    player = token.get("player")
    character = session.exec(select(PlayerCharacter).where(PlayerCharacter.player_id == player.id)).first()

    active_row = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.is_in_active_mode == True)
    ).first()

    if not active_row:
        raise HTTPException(status_code=400, detail="Not in active mode")

    active_row.current_xp += req.xp_earned
    active_row.level = get_level_from_xp(active_row.current_xp)
    active_row.is_in_active_mode = False
    active_row.active_mode_started_at = None
    active_row.action_started_at = datetime.now(timezone.utc)
    active_row.last_offline_calc_at = datetime.now(timezone.utc)
    session.add(active_row)
    session.commit()
    return {"status": "success"}


@router.get("/actions/{skill_id}")
def get_actions_for_skill(skill_id: int, token: dict = Depends(get_current_player), session: Session = Depends(get_session)):
    actions = session.exec(
        select(SkillAction)
        .where(SkillAction.skill_id == skill_id)
        .order_by(SkillAction.sort_order)
    ).all()
    return actions
