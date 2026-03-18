# Book Agent Reader: Database Schema

This document defines the database schema for the **Book Agent Reader** utility. These tables store the structured narrative data extracted from the *Towers of Elysium* trilogy.

---

## 1. Narrative Hierarchy

### `books`
| Column          | Type         | Description                                |
|-----------------|--------------|--------------------------------------------|
| `id`            | `SERIAL PK`  | Auto-incrementing primary key.             |
| `book_number`   | `INTEGER`    | Book sequence (1, 2, 3). `UNIQUE`.         |
| `title`         | `VARCHAR(255)`| Book title.                               |
| `source_file`   | `VARCHAR(255)`| Filename in `../Books/`.                  |
| `created_at`    | `TIMESTAMPTZ` | Record creation time. Default `NOW()`.    |
| `updated_at`    | `TIMESTAMPTZ` | Last update time. Default `NOW()`.        |

### `chapters`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `book_id`           | `INTEGER FK`   | References `books.id`. `ON DELETE CASCADE`.         |
| `chapter_number`    | `INTEGER`      | Chapter sequence within the book.                   |
| `title`             | `VARCHAR(255)` | Chapter title (if available from TOC/heading).       |
| `raw_text`          | `TEXT`         | Full raw chapter text.                               |
| `sort_order`        | `INTEGER`      | Global sort order across all books.                  |
| `processing_status` | `VARCHAR(50)`  | `not_started`, `text_extracted`, `ai_extracted`, `post_processed`, `reviewed`. Default `not_started`. |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |
| **Constraints**     |                | `UNIQUE(book_id, chapter_number)`.                   |

### `scenes`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `chapter_id`        | `INTEGER FK`   | References `chapters.id`. `ON DELETE CASCADE`.      |
| `scene_number`      | `INTEGER`      | Scene sequence within the chapter.                  |
| `title`             | `VARCHAR(255)` | AI-generated scene title.                            |
| `summary`           | `TEXT`         | AI-generated scene summary (context for review and game engine). |
| `raw_text`          | `TEXT`         | Full scene text.                                     |
| `sort_order`        | `INTEGER`      | Sort order within chapter.                           |
| `primary_location_id`| `INTEGER FK`  | References `locations.id` (nullable). The main location for this scene. |
| `has_hard_break`    | `BOOLEAN`      | Whether this scene was identified by a hard break marker (e.g., `******`). Default `false`. |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |
| **Constraints**     |                | `UNIQUE(chapter_id, scene_number)`.                  |

### `story_beats`
| Column          | Type          | Description                                          |
|-----------------|---------------|------------------------------------------------------|
| `id`            | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `scene_id`      | `INTEGER FK`   | References `scenes.id`. `ON DELETE CASCADE`.        |
| `beat_number`   | `INTEGER`      | Beat sequence within the scene.                     |
| `summary`       | `VARCHAR(500)` | AI-generated one-line beat summary.                  |
| `raw_text`      | `TEXT`         | Full beat text.                                      |
| `sort_order`    | `INTEGER`      | Sort order within scene.                             |
| `location_id`   | `INTEGER FK`   | References `locations.id` (nullable). Override if the beat's location differs from the scene's primary location (e.g., a chase). |
| `intensity`     | `SMALLINT`     | Dramatic intensity (1-5). Check `intensity BETWEEN 1 AND 5`. |
| `pacing`        | `VARCHAR(50)`  | Pacing descriptor (`slow-burn`, `action`, `dialogue-heavy`, `contemplative`, etc.). |
| `timeline_context`| `VARCHAR(50)` | Narrative context: `present`, `flashback`, `dream`, `vision`, `future`. |
| `created_at`    | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`    | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |
| **Constraints** |                | `UNIQUE(scene_id, beat_number)`.                     |

---

## 2. Entities (Characters, Enemies, Neutral Figures)

### `entities`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `canonical_name`    | `VARCHAR(255)` | Primary/canonical name. `UNIQUE`.                   |
| `entity_type`       | `VARCHAR(50)`  | `character`, `creature`, `object`, `environment`, `manifestation`, `group`, `other`. |
| `is_generated`      | `BOOLEAN`      | `false` if extracted from text, `true` if creatively generated by AI to meet minimum entity requirements. Default `false`. |
| `base_description`  | `TEXT`         | Canonical/base physical and personality description.  |
| `base_emotional_state`| `TEXT`       | Default emotional state.                             |
| `base_sounds`       | `TEXT`         | Associated sounds (voice, footsteps, etc.).          |
| `base_smells`       | `TEXT`         | Associated smells.                                   |
| `base_equipment`    | `TEXT`         | Default equipment/clothing.                          |
| `base_abilities`    | `TEXT`         | Known abilities/powers.                              |
| `first_appearance_scene_id` | `INTEGER FK` | References `scenes.id` (nullable, `ON DELETE SET NULL`). Where entity first appears. |
| `ai_provider`       | `VARCHAR(50)`  | AI provider that generated the base description.     |
| `ai_model_id`       | `VARCHAR(100)` | Specific model ID used.                              |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |

### `entity_aliases`
| Column          | Type          | Description                                          |
|-----------------|---------------|------------------------------------------------------|
| `id`            | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `entity_id`     | `INTEGER FK`   | References `entities.id`. `ON DELETE CASCADE`.      |
| `alias`         | `VARCHAR(255)` | Alternate name/reference (e.g., "the warrior").     |
| `context`       | `TEXT`         | Where/why this alias is used.                        |
| **Constraints** |                | `UNIQUE(entity_id, alias)`.                          |

### `entity_scene_appearances`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `entity_id`         | `INTEGER FK`   | References `entities.id`. `ON DELETE CASCADE`.      |
| `scene_id`          | `INTEGER FK`   | References `scenes.id`. `ON DELETE CASCADE`.        |
| `role`              | `VARCHAR(50)`  | `ally`, `enemy`, `neutral`, `unknown`.              |
| `is_present`        | `BOOLEAN`      | Whether entity is actively present (vs. mentioned/absent). Default `true`. |
| `description_delta` | `TEXT`         | What changed from the base description in this scene. Null if no change. |
| `emotional_state_delta` | `TEXT`     | Emotional state change from base. Null if unchanged.  |
| `equipment_delta`   | `TEXT`         | Equipment changes from base. Null if unchanged.       |
| `exit_reason`       | `VARCHAR(255)` | Why entity left the scene (if applicable).            |
| `entry_context`     | `TEXT`         | How entity entered/arrived in the scene.              |
| `relationships`     | `TEXT`         | Relationships to other entities in this scene.        |
| `ai_provider`       | `VARCHAR(50)`  | AI provider that generated this record.               |
| `ai_model_id`       | `VARCHAR(100)` | Specific model ID used.                               |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.                |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                    |
| **Constraints**     |                | `UNIQUE(entity_id, scene_id)`.                        |

### `entity_beat_appearances`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `entity_id`         | `INTEGER FK`   | References `entities.id`. `ON DELETE CASCADE`.      |
| `story_beat_id`     | `INTEGER FK`   | References `story_beats.id`. `ON DELETE CASCADE`.   |
| `role`              | `VARCHAR(50)`  | `ally`, `enemy`, `neutral`, `unknown`. Role in this specific beat. |
| `is_primary`        | `BOOLEAN`      | Whether this entity is the primary antagonist/focus of this beat. Default `false`. |
| `beat_context`      | `TEXT`         | Brief note on what the entity does in this beat (attacks, blocks path, etc.). |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| **Constraints**     |                | `UNIQUE(entity_id, story_beat_id)`.                   |

---

## 3. Locations

### `locations`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `canonical_name`    | `VARCHAR(255)` | Primary location name. `UNIQUE`.                    |
| `location_type`     | `VARCHAR(50)`  | `interior`, `exterior`, `transitional`, `other`.    |
| `base_visual`       | `TEXT`         | Canonical visual description.                        |
| `base_auditory`     | `TEXT`         | Canonical ambient sounds.                            |
| `base_olfactory`    | `TEXT`         | Canonical smells.                                    |
| `base_tactile`      | `TEXT`         | Temperature, humidity, terrain, etc.                 |
| `base_atmosphere`   | `TEXT`         | Overall mood/atmosphere.                             |
| `first_appearance_scene_id` | `INTEGER FK` | References `scenes.id` (nullable, `ON DELETE SET NULL`). |
| `ai_provider`       | `VARCHAR(50)`  | AI provider that generated the base description.     |
| `ai_model_id`       | `VARCHAR(100)` | Specific model ID used.                              |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |

### `location_aliases`
| Column          | Type          | Description                                          |
|-----------------|---------------|------------------------------------------------------|
| `id`            | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `location_id`   | `INTEGER FK`   | References `locations.id`. `ON DELETE CASCADE`.     |
| `alias`         | `VARCHAR(255)` | Alternate name/reference.                            |
| `context`       | `TEXT`         | Where/why this alias is used.                        |
| **Constraints** |                | `UNIQUE(location_id, alias)`.                        |

### `location_scene_appearances`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `location_id`       | `INTEGER FK`   | References `locations.id`. `ON DELETE CASCADE`.     |
| `scene_id`          | `INTEGER FK`   | References `scenes.id`. `ON DELETE CASCADE`.        |
| `visual_delta`      | `TEXT`         | Visual changes from base. Null if unchanged.         |
| `auditory_delta`    | `TEXT`         | Sound changes from base. Null if unchanged.          |
| `olfactory_delta`   | `TEXT`         | Smell changes from base. Null if unchanged.          |
| `tactile_delta`     | `TEXT`         | Environmental changes from base. Null if unchanged.  |
| `atmosphere_delta`  | `TEXT`         | Mood/atmosphere changes. Null if unchanged.          |
| `ai_provider`       | `VARCHAR(50)`  | AI provider that generated this record.              |
| `ai_model_id`       | `VARCHAR(100)` | Specific model ID used.                              |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |
| **Constraints**     |                | `UNIQUE(location_id, scene_id)`.                     |

---

## 4. Semantic Tags

### `semantic_tags`
| Column          | Type          | Description                                          |
|-----------------|---------------|------------------------------------------------------|
| `id`            | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `story_beat_id` | `INTEGER FK`   | References `story_beats.id`. `ON DELETE CASCADE`.   |
| `category`      | `VARCHAR(50)`  | Tag category: `emotion`, `theme`, `sensory`.        |
| `value`         | `VARCHAR(100)` | Tag value (e.g., `fear`, `betrayal`, `auditory`).   |
| `canonical_value`| `VARCHAR(100)` | Standardized value after Phase 3 taxonomy pass. Null until standardized. |
| `notes`         | `TEXT`         | Free-form AI notes for nuance beyond the structured tag. |
| `ai_provider`   | `VARCHAR(50)`  | AI provider that generated this tag.                 |
| `ai_model_id`   | `VARCHAR(100)` | Specific model ID used.                              |
| `created_at`    | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`    | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |

---

## 5. Processing State & Audit

### `processing_runs`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `book_id`           | `INTEGER FK`   | References `books.id`. `ON DELETE CASCADE`.         |
| `phase`             | `INTEGER`      | Phase number (1, 2, 3, 4).                          |
| `started_at`        | `TIMESTAMPTZ`  | When this run started. Default `NOW()`.              |
| `ended_at`          | `TIMESTAMPTZ`  | When this run ended (null if still running).         |
| `status`            | `VARCHAR(50)`  | `running`, `completed`, `stopped_token_limit`, `failed`. |
| `last_completed_chapter_id` | `INTEGER FK` | Last chapter fully processed in this run (nullable). |
| `claude_tokens_used`| `BIGINT`       | Total Claude tokens consumed in this run. Default `0`. |
| `gemini_tokens_used`| `BIGINT`       | Total Gemini tokens consumed in this run. Default `0`. |
| `error_message`     | `TEXT`         | Error details if `failed`.                           |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |

### `review_items`
| Column              | Type          | Description                                          |
|---------------------|---------------|------------------------------------------------------|
| `id`                | `SERIAL PK`   | Auto-incrementing primary key.                       |
| `category`          | `VARCHAR(50)`  | `entity_resolution`, `description_inconsistency`, `timeline_gap`, `taxonomy_change`, `cross_provider_discrepancy`. |
| `severity`          | `VARCHAR(20)`  | `info`, `warning`, `error`.                          |
| `title`             | `VARCHAR(500)` | Short summary of the issue.                          |
| `description`       | `TEXT`         | Detailed description of the issue.                   |
| `suggested_action`  | `TEXT`         | AI's recommended fix.                                |
| `affected_entity_id`| `INTEGER FK`   | References `entities.id` (nullable, `ON DELETE SET NULL`). |
| `affected_location_id`| `INTEGER FK` | References `locations.id` (nullable, `ON DELETE SET NULL`). |
| `affected_scene_id` | `INTEGER FK`   | References `scenes.id` (nullable, `ON DELETE SET NULL`). |
| `affected_beat_id`  | `INTEGER FK`   | References `story_beats.id` (nullable, `ON DELETE SET NULL`). |
| `review_status`     | `VARCHAR(50)`  | `pending_review`, `approved`, `modified`, `rejected`. Default `pending_review`. |
| `reviewer_notes`    | `TEXT`         | Human reviewer's notes/modifications.                |
| `reviewed_at`       | `TIMESTAMPTZ`  | When the review decision was made.                   |
| `created_at`        | `TIMESTAMPTZ`  | Record creation time. Default `NOW()`.               |
| `updated_at`        | `TIMESTAMPTZ`  | Last update time. Default `NOW()`.                   |

---

## 6. Constraints & Indexes Summary

### Cascade Delete Chain
Deleting a book cascades through the entire hierarchy:
`books` -> `chapters` -> `scenes` -> `story_beats` -> `semantic_tags`, `entity_beat_appearances`

Entities and locations use `ON DELETE SET NULL` for `first_appearance_scene_id` (they are standalone, not owned by scenes).

### Key Indexes
- `idx_chapters_book_id` on `chapters(book_id)`
- `idx_chapters_processing_status` on `chapters(processing_status)`
- `idx_scenes_chapter_id` on `scenes(chapter_id)`
- `idx_scenes_primary_location_id` on `scenes(primary_location_id)`
- `idx_story_beats_scene_id` on `story_beats(scene_id)`
- `idx_story_beats_location_id` on `story_beats(location_id)`
- `idx_entity_scene_app_entity_id` on `entity_scene_appearances(entity_id)`
- `idx_entity_scene_app_scene_id` on `entity_scene_appearances(scene_id)`
- `idx_entity_beat_app_entity_id` on `entity_beat_appearances(entity_id)`
- `idx_entity_beat_app_beat_id` on `entity_beat_appearances(story_beat_id)`
- `idx_location_scene_app_location_id` on `location_scene_appearances(location_id)`
- `idx_location_scene_app_scene_id` on `location_scene_appearances(scene_id)`
- `idx_semantic_tags_beat_id` on `semantic_tags(story_beat_id)`
- `idx_semantic_tags_category` on `semantic_tags(category)`
- `idx_review_items_status` on `review_items(review_status)`

---
*Last Updated: 2026-02-28*
