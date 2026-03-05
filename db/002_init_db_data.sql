-- =============================================================================
-- 002_init_db_data.sql
-- Consolidated initial data and seed data for Towers of Elysium
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Character Classes
-- =============================================================================

INSERT INTO character_classes (name, lore_blurb, base_strength, base_agility, base_intelligence, sprite_key)
VALUES
('Engineer', 'Those who hear the Eternal Engine''s rhythm and bend its mechanisms to their will. Engineers rebuild what the prison unmakes, constructing shields and weapons from the substrate''s own architecture.', 14, 10, 6,  'class_engineer'),
('Conduit',  'Channels of raw cosmic energy flowing from beyond the prison walls. Conduits manipulate reality itself, warping the Akashic Flow to unmake enemies and rewrite the rules of engagement.', 6,  8,  16, 'class_conduit'),
('Drifter',  'Memory-walkers who navigate the spaces between realities. Drifters slip through cracks in Etheris, striking from impossible angles and vanishing before the system can register their presence.', 8,  16, 6,  'class_drifter'),
('Vessel',   'Those who channel the remnant power of cosmic entities — fragments of the Thirteen, echoes of elder gods. Vessels wield divine fury and existential dread in equal measure.', 10, 6,  14, 'class_vessel')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. Server Config Defaults
-- =============================================================================

INSERT INTO server_config (key, value, value_type, category, description, default_value)
VALUES
-- Game Tuning
('game.essence_per_click',        '1.0',   'numeric', 'game', 'Base essence earned per click.',                                '1.0'),
('game.crit_chance',              '0.05',  'numeric', 'game', 'Probability of a critical click (0.0-1.0).',                     '0.05'),
('game.crit_multiplier',          '2.0',   'numeric', 'game', 'Damage/essence multiplier on critical click.',                   '2.0'),
('game.xp_multiplier',            '1.0',   'numeric', 'game', 'Global XP multiplier.',                                         '1.0'),
('game.drop_rate_multiplier',     '1.0',   'numeric', 'game', 'Global drop rate multiplier.',                                   '1.0'),
('game.offline_cap_chapters',     '1',     'integer', 'game', 'Max chapters worth of offline progress.',                        '1'),
('game.max_characters_per_player','1',     'integer', 'game', 'Character creation limit per player.',                           '1'),
-- Operational Settings
('ops.maintenance_mode',              'false', 'boolean', 'ops', 'Block all player API access with maintenance message.',        'false'),
('ops.maintenance_message',           'Elysium is undergoing maintenance. Please return shortly.', 'text', 'ops', 'Message shown during maintenance.', 'Elysium is undergoing maintenance. Please return shortly.'),
('ops.registration_open',            'true',  'boolean', 'ops', 'Allow new player registration.',                                'true'),
('ops.announcement_banner',          '',       'text',    'ops', 'Banner text displayed at top of frontend (empty = hidden).',    ''),
('ops.announcement_banner_type',     'info',   'string',  'ops', 'Banner color type: info, warning, error.',                      'info'),
('ops.rate_limit_clicks_per_second', '20',     'integer', 'ops', 'Max clicks/sec before rate limiting kicks in.',                 '20'),
('ops.rate_limit_suspicious_threshold','15',   'integer', 'ops', 'Sustained clicks/sec that flags a player as suspicious.',       '15'),
('ops.admin_ip_whitelist_enabled',    'true',  'boolean', 'ops', 'If true, the Admin Panel enforces the IP whitelist. If false, any whitelisted email can access from any IP.', 'true')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 3. Game Configs (Loop 2.0 and Story Mode)
-- =============================================================================

INSERT INTO game_configs (key, value_json, description) VALUES
('click_rate_cap', '20', 'Maximum allowed clicks per second before flagging/throttling.'),
('hp_scaling_factor', '1.55', 'The exponential base for monster HP scaling across zones.'),
('session_gold_multiplier', '1.0', 'Global multiplier for session gold drops.'),
('primal_boss_chance', '0.25', 'Probability (0.0-1.0) of a boss being Primal (Essence reward).'),
('crit_multiplier', '2.0', 'Default damage multiplier for critical hits.'),
('wave_duration_seconds', '30', 'Seconds of audio duration required per monster wave.'),
('base_auto_dps_tick_ms', '500', 'Interval in milliseconds at which auto-DPS is applied on the client. Server validates via batch tick.'),
('default_player_wpm', '200', 'Default words-per-minute for narrative delay calculations when no user preference is set.'),
('boss_enrage_seconds', '30', 'Seconds before a zone boss enrages and deals massive damage.'),
('first_clear_multiplier', '1.5', 'Multiplier applied to Essence rewards for the first time a scene is completed.'),
('monsters_per_zone', '10', 'Number of minions to defeat before a boss or zone completion.'),
('boss_zone_interval', '5', 'Every Nth zone is a boss zone.'),
('crit_chance', '0.02', 'Base probability (0.0-1.0) of a critical hit.'),
('auto_dps_tick_ms', '500', 'Interval in milliseconds between auto-damage applications.'),
('gcd_ms', '1000', 'Global Cooldown in milliseconds after using any active skill.'),
('upgrade_cost_scaling', '1.07', 'Exponential cost multiplier per upgrade level (1.07^L).'),
('cd_reduction_per_level', '0.05', 'Cooldown reduction percentage per skill level.'),
('max_cd_reduction', '0.7', 'Maximum possible cooldown reduction (e.g. 0.7 = 70% off).'),
('base_click_upgrade_cost', '10.0', 'Base gold cost for Click Damage level 1.'),
('base_auto_dps_upgrade_cost', '25.0', 'Base gold cost for Auto-DPS level 1.'),
('base_skill_unlock_cost', '50.0', 'Base gold cost to unlock a skill (multiplied by skill base cost).'),
('base_skill_level_upgrade_cost', '100.0', 'Base gold cost to upgrade an unlocked skill.'),
('milestone_interval', '25', 'Levels between big damage multiplier spikes.'),
('milestone_start', '200', 'Level at which damage multiplier spikes begin.'),
('click_dmg_mult_per_level', '0.05', 'Base multiplier added per Click Damage level (e.g. 0.05 = +5%).'),
('auto_dps_mult_per_level', '0.05', 'Base multiplier added per Auto-DPS level (e.g. 0.05 = +5%).'),
('gold_to_essence_base_rate', '1000', 'The initial amount of gold required to earn 1 unit of Essence at Zone 1.'),
('gold_to_essence_growth_factor', '1.07', 'The exponential growth of the conversion rate per zone.'),
('idle_offline_cap_hours', '24', 'Maximum offline training hours calculated on player return.'),
('idle_essence_drain_per_minute', '1', 'Elysium Essence drained per minute of active idle training.'),
('idle_essence_xp_full_threshold', '0.75', 'Essence % above which XP is earned at 100% rate.'),
('idle_essence_xp_mid_threshold', '0.40', 'Essence % above which XP is earned at 75% rate.'),
('idle_essence_xp_low_threshold', '0.15', 'Essence % above which XP is earned at 50% rate.'),
('idle_essence_xp_critical_threshold', '0.01', 'Essence % above which XP is earned at 25% rate.'),
('idle_essence_xp_floor_rate', '0.10', 'Minimum XP rate multiplier when Essence is at 0%.'),
('idle_active_mode_boss_interval', '10', 'Number of waves between boss spawns in the Idle Training Active Mode.'),
('idle_essence_capacity', '1000', 'Base Elysium Essence capacity for idle training stability calculation.')
ON CONFLICT (key) DO UPDATE SET 
    value_json = EXCLUDED.value_json,
    description = EXCLUDED.description;

-- =============================================================================
-- 4. Stat Definitions
-- =============================================================================

INSERT INTO stat_definitions (name, display_name, value_type, description, category) VALUES 
('strength', 'Strength', 'integer', 'Increases physical damage.', 'combat'),
('agility', 'Agility', 'integer', 'Increases attack speed.', 'combat'),
('intelligence', 'Intelligence', 'integer', 'Increases mana and skill power.', 'magic'),
('crit_chance', 'Crit Chance', 'percentage', 'Chance to deal double damage.', 'combat')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 5. Benefit Effect Definitions
-- =============================================================================

INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, category) VALUES 
('click_damage_bonus', 'Click Damage Bonus', 'Increases the damage dealt per manual click.', 'percentage_add', 'combat'),
('auto_dps_bonus', 'Auto-DPS Bonus', 'Increases the damage dealt automatically over time.', 'percentage_add', 'combat'),
('time_gate_reduction', 'Time Gate Reduction', 'Reduces the required audio playback time for scenes.', 'percentage_add', 'audio'),
('essence_bonus', 'Essence Gain Bonus', 'Increases the rate at which Elysium Essence is earned.', 'percentage_add', 'economy'),
('crit_chance_bonus', 'Crit Chance Bonus', 'Increases the probability of landing a critical hit.', 'flat_add', 'combat'),
('crit_mult_bonus', 'Crit Multiplier Bonus', 'Increases the damage multiplier of critical hits.', 'flat_add', 'combat'),
('auto_dps_base', 'Auto-DPS Base Damage', 'Base automatic damage per second at skill level 1. Scales with skill level.', 'flat_add', 'combat'),
('gold_drop_bonus', 'Gold Drop Bonus', 'Increases gold dropped by defeated enemies.', 'percentage_add', 'economy'),
('click_storm_cps', 'Clickstorm CPS', 'Clicks-per-second rate for the Clickstorm skill.', 'flat_add', 'combat'),
('golden_click_pct', 'Golden Click Pct', 'Percentage of monster gold earned per click.', 'percentage_add', 'economy'),
('dark_ritual_multiplier', 'Dark Ritual Multiplier', 'Permanent chapter DPS multiplier.', 'multiplier', 'combat'),
('energize_multiplier', 'Energize Multiplier', 'Multiplier for the next skill effect.', 'multiplier', 'utility'),
('reload_pct', 'Reload Pct', 'Cooldown reduction for last used skill.', 'percentage_add', 'utility')
ON CONFLICT (effect_key) DO NOTHING;

-- =============================================================================
-- 6. Skills
-- =============================================================================

INSERT INTO skills (name, category, description, benefits_json, xp_curve_type, cooldown_type, base_cooldown_seconds, base_cost_gold, cost_scaling_factor, idle_flavor_title)
VALUES 
('Attack', 'combat', 'Increases base Click Damage in Story Mode. Automatically attacks enemies for base DPS each second.', '{"click_damage_bonus": 0.5, "auto_dps_base": 5.0}', 'standard', 'individual', 0, 0, 1.0, 'COMBAT PROTOCOL'),
('Magic', 'magic', 'Increases base Auto-DPS and unlocks magic skills.', '{"auto_dps_bonus": 0.5}', 'standard', 'individual', 30, 100, 1.15, 'DREAMWALKING'),
('Lore', 'utility', 'Reduces story duration gate and increases Essence.', '{"time_gate_reduction": 0.01, "essence_bonus": 0.05}', 'standard', 'individual', 30, 100, 1.15, 'AKASHIC RESEARCH'),
('Precision', 'utility', 'Increases critical hit chance and multiplier.', '{"crit_chance_bonus": 0.01, "crit_mult_bonus": 0.05}', 'standard', 'individual', 30, 100, 1.15, 'CALIBRATION'),
('Auto-Strike', 'combat', 'Automatically attacks enemies for base DPS each second. Each level adds +5 DPS/s.', '{"auto_dps_base": 5.0}', 'standard', 'individual', 0, 0, 1.0, NULL),
('Clickstorm', 'active', 'Automatically clicks at 10 CPS for 30 seconds.', '{"click_storm_cps": 10, "duration_seconds": 30}', 'standard', 'individual', 45, 50, 1.15, NULL),
('Powersurge', 'active', '+100% DPS multiplier for 30 seconds.', '{"auto_dps_bonus": 1.0, "duration_seconds": 30}', 'standard', 'individual', 45, 75, 1.15, NULL),
('Lucky Strikes', 'active', '+50% critical hit chance for 30 seconds.', '{"crit_chance_bonus": 0.50, "duration_seconds": 30}', 'standard', 'individual', 45, 100, 1.15, NULL),
('Metal Detector', 'active', '+100% gold drop multiplier for 30 seconds.', '{"gold_drop_bonus": 1.0, "duration_seconds": 30}', 'standard', 'individual', 45, 60, 1.15, NULL),
('Golden Clicks', 'active', 'Each click earns 5% of the current monster''s gold value directly.', '{"golden_click_pct": 0.05, "duration_seconds": 30}', 'standard', 'individual', 60, 80, 1.15, NULL),
('The Dark Ritual', 'active', 'Applies a +1.05x DPS multiplier that persists for the entire current Chapter. Resets on new Chapter.', '{"dark_ritual_multiplier": 1.05, "duration_seconds": -1}', 'standard', 'individual', 90, 500, 1.20, NULL),
('Super Clicks', 'active', '+200% click damage for 30 seconds.', '{"click_damage_bonus": 2.0, "duration_seconds": 30}', 'standard', 'individual', 45, 120, 1.15, NULL),
('Energize', 'active', 'The next skill activated deals double its stated effect.', '{"energize_multiplier": 2.0, "duration_seconds": -1}', 'standard', 'global', 60, 150, 1.15, NULL),
('Reload', 'active', 'Reduces the cooldown of the last used skill by 50%.', '{"reload_pct": 0.50, "duration_seconds": -1}', 'standard', 'global', 30, 100, 1.15, NULL)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 7. Artifacts
-- =============================================================================

INSERT INTO artifacts (name, description, lore_text, rarity, sprite_key) VALUES 
('Cracked Data Core', 'A remnant of the Old World''s network.', 'The silicon is pitted and scarred, but a faint blue light still pulses within. It hums with the static of a billion forgotten conversations.', 'rare', 'artifact_data_core'),
('Void Shard', 'A pulsating fragment of Yaldabaoth''s prison.', 'Cold to the touch and seemingly absorbing the light around it. To hold it is to feel the weight of infinite isolation.', 'epic', 'artifact_void_shard'),
('Membrane Leaf', 'Flora found only in the Lower Towers.', 'Transparent and veins with a bioluminescent sap. It feeds on the atmospheric pressure of the tower''s depths.', 'uncommon', 'artifact_membrane_leaf'),
('Conduit''s Focus', 'A broken lens used to channel cosmic energy.', 'Once part of a Drifter''s apparatus. Though cracked, it still refracts the Akashic flow into visible spectrums.', 'rare', 'artifact_conduit_focus')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 8. Skill Actions
-- =============================================================================

-- Attack Actions
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT s.id, v.name, v.display_name, v.lore_description, v.level_required, v.interval_ms, v.xp_per_action, v.sort_order
FROM skills s, (VALUES
    ('shadowboxing_garage', 'Shadowboxing in the Garage', 'Stephen trains alone in his Florida garage...', 1, 3000, 10, 1),
    ('scorp_security_drills', 'S Corp Security Drills', 'Training alongside Patrick''s security team...', 10, 4000, 18, 2),
    ('mom_combat_simulations', 'Combat Simulations at MOM', 'High-tech training at Morgan''s Antarctic...', 22, 5500, 32, 3),
    ('red_hat_brigade_fighting', 'Fighting Red Hat Brigades', 'Direct engagement with Todd''s fundamentalist...', 36, 7500, 58, 4),
    ('elysium_combat_training', 'Elysium Station Combat Training', 'In the exercise decks of S Corp''s space station...', 50, 10000, 90, 5),
    ('kuiper_belt_firefight', 'Kuiper Belt Firefight Simulations', 'Recreating the zero-gravity engagement...', 65, 13000, 140, 6),
    ('dreamscape_combat_conditioning', 'Dreamscape Combat Conditioning', 'Fighting in the dreamscape itself...', 80, 17000, 205, 7),
    ('audit_construct_engagement', 'Engaging the Audit''s Constructs', 'Direct combat against the entities...', 92, 22000, 295, 8)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Attack' ON CONFLICT DO NOTHING;

-- Magic Actions
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT s.id, v.name, v.display_name, v.lore_description, v.level_required, v.interval_ms, v.xp_per_action, v.sort_order
FROM skills s, (VALUES
    ('lucid_dreaming_practice', 'Lucid Dreaming Practice', 'Entering sleep with the mind lit...', 1, 3000, 10, 1),
    ('threshold_navigation', 'Threshold Navigation', 'Learning to move through the liminal space...', 10, 4000, 18, 2),
    ('channeling_the_conduits', 'Channeling the Conduits', 'Making contact with the dreamscape''s architecture...', 22, 5500, 32, 3),
    ('studying_eternal_engine', 'Studying the Eternal Engine', 'Long sessions with the crystalline construct...', 35, 7500, 58, 4),
    ('lady_a_oneiromancy_lessons', 'Lady A''s Oneiromancy Lessons', 'Formal training with Lady Astrael...', 48, 10000, 90, 5),
    ('quantum_field_harmonization', 'Quantum Field Harmonization', 'Applying the Infinitron''s quantum framework...', 62, 13500, 145, 6),
    ('akashic_realm_meditation', 'Akashic Realm Meditation', 'Extended sessions in the cosmic library...', 76, 17500, 215, 7),
    ('communing_lady_illkeserod', 'Communing with Lady Illkeserod', 'Deep sessions with the Goddess of Secrets...', 87, 20000, 270, 8),
    ('madam_osilari_symbol_weaving', 'Madam Osilari''s Symbol Weaving', 'The Madam of Symbols'' robes are equations...', 95, 24000, 355, 9)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Magic' ON CONFLICT DO NOTHING;

-- Lore Actions
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT s.id, v.name, v.display_name, v.lore_description, v.level_required, v.interval_ms, v.xp_per_action, v.sort_order
FROM skills s, (VALUES
    ('researching_the_pointers', 'Researching the Pointers', 'The Pointers appeared simultaneously...', 1, 3000, 10, 1),
    ('scorp_research_archives', 'S Corp Research Archives', 'Accessing S Corp''s classified repository...', 12, 4200, 22, 2),
    ('infinitron_schematics_study', 'Studying the Infinitron Schematics', 'The crystalline architecture of S Corp''s...', 24, 5800, 38, 3),
    ('decoding_etheris_architecture', 'Decoding Etheris Architecture', 'Piecing together how the prison was built...', 38, 8000, 68, 4),
    ('jennifers_journal_analysis', 'Jennifer''s Journal Analysis', 'Whitney''s artifact shifts as you study it...', 52, 11000, 108, 5),
    ('gnostic_cosmology_deep_dive', 'Gnostic Cosmology Deep Dive', 'Ancient texts that were not mythology...', 65, 14500, 160, 6),
    ('translating_akashic_index', 'Translating the Akashic Index', 'The cosmic library''s index is encoded...', 78, 18500, 230, 7),
    ('deciphering_madam_o_symbols', 'Deciphering Madam O''s Symbols', 'The Madam of Symbols'' equations...', 88, 22000, 305, 8),
    ('shepherd_initiative_records', 'Reviewing Shepherd Initiative Records', 'The divine council''s briefing materials...', 95, 26000, 400, 9)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Lore' ON CONFLICT DO NOTHING;

-- Precision Actions
INSERT INTO skill_actions (skill_id, name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
SELECT s.id, v.name, v.display_name, v.lore_description, v.level_required, v.interval_ms, v.xp_per_action, v.sort_order
FROM skills s, (VALUES
    ('calibrating_the_infinitron', 'Calibrating the Infinitron', 'The crystalline CPU requires constant...', 1, 3000, 10, 1),
    ('erb_portal_alignment', 'ERB Portal Alignment', 'Einstein-Rosen Bridge portal targeting...', 12, 4200, 22, 2),
    ('nanite_targeting_systems', 'Nanite Targeting Systems', 'Programming S Corp''s nanite swarms...', 26, 6200, 42, 3),
    ('algorithmic_heist_planning', 'Algorithmic Heist Planning', 'Covert operations require perfect timing...', 40, 8500, 72, 4),
    ('genesis_ship_systems', 'Genesis Ship Systems Mastery', 'Operating the precision navigation...', 54, 11500, 115, 5),
    ('red_hat_signal_decryption', 'Red Hat Signal Decryption', 'Aditi discovered the Red Hats used...', 68, 15000, 175, 6),
    ('yaldabaoth_substrate_tracking', 'Tracking Yaldabaoth''s Substrate Pulse', 'The prison emits detectable interference...', 82, 19500, 250, 7),
    ('aspolin_strike_calibration', 'Aspolin''s Strike Calibration', 'The divine name carries power...', 93, 24000, 330, 8)
) AS v(name, display_name, lore_description, level_required, interval_ms, xp_per_action, sort_order)
WHERE s.name = 'Precision' ON CONFLICT DO NOTHING;

COMMIT;
