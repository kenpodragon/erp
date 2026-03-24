# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `done/DONE.md` to keep this file focused on active development.

---

## 🚀 Resume Prompt (Copy & Paste to Start Next Session)
```
Read docs/TODO.md for active work. See docs/SESSION_STATE.md for current status.
Branch: feature/generator-pipeline (merge to main when visual verification passes).
Next: AI-driven full population, death_sfx_key generation, visual verification.
Instructions: docs/inst/GENERATOR_INSTRUCTIONS.md
AI Rules: docs/inst/GENERATOR_AI_RULES.md
Admin Asset Viewer: admin/src/pages/AssetViewer.tsx + backend/routes/admin_visual.py
```

---

## Generator Pipeline — Active Work

### Step 1: AI-Driven Full Population (GENERATOR_AI_RULES.md)
Current data was generated with Python fallback (generic/repetitive). Need to regenerate with `--ai` mode for lore-appropriate, unique content.

**Process:** Follow `docs/inst/GENERATOR_AI_RULES.md` step-by-step:
1. Take DB backup: `python tools/db_dump_restore.py dump`
2. Reset fallback data where needed (NULL out visual columns to force regeneration)
3. Run each generator in phase order with `--ai` (see AI Rules doc for full sequence)
4. Verify: `python tools/scan_content_gaps.py --verbose` → 0 gaps (excluding known exceptions)
5. Review in admin Asset Viewer (`admin/src/pages/AssetViewer.tsx`)

### Step 2: Death SFX Key + Sound Generation
- [ ] **death_sfx_key for 3,936 entities** — AI-assisted assignment of SFX preset keys based on entity type, family, size, and description
- [ ] **Generate actual SFX presets** — extend `audio_configs` table with death SFX presets per entity family/type
- [ ] Cross-reference existing `audio_configs` SFX presets (17 rows) for valid keys

### Step 3: Visual Verification (All Combat Surfaces)
- [ ] **Admin Asset Viewer review** — screenshot each section, verify uniqueness + lore-appropriateness
- [ ] **BottomAnimatedBanner** — Test at level 1/20/40/70/90: enemy count scales, entities render with correct sprites/colors
- [ ] **CombatStage** — Attack animations per entity attack_type, projectile colors, impact effects
- [ ] **BossStage** — Boss entity at large scale, attack type cycling, interrupt rendering
- [ ] **ActiveTrainingSimulator** — Idle training entities with shared renderers, skill-based themes
- [ ] **InventoryPanel** — Paper doll preview with armor class overlays, weapon sprites

Use Chrome DevTools MCP or admin Asset Viewer (`backend/routes/admin_visual.py`) for verification.

### Step 4: Finalization
- [ ] **Migration 069** — NOT NULL constraints on entity_gameplay_data visual columns
- [ ] **Replace remaining 33 default sprite_keys** — re-run `generate_entity_sprites.py --ai`
- [ ] **Merge feature/generator-pipeline → main**
- [ ] **Update DONE.md** — move completed generator pipeline section

---

## Music and SFX Overhaul
- [ ] Generate death_sfx_key for 3,936 entities (generate sound effects as well)
- [ ] Update music definition JSON schemas to support longer sequences
- [ ] Update `generate_8bit_music.py` generator to produce longer compositions (more variation, sections, transitions)
- [ ] Review all 21 atmosphere music definitions and extend/regenerate as needed

---

## Future Work

### Generators (Framework Complete)
- [x] Generator framework built (`tools/lib/` — ai_provider, db_client, base_generator, cache)
- [x] 16 generators implemented with AI mode + Python fallback
- [x] Requirements consolidated in `C_STORY_ASSET_GENERATORS.md`
- [x] GENERATOR_INSTRUCTIONS.md + GENERATOR_AI_RULES.md written
- [x] Admin Asset Viewer built

#### Cosmetic Asset Generation *(Ref: 3.3 §19)*
- [ ] Pixel-art skins, badges, flair, avatars — `generate_cosmetics.py` (deferred, depends on Emporium)

### Structural Improvements
- [ ] Investigate SDD frameworks (Open Spec) — consider converting documentation
- [ ] Code bloat cleanup (break god-class files into modules)
- [ ] Code documentation — link to requirements, functional specs, inline comments
- [ ] Documentation final check — update user guides, manuals, collapse DB merges

### Cloud Deployment
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-23 (Generator pipeline complete. Next: AI-driven full population, death_sfx_key, visual verification.)*
