# Book Agent Reader Specification

## Purpose
This specification defines the Book Agent Reader, a standalone CLI utility that parses the Towers of Elysium trilogy `.docx` files, extracts structured narrative data using AI, and loads it into the PostgreSQL database for use by the ERP game engine. The output is a fully structured, queryable narrative database covering the hierarchy Book > Chapter > Scene > Story Beat, along with all associated entities (characters, enemies, locations) and semantic metadata (emotions, themes, sensory details).

## Requirements

### Requirement: Four-Phase Processing Pipeline
The system SHALL process books in 4 sequential phases. Phase 1 (text extraction) SHALL be completed across all 3 books before Phase 2 begins; Phase 2 (AI extraction) SHALL be completed across all 3 books before Phase 3 begins. Within each phase books SHALL be processed sequentially (Book 1 → Book 2 → Book 3). The system SHALL prompt the user to confirm before transitioning between books within a phase and before transitioning between phases.

#### Scenario: Phase completion confirmation
- GIVEN Phase 1 has completed for Book 1: Elysium Rising
- WHEN the processor is ready to begin Phase 1 for Book 2: Elysium Fallen
- THEN the system SHALL display "Phase 1 complete for Book 1: Elysium Rising. Continue to Book 2: Elysium Fallen? (y/n)" and SHALL NOT proceed without a `y` response

#### Scenario: User declines phase transition
- GIVEN Phase 1 has completed for all 3 books
- WHEN the system prompts "Proceed to Phase 2: AI Semantic Extraction? (y/n)" and the user enters `n`
- THEN the system SHALL save current state and exit gracefully without making further changes

### Requirement: Phase 1 — Text Extraction & Structural Splitting
The system SHALL read and parse `.docx` files using `python-docx`. The system SHALL detect chapter boundaries using TOC entries and chapter heading markers. Within each chapter the system SHALL detect hard scene breaks (e.g., `******` markers) and SHALL use AI to further split content between hard breaks into distinct scenes where multiple logical scenes exist. The system SHALL use AI to identify story beats within each scene, defined as distinct actions, revelations, emotional shifts, or scene transitions typically spanning 1–5 paragraphs. All extracted text segments SHALL be stored in sequential order (book > chapter > scene > story beat) preserving original text verbatim, with sequential `sort_order` values at every level.

#### Scenario: Hard break scene detection
- GIVEN a chapter containing two `******` separators
- WHEN Phase 1 processes the chapter
- THEN the system SHALL create at minimum 3 scenes (before first break, between breaks, after second break), with `has_hard_break = true` for scenes identified by a hard break marker

#### Scenario: AI story beat splitting
- GIVEN a scene with a single hard break but multiple logical narrative moments
- WHEN Phase 1 AI analysis runs
- THEN the system SHALL split the scene into story beats, each representing a distinct action, revelation, or emotional shift

### Requirement: Phase 2 — AI Semantic Extraction
The system SHALL extract all entities (characters, creatures, objects, environmental hazards, emotional manifestations, cursed artifacts, sentient structures) present in each scene. Each entity SHALL have a base description and a scene-specific delta for each appearance. Each entity SHALL have a role per scene: `ally`, `enemy`, `neutral`, or `unknown`. The system SHALL enforce minimum entity counts: at least 1 entity per story beat, at least 3 entities per scene cumulatively, and at least 10 entities per chapter cumulatively. When the AI generates entities beyond what is explicitly in the text, those entities SHALL be flagged with `is_generated = true`. The system SHALL use Claude as the primary AI provider with Gemini as automatic fallback. If both providers are exhausted the system SHALL stop gracefully, persist current progress, and log the stop point.

#### Scenario: Minimum entity enforcement
- GIVEN a chapter with naturally extracted content yielding only 6 entities
- WHEN Phase 2 processes the chapter
- THEN the system SHALL creatively generate 4 additional thematically appropriate entities (environmental dangers, emotional manifestations, obstacles) flagged with `is_generated = true` to meet the minimum of 10

#### Scenario: AI provider failover
- GIVEN Phase 2 processing with Claude as primary provider
- WHEN Claude's rate limit is hit mid-chapter
- THEN the system SHALL automatically switch to Gemini and continue processing; each extracted element SHALL record the provider and model ID used

#### Scenario: Both providers exhausted
- GIVEN Phase 2 processing with both Claude and Gemini at their limits
- WHEN a further extraction attempt is made
- THEN the system SHALL stop processing, persist the current chapter's partial progress, log the stop point, and exit with a descriptive message

### Requirement: Phase 3 — Post-Processing & Consistency Validation
The system SHALL analyze all AI-generated semantic tags across all 3 books, generate a proposed standardized taxonomy (merging synonyms, establishing canonical tag names), and apply it to all existing records. The system SHALL perform entity resolution across all books, merging duplicate entities under a single canonical record. The system SHALL validate entity timelines for logical gaps and description continuity. The system SHALL generate a Markdown `CONSISTENCY_REPORT.md` covering entity resolution proposals, flagged inconsistencies, taxonomy changes, cross-provider discrepancies, and statistics (entities per book, scenes per chapter).

#### Scenario: Synonym taxonomy standardization
- GIVEN semantic tags containing both "rage" and "fury" across different chapters
- WHEN Phase 3 taxonomy standardization runs
- THEN the system SHALL propose merging both under canonical tag "anger" and SHALL apply the mapping to all affected records, setting `canonical_value`

#### Scenario: Entity alias resolution
- GIVEN entity records for "the warrior", "Kael", and "the young man" all describing the same character
- WHEN Phase 3 entity resolution runs
- THEN the system SHALL propose merging them under a single canonical entity record and list the aliases in `entity_aliases`

### Requirement: Phase 4 — Human-Assisted Review
The system SHALL provide an item-by-item review process for all flagged issues from the consistency report. For each item the reviewer SHALL be able to approve (apply as-is), modify (edit and apply), or reject (discard). The review process SHALL be resumable from the last reviewed item. Approved and modified changes SHALL be applied directly to the database. The system SHALL provide AI-assisted context (surrounding text, related entities, prior descriptions) during review. On completion the system SHALL generate a final review summary documenting all decisions.

#### Scenario: Resuming interrupted review
- GIVEN a review session interrupted after item 47 of 200
- WHEN the CLI is run again without arguments
- THEN the system SHALL detect the incomplete review run and resume from item 48

#### Scenario: Reviewer modifies a suggestion
- GIVEN a review item proposing to merge "Elysium Station" and "The Station" as duplicate locations
- WHEN the reviewer selects "modify" and changes the canonical name to "Elysium Station (The Station)"
- THEN the system SHALL apply the modified canonical name to the database and record `review_status = 'modified'`

### Requirement: Auto-Resume State Management
The system SHALL track processing state in the database at chapter granularity. When run with no arguments the system SHALL query the DB to determine the current global state and resume from the correct position. The system SHALL display a status overview table on startup showing all books and phases. If an incomplete previous run is detected (status `running` or `stopped_token_limit`) the system SHALL warn the user and prompt to resume or exit.

#### Scenario: Auto-resume after interruption
- GIVEN a previous run that was interrupted mid-chapter (Book 1, Chapter 13, Phase 1)
- WHEN the CLI is run with no arguments
- THEN the system SHALL display "Previous processing was interrupted at Book 1, Chapter 13, Phase 1. Resume from this point? (y/n)" and SHALL reset chapter 13 to `not_started` status on resume

#### Scenario: Status-only run
- GIVEN a database with mixed processing states across books
- WHEN the CLI is run with `--status`
- THEN the system SHALL display the status overview table and exit without processing anything

### Requirement: CLI Interface & Progress Display
The system SHALL display a persistent progress indicator using `rich` showing current phase, book, chapter progress (e.g., `Chapter 5/18`), scene/beat progress, entity extraction count, active AI provider, cumulative token usage, and elapsed time. All status messages SHALL be logged to both console and a log file simultaneously. The CLI SHALL support `--book`, `--phase`, `--reset-chapter`, `--clear-db`, `--status`, `--dry-run`, and `--verbose` flags.

#### Scenario: Database reset with confirmation
- GIVEN a fully populated book processing database
- WHEN the CLI is run with `--clear-db`
- THEN the system SHALL display "WARNING: This will permanently delete ALL processed book data (X books, Y chapters, Z entities, W locations). Type 'CONFIRM' to proceed:" and SHALL only truncate tables if the user types exactly `CONFIRM`

## Design

### Processing Architecture
- Standalone Python CLI: `python book_processor.py [options]`
- Input: `.docx` files from `../Books/` (read-only source material)
- State tracking: entirely in PostgreSQL (no file-based state)
- Resume granularity: chapter level (interrupted chapters re-process from start)
- AI providers: Claude (primary) → Gemini (fallback), provider + model ID recorded per element
- Progress display: `rich` library (progress bars, spinners, live status)

### Chapter Processing Status Flow
`not_started` → `text_extracted` → `ai_extracted` → `post_processed` → `reviewed`

### Entity Minimum Enforcement Logic
1. Extract entities naturally from text (flagged `is_generated = false`)
2. Count entities at beat, scene, and chapter levels
3. If minimums not met, prompt AI to generate thematically appropriate entities from narrative context
4. Flag all generated entities with `is_generated = true`

## Schema

### Narrative Hierarchy Tables

**`books`**: `id`, `book_number UNIQUE`, `title`, `source_file`, `created_at`, `updated_at`

**`chapters`**: `id`, `book_id FK`, `chapter_number`, `title`, `raw_text`, `sort_order`, `processing_status` (enum: `not_started`/`text_extracted`/`ai_extracted`/`post_processed`/`reviewed`), `created_at`, `updated_at`. Constraint: `UNIQUE(book_id, chapter_number)`.

**`scenes`**: `id`, `chapter_id FK`, `scene_number`, `title`, `summary`, `raw_text`, `sort_order`, `primary_location_id FK`, `has_hard_break BOOLEAN`, `created_at`, `updated_at`. Constraint: `UNIQUE(chapter_id, scene_number)`.

**`story_beats`**: `id`, `scene_id FK`, `beat_number`, `summary VARCHAR(500)`, `raw_text`, `sort_order`, `location_id FK`, `intensity SMALLINT CHECK(1-5)`, `pacing VARCHAR(50)`, `timeline_context VARCHAR(50)` (`present`/`flashback`/`dream`/`vision`/`future`), `created_at`, `updated_at`. Constraint: `UNIQUE(scene_id, beat_number)`.

### Entity Tables

**`entities`**: `id`, `canonical_name UNIQUE`, `entity_type` (`character`/`creature`/`object`/`environment`/`manifestation`/`group`/`other`), `is_generated BOOLEAN`, `base_description`, `base_emotional_state`, `base_sounds`, `base_smells`, `base_equipment`, `base_abilities`, `first_appearance_scene_id FK ON DELETE SET NULL`, `ai_provider`, `ai_model_id`, `created_at`, `updated_at`.

**`entity_aliases`**: `id`, `entity_id FK CASCADE`, `alias`, `context`. Constraint: `UNIQUE(entity_id, alias)`.

**`entity_scene_appearances`**: `id`, `entity_id FK CASCADE`, `scene_id FK CASCADE`, `role` (`ally`/`enemy`/`neutral`/`unknown`), `is_present BOOLEAN`, `description_delta`, `emotional_state_delta`, `equipment_delta`, `exit_reason`, `entry_context`, `relationships`, `ai_provider`, `ai_model_id`, `created_at`, `updated_at`. Constraint: `UNIQUE(entity_id, scene_id)`.

**`entity_beat_appearances`**: `id`, `entity_id FK CASCADE`, `story_beat_id FK CASCADE`, `role`, `is_primary BOOLEAN`, `beat_context`, `created_at`. Constraint: `UNIQUE(entity_id, story_beat_id)`.

### Location Tables

**`locations`**: `id`, `canonical_name UNIQUE`, `location_type` (`interior`/`exterior`/`transitional`/`other`), `base_visual`, `base_auditory`, `base_olfactory`, `base_tactile`, `base_atmosphere`, `first_appearance_scene_id FK ON DELETE SET NULL`, `ai_provider`, `ai_model_id`, `created_at`, `updated_at`.

**`location_aliases`**: `id`, `location_id FK CASCADE`, `alias`, `context`. Constraint: `UNIQUE(location_id, alias)`.

**`location_scene_appearances`**: `id`, `location_id FK CASCADE`, `scene_id FK CASCADE`, `visual_delta`, `auditory_delta`, `olfactory_delta`, `tactile_delta`, `atmosphere_delta`, `ai_provider`, `ai_model_id`, `created_at`, `updated_at`. Constraint: `UNIQUE(location_id, scene_id)`.

### Semantic Tags

**`semantic_tags`**: `id`, `story_beat_id FK CASCADE`, `category VARCHAR(50)` (`emotion`/`theme`/`sensory`), `value VARCHAR(100)`, `canonical_value VARCHAR(100)` (null until Phase 3 standardization), `notes TEXT`, `ai_provider`, `ai_model_id`, `created_at`, `updated_at`.

### Processing State & Audit

**`processing_runs`**: `id`, `book_id FK CASCADE`, `phase INTEGER`, `started_at`, `ended_at`, `status` (`running`/`completed`/`stopped_token_limit`/`failed`), `last_completed_chapter_id FK`, `claude_tokens_used BIGINT`, `gemini_tokens_used BIGINT`, `error_message`, `created_at`.

**`review_items`**: `id`, `category VARCHAR(50)` (`entity_resolution`/`description_inconsistency`/`timeline_gap`/`taxonomy_change`/`cross_provider_discrepancy`), `severity` (`info`/`warning`/`error`), `title VARCHAR(500)`, `description`, `suggested_action`, `affected_entity_id FK ON DELETE SET NULL`, `affected_location_id FK ON DELETE SET NULL`, `affected_scene_id FK ON DELETE SET NULL`, `affected_beat_id FK ON DELETE SET NULL`, `review_status` (`pending_review`/`approved`/`modified`/`rejected`), `reviewer_notes`, `reviewed_at`, `created_at`, `updated_at`.

### Cascade Delete Chain
Deleting a book cascades through the full hierarchy:
`books` → `chapters` → `scenes` → `story_beats` → `semantic_tags`, `entity_beat_appearances`

Entities and locations use `ON DELETE SET NULL` for `first_appearance_scene_id` (they are standalone records not owned by scenes).

### Key Indexes
- `idx_chapters_book_id`, `idx_chapters_processing_status`
- `idx_scenes_chapter_id`, `idx_scenes_primary_location_id`
- `idx_story_beats_scene_id`, `idx_story_beats_location_id`
- `idx_entity_scene_app_entity_id`, `idx_entity_scene_app_scene_id`
- `idx_entity_beat_app_entity_id`, `idx_entity_beat_app_beat_id`
- `idx_location_scene_app_location_id`, `idx_location_scene_app_scene_id`
- `idx_semantic_tags_beat_id`, `idx_semantic_tags_category`
- `idx_review_items_status`
