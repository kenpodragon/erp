# Game Content Editor Specification

## Purpose
Section 5.2 provides admin tooling for managing all narrative and world-building data in the Elysium Rising universe — including 3 books, 138 chapters, 724 scenes, 2,041 story beats, 3,936+ entities, 449 locations, 6,221 semantic tags, and associated gameplay data. After this phase, a game admin can manage the full content lifecycle entirely through the admin UI once books are initially loaded via the book_parser tool. The World Builder page consolidates the new Narrative Editor with the existing Content Editor (2.4).

## Requirements

### Requirement: Book and Chapter Management
The system SHALL provide paginated read/edit access to books and chapters. Raw narrative text fields SHALL be read-only (set by book_parser). Admin-editable fields include level requirements (`recommended_level`, `min_level`), `transition_lore_text`, and `base_atmosphere`. Deletion SHALL be blocked when child records exist.

#### Scenario: Chapter level gate set
- GIVEN a chapter with no `min_level` set
- WHEN an admin sets `min_level = 20` via the Chapter Editor
- THEN the chapter record is updated and story session starts are blocked for players below level 20

#### Scenario: Delete blocked with child scenes
- GIVEN a chapter with 5 scenes
- WHEN an admin attempts to delete the chapter
- THEN the endpoint returns 409 with "Cannot delete: 5 scenes reference this chapter"

### Requirement: Scene and Story Beat Editing
The system SHALL allow admins to edit scene gameplay data, boss configuration (structured JSONB editor), and wave composition (via `scene_wave_configs`). Story beat text SHALL be fully editable including `hidden_lore_text` and `lore_intelligence_threshold`.

#### Scenario: Boss config updated via structured editor
- GIVEN a chapter boss scene
- WHEN an admin updates the boss entity, timer duration, and interrupt types via BossConfigEditor
- THEN the `scene_gameplay_data.boss_config` JSONB is updated

#### Scenario: Story beat hidden lore added
- GIVEN a story beat with no hidden lore
- WHEN an admin sets `hidden_lore_text` and `lore_intelligence_threshold = 25`
- THEN players with INT >= 25 see the hidden text; others see a locked indicator

### Requirement: Entity Catalog Management
The system SHALL provide full CRUD for the 3,936+ entity catalog. Admins SHALL be able to edit entity gameplay data (HP, gold, stat_block JSONB), manage entity-scene and entity-beat appearance mappings, manage attack type assignments (with `is_primary` flag), and manage aliases. Bulk assignment SHALL support assigning attack types or families to multiple entities at once.

#### Scenario: Entity gameplay data set
- GIVEN an entity with no `entity_gameplay_data` record (missing_stat audit log entry)
- WHEN an admin sets base_hp, base_gold, and stat_block via EntityGameplayPanel
- THEN an `entity_gameplay_data` record is created and the dev_content_audit entry can be resolved

#### Scenario: Bulk attack type assignment
- GIVEN 20 entities of the "Wraith" family all lack attack type assignments
- WHEN an admin bulk-assigns "Ethereal" attack type to all 20
- THEN 20 `entity_attack_types` records are created

### Requirement: Location and Background Management
The system SHALL provide CRUD for locations with full sensory metadata (ambiance, scent, sound, visual descriptions) and location-scene appearance tracking with sensory deltas. Background definitions SHALL be managed via the Background Editor with `parallax_config`, `time_of_day`, `mood`, and `color_palette` fields.

### Requirement: Wave Configuration
The system SHALL provide per-scene wave configuration via `scene_wave_configs` including `max_enemies_per_wave`, `wave_count`, `spawn_interval_ms`, `scaling_factor`, `hp_multiplier`, `gold_multiplier`, and an `entity_pool` JSONB array with per-entity weights and wave range constraints. Bulk wave config operations SHALL allow copying a config across multiple scenes.

#### Scenario: Entity pool configured for a scene
- GIVEN a scene with no wave config
- WHEN an admin creates a `scene_wave_configs` record with an entity_pool of 3 entities with weights
- THEN the scene uses weighted random enemy selection during gameplay

## Design

### System Diagram
```
WorldBuilder.tsx (top-level page)
  ├── NarrativeEditor.tsx (NEW — 5.2)
  │     ├── BookEditor, ChapterEditor, SceneEditor
  │     │     ├── SceneGameplayPanel, BossConfigEditor, WaveConfigPanel
  │     ├── StoryBeatEditor (with SemanticTags)
  │     ├── EntityEditor (with GameplayPanel, AliasPanel, AttackTypePanel)
  │     ├── EntitySceneMapper, EntityBeatMapper
  │     ├── BackgroundEditor
  │     └── LocationEditor (with AliasPanel)
  └── ContentEditor.tsx (existing — 2.4, re-routed under WorldBuilder)
```

### Shared Patterns
- Pagination: all list endpoints return `{"items": [...], "total": N, "page": P, "page_size": S}`
- Deletion blocking: 409 with `{"detail": "...", "child_counts": {...}}`
- FK pickers: cascading dropdowns (book → chapter → scene)
- Audit logging: all mutations log via `log_admin_action()`

### Module Structure
```
backend/
├── routes/admin_content.py               # All 5.2 endpoints
├── services/admin_content_service.py     # Content CRUD business logic
├── models/content.py                     # Background, SceneWaveConfig models
└── models/narrative.py                   # Extended: Location.description
```

## Schema

**Migration 057** (applied).

### New Table: `backgrounds`
```
id SERIAL PK
name VARCHAR(100) UNIQUE NOT NULL
description TEXT
background_key VARCHAR(100) UNIQUE NOT NULL   -- links to Asset Registry
parallax_config JSONB DEFAULT '{}'
time_of_day VARCHAR(50)
mood VARCHAR(50)
color_palette JSONB
created_at, updated_at TIMESTAMPTZ
```

### New Table: `scene_wave_configs`
```
id SERIAL PK
scene_id INTEGER UNIQUE FK scenes(id) CASCADE  -- one config per scene
max_enemies_per_wave INTEGER DEFAULT 5
wave_count INTEGER DEFAULT 10
spawn_interval_ms INTEGER DEFAULT 2000
scaling_factor DOUBLE PRECISION DEFAULT 1.0
hp_multiplier DOUBLE PRECISION DEFAULT 1.0
gold_multiplier DOUBLE PRECISION DEFAULT 1.0
entity_pool JSONB DEFAULT '[]'               -- [{entity_id, weight, min_wave, max_wave}]
boss_entity_id INTEGER FK entities(id) SET NULL
created_at, updated_at TIMESTAMPTZ
```

### Existing Table Extensions (migration 057)
- `scene_gameplay_data` gains `background_id INTEGER FK backgrounds(id) SET NULL`
- `locations` gains `description TEXT`
