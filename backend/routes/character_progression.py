"""Character Progression API routes (2.4.0 + 2.4.1).

Endpoints:
  GET  /api/game/character/stats           — computed stat block
  GET  /api/game/character/level           — level, XP, XP-to-next
  GET  /api/game/skills/tree               — full skill tree with prerequisites
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db import get_session
from auth import get_current_player
from models import PlayerCharacter, CharacterClass, StatDefinition
from models.character_progression import CharacterStat, ClassStatAffinity
from services.character_progression import (
    recalculate_character_stats,
    get_character_level,
    get_skill_tree,
    _get_config,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/game", tags=["character_progression"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_character(session: Session, player_id: int) -> PlayerCharacter:
    char = session.exec(
        select(PlayerCharacter).where(PlayerCharacter.player_id == player_id)
    ).first()
    if not char:
        raise HTTPException(status_code=404, detail="No character found")
    return char


# ---------------------------------------------------------------------------
# 2.4.0 Endpoints
# ---------------------------------------------------------------------------

@router.get("/character/stats")
async def get_character_stats(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Computed stat block with source breakdown."""
    player = token.get("player")
    char = _get_character(session, player.id)
    char_class = session.get(CharacterClass, char.class_id)

    # Ensure stats are fresh
    stat_totals = recalculate_character_stats(session, char.id)
    session.commit()

    # Build response with source breakdown
    stats = session.exec(select(StatDefinition)).all()
    affinities = session.exec(
        select(ClassStatAffinity)
        .where(ClassStatAffinity.class_id == char.class_id)
    ).all()
    aff_map = {a.stat_id: a for a in affinities}

    result = []
    for stat in stats:
        aff = aff_map.get(stat.id)
        result.append({
            "stat_id": stat.id,
            "name": stat.name,
            "display_name": stat.display_name,
            "total": stat_totals.get(stat.name, 0),
            "base": aff.base_value if aff else 0,
            "class_name": char_class.name if char_class else None,
        })

    return {
        "character_id": char.id,
        "character_level": char.level,
        "stats": result,
    }


@router.get("/character/level")
async def get_character_level_info(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Character level, XP, and XP-to-next."""
    player = token.get("player")
    char = _get_character(session, player.id)

    k = int(_get_config(session, "char_level_xp_factor", 1000, int))
    cap = int(_get_config(session, "char_level_cap", 99, int))

    current_level = char.level
    xp_for_current = k * current_level * current_level
    xp_for_next = k * (current_level + 1) * (current_level + 1) if current_level < cap else 0
    xp_to_next = max(0, xp_for_next - char.character_xp) if current_level < cap else 0

    return {
        "character_id": char.id,
        "level": current_level,
        "character_xp": char.character_xp,
        "xp_to_next_level": xp_to_next,
        "xp_for_current_level": xp_for_current,
        "xp_for_next_level": xp_for_next,
        "level_cap": cap,
    }


# ---------------------------------------------------------------------------
# 2.4.1 Endpoints
# ---------------------------------------------------------------------------

@router.get("/skills/tree")
async def get_skills_tree(
    token: dict = Depends(get_current_player),
    session: Session = Depends(get_session),
):
    """Full skill tree with lock/unlock/prerequisite status."""
    player = token.get("player")
    char = _get_character(session, player.id)

    # Ensure stats are fresh for prerequisite evaluation
    recalculate_character_stats(session, char.id)
    session.commit()

    tree = get_skill_tree(session, char.id)
    return {
        "character_id": char.id,
        "skills": tree,
    }
