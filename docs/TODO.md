# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## 🚀 Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/TODO.md for active work. See docs/SESSION_STATE.md for current status.

Completed (2026-03-22):
- Simulation & Progression Balancing (Phases 1-6)
- Spoofing Lockdown (full stack auth bypass removal)
- Combat Scaling Alignment (idle training + boss HP + per-scene max_enemy_hp)
- Admin Players list enhancement (character name, level, story progress)

Next priority: banner visuals, entity sprites, generators, cloud deployment.
```

---

## Combat Scaling — Remaining Work

### Entity sprite population
- [ ] **Replace default sprite keys** — all entities currently use type-based defaults (`enemy_creature`, `enemy_manifestation`, etc). Need real sprite assignments or a sprite generation pipeline.

---

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
- [ ] **Longer music loops** — current 8-bit synth sequences are too short and become repetitive/annoying quickly. Target 2-3 minutes per loop minimum.
  - Update music definition JSON schemas to support longer sequences
  - Update `generate_8bit_music.py` generator to produce longer compositions (more variation, sections, transitions)
  - Review all 21 atmosphere music definitions and extend/regenerate as needed
  - *(Discovered during E2E Session 7 — audio testing)*

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

*Updated: 2026-03-22 (Spoofing lockdown + combat scaling alignment COMPLETE. Next: banner visuals, generators, cloud.)*
