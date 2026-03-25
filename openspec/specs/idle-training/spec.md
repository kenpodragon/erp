# Idle Training Specification

## Purpose
Idle Training is Loop C of the Elysium Rising game loop — a passive, ever-running skill progression system inspired by Melvor Idle. Players select one skill and one sub-action at a time; the action timer runs continuously, awarding XP on completion and looping automatically. Training persists in the background across all game screens. Skill levels provide permanent base stat bonuses to every Story Mode session, and the system consumes Elysium Essence as a soft gate linking it to the Story Mode economy. The UI uses a terminal/process-monitor aesthetic matching the game's sci-fi theme.

## Requirements

### Requirement: One-at-a-Time Training
The system SHALL enforce that only one skill trains at a time per character, with a database-level partial unique index as the enforcement mechanism.

#### Scenario: Switching active skill
- GIVEN a player is training Attack
- WHEN the player selects Magic
- THEN Attack training SHALL stop immediately (partial action progress discarded), Magic training SHALL begin, and the database SHALL update `is_active_training = TRUE` only on the Magic row

#### Scenario: Database enforcement
- GIVEN a character has `is_active_training = TRUE` on the Attack skill row
- WHEN an attempt is made to set `is_active_training = TRUE` on a second skill row for the same character
- THEN the partial unique index `uix_character_one_active_training` SHALL reject the operation

### Requirement: Action Timer and XP Loop
The system SHALL run a continuous action timer per selected action. On timer completion, XP SHALL be awarded and the timer SHALL reset immediately without player input.

#### Scenario: Action completes and loops
- GIVEN a player is training "Shadowboxing in the Garage" (3,000ms interval, 10 XP/action)
- WHEN 3 seconds elapse
- THEN 10 XP SHALL be awarded to the Attack skill, the action timer SHALL reset to 0%, and the loop SHALL continue

#### Scenario: Partial action discarded on stop
- GIVEN a player has an action timer at 75% progress
- WHEN the player stops training or switches actions
- THEN the partial action progress SHALL be discarded with no XP awarded

### Requirement: XP Curve and Level-Up
The system SHALL use the RuneScape/Melvor-standard XP curve with a hard cap of Level 99. Level-ups SHALL apply immediately when XP crosses a threshold.

#### Scenario: Level-up notification
- GIVEN a player's XP crosses the Level 24 threshold
- WHEN the level-up is detected
- THEN the terminal UI SHALL flash `LVL 23 → LVL 24`, new actions unlocked at Level 24 SHALL become selectable, and a notification event SHALL fire for the achievement system

#### Scenario: Multi-level-up from offline
- GIVEN a player gained enough XP offline to advance from Level 23 to Level 25
- WHEN offline XP is applied
- THEN both level-ups SHALL be applied iteratively and both SHALL appear in the Training Report modal

### Requirement: Offline Progression
The system SHALL calculate offline training gains on the player's next API call after returning, capped at `idle_offline_cap_hours` (default 24 hours). Partial action progress is discarded in offline calculations.

#### Scenario: Offline XP calculation
- GIVEN a player was training Attack for 8 hours offline with 3,000ms actions at 10 XP/action
- WHEN the player returns and the backend runs the offline calc
- THEN `actions_completed = floor(28800 / 3)` = 9,600, and XP earned SHALL equal `9,600 × 10 × essence_xp_rate`

#### Scenario: Training Report modal
- GIVEN the player returns after an offline session
- WHEN the Skills tab loads
- THEN a terminal-style Training Report modal SHALL appear showing: offline duration, skill trained, actions completed, XP earned, levels gained, Essence consumed, and remaining Essence

#### Scenario: Offline cap enforced
- GIVEN a player has been offline for 36 hours
- WHEN offline XP is calculated
- THEN only 24 hours of progress SHALL be credited; the additional 12 hours SHALL be silently discarded

### Requirement: Essence Soft Gate
Training SHALL consume Elysium Essence at a constant rate (`idle_essence_drain_per_minute`). The player's current Essence percentage SHALL determine the XP rate modifier, but training SHALL never fully stop.

#### Scenario: Full Essence rate
- GIVEN a player's Essence is above 75%
- WHEN an action completes
- THEN XP SHALL be awarded at 100% of the action's base XP value

#### Scenario: Depleted Essence minimum rate
- GIVEN a player's Essence has reached 0%
- WHEN an action completes
- THEN XP SHALL be awarded at 10% of the action's base XP value (the floor rate), and the UI SHALL display `ESSENCE EMPTY — REPLENISH VIA STORY MODE`

#### Scenario: Essence drain is constant
- GIVEN a player's Essence is at 5% (critical rate, 25% XP)
- WHEN training continues
- THEN Essence SHALL drain at `idle_essence_drain_per_minute` regardless of the reduced XP rate

### Requirement: Four Skills with Narrative Unlock Gates
The system SHALL provide exactly four idle skills — Attack, Magic, Lore, and Precision — each unlocking at a specific Story Mode narrative beat (except Attack, which is available from game start).

#### Scenario: Locked skill display
- GIVEN a player has not completed the first Dreamwalking story scene
- WHEN the Skills tab renders
- THEN Magic SHALL display as `[▒ LOCKED]` with the text `UNLOCK: Complete the first Dreamwalking story scene`

#### Scenario: Skill unlock notification
- GIVEN a player completes the Infinitron Breakthrough scene
- WHEN the scene completion event fires
- THEN a banner SHALL appear on the Skills tab: `[ NEW SKILL UNLOCKED: PRECISION :: CALIBRATION ]`

### Requirement: Sub-Action Selection
Each skill SHALL expose a table of trainable sub-actions, unlocked progressively by skill level. Players SHALL be able to switch actions at any time for free.

#### Scenario: Available action selection
- GIVEN a player's Attack skill is Level 22 and "Combat Simulations at MOM" requires Level 22
- WHEN the player clicks that action row
- THEN that action SHALL become the active training action and the timer SHALL reset to 0%

#### Scenario: Locked action display
- GIVEN "Fighting Red Hat Brigades" requires Level 36 and the player is Level 22
- WHEN the action table renders
- THEN that action SHALL display with the `▒` symbol and status `[LVL 36]`

### Requirement: Class Affinity XP Bonus
The system SHALL apply a +25% XP bonus when a player trains the skill associated with their character class.

#### Scenario: Drifter trains Attack
- GIVEN the player's class is Drifter (primary skill: Attack)
- WHEN an Attack action completes with 10 base XP
- THEN 12.5 XP SHALL be awarded (10 × 1.25)

### Requirement: Skill Stat Bonuses Applied at Session Start
The system SHALL apply all four skill bonus formulas as permanent base stats at the start of every Story Mode session.

#### Scenario: Attack bonus at session start
- GIVEN a player's Attack skill is Level 60
- WHEN a Story Mode session begins
- THEN the session's click_damage_floor SHALL include `floor(60 / 2)` = 30 bonus damage

#### Scenario: Magic auto-DPS multiplier
- GIVEN a player's Magic skill is Level 50
- WHEN auto-DPS is calculated
- THEN the total auto-DPS SHALL be multiplied by `1.0 + (50 × 0.01)` = 1.50×

### Requirement: Active Mode
The system SHALL provide an Active Mode that replaces idle XP accumulation with combat-based XP earning using the Story Mode combat engine, with no Essence consumption during active mode.

#### Scenario: Enter Active Mode
- GIVEN a player clicks [ENTER ACTIVE MODE] on a skill
- WHEN the confirmation modal is accepted
- THEN idle accumulation SHALL pause, `is_in_active_mode = TRUE` SHALL be set on the backend, and the combat engine SHALL launch with skill-appropriate enemies and header

#### Scenario: Active Mode XP per kill
- GIVEN a player kills a wave enemy in Attack Active Mode with "Shadowboxing in the Garage" selected (10 XP/action)
- WHEN the kill registers
- THEN XP SHALL equal `10 × (1 + wave_number × 0.01)`; boss kills SHALL award `10 × 5 = 50 XP`

#### Scenario: Exit Active Mode
- GIVEN a player clicks [EXIT ACTIVE MODE]
- WHEN the exit is confirmed
- THEN all accumulated XP SHALL be applied to `character_skill_levels.current_xp`, idle training SHALL resume with the action timer reset to 0%, and no Training Report modal SHALL appear

## Design
The Skills tab (`SkillsTab.tsx`) uses a terminal process-monitor aesthetic:
- Background: `#0a0a0f`, phosphor green `#00ff88` for active data
- Monospace font throughout, ASCII block-fill progress bars (`█▓▒░`)
- Header brackets: `┌─ SECTION TITLE ──┐`
- Active indicator: `■` training, `○` idle, `▒` locked

Three panel layout:
1. **All Skills Overview** (always visible) — compact row per skill: name, level, XP bar, status
2. **Active Skill Detail** (selected skill) — level/XP bar, current action status, Essence bar, controls
3. **Action Selection Table** — all actions for the skill with level req, interval, XP/action, status

Stat bonus formulas (applied at Story Mode session start):
- Attack: `click_damage_floor = floor(Attack_Level / 2)`
- Magic: `auto_dps_multiplier = 1.0 + (Magic_Level × 0.01)`
- Lore: `gate_reduction = min(Lore_Level × 0.003, 0.25)`, `essence_multiplier = 1.0 + (Lore_Level × 0.008)`
- Precision: `crit_chance_bonus = Precision_Level × 0.001`, `crit_multiplier_total = 2.0 + (Precision_Level × 0.01)`

XP curve (Melvor/RuneScape standard): `XP_to_reach(N) = floor((1/4) × Σ_{i=1}^{N-1} floor(i + 300 × 2^(i/7)))`

## Schema

### New Table: `skill_actions`
```sql
CREATE TABLE skill_actions (
    id              SERIAL PRIMARY KEY,
    skill_id        INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    display_name    VARCHAR(150) NOT NULL,
    lore_description TEXT NOT NULL,
    level_required  INTEGER NOT NULL DEFAULT 1,
    interval_ms     INTEGER NOT NULL DEFAULT 3000,
    xp_per_action   INTEGER NOT NULL DEFAULT 10,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(skill_id, name)
);
```

### Modified: `character_skill_levels`
Added columns: `active_action_id` (FK → skill_actions), `action_started_at` (TIMESTAMPTZ), `is_active_training` (BOOLEAN), `is_in_active_mode` (BOOLEAN), `active_mode_started_at` (TIMESTAMPTZ), `last_offline_calc_at` (TIMESTAMPTZ).

Partial unique index: `CREATE UNIQUE INDEX uix_character_one_active_training ON character_skill_levels (character_id) WHERE is_active_training = TRUE;`

### Modified: `skills`
Added columns: `unlock_scene_id` (INTEGER FK → scenes), `unlock_display_text` (TEXT), `idle_flavor_title` (VARCHAR(100)).

### Key game_configs
| Key | Default | Description |
|-----|---------|-------------|
| `idle_offline_cap_hours` | 24 | Max offline hours calculated |
| `idle_essence_drain_per_minute` | 1 | Essence per minute of training |
| `idle_essence_xp_full_threshold` | 0.75 | Essence % for 100% XP rate |
| `idle_essence_xp_mid_threshold` | 0.40 | Essence % for 75% XP rate |
| `idle_essence_xp_low_threshold` | 0.15 | Essence % for 50% XP rate |
| `idle_essence_xp_critical_threshold` | 0.01 | Essence % for 25% XP rate |
| `idle_essence_xp_floor_rate` | 0.10 | Minimum XP rate at 0% Essence |
| `idle_active_mode_boss_interval` | 10 | Waves between bosses in Active Mode |

Migrations: 021 (core schema), 022 (seed data — 8 Attack + 9 Magic + 9 Lore + 8 Precision = 34 skill_actions total).
