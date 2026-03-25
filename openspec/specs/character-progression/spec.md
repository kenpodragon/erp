# Character Progression Specification

## Purpose
Character & Progression Systems define how players grow through the game via an extensible stat engine, character levels, class identities, skills with prerequisites, procedurally generated dream items, and a run achievement system. Stats are fully database-driven (adding a new stat requires only a DB insert), classes carry narrative-derived identities with class-exclusive skills, and all coefficients are configurable via `game_configs`.

## Requirements

### Requirement: Extensible Stat System
The system SHALL compute character stat totals from the sum of all sources: class base values, idle training contributions, Lore skill distribution, character level bonuses, and equipped items.

The system SHALL allow new stats to be added via a database insert into `stat_definitions` without requiring code changes to the calculation engine.

#### Scenario: Stat total computation at session start
- GIVEN a player character of class Drifter at level 25 with all idle skills at level 50
- WHEN the session starts and `recalculate_character_stats()` is invoked
- THEN STR = 83, AGI = 59, INT = 30 (class base + idle + Lore distribution + char level contributions)

#### Scenario: New stat added via DB only
- GIVEN a new `stat_definitions` row inserted for "Endurance" with idle skill mapping in `idle_skill_stat_contributions`
- WHEN `recalculate_character_stats()` runs for any character
- THEN the new stat total is computed and stored in `character_stats` without a code deployment

#### Scenario: Equipment changes trigger stat recalculation
- GIVEN a player equips an item with +10 STR bonus
- WHEN the equip endpoint is called
- THEN `recalculate_character_stats()` is called and `character_stats.computed_total` for STR increases by 10

### Requirement: Lore Stat Distribution
The system SHALL distribute the Lore idle skill's bonus pool across a character's primary and secondary stats according to class-specific weights stored in `class_stat_affinities`.

#### Scenario: Drifter Lore distribution
- GIVEN a Drifter character with Lore at level 50 (pool = 30 with coefficient 0.6)
- WHEN stat totals are computed
- THEN STR receives +18 (60% of 30) and AGI receives +12 (40% of 30)

#### Scenario: Vessel equal distribution
- GIVEN a Vessel character with Lore at level 99 (pool = 59)
- WHEN stat totals are computed
- THEN STR, AGI, and INT each receive approximately +19 (33% each)

### Requirement: Character Level System
The system SHALL accrue Character XP from idle training (configurable fraction) and story mode scene completions (configurable flat amount per scene). The system SHALL enforce a quadratic level-up curve with K=1000.

The system SHALL apply a `min_level` hard gate on story session start, preventing players below the required level from entering a scene or chapter.

#### Scenario: Level-up grants primary stat bonus
- GIVEN a Conduit character levels up from 24 to 25
- WHEN the level-up is processed
- THEN INT receives +1 (primary stat bonus per level) and AGI receives +1 (secondary, every other level)

#### Scenario: Hard level gate enforced
- GIVEN a chapter with `min_level = 20` and a player at character level 15
- WHEN the player attempts to start a story session for that chapter
- THEN the session start is rejected with a level requirement error

### Requirement: Class System
The system SHALL define four classes (Drifter, Engineer, Conduit, Vessel) each with a distinct primary stat, idle affinity skill, and class-exclusive hotbar skill. Class visual identity SHALL be stored as `visual_config` JSONB and rendered in the frontend.

#### Scenario: Class-exclusive skill only accessible to correct class
- GIVEN a Drifter character
- WHEN the available skills list is fetched
- THEN Threshold Slip (Drifter exclusive) is available and Energy Shields, Akashic Cascade, Elder Fury are not

#### Scenario: Class reassignment remaps skills
- GIVEN an admin reassigns a character from Conduit to Drifter via the admin workbench
- WHEN the reassignment is processed
- THEN Akashic Cascade is removed, Threshold Slip is added, and `recalculate_character_stats()` is called

### Requirement: Skill Prerequisite Tree
The system SHALL enforce skill prerequisites before allowing a player to unlock a skill. Prerequisites MAY reference character level, scene completions, or other skill levels.

#### Scenario: Prerequisite check blocks early unlock
- GIVEN a universal hotbar skill with prerequisite `char_level >= 10`
- WHEN a player at level 8 attempts to unlock it
- THEN the unlock is rejected with a prerequisite-not-met error

#### Scenario: Scene-cleared prerequisite gates idle skill
- GIVEN an idle skill gated on a specific scene being cleared
- WHEN the player completes that scene for the first time
- THEN the idle skill becomes available to unlock

### Requirement: Dream Item Generation
The system SHALL generate procedural items using a 5-component pipeline (prefix + quality + lore_tag + type_base + suffix), with rarity determined by per-book weight tables and stat ranges scaled by rarity multipliers.

#### Scenario: Generated item has min_char_level requirement
- GIVEN an item is generated with a stat total exceeding a threshold
- WHEN the item is evaluated for equip requirements
- THEN `min_char_level` is derived from the stat total and enforced on equip

#### Scenario: No duplicate item codes
- GIVEN a player already owns an item with a specific `item_code` at Rare rarity
- WHEN a new item generates with the same `item_code` at Uncommon rarity
- THEN the new item is discarded (no downgrade)

### Requirement: Run Achievement System
The system SHALL evaluate run achievements at scene completion using independent drop rolls per achievement. Achievement evaluation SHALL be non-blocking and run asynchronously after session completion.

#### Scenario: Achievement triggers on scene complete
- GIVEN a scene completion that meets a "Speedrun" achievement threshold
- WHEN `/session/{id}/complete` is called
- THEN `evaluate_run_achievements()` runs, the achievement is granted, and rewards are credited

## Design

### Stat Calculation Engine
`recalculate_character_stats(character_id)` reads from `class_stat_affinities`, `idle_skill_stat_contributions`, `character_skill_levels`, `player_characters.level`, and `player_inventory` (equipped items) to rebuild all `character_stats` rows. All values are integers (floored after each component calculation).

Formula:
```
stat_total = class_base + idle_contribution + lore_contribution + char_level_contribution + equipment_contribution
```

### Story Mode Stat Effects
- STR: `click_damage = base × (1 + STR × str_damage_coeff)`, incoming boss damage reduced by `STR × str_resistance_coeff`
- AGI: `auto_dps = base × (1 + AGI × agi_speed_coeff)`, `crit_chance = base_crit + AGI × agi_crit_coeff`
- INT: `skill_power × (1 + INT × int_power_coeff)`, `cooldown = base × max(0.5, 1 - INT × int_cd_coeff)`

Default seeds: `str_damage_coefficient=0.02`, `agi_speed_coefficient=0.015`, `int_power_coefficient=0.025`, `int_cooldown_coefficient=0.005`.

### Module Structure
- `backend/routes/characters.py` — Character CRUD, stat endpoints
- `backend/routes/inventory.py` — Item equip/unequip/discard
- `backend/services/character_progression.py` — `recalculate_character_stats()`, `evaluate_prerequisites()`
- `backend/services/item_generator.py` — `generate_dream_item()`
- `backend/services/achievement_service.py` — `evaluate_run_achievements()`
- `backend/models/character_progression.py` — All ORM models

## Schema

**Migrations 030–038** (applied).

### Key Tables

| Table | Purpose |
|:---|:---|
| `stat_definitions` | Extensible stat catalog (STR, AGI, INT + future) |
| `idle_skill_stat_contributions` | Maps idle skill → stat with coefficient |
| `class_stat_affinities` | Per-class base values, Lore weights, level bonus rates |
| `character_stats` | Cached computed stat totals per character |
| `skill_prerequisites` | Prerequisite conditions for unlocking skills |
| `character_skill_levels` | Per-character skill level and XP tracking |
| `inventory_items` | Dream item definitions (prefix/quality/lore_tag/type/suffix) |
| `player_inventory` | Player-owned item instances with equip state |
| `player_scene_records` | Scene completion records (used in prerequisite checks) |

`player_characters` gains `character_xp BIGINT` (migration 030). Legacy `strength`, `agility`, `intelligence` columns deprecated in favor of `character_stats`.
