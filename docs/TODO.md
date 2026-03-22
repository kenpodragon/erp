# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## 🚀 Resume Prompt (Copy & Paste to Start Next Session)
```
Read these files in order:
1. docs/SIM_PROC_BAL_SESSION_STATE.md — current state and progress
2. docs/specs/2026-03-20-simulation-toolkit-design.md — full spec
3. docs/plans/2026-03-20-simulation-toolkit-plan.md — implementation plan

We are building the Simulation & Progression Balancing Toolkit.
Phases 1 (API Docs), 2 (Math Model), and 3 (API Bot) are complete.
Use superpowers:subagent-driven-development to execute the plan task-by-task.
Continue with Phase 4 (Browser Bot) — build the Playwright headless bot for stability, pacing, and load testing.
The Docker stack should already be running. If not, start it: docker-compose up --build -d
```

---

## Simulation & Progression Balancing
*(Automated via simulation toolkit — see spec & plan below)*
- [x] Full breakdown and plan with session tracking
  - Spec: `docs/specs/2026-03-20-simulation-toolkit-design.md`
  - Plan: `docs/plans/2026-03-20-simulation-toolkit-plan.md`
  - Session state: `docs/SIM_PROC_BAL_SESSION_STATE.md`
- [x] **Phase 1:** Generate API documentation (`docs/inst/API_REFERENCE.md`, `admin/docs/API_GUIDE.md`)
- [x] **Phase 2:** Build math model (`tools/sim/math_model.py`) — formulas, archetypes, wall detection, boss gating
- [x] **Phase 3:** Build API bot (`tools/sim/api_bot.py`) — async client, bot runner, comparison tool (21 tests)
- [x] ~~**Phase 4:** Build browser bot (`tools/sim/browser_bot.py`) — stability, pacing, load testing~~ **OBE** — Browser validation test (Playwright MCP) confirmed API bot produces identical server-side results to the frontend. A separate browser bot is unnecessary; the API bot faithfully replicates all gameplay mechanics. See `tools/sim/browser_validation.py` for the validation script.
- [ ] **Phase 5:** Results tooling, migration generator, toolkit guide
- [ ] **Phase 6:** First iteration run — baseline → validate → tune until casual hits 60hr target
- [ ] Produce final scaling defaults → migration 062 SQL script

**Resume prompt for new session:**
```
Read these files in order:
1. docs/SIM_PROC_BAL_SESSION_STATE.md — current state and progress
2. docs/specs/2026-03-20-simulation-toolkit-design.md — full spec
3. docs/plans/2026-03-20-simulation-toolkit-plan.md — implementation plan

We are building the Simulation & Progression Balancing Toolkit.
Phases 1 (API Docs), 2 (Math Model), and 3 (API Bot) are complete.
Use superpowers:subagent-driven-development to execute the plan task-by-task.
Continue with Phase 4 (Browser Bot) — build the Playwright headless bot for stability, pacing, and load testing.
The Docker stack should already be running. If not, start it: docker-compose up --build -d
```

---

## 🐛 Combat Scaling Bugs (Found during browser validation — 2026-03-22)

### Bug 1: No inter-scene wave HP scaling — FIXED
- [x] **Wave 1 mobs now scale by scene position** — added `scene_hp_multiplier` to `/scenes/{id}/enemies`. Formula: `1.0 + (scene_position - 1) × 0.02`. Scene 1 = 1.0x, Scene 33 = 1.64x, Scene 580 = ~12.6x. A level 1 character jumping to the final book should be completely walled by HP scaling.
  - Backend: `backend/routes/story_mode.py` — `get_scene_enemies()` applies scene progression scaling
  - Frontend: `frontend/src/game/components/story/CombatStage.tsx` — now uses server `base_hp` instead of local `zoneHp()` recalculation
  - New game_config keys: `scene_hp_scaling_per_scene` (default 0.02), `scene_gold_scaling_per_scene` (default 0.015)

### Bug 2: No mob HP variation — confirmed data gap, not code bug
- [x] **Code path verified working** — set all entities to 9999 HP, confirmed API returns 9999 and scene scaling applies correctly on top (scene 25 → 16,398 HP). Reverted test data.
- [ ] **Seed `entity_gameplay_data` for all entities** — 3,936 entities exist but only 4 have `base_hp` populated (Rust Guardian 300, Cosmic Remnant 200, Sludge Stalker 100, Ether Voidling 50). All others use fallback. Need to generate rows with varied `base_hp`, `base_gold`, and `sprite_key` based on entity type and lore context.

### TODO: Determine max_base_hp cap per scene
- [ ] **Add `max_base_hp` cap per scene** — prevent overpowered entities from one-shotting the difficulty curve if bad data sneaks in (e.g., a 999,999 HP entity in Chapter 1 Scene 1).
  - **Design decision needed:** How to define the cap:
    - (a) Formula-based: `max_hp = base_cap × scene_hp_multiplier` where `base_cap` is a game_config (e.g., 500). Self-scaling, simplest.
    - (b) Per-chapter column: `chapters.max_enemy_hp` — manual control per chapter.
    - (c) Hybrid: formula default + per-scene override for boss scenes or special encounters.
  - **Implementation:** Clamp `hp = min(hp, max_hp_cap)` in `/enemies` after scene scaling.
  - **Tuning:** The cap values should come out of the Phase 6 simulation runs — the math model and API bot will identify what HP ranges feel right per scene tier.

*(Discovered during browser vs API bot validation — 2026-03-22)*

---

## ⚠️ CRITICAL: Post-Simulation Spoofing Lockdown
*(Must be done IMMEDIATELY after simulation testing is complete)*
- [ ] **Turn off user spoofing** — disable all dev/test auth bypass mechanisms
- [ ] **Verify spoofing is fully disabled** — test all external routes to confirm no spoofing endpoints are exposed
- [ ] **Security audit** — ensure no spoofing-related env vars, headers, or query params leak to production
- [ ] Remove or gate behind `DEV_ONLY` flag any admin spoofing utilities

---

## Music Loop Length Improvements
- [ ] **Longer music loops** — current 8-bit synth sequences are too short and become repetitive/annoying quickly. Target 2-3 minutes per loop minimum.
  - Update music definition JSON schemas to support longer sequences
  - Update `generate_8bit_music.py` generator to produce longer compositions (more variation, sections, transitions)
  - Review all 21 atmosphere music definitions and extend/regenerate as needed
  - Add to generator requirements docs (`docs/recs/`) when building out generator specs
- *(Discovered during E2E Session 7 — audio testing)*

---

## Banner Visual Improvements
- [ ] **Multiple enemies in banner** — currently only 1 enemy spawns at a time; should support packs/groups for visual variety
- [ ] **Attack animation differentiation** — entities in BottomAnimatedBanner should show attack-type-appropriate animations:
  - Flying entities → hovering/bobbing animation (vertical offset, wing flap cycle)
  - Magic entities → magic projectile effects (bolts, orbs, particle trails)
  - Melee entities → melee swing/slash animations (weapon arc, lunge)
  - Ranged entities → ranged attack projectiles (arrows, thrown weapons, trajectory arcs)
  - Combo types → blended animations (e.g., flying + ranged = aerial bombardment)
  - Currently all entities use the same idle skew wobble regardless of type
- [ ] **Player attack animations** — hero character should have visible attack animations (swing, cast, shoot) not just idle walk
- [ ] **Projectile assets & DB schema** — attack_types table needs columns for:
  - `projectile_sprite_key` — links to asset registry for projectile visual
  - `attack_animation_type` — enum (melee_swing, ranged_projectile, magic_cast, aoe_burst)
  - `hover_behavior` — boolean/config for flying entities (vertical offset, bob amplitude)
  - `projectile_speed`, `projectile_arc` — trajectory config
  - May need new `attack_projectiles` or `visual_attack_config` table
- [ ] **Projectile sprite generator** — new generator tool to produce pixel-art projectile sprites (arrows, fireballs, energy bolts, thrown weapons) for each attack type
- [ ] Depends on: `visual_behaviors.animation_config` from 5.3, attack_types table, asset registry
- *(Discovered during E2E Session 2 banner observation — expanded from original Session 7 plan)*

---

## Future Work

### Generators
**NOTE:** Go through requirements definition first. Ask questions, fill out details, iterate on design + schema before coding.
- [ ] Read `0_REQUIREMENTS.md` → capture generator requirements → build out recs/design/schema docs
- [ ] Ensure all necessary generators are listed (check for gaps in existing data)

### Cosmetic Asset Generation *(Ref: 3.3 §19)*
- [ ] Pixel-art skins, badges, flair, avatars — depends on `C_STORY_ASSET_GENERATORS.md` §8

### Structural Improvements
- [ ] Investigate SDD frameworks (Open Spec) — consider converting documentation
- [ ] Code bloat cleanup (break god-class files into modules)
- [ ] Code documentation — link to requirements, functional specs, inline comments

### Cloud Deployment
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-20 (Simulation toolkit spec & plan complete. Implementation is next active work.)*
