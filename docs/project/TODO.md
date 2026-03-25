# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

---

## Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/project/TODO.md for active work. See docs/project/SESSION_STATE.md for current status.
Branch: main
All tests green (875+554+412+76 = 1,917 passing, 0 failures).
Watchdog v3 still pending — run when ready: powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1
Code Quality Phase 1 DONE — test audit + 87 new tests hardening 12 god-classes.
NEXT: Code Quality Phase 2 — god-class decomposition. Design spec at docs/superpowers/specs/2026-03-25-code-quality-design.md. Start with backend story_mode.py (1,833 lines → routes/story/).
```

---

## Active Work — Watchdog v3 Content Regeneration

### Watchdog v3 — Overnight Full Content Regeneration
v1 populated all data, v2 passed 129/129 structural goals but content was garbage (blob sprites, template lore). v3 is a full content regeneration with real quality gates.
- [ ] **Run v3 tonight** — `powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1`
- [ ] **Review v3 results in AM** — run STOP script, check goals scorecard, spot-check content
- [ ] **Visual verification** — Admin Asset Viewer + Chrome DevTools on all combat surfaces
- [ ] **Iterate if needed** — update watchdog docs, run v4 if quality still insufficient

### Post-Watchdog Verification
- [ ] Admin Asset Viewer review — entity sprites, item sprites, backgrounds, achievement icons
- [ ] BottomAnimatedBanner — enemy renders at level 1/20/40/70/90
- [ ] CombatStage — attack animations, projectile colors, impact effects
- [ ] BossStage — boss entity scale, attack cycling, interrupt rendering
- [ ] InventoryPanel — paper doll with armor overlays
- [ ] ActiveTrainingSimulator — idle entities with skill themes

### Finalization (after quality is confirmed)
- [ ] Migration 069 — NOT NULL constraints on entity_gameplay_data visual columns
- [ ] Final gap scan: `python tools/generators/scan_content_gaps.py --verbose` → 0 gaps
- [ ] Update DONE.md with full watchdog completion

---

## Backlog — Documentation Cleanup
- [ ] Update user guides, API reference, admin docs
- [ ] Security scan and assessment

---

## Active Work — Code Quality Phase 2: God-Class Decomposition (NEXT)

Design spec: `docs/superpowers/specs/2026-03-25-code-quality-design.md`
Phase 1 plan: `docs/superpowers/plans/2026-03-25-code-quality-phase1.md` (DONE)

### Phase 1 — Test Audit & Hardening (DONE)
- [x] Test audit report — classified all 12 god-class test coverage
- [x] Backend: 22 new tests for story_mode (upgrade, skill, get_session endpoints)
- [x] Frontend: 107 new component tests (CombatStage 26, BossStage 27, StoryMode 25, BottomAnimatedBanner 29)
- [x] Admin: 72 new component tests (AssetRegistry 20, PlayerDetail 30, AtmosphereEditor 22; ContentEditor already had 31)

### Phase 2 — God-Class Decomposition (NEXT — needs Phase 2 plan)
- [ ] Backend: `routes/story_mode.py` (1,833 lines) → `routes/story/` module
- [ ] Backend: `services/admin_character_service.py` (1,506 lines) → `services/character/`
- [ ] Backend: `routes/admin_game.py` (1,453 lines) → `routes/admin/game/` + `utils/crud_helpers.py`
- [ ] Backend: `services/admin_content_service.py` (1,391 lines) → `services/content/`
- [ ] Frontend: `CombatStage.tsx` (715) → custom hooks + sub-components
- [ ] Frontend: `BossStage.tsx` (692) → useBossPhases hook + renderer
- [ ] Frontend: `StoryMode.tsx` (567) → hooks + renderer
- [ ] Frontend: `BottomAnimatedBanner.tsx` (583) → hooks + renderer
- [ ] Admin: `AssetRegistry.tsx` (750) → useAssetFilters + useAssetOperations + AssetTable
- [ ] Admin: `PlayerDetail.tsx` (706) → usePlayerData + modal extraction
- [ ] Admin: `AtmosphereEditor.tsx` (672) → form hook + section components
- [ ] Admin: `ContentEditor.tsx` (603) → tab extraction

### Phase 3 — Broad Sweep (after Phase 2)
- [ ] Remove dead code: `main.py` 48 unused imports, 1,144+ commented lines across backend
- [ ] Fix `sys.path` hacks outside `tools/generators/`
- [ ] Replace nested ternaries in CombatStage (15) and PostBattleSummary (4)
- [ ] Reduce prop drilling in 75 files via custom hooks/context
- [ ] Standardize error handling (64 generic handlers → specific exceptions)
- [ ] Fill remaining type hint gaps

### Phase 4 — Documentation & DB Audit Report (after Phase 3)
- [ ] Module-level docstrings + folder READMEs for new modules
- [ ] DB audit report: dead tables, unused columns, normalization opportunities → new TODO
- [ ] Update TODO.md/DONE.md, AGENTS.md directory structure

### Phase 5 — Validation (after Phase 4)
- [ ] Full test suite green, Docker builds verified, clean git history

## Backlog — Pre-launch bits.
- [ ] Remove Lore and Inpsiration documents, ERP specific lore bits from the documentation (should be generic and apply to anyone who is building this). This is a pass to be done once the generators are completed.
- [ ] Remove the TODO, DONE, and SESISON_STATE, from teh repo. CLean up AGENTS CLAUDE, GEMINI. Remove the db old.
- [ ] Update README.md to contain more relevant information about the project, quick install guide (and link to the deeper ADMIN setup guide).


---

## Backlog — Cloud Deployment Prep

- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-25 (Code Quality Phase 1 complete — 87 new tests, 1,841 total passing. Phase 2 decomposition next.)*
