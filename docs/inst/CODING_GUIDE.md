# Coding Standards Guide

This guide covers backend module conventions and file organization rules to prevent bloat and maintain consistency.

## Backend Module Structure

```
backend/
  main.py                  # App creation, lifespan, middleware, router registration (~100 lines)
  db.py                    # Database engine & session factory
  auth.py                  # Firebase auth, role checking, IP extraction
  utils.py                 # Text sanitization, profanity filtering
  audit.py                 # Admin audit log helper
  events.py                # Player activity event logging
  config_cache.py          # In-memory server config cache
  models/                  # SQLModel ORM models, split by domain
    __init__.py            # Re-exports ALL models (backward compat)
    player.py              # Player, PlayerSettings, CharacterClass, PlayerCharacter
    progress.py            # PlayerProgress, PlayerEssence
    support.py             # SupportTicket, SupportReply, SupportAttachment
    narrative.py           # Book, Chapter, Scene, StoryBeat, Location
    gameplay.py            # SceneGameplayData, Entity, EntityGameplayData, Skill, StatDefinition, BenefitEffectData
    inventory.py           # InventoryItem, PlayerInventory, Artifact, PlayerCollection
    admin.py               # ServerConfig, AdminAuditLog, ActivityEvent, AdminWhitelistEmail, AdminWhitelistIP
  routes/                  # FastAPI routers, one per domain
    __init__.py
    public.py              # /, /health, /hello, /api/config/public
    auth.py                # /api/auth/*
    players.py             # /api/players/*
    characters.py          # /api/players/me/characters/*
    game.py                # /api/game/*
    support.py             # /api/support/*
    admin_access.py        # /api/admin/ping, /me, permissions, access-control
    admin_config.py        # /api/admin/config/*
    admin_support.py       # /api/admin/support/*
    admin_players.py       # /api/admin/players/*
    admin_analytics.py     # /api/admin/analytics/*, /api/admin/audit-log
  tests/                   # pytest test files
```

## Route File Conventions

1. **One router per file.** The router variable is always named `router`.
2. **Use `APIRouter`** with `prefix` and `tags`:
   ```python
   router = APIRouter(prefix="/api/game", tags=["game"])
   ```
3. **Import models from the package**, not sub-modules:
   ```python
   from models import Player, Chapter, Scene  # YES
   from models.narrative import Scene          # NO (fragile)
   ```
4. **Import dependencies from their source module:**
   - `from db import get_session`
   - `from auth import get_current_player, get_current_admin`
   - `from audit import write_audit_log`
   - `from events import log_activity_event`
5. **Never import from `main.py`** in route files. This prevents circular imports. The dependency flows one way: `main.py` → `routes/`.
6. **Helper functions** used by only one route file live in that file (e.g., `_validate_config_value` in `admin_config.py`).

## Model File Conventions

1. **Group by domain.** Each file contains closely related models that share relationships.
2. **Always re-export** new models in `models/__init__.py` so `from models import NewModel` works.
3. **Use string-based forward references** for cross-domain relationships:
   ```python
   tickets: List["SupportTicket"] = Relationship(back_populates="player")
   ```
4. **Each file has its own imports** — don't rely on imports from other model sub-modules.

## Adding New Code

### New endpoint
1. Find the appropriate route file in `routes/` (or create one if it's a new domain).
2. Add the endpoint to the router.
3. If creating a new route file: add `from routes.new_file import router as new_router` and `app.include_router(new_router)` in `main.py`.

### New model
1. Add the model class to the appropriate file in `models/`.
2. Add the re-export in `models/__init__.py`.
3. Import it in test `conftest.py` if it has a table (for `SQLModel.metadata.create_all`).

### New utility
- Small helpers specific to one route file → keep in that route file.
- Shared across routes → add to an existing utility module (`utils.py`, `audit.py`, `events.py`) or create a new one.

## File Size Guidelines

- **Target: 300-500 lines per module.** If a file exceeds ~500 lines, consider splitting.
- `main.py` should stay slim (~100 lines) — only app setup and router registration.
- Route files with many complex endpoints may be larger, but prefer splitting by sub-domain (e.g., `admin_players.py` vs `admin_support.py`).

## Import Rules (Summary)

| From → To | Allowed? |
|-----------|----------|
| `routes/*` → `models`, `db`, `auth`, `utils`, `audit`, `events`, `config_cache` | Yes |
| `routes/*` → `main` | **No** (circular) |
| `main` → `routes/*` | Yes (router registration) |
| `tests/*` → `main` (for `app`) | Yes |
| `tests/*` → `db`, `auth`, `models` | Yes |
| `models/*` → other `models/*` sub-modules | Avoid (use string refs) |

## Testing Conventions

- Tests import `app` from `main`, models from `models`, and auth/db from their source modules.
- Each route file's endpoints are tested through the existing test structure (see `@docs/inst/TESTING.md`).
- New test files go in `backend/tests/` and should follow the `test_*.py` naming convention.
