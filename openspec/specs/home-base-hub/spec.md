# Home Base Hub Specification

## Purpose
The Home Base Hub is the primary meta-progression dashboard — the player's persistent sanctum within the Tower of Elysium. It surfaces four terminal systems: the Akashic Log (narrative journal), Relic Gallery (artifact collections with permanent stat bonuses), Hall of Echoes (competitive leaderboard and player identity), and the Achievement Matrix (90+ long-term challenges). Artifacts are either hand-crafted curated drops or procedurally generated, both providing permanent passive bonuses that feed into `recalculate_character_stats()`.

## Requirements

### Requirement: Akashic Log (Narrative Journal)
The system SHALL automatically populate log entries when players complete story beats. Hidden lore text SHALL only be revealed when the player's Intelligence stat meets or exceeds the beat's `lore_intelligence_threshold`. Beat entries SHALL track first-completed date and revisit count.

#### Scenario: Hidden lore revealed by INT threshold
- GIVEN a story beat with `lore_intelligence_threshold = 30` and a player with INT = 35
- WHEN the player views the beat detail
- THEN hidden lore text is shown alongside the main text

#### Scenario: Hidden lore locked below threshold
- GIVEN the same beat and a player with INT = 20
- WHEN the player views the beat detail
- THEN a locked indicator "Requires Intelligence 30 to decipher" is shown instead

#### Scenario: New badge clears on view
- GIVEN a player has unlocked 3 new story beats since their last Akashic Log visit
- WHEN the player opens the Akashic Log
- THEN the 3 beats are marked as viewed and the "New" badges clear

### Requirement: Relic Gallery (Artifact System)
The system SHALL support two artifact categories: curated (~50 hand-designed, boss/chapter/rare-spawn drops) and generated (procedural prefix+type+suffix, weaker stats). Both SHALL use the same 5 rarity tiers (Common, Uncommon, Rare, Epic, Cosmic). Higher rarity SHALL replace lower rarity for the same artifact — no duplicates.

The system SHALL include artifact stat bonuses in `recalculate_character_stats()` as a sixth source.

#### Scenario: Higher rarity replaces lower
- GIVEN a player owns a Rare Cracked Data Core curated artifact
- WHEN an Epic version of the same artifact drops
- THEN the existing row is updated to Epic rarity and stats; no duplicate row is created

#### Scenario: Generated artifact with duplicate code discarded
- GIVEN a player owns a generated artifact with code "FRAG_PRISM_VOID" at Uncommon
- WHEN a new Common version of the same code generates
- THEN the drop is discarded (no downgrade)

#### Scenario: Artifact bonuses included in stat calculation
- GIVEN a player equips an artifact granting +5 STR
- WHEN `recalculate_character_stats()` runs
- THEN the character's STR `computed_total` increases by 5

### Requirement: Achievement Matrix
The system SHALL define 90+ achievements across categories. `evaluate_achievements()` SHALL run after story mode completion, idle training milestones, and other trigger events. Each achievement SHALL specify `threshold_value`, `tracking_source`, and optional `reward_shards`, `reward_essence`, and `reward_title_id`.

#### Scenario: Achievement triggers on threshold
- GIVEN a "Speedrunner I" achievement with `threshold_value = 5` for scenes completed under a time limit
- WHEN a player completes their 5th qualifying scene
- THEN the achievement is granted and rewards are credited

#### Scenario: Parent achievement unlocks child
- GIVEN "Collector II" has `parent_achievement_id` pointing to "Collector I"
- WHEN "Collector I" is completed
- THEN "Collector II" becomes visible and trackable

### Requirement: Leaderboard with Multiple Categories
The system SHALL provide cached leaderboard rankings across categories including combat speed, Scholar (lore completion), and standard progression. Leaderboard data SHALL be cached in `leaderboard_cache` and refreshed on a configurable schedule.

#### Scenario: Speedrun category computed correctly
- GIVEN a player completes a chapter in the fastest recorded time
- WHEN the leaderboard cache refreshes
- THEN the player appears at the top of the Speedrun leaderboard for that chapter

### Requirement: Title System
The system SHALL allow players to equip earned titles via `PATCH /api/players/me/title`. Titles MAY be granted as achievement rewards. Only one title may be equipped at a time.

#### Scenario: Title equipped after achievement grant
- GIVEN a player earns the "Archivist" title through an achievement
- WHEN the player equips it via the API
- THEN their `equipped_title_id` updates and the title displays in their profile and chat messages

## Design

### Artifact Generation Pipeline (Generated)
```
1. Roll rarity (book-weighted, shifted toward lower tiers vs. dream items)
2. Select artifact_type from artifact_type_bases (~15 types)
3. Select prefix from artifact_prefixes (~20)
4. Select suffix from artifact_suffixes (~20)
5. artifact_code = "{PREFIX}_{TYPE}_{SUFFIX}"
6. Check player_artifacts for duplicate code:
   - Same or higher rarity → DISCARD
   - Lower rarity → REPLACE (rarity upgrade)
   - Not owned → INSERT
7. Compute stats: base_range * rarity_multiplier
```

### Stat Budget at Cosmic Rarity
- Dream Item: ~50–80 total stat points across 3–5 stats
- Generated Artifact: ~8–15 stat points across 1–2 stats
- Curated Artifact (Common): ~20–30 stats across 2–4 stats
- Curated Artifact (Cosmic): ~60–100 stats across 3–6 stats + unique effect

### Chapter Mastery Drop Trigger
At `/complete`, the server queries all non-boss scenes in the chapter and checks `player_scene_records`. If this completion fills the last gap, a chapter mastery artifact drop is evaluated.

### Module Structure
- `backend/services/artifact_service.py` — `generate_artifact()`, `evaluate_curated_drops()`, `evaluate_artifact_drops()`
- `backend/services/achievement_service.py` — `evaluate_achievements()`
- `backend/routes/home_base.py` — Hub endpoints (akashic-log, artifacts, leaderboard, achievements)
- `admin/src/pages/` — ArtifactEditor, AchievementEditor

## Schema

**Migrations 046–048** (applied).

### Migration 046 — Artifact System Tables

| Table | Description |
|:---|:---|
| `curated_artifacts` | Master definitions for hand-designed artifacts |
| `curated_artifact_tiers` | Per-rarity stat definitions per curated artifact |
| `artifact_type_bases` | Type bases for generated artifacts |
| `artifact_prefixes` | Prefix components for generated artifacts |
| `artifact_suffixes` | Suffix components for generated artifacts |
| `player_artifacts` | Player-owned artifact instances (curated + generated) |

`player_artifacts` key columns: `artifact_type` ('curated'|'generated'), `curated_artifact_id` FK, `artifact_code` VARCHAR(60), `rarity`, `stat_bonuses` JSONB, `is_new` BOOLEAN badge flag.

### Migration 047 — Achievement System Tables

| Table | Description |
|:---|:---|
| `achievements` | 90+ achievement definitions with threshold, tracking_source, rewards |
| `player_achievements` | Per-player achievement completion records |
| `titles` | Earnable title definitions |
| `player_titles` | Per-player earned titles |

### Migration 048 — Leaderboard Cache

| Table | Description |
|:---|:---|
| `leaderboard_cache` | Server-computed rankings by category, refreshed on schedule |
| `shard_transactions` | Audit trail for shard credits (achievement rewards, purchases) |

`player_meta_progression` gains `shard_balance INTEGER` (migration 046).
