-- Migration 037: Content Expansion (2.4 Content CRUD)
-- - Attack types table + entity junction
-- - Expanded gear slots (3 → 16)
-- - Expanded benefit effects (13 → 60)
-- - Expanded item components (prefixes, qualities, lore_tags, suffixes)
-- - Expanded type_bases (5+ per slot, weapon/attack type coverage)
-- - Entity attack type assignments

BEGIN;

-- =============================================================================
-- 1. ATTACK TYPES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS attack_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_physical BOOLEAN DEFAULT FALSE,
    lore_reference TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- Junction table: entities can have multiple attack types
CREATE TABLE IF NOT EXISTS entity_attack_types (
    id          SERIAL PRIMARY KEY,
    entity_id   INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    attack_type_id INTEGER NOT NULL REFERENCES attack_types(id) ON DELETE CASCADE,
    is_primary  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(entity_id, attack_type_id)
);

-- Junction table: item_type_bases can have multiple attack types (for weapons)
CREATE TABLE IF NOT EXISTS type_base_attack_types (
    id              SERIAL PRIMARY KEY,
    type_base_id    INTEGER NOT NULL REFERENCES item_type_bases(id) ON DELETE CASCADE,
    attack_type_id  INTEGER NOT NULL REFERENCES attack_types(id) ON DELETE CASCADE,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(type_base_id, attack_type_id)
);

-- Seed attack types (13 total: 3 core + 10 lore-appropriate)
INSERT INTO attack_types (name, display_name, description, is_physical, lore_reference) VALUES
    ('melee',       'Melee',        'Close-quarters physical combat using blades, fists, or blunt instruments.', TRUE, 'S Corp tactical operatives and Engineer class constructs'),
    ('ranged',      'Ranged',       'Projectile-based attacks from distance — ballistic, plasma, or thrown.', TRUE, 'S Corp defense turrets and Red Hat guerrilla weaponry'),
    ('akashic',     'Akashic',      'Cosmic energy manipulation channeled from the Akashic realm.', FALSE, 'Conduit class energy projection and Lady A''s void sorcery'),
    ('aerial',      'Aerial',       'Airborne assault — dive attacks, swooping strikes, or atmospheric bombardment.', TRUE, 'Elysium Station defense drones and winged construct entities'),
    ('psychic',     'Psychic',      'Mental and dream-state attacks that target consciousness directly.', FALSE, 'Dreamwalker abilities, Madam Osilari''s symbol-weaving, Threshold entities'),
    ('nanite',      'Nanite',       'Nanite swarm attacks — corrosive clouds, targeted disassembly, infiltration.', FALSE, 'S Corp nanite technology operating at the Angstrom scale'),
    ('phase',       'Phase',        'Phase-shifted attacks that bypass conventional defenses by slipping between states.', FALSE, 'Drifter class Threshold Slip and phase-state traversal technology'),
    ('void',        'Void',         'Zero-point null energy from Lady A''s void domain — erasure, not damage.', FALSE, 'Lady Astrael''s void domain — annihilation of existence itself'),
    ('resonance',   'Resonance',    'Vibrational frequency attacks that shatter structures and disrupt energy fields.', FALSE, 'Infinitron resonance frequencies — the felt calibration of reality'),
    ('construct',   'Construct',    'Automated mechanical attacks from prison-generated immune-response entities.', TRUE, 'Yaldabaoth''s automated defense constructs — the prison''s antibodies'),
    ('thermal',     'Thermal',      'Extreme heat or cold energy projection — plasma bursts, cryo-blasts.', TRUE, 'Elysium Station thermal defense grid and Antarctic R&D facility (MOM) tech'),
    ('gravitic',    'Gravitic',     'Gravitational manipulation — crushing fields, orbital pulls, mass distortion.', FALSE, 'ERB portal gravitational lensing and Etheris structural architecture'),
    ('corruption',  'Corruption',   'Parasitic energy that infects, degrades, and subverts from within.', FALSE, 'Yaldabaoth''s corruption — the demiurge''s method of control and consumption')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. EXPANDED GEAR SLOTS (3 → 16)
-- =============================================================================

-- Update existing slots to be more specific
UPDATE gear_slots SET name = 'main_hand', display_name = 'Main Hand',
    description = 'Primary weapon hand. Equips swords, emitters, staves, and other offensive instruments.',
    sort_order = 12
WHERE name = 'weapon';

UPDATE gear_slots SET name = 'chest', display_name = 'Chest',
    description = 'Core body armor. Provides the bulk of defensive capability.',
    sort_order = 4
WHERE name = 'armor';

UPDATE gear_slots SET sort_order = 15,
    description = 'Passive enhancement accessory. Boosts Intelligence and provides unique effects.'
WHERE name = 'trinket';

-- Add new slots
INSERT INTO gear_slots (name, display_name, description, sort_order) VALUES
    ('head',      'Head',        'Cranial protection and neural enhancement. Helmets, visors, and mind-shields.',  1),
    ('neck',      'Neck',        'Necklaces, amulets, and conduit chains. Channels ambient Akashic energy.',       2),
    ('shoulders', 'Shoulders',   'Pauldrons and energy emitter mounts. Provides structural support and style.',    3),
    ('hands',     'Hands',       'Gauntlets, gloves, and haptic interfaces. Enhances grip and energy channeling.', 5),
    ('wrist_1',   'Wrist (L)',   'Left wrist bracelet or data band. Compact enhancement slot.',                    6),
    ('wrist_2',   'Wrist (R)',   'Right wrist bracelet or data band. Compact enhancement slot.',                   7),
    ('finger_1',  'Ring (L)',    'Left hand ring. Small but potent enhancement — often Akashic-infused.',          8),
    ('finger_2',  'Ring (R)',    'Right hand ring. Small but potent enhancement — often Akashic-infused.',         9),
    ('legs',      'Legs',        'Leg armor and exoskeleton components. Mobility and structural defense.',         10),
    ('feet',      'Feet',        'Boots and stabilizer platforms. Ground-contact enhancement and movement speed.', 11),
    ('off_hand',  'Off Hand',    'Secondary hand — shields, focus orbs, or dual-wield weapons.',                   13),
    ('back',      'Back',        'Cloaks, jetpacks, and energy wings. Provides passive aura effects.',            14),
    ('waist',     'Waist',       'Belts and utility harnesses. Compact storage and stat augmentation.',            16)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 3. EXPANDED BENEFIT EFFECTS (13 → 60)
-- =============================================================================
-- Categories: combat, economy, utility, audio, defense, training
-- 30 positive, 15 neutral/mixed, 15 negative

-- POSITIVE effects (17 new, 13 existing = 30 total)
INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, min_value, max_value, category) VALUES
    ('health_regen',        'Health Regen',        'Regenerates HP over time based on percentage of max health.',         'percentage', 0.01, 0.10, 'defense'),
    ('shield_strength',     'Shield Strength',     'Increases energy shield capacity — absorbs damage before HP.',        'percentage', 0.05, 0.50, 'defense'),
    ('dodge_chance',        'Dodge Chance',        'Probability of completely avoiding an incoming attack.',              'percentage', 0.01, 0.25, 'defense'),
    ('xp_bonus',            'XP Bonus',            'Increases all experience gained from combat and training.',           'percentage', 0.05, 0.50, 'training'),
    ('cooldown_reduction',  'Cooldown Reduction',  'Reduces active skill cooldown timers.',                              'percentage', 0.05, 0.70, 'combat'),
    ('damage_resistance',   'Damage Resistance',   'Flat percentage reduction of all incoming damage.',                  'percentage', 0.02, 0.40, 'defense'),
    ('movement_speed',      'Movement Speed',      'Increases character movement and combat repositioning speed.',       'percentage', 0.05, 0.30, 'utility'),
    ('attack_speed_bonus',  'Attack Speed',        'Increases auto-attack tick rate.',                                   'percentage', 0.05, 0.50, 'combat'),
    ('lifesteal_pct',       'Lifesteal',           'Percentage of damage dealt is recovered as HP.',                     'percentage', 0.01, 0.15, 'combat'),
    ('multi_hit_chance',    'Multi-Hit',           'Chance for each attack to strike an additional time.',               'percentage', 0.05, 0.25, 'combat'),
    ('essence_efficiency',  'Essence Efficiency',  'Reduces Essence drain rate during idle training.',                   'percentage', 0.05, 0.50, 'training'),
    ('idle_xp_bonus',       'Idle XP Bonus',       'Increases XP gained during idle training sessions.',                 'percentage', 0.05, 0.50, 'training'),
    ('wave_skip_chance',    'Wave Skip',           'Chance to automatically complete a wave without combat.',            'percentage', 0.01, 0.10, 'utility'),
    ('boss_damage_bonus',   'Boss Damage',         'Additional damage multiplier against boss-type entities.',           'percentage', 0.10, 1.00, 'combat'),
    ('drop_quality_bonus',  'Drop Quality',        'Increases the rarity weight of dropped items.',                      'percentage', 0.05, 0.30, 'economy'),
    ('nano_repair_rate',    'Nano Repair',         'Nanite self-repair speed — passive HP recovery between waves.',      'flat',       1.0,  20.0, 'defense'),
    ('akashic_insight',     'Akashic Insight',     'Reveals hidden lore fragments and secret scene triggers.',           'percentage', 0.05, 0.25, 'utility')
ON CONFLICT (effect_key) DO NOTHING;

-- NEUTRAL / MIXED effects (15 new)
INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, min_value, max_value, category) VALUES
    ('phase_shift',           'Phase Shift',           'Dodge attacks more often but deal reduced damage while shifted.',            'percentage', -0.15, 0.20, 'combat'),
    ('overcharge',            'Overcharge',            'Amplified damage output but accelerated Essence drain.',                     'percentage', -0.25, 0.30, 'combat'),
    ('temporal_flux',         'Temporal Flux',         'Attack speed oscillates randomly between fast and slow.',                    'percentage', -0.20, 0.20, 'utility'),
    ('resonance_feedback',    'Resonance Feedback',    'Amplifies all nearby damage — allies AND enemies.',                          'percentage', 0.10,  0.30, 'combat'),
    ('nanite_swarm_aura',     'Nanite Swarm',          'Deals passive damage to all nearby but drains Essence.',                     'flat',       1.0,   10.0, 'combat'),
    ('void_echo',             'Void Echo',             'Duplicates attacks at reduced power — 50% damage echo.',                     'percentage', 0.20,  0.50, 'combat'),
    ('dream_state',           'Dream State',           'Increased skill power but lower maximum HP while active.',                   'percentage', -0.20, 0.25, 'utility'),
    ('substrate_merge',       'Substrate Merge',       'Enhanced defense but reduced attack speed — merging with the prison floor.', 'percentage', -0.15, 0.20, 'defense'),
    ('entropy_field',         'Entropy Field',         'Area damage reduction for all — slows combat but reduces incoming.',         'percentage', -0.10, 0.15, 'utility'),
    ('quantum_uncertainty',   'Quantum Uncertainty',   'Crit chance becomes highly variable — massive crits or complete misses.',    'percentage', -0.10, 0.40, 'combat'),
    ('parasitic_link',        'Parasitic Link',        'Drain enemy stats at cost of your own — zero-sum transfer.',                'percentage', -0.10, 0.15, 'combat'),
    ('memory_blur',           'Memory Blur',           'Reduces enemy and own accuracy — Drifter invisibility side effect.',         'percentage', -0.15, 0.15, 'utility'),
    ('conduit_overflow',      'Conduit Overflow',      'Skills cost less Essence but have randomized effect magnitudes.',            'percentage', -0.20, 0.30, 'utility'),
    ('graviton_pulse',        'Graviton Pulse',        'Pulls enemies closer — beneficial for melee, dangerous for ranged.',        'flat',       1.0,   5.0,  'combat'),
    ('threshold_instability', 'Threshold Instability', 'Random micro-teleportation — dodges some attacks, misses some targets.',    'percentage', -0.10, 0.15, 'utility')
ON CONFLICT (effect_key) DO NOTHING;

-- NEGATIVE effects (15 new)
INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, min_value, max_value, category) VALUES
    ('corruption_spread',   'Corruption Spread',   'Increasing damage taken over time — Yaldabaoth''s parasitic influence.',   'percentage', 0.01, 0.05, 'combat'),
    ('essence_leak',        'Essence Leak',        'Passive Essence loss per second — unstable energy containment.',           'flat',       0.5,  5.0,  'economy'),
    ('sight_obscured',      'Sight Obscured',      'Reduced accuracy and crit chance — Etheris visual interference.',          'percentage', 0.05, 0.20, 'combat'),
    ('temporal_stasis',     'Temporal Stasis',      'Reduced attack speed — caught in a localized time dilation field.',       'percentage', 0.10, 0.40, 'combat'),
    ('void_sickness',       'Void Sickness',        'All stats reduced over time — exposure to raw void energy.',              'percentage', 0.01, 0.03, 'combat'),
    ('nanite_malfunction',  'Nanite Malfunction',   'Random skill failures — nanite control systems compromised.',             'percentage', 0.05, 0.20, 'utility'),
    ('prison_weight',       'Prison Weight',        'Reduced movement speed — the prison''s gravity pressing down.',           'percentage', 0.10, 0.30, 'utility'),
    ('akashic_static',      'Akashic Static',       'Reduced skill effectiveness — Akashic signal degradation.',               'percentage', 0.05, 0.25, 'combat'),
    ('dream_collapse',      'Dream Collapse',       'Periodic brief stun — consciousness flickering between states.',          'flat',       0.5,  2.0,  'utility'),
    ('construct_aggro',     'Construct Aggro',      'Increased enemy aggression — prison immune system targeting you.',         'percentage', 0.10, 0.50, 'combat'),
    ('etheris_decay',       'Etheris Decay',        'Maximum HP reduction — the prison substrate degrading around you.',       'percentage', 0.05, 0.25, 'defense'),
    ('red_hat_sabotage',    'Red Hat Sabotage',     'Equipment stat degradation — fundamentalist sabotage devices.',            'percentage', 0.05, 0.15, 'utility'),
    ('demiurge_notice',     'Demiurge Notice',      'Boss encounters become harder — Yaldabaoth is watching.',                  'percentage', 0.10, 0.50, 'combat'),
    ('reality_fracture',    'Reality Fracture',     'Random displacement — teleported to unfavorable positions.',               'percentage', 0.05, 0.15, 'utility'),
    ('system_audit',        'System Audit',         'Periodic damage pulse — the prison''s maintenance cycle targets you.',     'flat',       2.0,  15.0, 'combat')
ON CONFLICT (effect_key) DO NOTHING;

-- =============================================================================
-- 4. EXPANDED ITEM PREFIXES (15 → 60)
-- =============================================================================
-- 30 positive, 15 neutral/mixed, 15 negative

-- POSITIVE prefixes (15 new = 30 total with existing 15)
INSERT INTO item_prefixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('SHLD',  'Shielded',    '{"strength": 1, "agility": 2}',                    'S Corp personal energy shield technology — deflective barrier'),
    ('INFI',  'Infinite',    '{"intelligence": 3, "strength": 1}',               'The Infinite Unbounded — S Corp''s limitless technological expansion'),
    ('BLZD',  'Blazing',     '{"strength": 3, "agility": 1}',                    'Thermal defense grid ignition — white-hot plasma containment'),
    ('CNDL',  'Candled',     '{"intelligence": 2, "agility": 1}',                'Madam Osilari''s symbol-light — equations burning in wax and fire'),
    ('DRMW',  'Dreamwoven',  '{"intelligence": 3, "agility": 1}',                'Woven from Threshold dream-state filaments — Lady I''s craft'),
    ('STRK',  'Starforged',  '{"strength": 2, "intelligence": 2}',               'Forged in the stellar foundries of Sorhhinda colony'),
    ('PLSM',  'Plasma',      '{"strength": 3, "intelligence": 1}',               'S Corp plasma containment — superheated ionized matter'),
    ('AURL',  'Auroral',     '{"agility": 2, "intelligence": 2}',                'Elysium Station aurora field — charged particle luminescence'),
    ('CRSN',  'Crystalline', '{"intelligence": 4}',                               'Infinitron crystalline architecture — atomic-level structure'),
    ('GNSS',  'Genesis',     '{"strength": 1, "agility": 2, "intelligence": 1}', 'Aditi''s Genesis ship — edge-of-system exploration technology'),
    ('ASCN',  'Ascending',   '{"strength": 1, "agility": 1, "intelligence": 2}', 'The act of ascending beyond the prison''s runtime constraints'),
    ('DVNE',  'Divine',      '{"intelligence": 4}',                               'The Thirteen Ascended — remnant power of cosmic entities'),
    ('SLCT',  'Selective',   '{"agility": 3, "intelligence": 1}',                'Patrick''s tactical selectivity — precision over brute force'),
    ('RPLC',  'Replicated',  '{"strength": 2, "agility": 2}',                    'Matter replicator output — atomic-level duplication technology'),
    ('PRTL',  'Portal',      '{"agility": 2, "intelligence": 2}',                'ERB portal energy signature — Einstein-Rosen Bridge residue')
ON CONFLICT (code) DO NOTHING;

-- NEUTRAL/MIXED prefixes (15 new)
INSERT INTO item_prefixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('FLCR',  'Flickering',  '{"agility": 3, "strength": -1}',                   'Unstable phase state — present in multiple locations simultaneously'),
    ('PRST',  'Parasitic',   '{"intelligence": 3, "agility": -1}',               'Yaldabaoth''s parasitic methodology — power at a cost'),
    ('SHTRD', 'Shattered',   '{"strength": 3, "intelligence": -1}',              'Post-fracture remnant — broken but still sharp'),
    ('UNST',  'Unstable',    '{"intelligence": 2, "agility": 2, "strength": -1}','Quantum instability — powerful but unpredictable'),
    ('DSTRT', 'Distorted',   '{"strength": 2, "intelligence": 2, "agility": -1}','Reality distortion — the Distorted Monarch''s influence'),
    ('HYBRD', 'Hybrid',      '{"strength": 1, "agility": 1, "intelligence": 1}', 'Merged S Corp and Akashic technology — two systems in one'),
    ('WTHRD', 'Weathered',   '{"strength": 2, "agility": -1}',                   'Ancient pre-prison artifact — worn but enduring'),
    ('GLCHD', 'Glitched',    '{"agility": 3, "intelligence": -1}',               'Mandela Effect artifact — reality glitch residue'),
    ('SRGNG', 'Surging',     '{"strength": 3, "agility": -1}',                   'Power surge pattern — overwhelming force with recovery lag'),
    ('DRFTG', 'Drifting',    '{"agility": 3, "strength": -1}',                   'Drifter class phase-drift — present and absent simultaneously'),
    ('BNDNG', 'Binding',     '{"strength": 2, "intelligence": 1, "agility": -1}','Construct binding chains — restraint and control'),
    ('MRGNG', 'Merging',     '{"intelligence": 3, "strength": -1}',              'Substrate merger state — dissolving boundaries'),
    ('RCRSV', 'Recursive',   '{"intelligence": 2, "agility": 1, "strength": -1}','NG+ recursive loop artifact — memory stacking'),
    ('TRNST', 'Transient',   '{"agility": 2, "intelligence": 1, "strength": -1}','Threshold transit residue — temporary but potent'),
    ('FLXNG', 'Fluxing',     '{"agility": 2, "strength": 1, "intelligence": -1}','Temporal flux artifact — time-shifted properties')
ON CONFLICT (code) DO NOTHING;

-- NEGATIVE prefixes (15 new)
INSERT INTO item_prefixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('CRRPT', 'Corroded',    '{"strength": -2}',                                 'Prison maintenance acid — substrate corrosion'),
    ('FDDNG', 'Fading',      '{"intelligence": -2}',                             'Akashic signal degradation — losing coherence'),
    ('WKND',  'Weakened',    '{"strength": -1, "agility": -1}',                  'Post-audit weakening — system resources stripped'),
    ('BRKN',  'Broken',      '{"agility": -2}',                                  'Fractured construct remnant — damaged beyond repair'),
    ('CRSED', 'Cursed',      '{"intelligence": -1, "agility": -1}',              'Demiurge curse — Yaldabaoth''s deliberate sabotage'),
    ('HLLW',  'Hollow',      '{"strength": -1, "intelligence": -1}',             'Hollowed out by void exposure — structural integrity lost'),
    ('RSTNG', 'Rusting',     '{"strength": -2}',                                 'S Corp equipment decay — nanite maintenance failure'),
    ('DMGD',  'Damaged',     '{"agility": -1, "strength": -1}',                  'Battle damage from Red Hat conflicts — scarred and dented'),
    ('DRND',  'Drained',     '{"intelligence": -2}',                             'Essence-drained artifact — emptied of Akashic power'),
    ('HVYWT', 'Heavy',       '{"agility": -2}',                                  'Excessive mass — Etheris gravitational anomaly'),
    ('BLTRD', 'Blistered',   '{"agility": -1, "strength": -1}',                  'Thermal overexposure — heat-warped and bubbled'),
    ('SPPRD', 'Suppressed',  '{"intelligence": -2}',                             'System suppression field — Yaldabaoth dampening power'),
    ('FRZN',  'Frozen',      '{"agility": -2}',                                  'Antarctic cryo-lock — MOM facility containment overflow'),
    ('VNSHD', 'Vanishing',   '{"strength": -1, "agility": -1}',                  'Phase decay — slipping out of stable existence'),
    ('SCRD',  'Scarred',     '{"strength": -1, "intelligence": -1}',             'Dreamscape psychic scarring — traumatic imprint')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 5. EXPANDED ITEM QUALITIES (10 → 60)
-- =============================================================================

-- POSITIVE qualities (20 new = 30 total with existing 10)
INSERT INTO item_qualities (code, display_name, lore_reference) VALUES
    ('PRFCT', 'Perfected',    'Engineer class precision — calibrated to quantum tolerance, zero defects'),
    ('HNDCR', 'Handcrafted',  'Custom-built by S Corp artisans — individual attention at every scale'),
    ('RNFRC', 'Reinforced',   'Double-layer structural reinforcement — Etheris architecture inspired'),
    ('PLSHD', 'Polished',     'Mirror-finish surface treatment — aesthetic and functional perfection'),
    ('TMPRD', 'Tempered',     'Heat-treated in Elysium Station thermal foundries — maximum hardness'),
    ('RSTRD', 'Restored',     'Rebuilt from pre-prison artifacts — ancient power renewed'),
    ('CNSRD', 'Consecrated',  'Blessed by Vessel class divine channeling — cosmic entity endorsement'),
    ('PRMD',  'Primed',       'Pre-charged with Akashic energy — ready for immediate deployment'),
    ('HRMNC', 'Harmonic',     'Tuned to Infinitron resonance frequency — optimal energy transfer'),
    ('MNTND', 'Maintained',   'S Corp nanite-maintained — perpetual self-repair at the atomic level'),
    ('RCTFD', 'Rectified',    'Quantum error-corrected — impossible precision in every dimension'),
    ('VNRBL', 'Venerable',    'Aged beyond measure — pre-dates the current prison runtime'),
    ('BRTHL', 'Breathless',   'Void-forged in airless space — Lady A''s zero-atmosphere technique'),
    ('SRHHD', 'Sorhhindic',   'Crafted on colony world Sorhhinda — off-world manufacturing methods'),
    ('NTGRD', 'Integrated',   'Fully integrated with neural interface — responds to thought'),
    ('HRDND', 'Hardened',     'Radiation-hardened against cosmic ray exposure — deep-space grade'),
    ('SPKNG', 'Sparking',     'Crackling with residual energy — overcharged beyond specification'),
    ('FLWLS', 'Flawless',     'Zero-defect manufacturing — statistical impossibility made real'),
    ('LMNTD', 'Laminated',    'Multi-layer composite construction — each layer a different material'),
    ('ANNTD', 'Anointed',     'Ritually prepared by the Shepherd Initiative — divine council approval')
ON CONFLICT (code) DO NOTHING;

-- NEUTRAL/MIXED qualities (15 new)
INSERT INTO item_qualities (code, display_name, lore_reference) VALUES
    ('PRTTY', 'Prototype',    'First-generation experimental — powerful but unrefined'),
    ('SLVGD', 'Salvaged',     'Recovered from wreckage — functional but aesthetically compromised'),
    ('MDFD',  'Modified',     'Field-modified beyond original specification — unpredictable improvements'),
    ('RPRSD', 'Repurposed',   'Originally designed for another function — adapted to combat use'),
    ('CMPLX', 'Complex',      'Overly complicated design — powerful when it works, fragile when it doesn''t'),
    ('EXPTL', 'Experimental', 'Morgan''s MOM facility prototype — cutting edge but untested'),
    ('MTATD', 'Mutated',      'Akashic exposure mutation — changed in unpredictable ways'),
    ('PRCSN', 'Pressurized',  'High-pressure energy containment — more power, more risk'),
    ('RVRSD', 'Reversed',     'Reverse-engineered from enemy technology — imperfect understanding'),
    ('FSSLD', 'Fossilized',   'Ancient beyond dating — preserved in prison substrate'),
    ('SNTHT', 'Synthetic',    'Fully artificial construction — no organic components'),
    ('CMPST', 'Composite',    'Multi-material construction — compromise between properties'),
    ('RCLMD', 'Reclaimed',    'Recovered from Yaldabaoth''s domain — tainted but functional'),
    ('TWSTD', 'Twisted',      'Dimensionally warped — physically impossible geometry'),
    ('BLNCD', 'Balanced',     'Precisely balanced between offense and defense — no specialization')
ON CONFLICT (code) DO NOTHING;

-- NEGATIVE qualities (15 new)
INSERT INTO item_qualities (code, display_name, lore_reference) VALUES
    ('CRCKG', 'Cracking',     'Structural integrity failing — visible fracture lines spreading'),
    ('FLKNG', 'Flaking',      'Surface material shedding — degrading with each use'),
    ('WRPNG', 'Warping',      'Dimensionally unstable — shape shifting involuntarily'),
    ('LKNG',  'Leaking',      'Energy containment failure — power seeping away'),
    ('RSTNG', 'Rusted',       'Oxidation damage — surface corrosion compromising function'),
    ('PTTNG', 'Pitting',      'Micro-crater damage from nanite attacks — Swiss cheese internals'),
    ('DLPTD', 'Dilapidated',  'Neglected maintenance — systems failing one by one'),
    ('JRRIG', 'Jury-Rigged',  'Emergency field repair — held together with hope and tape'),
    ('CNTMN', 'Contaminated', 'Corruption-infected — Yaldabaoth''s influence embedded'),
    ('DFCTV', 'Defective',    'Manufacturing flaw — bypassed quality control'),
    ('BTRYD', 'Betrayed',     'Sabotaged by Dr. On''s Red Hat infiltrators — compromised from within'),
    ('STRND', 'Strained',     'Operating beyond design limits — stressed to breaking point'),
    ('BLDNG', 'Bleeding',     'Leaking internal fluids — catastrophic seal failure'),
    ('FLTNG', 'Faltering',    'Intermittent function — works sometimes, fails unpredictably'),
    ('CRRDD', 'Corroded',     'Acid-etched by prison maintenance fluids — pitted and worn')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 6. EXPANDED ITEM LORE TAGS (15 → 60)
-- =============================================================================

-- POSITIVE lore tags (15 new = 30 total)
INSERT INTO item_lore_tags (code, display_name, narrative_context) VALUES
    ('ELYSM', 'Elysium',     'The space station Elysium — humanity''s foothold beyond Earth, crowned jewel of S Corp'),
    ('ENGNR', 'Engineer',    'The Engineer class — those who hear the Eternal Engine''s rhythm and rebuild reality'),
    ('VSSEL', 'Vessel',      'The Vessel class — channels of remnant power from the Thirteen Ascended'),
    ('DRFTR', 'Drifter',     'The Drifter class — memory-walkers who navigate spaces between realities'),
    ('CNDTC', 'Conduit',     'The Conduit class — raw cosmic energy channels, reality warpers'),
    ('SCRPS', 'S Corp',      'Stephen''s tech empire — from Infinitron to interstellar colonization'),
    ('STPHN', 'Aspolin',     'Stephen''s divine name — the identity he carries into the Akashic realm'),
    ('ETRNE', 'Engine',      'The Eternal Engine — the dream-born crystalline power source of impossible design'),
    ('THRSN', 'Thirteen',    'The Thirteen Ascended — elder cosmic entities imprisoned alongside humanity'),
    ('SRHND', 'Sorhhinda',   'Colony world Sorhhinda — a sanctuary among the stars, 500 years of civilization'),
    ('PTRIK', 'Patrick',     'Patrick''s security protocols — loyal, aggressive, pragmatic defense'),
    ('MRGNS', 'Morgan',      'Morgan''s scientific genius — astrophysicist, MOM facility, nanite integration'),
    ('ADITI', 'Aditi',       'Aditi''s courage — hijacked Genesis ship, discovered Red Hat weakness'),
    ('FRANK', 'Frank',       'Frank the janitor — blue-collar perspective aboard Elysium, married to Pete'),
    ('PNTRS', 'Pointers',    'The global Pointer phenomenon — silent figures appearing worldwide pointing skyward')
ON CONFLICT (code) DO NOTHING;

-- NEUTRAL lore tags (15 new)
INSERT INTO item_lore_tags (code, display_name, narrative_context) VALUES
    ('MNDLE', 'Mandela',     'The Mandela Effect — not a glitch but a feature of the prison, reality overwrites'),
    ('DRMON', 'Paimon',      'Dr. On (Pai M. On) — S Corp psychiatrist turned Red Hat infiltrator, professional gaslighter'),
    ('SLEEP', 'Sleeper',     'The Sleepers — dormant populations activated by Elysium''s cosmic presence'),
    ('RPLCR', 'Replicator',  'Matter replication technology — generalized alchemy, lead into gold at atomic level'),
    ('ERBPG', 'ERB Gate',    'Einstein-Rosen Bridge portal network — teleportation and interstellar travel'),
    ('NTRLK', 'Nutralink',   'Leon''s Nutralink neural implants — direct brain-computer interface technology'),
    ('CRCKT', 'Circuit',     'The Crisis on Infinite Circuits — S Corp''s technical and political crises'),
    ('TDLDR', 'Todd',        'Todd the Red Hat leader — conspiracy theorist turned terrorist figurehead'),
    ('STACY', 'Stacey',      'Stacey — Todd''s long-suffering partner, enduring his descent into fanaticism'),
    ('GILOP', 'Gil',         'Gil — S Corp intelligence operative, shadows and secrets'),
    ('JMSAD', 'James',       'James — S Corp advisor, quiet counsel in the boardroom'),
    ('LEONA', 'Leon',        'Leon — S Corp co-founder, manic tech-bro visionary, rocket builder'),
    ('TJADV', 'TJ',          'TJ — S Corp advisor, moral compass and advocate for non-violence'),
    ('PLUTO', 'Pluto',       'The Pluto outpost — destroyed by Red Hat forces, gateway to deep space'),
    ('VATCN', 'Vatican',     'Shadows Beneath the Vatican — religious forces reacting to cosmic discoveries')
ON CONFLICT (code) DO NOTHING;

-- NEGATIVE lore tags (15 new)
INSERT INTO item_lore_tags (code, display_name, narrative_context) VALUES
    ('PRSNR', 'Prisoner',    'The prison''s trapped souls — inmates who don''t know they''re incarcerated'),
    ('DMRGE', 'Demiurge',    'Yaldabaoth the demiurge — parasitic governor of the cosmic prison'),
    ('AUDIT', 'Audit',       'The System Audit — Yaldabaoth''s periodic maintenance sweep, destructive and cold'),
    ('DRKSD', 'Dark Side',   'Breach of the Dark Side — the Red Hats'' declaration of holy war'),
    ('FLLGD', 'Fallen God',  'Echoes of a Fallen God — aftermath of divine conflict, cosmic debris'),
    ('CRSHD', 'Crushed',     'The prison''s crushing weight — incomprehensible scale, existential pressure'),
    ('DREAD', 'Dread',       'Cosmic dread — the existential horror beneath the sardonic humor'),
    ('DCPTV', 'Deceptive',   'The prison''s fundamental deception — reality itself is a lie'),
    ('PYRTE', 'Pyrite',      'Golden Towers of Pyrite — the illusion of S Corp''s golden age cracking'),
    ('ABYSN', 'Abyss',       'The Maw of the Infernal Abyss — where dark forces first stirred'),
    ('SHDWS', 'Shadows',     'The Shadow Stirs — antagonistic cosmic presence making its first moves'),
    ('HNTNG', 'Haunting',    'The Haunting Veil Beckons — the boundary between realities thinning'),
    ('SCRTD', 'Scarlet',     'Dawn of the Scarlet Tide — Red Hat rebellion escalating to full war'),
    ('TRLRP', 'Trailer',     'Todd''s trailer park origins — where conspiracy became fanaticism'),
    ('BRCHD', 'Breached',    'Beyond the Firewall — humanity''s last defenses have been penetrated')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 7. EXPANDED ITEM SUFFIXES (15 → 60)
-- =============================================================================

-- POSITIVE suffixes (15 new = 30 total)
INSERT INTO item_suffixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('ENGNE', 'the Engine',          '{"strength": 3, "intelligence": 3}',              'The Eternal Engine — crystalline power source reverse-engineered from dreams'),
    ('INFRN', 'the Infinitron',      '{"intelligence": 5, "agility": 1}',               'The Infinitron CPU — quantum crystalline computing breakthrough'),
    ('STRGD', 'the Starguard',       '{"strength": 3, "agility": 3}',                   'Elysium Station defense force — protectors of humanity''s cosmic foothold'),
    ('SHPHR', 'the Shepherd',        '{"intelligence": 4, "agility": 2}',               'The Shepherd Initiative — divine council''s program to guide trapped souls'),
    ('ORACL', 'the Oracle',          '{"intelligence": 6}',                              'Lady A the Oracle of the Void — cosmic seer with burning eyes'),
    ('SCRET', 'Secrets',             '{"intelligence": 5, "agility": 1}',               'Lady Illkeserod, Goddess of Secrets — two fused souls, keeper of hidden knowledge'),
    ('SYMBL', 'Symbols',             '{"intelligence": 4, "strength": 2}',              'Madam Osilari, Madam of Symbols — robes of flowing equations'),
    ('CLNST', 'the Colonist',       '{"strength": 2, "agility": 2, "intelligence": 2}','Sorhhinda colonists — pioneers building civilization beyond Earth'),
    ('RPLCN', 'Replication',         '{"strength": 4, "agility": 2}',                   'Matter replication — atomic-level duplication of any material'),
    ('GRDNS', 'the Garden',          '{"intelligence": 3, "agility": 3}',               'The Gardener of Elysium — cultivating new civilization'),
    ('PRCNG', 'Piercing Light',      '{"strength": 2, "intelligence": 4}',              'Bringing the Darkness to Light — hidden truths about Etheris revealed'),
    ('TRNSC', 'Transcendence',       '{"strength": 2, "agility": 2, "intelligence": 3}','Ascending beyond the prison — total liberation from the construct'),
    ('UNBND', 'the Unbounded',       '{"strength": 2, "agility": 2, "intelligence": 2}','The Infinite Unbounded — S Corp technology reshaping global infrastructure'),
    ('GNSIS', 'Genesis',             '{"agility": 4, "intelligence": 2}',               'Aditi''s Genesis ship — edge-of-system deep space exploration'),
    ('SHLDS', 'the Shield',          '{"strength": 4, "agility": 2}',                   'S Corp personal energy shields — the end of conventional vulnerability')
ON CONFLICT (code) DO NOTHING;

-- NEUTRAL/MIXED suffixes (15 new)
INSERT INTO item_suffixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('DSTMN', 'the Distorted',      '{"strength": 3, "agility": -1, "intelligence": 2}', 'The Distorted Monarch — corrupted authority, power through distortion'),
    ('PNDRA', 'Pandora',             '{"intelligence": 4, "agility": -1}',                'Pandora''s Golden Fools — unleashing technology on an unprepared world'),
    ('SSPHM', 'Sisyphean Toil',     '{"strength": 4, "intelligence": -1}',               'The Sisyphean Job Hunt — mundane struggle while harboring cosmic knowledge'),
    ('MNKYS', 'the Monkey',          '{"agility": 4, "intelligence": -1}',                'Monkey-mind chaos — Stephen''s irreverent coping mechanism'),
    ('CRMBG', 'the Crumbling',      '{"strength": 3, "agility": -1}',                    'Cracks in the Monolith — S Corp''s empire showing internal fracture'),
    ('DSCVR', 'Discovery',           '{"intelligence": 3, "agility": 2, "strength": -1}','Liminal Discoveries — occupying the threshold between worlds'),
    ('DVLNC', 'Devil''s Dance',     '{"agility": 3, "intelligence": 2, "strength": -1}', 'Dancing with the Devil in the Pale Moonlight — confronting dark forces'),
    ('RFLCN', 'Reflection',          '{"intelligence": 3, "strength": -1}',              'Stardust Dreams and Earthbound Realities — cosmic vs human tension'),
    ('FRGTN', 'the Forgotten',       '{"strength": 2, "intelligence": 2, "agility": -1}','Chronicles of a Forgotten Ruler — lost history of power'),
    ('CHSIC', 'Chaos',               '{"strength": 2, "agility": 2, "intelligence": -1}','Mumbai''s Moonlit Mob — global unrest and resistance to change'),
    ('WKNGR', 'Waking',              '{"intelligence": 3, "agility": 1, "strength": -1}','Eyes Open, World Muted — the dissonance of seeing reality''s truth'),
    ('NVRSD', 'the Reversed',       '{"agility": 3, "strength": 2, "intelligence": -1}', 'Reverse-engineered cosmic technology — imperfect human interpretation'),
    ('SHTRD', 'the Shattered',      '{"strength": 3, "intelligence": 1, "agility": -1}', 'Shattered Dreams, Broken Metal — a major setback''s aftermath'),
    ('SHDWT', 'the Shadow',          '{"agility": 3, "intelligence": 1, "strength": -1}','The Shadow Stirs — antagonistic presence in the periphery'),
    ('TRDML', 'the Treadmill',      '{"strength": 2, "agility": 1, "intelligence": -1}', 'Stepping off the Treadmill — breaking free from corporate escalation')
ON CONFLICT (code) DO NOTHING;

-- NEGATIVE suffixes (15 new)
INSERT INTO item_suffixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('YLDBH', 'Yaldabaoth',         '{"strength": -2, "intelligence": -2}',               'The demiurge''s mark — cursed by the architect of the prison'),
    ('RDHAT', 'the Red Hat',         '{"intelligence": -3, "agility": -1}',               'Red Hat rebellion''s crude sabotage — fundamentalist anti-technology'),
    ('DCAYG', 'Decay',               '{"strength": -2, "agility": -1}',                  'Etheris substrate decay — the prison''s material degrading'),
    ('PRSNW', 'the Prison Wall',    '{"agility": -3, "strength": -1}',                    'The prison''s crushing walls — immovable cosmic architecture'),
    ('ABYSS', 'the Abyss',          '{"intelligence": -3, "strength": -1}',               'The Infernal Abyss — where comprehension fails and madness waits'),
    ('NLLTY', 'Nullity',             '{"strength": -1, "agility": -1, "intelligence": -2}','Zero-point void exposure — existence itself eroded'),
    ('FLGOD', 'the Fallen',         '{"intelligence": -2, "strength": -2}',               'Echoes of a Fallen God — divine power corrupted and spent'),
    ('BTRYL', 'Betrayal',            '{"agility": -2, "intelligence": -2}',               'Dr. On''s betrayal — sabotaged from within by a trusted colleague'),
    ('DRKNS', 'Darkness',            '{"intelligence": -3}',                              'Death Walking — confronting mortality and the void'),
    ('XTNCT', 'Extinction',          '{"strength": -2, "agility": -2}',                  'Species-level existential threat — the prison''s final solution'),
    ('CHOKD', 'the Choked',         '{"agility": -3}',                                    'Strangulation by bureaucracy and cosmic indifference'),
    ('CRCKD', 'the Cracked',        '{"strength": -1, "intelligence": -1, "agility": -1}','Fractures in everything — nothing is whole'),
    ('WSTLG', 'Wasteland',           '{"strength": -2, "intelligence": -1}',              'Post-Audit wasteland — scorched earth from Yaldabaoth''s maintenance'),
    ('HLSSN', 'Hopelessness',        '{"intelligence": -2, "agility": -1}',               'A Zero-Sum Digital Dystopia — the weight of a decaying world'),
    ('VDNSS', 'the Void''s Maw',   '{"strength": -1, "agility": -1, "intelligence": -2}','The void consuming — Lady A''s domain turned hostile')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 8. EXPANDED TYPE BASES (16 → 70+)
-- =============================================================================
-- 5+ item types per gear slot, weapons mapped to attack types

-- HEAD slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('HLMET', 'Tactical Helm',    '{"strength": [3, 10], "agility": [2, 7]}',      'S Corp tactical combat helmet — HUD display and structural protection'),
    ('VISOR', 'Neural Visor',     '{"intelligence": [4, 12], "agility": [2, 6]}',  'Infinitron neural interface visor — direct cognitive enhancement'),
    ('CROWN', 'Data Crown',       '{"intelligence": [5, 14], "strength": [1, 4]}', 'Akashic data processing crown — streams cosmic information'),
    ('HDGRD', 'Head Guard',       '{"strength": [4, 12], "agility": [1, 5]}',      'Heavy-duty cranial protection — Engineer class standard issue'),
    ('CIRCL', 'Circlet',          '{"intelligence": [3, 10], "agility": [3, 10]}', 'Conduit energy circlet — channels ambient Akashic fields')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'head'
ON CONFLICT (code) DO NOTHING;

-- NECK slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('AMULT', 'Amulet',          '{"intelligence": [4, 12], "strength": [1, 4]}',  'Akashic-infused amulet — pendant of concentrated cosmic energy'),
    ('CHAIN', 'Conduit Chain',   '{"intelligence": [3, 10], "agility": [2, 8]}',   'Energy conduit necklace — channels power from Akashic realm'),
    ('TORC',  'Nano Torc',       '{"strength": [3, 10], "agility": [2, 7]}',       'Nanite-threaded torque — self-repairing collar of microscopic machines'),
    ('PNDNT', 'Phase Pendant',   '{"agility": [4, 12], "intelligence": [1, 5]}',   'Drifter class phase-shifting pendant — flickers between states'),
    ('CHOKR', 'Data Choker',     '{"intelligence": [5, 14]}',                       'Neural data choker — direct spinal interface for Infinitron access')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'neck'
ON CONFLICT (code) DO NOTHING;

-- SHOULDERS slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('PLDNS', 'Pauldrons',       '{"strength": [4, 12], "agility": [2, 7]}',      'S Corp tactical shoulder plates — structural combat protection'),
    ('EMTMT', 'Emitter Mount',   '{"intelligence": [4, 12], "agility": [2, 6]}',  'Shoulder-mounted energy emitter array — Conduit class weapon platform'),
    ('MNTLC', 'Mantle',          '{"intelligence": [3, 10], "strength": [3, 10]}', 'Akashic energy mantle — draping shoulders in cosmic power'),
    ('SHRDS', 'Shard Guards',    '{"agility": [4, 12], "strength": [2, 6]}',      'Crystalline shard shoulder guards — Infinitron-adjacent material'),
    ('SPRDS', 'Spreaders',       '{"strength": [5, 14], "intelligence": [1, 4]}',  'Force-spreading shoulder harness — distributes impact across frame')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'shoulders'
ON CONFLICT (code) DO NOTHING;

-- HANDS slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('GLVSS', 'Haptic Gloves',   '{"agility": [4, 12], "intelligence": [2, 7]}',  'S Corp haptic interface gloves — precision touch and energy channeling'),
    ('GRIPS', 'Combat Grips',    '{"strength": [4, 12], "agility": [2, 6]}',      'Reinforced combat hand wraps — enhanced grip and impact absorption'),
    ('CNDGL', 'Conduit Gloves',  '{"intelligence": [5, 14], "strength": [1, 4]}', 'Akashic energy channeling gloves — Conduit class standard issue'),
    ('FNGRW', 'Finger Wraps',    '{"agility": [5, 14], "strength": [1, 4]}',      'Drifter class precision finger wraps — for delicate phase manipulation'),
    ('PWRFT', 'Power Fists',     '{"strength": [6, 16], "agility": [1, 4]}',      'Exoskeleton power fists — Engineer class melee enhancement')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'hands'
ON CONFLICT (code) DO NOTHING;

-- WRIST (L & R) items (5 shared types)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('BRCLT', 'Bracelet',        '{"intelligence": [3, 10], "agility": [2, 7]}',  'Akashic energy bracelet — ambient power collection'),
    ('DTBND', 'Data Band',       '{"intelligence": [4, 12], "agility": [1, 5]}',  'Infinitron data band — real-time information stream'),
    ('WRTGD', 'Wrist Guard',     '{"strength": [3, 10], "agility": [2, 8]}',      'S Corp tactical wrist guard — forearm protection and tool mount'),
    ('PHSBR', 'Phase Bracer',    '{"agility": [4, 12], "intelligence": [1, 5]}',  'Drifter phase-shift bracer — enhances Threshold Slip capability'),
    ('NNTSV', 'Nanite Sleeve',   '{"agility": [3, 10], "strength": [3, 10]}',     'Nanite swarm wrist sleeve — adaptive protective coating')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'wrist_1'
ON CONFLICT (code) DO NOTHING;

-- FINGER (L & R) items (5 shared types)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('SGLRG', 'Sigil Ring',      '{"intelligence": [4, 12]}',                      'Akashic sigil-carved ring — concentrated cosmic equation'),
    ('PLTBND','Plating Band',    '{"strength": [3, 10], "agility": [1, 5]}',       'S Corp armored finger band — reinforced with nanite alloy'),
    ('RSNRG', 'Resonance Ring',  '{"intelligence": [3, 10], "agility": [2, 7]}',   'Infinitron resonance frequency ring — tuned to cosmic harmonics'),
    ('PHSRG', 'Phase Ring',      '{"agility": [4, 12]}',                           'Drifter phase-shift ring — flickers between states of existence'),
    ('VDLOP', 'Void Loop',       '{"intelligence": [5, 14]}',                      'Lady A''s void-forged ring — zero-point energy encircled')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'finger_1'
ON CONFLICT (code) DO NOTHING;

-- LEGS slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('LGPLT', 'Leg Plates',      '{"strength": [4, 12], "agility": [3, 10]}',     'S Corp tactical leg plating — mobile defense'),
    ('DRFTL', 'Drift Leggings',  '{"agility": [5, 14], "intelligence": [1, 5]}',  'Drifter class phase-shift leggings — enhanced movement and evasion'),
    ('CNDTG', 'Conduit Tassets', '{"intelligence": [4, 12], "strength": [2, 7]}', 'Akashic conduit leg guards — channels energy through lower body'),
    ('EXSKL', 'Exo Leggings',   '{"strength": [5, 14], "agility": [2, 6]}',      'Exoskeleton leg components — Engineer class mobility enhancement'),
    ('THNKR', 'Think Pants',     '{"intelligence": [5, 14], "agility": [1, 4]}',  'Neural-threaded lower garment — extends cognitive processing to movement')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'legs'
ON CONFLICT (code) DO NOTHING;

-- FEET slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('BOOTS', 'Tactical Boots',  '{"agility": [4, 12], "strength": [2, 7]}',      'S Corp tactical combat boots — grip, stability, and protection'),
    ('HVRBT', 'Hover Boots',     '{"agility": [5, 14], "intelligence": [1, 5]}',  'Anti-gravity hover boots — ERB portal technology miniaturized'),
    ('STBLZ', 'Stabilizers',     '{"strength": [4, 12], "agility": [2, 7]}',      'Ground-contact stabilizer platforms — Engineer class standard'),
    ('PHSBT', 'Phase Boots',     '{"agility": [6, 16]}',                           'Drifter class phase-shift boots — step between realities'),
    ('GRVBT', 'Gravity Boots',   '{"strength": [3, 10], "agility": [3, 10]}',     'Graviton-enhanced boots — variable gravity compensation')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'feet'
ON CONFLICT (code) DO NOTHING;

-- OFF HAND slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('SHLD',  'Shield',          '{"strength": [4, 12], "agility": [2, 8]}',      'S Corp energy shield emitter — personal barrier defense'),
    ('FOCUS', 'Focus Orb',       '{"intelligence": [6, 16], "strength": [1, 4]}', 'Akashic focus orb — concentrates cosmic energy for channeling'),
    ('DGGR',  'Dagger',          '{"agility": [5, 14], "strength": [2, 6]}',      'Off-hand combat dagger — Drifter class dual-wield preference'),
    ('BCKLD', 'Buckler',         '{"strength": [3, 10], "agility": [3, 10]}',     'Compact tactical buckler — balanced defense and mobility'),
    ('TOMEV', 'Tome',            '{"intelligence": [7, 18]}',                      'Akashic knowledge tome — pages of pure cosmic information')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'off_hand'
ON CONFLICT (code) DO NOTHING;

-- BACK slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('CLOAK', 'Cloak',           '{"agility": [3, 10], "intelligence": [3, 10]}', 'Akashic stealth cloak — phase-shifting fabric for concealment'),
    ('JETPK', 'Jetpack',         '{"agility": [5, 14], "strength": [2, 6]}',      'S Corp personal propulsion unit — aerial mobility'),
    ('WINGS', 'Energy Wings',    '{"intelligence": [5, 14], "agility": [2, 6]}',  'Conduit energy wing projections — aesthetic and functional'),
    ('CAPE',  'Battle Cape',     '{"strength": [4, 12], "agility": [2, 7]}',      'Reinforced tactical cape — provides cover and intimidation'),
    ('DRPCK', 'Drift Pack',      '{"agility": [6, 16]}',                          'Drifter class Threshold traverse pack — between-state navigation')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'back'
ON CONFLICT (code) DO NOTHING;

-- WAIST slot items (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('BELT',  'Utility Belt',    '{"agility": [3, 10], "strength": [3, 10]}',     'S Corp multi-tool utility belt — pockets, holsters, and gadgets'),
    ('SASH',  'Energy Sash',     '{"intelligence": [4, 12], "agility": [2, 7]}',  'Akashic energy sash — flowing ribbon of cosmic power'),
    ('HRNS',  'Harness',         '{"strength": [5, 14], "agility": [1, 5]}',      'Heavy tactical harness — load-bearing support structure'),
    ('CRDBL', 'Cord Belt',       '{"agility": [4, 12], "intelligence": [2, 6]}',  'Phase-cord belt — Drifter class enhanced mobility'),
    ('CHRGR', 'Charger Belt',    '{"intelligence": [3, 10], "strength": [3, 10]}','Power cell charging belt — stores and releases energy on demand')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'waist'
ON CONFLICT (code) DO NOTHING;

-- Additional CHEST slot items (5 more, already have 5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('EXOST', 'Exosuit',         '{"strength": [6, 16], "agility": [2, 8]}',      'Full-torso exoskeleton — Engineer class combat enhancement'),
    ('ROBE',  'Akashic Robe',    '{"intelligence": [7, 18], "agility": [1, 5]}',  'Flowing robes of Akashic energy — Vessel class ceremonial and combat wear'),
    ('JCKET', 'Stealth Jacket',  '{"agility": [5, 14], "intelligence": [2, 7]}',  'Drifter class phase-woven jacket — appears ordinary, shifts between states'),
    ('VEST',  'Tactical Vest',   '{"strength": [4, 12], "agility": [3, 10]}',     'S Corp standard tactical vest — balanced protection and mobility'),
    ('HRNSS', 'Conduit Harness', '{"intelligence": [5, 14], "strength": [2, 7]}', 'Energy channeling chest harness — Conduit class power routing system')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'chest'
ON CONFLICT (code) DO NOTHING;

-- Additional MAIN HAND weapons (9 more, already have 6 = 15 total)
-- Ensuring 3+ per attack type category
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('HMMER', 'War Hammer',      '{"strength": [8, 20], "agility": [1, 4]}',       'Massive impact weapon — Engineer class heavy melee option'),
    ('BSTRW', 'Bow (Strand)',    '{"agility": [6, 16], "intelligence": [2, 6]}',   'Energy strand bow — fires condensed Akashic bolts at range'),
    ('RFLPZ', 'Plasma Rifle',   '{"strength": [5, 14], "agility": [3, 10]}',      'S Corp plasma rifle — medium-range thermal projectile weapon'),
    ('WHPNR', 'Phase Whip',     '{"agility": [7, 18], "intelligence": [1, 5]}',   'Drifter class phase-whip — extends through Threshold cracks'),
    ('ORBCN', 'Orb Conduit',    '{"intelligence": [8, 20], "agility": [1, 4]}',   'Floating conduit orb — autonomous energy projection device'),
    ('CLAWS', 'Nano Claws',     '{"strength": [5, 14], "agility": [4, 12]}',      'Retractable nanite claw array — both melee weapon and utility tool'),
    ('SCYTH', 'Resonance Scythe','{"intelligence": [5, 14], "strength": [4, 12]}','Resonance-frequency scythe — cuts through energy fields and matter'),
    ('TRWKF', 'Throwing Knives','{"agility": [6, 16], "strength": [2, 6]}',       'Nanite-guided throwing knives — seek targets after release'),
    ('LNCHR', 'Grenade Launcher','{"strength": [6, 16], "agility": [2, 6]}',      'S Corp area-effect launcher — explosive ordnance delivery')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'main_hand'
ON CONFLICT (code) DO NOTHING;

-- Additional TRINKET items (5 more, already have 5 = 10 total)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT v.code, v.display_name, gs.id, v.base_stat_range::jsonb, v.lore_reference
FROM gear_slots gs, (VALUES
    ('RELIC', 'Relic',           '{"strength": [2, 8], "intelligence": [3, 10]}',  'Pre-prison cosmic artifact — ancient power in compact form'),
    ('TOTEN', 'Totem',          '{"intelligence": [4, 12], "strength": [1, 5]}',   'Carved symbolic totem — Madam Osilari''s equation-bearing artifact'),
    ('CHARM', 'Charm',          '{"agility": [3, 10], "intelligence": [2, 8]}',    'Akashic good-luck charm — probability-warping trinket'),
    ('BADGE', 'Badge',          '{"strength": [3, 10], "agility": [2, 7]}',        'S Corp identification badge — surprisingly effective energy conduit'),
    ('PHYLC', 'Phylactery',     '{"intelligence": [5, 14]}',                       'Soul container — stores a fragment of cosmic entity essence')
) AS v(code, display_name, base_stat_range, lore_reference)
WHERE gs.name = 'trinket'
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 9. WEAPON → ATTACK TYPE MAPPINGS
-- =============================================================================

-- Melee weapons: Blade, Gauntlet, War Hammer, Nano Claws, Resonance Scythe
INSERT INTO type_base_attack_types (type_base_id, attack_type_id)
SELECT tb.id, at.id FROM item_type_bases tb, attack_types at
WHERE (tb.code, at.name) IN (
    ('BLADE', 'melee'), ('GNTLT', 'melee'), ('HMMER', 'melee'), ('CLAWS', 'melee'), ('SCYTH', 'melee'),
    ('CLAWS', 'nanite'),  -- Nano Claws also nanite
    ('SCYTH', 'resonance')  -- Resonance Scythe also resonance
)
ON CONFLICT (type_base_id, attack_type_id) DO NOTHING;

-- Ranged weapons: Pulse Cannon, Plasma Rifle, Bow (Strand), Throwing Knives, Grenade Launcher
INSERT INTO type_base_attack_types (type_base_id, attack_type_id)
SELECT tb.id, at.id FROM item_type_bases tb, attack_types at
WHERE (tb.code, at.name) IN (
    ('PLSCN', 'ranged'), ('RFLPZ', 'ranged'), ('BSTRW', 'ranged'), ('TRWKF', 'ranged'), ('LNCHR', 'ranged'),
    ('PLSCN', 'thermal'),  -- Pulse Cannon also thermal
    ('RFLPZ', 'thermal'),  -- Plasma Rifle also thermal
    ('BSTRW', 'akashic')   -- Bow also akashic
)
ON CONFLICT (type_base_id, attack_type_id) DO NOTHING;

-- Akashic weapons: Emitter, Staff, Orb Conduit, Resonance Fork
INSERT INTO type_base_attack_types (type_base_id, attack_type_id)
SELECT tb.id, at.id FROM item_type_bases tb, attack_types at
WHERE (tb.code, at.name) IN (
    ('EMITR', 'akashic'), ('STAFF', 'akashic'), ('ORBCN', 'akashic'), ('RSNFK', 'akashic'),
    ('RSNFK', 'resonance'),  -- Resonance Fork also resonance
    ('EMITR', 'ranged')      -- Emitter also ranged
)
ON CONFLICT (type_base_id, attack_type_id) DO NOTHING;

-- Phase weapons: Phase Whip
INSERT INTO type_base_attack_types (type_base_id, attack_type_id)
SELECT tb.id, at.id FROM item_type_bases tb, attack_types at
WHERE (tb.code, at.name) IN (
    ('WHPNR', 'phase'), ('WHPNR', 'melee')
)
ON CONFLICT (type_base_id, attack_type_id) DO NOTHING;

-- Multi-attack-type weapon: Gauntlet (melee + construct)
INSERT INTO type_base_attack_types (type_base_id, attack_type_id)
SELECT tb.id, at.id FROM item_type_bases tb, attack_types at
WHERE (tb.code, at.name) IN (
    ('GNTLT', 'construct')
)
ON CONFLICT (type_base_id, attack_type_id) DO NOTHING;

-- =============================================================================
-- 10. ENTITY ATTACK TYPE ASSIGNMENTS
-- =============================================================================
-- Assign attack types to existing entities based on entity_type

-- Regular entities: 1 attack type each (lore-appropriate)
-- Miniboss entities: 2+ attack types
-- Big boss entities: 3+ attack types

-- First, assign default melee to all entities that are 'character' or 'creature' type
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, TRUE
FROM entities e, attack_types at
WHERE e.entity_type IN ('creature', 'antagonist', 'miniboss')
AND at.name = 'melee'
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Assign construct to entities with 'construct' in description
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, FALSE
FROM entities e, attack_types at
WHERE at.name = 'construct'
AND e.entity_type = 'construct'
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id AND eat.attack_type_id = at.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Assign akashic to entities that are 'cosmic' or 'divine' type
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, TRUE
FROM entities e, attack_types at
WHERE at.name = 'akashic'
AND e.entity_type IN ('cosmic', 'divine', 'boss')
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id AND eat.attack_type_id = at.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Give bosses additional attack types (corruption + their primary)
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, FALSE
FROM entities e, attack_types at
WHERE at.name = 'corruption'
AND e.entity_type = 'boss'
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id AND eat.attack_type_id = at.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Give bosses void attack type
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, FALSE
FROM entities e, attack_types at
WHERE at.name = 'void'
AND e.entity_type = 'boss'
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id AND eat.attack_type_id = at.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Give miniboss entities a secondary attack type (ranged)
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT e.id, at.id, FALSE
FROM entities e, attack_types at
WHERE at.name = 'ranged'
AND e.entity_type = 'miniboss'
AND NOT EXISTS (SELECT 1 FROM entity_attack_types eat WHERE eat.entity_id = e.id AND eat.attack_type_id = at.id)
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- =============================================================================
-- 11. UPDATE GAME CONFIGS: Expanded Gear Slot Weights
-- =============================================================================

UPDATE game_configs SET value_json = '{
    "main_hand": 20, "off_hand": 10,
    "head": 8, "chest": 10, "shoulders": 6, "hands": 6, "legs": 8, "feet": 6,
    "neck": 4, "wrist_1": 3, "wrist_2": 3, "finger_1": 3, "finger_2": 3,
    "back": 4, "waist": 3, "trinket": 3
}'
WHERE key = 'gear_slot_weights_combat';

UPDATE game_configs SET value_json = '{
    "main_hand": 10, "off_hand": 8,
    "head": 8, "chest": 8, "shoulders": 6, "hands": 6, "legs": 6, "feet": 6,
    "neck": 6, "wrist_1": 4, "wrist_2": 4, "finger_1": 5, "finger_2": 5,
    "back": 6, "waist": 4, "trinket": 8
}'
WHERE key = 'gear_slot_weights_narrative';

COMMIT;
