# Player & Character Management Specification

## Purpose
Section 5.1 transforms the existing PlayerDetail admin page into a full support and testing workbench with deep editing capabilities for character stats, items, currency (Essence), skills, and progression. This enables player support (resolving corrupted/incorrect game states), QA (creating specific test scenarios), and moderation (viewing detailed activity timelines) — all without touching the database directly.

## Requirements

### Requirement: Character Deep Editor
The system SHALL allow admins to edit `character_name`, `level`, `character_xp`, and `class_id` on any player's character. Class reassignment SHALL remap skill records: remove class-exclusive skills from the old class, add class-exclusive skills for the new class, and call `recalculate_character_stats()`. All edits SHALL be logged to `admin_audit_log`.

#### Scenario: Character level set for QA
- GIVEN an admin needs to test level 50 content
- WHEN `PATCH /api/admin/characters/{id}` is called with `{"level": 50}`
- THEN the character's level is set to 50 and `recalculate_character_stats()` is called

#### Scenario: Class reassignment remaps skills
- GIVEN a Conduit character being reassigned to Drifter
- WHEN `PATCH /api/admin/characters/{id}` is called with `{"class_id": 1}` (Drifter)
- THEN Akashic Cascade is removed, Threshold Slip is added, stat affinities update, and stats are recalculated

### Requirement: Item Crafting Tool
The system SHALL allow admins to craft items for a character in two modes: manual (select each of the 5 components explicitly) or random (roll via `generate_dream_item()` with optional rarity lock). Crafted items SHALL be added directly to the character's inventory.

#### Scenario: Manual item craft
- GIVEN an admin selects specific prefix, quality, lore_tag, type_base, and suffix
- WHEN `POST /api/admin/characters/{id}/items/craft` is called with explicit components
- THEN an `inventory_items` record is created and a `player_inventory` row is inserted for the character

#### Scenario: Random craft with rarity lock
- GIVEN an admin requests a random Epic-rarity item
- WHEN the craft endpoint is called with `{"mode": "random", "rarity": "epic"}`
- THEN `generate_dream_item()` rolls with rarity forced to Epic and the result is granted to the character

### Requirement: Essence Currency Management
The system SHALL allow admins to grant or debit Elysium Essence for a character. All adjustments SHALL log to `admin_essence_adjustments` with before/after balance, reason, and admin email.

#### Scenario: Essence grant with audit trail
- GIVEN an admin grants 5000 Essence to fix a player support issue
- WHEN `POST /api/admin/characters/{id}/essence` is called with `{"adjust_type": "grant", "amount": 5000, "reason": "Bug compensation"}`
- THEN the character's essence balance increases, an `admin_essence_adjustments` row is created with full context

### Requirement: Progression Editor
The system SHALL allow admins to set a character's story progression (book/chapter/scene) directly. A forward jump SHALL backfill `player_scene_records` for all skipped scenes. Boss completion reset SHALL delete `boss_completions` records for a specified range.

#### Scenario: Forward progression jump with backfill
- GIVEN a character currently at Book 1, Chapter 3, Scene 5 and an admin jumps them to Book 2, Chapter 1, Scene 1
- WHEN `PATCH /api/admin/characters/{id}/progression` is called
- THEN `player_progress` is updated and `player_scene_records` rows are created for all skipped scenes

#### Scenario: Boss completion reset
- GIVEN a character with boss completions for Chapters 1–5 and an admin resets Chapter 3
- WHEN `DELETE /api/admin/characters/{id}/boss-completions` is called for chapter 3
- THEN only the Chapter 3 boss completion record is deleted

### Requirement: Activity Timeline
The system SHALL provide a paginated activity timeline for any player, showing story sessions, idle training, achievements, purchases, and admin actions in chronological order.

#### Scenario: Admin investigates suspicious state
- GIVEN an admin suspects a player of exploiting
- WHEN they open the Activity Timeline modal for that player
- THEN all activity events are shown in reverse-chronological order with type filters available

### Requirement: Audit Logging for All Admin Actions
Every admin action in this phase SHALL log to `admin_audit_log` with: admin_email, action name, target_type, target_id, details JSON (before/after values), and ip_address.

## Design

### System Diagram
```
PlayerDetail.tsx (enhanced)
  ├── CharacterEditorModal    ── PATCH /api/admin/characters/{id}
  │     └── StatBreakdownPanel ─ GET  /api/admin/characters/{id}/stats
  ├── ItemCraftModal          ── POST /api/admin/characters/{id}/items/craft
  ├── ItemEditorModal         ── PATCH /api/admin/items/{id}
  ├── EssenceAdjustModal      ── POST /api/admin/characters/{id}/essence
  ├── ProgressionEditorModal  ── PATCH /api/admin/characters/{id}/progression
  ├── SkillEditorModal        ── PATCH /api/admin/characters/{id}/skills
  └── ActivityTimelineModal   ── GET  /api/admin/players/{id}/timeline
```

### Shared Patterns
- Concurrency: last-write-wins
- Auth: `Depends(get_current_admin)` on all endpoints
- Stat recalculation: any mutation affecting stat sources calls `recalculate_character_stats()` before returning
- All mutations use `log_admin_action()` helper

### Module Structure
```
backend/
├── routes/admin_characters.py           # All 5.1 admin endpoints
├── services/admin_character_service.py  # Business logic
└── models/admin.py                      # AdminEssenceAdjustment model (extended)

admin/src/components/admin/
├── CharacterEditorModal.tsx
├── StatBreakdownPanel.tsx
├── ItemCraftModal.tsx / ItemComponentPicker.tsx
├── ItemEditorModal.tsx
├── EssenceAdjustModal.tsx
├── ProgressionEditorModal.tsx
├── SkillEditorModal.tsx
└── ActivityTimelineModal.tsx
```

## Schema

**Migration 056** (applied).

### `admin_essence_adjustments`
Follows the same pattern as `admin_shard_adjustments` (migration 054). Provides an immutable audit trail for admin Essence grants and debits.

```sql
admin_essence_adjustments:
  id SERIAL PK
  character_id → player_characters(id) CASCADE
  player_id    → players(id) CASCADE  (denormalized for player-level queries)
  admin_email  VARCHAR(255) NOT NULL
  adjustment_type VARCHAR(10) CHECK IN ('grant', 'debit')
  amount DOUBLE PRECISION CHECK > 0
  balance_before DOUBLE PRECISION NOT NULL
  balance_after  DOUBLE PRECISION NOT NULL
  reason VARCHAR(500) NOT NULL
  created_at TIMESTAMPTZ DEFAULT NOW()
```

Indexes: `(character_id)`, `(player_id)`, `(created_at DESC)`.

### Existing Tables Modified (No Schema Changes)
All editing operates on existing models. Key tables used:
- `player_characters` — level, character_xp, class_id, character_name edits
- `character_stats` — rebuilt by `recalculate_character_stats()`
- `character_skill_levels` — read/write level + current_xp; create new records; delete on class reassignment
- `inventory_items` + `player_inventory` — item craft (create), edit, discard
- `player_artifacts` — rarity/stat edits
- `player_progress` + `player_scene_records` + `boss_completions` — progression editing
