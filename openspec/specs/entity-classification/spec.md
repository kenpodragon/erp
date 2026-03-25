# Entity Classification Specification

## Purpose
Section 5.3 provides admin tooling for managing the classification systems that define what entities are, how they group, and how they animate in the battle banner. It normalizes `entity_type` and `entity_family` from free-form VARCHAR fields to FK-backed lookup tables, extends attack types with visual behavior mappings and stat multipliers, provides bulk classification assignment workflows, and surfaces a classification coverage audit view.

## Requirements

### Requirement: Entity Type Normalization
The system SHALL normalize `entities.entity_type` VARCHAR(50) to a FK reference to a new `entity_types` lookup table. The 9 existing distinct values SHALL be seeded as records. All backend queries filtering on `entity_type` SHALL be updated to use the FK join.

The system SHALL provide CRUD for entity types including deletion blocking when entities reference the type and a count of assigned entities per type.

#### Scenario: New entity type added without code change
- GIVEN an admin inserts a new entity type "mech" via the EntityTypeManager
- WHEN a new entity is created with `entity_type_id` referencing "mech"
- THEN the entity is classified correctly with no code deployment

#### Scenario: Entity type deletion blocked
- GIVEN the "enemy" type with 3,200 assigned entities
- WHEN an admin attempts to delete it
- THEN the endpoint returns 409 with "Cannot delete: 3200 entities reference this type"

### Requirement: Entity Family Normalization
The system SHALL normalize `entities.entity_family` VARCHAR(100) to a FK reference to a new `entity_families` lookup table. The table SHALL store metadata including `base_stat_template` JSONB, `lore_reference`, and `icon_key`. Initially all entities have NULL family; families are created via the admin UI or C_ generators.

#### Scenario: Family created and entities bulk-assigned
- GIVEN an admin creates an "Undead Knight" family with a stat template
- WHEN they bulk-assign 50 entities to that family
- THEN all 50 entities' `entity_family_id` FKs are updated in one operation

### Requirement: Visual Behavior Management
The system SHALL manage `visual_behaviors` records defining how entities animate in the battle banner (flying, ranged, melee, magic, custom). Each visual behavior SHALL have an `animation_config` JSONB for PixiJS rendering parameters and a `stat_weights` JSONB for stat-to-visual weight mapping (added in 5.4).

The system SHALL provide attack type admin CRUD (migrated from ContentEditor) extended with `visual_behavior_id` FK and `stat_multipliers` JSONB for family-based stat scaling.

#### Scenario: Attack type linked to visual behavior
- GIVEN an admin assigns the "magic_caster" visual behavior to the "Ethereal" attack type
- WHEN an entity with that attack type renders in the battle banner
- THEN the entity uses the magic_caster animation config

### Requirement: Bulk Classification Assignment
The system SHALL provide a bulk assignment panel allowing admins to:
- Select multiple entities (by type, family filter, or search)
- Assign attack type(s) with `is_primary` designation
- Assign entity family
- Apply a stat block template from the family's `base_stat_template`

All bulk operations SHALL be atomic (all succeed or all fail).

#### Scenario: Bulk attack type assignment with primary flag
- GIVEN 30 entities of the "Construct" family selected
- WHEN an admin bulk-assigns "Mechanical" as primary attack type
- THEN 30 `entity_attack_types` records are upserted with `is_primary = true`

### Requirement: Classification Audit
The system SHALL provide a classification coverage audit view showing summary cards for entities missing: attack type, family assignment, visual behavior mapping, and entity gameplay data. Admins SHALL be able to apply stat block templates directly from the audit view.

#### Scenario: Audit surfaces missing attack types
- GIVEN 3,900 of 3,936 entities have no attack type assigned
- WHEN the admin opens ClassificationAudit
- THEN a summary card shows "3,900 entities missing attack type" with a link to the bulk assignment panel

## Design

### Data Migration Strategy
Migration 058 performs a clean break:
1. Create `entity_types`, `entity_families`, `visual_behaviors` tables
2. Seed from existing distinct values
3. Add `entity_type_id`, `entity_family_id` FK columns to `entities`
4. Populate FKs from existing string values
5. Drop old `entity_type`, `entity_family` VARCHAR columns
6. Add `visual_behavior_id`, `stat_multipliers` to `attack_types`

### Module Structure
```
backend/
├── routes/admin_classification.py            # All 5.3 endpoints
├── services/admin_classification_service.py  # Classification CRUD
└── models/classification.py                  # EntityType, EntityFamily, VisualBehavior

admin/src/components/classification/
├── ClassificationEditor.tsx    # Tabbed container
├── EntityTypeManager.tsx
├── EntityFamilyManager.tsx
├── AttackTypeManager.tsx + StatMultiplierPanel.tsx
├── VisualBehaviorManager.tsx + AnimationConfigEditor.tsx
├── BulkAssignmentPanel.tsx
└── ClassificationAudit.tsx + TemplateApplyModal.tsx
```

## Schema

**Migration 058** (applied).

### New Table: `entity_types`
```
id SERIAL PK
name VARCHAR(50) UNIQUE NOT NULL            -- system key: 'enemy', 'creature', etc.
display_name VARCHAR(100) NOT NULL
description TEXT
color_hex VARCHAR(7)                        -- UI badge color, e.g. '#FF4444'
sort_order INTEGER DEFAULT 0
created_at, updated_at TIMESTAMPTZ
```

9 seed records: enemy (#FF4444), creature (#44AA44), character (#4488FF), manifestation (#AA44FF), object (#AAAAAA), group (#FFAA44), environment (#44AAAA), event (#FF44AA), other (#888888).

### New Table: `entity_families`
```
id SERIAL PK
name VARCHAR(100) UNIQUE NOT NULL
display_name VARCHAR(100) NOT NULL
description TEXT
icon_key VARCHAR(100)                       -- Asset Registry reference
lore_reference TEXT
base_stat_template JSONB                    -- {"strength": N, "agility": N, "intelligence": N, "base_hp": N, "base_gold": N}
sort_order INTEGER DEFAULT 0
created_at, updated_at TIMESTAMPTZ
```

Initially empty — populated by admins and C_ generators.

### New Table: `visual_behaviors`
Defines animation behavior types for battle banner rendering. 5 initial seeds: `grounded_melee`, `grounded_ranged`, `airborne`, `magic_caster`, `hybrid`.

### `entities` — Column Changes (migration 058)
- ADD `entity_type_id INTEGER FK entity_types(id) SET NULL`
- ADD `entity_family_id INTEGER FK entity_families(id) SET NULL`
- POPULATE from existing string values
- DROP `entity_type VARCHAR(50)`
- DROP `entity_family VARCHAR(100)`

### `attack_types` — New Columns (migration 058)
- ADD `visual_behavior_id INTEGER FK visual_behaviors(id) SET NULL`
- ADD `stat_multipliers JSONB` — family-based damage/HP multipliers
