"""Story Mode route package — decomposes the former story_mode.py god-file.

Modules:
  helpers  — shared config readers, zone math, anti-cheat, character lookups
  schemas  — Pydantic request/response models, multiplier calculation
  scenes   — scene narrative, enemies, configs, transition lore
  combat   — session lifecycle (start, tick, upgrade, skill, narrative)
  rewards  — session completion (essence, XP, loot, achievements, progression)
"""

from fastapi import APIRouter

from routes.story.scenes import router as scenes_router
from routes.story.combat import router as combat_router
from routes.story.rewards import router as rewards_router

router = APIRouter(prefix="/api/game/story", tags=["story_mode"])
router.include_router(scenes_router)
router.include_router(combat_router)
router.include_router(rewards_router)
