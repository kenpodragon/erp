"""Story Mode request/response schemas and multiplier calculation."""

import math
from typing import Optional, List

from pydantic import BaseModel
from sqlmodel import Session

from models.story_mode import GameConfig, SessionUpgrade
from routes.story.helpers import _get_config_float, _get_config_int


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
    quantity: int = 1   # x1/x10/x100/MAX handled by client; always an integer >= 1


class SkillActivateRequest(BaseModel):
    skill_id: int


class NarrativeUpdateRequest(BaseModel):
    progress_pct: float  # 0.0-100.0


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
