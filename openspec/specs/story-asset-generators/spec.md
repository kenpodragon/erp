# Story Asset Generators Specification

## Purpose
This specification defines the automated pipelines and tools required to generate and manage visual, audio, and text assets for the Story Mode and Elysium Emporium. Generators produce copy-protected narrative text images, background parallax layers, lore-accurate entity sprites and icons, atmospheric music tracks, and cosmetic assets for the shop — all integrated with the Asset Registry and Dev Content Audit systems.

## Requirements

### Requirement: PNG Text Generator
The system SHALL provide a Python/Pillow tool that converts raw book text into themed, copy-protected PNG image blocks with chapter-appropriate styling.

#### Scenario: Text-to-PNG rendering
- GIVEN a scene's narrative text is provided as input
- WHEN the PNG Text Generator runs
- THEN copy-protected PNG blocks SHALL be produced with contextmenu and drag-disabled rendering, chapter-mood-appropriate font and background styling, and WebP compression for minimal load time

#### Scenario: Frontend PNG hook-point
- GIVEN a `StoryBeat` record has a non-null `image_path`
- WHEN `NarrativeBlock.tsx` renders that beat
- THEN an `<img>` element SHALL render with copy-protection attributes instead of raw text

#### Scenario: Batch processing
- GIVEN a chapter has 40 scenes with narrative text
- WHEN the generator is run with the chapter ID as input
- THEN all scenes in that chapter SHALL be processed in a single command invocation

### Requirement: Background Parallax Pipeline
The system SHALL generate 2–3 parallax layer images per chapter (far/mid/near) as seamless-loop PNGs following the naming convention `bg_{chapter_id}_{layer}.png`.

#### Scenario: Layer specification
- GIVEN a chapter requires background assets
- WHEN the pipeline generates assets
- THEN a `far` layer (1024×512, slowest scroll, distant vistas), `mid` layer (1024×512, transparent sky, architectural details), and optionally a `near` layer (high-speed foreground) SHALL be produced

#### Scenario: Asset naming
- GIVEN chapter ID 5 requires a mid-layer background
- WHEN the asset is generated
- THEN the file SHALL be named `bg_5_mid.png` and registered in the Asset Registry with `asset_type = 'background'`

### Requirement: Lore-to-Content AI Generator
The system SHALL provide an AI-driven pipeline that ingests compressed lore guides and book text to generate lore-accurate descriptions, stat blocks, and visual icons for entities, items, skills, and artifacts in the database.

#### Scenario: Hollow record enrichment
- GIVEN an entity record exists with a name but no description, base_hp, or sprite_key
- WHEN the Lore-to-Content Generator processes it
- THEN a lore-accurate description, calculated stat block (Power/Defense/Speed), and generated icon path SHALL be written to the entity record

#### Scenario: Asset Registry integration
- GIVEN the generator produces a batch of entity sprites
- WHEN the batch completes
- THEN all generated assets SHALL be registered in `asset_registry` via the bulk import endpoint with appropriate `asset_type` values

#### Scenario: Dev audit prioritization
- GIVEN the generator identifies entities flagged in `dev_content_audit` as `missing_sprite`
- WHEN the generator processes content
- THEN entities with open audit records SHALL be prioritized over entities with no audit record

### Requirement: Boss Transition Lore Text Generator
The system SHALL generate immersive 3–6 sentence post-boss lore text for every chapter and book using story beat summaries as input, and populate the `transition_lore_text` columns in the database.

#### Scenario: Chapter lore text generation
- GIVEN chapter N has story beats with entity appearances and key events recorded
- WHEN the generator runs for that chapter
- THEN a congratulatory 3–6 sentence narrative recap SHALL be generated in the book's voice and written to `chapters.transition_lore_text` for chapter N

#### Scenario: Lore accuracy review gate
- GIVEN a batch of lore texts has been generated
- WHEN the operator prepares to deploy
- THEN all generated texts SHALL be reviewed against `docs/lore/` guides before merging to production

### Requirement: Suno Music Generation Pipeline
The system SHALL support generating at least 4 unique atmospheric background tracks per chapter using standardized prompts derived from chapter descriptions, with seamless loop points.

#### Scenario: Track pool generation
- GIVEN a chapter has an atmospheric archetype (e.g., "dark mystery")
- WHEN the pipeline runs for that chapter
- THEN at least 4 unique tracks SHALL be generated to avoid playlist repetition

#### Scenario: Loop point validation
- GIVEN a generated track is submitted
- WHEN the looping utility processes the track
- THEN the track SHALL have a confirmed seamless loop point for infinite gameplay use

### Requirement: Elysium Emporium Cosmetic Asset Generators
The system SHALL provide generators for character skin sprite sets, chat flair, leaderboard badge frames, and avatar profile pictures following the dark pixel-art aesthetic with void purples, celestial golds, infernal reds, and akashic teal color palettes.

#### Scenario: Skin sprite set generation
- GIVEN a skin key and class visual_config are provided
- WHEN the Skin Generator runs
- THEN a `portrait.png` (128×128), `avatar_config.json`, and `thumb.png` (48×48) SHALL be produced under `/assets/game/cosmetics/skins/{skin_key}/`

#### Scenario: Badge and flair generation
- GIVEN 4 leaderboard badge styles and 5 chat flair variants are requested
- WHEN the Badge & Flair Generator runs
- THEN transparent PNG/SVG overlays SHALL be produced at `/assets/game/cosmetics/badges/` and `/assets/game/cosmetics/flair/` respectively

#### Scenario: Thematic consistency
- GIVEN any cosmetic asset is generated
- WHEN the asset is reviewed
- THEN the asset SHALL use the established pixel-art palette (void purples, celestial golds, infernal reds, akashic teals) and match the dark high-contrast aesthetic

### Requirement: Proactive Content Scanner
The system SHALL provide an on-demand CLI script or admin endpoint that queries the database for known content gaps and populates `dev_content_audit` records for the Dev Audit Dashboard.

#### Scenario: Missing stat scan
- GIVEN entities exist without `entity_gameplay_data` records
- WHEN the content scanner runs
- THEN each such entity SHALL have a `dev_content_audit` record logged with `audit_type = 'missing_stat'` via `log_content_audit()` with deduplication

#### Scenario: Missing atmosphere scan
- GIVEN chapters exist without a `base_atmosphere` (atmosphere_id) assigned
- WHEN the content scanner runs
- THEN each such chapter SHALL be logged with `audit_type = 'missing_atmosphere'`

#### Scenario: On-demand only
- GIVEN the content scanner is deployed
- WHEN no admin or CI trigger is active
- THEN the scanner SHALL NOT run automatically on a schedule

## Design
All generators output manifests compatible with the Asset Registry bulk import endpoint (5.7). The Asset Registry is the critical bridge between Phase 5 admin tooling and Phase C generators.

Generator pipeline integration points:
- **PNG Text Generator:** `NarrativeBlock.tsx` hook on `image_path` in `StoryBeat`
- **Lore-to-Content Generator:** Reads `docs/lore/` + `BOOKS.md`; writes to entities, items, skills tables; bulk-registers assets via 5.7
- **Boss Lore Text Generator:** Reads `story_beats` per chapter; writes to `chapters.transition_lore_text` and `books.transition_lore_text`
- **Content Scanner:** Uses `log_content_audit()` from `services/dev_audit_service.py`; 7 scan targets

Scan targets for Proactive Content Scanner:
1. Entities without `entity_gameplay_data` → `missing_stat`
2. Scenes without entity assignments → `missing_entity`
3. Chapters without `base_atmosphere` → `missing_atmosphere`
4. Chapters/books without `transition_lore_text` → `missing_lore_text`
5. Entities without `sprite_key` in gameplay data → `missing_sprite`
6. Entities without `death_sfx_key` in gameplay data → `missing_sfx`
7. Skills without `activate_sfx_key` → `missing_sfx`

Background parallax: current state has Chapter 1–4 placeholders using generic dark-fantasy gradients. All remaining chapters need generated assets.

Reference: `docs/inst/GAME_ASSETS_GUIDE.md` for asset generation and insertion instructions.
