-- Migration 025: Skill Action Seed Data
-- Seeds all sub-actions for the 4 initial idle training skills and sets their unlock gates.

-- 1. Update Skills: Flavor Titles and Unlock Text
-- Attack: Available from start
UPDATE skills SET
    unlock_scene_id     = NULL,
    unlock_display_text = NULL,
    idle_flavor_title   = 'COMBAT PROTOCOL'
WHERE name = 'Attack';

-- Magic: Unlocks after first dreamwalking scene
UPDATE skills SET
    unlock_scene_id     = 714,  -- 6: Beyond the Conduits □ Chapter Boss
    unlock_display_text = 'Complete the first Dreamwalking story scene',
    idle_flavor_title   = 'DREAMWALKING'
WHERE name = 'Magic';

-- Lore: Unlocks after Eternal Engine discovery scene
UPDATE skills SET
    unlock_scene_id     = 606,  -- 7: Grease Stains and Eternal Engines □ Chapter Boss
    unlock_display_text = 'Discover the Eternal Engine in the Dreamscape',
    idle_flavor_title   = 'AKASHIC RESEARCH'
WHERE name = 'Lore';

-- Precision: Unlocks after Infinitron Breakthrough scene
UPDATE skills SET
    unlock_scene_id     = 699,  -- 519: The Infinitron Breakthrough □ Chapter Boss
    unlock_display_text = 'Witness the Infinitron Breakthrough',
    idle_flavor_title   = 'CALIBRATION'
WHERE name = 'Precision';

-- 2. Seed: Attack Skill Actions
INSERT INTO skill_actions
    (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT
    s.id,
    v.name,
    v.display_name,
    v.lore_description,
    v.level_required,
    v.interval_ms,
    v.xp_per_action,
    v.sort_order
FROM skills s,
(VALUES
    ('shadowboxing_garage',
     'Shadowboxing in the Garage',
     'Stephen trains alone in his Florida garage — the same space where he reverses-engineers the Eternal Engine. A man preparing for a war he does not yet understand.',
     1, 3000, 10, 1),

    ('scorp_security_drills',
     'S Corp Security Drills',
     'Training alongside Patrick''s security team in S Corp''s Houston HQ. Corporate bodyguard routines that feel increasingly inadequate as the threats escalate beyond anything in the briefings.',
     10, 4000, 18, 2),

    ('mom_combat_simulations',
     'Combat Simulations at MOM',
     'High-tech training at Morgan''s Antarctic R&D facility. Simulation pods model everything from insurgent brigades to entities that appear in no official enemy database.',
     22, 5500, 32, 3),

    ('red_hat_brigade_fighting',
     'Fighting Red Hat Brigades',
     'Direct engagement with Todd''s fundamentalist terror network. Street-level, brutal, and deeply personal — the enemy genuinely believes what they are doing is holy.',
     36, 7500, 58, 4),

    ('elysium_combat_training',
     'Elysium Station Combat Training',
     'In the exercise decks of S Corp''s space station beyond Earth''s gravity. Equipment that bends light; opponents who train like they''re being watched by something worse than management.',
     50, 10000, 90, 5),

    ('kuiper_belt_firefight',
     'Kuiper Belt Firefight Simulations',
     'Recreating the zero-gravity engagement from Aditi and Hiro''s Genesis mission at the edge of the solar system. Two students went in. One came back.',
     65, 13000, 140, 6),

    ('dreamscape_combat_conditioning',
     'Dreamscape Combat Conditioning',
     'Fighting in the dreamscape itself. Opponents here are not flesh — they are constructs, probability manifolds, the prison''s own immune system given violent form.',
     80, 17000, 205, 7),

    ('audit_construct_engagement',
     'Engaging the Audit''s Constructs',
     'Direct combat against the entities the prison deploys to neutralize awareness threats. Patrick''s replacement is in here somewhere. So is yours, waiting.',
     92, 22000, 295, 8)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Attack'
ON CONFLICT (skill_id, name) DO NOTHING;

-- 3. Seed: Magic Skill Actions
INSERT INTO skill_actions
    (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT
    s.id,
    v.name,
    v.display_name,
    v.lore_description,
    v.level_required,
    v.interval_ms,
    v.xp_per_action,
    v.sort_order
FROM skills s,
(VALUES
    ('lucid_dreaming_practice',
     'Lucid Dreaming Practice',
     'Entering sleep with the mind lit. The first step. A glimpse of the Threshold — a hallway that should not be there — and then nothing. Repeat until the glimpse holds.',
     1, 3000, 10, 1),

    ('threshold_navigation',
     'Threshold Navigation',
     'Learning to move through the liminal space between waking and dreaming. The energy conduits are visible now — massive, thrumming, plugged into something just out of sight.',
     10, 4000, 18, 2),

    ('channeling_the_conduits',
     'Channeling the Conduits',
     'Making contact with the dreamscape''s architecture. The conduits run through everything. Stephen spends weeks just listening to them before Lady A notices him.',
     22, 5500, 32, 3),

    ('studying_eternal_engine',
     'Studying the Eternal Engine',
     'Long sessions with the crystalline construct that appeared in Stephen''s deepest dreams. It hums at a frequency that rearranges how you think about energy.',
     35, 7500, 58, 4),

    ('lady_a_oneiromancy_lessons',
     'Lady A''s Oneiromancy Lessons',
     'Formal training with Lady Astrael, Oracle of the Void. Burning eyes. No patience for imprecision. She calls you Aspolin and expects you to live up to it.',
     48, 10000, 90, 5),

    ('quantum_field_harmonization',
     'Quantum Field Harmonization',
     'Applying the Infinitron''s quantum framework to active energy projection. S Corp''s physics department considers this impossible. You have stopped consulting them.',
     62, 13500, 145, 6),

    ('akashic_realm_meditation',
     'Akashic Realm Meditation',
     'Extended sessions in the cosmic library — a space that exists outside the prison''s update cycles. The index alone is longer than your entire life, twice over.',
     76, 17500, 215, 7),

    ('communing_lady_illkeserod',
     'Communing with Lady Illkeserod',
     'Deep sessions with the Goddess of Secrets — two fused souls woven from translucent filaments of thought. She does not give you answers. She gives you better questions.',
     87, 20000, 270, 8),

    ('madam_osilari_symbol_weaving',
     'Madam Osilari''s Symbol Weaving',
     'The Madam of Symbols'' robes are equations in motion. You are learning to read the prison''s source code. The symbols do not stop when you close your eyes anymore.',
     95, 24000, 355, 9)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Magic'
ON CONFLICT (skill_id, name) DO NOTHING;

-- 4. Seed: Lore Skill Actions
INSERT INTO skill_actions
    (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT
    s.id,
    v.name,
    v.display_name,
    v.lore_description,
    v.level_required,
    v.interval_ms,
    v.xp_per_action,
    v.sort_order
FROM skills s,
(VALUES
    ('researching_the_pointers',
     'Researching the Pointers',
     'The Pointers appeared simultaneously worldwide. Every government has a file. Every file says nothing useful. You build your own theory from scratch using nothing but pattern and noise.',
     1, 3000, 10, 1),

    ('scorp_research_archives',
     'S Corp Research Archives',
     'Accessing S Corp''s classified repository: anomalous events, impossible sightings, data that does not fit any existing model. Pattern recognition at a planetary scale.',
     12, 4200, 22, 2),

    ('infinitron_schematics_study',
     'Studying the Infinitron Schematics',
     'The crystalline architecture of S Corp''s breakthrough CPU contains more information than it should. Reverse-engineering the reverse-engineering.',
     24, 5800, 38, 3),

    ('decoding_etheris_architecture',
     'Decoding Etheris Architecture',
     'Piecing together how the prison was built — its layers, update cycles, maintenance routines. Jennifer''s Journal confirms what Lady A implied: this place has a runtime.',
     38, 8000, 68, 4),

    ('jennifers_journal_analysis',
     'Jennifer''s Journal Analysis',
     'Whitney''s artifact shifts as you study it. Sections appear that were not there yesterday. The journal parcels out truth as the reader becomes ready to receive it.',
     52, 11000, 108, 5),

    ('gnostic_cosmology_deep_dive',
     'Gnostic Cosmology Deep Dive',
     'Yaldabaoth. The Pleroma. The Archons. Ancient texts that were not mythology — they were documentation. Someone knew. Someone wrote it down in the only framework available to them.',
     65, 14500, 160, 6),

    ('translating_akashic_index',
     'Translating the Akashic Index',
     'The cosmic library''s index is encoded in pre-linguistic patterns that Stephen''s brain processes as felt knowledge rather than words. Slow work. Occasionally terrifying.',
     78, 18500, 230, 7),

    ('deciphering_madam_o_symbols',
     'Deciphering Madam O''s Symbols',
     'The Madam of Symbols'' equations do not resolve in any standard mathematics. They describe probability densities for events that have not happened yet — and some that already have.',
     88, 22000, 305, 8),

    ('shepherd_initiative_records',
     'Reviewing Shepherd Initiative Records',
     'The divine council''s briefing materials for the re-entry program. Benji annotated them in the margins. His annotations are more useful than the official documents themselves.',
     95, 26000, 400, 9)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Lore'
ON CONFLICT (skill_id, name) DO NOTHING;

-- 5. Seed: Precision Skill Actions
INSERT INTO skill_actions
    (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT
    s.id,
    v.name,
    v.display_name,
    v.lore_description,
    v.level_required,
    v.interval_ms,
    v.xp_per_action,
    v.sort_order
FROM skills s,
(VALUES
    ('calibrating_the_infinitron',
     'Calibrating the Infinitron',
     'The crystalline CPU requires constant fine-tuning at the quantum level. S Corp''s physicists cannot do it — the resonance has to be felt, not measured.',
     1, 3000, 10, 1),

    ('erb_portal_alignment',
     'ERB Portal Alignment',
     'Einstein-Rosen Bridge portal targeting. A 0.001% deviation does not mean you miss the destination — it means you never leave the bridge.',
     12, 4200, 22, 2),

    ('nanite_targeting_systems',
     'Nanite Targeting Systems',
     'Programming S Corp''s nanite swarms for surgical intervention. They operate at the Angstrom scale. You give them a target and they make it not exist anymore.',
     26, 6200, 42, 3),

    ('algorithmic_heist_planning',
     'Algorithmic Heist Planning',
     'Covert operations require perfect timing. The Algorithmic Heist chapter was a masterclass in what happens when one variable is miscalculated by a single person.',
     40, 8500, 72, 4),

    ('genesis_ship_systems',
     'Genesis Ship Systems Mastery',
     'Operating the precision navigation instruments aboard Aditi''s Genesis in deep space. In the Kuiper Belt, there is no margin for error. Aditi knew this. So did Hiro.',
     54, 11500, 115, 5),

    ('red_hat_signal_decryption',
     'Red Hat Signal Decryption',
     'Aditi discovered the Red Hats used shortwave radio — a frequency S Corp had overlooked for years. Precision finds what brute force misses. Every frequency tells a story.',
     68, 15000, 175, 6),

    ('yaldabaoth_substrate_tracking',
     'Tracking Yaldabaoth''s Substrate Pulse',
     'The prison emits detectable interference when the demiurge moves through the Substrate. You have learned to read the patterns. The timing has to be exact or the signal collapses.',
     82, 19500, 250, 7),

    ('aspolin_strike_calibration',
     'Aspolin''s Strike Calibration',
     'The divine name carries power, but power without precision is noise. Learning to make every action count — not more force, but perfect direction.',
     93, 24000, 330, 8)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Precision'
ON CONFLICT (skill_id, name) DO NOTHING;
