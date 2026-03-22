# ERP Project — Session State

**Last updated:** 2026-03-22
**Last session focus:** Spoofing lockdown, combat scaling alignment, admin players enhancement

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

## Database State

- **Migrations:** 001-063 applied to dev DB
- **Next available migration:** 064
- **Key recent migrations:**
  - 061: Entity gameplay data seed (3,936 entities)
  - 062: Balanced game configs (sim toolkit output)
  - 063: Per-scene max_enemy_hp column + early game HP caps

## What's Left (see TODO.md)

### Near-term
- Entity sprite population (replace defaults)
- Banner visuals (multiple enemies, attack animations, projectiles)

### Medium-term
- Generators (requirements definition, music loops, cosmetic assets)
- Structural improvements (code cleanup, docs)

### Long-term
- Cloud deployment (Firebase storage, free DB alternatives, Docker strategy)
- Home Base Hub remaining phases (2.7.1-2.7.4)

## Key Architecture Decisions (Recent)

- **Auth:** Firebase-only. All spoofing/bypass mechanisms removed 2026-03-22. E2E tests need Firebase Auth Emulator.
- **Combat HP formula:** `entity_base_hp * 1.012^(scene_position - 1)`, capped by per-scene `max_enemy_hp` or global `max_scene_base_hp`.
- **Idle training HP:** `100 * 1.012^(skillLevel - 1) * 1.08^(wave - 1)` — matches story mode scaling factor.
- **Boss HP:** Server-computed from DB entity data + scene position + `boss_config.hp_multiplier`.

## Test Status

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | ~340 | 2 pre-existing failures (admin_finance) |
| Frontend (vitest) | 410 | All passing |
| Admin (vitest) | 359 | All passing |
| E2E (Playwright) | 5 | Needs Firebase auth update |
