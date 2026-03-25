# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/TODO.md for active work. See docs/SESSION_STATE.md for current status.
Branch: main
All tests green (853+457+368+76 passing, 0 failures). Migration consolidation complete (001-003).
Current: Documentation cleanup & consolidation.
```

---

## Active Work — Documentation Cleanup & Consolidation

### Documentation Cleanup & Consolidation
- [ ] Investigate SDD frameworks (Open Spec) for documentation format
- [ ] Consolidate and deduplicate docs (merge overlapping specs, remove stale files)
- [ ] Update user guides, API reference, admin docs

---

## Backlog — Watchdog v2 Review

### Watchdog v2 — Overnight Quality Improvement (2026-03-24)
v1 ran all generators but produced template/generic data. v2 is a quality improvement pass with direct DB updates (no generators).

- [x] Built watchdog infrastructure (WATCHDOG_AUTO.ps1, START/STOP scripts)
- [x] Ran v1 overnight — all 3,936 entities populated, 87/103 goals passed
- [x] Audited v1 results — identified quality issues (template lore, identical BGs, null music)
- [x] Built v2 with quality gates, content sampling, template detection
- [x] Updated AGENT_INSTRUCTIONS.md — audit-first, keep good/replace bad, direct SQL
- [x] Updated AGENT_GOALS.md — 129 goals with quality checks, lore data chain docs
- [ ] **Run v2 tonight** — launch via `powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1`
- [ ] **Review v2 results in AM** — run STOP script, check goals scorecard, spot-check content
- [ ] **Visual verification** — Admin Asset Viewer + Chrome DevTools on all combat surfaces
- [ ] **Iterate if needed** — update watchdog docs, run v3 if quality still insufficient

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

## Backlog — Code Quality

- [ ] Break god-class files into focused modules (identify top offenders by LOC)
- [ ] Remove dead code, unused imports, commented-out blocks
- [ ] Standardize error handling patterns across backend routes
- [ ] Audit and fix any remaining `sys.path` hacks outside generators
- [ ] Type hints: add missing annotations to backend services and routes
- [ ] Code documentation, like to the requirements this matches to.
- [ ] Add missing test coverage for critical paths

---

## Backlog — Cloud Deployment Prep

- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-25 (All tests green. Test health complete. Next: documentation cleanup & consolidation.)*
