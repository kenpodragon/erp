# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

---

## Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/project/TODO.md for active work. See docs/project/SESSION_STATE.md for current status.
Branch: main
All tests green (853+457+368+76 passing, 0 failures).
Watchdog v3 ready to run: tools/watchdog/ (AGENT_INSTRUCTIONS.md, AGENT_GOALS.md)
Launch: powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1
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
- [ ] Consolidate and deduplicate docs (merge overlapping specs, remove stale files)
- [ ] Update user guides, API reference, admin docs

---

## Backlog — Code Quality

- [ ] Break god-class files into focused modules (identify top offenders by LOC)
- [ ] Remove dead code, unused imports, commented-out blocks
- [ ] Standardize error handling patterns across backend routes
- [ ] Audit and fix any remaining `sys.path` hacks outside generators
- [ ] Type hints: add missing annotations to backend services and routes
- [ ] Code documentation, link to the requirements this matches to.
- [ ] Add missing test coverage for critical paths

---

## Backlog — Cloud Deployment Prep

- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-25 (Watchdog v3 ready — full content regeneration with real quality gates. Run tonight.)*
