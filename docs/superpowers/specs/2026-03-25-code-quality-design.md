# Code Quality Overhaul — Design Spec

**Date:** 2026-03-25
**Goal:** Make the ERP codebase maintainable, approachable, and forkable for open-source contributors.
**Approach:** Test-First, Bottom-Up (Approach A) — audit and harden tests before any refactoring.

---

## Decisions

- **Priority:** Maintainability first, then DB audit, DX, docs.
- **Breaking changes:** Allowed. Clean breaks, new folder structures, updated imports. No backward-compat shims.
- **DB optimization:** Audit notes collected during refactoring; actual schema changes deferred to a follow-up spec.
- **Admin app:** Included at same priority as backend/frontend.
- **Test stance:** Deep audit first. No refactoring until behavioral test coverage exists for the target file.

---

## Phase 1 — Test Audit & Hardening

### Step 1: Test Classification Audit

Classify every test file across all four suites (backend 853, frontend 457, admin 368, E2E 76) into:

| Category | Definition | Example |
|----------|-----------|---------|
| **Behavioral** | Tests real logic, data flow, state transitions | "creating a character with duplicate name returns 409 and doesn't insert" |
| **Shallow** | Checks status code or basic shape, mocks away the interesting parts | "POST /characters returns 200" |
| **Structural** | Tests component renders without crashing, snapshot tests | "CombatStage renders without error" |

**Deliverable:** `docs/superpowers/specs/test-audit-report.md` — every god-class file, its current test coverage category, and what behavioral tests are missing.

### Step 2: Hardening Priority

Only write new tests for files we're about to refactor in Phase 2. Priority order:

**Backend (top 4):**
1. `routes/story_mode.py` (1,833 lines) — combat flow, scene transitions, boss encounters
2. `services/admin_character_service.py` (1,506) — character CRUD, validation, progression
3. `routes/admin_game.py` (1,453) — game config, entity management
4. `services/admin_content_service.py` (1,391) — content CRUD, bulk operations

**Frontend (top 4):**
5. `game/components/story/CombatStage.tsx` (715) — combat state machine, animations, damage calc display
6. `game/components/story/BossStage.tsx` (692) — boss phase transitions, interrupt mechanics
7. `game/components/StoryMode.tsx` (567) — scene navigation, story state
8. `game/components/BottomAnimatedBanner.tsx` (583) — entity rendering, animation lifecycle

**Admin (top 4):**
9. `pages/AssetRegistry.tsx` (750) — asset CRUD, filtering, bulk operations
10. `pages/PlayerDetail.tsx` (706) — player data display, modal interactions
11. `pages/AtmosphereEditor.tsx` (672) — atmosphere config editing
12. `pages/ContentEditor.tsx` (603) — content management flows

### Step 3: Test Style

- Follow existing patterns (pytest for backend, Vitest + RTL for frontend/admin)
- Focus on: state transitions, edge cases, integration boundaries
- No new test infrastructure or frameworks

---

## Phase 2 — God-Class Decomposition

### Backend Decomposition

**Pattern:** Extract by responsibility. Each god-file becomes a folder with `__init__.py` that defines the module's public API (not a backward-compat shim — this is the permanent interface). All consumers update their imports to use the new module paths.

**`routes/story_mode.py` (1,833 lines) -> `routes/story/`**
- `combat.py` — combat loop, damage resolution, turn logic
- `scenes.py` — scene navigation, progression, unlocks
- `bosses.py` — boss encounters, phase transitions, interrupt mechanics
- `rewards.py` — loot, XP, post-battle summary
- `__init__.py` — re-exports router, mounts sub-routers

**`services/admin_character_service.py` (1,506 lines) -> `services/character/`**
- `crud.py` — create, read, update, delete operations
- `progression.py` — leveling, stat calculations, skill unlocks
- `validation.py` — input validation, business rules
- `__init__.py` — re-exports service functions

**`routes/admin_game.py` (1,453 lines) -> `routes/admin/game/`**
- Extract shared CRUD boilerplate into `utils/crud_helpers.py` (the 129 duplicate blocks)
- Split remaining by domain: `entities.py`, `items.py`, `configs.py`, `scaling.py`

**`services/admin_content_service.py` (1,391 lines) -> `services/content/`**
- Split by content domain: `lore.py`, `sprites.py`, `backgrounds.py`, `bulk_ops.py`

**Shared extraction:** 500+ duplicate CRUD blocks across admin routes get consolidated into `utils/crud_helpers.py` with generic patterns for entity lookup -> validation -> commit -> response.

### Frontend Decomposition

**Pattern:** Extract logic into custom hooks, split rendering into sub-components.

**`CombatStage.tsx` (715 lines, 12 useState, 11 useEffect)**
- `useCombatState.ts` — custom hook for combat state machine
- `useCombatAnimations.ts` — animation lifecycle, projectile management
- `CombatHUD.tsx` — HP bars, damage numbers, status effects
- `CombatStage.tsx` — slim orchestrator composing the above

**`BossStage.tsx` (692 lines)**
- `useBossPhases.ts` — phase transitions, interrupt windows
- `BossStage.tsx` — rendering only, delegates logic to hook

**`StoryMode.tsx` (567 lines)** and **`BottomAnimatedBanner.tsx` (583 lines)**
- Same pattern: extract hooks for state/logic, keep component as renderer

### Admin Decomposition

**Pattern:** Custom hooks for form state, sub-components for page sections.

**`AssetRegistry.tsx` (750 lines, 22 useState)**
- `useAssetFilters.ts` — filter/search state
- `useAssetOperations.ts` — CRUD operations, bulk actions
- `AssetTable.tsx` — table rendering
- `AssetRegistry.tsx` — page layout composing the above

**`PlayerDetail.tsx` (706 lines, 7 modal imports)**
- Extract each modal interaction into its own component
- `usePlayerData.ts` — data fetching, refresh logic
- `PlayerDetail.tsx` — slim page layout

**`AtmosphereEditor.tsx` (672 lines, 17 useState)** and **`ContentEditor.tsx` (603 lines)**
- Same pattern: form hook + section sub-components

### Rules During Decomposition

- Dead code encountered in a file gets removed during its split
- Error handling in each module gets standardized to specific-exception-first pattern
- DB audit notes: any suspicious query or table reference gets logged in the audit report
- Every split verified by running the full test suite before moving to the next file

---

## Phase 3 — Broad Sweep

Everything not caught during Phase 2's per-file cleanup:

### Dead Code Removal
- `main.py`: 48 unused imports (stale route/auth modules)
- 1,144+ commented-out lines across 146 backend files — remove all
- Unused test helpers, stale fixture functions

### `sys.path` Hacks
- Audit all `sys.path` manipulation outside of `tools/generators/`
- Replace with proper relative imports or package configuration

### Frontend Cleanup
- Replace nested ternaries in `CombatStage` (15 instances) and `PostBattleSummary` (4 instances) with helper functions or early returns
- Reduce prop drilling in worst 75 files — introduce context providers or custom hooks where props pass through 3+ levels
- Clean unused exports

### Error Handling Standardization
- Backend pattern: specific exception -> log -> HTTP error response. Generic `except Exception` only as outermost fallback with proper logging
- Audit the 64 generic handlers (minus test files) — convert to specific where possible
- Frontend: consistent error boundary usage, standardized API error handling pattern

### Type Hints
- Backend already at <1% missing — fill remaining gaps in god-class service functions
- No bulk annotation effort

---

## Phase 4 — Documentation & DB Audit Report

### Code Documentation
- Each new module gets a module-level docstring: what it does, what it depends on, which spec it maps to
- Each new folder gets a brief `README.md` explaining module responsibility and file relationships
- No inline comment spam — only where logic isn't self-evident

### DB Audit Report
- Delivered as: `docs/superpowers/specs/db-audit-report.md`
- Contents:
  - Dead tables (referenced nowhere in code)
  - Empty-but-needed tables (referenced in code, just unpopulated)
  - Unused columns
  - Normalization opportunities
  - Index recommendations
  - Schema improvement proposals
- Filed as a new TODO item for a follow-up spec/implementation cycle

### Updated Project Files
- `TODO.md` — check off code quality backlog, add DB optimization as next backlog item
- `DONE.md` — record accomplishments with commit references
- `AGENTS.md` — update directory structure section to reflect new module organization

---

## Phase 5 — Validation

- Full test suite run (all 4 suites green)
- Verify no import breakage across backend, frontend, admin
- Spot-check Docker builds still work
- Final dead code scan
- Git log review — clean commit history telling the refactoring story

---

## Audit Data (from initial exploration)

### Backend — Top Offenders by LOC
| File | Lines | Key Issues |
|------|-------|------------|
| `routes/story_mode.py` | 1,833 | 62 commented lines, 13 unused imports |
| `services/admin_character_service.py` | 1,506 | Multi-responsibility service |
| `routes/admin_game.py` | 1,453 | 129 duplicate CRUD blocks |
| `services/admin_content_service.py` | 1,391 | Multi-domain content service |

- 69 files >300 lines, 10 files >1,000 lines
- 1,144+ commented lines total
- 500+ duplicate CRUD blocks
- Type hints: <1% missing (solid)
- Error handling: 64 generic handlers, 54 specific, 1 bare except

### Frontend — Top Offenders by LOC
| File | Lines | useState | useEffect | Key Issues |
|------|-------|----------|-----------|------------|
| `AssetRegistry.tsx` | 750 | 22 | 4 | Critical: 22 independent state vars |
| `CombatStage.tsx` | 715 | 12 | 11 | Tight coupling, 15 nested ternaries |
| `PlayerDetail.tsx` | 706 | 14 | 2 | 7 modal imports |
| `BossStage.tsx` | 692 | — | — | Logic/rendering not separated |
| `AtmosphereEditor.tsx` | 672 | 17 | 2 | 17 state vars, multiple concerns |

- 81 files >250 lines
- 75 files with heavy prop drilling
- 155 files using useState-only (no custom hook abstraction)
- Naming conventions and test file co-location are consistent (good)

---

## Scope Exclusions

- **DB schema changes** — audit only, changes deferred to follow-up spec
- **New test frameworks** — use existing pytest/Vitest/RTL/Playwright
- **tools/generators/** — exempt from `sys.path` cleanup (established convention)
- **Watchdog v3** — separate workstream, not part of this quality pass
