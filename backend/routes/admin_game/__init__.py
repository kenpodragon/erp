"""Admin game content management route package.

Modules:
  helpers  — shared _row_to_dict utility
  configs  — game_configs browser and editor
  classes  — stat definitions and character classes CRUD
  skills   — skills, actions, prerequisites, benefit effects CRUD
  items    — item components, gear slots, avatar options, attack types CRUD
"""

from fastapi import APIRouter

from routes.admin_game.configs import router as configs_router
from routes.admin_game.classes import router as classes_router
from routes.admin_game.skills import router as skills_router
from routes.admin_game.items import router as items_router

router = APIRouter(prefix="/api/admin/game", tags=["admin-game"])
router.include_router(configs_router)
router.include_router(classes_router)
router.include_router(skills_router)
router.include_router(items_router)
