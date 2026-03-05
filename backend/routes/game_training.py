import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from db import get_session
from auth import get_current_player
from models import (
    PlayerCharacter, CharacterClass, Skill, SkillAction, 
    CharacterSkillLevel, PlayerEssence, GameConfig
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
    full = get_config_val(session, 'idle_essence_xp_full_threshold', 0.75)
    mid = get_config_val(session, 'idle_essence_xp_mid_threshold', 0.40)
    low = get_config_val(session, 'idle_essence_xp_low_threshold', 0.15)
    crit = get_config_val(session, 'idle_essence_xp_critical_threshold', 0.01)
    floor_rate = get_config_val(session, 'idle_essence_xp_floor_rate', 0.10)

    if essence_pct >= full:  return 1.00
    if essence_pct >= mid:   return 0.75
    if essence_pct >= low:   return 0.50
    if essence_pct >= crit:  return 0.25
    return floor_rate

def apply_offline_calc(session: Session, character: PlayerCharacter) -> Optional[dict]:
    # Find the actively training skill
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
    
    if elapsed_seconds < 60:
        return None # Only report if at least 1 minute passed
        
    cap_hours = get_config_val(session, 'idle_offline_cap_hours', 24)
    capped_seconds = min(elapsed_seconds, cap_hours * 3600)

    action = session.exec(select(SkillAction).where(SkillAction.id == active_row.active_action_id)).first()
    if not action:
        return None

    skill = session.exec(select(Skill).where(Skill.id == active_row.skill_id)).first()
    char_class = session.exec(select(CharacterClass).where(CharacterClass.id == character.class_id)).first()
    
    # Class affinity
    affinity_mult = 1.25 if (char_class and char_class.name == skill.name) else 1.0

    # Essence calculation
    essence_rec = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == character.id)).first()
    if not essence_rec:
        essence_pct = 1.0
        essence_cap = 1000 # Fallback
    else:
        # Use a high default cap for the soft-gate calculation
        # This can be moved to game_configs or character stats later
        essence_cap = 10000 
        essence_pct = essence_rec.current_balance / essence_cap if essence_cap > 0 else 0

    essence_rate = get_essence_xp_rate(session, essence_pct)

    # XP Calculation
    actions_completed = int(capped_seconds / (action.interval_ms / 1000))
    xp_earned = int(actions_completed * action.xp_per_action * essence_rate * affinity_mult)

    # Apply XP
    old_level = active_row.level
    active_row.current_xp += xp_earned
    new_level = get_level_from_xp(active_row.current_xp)
    active_row.level = new_level
    levels_gained = new_level - old_level

    # Essence Drain
    drain_per_min = get_config_val(session, 'idle_essence_drain_per_minute', 1)
    essence_drained = int((capped_seconds / 60) * drain_per_min)
    if essence_rec:
        essence_rec.current_balance = max(0, essence_rec.current_balance - essence_drained)
        session.add(essence_rec)
        
        essence_pct = essence_rec.current_balance / essence_cap if essence_cap > 0 else 0
        new_essence_rate = get_essence_xp_rate(session, essence_pct)

    active_row.last_offline_calc_at = now
    session.add(active_row)
    session.commit()

    # Find newly unlocked actions
    new_actions = []
    if levels_gained > 0:
        unlocked = session.exec(
            select(SkillAction)
            .where(SkillAction.skill_id == skill.id)
            .where(SkillAction.level_required > old_level)
            .where(SkillAction.level_required <= new_level)
        ).all()
        new_actions = [a.display_name for a in unlocked]

    return {
        "offline_duration_seconds": capped_seconds,
        "cap_hours": cap_hours,
        "skill_name": skill.name,
        "action_name": action.display_name,
        "actions_completed": actions_completed,
        "xp_earned": xp_earned,
        "affinity_applied": affinity_mult > 1.0,
        "old_level": old_level,
        "new_level": new_level,
        "levels_gained": levels_gained,
        "new_actions_unlocked": new_actions,
        "essence_consumed": essence_drained,
        "remaining_essence": essence_rec.current_balance if essence_rec else 0,
        "new_essence_pct": essence_pct if essence_rec else 1.0,
        "training_rate_status": new_essence_rate if essence_rec else 1.0
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

    skills = session.exec(select(Skill)).all()
    char_skills = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character.id)).all()
    char_skills_map = {cs.skill_id: cs for cs in char_skills}

    essence_rec = session.exec(select(PlayerEssence).where(PlayerEssence.character_id == character.id)).first()
    if not essence_rec:
        essence_pct = 1.0
        essence_cap = 1000 # Fallback
    else:
        # Use a high default cap for the soft-gate calculation
        # This can be moved to game_configs or character stats later
        essence_cap = 10000
        essence_pct = (essence_rec.current_balance / essence_cap) if essence_cap > 0 else 0

    xp_rate_modifier = get_essence_xp_rate(session, essence_pct)

    res = []
    for skill in skills:
        cs = char_skills_map.get(skill.id)
        if not cs:
            # Create default row
            cs = CharacterSkillLevel(character_id=character.id, skill_id=skill.id)
            session.add(cs)
            session.commit()
            session.refresh(cs)

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
                }

        next_level_xp = get_xp_for_level(cs.level + 1) if cs.level < 99 else get_xp_for_level(99)
        
        # Check unlock gate
        is_unlocked = True
        if skill.unlock_scene_id:
            from models import PlayerProgress, Scene
            prog = session.exec(select(PlayerProgress).where(PlayerProgress.character_id == character.id)).first()
            if prog:
                gate_scene = session.exec(select(Scene).where(Scene.id == skill.unlock_scene_id)).first()
                if gate_scene:
                    # Very rough check, assuming if player's book/chap/scene is >= gate, it's unlocked
                    # A better check is the completed_scenes check.
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
            "unlock_display_text": skill.unlock_display_text if not is_unlocked else None
        })

    return {
        "essence_pct": essence_pct,
        "essence_balance": essence_rec.current_balance if essence_rec else 0,
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
    
    # Ensure offline calc runs first for any current training before stopping it
    apply_offline_calc(session, character)
    
    # Stop all current training
    all_skills = session.exec(select(CharacterSkillLevel).where(CharacterSkillLevel.character_id == character.id)).all()
    for s in all_skills:
        s.is_active_training = False
        s.is_in_active_mode = False
        session.add(s)

    # Start new training
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
    
    # Calculate offline right before pausing
    apply_offline_calc(session, character)

    active_row = session.exec(
        select(CharacterSkillLevel)
        .where(CharacterSkillLevel.character_id == character.id)
        .where(CharacterSkillLevel.is_active_training == True)
    ).first()

    if not active_row:
        raise HTTPException(status_code=400, detail="No active training to enter mode for")

    active_row.is_in_active_mode = True
    active_row.active_mode_started_at = datetime.now(timezone.utc)
    # Pause idle by not updating last_offline_calc_at during active mode
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

    # Client reported XP (validated lightly in a real app)
    active_row.current_xp += req.xp_earned
    active_row.level = get_level_from_xp(active_row.current_xp)
    
    active_row.is_in_active_mode = False
    active_row.active_mode_started_at = None
    active_row.action_started_at = datetime.now(timezone.utc)
    active_row.last_offline_calc_at = datetime.now(timezone.utc) # resume idle from now
    
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
