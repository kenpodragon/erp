# Admin Systems Specification

## Purpose
Phase 5.0 builds the comprehensive administrative tooling required to operate, tune, and populate Elysium Rising without code deployments. After this phase, a non-developer game admin can manage players and characters, edit all game content, tune gameplay parameters, audit missing content, manage entity classification and visual behaviors, and track all visual assets through a centralized registry. The admin UI is designed with platform reusability in mind so that any book series can be loaded to create its own RPG experience.

## Requirements

### Requirement: Player and Character Management
The system SHALL provide a full support/testing workbench on the PlayerDetail admin page covering character deep editing, item crafting, currency management, progression editing, skill editing, and an activity timeline.

#### Scenario: Character stat editing
- GIVEN an admin is on a player's detail page
- WHEN the admin edits the character's base Strength value
- THEN `recalculate_character_stats()` SHALL be called, the updated stat breakdown SHALL reflect all 6 sources, and the change SHALL be logged to `activity_events`

#### Scenario: Progression jump with backfill
- GIVEN an admin selects a target scene via cascading Book→Chapter→Scene dropdowns
- WHEN the admin applies a forward progression jump
- THEN all intermediate scene completions and boss completions SHALL be backfilled, and the Overworld Map SHALL reflect the updated state

#### Scenario: Currency grant with audit
- GIVEN an admin grants 500 Elysium Essence to a player with a reason (min 10 chars)
- WHEN the grant is applied
- THEN the player's essence balance SHALL increase by 500 and an `admin_essence_adjustments` record SHALL be created with the reason

### Requirement: Game Content Editor
The system SHALL provide full CRUD for all narrative and world-building data — books, chapters, scenes, narrative text, story beats, entities, backgrounds, locations — through the WorldBuilder admin UI.

#### Scenario: Scene narrative edit
- GIVEN an admin opens the Narrative Text Editor for a scene
- WHEN the admin saves edited story text
- THEN the scene's narrative content in the database SHALL be updated and the change SHALL be immediately visible in Story Mode for that scene

#### Scenario: Entity-scene bulk assignment
- GIVEN an admin selects multiple entities in the Entity-Scene Mapper
- WHEN the admin assigns them to a scene with spawn rates
- THEN all selected entities SHALL be associated with the scene in `entity_scene_appearances` with the configured spawn rates

#### Scenario: Platform reusability
- GIVEN a new book series has been loaded via the book_parser tool
- WHEN the admin navigates the WorldBuilder
- THEN all books, chapters, scenes, and entities from the new series SHALL be fully manageable through the UI without code changes

### Requirement: Entity Classification Management
The system SHALL provide normalized lookup tables for entity types, entity families, and visual behaviors, with bulk assignment tools and a classification audit view.

#### Scenario: Bulk entity type assignment
- GIVEN an admin selects 50 entities in the Bulk Assignment tab
- WHEN the admin assigns them entity type "creature"
- THEN all 50 entities SHALL have `entity_type_id` updated to the "creature" type

#### Scenario: Classification audit coverage
- GIVEN the Classification Audit tab loads
- WHEN the admin views the summary cards
- THEN coverage percentages for entity types, families, and attack type assignments SHALL be displayed, with a filterable table of incomplete entities and quick-action fix buttons

### Requirement: Banner and Scaling Editor
The system SHALL provide admin controls for visual weight configuration per visual behavior, named wave preset templates with book/chapter inheritance, difficulty curve profiles, and bundled difficulty presets.

#### Scenario: Wave preset inheritance
- GIVEN a wave preset is assigned at the book level
- WHEN a scene has no scene-level or chapter-level preset assigned
- THEN the scene SHALL inherit the book-level preset (inheritance chain: scene → chapter → book → global default)

#### Scenario: Difficulty preset application
- GIVEN an admin applies a named difficulty preset
- WHEN the atomic apply endpoint is called
- THEN the bundled game_configs snapshot, difficulty curve, and wave preset SHALL all be applied simultaneously with no partial state possible

#### Scenario: Chapter scaling preview
- GIVEN an admin is comparing two difficulty configurations
- WHEN the side-by-side comparison renders
- THEN cells showing harder values SHALL be color-coded red and easier values SHALL be color-coded green

### Requirement: GameConfigs Live Tuning
The system SHALL provide the GameConfigs admin page with category tabs, type-inferred inputs, specialized sub-tabs for Drop Rates, Skill Balance, and Economy, and a cross-category search.

#### Scenario: Type-inferred input
- GIVEN a game_config key has a value between 0.0 and 1.0
- WHEN the GameConfigs editor renders that key
- THEN a slider input SHALL be shown instead of a plain text field

#### Scenario: Economy tuning preview
- GIVEN an admin adjusts the `idle_essence_drain_per_minute` slider
- WHEN the Economy Tuning panel updates
- THEN the Essence XP step-function visualization SHALL reactively update to show the new drain rate impact

### Requirement: Dev Content Audit Dashboard
The system SHALL provide a reactive dashboard ("Dev Audit" admin page) displaying `dev_content_audit` records logged at runtime when fallbacks occur, with status management, deep-link fix actions, and summary cards.

#### Scenario: Runtime audit logging
- GIVEN the game serves a scene with an entity missing a sprite_key
- WHEN the entity is rendered using the Generic Shadow Sprite fallback
- THEN a `dev_content_audit` record with `audit_type = 'missing_sprite'` SHALL be logged via `log_content_audit()` with deduplication

#### Scenario: Status management
- GIVEN an admin views an "open" audit record
- WHEN the admin sets the status to "in_progress"
- THEN the record status SHALL update immediately and the summary card counts SHALL reflect the change

#### Scenario: Deep-link fix action
- GIVEN an audit record has `audit_type = 'missing_entity'` referencing scene ID 42
- WHEN the admin clicks "Fix →"
- THEN the browser SHALL navigate to the WorldBuilder Entity-Scene Mapper with scene 42 pre-selected

### Requirement: Asset Registry
The system SHALL maintain a centralized database registry of all visual asset keys with lightweight definitions (following the Web Audio pattern), supporting 15 asset categories, orphan detection, and bulk import.

#### Scenario: Asset registration
- GIVEN a new entity sprite is generated by a C_ generator
- WHEN the generator outputs a JSON manifest
- THEN the manifest SHALL be importable via the bulk import endpoint, creating `asset_registry` entries without requiring filesystem changes

#### Scenario: Orphan detection
- GIVEN the asset registry contains keys not referenced by any entity or scene
- WHEN the orphan detection scan runs
- THEN all unreferenced asset keys SHALL be listed with a bulk delete option

## Design
Admin UI sections (all complete except 5.8 polish pass):

| Section | Page/Tab | Status |
|---------|----------|--------|
| 5.1 Player & Character Management | PlayerDetail (extended) | COMPLETE |
| 5.2 Game Content Editor | WorldBuilder — Narrative + Content tabs | COMPLETE |
| 5.3 Entity Classification | WorldBuilder — Classification tab (6 sub-tabs) | COMPLETE |
| 5.4 Banner & Scaling Editor | WorldBuilder — Scaling & Difficulty tab | COMPLETE |
| 5.5 Content Management & Live Tuning | GameConfigs (extended with specialized tabs) | COMPLETE |
| 5.6 Dev Content Audit Dashboard | Dev Audit (standalone page) | COMPLETE |
| 5.7 Asset Registry | Asset Registry (standalone page) | COMPLETE |
| 5.8 UI Polish & Debug Cleanup | Incremental across all pages | Pending |

Entity classification tables: `entity_types` (9 seeded types), `entity_families` (admin-created), `visual_behaviors` (5 seeded: grounded_melee, grounded_ranged, airborne, magic_caster, hybrid).

Scaling tables: `wave_presets` (JSONB configs), `wave_preset_assignments` (book/chapter mapping), `difficulty_curves` (per-chapter multiplier profiles), `difficulty_presets` (bundled configs).

Asset registry: 15 categories (entity_sprite, class_sprite, background, item_icon, artifact_icon, achievement_icon, skill_icon, avatar, skin, badge, flair, spell_effect, ui_icon, narrative_image, portrait). 196 entries seeded at migration 055.

## Schema
Key migrations: 055 (asset_registry), 058 (entity_types normalization), 059 (scaling tables — wave_presets, difficulty_curves, difficulty_presets, visual_behaviors stat_weights), 060 (dev_content_audit status column upgrade).

Key tables: `entity_types`, `entity_families`, `visual_behaviors` (animation_config JSONB, stat_weights JSONB), `attack_types` (visual_behavior_id FK, stat_multipliers JSONB), `wave_presets`, `wave_preset_assignments`, `difficulty_curves`, `difficulty_presets`, `asset_registry`, `dev_content_audit` (status: open/acknowledged/in_progress/resolved/wont_fix), `admin_essence_adjustments`.
