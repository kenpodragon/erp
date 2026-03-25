# Story Mode Specification

## Purpose
Story Mode is the active clicker combat loop (Loop B) of Elysium Rising. Players progress through chapters of the Towers of Elysium narrative while defeating waves of enemies using click-based and auto-DPS combat. Advancement is gated by WPM-timed narrative text, ensuring players experience the story at a minimum pace. Rewards earned (Elysium Essence) persist to the Overworld economy and Idle Training loop.

## Requirements

### Requirement: Combat Engine
The system SHALL implement a PixiJS v8 clicker combat engine with click-based damage, auto-DPS, floating damage numbers, animated HP bars, and wave progression.

#### Scenario: Click deals damage
- GIVEN a player is in an active Story Mode session
- WHEN the player clicks anywhere in the combat area
- THEN the enemy SHALL receive damage equal to click_damage_floor (from Idle Training) plus in-session upgrade multipliers, and a floating damage number SHALL appear at the click position

#### Scenario: Critical hit
- GIVEN a player's crit chance fires
- WHEN a click or auto-DPS tick occurs
- THEN the damage SHALL be multiplied by the crit multiplier (base 2x, modified by Precision skill), a larger/distinct damage number SHALL appear, and a screen shake effect SHALL trigger on the enemy sprite

#### Scenario: Enemy HP bar color shifts
- GIVEN an enemy is taking damage
- WHEN the enemy's HP drops below 50% then below 10%
- THEN the HP bar SHALL shift from green to yellow, then from yellow to red, with a vibration effect at HP < 10%

### Requirement: Wave System
The system SHALL implement a wave-based enemy progression system with configurable wave counts, HP scaling, mini-boss encounters, and chapter boss mechanics.

#### Scenario: Wave progression
- GIVEN a scene has 10 required waves
- WHEN the player defeats all enemies in a wave
- THEN the next wave SHALL spawn automatically; after all 10 waves the scene SHALL be considered waves-complete

#### Scenario: HP scaling by zone
- GIVEN a scene at zone level Z
- WHEN an enemy spawns
- THEN the enemy's HP SHALL use the formula: `HP = 10 × (1.55^(Z-1) + Z - 1)` with the scaling factor configurable in game_configs

#### Scenario: Infinite waves before narrative completes
- GIVEN a player has defeated all required waves but narrative progress is below 100%
- WHEN the last required wave completes
- THEN the system SHALL spawn additional waves with the message "Additional enemies discovered!" until narrative reaches 100%

### Requirement: Chapter Boss Mechanics
The system SHALL implement chapter boss encounters as separate combat sessions with countdown timers, three interrupt zone types, and first-clear tracking.

#### Scenario: Boss interrupt zones
- GIVEN a chapter boss is charging up
- WHEN an interrupt event fires (type: click_burst, target_zone, or whack_sequence)
- THEN a visible interrupt target SHALL appear; if the player completes the interrupt successfully the countdown timer SHALL be refilled and the massive damage SHALL be prevented

#### Scenario: Boss first-clear vs. replay
- GIVEN a player is defeating a chapter boss for the first time
- WHEN the boss is defeated
- THEN a `boss_completions` record SHALL be created, the NarrativeReveal cinematic SHALL play, and full rewards SHALL be granted

- GIVEN a player is replaying a previously completed chapter boss
- WHEN the boss is defeated
- THEN no rewards SHALL be granted and the cinematic MAY be skipped

### Requirement: Narrative Text Display
The system SHALL display story text paragraph by paragraph using WPM-timed delays, with a dual-condition gate preventing scene advancement until both narrative and waves are complete.

#### Scenario: WPM-timed paragraph reveal
- GIVEN a scene has narrative text with N words in paragraph P
- WHEN paragraph P-1 finishes revealing
- THEN paragraph P SHALL appear after a delay of `(word_count / user_wpm) * 60` seconds

#### Scenario: Dual-condition gate
- GIVEN narrative progress is 100% but waves are not complete
- WHEN the player attempts to advance
- THEN the system SHALL block advancement; BOTH conditions must be satisfied simultaneously

#### Scenario: Scroll-back on completed segments
- GIVEN a player has revealed multiple narrative paragraphs
- WHEN the player scrolls up in the narrative area
- THEN previously revealed paragraphs SHALL be visible and scrollable

### Requirement: Active Skills Hotbar
The system SHALL provide 9 purchasable active skill slots mapped to keyboard keys [1]-[9], with individual cooldowns and a global cooldown option.

#### Scenario: Skill purchase before use
- GIVEN a player has sufficient session gold
- WHEN the player clicks an unpurchased skill slot
- THEN the skill SHALL be purchased and become "Ready" with a glow indicator

#### Scenario: Skill activation and cooldown
- GIVEN a purchased skill is in Ready state
- WHEN the player activates the skill
- THEN the skill effect SHALL apply immediately, a cooldown sweep overlay SHALL display on the button, and the skill SHALL not be re-activatable until the cooldown expires

### Requirement: In-Session Upgrade System
The system SHALL provide an expandable upgrade menu with x1/x10/x100/MAX purchase multipliers using exponential cost scaling.

#### Scenario: Upgrade cost scaling
- GIVEN a player is purchasing Click Damage upgrades
- WHEN the player has purchased L-1 levels of an upgrade
- THEN the cost of the next level SHALL be `Base × 1.07^(L-1)`

#### Scenario: MAX purchase
- GIVEN a player selects the MAX multiplier
- WHEN the player clicks an upgrade button
- THEN the system SHALL purchase the maximum number of levels affordable with current session gold in a single transaction

### Requirement: Session Reset and Death Mechanic
The system SHALL start every Story Mode entry at level 0 with 0 gold, deriving the base click damage floor from Idle Training levels. On death, the player SHALL respawn at the last completed wave checkpoint.

#### Scenario: Fresh session start
- GIVEN a player enters Story Mode for any scene
- WHEN the session initializes
- THEN session gold SHALL be 0, no skills SHALL be purchased, and base click damage SHALL equal `floor(Attack_Level / 2)` from Idle Training

#### Scenario: Death respawn
- GIVEN a player's HP reaches 0 from boss attacks
- WHEN the death event fires
- THEN the player SHALL respawn at the last completed wave checkpoint (wave 9 or last boss checkpoint) with gold and purchased upgrades retained

### Requirement: Exit Rewards and Conversion
The system SHALL calculate Elysium Essence rewards on session exit based on highest wave reached, enemies defeated, and boss kills, with first-time clear bonuses and diminishing returns on repeats.

#### Scenario: First-time clear bonus
- GIVEN a player completes a scene for the first time
- WHEN rewards are calculated on exit
- THEN a significant first-time clear multiplier SHALL be applied to all Essence earned

#### Scenario: Diminishing returns on repeat plays
- GIVEN a player replays the same scene multiple times
- WHEN rewards are calculated
- THEN the Essence reward SHALL be reduced relative to the first-time clear reward to encourage forward progression

### Requirement: Large Number Formatting
The system SHALL format all gold and damage numbers using standard suffixes (K through No) transitioning to alphabetical notation (aa through zz) for values exceeding 10^30.

#### Scenario: Number display at scale
- GIVEN a player's click damage reaches 12,550,000,000,000
- WHEN the damage number displays
- THEN it SHALL show as "12.55 T" (or appropriate suffix) with 2 decimal places

## Design
Story Mode is orchestrated by `StoryMode.tsx` which manages session lifecycle and the tick loop. Key sub-components:
- `CombatStage.tsx` — PixiJS v8 combat engine (enemies, HP bars, floating numbers)
- `BossStage.tsx` — Boss-only combat with timer, 3 interrupt types as HTML overlays
- `NarrativeBlock.tsx` — WPM-timed paragraph reveal with scroll-back
- `NarrativeReveal.tsx` — Post-boss cinematic overlay (staged fade-in, lore text, star particles)
- `SkillsHotbar.tsx` — 9-slot dual-row hotbar with cooldown overlays
- `UpgradeMenu.tsx` — x1/x10/x100/MAX upgrade panel
- `GoldOdometer.tsx` — Digit-flip animated gold counter
- `HeroStats.tsx` — Session stats panel (level, XP bar, DPS, crit chance)
- `GlobalHeader.tsx` — Chapter breadcrumb, buff tray, Dark Ritual bar
- `AudioPlayer.tsx` — 4-track HTML5 player with speed controls

The Dark Ritual skill multiplier (+1.05x DPS) persists across all scenes in a chapter and resets on chapter change.

PixiJS v8 uses the `extend()` pattern with JSX elements `pixiContainer`, `pixiGraphics`, `pixiText`.

## Schema
Key tables: `player_story_sessions` (zone, wave, gold, narrative_progress_pct, dark_ritual_multiplier, is_active), `session_upgrades` (session_id, upgrade_type, level, total_cost_paid), `player_meta_progression` (elysium_essence), `scene_narrative_sync` (paragraph_index, word_count), `boss_completions` (player_id, scene_id — unique for first-clear tracking), `character_skill_levels` (for auto-DPS base).

Key game_configs: `click_rate_cap_cps` (20), `hp_scaling_factor` (1.55), `waves_per_30s_narrative`, `crit_multiplier_base` (2.0), `upgrade_cost_scaling` (1.07).
