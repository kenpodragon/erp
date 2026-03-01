# Book Agent Reader: Functional Requirements

This document defines the complete requirements for the **Book Agent Reader** -- a standalone CLI utility that parses the *Towers of Elysium* trilogy `.docx` files, extracts structured narrative data using AI, and loads it into the PostgreSQL database for use by the ERP game engine.

---

## 1. Overview

### 1.1 Purpose
Transform raw book manuscripts (`.docx`) into a fully structured, queryable narrative database covering the hierarchy: **Book > Chapter > Scene > Story Beat**, along with all associated entities (characters, enemies, locations) and semantic metadata (emotions, themes, sensory details).

### 1.2 Scope
- **Input:** `.docx` files from `../Books/`. Processes all 3 books sequentially per phase (Phase 1 for all books, then Phase 2 for all books, etc.).
- **Output:** Populated PostgreSQL tables with full narrative structure, entity data, and semantic tags.
- **Execution:** Standalone Python CLI script, run manually. When run with no arguments, auto-detects state from DB and resumes where it left off.
- **AI Providers:** Claude (primary), Gemini (fallback). Tracks which provider generated each piece of data.

### 1.3 Source Files
| Book # | Title              | File             |
|--------|--------------------|------------------|
| 1      | Elysium Rising     | `ER_Kindle.docx` |
| 2      | Elysium Fallen     | `EF_Kindle.docx` |
| 3      | Escape from Elysium| `EFE_Kindle.docx`|

---

## 2. Processing Pipeline

The processor operates in **4 distinct phases**. Each phase must be completed across **all 3 books** before the next phase begins. Within each phase, books are processed sequentially (Book 1 -> Book 2 -> Book 3). Processing resumes from the last fully-completed chapter.

**Phase execution order:**
1. Phase 1 for Book 1, Book 2, Book 3 (text extraction for all books first)
2. Phase 2 for Book 1, Book 2, Book 3 (AI extraction for all books)
3. Phase 3 runs across all books simultaneously (cross-book validation)
4. Phase 4 runs across all books simultaneously (human review)

Between each book transition and each phase transition, the processor **prompts the user** to confirm before continuing.

### Phase 1: Text Extraction & Structural Splitting
**Goal:** Parse the `.docx` and break it into the narrative hierarchy.

- [x] **FR-1.1:** Read and parse `.docx` file using `python-docx` (or equivalent).
- [x] **FR-1.2:** Detect chapter boundaries using TOC entries and chapter heading markers in the document.
- [x] **FR-1.3:** Within each chapter, detect hard scene breaks (e.g., `******` or similar visual separators).
- [x] **FR-1.4:** Use AI to further split content between hard breaks into distinct scenes where multiple logical scenes exist between separators.
- [x] **FR-1.5:** Use AI to identify story beats within each scene. A story beat is a "logical moment" -- a distinct action, shift in tone, or narrative event -- typically spanning 1-5 paragraphs. AI should be given guidelines: *"A beat represents a distinct action, revelation, emotional shift, or scene transition."*
- [x] **FR-1.6:** Store all extracted text segments in the database in sequential order (book > chapter > scene > story beat), preserving the original text verbatim.
- [x] **FR-1.7:** Assign sequential `sort_order` values at every level (chapter within book, scene within chapter, beat within scene) for deterministic ordering.

### Phase 2: AI Semantic Extraction (Per Chapter)
**Goal:** Extract entities, descriptions, and semantic metadata from each chapter using AI.

Runs chapter-by-chapter. If AI token limits are exhausted, processing stops and records its position for later resumption.

#### 2.1 Entity Extraction
- [x] **FR-2.1:** For each scene, extract all **entities** present. Entities include characters, creatures, and also **non-traditional combatants** -- objects, environmental hazards, emotional manifestations, cursed artifacts, sentient structures, etc. The AI should be creative in identifying what the player would fight or interact with as a game entity.
- [x] **FR-2.2:** Each entity is stored as a single record with a **base description** (canonical appearance, traits).
- [x] **FR-2.3:** For each scene appearance, store a **scene-specific delta** describing what has changed from the base (new injuries, clothing, emotional state, etc.). If nothing has changed, the delta is empty/null.
- [x] **FR-2.4:** Each entity has a **role** per scene: `ally`, `enemy`, `neutral`, `unknown`. Roles can change across scenes (a character may be an ally in one scene and an enemy in another).
- [x] **FR-2.5:** Track entity **presence/absence** -- if an entity disappears between scenes, record when they exit and when/if they return.
- [x] **FR-2.6:** Every scene must have **at least one character** present (at minimum the protagonist).
- [x] **FR-2.7:** Entity details must include (where available):
  - Physical description (appearance, build, distinguishing features)
  - Emotional state
  - Sounds associated with the entity (voice, footsteps, abilities)
  - Smells associated with the entity
  - Equipment/clothing
  - Abilities/powers demonstrated
  - Relationships to other entities in the scene

#### 2.1.1 Minimum Entity/Enemy Requirements
These minimums ensure every part of the game has sufficient content for encounters and combat:

- [x] **FR-2.8:** Each **story beat** must have at least **1 unique enemy/entity** generated (extracted from the text or creatively derived from the narrative context -- e.g., a manifestation of a character's fear, a collapsing environment, a cursed object).
- [x] **FR-2.9:** Each **scene** must have at least **3 enemies/entities** cumulatively across its story beats. If a scene has fewer than 3 story beats, the beats that do exist must collectively produce at least 3.
- [x] **FR-2.10:** Each **chapter** must have at least **10 enemies/entities** cumulatively across all its scenes. If the text doesn't naturally produce 10, the AI should creatively generate thematically appropriate entities from the narrative context (environmental dangers, emotional manifestations, obstacles, etc.).
- [x] **FR-2.11:** When the AI generates entities beyond what is explicitly in the text, these must be flagged with an `is_generated` marker (as opposed to `is_extracted`) so they can be reviewed separately during Phase 4.

#### 2.2 Location Extraction
- [x] **FR-2.12:** Locations are **standalone first-class entities** with a base description, similar to characters.
- [x] **FR-2.13:** When a location reappears across scenes/chapters, store scene-specific deltas (e.g., damage, time-of-day changes, new features).
- [x] **FR-2.14:** Location details must include (where available):
  - Visual description (layout, lighting, colors, scale)
  - Auditory details (ambient sounds, echoes, silence)
  - Olfactory details (smells)
  - Tactile/environmental details (temperature, humidity, terrain)
  - Atmosphere/mood

#### 2.3 Semantic Tagging
- [x] **FR-2.15:** For each story beat, extract semantic tags in the following categories:
  - **Emotions:** The dominant emotions present (e.g., fear, hope, rage, sorrow).
  - **Themes:** Narrative themes active in the beat (e.g., betrayal, sacrifice, discovery, redemption).
  - **Sensory:** Dominant sensory channels engaged (visual, auditory, olfactory, tactile, kinesthetic).
  - **Intensity:** A 1-5 scale for overall dramatic intensity of the beat.
  - **Pacing:** Descriptor for narrative pacing (e.g., `slow-burn`, `action`, `dialogue-heavy`, `contemplative`).
- [x] **FR-2.16:** Tags are stored as **structured fields** (category + value) alongside a **free-form notes** field for nuance the structured tags can't capture.
- [x] **FR-2.17:** During initial extraction, the AI defines tag values organically (no predefined enum). Standardization happens in Phase 3.

#### 2.4 AI Provider Management
- [x] **FR-2.18:** Use **Claude as the primary AI provider**. If Claude's token/rate limit is hit, automatically switch to **Gemini as fallback**.
- [x] **FR-2.19:** If both providers are exhausted, **stop processing gracefully**, persist current progress, and log the stop point.
- [x] **FR-2.20:** Record the **AI provider and model ID** used for each extracted data element (entity description, semantic tag, scene split decision, etc.).
- [x] **FR-2.21:** Track token usage per provider per run (tokens consumed, estimated tokens remaining if available).

### Phase 3: Post-Processing & Consistency Validation
**Goal:** Once all 3 books have completed Phases 1 & 2, run cross-book validation and standardization.

#### 3.1 Taxonomy Standardization
- [x] **FR-3.1:** Analyze all AI-generated semantic tags across all 3 books.
- [x] **FR-3.2:** Generate a proposed **standardized taxonomy** -- merging synonyms (e.g., "rage" and "fury" -> "anger"), grouping related concepts, and establishing canonical tag names.
- [x] **FR-3.3:** Apply the standardized taxonomy to all existing records, replacing ad-hoc tags with canonical values.

#### 3.2 Entity Consistency
- [x] **FR-3.4:** Perform **entity resolution** across all books -- identify cases where the same entity may have been extracted under different names/aliases (e.g., "the warrior", "Kael", "the young man").
- [x] **FR-3.5:** Merge duplicate entities, consolidating descriptions and scene appearances under a single canonical entity record.
- [x] **FR-3.6:** Validate entity timelines -- ensure no logical gaps (entity appears in Scene 5 but wasn't present in Scenes 3-4 without an explanation).
- [x] **FR-3.7:** Validate description continuity -- flag cases where an entity's delta implies a change that contradicts prior state (e.g., gains an injury in Scene 2 but Scene 5 delta doesn't mention it despite a detailed description).

#### 3.3 Location Consistency
- [x] **FR-3.8:** Same resolution and validation as entities -- merge duplicate locations, validate descriptions across appearances.

#### 3.4 Cross-Provider Consistency
- [x] **FR-3.9:** Where data was generated by different AI providers (Claude vs Gemini), compare outputs for the same chapter/scene and flag discrepancies.
- [x] **FR-3.10:** Generate a consistency report highlighting differences in entity counts, description quality, or semantic tag choices between providers.

#### 3.5 Timeline & Context
- [x] **FR-3.12:** **Narrative Timeline Analysis:** After the entire book is loaded, perform a cross-chapter analysis to identify the narrative timeline context for each story beat. Values: `present`, `flashback`, `dream`, `vision`, `future`. This ensures that flashbacks or non-linear sequences are correctly flagged for the game engine, even if the chapter text itself is ambiguous.

#### 3.6 Output
- [x] **FR-3.13:** Generate a **Markdown consistency report** (`CONSISTENCY_REPORT.md`) covering:
  - Entity resolution proposals (aliases -> canonical name)
  - Flagged timeline/description inconsistencies
  - Taxonomy standardization changes
  - Cross-provider discrepancies
  - Statistics (entities per book, scenes per chapter, etc.)

### Phase 4: Human-Assisted Review
**Goal:** Provide a structured process for a human (with AI assistance) to review, approve, and refine all extracted data.

- [x] **FR-4.1:** The review process is **item-by-item** -- each flagged issue from the consistency report is presented for review.
- [x] **FR-4.2:** For each item, the human can: **approve** (apply as-is), **modify** (edit and apply), or **reject** (discard the suggestion).
- [x] **FR-4.3:** The review process is **resumable** -- if interrupted, it picks up from the last reviewed item.
- [x] **FR-4.4:** Track review status per item: `pending_review`, `approved`, `modified`, `rejected`.
- [x] **FR-4.5:** Approved/modified changes are applied directly to the database.
- [x] **FR-4.6:** AI assists during review by providing context (surrounding text, related entities, prior descriptions) to help the human make informed decisions.
- [x] **FR-4.7:** Generate a final **review summary** documenting all decisions made.

---

## 3. Resume & State Management

### 3.1 State Tracking
- [x] **FR-5.1:** Processing state is tracked **in the database** (not in files).
- [x] **FR-5.2:** Resume granularity is at the **chapter level** -- if processing is interrupted mid-chapter, that chapter is re-processed from the start on the next run.
- [x] **FR-5.3:** Each chapter has a processing status: `not_started`, `text_extracted`, `ai_extracted`, `post_processed`, `reviewed`.

### 3.2 Auto-Resume (Default Behavior)
- [x] **FR-5.4:** When the CLI is run **with no arguments**, it queries the DB to determine the current global state across all books and phases.
- [x] **FR-5.5:** The auto-resume logic determines the next action based on this priority:
  1. If Phase 1 is not complete for all 3 books, resume Phase 1 at the first incomplete book/chapter.
  2. If Phase 1 is complete for all books but Phase 2 is not, resume Phase 2 at the first incomplete book/chapter.
  3. If Phases 1 & 2 are complete for all books but Phase 3 has not run, start Phase 3.
  4. If Phase 3 is complete but Phase 4 has not run, start Phase 4.
  5. If all phases are complete, display a summary and exit.
- [x] **FR-5.6:** If the processor detects an **incomplete previous run** (e.g., a `processing_runs` record with status `running` or `stopped_token_limit`), it displays a warning with details of where processing stopped and prompts: *"Previous processing was interrupted at [Book X, Chapter Y, Phase Z]. Resume from this point? (y/n)"*
- [x] **FR-5.7:** If the user declines to resume, the processor exits without making changes.

### 3.3 User Confirmation Prompts
- [x] **FR-5.8:** When transitioning from one book to the next within a phase (e.g., Phase 1 Book 1 complete, moving to Phase 1 Book 2), prompt: *"Phase 1 complete for Book 1: Elysium Rising. Continue to Book 2: Elysium Fallen? (y/n)"*
- [x] **FR-5.9:** When transitioning from one phase to the next (e.g., Phase 1 complete for all books, moving to Phase 2), prompt: *"Phase 1 complete for all books. Proceed to Phase 2: AI Semantic Extraction? (y/n)"*
- [x] **FR-5.10:** If the user declines at any prompt, the processor saves current state and exits gracefully.

### 3.4 Progress Display
- [x] **FR-5.11:** Display a **persistent progress indicator** during processing using `rich` (progress bars, spinners, live status).
- [x] **FR-5.12:** The progress display must show:
  - Current phase and book being processed.
  - Chapter progress within the current book (e.g., `Chapter 5/18`).
  - Scene/beat progress within the current chapter (during Phase 1 splitting).
  - Entity/location extraction count (during Phase 2).
  - AI provider currently in use and cumulative token usage.
  - Elapsed time for the current run.
- [x] **FR-5.13:** On startup (before processing begins), display a **status summary table** showing the state of all books across all phases:
  ```
  Book Agent Reader - Status Overview
  +-----------------------+----------+----------+----------+----------+
  | Book                  | Phase 1  | Phase 2  | Phase 3  | Phase 4  |
  +-----------------------+----------+----------+----------+----------+
  | 1: Elysium Rising     | 12/18 ch | --       | --       | --       |
  | 2: Elysium Fallen     | --       | --       | --       | --       |
  | 3: Escape from Elysium| --       | --       | --       | --       |
  +-----------------------+----------+----------+----------+----------+
  Next action: Resume Phase 1 for Book 1 at Chapter 13.
  ```
- [x] **FR-5.14:** Log all status messages to both the console (via `rich`) and a log file simultaneously.

### 3.5 Database Reset
- [x] **FR-5.15:** The CLI accepts a `--clear-db` flag that **truncates all book processing tables**, resetting them to empty.
- [x] **FR-5.16:** Before clearing, display a confirmation prompt: *"WARNING: This will permanently delete ALL processed book data (X books, Y chapters, Z entities, W locations). Type 'CONFIRM' to proceed:"*
- [x] **FR-5.17:** The `--clear-db` operation truncates tables in reverse dependency order to respect foreign keys, or uses `TRUNCATE ... CASCADE`.

---

## 4. Database Schema
**Schema Definition:** [A_BOOK_AGENT_SCHEMA.md](A_BOOK_AGENT_SCHEMA.md)

---

## 5. CLI Interface

```
python book_processor.py [options]

Options:
  (no arguments)       Auto-detect state from DB, display status, and resume processing.
  --book <1|2|3>       Target a specific book (used with --phase or --reset-chapter).
  --phase <1|2|3|4>    Target a specific phase (used with --book for directed runs).
  --reset-chapter N    Force re-processing of chapter N in the specified --book (resets its status to not_started).
  --clear-db           Truncate all book processing tables after confirmation. Exits after clearing.
  --status             Display the status overview table and exit (no processing).
  --dry-run            Parse and display structure without writing to DB.
  --verbose            Verbose logging output.
```

### Default Behavior (No Arguments)
When run without arguments, the processor:
1. Connects to DB and reads the current state of all books and phases.
2. Displays the **status overview table** (FR-5.13).
3. Determines the next action (FR-5.5).
4. If a previous run was interrupted, warns and asks to resume (FR-5.6).
5. Begins processing with progress indicators (FR-5.11).
6. Prompts between book transitions (FR-5.8) and phase transitions (FR-5.9).
7. Continues until all phases are complete or the user declines a prompt.

### Directed Runs (With Arguments)
When `--book` and/or `--phase` are provided, the processor targets that specific book/phase directly, skipping the auto-resume logic. Confirmation prompts between books/phases still apply.

### Example Workflows
```bash
# Typical usage: just run it, it figures out what to do next
python book_processor.py

# Check status without processing anything
python book_processor.py --status

# Target a specific book and phase directly
python book_processor.py --book 2 --phase 1

# Re-process a specific chapter that had issues
python book_processor.py --book 1 --reset-chapter 5

# Nuke everything and start fresh
python book_processor.py --clear-db

# Preview what Phase 1 would extract without writing
python book_processor.py --book 1 --phase 1 --dry-run
```

---

## 6. DB Management Utility (`db_manager.py`)

A standalone utility for managing the book narrative database, supporting portability and maintenance.

- [x] **FR-6.1: Data Export:** Export all book-related tables (hierarchy, entities, locations, tags) to a single timestamped JSON or GZIP-compressed JSON file.
- [x] **FR-6.2: Data Import:** Restore a database from a previously exported file. Includes an automatic database wipe before insertion.
- [x] **FR-6.3: Table Truncation:** Wipe all book processing data from the database with dependency-safe cascading deletes.
- [x] **FR-6.4: Safety Prompts:** Require a typed `"CONFIRM"` string for destructive operations (Import and Clear).
- [x] **FR-6.5: Portability:** Support moving narrative data between different database environments (e.g., Local Dev to Cloud SQL).
- [x] **FR-6.6: Compression:** Support GZIP compression for exports to handle large narrative datasets efficiently.

---

## 7. AI Prompt Strategy

### 7.1 Phase 1 Prompts (Scene/Beat Splitting)
- Provide the AI with a full chapter text.
- Ask it to identify scene boundaries and story beats.
- Instruct: *"A scene is a continuous sequence of action in a single location or focused interaction. A story beat is a distinct moment within a scene -- an action, revelation, emotional shift, or transition -- typically 1-5 paragraphs."*
- Return structured JSON with scene and beat boundaries (character offsets or paragraph indices).

### 7.2 Phase 2 Prompts (Entity & Semantic Extraction)
- Process one scene at a time.
- Provide the scene text plus a summary of previously extracted entities (to enable cross-referencing and avoid duplicates).
- Ask for entities, locations, semantic tags, and descriptions in structured JSON format.
- For subsequent scenes in the same chapter, include delta instructions: *"If this entity was described previously, only note what has CHANGED."*

### 7.3 Phase 3 Prompts (Consistency & Standardization)
- Provide the full entity list with all aliases and descriptions.
- Ask AI to identify duplicates, inconsistencies, and propose a standardized taxonomy.
- Return structured JSON with merge proposals and taxonomy mappings.

### 7.4 Token Management
- Before each AI call, estimate token count of the prompt.
- Track cumulative usage per provider per run.
- If a provider returns a rate limit or quota error, switch to fallback provider.
- If both providers are exhausted, save state and exit gracefully with a clear log message.

---

## 8. Error Handling & Edge Cases

- [x] **FR-7.1:** If a `.docx` file cannot be read, fail immediately with a clear error message.
- [x] **FR-7.2:** If AI returns malformed JSON, retry once with a clarified prompt. If it fails again, log the error and skip to the next chapter.
- [x] **FR-7.3:** If the database connection is lost mid-processing, fail immediately (do not silently lose data). The chapter-level resume will handle recovery.
- [x] **FR-7.4:** All database writes for a single chapter should be wrapped in a **transaction** -- either the full chapter succeeds or nothing is written.
- [x] **FR-7.5:** Log all AI requests/responses to a local log file for debugging and audit purposes.

---

## 9. Non-Functional Requirements

- [x] **NFR-0:** Files for the parser (scripts, .env), should be stored in `/init/book_parser`
- [x] **NFR-1:** The processor must run on the developer's local machine (not in cloud).
- [x] **NFR-2:** All DB credentials and AI API keys are read from environment variables (`.env` file).
- [x] **NFR-3:** The processor must handle books of any length without running out of memory (stream/chunk processing for large chapters).
- [x] **NFR-4:** Processing logs should include timestamps, phase, chapter, and token counts for each operation.
- [x] **NFR-5:** The SQL schema creation scripts must be placed in the `/db` folder as `.sql` files per project convention.

---

## 10. Dependencies

| Package           | Purpose                                    |
|-------------------|--------------------------------------------|
| `python-docx`    | Parse `.docx` files.                       |
| `anthropic`      | Claude API client.                         |
| `google-generativeai` | Gemini API client.                    |
| `psycopg2` / `asyncpg` | PostgreSQL connection.              |
| `sqlmodel` / `sqlalchemy` | ORM (consistent with backend stack). |
| `python-dotenv`  | Environment variable loading.              |
| `rich`           | Progress bars, status tables, spinners, and formatted console output. Required for FR-5.11 through FR-5.14. |
| `click`          | CLI argument parsing and user prompts.     |

---

## 11. Relationship to Game Engine

This processor is a **data preparation utility**. Its output feeds into the game engine in the following ways:

| Processor Output          | Game Engine Usage                                   |
|---------------------------|-----------------------------------------------------|
| `story_beats.raw_text`    | Displayed to player as narrative text (rendered as images for copy protection). |
| `story_beats.intensity`   | Influences enemy difficulty and encounter pacing.    |
| `entities` (role=enemy)   | Generates enemy encounters for combat.               |
| `entities` (role=ally)    | Populates NPC interactions and story moments.        |
| `locations`               | Determines background art and ambient audio.         |
| `semantic_tags`           | Drives background music selection (SUNO) and mood.   |
| `chapters.sort_order`     | Defines the player's progression path.               |

---

*Last Updated: 2026-02-28*
