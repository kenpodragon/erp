# ERP Project — Session State

**Last updated:** 2026-03-26
**Last session focus:** Code Quality Phase 2 — Frontend decomposition started. CombatStage.tsx (715 lines) → 4 files: useCombatState, useCombatAnimations, CombatHUD, slim orchestrator. Next: BossStage.tsx.

---

## Current Project Status

| Area | Status | Notes |
|------|--------|-------|
| Story Mode (2.2) | Complete | PixiJS combat, narrative, upgrades, boss interstitials |
| Idle Training (2.3) | Complete | Skill training, essence, scaling aligned with story mode |
| Character & Progression (2.4) | Complete | Stats, skills, dream items, admin panel |
| Audio & Music (2.5) | Complete | Web Audio synthesis, 21 atmospheres, 17 SFX |
| Home Base Hub (2.7.0) | Complete | Artifact system, achievements, leaderboard cache |
| Simulation Toolkit | Complete | 6 phases, casual 59.53h target met |
| Spoofing Lockdown | Complete | Full stack auth bypass removal (2026-03-22) |
| Combat Scaling | Complete | Idle/story aligned, per-scene HP caps, boss HP from DB |
| Banner Visual System | Complete | Shared renderers, wave scaling, paper doll, attack anims (2026-03-23) |
| Generator Pipeline | Complete | 4 framework modules, 16 generators, 76 tests, AI mode (2026-03-23) |
| Admin Asset Viewer | Complete | Visual preview of all generated assets (2026-03-23) |
| Watchdog v1 (Overnight) | Complete | All data populated but low quality — template text, identical BGs (2026-03-24) |
| Generator Reorg | Complete | Moved to `tools/generators/`, proper package imports, sys.path hacks removed (2026-03-24) |
| Migration Consolidation | Complete | 061-068 merged into 001-003, archived to db/old/ (2026-03-24) |
| Test Health | Complete | All tests green: 875+554+412+76 passing, 0 failures (2026-03-25) |
| **Documentation Standardization** | **Complete** | OpenSpec (28 specs) + Diataxis (4 categories). 67 source files → 28 specs, 68 old files deleted (2026-03-25) |
| Watchdog v2 (Quality) | Complete | Ran overnight, 129/129 structural goals passed — but content still garbage (blobs, templates) (2026-03-25) |
| **Watchdog v3 (Regen)** | **Ready to run** | Full content regeneration — upserts, family body plans, story_beats lore, 84 visual quality goals (2026-03-25) |
| **Docs Consolidation** | **Complete** | 7 files consolidated: AGENTS, DEPLOY, INIT_INFRA, API docs, STYLE/ASSETS, TOOLS. ~74 lines dedup (2026-03-25) |
| **Code Quality Phase 1** | **Complete** | Test audit + 87 new tests hardening 12 god-classes. Safety net for Phase 2 decomposition (2026-03-25) |
| **Code Quality Phase 2** | **In Progress** | Backend DONE (4 god-classes→20 modules). Frontend: CombatStage DONE (715→4 files). Next: BossStage, StoryMode, BottomAnimatedBanner + 4 admin components (2026-03-26) |

## Database State

- **Consolidated migrations:** 001 (schema), 002 (system seed), 003 (sample content) — clean install for any new instance
- **Old migrations:** 004-068 archived in `db/old/` (001-060 previously consolidated, 061-068 merged this session)
- **Dev DB:** Has all 068 migrations applied (matches consolidated 001-003 content)
- **Next available migration:** 069 (NOT NULL constraints — after quality pass)
- **DB backups:** `tools/watchdog/erp_backup_20260324.dump` (pre-v1), `db/backups/pre_uat_2026-03-23.dump`
- **Key data counts (post-v1):**
  - 3,936 entities with gameplay data, sprite_keys, death_sfx_keys
  - 17 entity families (redistributed from 10)
  - 724 scenes with atmosphere_id, background_id, wave_configs
  - 139 backgrounds with parallax_config
  - 21 atmospheres with music_definitions
  - 85 death SFX presets in audio_configs
  - 111 achievement icons, 50 artifact icons in asset_registry

## Test Health (2026-03-25) — Complete

### Phase 1 hardening (this session)
- **Backend:** +22 tests for story_mode (upgrade, skill, get_session endpoints)
- **Frontend:** +107 tests — CombatStage (26), BossStage (27), StoryMode (25), BottomAnimatedBanner (29)
- **Admin:** +72 tests — AssetRegistry (20), PlayerDetail (30), AtmosphereEditor (22); ContentEditor already had 31

### Previous fixes
- **Frontend:** Type imports for interfaces (white screen), early-return-before-hooks in PaperDollRenderer + EntityRenderer, backend Docker port binding
- **Backend:** PIL→raw PNG, pytest.ini (integration marker + default exclusion), discovery response shape, websocket test, admin finance plan keys + column names, admin players field names
- **Generator:** Mock paths updated for reorg, non-SDK provider names force CLI path

### Current test counts
| Suite | Passed | Skipped | Deselected | Notes |
|-------|--------|---------|------------|-------|
| Backend (pytest) | 875 | 2 | 25 | 25 deselected = Stripe E2E (need live server + Firebase token) |
| Frontend (vitest) | 554 | 1 | — | act() warnings in stderr (non-blocking) |
| Admin (vitest) | 412 | — | — | All clean |
| Generator (pytest) | 76 | — | — | All clean |

## What's Left (see TODO.md)

### Pending — Watchdog v3 Content Regeneration
1. Run v3 — full content regeneration (sprites, lore, icons, backgrounds)
2. Review results — STOP script shows scorecard
3. Visual verification via Asset Viewer + Chrome DevTools
4. Migration 069 (NOT NULL constraints after quality confirmed)

### Active — Code Quality Phase 2: God-Class Decomposition
Design spec: `docs/superpowers/specs/2026-03-25-code-quality-design.md`
Phase 1 plan (DONE): `docs/superpowers/plans/2026-03-25-code-quality-phase1.md`

1. ~~Break `story_mode.py` (1,833 lines) → `routes/story/`~~ **DONE** — helpers, schemas, scenes, combat, rewards
2. ~~Break `admin_character_service.py` (1,506) → `services/character/`~~ **DONE** — crud, items, progression, timeline
3. ~~Break `admin_game.py` (1,453) → `routes/admin_game/`~~ **DONE** — configs, classes, skills, items, helpers
4. ~~Break `admin_content_service.py` (1,391) → `services/content/`~~ **DONE** — books, chapters, scenes, backgrounds, waves
5. Frontend/Admin: Extract custom hooks from 8 god-components
6. Broad sweep: dead code, error handling, type hints (Phase 3)
7. Documentation + DB audit report (Phase 4)

### Medium-term — Deployment prep
1. Cloud deployment strategy (Firebase, free DB alternatives)

### Long-term — Remaining features
1. Home Base Hub 2.7.1-2.7.4
2. Economy & Social (Phase 3)

## Key Architecture Decisions (Recent)

- **Migration consolidation:** 001 = full schema (all tables + FKs), 002 = system seed (configs, lookup tables, gear slots with paperdoll_layer), 003 = sample content (atmospheres, books, chapters, scenes). No Elysium-specific data in 001-003. Dead code removed (068 banner configs unused). 061-068 archived to `db/old/`.
- **Generator reorg:** All generators now in `tools/generators/` as a proper Python package. `sys.path` hacks replaced with `from tools.generators.lib.*` imports. Intra-lib uses relative imports (`from .cache import ...`).
- **Watchdog pattern:** PowerShell supervisor (WATCHDOG_AUTO.ps1) monitors Claude process, auto-restarts on crash/stall (20 min timeout, max 10 restarts).
- **v2 direct SQL over generators:** Generators add overhead and fall back to Python templates when AI fails. Direct SQL lets the AI agent craft content with full lore context and UPDATE immediately.
- **Quality > coverage:** Better to do 2,000 entities excellently than 3,936 with template text.
- **Auth:** Firebase-only. All spoofing/bypass mechanisms removed 2026-03-22.
- **Combat HP formula:** `entity_base_hp * 1.012^(scene_position - 1)`, capped per-scene or global `max_scene_base_hp`.
- **Test isolation:** Stripe E2E tests marked `@pytest.mark.integration`, excluded by default via `pytest.ini`. Run with `pytest -m integration` when live stack is available.

## Branch Status

- **main:** All tests green (864 backend + 554 frontend + 412 admin + 76 E2E). Code Quality Phase 2: backend done, CombatStage done, BossStage next. Watchdog v3 still pending.
