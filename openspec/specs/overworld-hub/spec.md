# Overworld Hub Specification

## Purpose
The Overworld Hub is the central navigation and strategy screen players see after login and character selection. It presents a node-based chapter/scene map for entering Story Mode, a sidebar for accessing Idle Training and Home Base, and a persistent animated battle banner at the bottom providing real-time visual feedback of character growth and narrative progression through the Towers of Elysium world.

## Requirements

### Requirement: Hub Layout
The system SHALL render a persistent top bar, left sidebar navigation, main content area (node map), and bottom animated battle banner when the player is in the Hub view.

#### Scenario: Default Hub view
- GIVEN a player has authenticated and selected a character
- WHEN the Hub loads
- THEN the Map tab SHALL be active by default, showing the chapter/scene node map in the main content area

#### Scenario: Sidebar navigation
- GIVEN the player is in the Hub
- WHEN the player clicks a sidebar item (Skills, Home Base, Shop, Chat, Leaderboard)
- THEN the main content area SHALL update to show that section without reloading the page

### Requirement: Chapter/Scene Node Map
The system SHALL display all chapters and scenes as a scrollable node map with accurate state indicators.

#### Scenario: Node state display
- GIVEN a player has completed scene 1-2 but not 1-3
- WHEN the overworld map renders
- THEN scene 1-2 SHALL display as `completed` (checkmark), scene 1-3 SHALL display as `available` (highlighted border), and all subsequent scenes SHALL display as `locked` (greyed out)

#### Scenario: Mastered node
- GIVEN a player has achieved 100% completion on all scenes in a chapter
- WHEN the chapter renders on the map
- THEN the chapter node SHALL display the `mastered` state with a gold border and star icon

#### Scenario: In-progress node
- GIVEN a player has started but not completed a scene
- WHEN the map renders
- THEN that scene node SHALL display with a pulsing/glowing `in_progress` indicator

### Requirement: Scene Entry
The system SHALL allow players to enter Story Mode by clicking an available scene node.

#### Scenario: Clicking available node
- GIVEN a scene is in the `available` state
- WHEN the player clicks the node
- THEN a Chapter Info Panel SHALL open showing the scene title, lore summary, best score, and an "Enter Story Mode" button

#### Scenario: Clicking locked node
- GIVEN a scene is in the `locked` state
- WHEN the player clicks the node
- THEN the system SHALL display a message indicating the node is not yet accessible

### Requirement: Animated Battle Banner
The system SHALL render a persistent, non-interactive animated battle banner at the bottom of the Hub using PixiJS, showing the player's character battling enemies in a side-scrolling scene.

#### Scenario: Banner reflects chapter progress
- GIVEN a player's furthest reached chapter is Chapter 3
- WHEN the Hub loads
- THEN the banner background SHALL reflect Chapter 3's environment via alpha cross-fade transition

#### Scenario: Stats affect banner visuals
- GIVEN a player has high Strength and low Agility
- WHEN the banner renders
- THEN the character sprite SHALL be larger (Strength → scale) and move more slowly (Agility → speed), with visual weights configurable via database

#### Scenario: Banner only visible in Map view
- GIVEN the player is viewing the Skills tab
- WHEN the Skills content renders
- THEN the battle banner SHALL NOT be visible

### Requirement: Banner Combat Logic
The system SHALL run banner combat as a purely visual, zero-sync simulation. Banner results SHALL NOT update player progress, gold, or Essence on the server.

#### Scenario: Character death in banner
- GIVEN the banner enemy wave is too powerful for the character's current stats
- WHEN the character is defeated
- THEN the character sprite SHALL reset to the far-left edge, background scrolling SHALL stop, and after a randomized delay the character SHALL surge back with a "Vengeance" buff visual

#### Scenario: Wave density scales with progress
- GIVEN a player has progressed to a later book
- WHEN the banner renders enemy waves
- THEN enemy density SHALL increase (up to 1–4 enemies per wave) and the pool SHALL include all previously encountered enemy types

### Requirement: Banner Performance
The system SHALL maintain 60 FPS on the battle banner animation.

#### Scenario: Performance target
- GIVEN the banner is running with maximum enemy density
- WHEN the animation loop executes
- THEN the PixiJS render loop SHALL target 60 FPS with a configurable `max_enemies_per_wave` cap

## Design
The Overworld Hub uses `@pixi/react` to bridge PixiJS v8 with the React component tree. The battle banner (`BottomAnimatedBanner.tsx`) uses a 3-layer parallax system via `BannerBackground.tsx`.

Banner layering (back to front):
1. Parallax Backdrop (Far) — slowest scroll, distant vistas
2. Environmental Mid-ground — mid-speed, architectural details
3. Ground (Near) — fast scroll, platform layer
4. Battle Layer — player character + enemy conveyor
5. VFX Layer — floating damage numbers, aura effects

Stat-to-visual mappings (configurable via `stat_weights` JSONB on `visual_behaviors`):
- Strength/Attack → sprite scale + hit shake intensity
- Agility → x-axis movement speed + attack animation frequency
- Intelligence → ambient VFX density (mana trails, particles)

The 2-minute wave time-box applies an incremental "Focus" buff if a wave persists beyond 120 seconds. Enemy pool is drawn from `completed_scenes` + `current_available_scene`.

## Schema
Key tables: `scenes`, `chapters`, `entities`, `visual_behaviors` (animation_config, stat_weights JSONB), `entity_families`, `entity_types`.

Banner data is fetched once on Hub entry or context change (static data fetch). No server sync during banner runtime.
