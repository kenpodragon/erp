-- Migration 035: Dream Item System Seed Data (2.4.2)

-- Gear Slots
INSERT INTO gear_slots (name, display_name, description, sort_order) VALUES
    ('weapon',  'Weapon',  'Offensive hand-held equipment. Primarily boosts Strength and Agility.', 1),
    ('armor',   'Armor',   'Defensive body equipment. Primarily boosts Agility and Strength.',      2),
    ('trinket', 'Trinket', 'Passive enhancement accessories. Primarily boost Intelligence.',        3)
ON CONFLICT (name) DO NOTHING;

-- Item Prefixes (15 rows)
INSERT INTO item_prefixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('SOLR', 'Solar',      '{"strength": 2, "agility": 1}',       'Elysium Station solar arrays — intense focused energy'),
    ('VOID', 'Void',       '{"intelligence": 4}',                  'Lady Astrael''s void domain — pure cosmic nullification'),
    ('QNTM', 'Quantum',    '{"agility": 2, "intelligence": 2}',   'Infinitron quantum CPU — superposition of precision'),
    ('ELYS', 'Elysian',    '{"strength": 1, "agility": 1, "intelligence": 1}', 'Elysium itself — the cosmic prison structure'),
    ('NMTE', 'Nanite',     '{"agility": 3}',                       'S Corp nanite swarms operating at the Angstrom scale'),
    ('SPEC', 'Spectral',   '{"intelligence": 3}',                  'Dreamscape spectral energy constructs'),
    ('TMPL', 'Temporal',   '{"agility": 2, "intelligence": 1}',   'Time distortion fields near Einstein-Rosen Bridge portals'),
    ('CRPT', 'Corrupted',  '{"strength": 4}',                      'Entities corrupted by the prison''s runtime maintenance'),
    ('PRMT', 'Prismatic',  '{"strength": 1, "agility": 1, "intelligence": 2}', 'Akashic Index prismatic light encoding'),
    ('FRCT', 'Fractured',  '{"strength": 3, "agility": 1}',       'Post-Audit fractured construct remnants'),
    ('ANCT', 'Ancient',    '{"intelligence": 3, "strength": 1}',   'Pre-prison cosmic entities — predating the current runtime'),
    ('RESN', 'Resonant',   '{"intelligence": 2, "agility": 2}',   'Infinitron resonance frequency — the felt calibration'),
    ('ECHO', 'Echo',       '{"intelligence": 3, "agility": 1}',   'Dreamscape echo patterns from prior iterations'),
    ('PHAS', 'Phase',      '{"agility": 4}',                       'Phase-state traversal between Threshold layers'),
    ('DARK', 'Dark',       '{"strength": 3, "intelligence": 1}',   'The Audit''s shadow construct energy signature')
ON CONFLICT (code) DO NOTHING;

-- Item Qualities (10 rows)
INSERT INTO item_qualities (code, display_name, lore_reference) VALUES
    ('ELDR', 'Elder',       'Elder gods and the Thirteen Ascended — immeasurable age'),
    ('PRTO', 'Proto',       'Early S Corp prototypes — first-generation experimental'),
    ('CLBR', 'Calibrated',  'Engineer Precision calibration — exact to quantum tolerance'),
    ('STBL', 'Stabilized',  'Stabilized Threshold transit — energy held in fixed state'),
    ('PHZL', 'Phase-Locked','Phase-locked quantum states near ERB portals'),
    ('CNTD', 'Concentrated','Concentrated Akashic energy — distilled cosmic essence'),
    ('HPRD', 'Hyper-Dense', 'Hyper-dense energy conduit nodes — impossible compression'),
    ('CRYS', 'Crystalline', 'Crystalline Infinitron architecture — structured at the atomic level'),
    ('PRIM', 'Primal',      'Primal entities that predate the prison runtime itself'),
    ('FRMD', 'Formed',      'Freshly formed constructs — recent prison generation')
ON CONFLICT (code) DO NOTHING;

-- Item Lore Tags (15 rows)
INSERT INTO item_lore_tags (code, display_name, narrative_context) VALUES
    ('INFTR', 'Infinitron',  'S Corp''s quantum CPU breakthrough — the crystalline resonance engine'),
    ('THRSH', 'Threshold',   'The liminal dreamscape transit space between waking and the Akashic realm'),
    ('DRMS',  'Dreamscape',  'The Akashic dream realm — the cognitive layer of the prison'),
    ('ETHRS', 'Etheris',     'The cosmic Etheris architecture — the prison''s outer shell'),
    ('AKSIC', 'Akashic',     'The Akashic Index — the cosmic library existing outside update cycles'),
    ('SBSTR', 'Substrate',   'The prison''s physical substrate — where Yaldabaoth moves and maintains'),
    ('CNDUT', 'Conduit',     'The energy conduits Lady A channels — massive, thrumming, cosmic'),
    ('SHPRD', 'Shepherd',    'The Shepherd Initiative — the divine council''s re-entry program'),
    ('PNTR',  'Pointer',     'The global Pointer phenomenon — simultaneous worldwide appearance'),
    ('ASPLN', 'Aspolin',     'Stephen''s divine name — the identity he carries into the Akashic realm'),
    ('RDHTT', 'Red Hat',     'Todd''s Red Hat Brigade — fundamentalist terror constructs'),
    ('GNESS', 'Genesis',     'Aditi and Hiro''s deep-space Genesis ship — edge of the solar system'),
    ('MRGN',  'Morgan',      'Morgan''s Antarctic R&D facility (MOM) — simulation and training'),
    ('LADYA', 'Lady A',      'Lady Astrael, Oracle of the Void — burning eyes, no patience for imprecision'),
    ('YLDBT', 'Yaldabaoth',  'The demiurge — governor and architect of the cosmic prison')
ON CONFLICT (code) DO NOTHING;

-- Item Type Bases: Weapons (6)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'BLADE', 'Blade', gs.id, '{"strength": [5, 15], "agility": [2, 8]}', 'Close-quarters cutting weapon — derived from S Corp tactical equipment'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'EMITR', 'Emitter', gs.id, '{"intelligence": [6, 16], "agility": [2, 6]}', 'Energy projection device — based on Infinitron resonance emitter technology'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'GNTLT', 'Gauntlet', gs.id, '{"strength": [7, 18], "agility": [1, 5]}', 'Power-amplifying hand armor — based on S Corp combat exoskeleton components'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'STAFF', 'Staff', gs.id, '{"intelligence": [8, 20], "strength": [1, 5]}', 'Channeling focus — derived from Akashic symbol-weaving instruments'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'RSNFK', 'Resonance Fork', gs.id, '{"intelligence": [5, 12], "agility": [3, 10]}', 'Precision tuning instrument — adapted from Infinitron calibration tools'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'PLSCN', 'Pulse Cannon', gs.id, '{"strength": [4, 12], "intelligence": [4, 12]}', 'Heavy energy weapon — based on Elysium Station defense systems'
FROM gear_slots gs WHERE gs.name = 'weapon' ON CONFLICT (code) DO NOTHING;

-- Item Type Bases: Armor (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'SHLDG', 'Shielding', gs.id, '{"agility": [3, 10], "strength": [3, 10]}', 'Energy shielding layer — derived from Engineer class barrier technology'
FROM gear_slots gs WHERE gs.name = 'armor' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'CNDWV', 'Conduit Weave', gs.id, '{"intelligence": [5, 14], "agility": [2, 7]}', 'Energy-channeling fabric — woven from Akashic conduit filaments'
FROM gear_slots gs WHERE gs.name = 'armor' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'NMPLT', 'Nanite Plating', gs.id, '{"strength": [4, 12], "agility": [4, 12]}', 'Self-repairing nanite armor — S Corp nanite swarm application'
FROM gear_slots gs WHERE gs.name = 'armor' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'DRFTC', 'Drift Cloak', gs.id, '{"agility": [7, 18], "intelligence": [1, 5]}', 'Phase-shifting stealth garment — based on Drifter class Threshold Slip technology'
FROM gear_slots gs WHERE gs.name = 'armor' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'BRLTT', 'Barrier Lattice', gs.id, '{"strength": [6, 16], "intelligence": [2, 8]}', 'Crystalline defensive lattice — based on Etheris structural architecture'
FROM gear_slots gs WHERE gs.name = 'armor' ON CONFLICT (code) DO NOTHING;

-- Item Type Bases: Trinkets (5)
INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'CRYST', 'Crystal', gs.id, '{"intelligence": [4, 12]}', 'Resonant crystalline focus — fragment of Infinitron-adjacent material'
FROM gear_slots gs WHERE gs.name = 'trinket' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'MODLT', 'Module', gs.id, '{"agility": [3, 10], "intelligence": [2, 7]}', 'Compact S Corp tech module — extracted from systems design blueprints'
FROM gear_slots gs WHERE gs.name = 'trinket' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'FRAGM', 'Fragment', gs.id, '{"strength": [2, 8], "agility": [2, 8]}', 'Akashic energy fragment — broken-off piece of larger cosmic structure'
FROM gear_slots gs WHERE gs.name = 'trinket' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'SIGIL', 'Sigil', gs.id, '{"intelligence": [5, 14]}', 'Madam Osilari''s symbol-carved token — carries encoded probability equations'
FROM gear_slots gs WHERE gs.name = 'trinket' ON CONFLICT (code) DO NOTHING;

INSERT INTO item_type_bases (code, display_name, gear_slot_id, base_stat_range, lore_reference)
SELECT 'OPTIC', 'Lens', gs.id, '{"agility": [4, 12], "strength": [1, 5]}', 'Precision optical component — derived from Red Hat signal decryption instruments'
FROM gear_slots gs WHERE gs.name = 'trinket' ON CONFLICT (code) DO NOTHING;

-- Item Suffixes (15 rows)
INSERT INTO item_suffixes (code, display_name, stat_bonuses, lore_reference) VALUES
    ('ASCND', 'the Ascendant',       '{"strength": 2, "agility": 2, "intelligence": 2}', 'Ascending beyond the prison — transcending its runtime constraints'),
    ('VSSEL', 'the Vessel',          '{"intelligence": 5}',                               'Vessel class — divine channel of the Thirteen Ascended'),
    ('CNSTR', 'the Construct',       '{"strength": 4}',                                   'Prison-deployed construct entities — automated immune response'),
    ('FRSKY', 'the First Key',       '{"intelligence": 4, "agility": 1}',                 'The Eternal Engine as the first key — reverse-engineered in Florida'),
    ('ACCRD', 'the Accord',          '{"strength": 1, "agility": 1, "intelligence": 3}',  'The Elysian Accord — agreement between the divine council and the waking'),
    ('THRSL', 'the Threshold',       '{"agility": 4, "intelligence": 1}',                 'Threshold transit mechanics — the liminal space between states'),
    ('DRKRT', 'the Dark Ritual',     '{"intelligence": 5, "strength": 1}',                'The Dark Ritual hotbar skill — chapter-wide persistent multiplier'),
    ('VOIDT', 'the Void',            '{"intelligence": 5}',                               'Lady A''s void domain — zero-point Akashic energy'),
    ('ETRNL', 'Eternal Purpose',     '{"strength": 2, "agility": 2, "intelligence": 2}',  'S Corp''s stated mission — the Eternal Engine as humanity''s purpose'),
    ('PRSON', 'the Prison',          '{"strength": 5}',                                   'The cosmic prison structure — incomprehensible scale, crushing weight'),
    ('DRMWK', 'the Dreamwalker',     '{"intelligence": 3, "agility": 2}',                 'Dreamwalking ability — conscious traversal of the Akashic realm'),
    ('SLNCE', 'Silence',             '{"agility": 5}',                                    'Memory Blur / Drifter invisibility — moving outside the system''s awareness'),
    ('RECRS', 'Recursion',           '{"strength": 2, "agility": 2, "intelligence": 2}',  'NG+ recursive loops — re-entering the prison with full memory intact'),
    ('SHPDI', 'the Shepherd''s Eye', '{"intelligence": 4, "agility": 1}',                 'The Shepherd Initiative — divine council''s observation methodology'),
    ('LADYA', 'Lady A''s Blessing',  '{"intelligence": 6}',                               'Lady Astrael''s direct favor — rare and demanding')
ON CONFLICT (code) DO NOTHING;

-- Game Configs: Run Achievement Configuration
INSERT INTO game_configs (key, value_json, description, category, game_impact)
VALUES ('run_achievement_config', '{
  "achievements": [
    {"id": "speed_completion", "display": "Swift Passage", "description": "Complete the scene run in under N minutes", "threshold_type": "completion_time_seconds", "threshold_value": 300, "drop_chance_pct": 15},
    {"id": "enemy_slayer", "display": "Enemy Slayer", "description": "Defeat N or more enemies in a single run", "threshold_type": "enemies_killed", "threshold_value": 100, "drop_chance_pct": 10},
    {"id": "wave_climber", "display": "Wave Climber", "description": "Reach wave N or higher", "threshold_type": "max_wave_reached", "threshold_value": 50, "drop_chance_pct": 12},
    {"id": "perfect_run", "display": "Flawless Execution", "description": "Complete the run without dying", "threshold_type": "death_count", "threshold_value": 0, "drop_chance_pct": 20},
    {"id": "boss_slayer", "display": "Boss Slayer", "description": "Defeat the scene boss", "threshold_type": "boss_killed", "threshold_value": 1, "drop_chance_pct": 25},
    {"id": "personal_best", "display": "High Tide", "description": "Reach a personal best wave for this scene", "threshold_type": "personal_best_wave", "threshold_value": 1, "drop_chance_pct": 8}
  ]
}', 'Run achievement configuration for dream item drops', 'drops', 'Determines which achievements trigger item drops and their probabilities')
ON CONFLICT (key) DO NOTHING;

-- Game Configs: Rarity Weights by Book
INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
('rarity_weight_book_1', '{"common": 60, "uncommon": 25, "rare": 10, "epic": 4, "cosmic": 1}', 'Rarity weights for Book 1 dream items', 'drops', 'Controls item rarity distribution in Book 1'),
('rarity_weight_book_2', '{"common": 50, "uncommon": 27, "rare": 14, "epic": 7, "cosmic": 2}', 'Rarity weights for Book 2 dream items', 'drops', 'Controls item rarity distribution in Book 2'),
('rarity_weight_book_3', '{"common": 40, "uncommon": 28, "rare": 18, "epic": 10, "cosmic": 4}', 'Rarity weights for Book 3 dream items', 'drops', 'Controls item rarity distribution in Book 3')
ON CONFLICT (key) DO NOTHING;

-- Game Configs: Gear Slot Weights by Scene Type
INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
('gear_slot_weights_combat', '{"weapon": 50, "armor": 30, "trinket": 20}', 'Gear slot weights for combat scenes', 'drops', 'Controls which gear slot drops in combat scenes'),
('gear_slot_weights_narrative', '{"weapon": 30, "armor": 30, "trinket": 40}', 'Gear slot weights for narrative scenes', 'drops', 'Controls which gear slot drops in narrative scenes')
ON CONFLICT (key) DO NOTHING;
