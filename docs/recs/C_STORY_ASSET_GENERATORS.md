# REC C: Game Asset Generators & Population Pipeline

This document defines the requirements for all specialized tools and automated pipelines used to generate, populate, and maintain game assets across the ERP system. Each generator is a Python CLI script under `tools/` that supports both **AI-assisted** (Claude/Gemini CLI) and **Python-fallback** generation modes.

Update generation and insertion/update instructions to (Ref: `docs/inst/GAME_ASSETS_GUIDE.md`)

---

## Generator Architecture (All Generators)

Every generator in this document follows a shared architectural pattern:

### Execution Modes
- **AI-Enhanced Mode** (`--ai`): Calls a local AI CLI (Claude, Gemini, etc.) for high-quality, context-aware generation. Passes description + guidelines as prompt, receives structured output. Best for lore-accurate descriptions, detailed sprites, nuanced stat blocks.
- **Python Fallback Mode** (default): Uses deterministic Python logic (random within constraints, template-based, procedural). Produces functional but simpler output. Good for bulk seeding, placeholder data, and environments without AI CLI access.
- **Parallel Mode** (`--parallel N`): Spawns N concurrent workers for bulk generation. Each worker receives a description + guidelines and generates independently. AI mode uses async subprocess calls to the AI CLI; Python mode uses `concurrent.futures`.

### Common CLI Interface
All generators expose a consistent interface:
```
python tools/<generator>.py <command> [options]

Commands:
  status              Show what's populated vs missing in DB
  generate <id>       Generate for a single entity/item/scene
  generate-bulk       Generate all missing entries (with --parallel N)
  preview <id>        Preview generated output without inserting
  insert <id>         Insert a single generated record into DB
  insert-bulk         Insert all previewed/generated records
  update <id>         Update an existing record with regenerated data
  export              Export generated data as SQL migration file
  validate            Validate all generated data against schema constraints

Options:
  --ai                Use AI-enhanced generation (requires AI CLI configured)
  --ai-provider       AI provider: claude | gemini | openai (default: claude)
  --parallel N        Run N concurrent generation workers (default: 1)
  --dry-run           Show what would be generated without executing
  --format json|sql   Output format for export (default: sql)
  --env-file          Path to .env for DB connection (default: backend/.env)
```

### DB Connection
All generators pull connection strings from `backend/.env`. Never hardcode credentials. Use `psycopg2` or `asyncpg` for direct DB operations.

### AI Provider Configuration
```env
# In backend/.env or tools/.env
AI_CLI_PROVIDER=claude          # claude | gemini | openai
AI_CLI_MODEL=claude-sonnet-4-6  # model to use
AI_CLI_TIMEOUT=120              # seconds per generation call
```

---

## §1. Entity Gameplay Data Generator

**Script:** `tools/generate_entity_gameplay.py`
**Status:** Not built
**Priority:** HIGH — blocks sprite generators and visual verification

Populates `entity_gameplay_data` for all ~3,936 entities with visual and combat attributes.

### Fields to Generate
- `movement_type_id` → FK to `movement_types` (ground, hover, flying, burrowing, teleport)
- `size_class_id` → FK to `size_classes` (tiny, small, medium, large, huge)
- `animation_style_id` → FK to `animation_styles` (ooze, stalk, pulse, aggro, flap, swarm, slither)
- `silhouette_type_id` → FK to `silhouette_types` (blob, quadruped, biped, orb, winged, cluster)
- `color_primary`, `color_secondary` → hex color strings
- `primary_attack_type_id`, `secondary_attack_type_id`, `tertiary_attack_type_id` → FK to `attack_types`
- `sprite_key` → generated asset_registry key (see §4)

### Generation Strategy
- **AI mode:** Pass entity name + description + entity_type + chapter context → AI infers appropriate visual traits, colors matching lore, attack types matching creature behavior.
- **Python fallback:** Type-based defaults — creature→ground/stalk/quadruped, manifestation→hover/pulse/orb, spirit→hover/pulse/orb, humanoid→ground/aggro/biped, beast→ground/stalk/quadruped. Random colors within a dark-fantasy palette per chapter mood.

### Requirements
- [ ] **1.1** Build CLI with status/generate/insert commands
- [ ] **1.2** Type-based visual defaults (Python fallback)
- [ ] **1.3** AI-enhanced inference from entity descriptions + chapter context
- [ ] **1.4** Bulk generation with parallel workers
- [ ] **1.5** Validation against FK constraints (all IDs must exist in lookup tables)
- [ ] **1.6** Export as SQL migration file

---

## §2. Entity Family Seeder

**Script:** `tools/seed_entity_families.py`
**Status:** Not built (classifier exists: `tools/classify_entity_families.py`)
**Priority:** HIGH — needed for entity grouping and visual consistency

Populates `entity_families` table and assigns `entity_family_id` on the `entities` table.

### Families
wraiths, demons, beasts, elementals, undead, constructs, humanoids, celestials, aberrations, plants

### Generation Strategy
- **AI mode:** Classify each entity into a family based on name + description + entity_type. Handle edge cases (e.g., "Burning Skeleton" = undead, not elemental).
- **Python fallback:** Entity type mapping — creature→beasts, manifestation→elementals, spirit→wraiths, etc.

### Requirements
- [ ] **2.1** Seed `entity_families` table with canonical family entries
- [ ] **2.2** Classify all entities into families (AI-assisted or type-based)
- [ ] **2.3** Bulk update `entities.entity_family_id`
- [ ] **2.4** Validation — no orphan entities without family assignment

---

## §3. Entity Sprite Generator

**Script:** `tools/generate_entity_sprites.py`
**Status:** Not built
**Priority:** HIGH — needed for visual rendering across all combat surfaces
**Depends on:** §1 (entity_gameplay_data must be populated)

Generates procedural `asset_registry` entries for entity rendering based on silhouette + colors + size + animation style.

### Output Per Entity
- `sprite_key` in `asset_registry` pointing to rendering config
- Rendering config JSON: silhouette SVG path, color fills, glow params, size multiplier, animation keyframes

### Generation Strategy
- **AI mode:** Generate unique SVG silhouette paths per entity, with lore-appropriate detail. More organic shapes for beasts, geometric for constructs, ethereal for spirits.
- **Python fallback:** Template silhouettes per `silhouette_type` (6 base shapes), colored with entity's primary/secondary colors, scaled by `size_class`.

### Requirements
- [ ] **3.1** Template silhouette SVG paths for all 6 silhouette_types
- [ ] **3.2** Color application pipeline (primary fill, secondary accent, glow aura)
- [ ] **3.3** Size scaling per size_class (tiny=0.4x, small=0.7x, medium=1.0x, large=1.5x, huge=2.0x)
- [ ] **3.4** Animation keyframe generation per animation_style
- [ ] **3.5** AI-enhanced unique silhouettes for boss entities
- [ ] **3.6** Bulk generation + asset_registry insertion

---

## §4. Item Sprite Generator

**Script:** `tools/generate_item_sprites.py`
**Status:** Not built
**Priority:** HIGH — needed for paper doll rendering and inventory display
**Depends on:** Armor classes (migration 064), gear_slots paperdoll_layer (migration 067)

Generates sprites for the equipment/paper doll system:
- **Paper doll layers:** armor_class × gear_slot × rarity overlay sprites
- **Weapon sprites:** Per weapon animation type
- **Inventory icons:** Thumbnail icons for all items

### Output Per Item Type
- Paper doll layer sprite (body-mapped SVG/PNG per gear_slot)
- Inventory icon (32×32 px)
- Rarity visual overlay (common=none, uncommon=green border, rare=blue glow, epic=purple aura, legendary=gold particles)

### Generation Strategy
- **AI mode:** Generate distinct visual designs per armor_class aesthetic (cloth=flowing, leather=rugged, chain=linked, plate=angular, divine=radiant, magic=ethereal, bone=skeletal, shadow=wispy).
- **Python fallback:** Template shapes per gear_slot, colored by armor_class palette, rarity border overlay.

### Requirements
- [ ] **4.1** Paper doll layer templates for all 16 gear_slots
- [ ] **4.2** Armor class visual palettes and shape modifiers (8 classes)
- [ ] **4.3** Rarity overlay system (5 tiers)
- [ ] **4.4** Weapon sprite templates per weapon_animation_type
- [ ] **4.5** Inventory icon generation (32×32)
- [ ] **4.6** AI-enhanced unique designs for legendary/dream items
- [ ] **4.7** Bulk generation + asset_registry insertion

---

## §5. Projectile Sprite Generator

**Script:** `tools/generate_projectile_sprites.py`
**Status:** Not built
**Priority:** MEDIUM — needed for ranged/magic attack animations
**Depends on:** §1 (attack_types must have visual columns populated)

Generates `asset_registry` entries for projectile rendering per attack_type.

### Output Per Attack Type
- Projectile shape (SVG path or particle config)
- Trail effect config (color, length, fade)
- Impact effect config (burst pattern, color, duration)

### Generation Strategy
- **AI mode:** Lore-appropriate projectile designs (void bolt = dark purple spiral, holy smite = golden beam, etc.)
- **Python fallback:** Template projectiles per `projectile_type` column on attack_types (arrow, bolt, orb, beam, wave), colored by attack element.

### Requirements
- [ ] **5.1** Template projectile shapes for each projectile_type
- [ ] **5.2** Trail effect generation (particle systems)
- [ ] **5.3** Impact effect templates (burst, splash, shatter, dissolve)
- [ ] **5.4** AI-enhanced unique projectiles for boss attacks
- [ ] **5.5** Bulk generation + asset_registry insertion

---

## §6. Background Parallax Generator

**Script:** `tools/generate_backgrounds.py`
**Status:** Not built (placeholders exist for chapters 1-4)
**Priority:** MEDIUM

Generates layered parallax backgrounds for each chapter.

### Layers Per Chapter
- `far`: Static/slow-scroll sky/clouds (1024×512, seamless loop)
- `mid`: Parallax structures/landscape (1024×512, seamless loop, transparent sky)
- `near` (optional): Floor texture / high-speed foreground

### Generation Strategy
- **AI mode:** Generate scene descriptions from chapter lore → pass to image generation (Stable Diffusion/DALL-E) → post-process for seamless tiling.
- **Python fallback:** Gradient-based procedural backgrounds using chapter mood colors. Dark-fantasy palettes with procedural noise textures.

### Requirements
- [ ] **6.1** Chapter mood → color palette mapping
- [ ] **6.2** Procedural gradient + noise background generation (Python)
- [ ] **6.3** AI-enhanced scene-specific backgrounds from lore
- [ ] **6.4** Seamless loop validation/correction
- [ ] **6.5** Asset naming: `/assets/game/backgrounds/bg_{chapter_id}_{layer}.png`
- [ ] **6.6** Batch processing — all chapters in one run

---

## §7. Music & Audio Generators

### §7.1 8-Bit Music Generator (EXISTS)
**Script:** `tools/generate_8bit_music.py` ✅
**Status:** Built — generates Web Audio synthesis JSON for 21 atmospheres

### §7.2 8-Bit SFX Generator (EXISTS)
**Script:** `tools/generate_8bit_sfx.py` ✅
**Status:** Built — generates 17 SFX presets

### §7.3 Extended Music Loop Generator
**Script:** `tools/generate_extended_music.py`
**Status:** Not built
**Priority:** MEDIUM — current loops are too short and repetitive

Extends existing 8-bit music definitions to 2-3 minute loops with more variation, sections, and transitions.

### Requirements
- [ ] **7.3.1** Update music definition JSON schema for longer sequences (sections, transitions, variation blocks)
- [ ] **7.3.2** AI-enhanced composition — pass atmosphere description + existing short loop → AI generates extended arrangement with intro/verse/bridge/chorus structure
- [ ] **7.3.3** Python fallback — procedural loop extension (repeat with transposition, add counter-melodies, randomize instrument layers)
- [ ] **7.3.4** Review and regenerate all 21 atmosphere music definitions
- [ ] **7.3.5** Bulk regeneration with preview/compare against existing

### §7.4 Suno Music Pipeline (External)
**Status:** Deferred — requires Suno API access
- [ ] **7.4.1** Standardized prompts from chapter descriptions
- [ ] **7.4.2** Pool generation (4+ tracks per chapter)
- [ ] **7.4.3** Seamless loop point detection/correction

---

## §8. PNG Text Generator (Narrative Security)

**Script:** `tools/generate_narrative_pngs.py`
**Status:** Not built (frontend hook exists: NarrativeBlock image_path detection)
**Priority:** LOW — WPM-timed text display works well currently

Converts book text into copy-protected PNG images to prevent scraping.

### Requirements
- [ ] **8.1** Text-to-image engine (Python/Pillow) with themed fonts/backgrounds
- [ ] **8.2** Chapter mood theming (font style, transparency, color)
- [ ] **8.3** Batch processing — entire chapters/scenes in one command
- [ ] **8.4** Optimization — WebP compression, auto-crop

---

## §9. Sync Mapping Editor

**Script:** `tools/sync_mapping_editor.py`
**Status:** Not built
**Priority:** LOW — depends on audio asset availability

Maps audio timestamps to PNG text blocks for synchronized narrative playback.

### Requirements
- [ ] **9.1** Visual timeline (audio waveform vs text triggers)
- [ ] **9.2** Interactive click-to-set timestamp mapping
- [ ] **9.3** DB export to `scene_audio_sync` table

---

## §10. Lore-to-Content AI Generator

**Script:** `tools/generate_lore_content.py`
**Status:** Not built
**Priority:** HIGH — fills hollow DB records with lore-accurate content

A comprehensive pipeline translating narrative text into functional game data.

### Pipeline Stages
1. **Ingest** — Read `docs/lore/` guides and `BOOKS.md` for entity/item/skill mentions
2. **Cross-reference** — Pull existing DB records, identify hollow entries (name only, no stats/description)
3. **Generate** — Descriptions, stats, benefits, categorization
4. **Insert** — Batch update DB with generated content

### Generation Strategy
- **AI mode:** Full lore context → AI generates immersive descriptions, balanced stat blocks aligned with exponential scaling system, proper categorization.
- **Python fallback:** Template descriptions by entity_type, randomized stats within tier bands, type-based categorization.

### Requirements
- [ ] **10.1** Lore ingestion from `docs/lore/` and `BOOKS.md`
- [ ] **10.2** DB cross-reference — identify hollow records across entities, items, skills, artifacts
- [ ] **10.3** AI-driven description generation (lore-accurate, immersive)
- [ ] **10.4** Stat generation aligned with scaling system (`scene_hp` formula, tier bands)
- [ ] **10.5** Technical mapping — items→correct table structures (weapons, armor, trinkets)
- [ ] **10.6** Batch DB population with validation

---

## §11. Boss Transition Lore Text Generator

**Script:** `tools/generate_boss_lore.py`
**Status:** Not built (placeholder seeds exist for chapters 1-2, book 1 via migration 021)
**Priority:** MEDIUM

Generates `transition_lore_text` for chapter/book boss defeat cinematics (NarrativeReveal).

### Generation Strategy
- **AI mode:** Summarize chapter's story_beats → AI generates 3-6 sentence congratulatory recap in the book's narrative voice.
- **Python fallback:** Template: "You have conquered the trials of {chapter_name}. The {entity_count} foes that stood in your path are vanquished..."

### Requirements
- [ ] **11.1** Source briefing builder (story_beats per chapter/book)
- [ ] **11.2** AI generation with narrative tone matching book voice
- [ ] **11.3** DB population — `UPDATE chapters/books SET transition_lore_text`
- [ ] **11.4** Lore accuracy review checklist against `docs/lore/` guides

---

## §12. Cosmetic Asset Generators (Elysium Emporium)

**Script:** `tools/generate_cosmetics.py`
**Status:** Not built
**Priority:** LOW — depends on Emporium feature (3.3)
**Ref:** `docs/recs/3.3_ELYSIUM_EMPORIUM.md`

### §12.1 Skin Generator
- [ ] Character skin sprite sets (2 universal + 4 class-specific = 6 total)
- [ ] Portrait (128×128), battle avatar config, thumbnail (48×48)
- [ ] Class visual identity respect (`character_classes.visual_config`)
- [ ] Output: `/assets/game/cosmetics/skins/{skin_key}/`

### §12.2 Badge & Flair Generator
- [ ] Chat flair — 5 variants with name border/glow + icon (16×16)
- [ ] Leaderboard badges — 4 frame styles as transparent overlays
- [ ] Output: `/assets/game/cosmetics/flair/`, `/assets/game/cosmetics/badges/`

### §12.3 Avatar Generator
- [ ] 8 lore-themed avatar profile pictures (128×128, pixel-art)
- [ ] Output: `/assets/game/cosmetics/avatars/{avatar_key}.png`

### §12.4 Thematic Consistency
- [ ] Dark, high-contrast pixel-art aesthetic (void purples, celestial golds, infernal reds, akashic teals)

---

## §13. Proactive Content Scanner

**Script:** `tools/scan_content_gaps.py`
**Status:** Not built
**Priority:** MEDIUM — feeds Dev Audit Dashboard (5.6)

Queries DB for known content gaps and populates `dev_content_audit` records.

### Scan Targets
- [ ] **13.1** Entities without `entity_gameplay_data` → `missing_stat`
- [ ] **13.2** Scenes without entity assignments → `missing_entity`
- [ ] **13.3** Chapters without `base_atmosphere` → `missing_atmosphere`
- [ ] **13.4** Chapters/books without `transition_lore_text` → `missing_lore_text`
- [ ] **13.5** Entities without `sprite_key` → `missing_sprite`
- [ ] **13.6** Entities without `death_sfx_key` → `missing_sfx`
- [ ] **13.7** Skills without `activate_sfx_key` → `missing_sfx`

**Implementation:** Uses `log_content_audit()` from `services/dev_audit_service.py`.
**Trigger:** On-demand (admin button or CLI).

---

## §14. Content Import & Book Loader

**Script:** `tools/import_book_content.py`
**Status:** Partial (book processor exists in `tools/` for initial ingestion)
**Priority:** LOW — initial content already loaded

Handles importing new books/chapters into the system.

### Requirements
- [ ] **14.1** Parse book document (DOCX/TXT) into chapters → scenes → story_beats
- [ ] **14.2** Extract entity mentions, skill references, item references
- [ ] **14.3** Create skeleton DB records for all extracted entities
- [ ] **14.4** Generate scene assignments and sort ordering
- [ ] **14.5** Trigger downstream generators (§1, §10) for newly imported content

---

## Existing Tools (Already Built)

| Tool | Script | Status |
|------|--------|--------|
| 8-bit Music Generator | `tools/generate_8bit_music.py` | ✅ Complete |
| 8-bit SFX Generator | `tools/generate_8bit_sfx.py` | ✅ Complete |
| Atmosphere Classifier | `tools/classify_atmospheres.py` | ✅ Complete |
| Entity Family Classifier | `tools/classify_entity_families.py` | ✅ Complete |
| Placeholder Music | `tools/generate_placeholder_music.py` | ✅ Complete (superseded by 8-bit) |
| Simulation Toolkit | `tools/sim/` (6 scripts) | ✅ Complete |
| DB Dump/Restore | `tools/db_dump_restore.py` | ✅ Complete |

---

## Build Priority Order

| Priority | Generator | Blocks |
|----------|-----------|--------|
| 1 | §1 Entity Gameplay Data | §3, §5, visual verification |
| 2 | §2 Entity Family Seeder | Entity grouping, visual consistency |
| 3 | §3 Entity Sprites | All combat surface rendering |
| 4 | §4 Item Sprites | Paper doll, inventory |
| 5 | §10 Lore-to-Content | Hollow record filling |
| 6 | §5 Projectile Sprites | Attack animations |
| 7 | §13 Content Scanner | Dev audit dashboard |
| 8 | §11 Boss Lore Text | NarrativeReveal content |
| 9 | §7.3 Extended Music | Audio quality |
| 10 | §6 Backgrounds | Chapter visuals |
| 11 | §12 Cosmetics | Emporium (deferred) |
| 12 | §8 PNG Text | Narrative security (deferred) |
| 13 | §9 Sync Mapping | Audio sync (deferred) |
| 14 | §14 Content Import | New book loading |

---

*Updated: 2026-03-23 — Consolidated from TODO.md, 0_REQUIREMENTS.md. Added shared AI-assisted architecture, parallel execution, comprehensive CLI interface.*
