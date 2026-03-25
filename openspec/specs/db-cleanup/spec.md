# DB Cleanup and Entity Consolidation Specification

## Purpose
During automated ingestion of the Towers of Elysium trilogy, the Book Agent Reader extracted thousands of entities and locations with variations in casing, pluralization, possessives, and OCR/LLM extraction artifacts — resulting in many records referring to the same logical entity or location. This specification defines the tooling and process for identifying and safely merging duplicate records while preserving all foreign key relationships and alias history.

## Requirements

### Requirement: Duplicate Analysis Tooling
The system SHALL provide a `check_duplicates.py` script that identifies near-duplicate entity and location records using similarity scoring, alias overlap detection, and cross-entity alias matching.

#### Scenario: Case-insensitive duplicate detection
- GIVEN the database contains both "The Eternal Engine" and "the eternal engine"
- WHEN `check_duplicates.py` runs
- THEN both records SHALL be flagged as duplicates with their similarity score and written to `tools/check_dups/duplicate_analysis.log`

#### Scenario: Alias overlap detection
- GIVEN entity A has an alias that matches the canonical name of entity B
- WHEN the duplicate analysis runs
- THEN this overlap SHALL be flagged as a potential merge candidate in the analysis log

### Requirement: Safe Consolidation Script
The system SHALL provide a `consolidate_entities.py` script that merges duplicate records by re-mapping all foreign keys to a designated Master ID, preserving duplicate canonical names as aliases, and deleting the duplicate records — all within a single SQL transaction.

#### Scenario: Dry run mode
- GIVEN `consolidate_entities.py` is run without the `--execute` flag
- WHEN the script processes duplicate pairs
- THEN all intended changes SHALL be logged without executing any SQL mutations against the database

#### Scenario: FK re-mapping on merge
- GIVEN entity B (duplicate) is being merged into entity A (master)
- WHEN the consolidation executes
- THEN all rows in `entity_aliases`, `entity_scene_appearances`, `entity_beat_appearances`, and any other FK-referencing tables SHALL be updated to reference entity A's ID before entity B is deleted

#### Scenario: Alias preservation
- GIVEN entity B's canonical name is "the eternal engine"
- WHEN entity B is merged into entity A ("The Eternal Engine") and deleted
- THEN "the eternal engine" SHALL be added to entity A's `entity_aliases` table so future extractions map correctly

#### Scenario: Transaction atomicity
- GIVEN a merge operation involves re-mapping 15 FK rows across 4 tables
- WHEN any step in the merge fails
- THEN the entire transaction SHALL roll back with no partial state committed to the database

### Requirement: Phased Execution
The system SHALL support three phases of consolidation executed in order: case-insensitive merge, manual mapping via JSON config, and fuzzy merge with human review.

#### Scenario: Phase 1 — Case-insensitive merge
- GIVEN `LOWER(canonical_name)` is identical across two entity records
- WHEN Phase 1 executes
- THEN those records SHALL be merged automatically without requiring manual review

#### Scenario: Phase 2 — Manual mapping
- GIVEN a JSON configuration file maps "Protagonist's Home" to "The Narrator's House"
- WHEN Phase 2 executes
- THEN the consolidation SHALL merge those specific records as specified in the config

#### Scenario: Phase 3 — Fuzzy merge review
- GIVEN `check_duplicates.py` has identified near-matches with similarity scores above a threshold
- WHEN Phase 3 runs
- THEN the human operator SHALL review and approve each merge before it executes

### Requirement: Location Deduplication
The system SHALL apply the same consolidation logic to location records, re-mapping `location_aliases`, `location_scene_appearances`, `scenes.primary_location_id`, and `story_beats.location_id`.

#### Scenario: Location FK re-mapping
- GIVEN location B is being merged into location A
- WHEN the merge executes
- THEN `scenes.primary_location_id` and `story_beats.location_id` referencing location B SHALL be updated to reference location A

## Design
Tooling location: `tools/check_dups/`

Scripts:
- `check_duplicates.py` — Uses `difflib.SequenceMatcher` for similarity scoring. Detects: casing variants, pluralization, possessives/titles, generic alias overlap, cross-entity alias matches. Outputs to `duplicate_analysis.log`. Automatically overrides DB host to `localhost` if Docker environment detected.
- `consolidate_entities.py` — Accepts `--execute` flag (dry-run by default). Processes merge pairs from analysis log and/or JSON manual config. All changes within a single SQL transaction per merge pair.

Tables affected by consolidation:
- Entities: `entity_aliases`, `entity_scene_appearances`, `entity_beat_appearances`
- Locations: `location_aliases`, `location_scene_appearances`, `scenes.primary_location_id`, `story_beats.location_id`

Phase completion status:
- Phase 1 (Case-insensitive merge): COMPLETE
- Phase 2 (Manual mapping): COMPLETE
- Phase 3 (Fuzzy merge, human reviewed): COMPLETE

Pre-execution checklist: confirm prior migrations applied, take DB snapshot before running `--execute`, verify row counts match expectations after merge.
