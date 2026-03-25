# Game Loop Specification

## Purpose
The Elysium Rising game loop consists of three interconnected loops: Overworld Hub (navigation and strategy), Story Mode (active clicker combat gated by narrative), and Idle Training (passive skill progression). These loops feed into each other through shared currencies and stat systems, creating a layered gameplay experience grounded in the Towers of Elysium narrative.

## Requirements

### Requirement: Three-Loop Architecture
The system SHALL implement three distinct but interconnected gameplay loops — Overworld Hub, Story Mode, and Idle Training — that share economy and progression state.

#### Scenario: Entering Story Mode from Hub
- GIVEN a player is on the Overworld Hub with an available scene node
- WHEN the player clicks the scene node and selects "Enter Story Mode"
- THEN the Story Mode session SHALL start with base stats derived from the player's current Idle Training levels

#### Scenario: Returning rewards to Hub
- GIVEN a player has completed a Story Mode scene
- WHEN the session ends
- THEN Elysium Essence earned SHALL be available for Idle Training, and chapter/scene progress SHALL be reflected on the Overworld Map

#### Scenario: Idle Training during Story Mode
- GIVEN a player has an active skill training session
- WHEN the player enters Story Mode
- THEN Idle Training SHALL continue accumulating XP in the background without requiring the Skills tab to be open

### Requirement: Session Gold Isolation
The system SHALL treat Session Gold as temporary per-run currency that does not persist between Story Mode sessions.

#### Scenario: Gold resets on new session
- GIVEN a player earned 5,000 gold in a previous Story Mode run
- WHEN the player starts a new Story Mode session for any scene
- THEN their session gold SHALL start at 0

#### Scenario: Gold used only in-session
- GIVEN a player has accumulated session gold
- WHEN the player attempts to spend gold
- THEN gold SHALL only be spendable on in-session upgrades and skills

### Requirement: Narrative Gate Enforcement
The system SHALL prevent scene advancement until both narrative progress reaches 100% AND all required waves are defeated.

#### Scenario: Dual-condition gate blocks advancement
- GIVEN a player has defeated all required waves but narrative is at 80%
- WHEN the player attempts to advance to the next scene
- THEN the system SHALL block advancement and indicate the narrative gate is not yet satisfied

#### Scenario: Gate bypassed on replay
- GIVEN a player has previously completed a scene at 100%
- WHEN the player replays that scene
- THEN the player SHALL be allowed to skip the narrative gate freely

### Requirement: Server-Side Authority
The system SHALL perform all damage calculation, click validation, and session reward computation server-side. The client SHALL display optimistically but the server value is authoritative.

#### Scenario: Click rate limiting
- GIVEN a player is in active Story Mode combat
- WHEN the player sends click batches to the server
- THEN the server SHALL reject or cap batches exceeding 20 CPS (configurable via game_configs)

#### Scenario: Session integrity on exit
- GIVEN a player exits Story Mode
- WHEN rewards are calculated
- THEN the server SHALL validate all session values and reject anomalous gold, upgrade level, or wave counts

### Requirement: Post-Chapter Cinematics
The system SHALL display a cinematic lore reveal after defeating a chapter boss for the first time.

#### Scenario: First chapter boss defeat
- GIVEN a player defeats a chapter boss for the first time
- WHEN the boss death animation completes
- THEN the NarrativeReveal cinematic SHALL display with the chapter's transition_lore_text from the database

#### Scenario: Repeat boss attempt
- GIVEN a player has already completed a chapter boss
- WHEN they defeat the boss again
- THEN the cinematic SHALL be skippable and no rewards SHALL be granted

## Design
The game loop is structured as three nested feedback loops:

- **Loop A (Overworld):** Node-based map showing chapter/scene progression. Entry point to both Story Mode and Idle Training.
- **Loop B (Story Mode):** Active clicker combat gated by WPM-timed narrative text. Earns Session Gold (temporary) and Elysium Essence (permanent) on exit.
- **Loop C (Idle Training):** Passive skill XP accumulation consuming Elysium Essence. Provides permanent base stat bonuses to Story Mode sessions.

Economy flow: Story Mode earns Essence → Essence fuels Idle Training → Idle Training levels raise base stats → stronger base stats improve Story Mode floor.

State flow: `[Login] → [Character Select] → [Overworld Hub] → [Scene Select] → [Story Mode] → [Combat + Narrative] → [Boss/Wave Complete] → [Reward Calculation] → [Return to Hub]`

## Schema
Key tables: `player_story_sessions`, `player_meta_progression`, `character_skill_levels`, `game_configs`, `scenes`, `chapters`, `books`, `boss_completions`.

Key game_configs: `click_rate_cap_cps` (default 20), `narrative_gate_enabled`, `essence_per_scene_base`.
