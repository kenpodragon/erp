# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

---

## Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/project/TODO.md for active work. See docs/project/SESSION_STATE.md for current status.
Branch: main
All tests green: 875 backend + 554 frontend + 412 admin + 76 E2E.
Code Quality Phase 4 DESIGN COMPLETE — bidirectional traceability, req IDs, ~488 file docstrings, ops docs audit.
NEXT: Write implementation plan, then execute 4-wave parallel approach.
Design spec at docs/superpowers/specs/2026-03-26-phase4-doc-audit-design.md.
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

## Active Work — Code Quality Phase 4: Documentation & DB Audit Report (NEXT)

Design spec: `docs/superpowers/specs/2026-03-25-code-quality-design.md`

### Phase 4 — Documentation & DB Audit Report
- [ ] Module-level docstrings (updating any of the document from code - review code, ensure documentation matches)
- [ ] DB audit report: dead tables, unused columns, normalization opportunities → new TODO
- [ ] Update TODO.md/DONE.md, AGENTS.md directory structure
- [ ] Update all userguides, manuals and other components with the final changes.


### Phase 5 — Validation (after Phase 4)
- [ ] Full test suite green, Docker builds verified, clean git history

## Backlog — Pre-launch bits.
- [ ] Review all the files about to be deleted and captuer lessons learne (DON, session memories, etc...).
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

*Updated: 2026-03-26 (Phase 3 COMPLETE — broad sweep done: dead code, error handling, ternaries, prop drilling all addressed. Phase 4 Documentation & DB Audit next.)*
