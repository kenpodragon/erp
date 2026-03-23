# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## 🚀 Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/TODO.md for active work. See docs/SESSION_STATE.md for current status.
Next priority: entity gameplay data generator, sprite generators, visual verification.
Spec: docs/superpowers/specs/2026-03-22-banner-visual-system-design.md
Plan: docs/superpowers/plans/2026-03-22-banner-visual-system.md
```

---

## Banner Visual System — Phase 7 (Generators + Finalization)

### Entity Data Population
- [ ] **Entity gameplay data generator** (`tools/generate_entity_gameplay.py`) — populate all 3,936 entities with movement_type_id, size_class_id, animation_style_id, silhouette_type_id, colors, attack type slots. AI-assisted inference from entity descriptions.
- [ ] **Entity type visual defaults** — creature→ground/stalk/quadruped, manifestation→hover/pulse/orb, etc.
- [ ] **Entity family seeder** (`tools/seed_entity_families.py`) — populate entity_families table (wraiths, demons, beasts, elementals, undead, constructs, humanoids)

### Sprite Generators
- [ ] **Entity sprite generator** (`tools/generate_entity_sprites.py`) — procedural asset_registry entries from silhouette + colors + size
- [ ] **Item sprite generator** (`tools/generate_item_sprites.py`) — paper doll layer sprites for armor_class × gear_slot × rarity, weapon sprites, inventory icons
- [ ] **Projectile sprite generator** (`tools/generate_projectile_sprites.py`) — projectile asset_registry entries per attack_type

### Finalization
- [ ] **Migration 069** — NOT NULL constraints on entity_gameplay_data after generator populates. Migrate entity_attack_types → primary/secondary/tertiary. Drop entity_attack_types table.
- [ ] **Visual verification** — Test at level 1/20/40/70/90: banner enemy count, death rate, gear rendering, attack animations. Verify consistency across all 4 surfaces.

---

## Combat Scaling — Remaining Work

### Entity sprite population
- [ ] **Replace default sprite keys** — all entities currently use type-based defaults (`enemy_creature`, `enemy_manifestation`, etc). Sprite generators above will handle this.

---

## Future Work

### Generators
**NOTE:** Go through requirements definition first. Ask questions, fill out details, iterate on design + schema before coding. So I want these to be able to be used by other folks to add content into the DB and generate as appropriate. However, these should be built so that they are python scripts (under tools), but could be run by agentic AI to send generated content to the DB and seed things. So things like get status, remaining items, update, edit, fetch view, should all be considered as inputs (almost like mini API/MCP bits without the MCP bits - just a script the AI can call to do a lot of the heavy lifting and interfacing - or a person).
- [ ] Read `0_REQUIREMENTS.md` → capture generator requirements → build out recs/design/schema docs
- [ ] Ensure all necessary generators are listed (check for gaps in existing data)
- [ ] **Longer music loops** — current 8-bit synth sequences are too short and become repetitive/annoying quickly. Target 2-3 minutes per loop minimum.
  - Update music definition JSON schemas to support longer sequences
  - Update `generate_8bit_music.py` generator to produce longer compositions (more variation, sections, transitions)
  - Review all 21 atmosphere music definitions and extend/regenerate as needed
  - *(Discovered during E2E Session 7 — audio testing)*

#### Cosmetic Asset Generation *(Ref: 3.3 §19)*
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

*Updated: 2026-03-23 (Banner Visual System Phase 1-5 COMPLETE. Next: generators, sprite population, visual verification.)*
