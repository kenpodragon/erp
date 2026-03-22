# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## 🚀 Resume Prompt (Copy & Paste to Start Next Session)
```
Simulation & Progression Balancing is COMPLETE (Phases 1-6).
Casual: 59.53h (target: 60h). Migration 062 applied. API bot validated.

Next priority: Spoofing Lockdown (see CRITICAL section below).
After that: remaining TODO items (combat scaling polish, music loops, etc).
```

---

## Simulation & Progression Balancing
*(Phases 1-6 complete — see `done/DONE.md`. Toolkit: `docs/inst/SIM_TOOLKIT_GUIDE.md`)*
- [x] **Phase 5:** Results tooling, migration generator, toolkit guide
- [x] **Phase 6:** First iteration run — casual hits **59.53h** (target: 60h)
  - [x] Math model baseline (scene-based HP fix + XP tuning)
  - [x] Two tuning passes (v1: 43.59h too fast → v2: 59.53h on target)
  - [x] Generate migration 062 (`db/062_balanced_game_configs.sql`)
  - [x] Apply migration 062 to dev DB (6 UPDATEs verified)
  - [x] API bot validation (5/5 scenes, 0 errors, ~31s/scene combat)

---

## Combat Scaling — Remaining Work

### Per-scene max HP override (optional, low priority)
- [ ] **Per-scene or per-chapter `max_enemy_hp` override** — the global formula-based cap (`max_scene_base_hp` × `scene_hp_multiplier`, implemented in backend) works as a safety net. Boss scenes or special encounters may eventually need custom overrides. Options: column on `chapters` table, or per-scene override in `scene_gameplay_data`. Not urgent — global cap is sufficient for now.

### Entity sprite population
- [ ] **Replace default sprite keys** — all entities currently use type-based defaults (`enemy_creature`, `enemy_manifestation`, etc). Need real sprite assignments or a sprite generation pipeline.

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
- [ ] Documentation final check - update user guides, manuals, etc... collapse the db merges back into 3 files (seeds to generic seeds).

### Cloud Deployment
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-22 (Simulation toolkit COMPLETE. Casual 59.53h. Migration 062 applied. API bot validated. Next: spoofing lockdown.)*
