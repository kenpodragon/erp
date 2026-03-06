-- Migration 033: Skill Prerequisites & Class Skills Seed Data (2.4.1)
-- Seeds: skill level_0_xp_requirement, skill_prerequisites for 9 universal skills,
--         4 class-exclusive skills + their prerequisites, 13 idle training actions
-- ============================================================================

-- ============================================================================
-- §5.1 Set level_0_xp_requirement for idle skills
-- ============================================================================

UPDATE skills SET level_0_xp_requirement = 0 WHERE name = 'Attack';
UPDATE skills SET level_0_xp_requirement = 1200 WHERE name IN ('Magic', 'Lore', 'Precision');

-- ============================================================================
-- §5.2 Seed skill_prerequisites for all 9 universal hotbar skills
-- ============================================================================

-- Clickstorm: Attack(idle) >= 10
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 10, 'Requires Attack Level 10'
FROM skills hs, skills is_
WHERE hs.name = 'Clickstorm' AND is_.name = 'Attack';

-- Powersurge: Magic(idle) >= 10, Clickstorm(active) >= 1
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 10, 'Requires Magic Level 10'
FROM skills hs, skills is_
WHERE hs.name = 'Powersurge' AND is_.name = 'Magic';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 1, 'Requires Clickstorm Level 1'
FROM skills hs, skills is_
WHERE hs.name = 'Powersurge' AND is_.name = 'Clickstorm';

-- Lucky Strikes: Precision(idle) >= 18
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 18, 'Requires Precision Level 18'
FROM skills hs, skills is_
WHERE hs.name = 'Lucky Strikes' AND is_.name = 'Precision';

-- Metal Detector: Lore(idle) >= 25, Magic(idle) >= 25
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 25, 'Requires Lore Level 25'
FROM skills hs, skills is_
WHERE hs.name = 'Metal Detector' AND is_.name = 'Lore';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 25, 'Requires Magic Level 25'
FROM skills hs, skills is_
WHERE hs.name = 'Metal Detector' AND is_.name = 'Magic';

-- Golden Clicks: Lore(idle) >= 35, Metal Detector(active) >= 5
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 35, 'Requires Lore Level 35'
FROM skills hs, skills is_
WHERE hs.name = 'Golden Clicks' AND is_.name = 'Lore';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 5, 'Requires Metal Detector Level 5'
FROM skills hs, skills is_
WHERE hs.name = 'Golden Clicks' AND is_.name = 'Metal Detector';

-- Super Clicks: Attack(idle) >= 25, Clickstorm(active) >= 10
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 25, 'Requires Attack Level 25'
FROM skills hs, skills is_
WHERE hs.name = 'Super Clicks' AND is_.name = 'Attack';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 10, 'Requires Clickstorm Level 10'
FROM skills hs, skills is_
WHERE hs.name = 'Super Clicks' AND is_.name = 'Clickstorm';

-- Energize: Magic(idle) >= 45, Attack(idle) >= 20, Powersurge(active) >= 5, INT >= 30, Char Level >= 15
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 45, 'Requires Magic Level 45'
FROM skills hs, skills is_
WHERE hs.name = 'Energize' AND is_.name = 'Magic';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 20, 'Requires Attack Level 20'
FROM skills hs, skills is_
WHERE hs.name = 'Energize' AND is_.name = 'Attack';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 5, 'Requires Powersurge Level 5'
FROM skills hs, skills is_
WHERE hs.name = 'Energize' AND is_.name = 'Powersurge';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 30, 'Requires INT 30'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Energize' AND sd.name = 'intelligence';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 15, 'Requires Character Level 15'
FROM skills hs
WHERE hs.name = 'Energize';

-- Reload: Precision(idle) >= 58, Magic(idle) >= 40, Energize(active) >= 3, AGI >= 40, Char Level >= 20
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 58, 'Requires Precision Level 58'
FROM skills hs, skills is_
WHERE hs.name = 'Reload' AND is_.name = 'Precision';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 40, 'Requires Magic Level 40'
FROM skills hs, skills is_
WHERE hs.name = 'Reload' AND is_.name = 'Magic';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 3, 'Requires Energize Level 3'
FROM skills hs, skills is_
WHERE hs.name = 'Reload' AND is_.name = 'Energize';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 40, 'Requires AGI 40'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Reload' AND sd.name = 'agility';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 20, 'Requires Character Level 20'
FROM skills hs
WHERE hs.name = 'Reload';

-- The Dark Ritual: Magic(idle) >= 72, Lore(idle) >= 50, Reload(active) >= 1, Powersurge(active) >= 10, INT >= 60, Char Level >= 30
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 72, 'Requires Magic Level 72'
FROM skills hs, skills is_
WHERE hs.name = 'The Dark Ritual' AND is_.name = 'Magic';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 50, 'Requires Lore Level 50'
FROM skills hs, skills is_
WHERE hs.name = 'The Dark Ritual' AND is_.name = 'Lore';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 1, 'Requires Reload Level 1'
FROM skills hs, skills is_
WHERE hs.name = 'The Dark Ritual' AND is_.name = 'Reload';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'active_skill_level', is_.id, 10, 'Requires Powersurge Level 10'
FROM skills hs, skills is_
WHERE hs.name = 'The Dark Ritual' AND is_.name = 'Powersurge';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 60, 'Requires INT 60'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'The Dark Ritual' AND sd.name = 'intelligence';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 30, 'Requires Character Level 30'
FROM skills hs
WHERE hs.name = 'The Dark Ritual';

-- ============================================================================
-- §5.3 Insert 4 class-exclusive skills
-- ============================================================================

-- Threshold Slip (Drifter) — crit_boost
INSERT INTO skills (name, display_name, category, is_class_exclusive, class_id,
                    level_0_xp_requirement, idle_level_scaling, effect_type)
SELECT 'Threshold Slip', 'Threshold Slip', 'active', TRUE, cc.id,
       1500,
       '{"crit_bonus_pct": {"1": 5, "10": 10, "25": 18, "50": 30, "75": 42, "99": 55}}'::jsonb,
       'crit_boost'
FROM character_classes cc WHERE cc.name = 'Drifter'
ON CONFLICT DO NOTHING;

-- Energy Shields (Engineer) — damage_reduction
INSERT INTO skills (name, display_name, category, is_class_exclusive, class_id,
                    level_0_xp_requirement, idle_level_scaling, effect_type)
SELECT 'Energy Shields', 'Energy Shields', 'active', TRUE, cc.id,
       1500,
       '{"damage_reduction_pct": {"1": 3, "10": 8, "25": 14, "50": 22, "75": 30, "99": 40}}'::jsonb,
       'damage_reduction'
FROM character_classes cc WHERE cc.name = 'Engineer'
ON CONFLICT DO NOTHING;

-- Akashic Cascade (Conduit) — aoe_burst
INSERT INTO skills (name, display_name, category, is_class_exclusive, class_id,
                    level_0_xp_requirement, idle_level_scaling, effect_type)
SELECT 'Akashic Cascade', 'Akashic Cascade', 'active', TRUE, cc.id,
       1500,
       '{"aoe_damage_multiplier": {"1": 1.5, "10": 2.0, "25": 3.0, "50": 4.5, "75": 6.0, "99": 8.0}}'::jsonb,
       'aoe_burst'
FROM character_classes cc WHERE cc.name = 'Conduit'
ON CONFLICT DO NOTHING;

-- Elder Fury (Vessel) — damage_multiplier
INSERT INTO skills (name, display_name, category, is_class_exclusive, class_id,
                    level_0_xp_requirement, idle_level_scaling, effect_type)
SELECT 'Elder Fury', 'Elder Fury', 'active', TRUE, cc.id,
       1500,
       '{"damage_multiplier": {"1": 1.2, "10": 1.5, "25": 2.0, "50": 3.0, "75": 4.5, "99": 7.0}}'::jsonb,
       'damage_multiplier'
FROM character_classes cc WHERE cc.name = 'Vessel'
ON CONFLICT DO NOTHING;

-- Prerequisites for class-exclusive skills

-- Threshold Slip: Attack(idle) >= 30, AGI(stat) >= 40, Char Level >= 15
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 30, 'Requires Attack Level 30'
FROM skills hs, skills is_
WHERE hs.name = 'Threshold Slip' AND is_.name = 'Attack';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 40, 'Requires AGI 40'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Threshold Slip' AND sd.name = 'agility';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 15, 'Requires Character Level 15'
FROM skills hs
WHERE hs.name = 'Threshold Slip';

-- Energy Shields: Precision(idle) >= 30, AGI(stat) >= 40, Char Level >= 15
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 30, 'Requires Precision Level 30'
FROM skills hs, skills is_
WHERE hs.name = 'Energy Shields' AND is_.name = 'Precision';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 40, 'Requires AGI 40'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Energy Shields' AND sd.name = 'agility';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 15, 'Requires Character Level 15'
FROM skills hs
WHERE hs.name = 'Energy Shields';

-- Akashic Cascade: Magic(idle) >= 30, INT(stat) >= 40, Char Level >= 15
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 30, 'Requires Magic Level 30'
FROM skills hs, skills is_
WHERE hs.name = 'Akashic Cascade' AND is_.name = 'Magic';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 40, 'Requires INT 40'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Akashic Cascade' AND sd.name = 'intelligence';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 15, 'Requires Character Level 15'
FROM skills hs
WHERE hs.name = 'Akashic Cascade';

-- Elder Fury: Lore(idle) >= 30, STR(stat) >= 30, AGI(stat) >= 30, INT(stat) >= 30, Char Level >= 15
INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'idle_skill_level', is_.id, 30, 'Requires Lore Level 30'
FROM skills hs, skills is_
WHERE hs.name = 'Elder Fury' AND is_.name = 'Lore';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 30, 'Requires STR 30'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Elder Fury' AND sd.name = 'strength';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 30, 'Requires AGI 30'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Elder Fury' AND sd.name = 'agility';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'stat_value', sd.id, 30, 'Requires INT 30'
FROM skills hs, stat_definitions sd
WHERE hs.name = 'Elder Fury' AND sd.name = 'intelligence';

INSERT INTO skill_prerequisites (skill_id, prerequisite_type, ref_id, min_value, display_hint)
SELECT hs.id, 'character_level', NULL, 15, 'Requires Character Level 15'
FROM skills hs
WHERE hs.name = 'Elder Fury';

-- ============================================================================
-- §5.4 Seed idle training actions for all 13 active skills
-- ============================================================================

-- Clickstorm → Tempo Drilling
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'tempo_drilling', 'Tempo Drilling',
       'Practicing rapid-fire click patterns against construct training dummies. The constructs absorb each strike and reset. Faster. Again. Faster.',
       12, 4000, 1
FROM skills s WHERE s.name = 'Clickstorm'
ON CONFLICT DO NOTHING;

-- Powersurge → Resonance Channeling
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'resonance_channeling', 'Resonance Channeling',
       'Drawing raw energy from the tower''s resonance fields and holding it at peak amplitude. The air crackles. Your hands glow. Release.',
       14, 5000, 2
FROM skills s WHERE s.name = 'Powersurge'
ON CONFLICT DO NOTHING;

-- Lucky Strikes → Probability Mapping
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'probability_mapping', 'Probability Mapping',
       'Studying the subtle patterns in construct weak points. Each strike is a data point. Each miss, a lesson. The critical zones reveal themselves.',
       13, 4500, 3
FROM skills s WHERE s.name = 'Lucky Strikes'
ON CONFLICT DO NOTHING;

-- Super Clicks → Impact Conditioning
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'impact_conditioning', 'Impact Conditioning',
       'Striking reinforced tower alloys with increasing force. Your knuckles harden. The metal dents deeper with each session. Power compounds.',
       15, 5000, 4
FROM skills s WHERE s.name = 'Super Clicks'
ON CONFLICT DO NOTHING;

-- Metal Detector → Lore Excavation
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'lore_excavation', 'Lore Excavation',
       'Sifting through ancient tower debris for fragments of pre-collapse technology. Each shard hums with residual energy, guiding you to the next.',
       11, 4000, 5
FROM skills s WHERE s.name = 'Metal Detector'
ON CONFLICT DO NOTHING;

-- Golden Clicks → Transmutation Practice
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'transmutation_practice', 'Transmutation Practice',
       'Converting base tower materials into refined gold essence. The alchemical process is delicate — too much heat and the gold evaporates. Too little and it stays lead.',
       12, 4500, 6
FROM skills s WHERE s.name = 'Golden Clicks'
ON CONFLICT DO NOTHING;

-- Energize → Power Cycling
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'power_cycling', 'Power Cycling',
       'Routing energy through your body in controlled loops, each cycle amplifying the next. The tower''s ambient hum synchronizes with your heartbeat.',
       16, 6000, 7
FROM skills s WHERE s.name = 'Energize'
ON CONFLICT DO NOTHING;

-- Reload → Precision Reset Drills
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'precision_reset_drills', 'Precision Reset Drills',
       'Practicing the rapid cooldown-flush technique. Dump residual energy, clear the channels, reinitialize. The faster you reset, the sooner you can strike again.',
       18, 7000, 8
FROM skills s WHERE s.name = 'Reload'
ON CONFLICT DO NOTHING;

-- The Dark Ritual → Forbidden Invocations
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'forbidden_invocations', 'Forbidden Invocations',
       'Whispering the old words that the tower builders sealed away. Each syllable costs something. Each repetition costs less. The darkness listens, and it remembers your voice.',
       22, 9000, 9
FROM skills s WHERE s.name = 'The Dark Ritual'
ON CONFLICT DO NOTHING;

-- Threshold Slip → Walking the Threshold
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'walking_the_threshold', 'Walking the Threshold',
       'Balancing on the razor edge between dimensions. One foot in reality, one in the drift. The longer you hold the line, the sharper your instincts become.',
       15, 5500, 10
FROM skills s WHERE s.name = 'Threshold Slip'
ON CONFLICT DO NOTHING;

-- Energy Shields → Substrate Reconstruction Drills
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'substrate_reconstruction_drills', 'Substrate Reconstruction Drills',
       'Rebuilding micro-barriers from ambient tower substrate. Each layer absorbs more punishment. The shields flicker, stabilize, and hold. Again.',
       15, 5500, 11
FROM skills s WHERE s.name = 'Energy Shields'
ON CONFLICT DO NOTHING;

-- Akashic Cascade → Lucid Conduit Channeling
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'lucid_conduit_channeling', 'Lucid Conduit Channeling',
       'Opening yourself as a vessel for the Akashic stream. Raw knowledge floods through you — histories, equations, battle patterns — and you learn to direct the torrent.',
       15, 5500, 12
FROM skills s WHERE s.name = 'Akashic Cascade'
ON CONFLICT DO NOTHING;

-- Elder Fury → Channeling Tiamat's Coils
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, xp_per_action, interval_ms, sort_order)
SELECT s.id, 'channeling_tiamats_coils', 'Channeling Tiamat''s Coils',
       'Invoking the primal rage of the Elder serpent. The power is ancient and barely controllable — each session you hold it longer, shape it better, and survive.',
       15, 5500, 13
FROM skills s WHERE s.name = 'Elder Fury'
ON CONFLICT DO NOTHING;
