# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/TODO.md for active work. See docs/SESSION_STATE.md for current status.
Branch: main
Current: Watchdog v2 quality improvement pass (overnight). Review results in AM.
Watchdog steps will process tonight, so let's work on the near-term items.
```

---

## Active Work — AI Watchdog Quality Pass

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
- [ ] Final gap scan: `python tools/scan_content_gaps.py --verbose` → 0 gaps
- [ ] Update DONE.md with full generator pipeline + watchdog completion

---

## Near-Term — Structural & Deployment Prep

### Generator Directory Reorganization
- [x] Move generators from `tools/` root to `tools/generators/` subdirectory
- [x] Update imports in all generator scripts (tools.lib → generators.lib or relative)
- [x] Update GENERATOR_INSTRUCTIONS.md and GENERATOR_AI_RULES.md paths
- [x] Update AGENTS.md directory structure section
- [x] Verify all generator `status` commands still work post-move

### Documentation Cleanup & Consolidation
- [ ] Collapse DB migrations into clean seed scripts (keep game code + necessary seeds)
- [ ] Generic seed data for fresh DB spin-up — test from scratch
- [ ] Update user guides, API reference, admin docs
- [ ] Investigate SDD frameworks (Open Spec) for documentation format
- [ ] Link code to requirements — inline comments referencing docs/done/recs/ specs
- [ ] Remove unecessary files, documents, merge and consolidate, make produciton ready.
- [ ] Code bloat cleanup — break god-class files into modules


### Cloud Deployment Prep
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-24 (Watchdog v2 built, v1 results audited. Next: run v2 overnight, review AM.)*
