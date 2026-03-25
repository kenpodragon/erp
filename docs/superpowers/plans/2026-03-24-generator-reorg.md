# Generator Directory Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 21 generator-related scripts + 4 lib modules + 4 tests from `tools/` root into `tools/generators/`, fix imports, delete stale files, update docs.

**Architecture:** Create `tools/generators/` as a proper Python package with `__init__.py` files. Move all generator/classifier/seeder/scanner scripts and their framework library. Replace `sys.path.insert()` hacks with proper package imports. Update watchdog and test imports to reference new paths.

**Tech Stack:** Python (file moves, import rewrites), Markdown (doc updates)

**Spec:** `docs/superpowers/specs/2026-03-24-generator-reorg-design.md`

---

### Task 1: Create Directory Structure and `__init__.py` Files

**Files:**
- Create: `tools/__init__.py`
- Create: `tools/generators/__init__.py`
- Create: `tools/generators/lib/__init__.py`
- Create: `tools/generators/tests/__init__.py`

- [ ] **Step 1: Create `tools/__init__.py`**

This file does not currently exist. It's needed for `python -m tools.generators.X` invocation.

```python
# tools/__init__.py
```

- [ ] **Step 2: Create `tools/generators/__init__.py`**

```python
# tools/generators/__init__.py
```

- [ ] **Step 3: Verify directory structure**

Run: `ls tools/generators/ tools/generators/lib/ tools/generators/tests/`

The `lib/` and `tests/` dirs don't exist yet — they'll be created by the file moves in Task 2.

- [ ] **Step 4: Commit**

```bash
git add tools/__init__.py tools/generators/__init__.py
git commit -m "chore: create tools/generators package structure"
```

---

### Task 2: Move Framework Library (`tools/lib/` → `tools/generators/lib/`)

**Files:**
- Move: `tools/lib/ai_provider.py` → `tools/generators/lib/ai_provider.py`
- Move: `tools/lib/base_generator.py` → `tools/generators/lib/base_generator.py`
- Move: `tools/lib/cache.py` → `tools/generators/lib/cache.py`
- Move: `tools/lib/db_client.py` → `tools/generators/lib/db_client.py`
- Move: `tools/lib/__init__.py` → `tools/generators/lib/__init__.py`

- [ ] **Step 1: Move lib directory**

```bash
git mv tools/lib/ tools/generators/lib/
```

- [ ] **Step 2: Verify files landed correctly**

Run: `ls tools/generators/lib/`
Expected: `__init__.py`, `ai_provider.py`, `base_generator.py`, `cache.py`, `db_client.py`

- [ ] **Step 3: Fix intra-lib imports in `base_generator.py`**

`base_generator.py` imports from sibling modules using `from lib.*` (via `sys.path` hack). Convert these to relative imports:

In `tools/generators/lib/base_generator.py`, replace:
```python
from lib.cache import GeneratorCache
from lib.db_client import DBClient
from lib.ai_provider import AIProvider  # conditional import ~line 226
```
With:
```python
from .cache import GeneratorCache
from .db_client import DBClient
from .ai_provider import AIProvider  # conditional import ~line 226
```

Also remove any `sys.path.insert()` block in this file.

- [ ] **Step 4: Fix any intra-lib imports in other lib modules**

Check `ai_provider.py`, `cache.py`, `db_client.py` for any `from lib.*` imports and convert to relative (`from .X`) as well.

- [ ] **Step 5: Commit**

```bash
git add -A tools/lib/ tools/generators/lib/
git commit -m "chore: move tools/lib to tools/generators/lib, fix intra-lib imports"
```

---

### Task 3: Move Framework Tests (`tools/tests/` → `tools/generators/tests/`)

**Files:**
- Move: `tools/tests/test_ai_provider.py` → `tools/generators/tests/test_ai_provider.py`
- Move: `tools/tests/test_base_generator.py` → `tools/generators/tests/test_base_generator.py`
- Move: `tools/tests/test_cache.py` → `tools/generators/tests/test_cache.py`
- Move: `tools/tests/test_db_client.py` → `tools/generators/tests/test_db_client.py`
- Move: `tools/tests/__init__.py` → `tools/generators/tests/__init__.py`

- [ ] **Step 1: Move tests directory**

```bash
git mv tools/tests/ tools/generators/tests/
```

- [ ] **Step 2: Update imports in test files**

Each test file imports from `tools.lib.*` or uses `sys.path` hacks. Update all to use `tools.generators.lib.*`.

In each test file, replace:
```python
from tools.lib.base_generator import BaseGenerator
from tools.lib.db_client import DBClient
from tools.lib.cache import GeneratorCache
from tools.lib.ai_provider import ...
```
With:
```python
from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.cache import GeneratorCache
from tools.generators.lib.ai_provider import ...
```

Also remove any `sys.path.insert()` lines that were making `from lib.*` work.

- [ ] **Step 3: Run tests to verify**

Run: `rtk python -m pytest tools/generators/tests/ -v`
Expected: All 4 test files pass (some tests may skip if no DB — that's fine)

- [ ] **Step 4: Commit**

```bash
git add -A tools/tests/ tools/generators/tests/
git commit -m "chore: move tools/tests to tools/generators/tests, fix imports"
```

---

### Task 4: Move All Generator Scripts (15 generators)

**Files to move** (all from `tools/` → `tools/generators/`):
- `generate_entity_sprites.py`
- `generate_item_sprites.py`
- `generate_achievement_icons.py`
- `generate_artifact_icons.py`
- `generate_backgrounds.py`
- `generate_projectile_sprites.py`
- `generate_scene_data.py`
- `generate_entity_gameplay.py`
- `generate_boss_lore.py`
- `generate_lore_content.py`
- `generate_extended_music.py`
- `generate_8bit_music.py`
- `generate_8bit_sfx.py`
- `generate_placeholder_music.py`
- `populate_attack_visuals.py`

- [ ] **Step 1: Move all 15 generator files**

```bash
git mv tools/generate_entity_sprites.py tools/generators/
git mv tools/generate_item_sprites.py tools/generators/
git mv tools/generate_achievement_icons.py tools/generators/
git mv tools/generate_artifact_icons.py tools/generators/
git mv tools/generate_backgrounds.py tools/generators/
git mv tools/generate_projectile_sprites.py tools/generators/
git mv tools/generate_scene_data.py tools/generators/
git mv tools/generate_entity_gameplay.py tools/generators/
git mv tools/generate_boss_lore.py tools/generators/
git mv tools/generate_lore_content.py tools/generators/
git mv tools/generate_extended_music.py tools/generators/
git mv tools/generate_8bit_music.py tools/generators/
git mv tools/generate_8bit_sfx.py tools/generators/
git mv tools/generate_placeholder_music.py tools/generators/
git mv tools/populate_attack_visuals.py tools/generators/
```

- [ ] **Step 2: Fix imports in generators that use `sys.path` + `from lib.*`**

Most generators have a block like:
```python
import sys, os
_TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if _TOOLS_DIR not in sys.path:
    sys.path.insert(0, _TOOLS_DIR)
from lib.base_generator import BaseGenerator
from lib.db_client import DBClient
```

Replace with clean package imports:
```python
from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient
```

Remove the `sys.path.insert()` block entirely from each file.

**Files that DON'T import lib** (no changes needed to imports):
- `generate_8bit_music.py` (stdlib only)
- `generate_8bit_sfx.py` (stdlib only)
- `generate_placeholder_music.py` (stdlib only)

**Files using `from lib.*` that need updating** (approximately 12 files — check each):
- All `generate_*.py` that import BaseGenerator/DBClient/GeneratorCache/get_ai_response
- `populate_attack_visuals.py`

- [ ] **Step 3: Verify a representative generator runs**

Run: `rtk python tools/generators/generate_entity_sprites.py status`
Expected: Status output (or DB connection error if no DB — import errors would be different)

- [ ] **Step 4: Commit**

```bash
git add -A tools/generate_*.py tools/populate_attack_visuals.py tools/generators/
git commit -m "chore: move 15 generators to tools/generators, fix imports"
```

---

### Task 5: Move Supporting Scripts (6 files)

**Files to move** (all from `tools/` → `tools/generators/`):
- `scan_content_gaps.py`
- `seed_entity_families.py`
- `assign_atmospheres.py`
- `classify_atmospheres.py`
- `classify_entity_families.py`
- `capture_difficulty_preset.py`

- [ ] **Step 1: Move all 6 supporting scripts**

```bash
git mv tools/scan_content_gaps.py tools/generators/
git mv tools/seed_entity_families.py tools/generators/
git mv tools/assign_atmospheres.py tools/generators/
git mv tools/classify_atmospheres.py tools/generators/
git mv tools/classify_entity_families.py tools/generators/
git mv tools/capture_difficulty_preset.py tools/generators/
```

- [ ] **Step 2: Fix imports**

Same pattern as Task 4 — replace `sys.path.insert()` + `from lib.*` with `from tools.generators.lib.*`. Some of these scripts may import directly from `backend` models — those imports stay unchanged.

- [ ] **Step 3: Verify scan_content_gaps runs**

Run: `rtk python tools/generators/scan_content_gaps.py --help`
Expected: Help text or usage output (no import errors)

- [ ] **Step 4: Commit**

```bash
git add -A tools/scan_content_gaps.py tools/seed_entity_families.py tools/assign_atmospheres.py tools/classify_atmospheres.py tools/classify_entity_families.py tools/capture_difficulty_preset.py tools/generators/
git commit -m "chore: move 6 supporting scripts to tools/generators, fix imports"
```

---

### Task 6: Delete One-Off Script

**Files:**
- Delete: `tools/generate_migration_040.py`

- [ ] **Step 1: Delete the file**

```bash
git rm tools/generate_migration_040.py
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: delete one-off generate_migration_040.py"
```

---

### Task 7: Update Watchdog Imports

**Files:**
- Modify: `tools/watchdog/_db_test.py`
- Modify: Any other `.py` files in `tools/watchdog/` that import from `tools.lib`

- [ ] **Step 1: Find all watchdog files importing from old paths**

Run: `grep -rn "from tools\.lib\|from lib\." tools/watchdog/*.py`

- [ ] **Step 2: Update imports**

In each file found, replace:
```python
from tools.lib.db_client import DBClient
from tools.lib.ai_provider import ...
```
With:
```python
from tools.generators.lib.db_client import DBClient
from tools.generators.lib.ai_provider import ...
```

- [ ] **Step 3: Verify watchdog db_test runs**

Run: `rtk python tools/watchdog/_db_test.py`
Expected: No import errors (DB connection errors are fine)

- [ ] **Step 4: Commit**

```bash
git add tools/watchdog/
git commit -m "chore: update watchdog imports to tools.generators.lib"
```

---

### Task 8: Update Documentation

**Files to modify** (find exact references via grep):
- Modify: `docs/TODO.md` — Remove stale "Cosmetic Asset Generation" section (lines 56-59)
- Modify: `AGENTS.md` — Update `/tools` directory structure
- Modify: `docs/inst/GENERATOR_AI_RULES.md` — Update all `python tools/<generator>.py` → `python tools/generators/<generator>.py`
- Modify: `docs/inst/GENERATOR_INSTRUCTIONS.md` — Update generator paths
- Modify: `docs/inst/GAME_ASSETS_GUIDE.md` — Update generator paths
- Modify: `docs/recs/C_STORY_ASSET_GENERATORS.md` — Update generator paths
- Modify: `docs/superpowers/plans/2026-03-23-generator-pipeline.md` — Update paths
- Modify: `docs/superpowers/specs/2026-03-23-generator-pipeline-design.md` — Update paths
- Modify: `tools/watchdog/AGENT_INSTRUCTIONS.md` — Update `python tools/scan_content_gaps.py` etc.
- Modify: `tools/watchdog/AGENT_GOALS.md` — Update any generator path references

- [ ] **Step 1: Find ALL markdown files with stale paths**

Run: `grep -rln "tools/generate_\|tools/scan_content\|tools/seed_entity\|tools/assign_atmo\|tools/classify_\|tools/populate_attack\|tools/capture_difficulty\|tools/lib/" docs/ tools/watchdog/ AGENTS.md`

- [ ] **Step 2: Bulk update paths in each file**

For each file found, replace:
- `tools/generate_` → `tools/generators/generate_`
- `tools/scan_content_gaps` → `tools/generators/scan_content_gaps`
- `tools/seed_entity_families` → `tools/generators/seed_entity_families`
- `tools/assign_atmospheres` → `tools/generators/assign_atmospheres`
- `tools/classify_` → `tools/generators/classify_`
- `tools/populate_attack_visuals` → `tools/generators/populate_attack_visuals`
- `tools/capture_difficulty_preset` → `tools/generators/capture_difficulty_preset`
- `tools/lib/` → `tools/generators/lib/`

- [ ] **Step 3: Remove stale TODO.md cosmetic section**

In `docs/TODO.md`, remove lines 56-59 (the "Cosmetic Asset Generation" section referencing completed 3.3 Emporium).

- [ ] **Step 4: Update AGENTS.md directory structure**

In `AGENTS.md`, update the `/tools` entry to reflect:
```
- `/tools`: Content generation pipeline, simulation, watchdog agent.
  - `/tools/generators`: 15 generators, 6 supporting scripts, framework library (`lib/`).
  - `/tools/generators/lib`: BaseGenerator ABC, AI provider, DB client, cache.
  - `/tools/watchdog`: Autonomous overnight agent for bulk content quality passes.
  - `/tools/sim`: Simulation & progression balancing toolkit.
```

- [ ] **Step 5: Commit**

```bash
git add docs/ AGENTS.md tools/watchdog/AGENT_INSTRUCTIONS.md tools/watchdog/AGENT_GOALS.md
git commit -m "docs: update all generator path references for tools/generators reorg"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Grep for any remaining stale references**

Run: `grep -rn "tools/generate_[a-z]" --include="*.py" --include="*.md" . | grep -v "tools/generators/"`
Run: `grep -rn "from lib\.\|from tools\.lib\." --include="*.py" tools/`
Expected: Zero hits (all references updated)

- [ ] **Step 2: Run framework tests**

Run: `rtk python -m pytest tools/generators/tests/ -v`
Expected: All tests pass

- [ ] **Step 3: Spot-check generator status commands**

Run: `rtk python tools/generators/generate_entity_sprites.py status`
Run: `rtk python tools/generators/generate_backgrounds.py status`
Run: `rtk python tools/generators/scan_content_gaps.py --help`
Expected: No import errors in any

- [ ] **Step 4: Verify tools/ root is clean**

Run: `ls tools/*.py`
Expected: Only `db_dump_restore.py`, `refresh_dump.py`, `toggle_db.py`, `test_helpers.py` remain

- [ ] **Step 5: Final commit if any stragglers found**

```bash
git add -A
git commit -m "chore: final cleanup for generator reorg"
```
