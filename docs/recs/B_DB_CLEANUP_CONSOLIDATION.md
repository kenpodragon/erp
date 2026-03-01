# DB Cleanup & Entity Consolidation Requirements

This document outlines the strategy and requirements for cleaning up and consolidating duplicate or near-duplicate entries in the narrative database (entities and locations).

## 1. Context & Problem Statement
During the automated ingestion of the *Towers of Elysium* trilogy, the "Book Agent Reader" extracted thousands of entities and locations. Due to variations in how names appear in text (casing, pluralization, possessives, and OCR/LLM extraction artifacts), many records refer to the same logical entity or location.

### 1.1 Identified Issues
- **Casing:** `The Eternal Engine` vs `The eternal engine`.
- **Pluralization:** `Einstein-Rosen Bridge` vs `Einstein-Rosen Bridges`.
- **Possessives/Titles:** `The Narrator's Mother-in-law` vs `The Narrator's Mother-in-Law`.
- **Formatting:** `1400 Smith Street, Houston, Texas` vs `1400 Smith Street, Houston`.
- **Generic Aliases:** Highly generic terms (e.g., "he", "she", "the creature") being mapped to unique IDs instead of linked as aliases.

## 2. Tooling: Duplicate Analysis (`check_duplicates.py`)
A specialized script `check_duplicates.py` has been developed to identify these issues.

### 2.1 Features
- **Similarity Scoring:** Uses Python's `difflib.SequenceMatcher` to find near-matches.
- **Alias Overlap:** Identifies when an alias of one entity matches the canonical name of another.
- **Cross-Entity Aliases:** Finds similar aliases used across different entities.
- **Logging:** Outputs findings to `tools/check_dups/duplicate_analysis.log` for review.

### 2.2 Usage
```powershell
python tools/check_dups/check_duplicates.py
```
*Note: The script automatically overrides the database host to `localhost` if it detects a Docker environment setting.*

## 3. Consolidation Requirements (`consolidate_entities.py`)
The consolidation script must perform the following actions safely:

### 3.1 Core Logic
- **Master Record Selection:** For a set of duplicates, one "Master" ID must be selected (usually the oldest ID or the one with the most metadata).
- **FK Re-mapping:** All foreign keys pointing to the "Duplicate" IDs must be updated to point to the "Master" ID.
    - Tables to update: `entity_aliases`, `entity_scene_appearances`, `entity_beat_appearances`, `location_aliases`, `location_scene_appearances`, `scenes.primary_location_id`, `story_beats.location_id`.
- **Alias Preservation:** Before deleting a duplicate, its `canonical_name` should be added to the Master's `entity_aliases` or `location_aliases` table to ensure future extractions map correctly.
- **Deletion:** Safely delete the duplicate records after re-mapping.

### 3.2 Safety Features
- **Dry Run Mode:** Must support a `--dry-run` flag that logs intended changes without executing SQL.
- **Backup:** Recommend a DB snapshot before execution.
- **Transaction-Based:** All changes for a single merge must occur within a single SQL transaction.
- **Case-Insensitive Deduplication:** Priority 1 is merging records where `LOWER(canonical_name)` is identical.

### 3.3 Execution
```powershell
python tools/check_dups/consolidate_entities.py [--execute]
```

## 4. Implementation Phases
1. **[x] Phase 1: Case-Insensitive Merge.** Merge `The Engine` and `the engine`.
2. **[x] Phase 2: Manual Mapping.** Use a JSON configuration file to merge known duplicates (e.g., `Protagonist's Home` -> `The Narrator's House`).
3. **[ ] Phase 3: Fuzzy Merge (Human Reviewed).** Review fuzzy matches from `check_duplicates.py` and approve merges.
