# Generator Directory Reorganization — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Move all generator-related scripts from `tools/` root into `tools/generators/` subdirectory

---

## Goal

Consolidate all content generation scripts (generators, classifiers, seeders, scanners) and their framework library into a dedicated `tools/generators/` subdirectory. Update all imports across the codebase. Remove stale one-off scripts and outdated TODO references.

## Final Directory Structure

```
tools/
  generators/
    __init__.py
    lib/
      __init__.py
      ai_provider.py
      base_generator.py
      cache.py
      db_client.py
    tests/
      __init__.py
      test_ai_provider.py
      test_base_generator.py
      test_cache.py
      test_db_client.py
    generate_entity_sprites.py
    generate_item_sprites.py
    generate_achievement_icons.py
    generate_artifact_icons.py
    generate_backgrounds.py
    generate_projectile_sprites.py
    generate_scene_data.py
    generate_entity_gameplay.py
    generate_boss_lore.py
    generate_lore_content.py
    generate_extended_music.py
    generate_8bit_music.py
    generate_8bit_sfx.py
    generate_placeholder_music.py
    populate_attack_visuals.py
    scan_content_gaps.py
    seed_entity_families.py
    assign_atmospheres.py
    classify_atmospheres.py
    classify_entity_families.py
    capture_difficulty_preset.py
  watchdog/          # stays in place
  sim/               # stays in place
```

### Files Staying in `tools/` Root
| File | Reason |
|------|--------|
| `db_dump_restore.py` | DB utility, not a generator |
| `refresh_dump.py` | DB utility, not a generator |
| `toggle_db.py` | DB utility, not a generator |
| `test_helpers.py` | General test utility |

## Files Moving (21 scripts + 4 lib modules + 4 tests)

### Generators (15)
| File | Description |
|------|-------------|
| `generate_entity_sprites.py` | Entity sprite keys (6 silhouette types) |
| `generate_item_sprites.py` | Item/armor sprites (8 classes × slots) |
| `generate_achievement_icons.py` | Achievement icon sprite keys (8 categories) |
| `generate_artifact_icons.py` | Curated artifact icon sprite keys |
| `generate_backgrounds.py` | Parallax background layers |
| `generate_projectile_sprites.py` | Projectile sprite keys for attack types |
| `generate_scene_data.py` | Scene gameplay data |
| `generate_entity_gameplay.py` | Entity gameplay data (stats, scaling) |
| `generate_boss_lore.py` | Boss transition lore text |
| `generate_lore_content.py` | Entity descriptions and lore |
| `generate_extended_music.py` | Extended music definitions |
| `generate_8bit_music.py` | 8-bit music JSON (Web Audio) |
| `generate_8bit_sfx.py` | 8-bit SFX presets (Web Audio) |
| `generate_placeholder_music.py` | Placeholder WAV chiptune files |
| `populate_attack_visuals.py` | Attack visual data population |

### Supporting Scripts (6)
| File | Description |
|------|-------------|
| `scan_content_gaps.py` | Scans DB for missing content |
| `seed_entity_families.py` | Seeds entity family data |
| `assign_atmospheres.py` | Assigns atmospheres to scenes |
| `classify_atmospheres.py` | Classifies atmosphere types |
| `classify_entity_families.py` | Classifies entities into families |
| `capture_difficulty_preset.py` | Captures difficulty presets from DB |

### Framework Library (4)
| File | Description |
|------|-------------|
| `lib/ai_provider.py` | AI CLI routing (Claude/Gemini) |
| `lib/base_generator.py` | BaseGenerator ABC |
| `lib/cache.py` | File-based recovery cache |
| `lib/db_client.py` | Database connection and CRUD |

### Framework Tests (4)
| File | Description |
|------|-------------|
| `tests/test_ai_provider.py` | AI provider tests |
| `tests/test_base_generator.py` | Base generator tests |
| `tests/test_cache.py` | Cache tests |
| `tests/test_db_client.py` | DB client tests |

## Deletions

| File | Reason |
|------|--------|
| `generate_migration_040.py` | One-off migration script, not a generator |

## Import Changes

### Internal (generators → lib)
Generators currently use `sys.path.insert()` hacks + `from lib.X` imports. After the move, remove all `sys.path` hacks and replace with proper absolute imports (`from tools.generators.lib.X`). Intra-lib imports in `base_generator.py` (which imports from `cache`, `db_client`, `ai_provider`) should use relative imports (`from .cache import ...`).

### Watchdog
Watchdog scripts in `tools/watchdog/` that import from `tools.lib` or `lib`:
```python
# Before
from tools.lib.db_client import DBClient
from tools.lib.ai_provider import get_ai_response

# After
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.ai_provider import get_ai_response
```

Specific files needing update:
- Any watchdog `.py` files importing from `tools.lib`
- `tools/watchdog/_db_test.py`

### Tests
Framework tests in `tools/tests/` → `tools/generators/tests/`:
```python
# Before
from tools.lib.base_generator import BaseGenerator

# After
from tools.generators.lib.base_generator import BaseGenerator
```

## Documentation Updates

Files referencing `tools/generate_*`, `tools/scan_*`, `tools/lib/`, or related paths:

1. **TODO.md** — Remove stale "Cosmetic Asset Generation" section (references completed 3.3 Emporium)
2. **AGENTS.md** — Update `/tools` directory structure description
3. **docs/inst/GENERATOR_AI_RULES.md** — Update generator paths
4. **docs/inst/GENERATOR_INSTRUCTIONS.md** — Update generator paths
5. **docs/inst/GAME_ASSETS_GUIDE.md** — Update generator paths
6. **docs/recs/C_STORY_ASSET_GENERATORS.md** — Update generator paths
7. **docs/superpowers/plans/2026-03-23-generator-pipeline.md** — Update paths
8. **docs/superpowers/specs/2026-03-23-generator-pipeline-design.md** — Update paths
9. **tools/watchdog/AGENT_INSTRUCTIONS.md** — Update `python tools/scan_content_gaps.py` etc.
10. **Any other docs found via grep** for `tools/generate_` or `tools/lib/`

## Verification

After all moves and import updates:
1. Each generator's `status` command works from new location
2. Framework test suite passes: `pytest tools/generators/tests/`
3. Watchdog scripts can import from new paths
4. `scan_content_gaps.py` runs from new location
5. `populate_attack_visuals.py` and `capture_difficulty_preset.py` work
6. Grep entire repo for stale `tools/lib/` or `tools/generate_` references — zero hits outside docs history
7. `tools/__init__.py` exists (needed for `python -m tools.generators.X` invocation)
