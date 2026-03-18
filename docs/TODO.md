# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## Simulation & Progression Balancing
*(Separate from E2E User Testing — long-duration timing tests with stopwatch metrics)*
- [ ] Needs full breakdown and plan with session tracking
- [ ] Test timing on Books and idle skill training — ramp feel, challenge, skill impact
- [ ] Compare clicking + WPM display speed vs 1x reading speed → capture metrics (stopwatch)
- [ ] Test regular progression (default stats/no gear vs max stats/max gear)
- [ ] By Book 2: player should be at a specific level with specific passive skills — validate
- [ ] Target: 2 hours/day active play → complete game in 30 calendar days (60 hours total for 3 books)
- [ ] Analyze power-gamer path: 24/7 optimized farming, all boosts, max speed
- [ ] Produce initial scaling defaults → migration 062 SQL script

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

*Updated: 2026-03-18 (E2E testing complete — moved to DONE.md. Simulation & Progression Balancing is next active work.)*
