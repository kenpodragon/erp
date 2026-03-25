# ERP Project — Session State

**Last updated:** 2026-03-24
**Last session focus:** Migration consolidation (061-068 → 001-003) + production readiness

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
| **Watchdog v2 (Quality)** | **Not yet run** | Quality improvement pass — audit/keep/replace workflow (2026-03-24) |

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

## Generator Reorg (2026-03-24) — Complete

- Moved 21 scripts + 4 lib modules + 4 tests from `tools/` root → `tools/generators/`
- Deleted one-off `generate_migration_040.py`
- Replaced all `sys.path.insert()` hacks with proper package imports
- Updated `.gitignore`, all docs, watchdog imports
- 8 clean commits on main
- `tools/` root now contains only: `db_dump_restore.py`, `refresh_dump.py`, `toggle_db.py`, `test_helpers.py`

## What's Left (see TODO.md)

### Immediate — Watchdog v2 Review
1. Review v2 results in AM (STOP script shows scorecard)
2. Visual verification via Asset Viewer + Chrome DevTools
3. Iterate if needed (v3)

### Near-term — Production Readiness
1. Code quality: break god-class files, remove dead code, standardize patterns
2. Documentation: consolidate docs, remove stale files
3. Test health: triage 25+3 pre-existing failures, target zero known failures
4. Test fresh DB spin-up from 001-003 only
5. Migration 069 (NOT NULL constraints after quality confirmed)

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

## Test Status

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | ~766 | 25 pre-existing failures (test_2_6_features, test_stripe_e2e) |
| Frontend (vitest) | 457 | All passing (1 skipped) |
| Admin (vitest) | 368+ | All passing |
| Generator (pytest) | 76 | 73 passing, 3 pre-existing (ai_provider retry/fallback) |
| E2E (Playwright) | 5 | Needs Firebase auth update |

## Branch Status

- **main:** Migration consolidation complete. Watchdog v2 not yet run.
