# Audio & Music Integration Specification

## Purpose
This specification defines the atmospheric audio system for Elysium Rising: programmatic 8-bit music synthesis using the Web Audio API, a reactive SFX engine, atmosphere archetype assignment across all narrative levels, and administrative tools for authoring audio definitions. Rather than shipping audio files, all music is synthesized in real-time in the browser from lightweight JSON definitions (~2–5 KB each) stored in the database.

## Requirements

### Requirement: AudioContext Lifecycle
The system SHALL create a single shared `AudioContext` on app load in `suspended` state. The system SHALL resume the `AudioContext` on the first user click or tap anywhere on the page via a one-time global click listener. The global listener SHALL be removed after the first successful `context.resume()`. This ensures the context is fully warm before the player enters Story Mode with no delayed first note.

#### Scenario: First user interaction
- GIVEN the app has loaded and `AudioContext` is in `suspended` state
- WHEN the player clicks anywhere on the page for the first time
- THEN the system SHALL call `context.resume()` and remove the global click listener

#### Scenario: Tab visibility change
- GIVEN a player in Story Mode with music playing
- WHEN the browser tab becomes hidden
- THEN the system SHALL suspend the `AudioContext`; on tab return SHALL resume from the current beat position with no restart

### Requirement: Atmosphere Archetype System
The system SHALL support 13 thematic atmosphere archetypes (Mundane Dread, Occult Sanctum, Liminal Purgatory, Body Horror Theatre, Ancient Sanctuary, Cosmic Archive, Tech Utopia, Alien Frontier, Void Abyss, Domestic Trauma, Glitch Reality, Conspiracy Bunker, Training Grounds). Each archetype SHALL produce 4 distinct music states: `explore`, `combat`, `boss`, and `mystery`. The Training Grounds archetype SHALL support 3–5 randomized variations selected at random per Idle Training session to prevent auditory fatigue.

#### Scenario: Atmosphere state transition (explore to combat)
- GIVEN a player in a scene with archetype "Occult Sanctum" in `explore` state
- WHEN enemies appear on screen and combat begins
- THEN the system SHALL transition to the `combat` state with a 2-second linear cross-fade

#### Scenario: Training Grounds variation selection
- GIVEN a player entering an Idle Training active click session
- WHEN the MusicManager initializes
- THEN the system SHALL randomly select one of the Training Grounds variations (different seeds, same archetype)

### Requirement: Atmosphere Resolution Hierarchy
The `MusicManager` SHALL resolve the active atmosphere using the following top-down priority: (1) `entity_gameplay_data.unique_boss_theme_id` if a boss encounter is active, (2) `scene_gameplay_data.atmosphere_id`, (3) `chapters.atmosphere_id`, (4) `books.atmosphere_id`, (5) global default "Mundane Dread". When the global default is triggered the system SHALL log the event to `dev_content_audit`. A single API endpoint (`GET /api/game/audio/atmosphere?scene_id={id}`) SHALL resolve the full hierarchy server-side and return the complete atmosphere definition.

#### Scenario: Boss atmosphere override
- GIVEN a boss entity with `unique_boss_theme_id` set
- WHEN the boss encounter becomes active
- THEN the system SHALL use the boss-specific atmosphere, overriding the scene/chapter/book atmosphere

#### Scenario: Missing scene-level atmosphere
- GIVEN a scene with no `atmosphere_id` assigned
- WHEN the MusicManager requests atmosphere resolution
- THEN the system SHALL fall back to `chapters.atmosphere_id`, then `books.atmosphere_id`, then global default; SHALL log to `dev_content_audit` if global default is used

### Requirement: Audio Cross-fading
The system SHALL perform a 2-second linear cross-fade when transitioning between music states (e.g., `explore` → `combat`). The `MusicManager` SHALL maintain two Web Audio gain nodes (current + incoming) and ramp them using `gainNode.gain.linearRampToValueAtTime()`. On atmosphere change (scene transition) the system SHALL use a 0.5-second fade-out/fade-in. Music SHALL never be spatially panned and SHALL remain at stereo center.

#### Scenario: Combat to mystery transition
- GIVEN the player has just defeated a boss (active state: `boss`)
- WHEN the post-boss cinematic begins
- THEN the system SHALL cross-fade from `boss` state to `mystery` state over 2 seconds

### Requirement: SFX Engine
The system SHALL provide a singleton `SFXEngine` (React context) that pre-loads SFX preset definitions from `audio_configs` on app init and exposes a `play(configKey, options?)` method. The SFX engine SHALL enforce a minimum 50ms gap between plays of the same `config_key` (throttle), silently skipping plays that arrive within the throttle window without affecting the gameplay action. Different SFX keys SHALL have independent throttle timers. The `SFXEngine` SHALL support spatial panning via `StereoPannerNode` when `spatial_enabled = true`, with pan calculated as `(entityX / viewportWidth) * 2 - 1`.

#### Scenario: Rapid clicking throttle
- GIVEN a player clicking at 15 clicks per second
- WHEN `sfx_click` is triggered more frequently than once per 50ms
- THEN the system SHALL skip audio playback for the throttled requests but SHALL register all clicks for gameplay purposes

#### Scenario: Spatial panning on enemy death
- GIVEN an enemy at X-coordinate 750 in a 1000px-wide viewport
- WHEN the enemy dies and `sfx_enemy_death` is played
- THEN the system SHALL pan the SFX to `+0.5` (right-of-center)

### Requirement: Volume Settings Sync
The system SHALL maintain volume settings in both `localStorage` (for immediate responsiveness) and `player_settings` (server, persistent). On login the system SHALL overwrite `localStorage` with server settings. During a session, changes SHALL apply immediately from `localStorage` with a 500ms debounced background `PUT` to the server. Effective volume SHALL be calculated as `master_volume/100 * category_volume/100 * preset.base_volume`. If `master_muted = true` all audio output SHALL be 0.

#### Scenario: Multi-device settings conflict
- GIVEN a player who updated volume on Device A (not yet synced)
- WHEN they open Device B
- THEN Device B SHALL load the last-synced server state; whichever device saves next SHALL win (last-write-wins is acceptable for low-stakes volume settings)

#### Scenario: Master mute toggle
- GIVEN a player with `master_muted = true`
- WHEN any SFX or music synthesis is triggered
- THEN the system SHALL produce no audio output regardless of individual volume settings

### Requirement: Atmosphere Classification Pipeline
The system SHALL provide a one-time classification script (`tools/classify_atmospheres.py`) that maps each location's free-text `base_atmosphere` description to one of the 13 archetypes using keyword matching. The script SHALL populate `locations.archetype_id`, `chapters.atmosphere_id`, and `scene_gameplay_data.atmosphere_id`. Admins SHALL be able to override any assignment via the Atmosphere Editor in the admin panel.

#### Scenario: Auto-classification run
- GIVEN 421 locations with free-text `base_atmosphere` descriptions
- WHEN `classify_atmospheres.py` is run
- THEN the system SHALL assign an `archetype_id` to each location and propagate assignments to scenes and chapters; any unresolved entries SHALL be flagged in `dev_content_audit`

## Design

### MusicManager Component
Receives props `{ musicState: 'explore'|'combat'|'boss'|'mystery', atmosphereId: number|null, bossEntityId?: number|null }`. Reads `music_definitions` JSONB from `atmospheres` table and creates `OscillatorNode` chains via Web Audio API. No audio files are served from the backend.

### SFXEngine Component
Singleton React context. Reads `preset_definition` JSONB from `audio_configs`. Components call `SFXEngine.play('sfx_click', { pan: -0.5 })`. Engine handles Web Audio node creation and teardown. Maintains `Map<string, number>` of last-play timestamps for throttling.

### Music State Mapping
StoryMode orchestrator maps game phases to music states: `narrative` → `explore`, `combat` → `combat`, `boss` → `boss`, `post_battle`/`narrative_reveal` → `mystery`.

### Audio Generation Tools
`tools/generate_8bit_music.py` is retained as a preview/export tool and definition authoring pipeline. It is not the primary delivery mechanism (synthesis happens in-browser). `tools/generate_8bit_sfx.py` authors SFX presets. Both tools write JSON definitions to the database.

## Schema

### `atmospheres`
```sql
CREATE TABLE IF NOT EXISTS atmospheres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    archetype VARCHAR(100),
    description TEXT,
    music_definitions JSONB DEFAULT '{"explore":null,"combat":null,"boss":null,"mystery":null}',
    generator_bpm INTEGER DEFAULT 120,
    generator_key VARCHAR(10) DEFAULT 'C',
    generator_scale VARCHAR(50) DEFAULT 'minor',
    generator_complexity INTEGER DEFAULT 5,
    generator_seed INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### `audio_configs`
```sql
CREATE TABLE IF NOT EXISTS audio_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'sfx',
    display_name VARCHAR(100),
    preset_definition JSONB NOT NULL DEFAULT '{}',
    base_volume FLOAT DEFAULT 1.0,
    pitch_variation FLOAT DEFAULT 0.0,
    spatial_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Table Alterations (Atmosphere Hierarchy)
```sql
ALTER TABLE books ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;
ALTER TABLE scene_gameplay_data ADD COLUMN IF NOT EXISTS atmosphere_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;
ALTER TABLE entity_gameplay_data ADD COLUMN IF NOT EXISTS unique_boss_theme_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;
ALTER TABLE entity_gameplay_data ADD COLUMN IF NOT EXISTS death_sfx_key VARCHAR(100);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS activate_sfx_key VARCHAR(100);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS archetype_id INTEGER REFERENCES atmospheres(id) ON DELETE SET NULL;
```

### `player_settings` Audio Additions
```sql
ALTER TABLE player_settings
    ADD COLUMN IF NOT EXISTS master_volume SMALLINT DEFAULT 80 CHECK (master_volume BETWEEN 0 AND 100);
ALTER TABLE player_settings
    ADD COLUMN IF NOT EXISTS master_muted BOOLEAN DEFAULT FALSE;
```
Note: `audio_enabled` is deprecated but retained for backward compatibility. Migration sets `master_muted = NOT audio_enabled` for existing rows.

### SFX Preset Format
Each SFX preset is a JSON object: `{ oscillator_type, frequency_start, frequency_end, duration_ms, attack_ms, decay_ms, sustain_level, release_ms, noise_mix, pitch_variation, volume }`. Complex SFX (fanfares, arpeggios) are arrays of these definitions played in sequence.

### Seed Data
- 13 atmosphere archetypes + 3 Training Grounds variations (16 rows total) in `atmospheres`.
- 11 core SFX presets in `audio_configs` (`sfx_click`, `sfx_crit`, `sfx_enemy_death`, `sfx_skill_activate`, `sfx_level_up`, `sfx_item_drop`, `sfx_achievement`, `sfx_ui_click`, `sfx_ui_nav`, `sfx_boss_defeat`, `sfx_chapter_complete`).
- Book-level atmosphere assignments: Book 1 → `mundane_dread`, Book 2 → `domestic_trauma`, Book 3 → `cosmic_archive`.

### Migration File
All changes consolidated in `db/039_audio_music_system.sql`.
