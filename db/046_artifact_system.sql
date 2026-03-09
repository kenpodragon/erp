-- Migration 046: Artifact System (2.7.0)
-- Creates artifact tables, renames legacy tables, adds column extensions, seeds artifact components + 50 curated artifacts.

BEGIN;

-- =============================================================================
-- 1. Rename Legacy Tables
-- =============================================================================

ALTER TABLE IF EXISTS artifacts RENAME TO artifacts_legacy;
ALTER TABLE IF EXISTS player_collections RENAME TO player_collections_legacy;

-- Drop the unique constraint rename (index follows the table)
-- No action needed — index renames automatically with table in PostgreSQL.

-- =============================================================================
-- 2. New Tables: Artifact System
-- =============================================================================

-- 2a. curated_artifacts — hand-designed lore artifacts
CREATE TABLE IF NOT EXISTS curated_artifacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    lore_text TEXT,
    icon_sprite_key VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('boss', 'chapter', 'rare_spawn')),
    source_id INTEGER,
    source_hint VARCHAR(255) NOT NULL,
    base_drop_chance NUMERIC(6,4) NOT NULL DEFAULT 0.01,
    synergy_set_id INTEGER DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_curated_artifacts_source ON curated_artifacts (source_type, source_id);
CREATE INDEX idx_curated_artifacts_active ON curated_artifacts (is_active) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION update_curated_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_curated_artifacts_updated_at
    BEFORE UPDATE ON curated_artifacts
    FOR EACH ROW EXECUTE FUNCTION update_curated_artifacts_updated_at();

-- 2b. curated_artifact_tiers — per-rarity stat definitions
CREATE TABLE IF NOT EXISTS curated_artifact_tiers (
    id SERIAL PRIMARY KEY,
    curated_artifact_id INTEGER NOT NULL REFERENCES curated_artifacts(id) ON DELETE CASCADE,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'cosmic')),
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    unique_effect_text TEXT,
    drop_chance_multiplier NUMERIC(6,4) NOT NULL DEFAULT 1.0,
    UNIQUE (curated_artifact_id, rarity)
);

-- 2c. artifact_type_bases — type bases for generated artifacts
CREATE TABLE IF NOT EXISTS artifact_type_bases (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    base_stat_range JSONB NOT NULL,
    lore_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2d. artifact_prefixes — prefix name components
CREATE TABLE IF NOT EXISTS artifact_prefixes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL UNIQUE,
    display_name VARCHAR(50) NOT NULL,
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2e. artifact_suffixes — suffix name components
CREATE TABLE IF NOT EXISTS artifact_suffixes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2f. player_artifacts — player-owned artifact instances
CREATE TABLE IF NOT EXISTS player_artifacts (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    artifact_type VARCHAR(20) NOT NULL CHECK (artifact_type IN ('curated', 'generated')),
    curated_artifact_id INTEGER REFERENCES curated_artifacts(id) ON DELETE SET NULL,
    artifact_code VARCHAR(60),
    name VARCHAR(150) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'cosmic')),
    icon_sprite_key VARCHAR(100) NOT NULL DEFAULT 'artifact_default',
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    acquired_from VARCHAR(100),
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: one curated artifact per character (rarity upgrades update in place)
CREATE UNIQUE INDEX uq_player_curated_artifact ON player_artifacts (character_id, curated_artifact_id) WHERE curated_artifact_id IS NOT NULL;
-- Unique: no duplicate generated artifacts per character
CREATE UNIQUE INDEX uq_player_generated_artifact ON player_artifacts (character_id, artifact_code) WHERE artifact_code IS NOT NULL;

CREATE INDEX idx_player_artifacts_player ON player_artifacts (player_id);
CREATE INDEX idx_player_artifacts_character ON player_artifacts (character_id);
CREATE INDEX idx_player_artifacts_curated ON player_artifacts (curated_artifact_id) WHERE curated_artifact_id IS NOT NULL;
CREATE INDEX idx_player_artifacts_new ON player_artifacts (player_id) WHERE is_new = TRUE;

-- 2g. shard_transactions — audit trail for premium currency
CREATE TABLE IF NOT EXISTS shard_transactions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('achievement', 'purchase', 'refund', 'admin_grant', 'admin_deduct', 'spend')),
    source_id INTEGER,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shard_transactions_player ON shard_transactions (player_id);
CREATE INDEX idx_shard_transactions_source ON shard_transactions (source_type);

-- =============================================================================
-- 3. Column Additions to Existing Tables
-- =============================================================================

-- story_beats: hidden lore
ALTER TABLE story_beats ADD COLUMN IF NOT EXISTS hidden_lore_text TEXT DEFAULT NULL;
ALTER TABLE story_beats ADD COLUMN IF NOT EXISTS lore_intelligence_threshold INTEGER DEFAULT NULL;

-- player_scene_records: damage tracking
ALTER TABLE player_scene_records ADD COLUMN IF NOT EXISTS total_damage_dealt BIGINT NOT NULL DEFAULT 0;
ALTER TABLE player_scene_records ADD COLUMN IF NOT EXISTS best_session_damage BIGINT NOT NULL DEFAULT 0;

-- player_story_sessions: death tracking
ALTER TABLE player_story_sessions ADD COLUMN IF NOT EXISTS deaths INTEGER NOT NULL DEFAULT 0;

-- player_settings: terminal visit timestamps
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS akashic_last_visited_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS gallery_last_visited_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS achievements_last_visited_at TIMESTAMPTZ DEFAULT NULL;

-- player_meta_progression: shard tracking + active training
ALTER TABLE player_meta_progression ADD COLUMN IF NOT EXISTS shard_balance BIGINT NOT NULL DEFAULT 0;
ALTER TABLE player_meta_progression ADD COLUMN IF NOT EXISTS total_shards_earned BIGINT NOT NULL DEFAULT 0;
ALTER TABLE player_meta_progression ADD COLUMN IF NOT EXISTS active_training_sessions INTEGER NOT NULL DEFAULT 0;

-- =============================================================================
-- 4. Migrate Legacy Data
-- =============================================================================

-- Migrate the 4 existing legacy artifacts into curated_artifacts
INSERT INTO curated_artifacts (name, description, lore_text, icon_sprite_key, source_type, source_id, source_hint, base_drop_chance)
SELECT
    al.name,
    COALESCE(al.description, 'A mysterious artifact from the tower.'),
    al.lore_text,
    COALESCE(al.sprite_key, 'artifact_default'),
    'chapter',
    NULL,
    'Found within the Tower of Elysium',
    0.02
FROM artifacts_legacy al
ON CONFLICT (name) DO NOTHING;

-- Create tier data for migrated artifacts (at their original rarity)
INSERT INTO curated_artifact_tiers (curated_artifact_id, rarity, stat_bonuses, drop_chance_multiplier)
SELECT ca.id, al.rarity, COALESCE(al.passive_bonus, '{}'), 1.0
FROM artifacts_legacy al
JOIN curated_artifacts ca ON ca.name = al.name
ON CONFLICT (curated_artifact_id, rarity) DO NOTHING;

-- =============================================================================
-- 5. Seed Artifact Components
-- =============================================================================

-- 5a. Artifact Type Bases (~15)
INSERT INTO artifact_type_bases (code, display_name, base_stat_range, lore_reference) VALUES
('SHARD',  'Shard',      '{"strength": [1, 3], "vitality": [0, 2]}', 'Fractured remnants of crystallized tower energy'),
('PRISM',  'Prism',      '{"intelligence": [1, 3], "wisdom": [0, 2]}', 'Light-refracting devices from the upper reaches'),
('FRAG',   'Fragment',   '{"agility": [1, 2], "strength": [0, 2]}', 'Broken pieces of ancient constructs'),
('CORE',   'Core',       '{"vitality": [2, 4], "strength": [0, 1]}', 'Power sources from decommissioned tower systems'),
('RELIC',  'Relic',      '{"wisdom": [1, 3], "intelligence": [0, 2]}', 'Holy objects preserved from before the Collapse'),
('SIGIL',  'Sigil',      '{"intelligence": [1, 2], "agility": [0, 2]}', 'Inscribed glyphs that channel akashic flow'),
('ORB',    'Orb',        '{"wisdom": [2, 3], "vitality": [0, 1]}', 'Spherical containers of distilled essence'),
('LENS',   'Lens',       '{"intelligence": [2, 3], "precision": [0, 1]}', 'Optical instruments tuned to perceive hidden frequencies'),
('GLYPH',  'Glyph',      '{"strength": [1, 2], "wisdom": [0, 2]}', 'Ancient symbols etched into imperishable material'),
('TABLET', 'Tablet',     '{"wisdom": [1, 2], "vitality": [1, 2]}', 'Stone slabs encoded with compressed knowledge'),
('RESON',  'Resonator',  '{"agility": [1, 3], "precision": [0, 1]}', 'Devices that vibrate in harmony with tower frequencies'),
('CIRCT',  'Circuit',    '{"precision": [1, 3], "intelligence": [0, 1]}', 'Recovered computational nodes from the old network'),
('MEMBR',  'Membrane',   '{"vitality": [1, 3], "agility": [0, 1]}', 'Biological tissue from tower organisms'),
('CATAL',  'Catalyst',   '{"strength": [1, 2], "intelligence": [1, 2]}', 'Reagents that accelerate energy transformation'),
('ECHO',   'Echo',       '{"precision": [1, 2], "wisdom": [1, 2]}', 'Solidified reverberations of past events')
ON CONFLICT (code) DO NOTHING;

-- 5b. Artifact Prefixes (~20)
INSERT INTO artifact_prefixes (code, display_name, stat_bonuses) VALUES
('FRACT',  'Fractured',  '{"strength": 1}'),
('LUMIN',  'Luminous',   '{"intelligence": 1}'),
('DORM',   'Dormant',    '{"vitality": 1}'),
('CORRD',  'Corroded',   '{"agility": 1}'),
('PRST',   'Pristine',   '{"wisdom": 1}'),
('ETHER',  'Ethereal',   '{"intelligence": 1}'),
('VOLAT',  'Volatile',   '{"strength": 1}'),
('ANCNT',  'Ancient',    '{"wisdom": 1}'),
('NULL',   'Null',        '{"precision": 1}'),
('CRMSN',  'Crimson',    '{"strength": 1}'),
('OBSDN',  'Obsidian',   '{"vitality": 1}'),
('SPECL',  'Spectral',   '{"intelligence": 1}'),
('FADNG',  'Fading',     '{"agility": 1}'),
('ENCOD',  'Encoded',    '{"precision": 1}'),
('PARST',  'Parasitic',  '{"vitality": 1}'),
('HOLLW',  'Hollow',     '{"agility": 1}'),
('RADNT',  'Radiant',    '{"wisdom": 1}'),
('TWSTD',  'Twisted',    '{"strength": 1}'),
('FROZN',  'Frozen',     '{"precision": 1}'),
('BURNG',  'Burning',    '{"strength": 1}')
ON CONFLICT (code) DO NOTHING;

-- 5c. Artifact Suffixes (~20)
INSERT INTO artifact_suffixes (code, display_name, stat_bonuses) VALUES
('VOID',   'of the Void',        '{"intelligence": 1}'),
('AWAKE',  'of Awakening',       '{"wisdom": 1}'),
('TOWER',  'of the Tower',       '{"vitality": 1}'),
('SLNCE',  'of Silence',         '{"agility": 1}'),
('PALLM',  'of the Pallid Mask', '{"precision": 1}'),
('ETHR',   'of Etheris',         '{"intelligence": 1}'),
('CNDUT',  'of the Conduit',     '{"wisdom": 1}'),
('ASH',    'of Ash',             '{"strength": 1}'),
('MEMRY',  'of Memory',          '{"wisdom": 1}'),
('SUBSTR', 'of the Substrate',   '{"vitality": 1}'),
('ENTPY',  'of Entropy',         '{"agility": 1}'),
('DEMRG',  'of the Demiurge',    '{"intelligence": 1}'),
('DREAM',  'of Dreams',          '{"wisdom": 1}'),
('RHAT',   'of the Red Hat',     '{"strength": 1}'),
('GRAVT',  'of Gravity',         '{"vitality": 1}'),
('PHASE',  'of Phase',           '{"agility": 1}'),
('RESNC',  'of Resonance',       '{"precision": 1}'),
('CORPT',  'of Corruption',      '{"strength": 1}'),
('LIGHT',  'of Light',           '{"wisdom": 1}'),
('ABYSS',  'of the Abyss',       '{"intelligence": 1}')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 6. Seed 50 Curated Artifacts
-- =============================================================================

-- Book 1: The Pallid Mask (chapters 1-90, ~15 artifacts: 10 boss, 3 chapter, 2 rare_spawn)
INSERT INTO curated_artifacts (name, description, lore_text, icon_sprite_key, source_type, source_hint, base_drop_chance) VALUES
('Cracked Data Core',       'A remnant of the Old World''s network.',                     'The silicon is pitted and scarred, but a faint blue light still pulses within. It hums with the static of a billion forgotten conversations.', 'artifact_data_core',         'boss',       'Drops from: Chapter 5 Boss — Data Sentinel',        0.03),
('Void Shard',              'A pulsating fragment of Yaldabaoth''s prison.',               'Cold to the touch and seemingly absorbing the light around it. To hold it is to feel the weight of infinite isolation.',                      'artifact_void_shard',        'boss',       'Drops from: Chapter 10 Boss — Void Warden',          0.02),
('Membrane Leaf',           'Flora found only in the Lower Towers.',                       'Transparent and veined with a bioluminescent sap. It feeds on the atmospheric pressure of the tower''s depths.',                              'artifact_membrane_leaf',     'chapter',    'Drops from: Chapter 3 Mastery',                      0.05),
('Conduit''s Focus',        'A broken lens used to channel cosmic energy.',                'Once part of a Drifter''s apparatus. Though cracked, it still refracts the Akashic flow into visible spectrums.',                              'artifact_conduit_focus',     'boss',       'Drops from: Chapter 15 Boss — Akashic Conduit',      0.03),
('Pallid Fragment',         'A shard of the Mask itself, impossibly light.',               'Its surface shifts between states of matter. Those who stare too long claim to see faces forming in its reflections.',                          'artifact_pallid_fragment',   'boss',       'Drops from: Book 1 Final Boss — The Pallid Mask',    0.01),
('Tower Foundation Stone',  'A cube of impossibly dense material from Level 1.',           'Warm to the touch despite its appearance. The stone remembers the weight of every floor above it.',                                             'artifact_foundation_stone',  'chapter',    'Drops from: Chapter 1 Mastery',                      0.05),
('Static Discharge Coil',   'Sparking remnant from a deactivated defense grid.',           'Arcs of residual energy leap between its contacts. Each discharge echoes the last transmission it carried.',                                   'artifact_discharge_coil',    'boss',       'Drops from: Chapter 20 Boss — Grid Controller',      0.03),
('Collapsed Star Marble',   'A gravity-warped sphere from the Observatory.',               'Impossibly heavy for its size. Light bends visibly around it, creating a permanent halo effect.',                                               'artifact_star_marble',       'boss',       'Drops from: Chapter 30 Boss — Stellar Observer',     0.02),
('Drifter''s Compass',      'Points toward sources of concentrated Akashic energy.',       'The needle spins lazily until it detects a rift. Then it locks on with mechanical precision, trembling with anticipation.',                     'artifact_drifter_compass',   'rare_spawn', 'Rare drop from: Wandering Drifter encounters',       0.005),
('Echo Chamber Resonator',  'Amplifies the faintest whispers from the tower walls.',       'Press it against stone and hear centuries of conversations layered over each other in a beautiful, maddening cacophony.',                       'artifact_echo_resonator',    'boss',       'Drops from: Chapter 40 Boss — Echo Keeper',          0.02),
('Substrate Filament',      'A thread of living circuitry from the tower''s nervous system.', 'It writhes slowly when exposed to bioelectric fields. The tower is alive, and this is proof.',                                              'artifact_substrate_filament','boss',       'Drops from: Chapter 50 Boss — Substrate Mind',       0.02),
('Gravity Anchor',          'A stabilization device from the mid-tower engineering bays.', 'When activated, it creates a pocket of normal gravity in the tower''s wildly fluctuating fields.',                                               'artifact_gravity_anchor',    'chapter',    'Drops from: Chapter 25 Mastery',                     0.04),
('Phase Spider Silk',       'Gossamer thread that shifts between dimensions.',             'It exists in two places at once. Pull one end and the other moves in a mirror dimension.',                                                      'artifact_spider_silk',       'rare_spawn', 'Rare drop from: Phase Spider encounters',            0.005),
('Memory Spool',            'A crystalline recording medium from the Archive.',            'Contains compressed memories of tower inhabitants. Playing them back reveals fragments of lives lived in perpetual ascension.',                  'artifact_memory_spool',      'boss',       'Drops from: Chapter 60 Boss — Archive Guardian',     0.02),
('Pallid Mask Shard',       'A fragment of the legendary mask, vibrating with power.',     'Even this small piece radiates the presence of its whole. Those nearby feel watched by something ancient and patient.',                          'artifact_mask_shard',        'boss',       'Drops from: Chapter 70 Boss — Mask Fragment',        0.015)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    lore_text = EXCLUDED.lore_text,
    icon_sprite_key = EXCLUDED.icon_sprite_key,
    source_type = EXCLUDED.source_type,
    source_hint = EXCLUDED.source_hint,
    base_drop_chance = EXCLUDED.base_drop_chance;

-- Book 2: The Ascending (chapters 91-113, ~17 artifacts: 12 boss, 3 chapter, 2 rare_spawn)
INSERT INTO curated_artifacts (name, description, lore_text, icon_sprite_key, source_type, source_hint, base_drop_chance) VALUES
('Entropy Lens',            'A cracked lens that reveals hidden decay patterns.',          'Look through it and watch the universe unravel at the molecular level. Beautiful and terrifying in equal measure.',                           'artifact_entropy_lens',      'boss',       'Drops from: Chapter 91 Boss — Entropy Weaver',       0.025),
('Ascending Flame Ember',   'A perpetually burning coal from the Upper Furnace.',          'It never cools, never dims, never consumes itself. A perfect violation of thermodynamics.',                                                    'artifact_flame_ember',       'boss',       'Drops from: Chapter 95 Boss — Furnace Lord',         0.02),
('Void Walker''s Boot',     'A single boot that phases through solid matter.',             'The wearer''s footsteps leave no mark. They walk not on the ground but through the idea of ground.',                                            'artifact_void_boot',         'boss',       'Drops from: Chapter 98 Boss — Void Walker',          0.02),
('Temporal Dust',           'Grains of sand from a broken hourglass of ages.',             'Each grain contains a frozen moment. Shake the vial and watch civilizations rise and fall in the swirling patterns.',                            'artifact_temporal_dust',     'chapter',    'Drops from: Chapter 93 Mastery',                     0.04),
('Demiurge''s Fingerbone',  'A fossilized digit from the creator itself.',                 'It points unerringly toward the next floor. The bone remembers the hand that built the tower.',                                                 'artifact_demiurge_bone',     'boss',       'Drops from: Chapter 100 Boss — Demiurge Shade',      0.015),
('Cosmic Thread',           'A strand of the fabric between dimensions.',                  'Invisible to the naked eye but felt as a vibration in the chest. Pull it and reality dimples.',                                                 'artifact_cosmic_thread',     'boss',       'Drops from: Chapter 103 Boss — Cosmic Weaver',       0.015),
('Red Hat''s Calling Card',  'A bloodstained card with impossible geometry.',              'The angles are wrong. Following the lines with your eyes leads them to places that shouldn''t exist within a flat surface.',                    'artifact_red_hat_card',      'rare_spawn', 'Rare drop from: Red Hat Agent encounters',           0.004),
('Akashic Record Fragment', 'A page torn from the universal memory.',                      'The text rewrites itself as you read, always showing what you most need to know. The information is always true but never comforting.',          'artifact_akashic_record',    'boss',       'Drops from: Chapter 105 Boss — Record Keeper',       0.02),
('Etheris Crystal',         'Pure crystallized tower energy.',                              'It glows with an inner light that responds to the holder''s emotional state. In anger it blazes; in peace it dims to a warm ember.',           'artifact_etheris_crystal',   'chapter',    'Drops from: Chapter 97 Mastery',                     0.04),
('Corruption Bloom',        'A flower that thrives on tainted energy.',                    'Its petals are a deep, wrong shade of purple. It converts corruption to sustenance, growing more beautiful as its environment decays.',         'artifact_corruption_bloom',  'boss',       'Drops from: Chapter 107 Boss — Corruption Nexus',    0.02),
('Resonance Fork',          'A tuning fork attuned to the tower''s frequency.',            'Strike it and the tower hums in response. Doors open, walls shift, and hidden passages reveal themselves.',                                     'artifact_resonance_fork',    'boss',       'Drops from: Chapter 108 Boss — Resonance Matrix',    0.02),
('Null Field Emitter',      'Generates a localized zone where powers fail.',               'Within its range, all supernatural abilities cease. A great equalizer and a terrifying weapon.',                                                'artifact_null_emitter',      'boss',       'Drops from: Chapter 110 Boss — Null Entity',         0.015),
('Ascending Heart',         'The crystallized ambition of a thousand climbers.',            'It beats with the collective determination of every soul that reached this height. Their courage is now yours.',                                 'artifact_ascending_heart',   'boss',       'Drops from: Book 2 Final Boss — The Ascending One',  0.01),
('Phantom Circuit Board',   'Technology from a timeline that never happened.',             'Its components are made of materials that don''t exist in this reality. It functions perfectly despite being theoretically impossible.',          'artifact_phantom_circuit',   'rare_spawn', 'Rare drop from: Phantom Engineer encounters',        0.004),
('Singularity Pearl',       'A droplet of compressed spacetime.',                          'Light circles its surface endlessly, never escaping. A miniature black hole tamed and contained.',                                              'artifact_singularity_pearl', 'boss',       'Drops from: Chapter 112 Boss — Singularity Core',    0.015),
('Dream Catcher Web',       'Spun from the boundary between sleep and death.',             'It catches not dreams but intentions. Hang it nearby and know exactly what every nearby consciousness desires.',                                 'artifact_dream_web',         'chapter',    'Drops from: Chapter 100 Mastery',                    0.04),
('Abyssal Lantern',         'Illuminates things that prefer to remain hidden.',            'Its light penetrates all darkness, including the metaphorical kind. Secrets recoil from its glow.',                                              'artifact_abyssal_lantern',   'boss',       'Drops from: Chapter 113 Boss — Abyss Watcher',       0.02)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    lore_text = EXCLUDED.lore_text,
    icon_sprite_key = EXCLUDED.icon_sprite_key,
    source_type = EXCLUDED.source_type,
    source_hint = EXCLUDED.source_hint,
    base_drop_chance = EXCLUDED.base_drop_chance;

-- Book 3: The Transcendent (chapters 114-138, ~18 artifacts: 13 boss, 3 chapter, 2 rare_spawn)
INSERT INTO curated_artifacts (name, description, lore_text, icon_sprite_key, source_type, source_hint, base_drop_chance) VALUES
('Transcendence Seed',      'A bud of potential that could become anything.',              'It exists in a superposition of all possible forms. Observation doesn''t collapse it — it chooses what to become based on need.',              'artifact_transcend_seed',    'boss',       'Drops from: Chapter 114 Boss — Garden of Potential', 0.025),
('Yaldabaoth''s Tear',      'A frozen droplet from the imprisoned creator.',               'It contains the grief of a god. To hold it is to understand the weight of creating something you cannot control.',                             'artifact_yaldabaoth_tear',   'boss',       'Drops from: Chapter 118 Boss — Prison Warden',       0.015),
('Infinity Mirror Shard',   'A fragment that reflects infinite versions of reality.',      'Every reflection shows a different timeline. In some you climb; in others you fall. In one, the tower was never built.',                        'artifact_infinity_mirror',   'boss',       'Drops from: Chapter 120 Boss — Mirror Entity',       0.02),
('Architect''s Blueprint',  'Plans for a floor that was never built.',                     'The designs are elegant and impossible. Rooms inside rooms, stairs that lead up by going down. M.C. Escher would weep.',                        'artifact_blueprint',         'chapter',    'Drops from: Chapter 116 Mastery',                    0.04),
('Quantum Entanglement Key','A key paired to a lock that exists everywhere.',              'Turn it anywhere and a door opens somewhere. The connection between key and lock transcends space.',                                             'artifact_quantum_key',       'boss',       'Drops from: Chapter 122 Boss — Quantum Gate',        0.02),
('Soul Prism',              'Refracts consciousness into its component drives.',           'Look through it and see yourself as you truly are: a spectrum of desires, fears, and forgotten promises.',                                      'artifact_soul_prism',        'boss',       'Drops from: Chapter 125 Boss — Soul Collector',      0.015),
('Tower''s Heartbeat',      'A rhythmic pulse from the tower''s deepest core.',            'It beats in time with your own heart. As you climb higher, the synchronization grows stronger. You and the tower are becoming one.',             'artifact_tower_heartbeat',   'boss',       'Drops from: Chapter 128 Boss — Core Guardian',       0.015),
('Light Eater Mandible',    'A jaw fragment from a creature that feeds on photons.',       'In its presence, shadows deepen and colors desaturate. It is always hungry, and light is always plentiful.',                                     'artifact_light_eater',       'rare_spawn', 'Rare drop from: Light Eater encounters',             0.004),
('Akashic Lens',            'Reveals the true nature of all things observed.',             'The ultimate tool of perception. It strips away pretense, illusion, and self-deception. Most users can''t handle what they see.',               'artifact_akashic_lens',      'boss',       'Drops from: Chapter 130 Boss — Truth Arbiter',       0.015),
('Elysium Gate Fragment',   'A piece of the final door.',                                  'It hums with finality. This fragment knows it is part of an ending — and every ending is also a beginning.',                                    'artifact_gate_fragment',     'chapter',    'Drops from: Chapter 125 Mastery',                    0.04),
('Cosmic Weave Thread',     'Fabric of the multiverse made tangible.',                     'Each thread is a timeline. Pull gently and realities brush against each other. Pull hard and they merge. Neither outcome is safe.',             'artifact_cosmic_weave',      'boss',       'Drops from: Chapter 132 Boss — Weave Spinner',       0.02),
('Consciousness Engine',    'A device that converts thought into energy.',                 'Think near it and watch it glow. Dream near it and watch it blaze. It proves that consciousness is not a byproduct but a fundamental force.',   'artifact_consciousness_eng', 'boss',       'Drops from: Chapter 133 Boss — Mind Engine',         0.02),
('Timeless Observer Monocle','Allows viewing of all temporal states simultaneously.',      'Past, present, and future are displayed in overlapping layers. Sorting through them requires a consciousness that transcends linear time.',    'artifact_timeless_monocle',  'rare_spawn', 'Rare drop from: Temporal Observer encounters',       0.004),
('Final Theorem Proof',     'The mathematical proof that reality is recursive.',           'Written on a surface that exists in more than three dimensions. Reading it expands the mind in ways that cannot be undone.',                    'artifact_final_theorem',     'boss',       'Drops from: Chapter 135 Boss — Logic Arbiter',       0.015),
('Elysium''s Crown Jewel',  'The ultimate artifact, a gem from Elysium itself.',          'It radiates the pure energy of ascension. Those who hold it know, with absolute certainty, that the climb was worth it.',                        'artifact_crown_jewel',       'boss',       'Drops from: Book 3 Final Boss — The Transcendent',   0.005),
('Primordial Ember',        'The first spark of creation, still burning.',                 'Before the tower, before the world, there was this. An eternal flame that contains the blueprint of all that exists.',                           'artifact_primordial_ember',  'boss',       'Drops from: Chapter 136 Boss — Origin Flame',        0.015),
('Unity Fractal',           'A pattern that contains itself infinitely.',                  'Zoom in or out — the same pattern repeats forever. It proves that the small and the large are the same. As above, so below.',                   'artifact_unity_fractal',     'chapter',    'Drops from: Chapter 130 Mastery',                    0.04),
('Omega Key',               'Opens the door that opens all doors.',                        'It doesn''t fit any specific lock. It fits the concept of ''locked.'' With it, nothing is closed to you.',                                      'artifact_omega_key',         'boss',       'Drops from: Chapter 138 Boss — Final Gatekeeper',    0.01)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    lore_text = EXCLUDED.lore_text,
    icon_sprite_key = EXCLUDED.icon_sprite_key,
    source_type = EXCLUDED.source_type,
    source_hint = EXCLUDED.source_hint,
    base_drop_chance = EXCLUDED.base_drop_chance;

-- =============================================================================
-- 7. Seed Curated Artifact Tiers (5 tiers per artifact = 250 rows)
-- =============================================================================

-- Drop chance multipliers: common=1.0, uncommon=0.5, rare=0.1, epic=0.02, cosmic=0.005
-- Stat scaling: common=1x, uncommon=1.5x, rare=2.5x, epic=4x, cosmic=7x

INSERT INTO curated_artifact_tiers (curated_artifact_id, rarity, stat_bonuses, unique_effect_text, drop_chance_multiplier)
SELECT ca.id, tier.rarity, tier_stats.stats, tier.effect, tier.drop_mult
FROM curated_artifacts ca
CROSS JOIN (VALUES
    ('common',   1.0,  1.0,   NULL),
    ('uncommon', 0.5,  1.5,   NULL),
    ('rare',     0.1,  2.5,   NULL),
    ('epic',     0.02, 4.0,   'Enhanced passive effect'),
    ('cosmic',   0.005,7.0,   'Ultimate passive effect')
) AS tier(rarity, drop_mult, multiplier, effect)
CROSS JOIN LATERAL (
    SELECT jsonb_build_object(
        'strength',     CASE WHEN ca.name IN ('Cracked Data Core','Void Shard','Pallid Fragment','Static Discharge Coil','Collapsed Star Marble','Pallid Mask Shard','Ascending Flame Ember','Void Walker''s Boot','Ascending Heart','Transcendence Seed','Tower''s Heartbeat','Elysium''s Crown Jewel','Primordial Ember','Omega Key')
                             THEN ROUND(5 * tier.multiplier) ELSE ROUND(3 * tier.multiplier) END,
        'intelligence', CASE WHEN ca.name IN ('Conduit''s Focus','Echo Chamber Resonator','Memory Spool','Entropy Lens','Akashic Record Fragment','Etheris Crystal','Null Field Emitter','Yaldabaoth''s Tear','Infinity Mirror Shard','Soul Prism','Akashic Lens','Consciousness Engine','Final Theorem Proof')
                             THEN ROUND(5 * tier.multiplier) ELSE ROUND(2 * tier.multiplier) END,
        'vitality',     CASE WHEN ca.name IN ('Membrane Leaf','Tower Foundation Stone','Gravity Anchor','Substrate Filament','Corruption Bloom','Dream Catcher Web','Elysium Gate Fragment','Cosmic Weave Thread','Unity Fractal')
                             THEN ROUND(4 * tier.multiplier) ELSE ROUND(2 * tier.multiplier) END,
        'agility',      CASE WHEN ca.name IN ('Phase Spider Silk','Drifter''s Compass','Temporal Dust','Phantom Circuit Board','Light Eater Mandible','Timeless Observer Monocle','Quantum Entanglement Key')
                             THEN ROUND(4 * tier.multiplier) ELSE ROUND(1 * tier.multiplier) END,
        'wisdom',       CASE WHEN ca.name IN ('Conduit''s Focus','Demiurge''s Fingerbone','Cosmic Thread','Resonance Fork','Singularity Pearl','Abyssal Lantern','Architect''s Blueprint','Akashic Lens','Tower''s Heartbeat')
                             THEN ROUND(4 * tier.multiplier) ELSE ROUND(1 * tier.multiplier) END
    ) AS stats
) AS tier_stats(stats)
ON CONFLICT (curated_artifact_id, rarity) DO UPDATE SET
    stat_bonuses = EXCLUDED.stat_bonuses,
    unique_effect_text = EXCLUDED.unique_effect_text,
    drop_chance_multiplier = EXCLUDED.drop_chance_multiplier;

COMMIT;
