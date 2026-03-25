-- =============================================================================
-- 002_system_seed_data.sql
-- System/framework seed data for bare server setup
-- Generated from live database on 2026-03-15
-- Contains: game configs, stats, classes, skills, difficulty, items, shop,
--           attack types, gear slots, admin access, chat channels
-- Run this after 001 to get a working (but empty-content) server
-- =============================================================================

-- Disable triggers for FK ordering
SET session_replication_role = replica;

-- Data for Name: character_classes; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.character_classes VALUES (3, 'Drifter', 'Memory-walkers who navigate the spaces between realities. Drifters slip through cracks in Etheris, striking from impossible angles and vanishing before the system can register their presence.', 8, 16, 6, 'class_drifter', true, '2026-03-01 12:39:12.283292-05', '2026-03-05 19:39:33.647318-05', '{"avatar_url": "/assets/classes/drifter_avatar.png", "particle_tint": "#FF4444", "primary_color": "#DC143C", "secondary_color": "#8B0000", "idle_sprite_tint": "#FFCCCC", "damage_text_color": "#FF6B6B", "border_glow_intensity": 0.6}');
INSERT INTO public.character_classes VALUES (1, 'Engineer', 'Those who hear the Eternal Engine''s rhythm and bend its mechanisms to their will. Engineers rebuild what the prison unmakes, constructing shields and weapons from the substrate''s own architecture.', 14, 10, 6, 'class_engineer', true, '2026-03-01 12:39:12.283292-05', '2026-03-05 19:39:33.686834-05', '{"avatar_url": "/assets/classes/engineer_avatar.png", "particle_tint": "#5B9BD5", "primary_color": "#4682B4", "secondary_color": "#2F4F6F", "idle_sprite_tint": "#CCE5FF", "damage_text_color": "#87CEEB", "border_glow_intensity": 0.5}');
INSERT INTO public.character_classes VALUES (2, 'Conduit', 'Channels of raw cosmic energy flowing from beyond the prison walls. Conduits manipulate reality itself, warping the Akashic Flow to unmake enemies and rewrite the rules of engagement.', 6, 8, 16, 'class_conduit', true, '2026-03-01 12:39:12.283292-05', '2026-03-05 19:39:33.687451-05', '{"avatar_url": "/assets/classes/conduit_avatar.png", "particle_tint": "#A569BD", "primary_color": "#9B59B6", "secondary_color": "#6C3483", "idle_sprite_tint": "#E8DAEF", "damage_text_color": "#D2B4DE", "border_glow_intensity": 0.7}');
INSERT INTO public.character_classes VALUES (4, 'Vessel', 'Those who channel the remnant power of cosmic entities — fragments of the Thirteen, echoes of elder gods. Vessels wield divine fury and existential dread in equal measure.', 10, 6, 14, 'class_vessel', true, '2026-03-01 12:39:12.283292-05', '2026-03-15 23:18:57.492132-04', '{"avatar_url": "/assets/classes/vessel_avatar.png", "particle_tint": "#FFC125", "primary_color": "#DAA520", "secondary_color": "#B8860B", "idle_sprite_tint": "#FFF8DC", "damage_text_color": "#FFD700", "border_glow_intensity": 0.8}');




-- Data for Name: admin_whitelist_emails; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.admin_whitelist_emails VALUES ('ssalaka@gmail.com', 'system_init', '2026-03-01 13:00:10.614677-05');
INSERT INTO public.admin_whitelist_emails VALUES ('test_bypass_9fef715c82d5@test.bypass', NULL, '2026-03-15 18:17:02.598251-04');




-- Data for Name: admin_whitelist_ips; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.admin_whitelist_ips VALUES ('99.85.82.8', 'Initial Owner Access', 'system_init', '2026-03-01 13:00:10.61711-05');
INSERT INTO public.admin_whitelist_ips VALUES ('172.18.0.1', 'Initial Owner Access', 'system_init', '2026-03-01 13:04:39.673214-05');




-- Data for Name: artifact_prefixes; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.artifact_prefixes VALUES (1, 'FRACT', 'Fractured', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (2, 'LUMIN', 'Luminous', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (3, 'DORM', 'Dormant', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (4, 'CORRD', 'Corroded', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (5, 'PRST', 'Pristine', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (6, 'ETHER', 'Ethereal', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (7, 'VOLAT', 'Volatile', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (8, 'ANCNT', 'Ancient', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (9, 'NULL', 'Null', '{"precision": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (10, 'CRMSN', 'Crimson', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (11, 'OBSDN', 'Obsidian', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (12, 'SPECL', 'Spectral', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (13, 'FADNG', 'Fading', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (14, 'ENCOD', 'Encoded', '{"precision": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (15, 'PARST', 'Parasitic', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (16, 'HOLLW', 'Hollow', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (17, 'RADNT', 'Radiant', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (18, 'TWSTD', 'Twisted', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (19, 'FROZN', 'Frozen', '{"precision": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_prefixes VALUES (20, 'BURNG', 'Burning', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');




-- Data for Name: artifact_suffixes; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.artifact_suffixes VALUES (1, 'VOID', 'of the Void', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (2, 'AWAKE', 'of Awakening', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (3, 'TOWER', 'of the Tower', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (4, 'SLNCE', 'of Silence', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (5, 'PALLM', 'of the Pallid Mask', '{"precision": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (6, 'ETHR', 'of Etheris', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (7, 'CNDUT', 'of the Conduit', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (8, 'ASH', 'of Ash', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (9, 'MEMRY', 'of Memory', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (10, 'SUBSTR', 'of the Substrate', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (11, 'ENTPY', 'of Entropy', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (12, 'DEMRG', 'of the Demiurge', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (13, 'DREAM', 'of Dreams', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (14, 'RHAT', 'of the Red Hat', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (15, 'GRAVT', 'of Gravity', '{"vitality": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (16, 'PHASE', 'of Phase', '{"agility": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (17, 'RESNC', 'of Resonance', '{"precision": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (18, 'CORPT', 'of Corruption', '{"strength": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (19, 'LIGHT', 'of Light', '{"wisdom": 1}', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_suffixes VALUES (20, 'ABYSS', 'of the Abyss', '{"intelligence": 1}', '2026-03-09 12:40:25.289342-04');




-- Data for Name: artifact_type_bases; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.artifact_type_bases VALUES (1, 'SHARD', 'Shard', '{"strength": [1, 3], "vitality": [0, 2]}', 'Fractured remnants of crystallized tower energy', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (2, 'PRISM', 'Prism', '{"wisdom": [0, 2], "intelligence": [1, 3]}', 'Light-refracting devices from the upper reaches', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (3, 'FRAG', 'Fragment', '{"agility": [1, 2], "strength": [0, 2]}', 'Broken pieces of ancient constructs', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (4, 'CORE', 'Core', '{"strength": [0, 1], "vitality": [2, 4]}', 'Power sources from decommissioned tower systems', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (5, 'RELIC', 'Relic', '{"wisdom": [1, 3], "intelligence": [0, 2]}', 'Holy objects preserved from before the Collapse', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (6, 'SIGIL', 'Sigil', '{"agility": [0, 2], "intelligence": [1, 2]}', 'Inscribed glyphs that channel akashic flow', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (7, 'ORB', 'Orb', '{"wisdom": [2, 3], "vitality": [0, 1]}', 'Spherical containers of distilled essence', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (8, 'LENS', 'Lens', '{"precision": [0, 1], "intelligence": [2, 3]}', 'Optical instruments tuned to perceive hidden frequencies', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (9, 'GLYPH', 'Glyph', '{"wisdom": [0, 2], "strength": [1, 2]}', 'Ancient symbols etched into imperishable material', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (10, 'TABLET', 'Tablet', '{"wisdom": [1, 2], "vitality": [1, 2]}', 'Stone slabs encoded with compressed knowledge', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (11, 'RESON', 'Resonator', '{"agility": [1, 3], "precision": [0, 1]}', 'Devices that vibrate in harmony with tower frequencies', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (12, 'CIRCT', 'Circuit', '{"precision": [1, 3], "intelligence": [0, 1]}', 'Recovered computational nodes from the old network', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (13, 'MEMBR', 'Membrane', '{"agility": [0, 1], "vitality": [1, 3]}', 'Biological tissue from tower organisms', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (14, 'CATAL', 'Catalyst', '{"strength": [1, 2], "intelligence": [1, 2]}', 'Reagents that accelerate energy transformation', '2026-03-09 12:40:25.289342-04');
INSERT INTO public.artifact_type_bases VALUES (15, 'ECHO', 'Echo', '{"wisdom": [1, 2], "precision": [1, 2]}', 'Solidified reverberations of past events', '2026-03-09 12:40:25.289342-04');




-- Data for Name: attack_types; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.attack_types VALUES (1, 'melee', 'Melee', 'Close-quarters physical combat using blades, fists, or blunt instruments.', true, 'S Corp tactical operatives and Engineer class constructs', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 1, NULL);
INSERT INTO public.attack_types VALUES (2, 'ranged', 'Ranged', 'Projectile-based attacks from distance — ballistic, plasma, or thrown.', true, 'S Corp defense turrets and Red Hat guerrilla weaponry', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 2, NULL);
INSERT INTO public.attack_types VALUES (9, 'resonance', 'Resonance', 'Vibrational frequency attacks that shatter structures and disrupt energy fields.', false, 'Infinitron resonance frequencies — the felt calibration of reality', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 2, NULL);
INSERT INTO public.attack_types VALUES (4, 'aerial', 'Aerial', 'Airborne assault — dive attacks, swooping strikes, or atmospheric bombardment.', true, 'Elysium Station defense drones and winged construct entities', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 3, NULL);
INSERT INTO public.attack_types VALUES (3, 'akashic', 'Akashic', 'Cosmic energy manipulation channeled from the Akashic realm.', false, 'Conduit class energy projection and Lady A''s void sorcery', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 4, NULL);
INSERT INTO public.attack_types VALUES (5, 'psychic', 'Psychic', 'Mental and dream-state attacks that target consciousness directly.', false, 'Dreamwalker abilities, Madam Osilari''s symbol-weaving, Threshold entities', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 4, NULL);
INSERT INTO public.attack_types VALUES (8, 'void', 'Void', 'Zero-point null energy from Lady A''s void domain — erasure, not damage.', false, 'Lady Astrael''s void domain — annihilation of existence itself', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 4, NULL);
INSERT INTO public.attack_types VALUES (6, 'nanite', 'Nanite', 'Nanite swarm attacks — corrosive clouds, targeted disassembly, infiltration.', false, 'S Corp nanite technology operating at the Angstrom scale', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);
INSERT INTO public.attack_types VALUES (7, 'phase', 'Phase', 'Phase-shifted attacks that bypass conventional defenses by slipping between states.', false, 'Drifter class Threshold Slip and phase-state traversal technology', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);
INSERT INTO public.attack_types VALUES (10, 'construct', 'Construct', 'Automated mechanical attacks from prison-generated immune-response entities.', true, 'Yaldabaoth''s automated defense constructs — the prison''s antibodies', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);
INSERT INTO public.attack_types VALUES (11, 'thermal', 'Thermal', 'Extreme heat or cold energy projection — plasma bursts, cryo-blasts.', true, 'Elysium Station thermal defense grid and Antarctic R&D facility (MOM) tech', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);
INSERT INTO public.attack_types VALUES (12, 'gravitic', 'Gravitic', 'Gravitational manipulation — crushing fields, orbital pulls, mass distortion.', false, 'ERB portal gravitational lensing and Etheris structural architecture', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);
INSERT INTO public.attack_types VALUES (13, 'corruption', 'Corruption', 'Parasitic energy that infects, degrades, and subverts from within.', false, 'Yaldabaoth''s corruption — the demiurge''s method of control and consumption', '2026-03-05 22:40:08.882121', '2026-03-05 22:40:08.882121', 5, NULL);




-- Data for Name: difficulty_curves; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.difficulty_curves VALUES (1, 'Standard Ramp', 'Gentle 10-chapter difficulty increase', '{"1": {"hp": 1.0, "gold": 1.0, "spawn_speed": 1.0, "wave_density": 1.0}, "2": {"hp": 1.1, "gold": 1.05, "spawn_speed": 1.0, "wave_density": 1.05}, "3": {"hp": 1.2, "gold": 1.1, "spawn_speed": 0.98, "wave_density": 1.1}, "4": {"hp": 1.35, "gold": 1.15, "spawn_speed": 0.96, "wave_density": 1.15}, "5": {"hp": 1.5, "gold": 1.2, "spawn_speed": 0.94, "wave_density": 1.2}, "6": {"hp": 1.7, "gold": 1.25, "spawn_speed": 0.92, "wave_density": 1.25}, "7": {"hp": 1.95, "gold": 1.3, "spawn_speed": 0.90, "wave_density": 1.3}, "8": {"hp": 2.2, "gold": 1.35, "spawn_speed": 0.88, "wave_density": 1.35}, "9": {"hp": 2.5, "gold": 1.4, "spawn_speed": 0.86, "wave_density": 1.4}, "10": {"hp": 2.85, "gold": 1.45, "spawn_speed": 0.84, "wave_density": 1.45}}', true, 1, '2026-03-15 16:04:28.136831-04', '2026-03-15 16:04:28.136831-04');




-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.skills VALUES (1, 'Attack', 'combat', 'Increases base Click Damage in Story Mode.', '{"click_damage_bonus": 0.5}', 'standard', '2026-03-01 16:53:10.614584-05', 'individual', 30, 100, 1.15, NULL, NULL, 'COMBAT PROTOCOL', '2026-03-05 11:54:46.682338-05', 'Attack', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (2, 'Magic', 'magic', 'Increases base Auto-DPS and unlocks magic skills.', '{"auto_dps_bonus": 0.5}', 'standard', '2026-03-01 16:53:10.614584-05', 'individual', 30, 100, 1.15, 714, 'Complete the first Dreamwalking story scene', 'DREAMWALKING', '2026-03-05 11:54:46.682338-05', 'Magic', 1200, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (3, 'Lore', 'utility', 'Reduces story duration gate and increases Essence.', '{"essence_bonus": 0.05, "time_gate_reduction": 0.01}', 'standard', '2026-03-01 16:53:10.614584-05', 'individual', 30, 100, 1.15, 606, 'Discover the Eternal Engine in the Dreamscape', 'AKASHIC RESEARCH', '2026-03-05 11:54:46.682338-05', 'Lore', 1200, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (4, 'Precision', 'utility', 'Increases critical hit chance and multiplier.', '{"crit_mult_bonus": 0.05, "crit_chance_bonus": 0.01}', 'standard', '2026-03-01 16:53:10.614584-05', 'individual', 30, 100, 1.15, 699, 'Witness the Infinitron Breakthrough', 'CALIBRATION', '2026-03-05 11:54:46.682338-05', 'Precision', 1200, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (5, 'Auto-Strike', 'combat', 'Automatically attacks enemies for base DPS each second. Each level adds +5 DPS/s. Contributes to Story Mode auto-attack alongside all other auto_dps_base skills.', '{"auto_dps_base": 5.0}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 0, 0, 1.0, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Auto-Strike', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (6, 'Clickstorm', 'active', 'Automatically clicks at 10 CPS for 30 seconds.', '{"click_storm_cps": 10, "duration_seconds": 30}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 45, 50, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Clickstorm', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (7, 'Powersurge', 'active', '+100% DPS multiplier for 30 seconds.', '{"auto_dps_bonus": 1.0, "duration_seconds": 30}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 45, 75, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Powersurge', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (8, 'Lucky Strikes', 'active', '+50% critical hit chance for 30 seconds.', '{"duration_seconds": 30, "crit_chance_bonus": 0.50}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 45, 100, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Lucky Strikes', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (9, 'Metal Detector', 'active', '+100% gold drop multiplier for 30 seconds.', '{"gold_drop_bonus": 1.0, "duration_seconds": 30}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 45, 60, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Metal Detector', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (10, 'Golden Clicks', 'active', 'Each click earns 5% of the current monster''s gold value directly.', '{"duration_seconds": 30, "golden_click_pct": 0.05}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 60, 80, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Golden Clicks', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (11, 'The Dark Ritual', 'active', 'Applies a +1.05x DPS multiplier that persists for the entire current Chapter. Resets on new Chapter.', '{"duration_seconds": -1, "dark_ritual_multiplier": 1.05}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 90, 500, 1.20, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'The Dark Ritual', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (12, 'Super Clicks', 'active', '+200% click damage for 30 seconds.', '{"duration_seconds": 30, "click_damage_bonus": 2.0}', 'standard', '2026-03-02 15:20:58.658855-05', 'individual', 45, 120, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Super Clicks', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (13, 'Energize', 'active', 'The next skill activated deals double its stated effect.', '{"duration_seconds": -1, "energize_multiplier": 2.0}', 'standard', '2026-03-02 15:20:58.658855-05', 'global', 60, 150, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Energize', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (14, 'Reload', 'active', 'Reduces the cooldown of the last used skill by 50%.', '{"reload_pct": 0.50, "duration_seconds": -1}', 'standard', '2026-03-02 15:20:58.658855-05', 'global', 30, 100, 1.15, NULL, NULL, NULL, '2026-03-05 11:54:46.682338-05', 'Reload', 0, NULL, false, NULL, NULL, NULL);
INSERT INTO public.skills VALUES (15, 'Threshold Slip', 'active', NULL, '{}', 'standard', '2026-03-05 19:39:44.425184-05', 'individual', 30, 100, 1.15, NULL, NULL, NULL, '2026-03-05 19:39:44.425184-05', 'Threshold Slip', 1500, 3, true, '{"crit_bonus_pct": {"1": 5, "10": 10, "25": 18, "50": 30, "75": 42, "99": 55}}', 'crit_boost', NULL);
INSERT INTO public.skills VALUES (16, 'Energy Shields', 'active', NULL, '{}', 'standard', '2026-03-05 19:39:44.428818-05', 'individual', 30, 100, 1.15, NULL, NULL, NULL, '2026-03-05 19:39:44.428818-05', 'Energy Shields', 1500, 1, true, '{"damage_reduction_pct": {"1": 3, "10": 8, "25": 14, "50": 22, "75": 30, "99": 40}}', 'damage_reduction', NULL);
INSERT INTO public.skills VALUES (17, 'Akashic Cascade', 'active', NULL, '{}', 'standard', '2026-03-05 19:39:44.429438-05', 'individual', 30, 100, 1.15, NULL, NULL, NULL, '2026-03-05 19:39:44.429438-05', 'Akashic Cascade', 1500, 2, true, '{"aoe_damage_multiplier": {"1": 1.5, "10": 2.0, "25": 3.0, "50": 4.5, "75": 6.0, "99": 8.0}}', 'aoe_burst', NULL);
INSERT INTO public.skills VALUES (18, 'Elder Fury', 'active', NULL, '{}', 'standard', '2026-03-05 19:39:44.429943-05', 'individual', 30, 100, 1.15, NULL, NULL, NULL, '2026-03-05 19:39:44.429943-05', 'Elder Fury', 1500, 4, true, '{"damage_multiplier": {"1": 1.2, "10": 1.5, "25": 2.0, "50": 3.0, "75": 4.5, "99": 7.0}}', 'damage_multiplier', NULL);




-- Data for Name: skill_actions; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.skill_actions VALUES (2, 1, 'scorp_security_drills', 'S Corp Security Drills', 'Training alongside Patrick''s security team in S Corp''s Houston HQ. Corporate bodyguard routines that feel increasingly inadequate as the threats escalate beyond anything in the briefings.', 10, 4000, 18, 2, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (3, 1, 'mom_combat_simulations', 'Combat Simulations at MOM', 'High-tech training at Morgan''s Antarctic R&D facility. Simulation pods model everything from insurgent brigades to entities that appear in no official enemy database.', 22, 5500, 32, 3, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (5, 1, 'elysium_combat_training', 'Elysium Station Combat Training', 'In the exercise decks of S Corp''s space station beyond Earth''s gravity. Equipment that bends light; opponents who train like they''re being watched by something worse than management.', 50, 10000, 90, 5, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (6, 1, 'kuiper_belt_firefight', 'Kuiper Belt Firefight Simulations', 'Recreating the zero-gravity engagement from Aditi and Hiro''s Genesis mission at the edge of the solar system. Two students went in. One came back.', 65, 13000, 140, 6, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (8, 1, 'audit_construct_engagement', 'Engaging the Audit''s Constructs', 'Direct combat against the entities the prison deploys to neutralize awareness threats. Patrick''s replacement is in here somewhere. So is yours, waiting.', 92, 22000, 295, 8, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (11, 2, 'channeling_the_conduits', 'Channeling the Conduits', 'Making contact with the dreamscape''s architecture. The conduits run through everything. Stephen spends weeks just listening to them before Lady A notices him.', 22, 5500, 32, 3, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (12, 2, 'studying_eternal_engine', 'Studying the Eternal Engine', 'Long sessions with the crystalline construct that appeared in Stephen''s deepest dreams. It hums at a frequency that rearranges how you think about energy.', 35, 7500, 58, 4, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (13, 2, 'lady_a_oneiromancy_lessons', 'Lady A''s Oneiromancy Lessons', 'Formal training with Lady Astrael, Oracle of the Void. Burning eyes. No patience for imprecision. She calls you Aspolin and expects you to live up to it.', 48, 10000, 90, 5, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (14, 2, 'quantum_field_harmonization', 'Quantum Field Harmonization', 'Applying the Infinitron''s quantum framework to active energy projection. S Corp''s physics department considers this impossible. You have stopped consulting them.', 62, 13500, 145, 6, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (17, 2, 'madam_osilari_symbol_weaving', 'Madam Osilari''s Symbol Weaving', 'The Madam of Symbols'' robes are equations in motion. You are learning to read the prison''s source code. The symbols do not stop when you close your eyes anymore.', 95, 24000, 355, 9, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (18, 3, 'researching_the_pointers', 'Researching the Pointers', 'The Pointers appeared simultaneously worldwide. Every government has a file. Every file says nothing useful. You build your own theory from scratch using nothing but pattern and noise.', 1, 3000, 10, 1, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (19, 3, 'scorp_research_archives', 'S Corp Research Archives', 'Accessing S Corp''s classified repository: anomalous events, impossible sightings, data that does not fit any existing model. Pattern recognition at a planetary scale.', 12, 4200, 22, 2, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (20, 3, 'infinitron_schematics_study', 'Studying the Infinitron Schematics', 'The crystalline architecture of S Corp''s breakthrough CPU contains more information than it should. Reverse-engineering the reverse-engineering.', 24, 5800, 38, 3, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (22, 3, 'jennifers_journal_analysis', 'Jennifer''s Journal Analysis', 'Whitney''s artifact shifts as you study it. Sections appear that were not there yesterday. The journal parcels out truth as the reader becomes ready to receive it.', 52, 11000, 108, 5, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (24, 3, 'translating_akashic_index', 'Translating the Akashic Index', 'The cosmic library''s index is encoded in pre-linguistic patterns that Stephen''s brain processes as felt knowledge rather than words. Slow work. Occasionally terrifying.', 78, 18500, 230, 7, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (26, 3, 'shepherd_initiative_records', 'Reviewing Shepherd Initiative Records', 'The divine council''s briefing materials for the re-entry program. Benji annotated them in the margins. His annotations are more useful than the official documents themselves.', 95, 26000, 400, 9, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (29, 4, 'nanite_targeting_systems', 'Nanite Targeting Systems', 'Programming S Corp''s nanite swarms for surgical intervention. They operate at the Angstrom scale. You give them a target and they make it not exist anymore.', 26, 6200, 42, 3, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (30, 4, 'algorithmic_heist_planning', 'Algorithmic Heist Planning', 'Covert operations require perfect timing. The Algorithmic Heist chapter was a masterclass in what happens when one variable is miscalculated by a single person.', 40, 8500, 72, 4, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (31, 4, 'genesis_ship_systems', 'Genesis Ship Systems Mastery', 'Operating the precision navigation instruments aboard Aditi''s Genesis in deep space. In the Kuiper Belt, there is no margin for error. Aditi knew this. So did Hiro.', 54, 11500, 115, 5, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (33, 4, 'yaldabaoth_substrate_tracking', 'Tracking Yaldabaoth''s Substrate Pulse', 'The prison emits detectable interference when the demiurge moves through the Substrate. You have learned to read the patterns. The timing has to be exact or the signal collapses.', 82, 19500, 250, 7, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (35, 6, 'tempo_drilling', 'Tempo Drilling', 'Practicing rapid-fire click patterns against construct training dummies. The constructs absorb each strike and reset. Faster. Again. Faster.', 1, 4000, 12, 1, '2026-03-05 19:39:44.440655-05', '2026-03-05 19:39:44.440655-05');
INSERT INTO public.skill_actions VALUES (36, 7, 'resonance_channeling', 'Resonance Channeling', 'Drawing raw energy from the tower''s resonance fields and holding it at peak amplitude. The air crackles. Your hands glow. Release.', 1, 5000, 14, 2, '2026-03-05 19:39:44.450307-05', '2026-03-05 19:39:44.450307-05');
INSERT INTO public.skill_actions VALUES (37, 8, 'probability_mapping', 'Probability Mapping', 'Studying the subtle patterns in construct weak points. Each strike is a data point. Each miss, a lesson. The critical zones reveal themselves.', 1, 4500, 13, 3, '2026-03-05 19:39:44.450941-05', '2026-03-05 19:39:44.450941-05');
INSERT INTO public.skill_actions VALUES (38, 12, 'impact_conditioning', 'Impact Conditioning', 'Striking reinforced tower alloys with increasing force. Your knuckles harden. The metal dents deeper with each session. Power compounds.', 1, 5000, 15, 4, '2026-03-05 19:39:44.451437-05', '2026-03-05 19:39:44.451437-05');
INSERT INTO public.skill_actions VALUES (39, 9, 'lore_excavation', 'Lore Excavation', 'Sifting through ancient tower debris for fragments of pre-collapse technology. Each shard hums with residual energy, guiding you to the next.', 1, 4000, 11, 5, '2026-03-05 19:39:44.452057-05', '2026-03-05 19:39:44.452057-05');
INSERT INTO public.skill_actions VALUES (40, 10, 'transmutation_practice', 'Transmutation Practice', 'Converting base tower materials into refined gold essence. The alchemical process is delicate — too much heat and the gold evaporates. Too little and it stays lead.', 1, 4500, 12, 6, '2026-03-05 19:39:44.452526-05', '2026-03-05 19:39:44.452526-05');
INSERT INTO public.skill_actions VALUES (41, 13, 'power_cycling', 'Power Cycling', 'Routing energy through your body in controlled loops, each cycle amplifying the next. The tower''s ambient hum synchronizes with your heartbeat.', 1, 6000, 16, 7, '2026-03-05 19:39:44.453042-05', '2026-03-05 19:39:44.453042-05');
INSERT INTO public.skill_actions VALUES (42, 14, 'precision_reset_drills', 'Precision Reset Drills', 'Practicing the rapid cooldown-flush technique. Dump residual energy, clear the channels, reinitialize. The faster you reset, the sooner you can strike again.', 1, 7000, 18, 8, '2026-03-05 19:39:44.453554-05', '2026-03-05 19:39:44.453554-05');
INSERT INTO public.skill_actions VALUES (43, 11, 'forbidden_invocations', 'Forbidden Invocations', 'Whispering the old words that the tower builders sealed away. Each syllable costs something. Each repetition costs less. The darkness listens, and it remembers your voice.', 1, 9000, 22, 9, '2026-03-05 19:39:44.454124-05', '2026-03-05 19:39:44.454124-05');
INSERT INTO public.skill_actions VALUES (44, 15, 'walking_the_threshold', 'Walking the Threshold', 'Balancing on the razor edge between dimensions. One foot in reality, one in the drift. The longer you hold the line, the sharper your instincts become.', 1, 5500, 15, 10, '2026-03-05 19:39:44.454565-05', '2026-03-05 19:39:44.454565-05');
INSERT INTO public.skill_actions VALUES (45, 16, 'substrate_reconstruction_drills', 'Substrate Reconstruction Drills', 'Rebuilding micro-barriers from ambient tower substrate. Each layer absorbs more punishment. The shields flicker, stabilize, and hold. Again.', 1, 5500, 15, 11, '2026-03-05 19:39:44.455095-05', '2026-03-05 19:39:44.455095-05');
INSERT INTO public.skill_actions VALUES (46, 17, 'lucid_conduit_channeling', 'Lucid Conduit Channeling', 'Opening yourself as a vessel for the Akashic stream. Raw knowledge floods through you — histories, equations, battle patterns — and you learn to direct the torrent.', 1, 5500, 15, 12, '2026-03-05 19:39:44.455662-05', '2026-03-05 19:39:44.455662-05');
INSERT INTO public.skill_actions VALUES (47, 18, 'channeling_tiamats_coils', 'Channeling Tiamat''s Coils', 'Invoking the primal rage of the Elder serpent. The power is ancient and barely controllable — each session you hold it longer, shape it better, and survive.', 1, 5500, 15, 13, '2026-03-05 19:39:44.456149-05', '2026-03-05 19:39:44.456149-05');
INSERT INTO public.skill_actions VALUES (1, 1, 'shadowboxing_garage', 'Shadowboxing in the Garage', 'Stephen trains alone in his Florida garage — the same space where he reverses-engineers the Eternal Engine. A man preparing for a war he does not yet understand.', 1, 3000, 10, 1, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (4, 1, 'red_hat_brigade_fighting', 'Fighting Red Hat Brigades', 'Direct engagement with Todd''s fundamentalist terror network. Street-level, brutal, and deeply personal — the enemy genuinely believes what they are doing is holy.', 36, 7500, 58, 4, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (7, 1, 'dreamscape_combat_conditioning', 'Dreamscape Combat Conditioning', 'Fighting in the dreamscape itself. Opponents here are not flesh — they are constructs, probability manifolds, the prison''s own immune system given violent form.', 80, 17000, 205, 7, '2026-03-05 11:08:58.701408-05', '2026-03-05 11:08:58.701408-05');
INSERT INTO public.skill_actions VALUES (9, 2, 'lucid_dreaming_practice', 'Lucid Dreaming Practice', 'Entering sleep with the mind lit. The first step. A glimpse of the Threshold — a hallway that should not be there — and then nothing. Repeat until the glimpse holds.', 1, 3000, 10, 1, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (10, 2, 'threshold_navigation', 'Threshold Navigation', 'Learning to move through the liminal space between waking and dreaming. The energy conduits are visible now — massive, thrumming, plugged into something just out of sight.', 10, 4000, 18, 2, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (15, 2, 'akashic_realm_meditation', 'Akashic Realm Meditation', 'Extended sessions in the cosmic library — a space that exists outside the prison''s update cycles. The index alone is longer than your entire life, twice over.', 76, 17500, 215, 7, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (16, 2, 'communing_lady_illkeserod', 'Communing with Lady Illkeserod', 'Deep sessions with the Goddess of Secrets — two fused souls woven from translucent filaments of thought. She does not give you answers. She gives you better questions.', 87, 20000, 270, 8, '2026-03-05 11:08:58.704524-05', '2026-03-05 11:08:58.704524-05');
INSERT INTO public.skill_actions VALUES (21, 3, 'decoding_etheris_architecture', 'Decoding Etheris Architecture', 'Piecing together how the prison was built — its layers, update cycles, maintenance routines. Jennifer''s Journal confirms what Lady A implied: this place has a runtime.', 38, 8000, 68, 4, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (28, 4, 'erb_portal_alignment', 'ERB Portal Alignment', 'Einstein-Rosen Bridge portal targeting. A 0.001% deviation does not mean you miss the destination — it means you never leave the bridge.', 12, 4200, 22, 2, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (23, 3, 'gnostic_cosmology_deep_dive', 'Gnostic Cosmology Deep Dive', 'Yaldabaoth. The Pleroma. The Archons. Ancient texts that were not mythology — they were documentation. Someone knew. Someone wrote it down in the only framework available to them.', 65, 14500, 160, 6, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (25, 3, 'deciphering_madam_o_symbols', 'Deciphering Madam O''s Symbols', 'The Madam of Symbols'' equations do not resolve in any standard mathematics. They describe probability densities for events that have not happened yet — and some that already have.', 88, 22000, 305, 8, '2026-03-05 11:08:58.705311-05', '2026-03-05 11:08:58.705311-05');
INSERT INTO public.skill_actions VALUES (27, 4, 'calibrating_the_infinitron', 'Calibrating the Infinitron', 'The crystalline CPU requires constant fine-tuning at the quantum level. S Corp''s physicists cannot do it — the resonance has to be felt, not measured.', 1, 3000, 10, 1, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (32, 4, 'red_hat_signal_decryption', 'Red Hat Signal Decryption', 'Aditi discovered the Red Hats used shortwave radio — a frequency S Corp had overlooked for years. Precision finds what brute force misses. Every frequency tells a story.', 68, 15000, 175, 6, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');
INSERT INTO public.skill_actions VALUES (34, 4, 'aspolin_strike_calibration', 'Aspolin''s Strike Calibration', 'The divine name carries power, but power without precision is noise. Learning to make every action count — not more force, but perfect direction.', 93, 24000, 330, 8, '2026-03-05 11:08:58.706065-05', '2026-03-05 11:08:58.706065-05');




-- Data for Name: stat_definitions; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.stat_definitions VALUES (1, 'strength', 'Strength', 'integer', NULL, NULL, 'Increases physical damage.', 'combat', '2026-03-01 16:53:10.614584-05', '2026-03-01 16:53:10.614584-05');
INSERT INTO public.stat_definitions VALUES (2, 'agility', 'Agility', 'integer', NULL, NULL, 'Increases attack speed.', 'combat', '2026-03-01 16:53:10.614584-05', '2026-03-01 16:53:10.614584-05');
INSERT INTO public.stat_definitions VALUES (3, 'intelligence', 'Intelligence', 'integer', NULL, NULL, 'Increases mana and skill power.', 'magic', '2026-03-01 16:53:10.614584-05', '2026-03-01 16:53:10.614584-05');
INSERT INTO public.stat_definitions VALUES (4, 'crit_chance', 'Crit Chance', 'percentage', NULL, NULL, 'Chance to deal double damage.', 'combat', '2026-03-01 16:53:10.614584-05', '2026-03-01 16:53:10.614584-05');




-- Data for Name: chat_channels; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.chat_channels VALUES ('global', 'Global Chat', 'global', true, '2026-03-06 13:10:11.219431-05', NULL);




-- Data for Name: class_stat_affinities; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.class_stat_affinities VALUES (1, 3, 1, 15, 0.6000, 1.0000, '2026-03-05 19:39:33.639238-05', '2026-03-05 19:39:33.639238-05');
INSERT INTO public.class_stat_affinities VALUES (2, 3, 2, 10, 0.4000, 0.5000, '2026-03-05 19:39:33.639238-05', '2026-03-05 19:39:33.639238-05');
INSERT INTO public.class_stat_affinities VALUES (3, 3, 3, 5, 0.0000, 0.0000, '2026-03-05 19:39:33.639238-05', '2026-03-05 19:39:33.639238-05');
INSERT INTO public.class_stat_affinities VALUES (4, 1, 1, 5, 0.4000, 0.5000, '2026-03-05 19:39:33.642999-05', '2026-03-05 19:39:33.642999-05');
INSERT INTO public.class_stat_affinities VALUES (5, 1, 2, 15, 0.6000, 1.0000, '2026-03-05 19:39:33.642999-05', '2026-03-05 19:39:33.642999-05');
INSERT INTO public.class_stat_affinities VALUES (6, 1, 3, 10, 0.0000, 0.0000, '2026-03-05 19:39:33.642999-05', '2026-03-05 19:39:33.642999-05');
INSERT INTO public.class_stat_affinities VALUES (7, 2, 1, 5, 0.0000, 0.0000, '2026-03-05 19:39:33.644307-05', '2026-03-05 19:39:33.644307-05');
INSERT INTO public.class_stat_affinities VALUES (8, 2, 2, 10, 0.4000, 0.5000, '2026-03-05 19:39:33.644307-05', '2026-03-05 19:39:33.644307-05');
INSERT INTO public.class_stat_affinities VALUES (9, 2, 3, 15, 0.6000, 1.0000, '2026-03-05 19:39:33.644307-05', '2026-03-05 19:39:33.644307-05');
INSERT INTO public.class_stat_affinities VALUES (10, 4, 1, 10, 0.3300, 0.3300, '2026-03-05 19:39:33.645944-05', '2026-03-05 19:39:33.645944-05');
INSERT INTO public.class_stat_affinities VALUES (11, 4, 2, 10, 0.3300, 0.3300, '2026-03-05 19:39:33.645944-05', '2026-03-05 19:39:33.645944-05');
INSERT INTO public.class_stat_affinities VALUES (12, 4, 3, 10, 0.3400, 0.3400, '2026-03-05 19:39:33.645944-05', '2026-03-05 19:39:33.645944-05');




-- Data for Name: difficulty_presets; Type: TABLE DATA; Schema: public; Owner: -





-- Data for Name: shard_packages; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.shard_packages VALUES (1, 'starter', 'Starter Pack', NULL, 99, 100, 0, 100, 1, true, false, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');
INSERT INTO public.shard_packages VALUES (2, 'small', 'Small Pack', NULL, 499, 500, 5, 525, 2, true, false, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');
INSERT INTO public.shard_packages VALUES (3, 'medium', 'Medium Pack', NULL, 999, 1000, 10, 1100, 3, true, false, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');
INSERT INTO public.shard_packages VALUES (4, 'large', 'Large Pack', NULL, 2499, 2500, 12, 2800, 4, true, false, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');
INSERT INTO public.shard_packages VALUES (5, 'premium', 'Premium Pack', NULL, 4999, 5000, 20, 6000, 5, true, false, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');
INSERT INTO public.shard_packages VALUES (6, 'ultimate', 'Ultimate Pack', NULL, 9999, 10000, 30, 13000, 6, true, true, NULL, '2026-03-10 17:31:50.760947-04', '2026-03-10 17:31:50.760947-04');




-- Data for Name: entity_types; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entity_types VALUES (1, 'enemy', 'Enemy', 'Hostile combat entity', '#FF4444', 1, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (2, 'creature', 'Creature', 'Living non-humanoid entity', '#44AA44', 2, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (3, 'character', 'Character', 'Named humanoid or sentient entity', '#4488FF', 3, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (4, 'manifestation', 'Manifestation', 'Ethereal or metaphysical entity', '#AA44FF', 4, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (5, 'object', 'Object', 'Inanimate significant object', '#AAAAAA', 5, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (6, 'group', 'Group', 'Collective or faction entity', '#FFAA44', 6, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (7, 'environment', 'Environment', 'Environmental hazard or feature', '#44AAAA', 7, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (8, 'event', 'Event', 'Narrative event or occurrence', '#FF44AA', 8, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');
INSERT INTO public.entity_types VALUES (9, 'other', 'Other', 'Uncategorized entity', '#888888', 9, '2026-03-14 18:06:15.112419-04', '2026-03-14 18:06:15.112419-04');




-- Data for Name: game_configs; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.game_configs VALUES ('idle_offline_cap_hours', '24', 'Maximum offline training hours calculated on player return. Progress beyond this cap is discarded.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_drain_per_minute', '0.5', 'Elysium Essence drained per minute of active idle training. Configurable for economy balance.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_xp_full_threshold', '0.75', 'Essence % (0.0-1.0) above which XP is earned at 100% rate.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_xp_mid_threshold', '0.40', 'Essence % (0.0-1.0) above which XP is earned at 75% rate (below full threshold).', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_xp_low_threshold', '0.15', 'Essence % (0.0-1.0) above which XP is earned at 50% rate (below mid threshold).', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_xp_critical_threshold', '0.01', 'Essence % (0.0-1.0) above which XP is earned at 25% rate (below low threshold). Below this = 10% floor.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_xp_floor_rate', '0.10', 'Minimum XP rate multiplier when Essence is at 0%. Training never fully halts.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_active_mode_boss_interval', '10', 'Number of waves between boss spawns in the Idle Training Active Mode mini-game.', '2026-03-05 19:39:33.689876-05', 'training', 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.', NULL);
INSERT INTO public.game_configs VALUES ('idle_to_char_xp_ratio', '0.1', 'Fraction of idle training XP that converts to Character XP. 0.1 = 1 char XP per 10 idle XP. Idle training is the primary char XP engine.', '2026-03-05 19:39:33.690987-05', 'progression', 'Character level accumulation rate. Affects player_characters.character_xp accrual on idle level events.', NULL);
INSERT INTO public.game_configs VALUES ('char_level_xp_factor', '80', 'Quadratic curve factor K. XP to reach level N = K × N². Default 80 (tuned for ~60h casual).', '2026-03-05 19:39:33.690987-05', 'progression', 'Character level thresholds. Changing this shifts all level breakpoints. Affects character sheet level bar.', NULL);
INSERT INTO public.game_configs VALUES ('char_level_cap', '99', 'Maximum attainable character level. Currently 99.', '2026-03-05 19:39:33.690987-05', 'progression', 'Hard cap on player_characters.level. Affects XP accrual halt and character sheet display.', NULL);
INSERT INTO public.game_configs VALUES ('click_rate_cap', '20', 'Maximum allowed clicks per second before flagging/throttling.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('hp_scaling_factor', '1.55', 'The exponential base for monster HP scaling across zones.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('primal_boss_chance', '0.25', 'Probability (0.0-1.0) of a boss being Primal (Essence reward).', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('crit_multiplier', '2.0', 'Default damage multiplier for critical hits.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('wave_duration_seconds', '30', 'Seconds of audio duration required per monster wave.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('base_auto_dps_tick_ms', '500', 'Interval in milliseconds at which auto-DPS is applied on the client. Server validates via batch tick.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('boss_enrage_seconds', '30', 'Seconds before a zone boss enrages and deals massive damage.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('boss_zone_interval', '5', 'Every Nth zone is a boss zone.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('session_gold_multiplier', '1.0', 'Global multiplier for session gold drops.', '2026-03-05 22:00:12.060096-05', 'economy', 'Session reward scaling.', NULL);
INSERT INTO public.game_configs VALUES ('first_clear_multiplier', '1.5', 'Multiplier applied to Essence rewards for the first time a scene is completed.', '2026-03-05 22:00:12.060096-05', 'economy', 'Session reward scaling.', NULL);
INSERT INTO public.game_configs VALUES ('upgrade_cost_scaling', '1.03', 'Exponential cost multiplier per upgrade level (1.03^L).', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('cd_reduction_per_level', '0.05', 'Cooldown reduction percentage per skill level.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('max_cd_reduction', '0.7', 'Maximum possible cooldown reduction (e.g. 0.7 = 70% off).', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('base_click_upgrade_cost', '10.0', 'Base gold cost for Click Damage level 1.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('base_auto_dps_upgrade_cost', '25.0', 'Base gold cost for Auto-DPS level 1.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('base_skill_unlock_cost', '50.0', 'Base gold cost to unlock a skill (multiplied by skill base cost).', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('idle_essence_capacity', '1000', 'Base Elysium Essence capacity for idle training stability calculation. Overflows are allowed but stability caps at 100%.', '2026-03-05 22:00:12.060954-05', 'training', 'Idle training tuning.', NULL);
INSERT INTO public.game_configs VALUES ('default_player_wpm', '200', 'Default words-per-minute for narrative delay calculations when no user preference is set.', '2026-03-05 22:00:12.061331-05', 'ui', 'Player experience / UI defaults.', NULL);
INSERT INTO public.game_configs VALUES ('char_xp_per_scene_base', '200', 'Flat Character XP awarded per Story Mode scene completion. Multiplied by scene difficulty modifier.', '2026-03-05 19:39:33.690987-05', 'progression', 'Character XP from story play. Affects character level accumulation for active (non-idle) players.', NULL);
INSERT INTO public.game_configs VALUES ('lore_pool_coefficient', '0.6', 'Multiplier applied to Lore level to determine the bonus stat pool: pool = floor(lore_level × coeff).', '2026-03-05 19:39:33.690987-05', 'progression', 'Lore idle skill stat distribution. Affects character_stats recalculation for Lore contributions.', NULL);
INSERT INTO public.game_configs VALUES ('run_achievement_config', '{"achievements": [{"id": "speed_completion", "display": "Swift Passage", "description": "Complete the scene run in under N minutes", "threshold_type": "completion_time_seconds", "drop_chance_pct": 15, "threshold_value": 300}, {"id": "enemy_slayer", "display": "Enemy Slayer", "description": "Defeat N or more enemies in a single run", "threshold_type": "enemies_killed", "drop_chance_pct": 10, "threshold_value": 100}, {"id": "wave_climber", "display": "Wave Climber", "description": "Reach wave N or higher", "threshold_type": "max_wave_reached", "drop_chance_pct": 12, "threshold_value": 50}, {"id": "perfect_run", "display": "Flawless Execution", "description": "Complete without dying", "threshold_type": "death_count", "drop_chance_pct": 20, "threshold_value": 0}, {"id": "boss_slayer", "display": "Boss Slayer", "description": "Defeat the scene boss", "threshold_type": "boss_killed", "drop_chance_pct": 25, "threshold_value": 1}, {"id": "personal_best", "display": "High Tide", "description": "Reach a personal best wave for this scene", "threshold_type": "personal_best_wave", "drop_chance_pct": 8, "threshold_value": 1}]}', 'Run completion achievement thresholds and drop chance percentages for Dream Items.', '2026-03-05 19:39:33.690987-05', 'drops', 'Dream Item drop system. Evaluated on every POST /api/game/story/complete-scene call.', NULL);
INSERT INTO public.game_configs VALUES ('rarity_weight_book_1', '{"epic": 4, "rare": 10, "common": 60, "cosmic": 1, "uncommon": 25}', 'Dream Item rarity drop weights for Book 1 chapters. Values are relative weights (not %).', '2026-03-05 19:39:33.690987-05', 'drops', 'Item rarity distribution in Book 1 scenes. Used by Dream Item generator on scene completion.', NULL);
INSERT INTO public.game_configs VALUES ('rarity_weight_book_2', '{"epic": 7, "rare": 14, "common": 50, "cosmic": 2, "uncommon": 27}', 'Dream Item rarity drop weights for Book 2 chapters.', '2026-03-05 19:39:33.690987-05', 'drops', 'Item rarity distribution in Book 2 scenes.', NULL);
INSERT INTO public.game_configs VALUES ('rarity_weight_book_3', '{"epic": 10, "rare": 18, "common": 40, "cosmic": 4, "uncommon": 28}', 'Dream Item rarity drop weights for Book 3 chapters.', '2026-03-05 19:39:33.690987-05', 'drops', 'Item rarity distribution in Book 3 scenes.', NULL);
INSERT INTO public.game_configs VALUES ('str_damage_coefficient', '0.02', '+2% click damage per STR point.', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode click damage formula. Affects CombatStage click damage calculation.', NULL);
INSERT INTO public.game_configs VALUES ('str_resistance_coefficient', '0.5', '0.5 flat damage reduction per STR point from boss attacks.', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode incoming damage reduction. Affects BossStage damage calculation.', NULL);
INSERT INTO public.game_configs VALUES ('agi_speed_coefficient', '0.015', '+1.5% auto-DPS per AGI point.', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode auto-DPS multiplier. Affects CombatStage auto-attack tick.', NULL);
INSERT INTO public.game_configs VALUES ('agi_crit_coefficient', '0.003', '+0.3% crit chance per AGI point.', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode crit chance. Affects CombatStage critical hit roll.', NULL);
INSERT INTO public.game_configs VALUES ('int_power_coefficient', '0.02', '+2% skill power per INT point.', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode hotbar skill damage/effect scaling. Affects SkillsHotbar activation.', NULL);
INSERT INTO public.game_configs VALUES ('int_cooldown_coefficient', '0.005', '-0.5% cooldown per INT point (min 50% of base).', '2026-03-05 19:39:33.692233-05', 'combat', 'Story Mode skill cooldown reduction. Affects SkillsHotbar cooldown timers.', NULL);
INSERT INTO public.game_configs VALUES ('gold_to_essence_base_rate', '200', 'The initial amount of gold required to earn 1 unit of Essence at Zone 1.', '2026-03-05 22:00:12.049474-05', 'economy', 'Economy conversion rate. Affects post-run Essence rewards.', NULL);
INSERT INTO public.game_configs VALUES ('gold_to_essence_growth_factor', '1.01', 'The exponential growth of the conversion rate per zone.', '2026-03-05 22:00:12.049474-05', 'economy', 'Economy scaling. Higher values make Essence harder to earn in later zones.', NULL);
INSERT INTO public.game_configs VALUES ('monsters_per_zone', '10', 'Number of minions to defeat before a boss or zone completion.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('crit_chance', '0.02', 'Base probability (0.0-1.0) of a critical hit.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('auto_dps_tick_ms', '500', 'Interval in milliseconds between auto-damage applications.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('gcd_ms', '1000', 'Global Cooldown in milliseconds after using any active skill.', '2026-03-05 22:00:12.058145-05', 'combat', 'Combat timing and feel.', NULL);
INSERT INTO public.game_configs VALUES ('base_skill_level_upgrade_cost', '100.0', 'Base gold cost to upgrade an unlocked skill.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('milestone_interval', '25', 'Levels between big damage multiplier spikes.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('milestone_start', '200', 'Level at which damage multiplier spikes begin.', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('click_dmg_mult_per_level', '0.05', 'Base multiplier added per Click Damage level (e.g. 0.05 = +5%).', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('auto_dps_mult_per_level', '0.05', 'Base multiplier added per Auto-DPS level (e.g. 0.05 = +5%).', '2026-03-05 22:00:12.060492-05', 'upgrades', 'In-session upgrade cost and power scaling.', NULL);
INSERT INTO public.game_configs VALUES ('gear_slot_weights_combat', '{"back": 4, "feet": 6, "head": 8, "legs": 8, "neck": 4, "chest": 10, "hands": 6, "waist": 3, "trinket": 3, "wrist_1": 3, "wrist_2": 3, "finger_1": 3, "finger_2": 3, "off_hand": 10, "main_hand": 20, "shoulders": 6}', 'Gear slot weights for combat scenes', '2026-03-05 22:42:46.807585-05', 'drops', 'Controls which gear slot drops in combat scenes', NULL);
INSERT INTO public.game_configs VALUES ('gear_slot_weights_narrative', '{"back": 6, "feet": 6, "head": 8, "legs": 6, "neck": 6, "chest": 8, "hands": 6, "waist": 4, "trinket": 8, "wrist_1": 4, "wrist_2": 4, "finger_1": 5, "finger_2": 5, "off_hand": 8, "main_hand": 10, "shoulders": 6}', 'Gear slot weights for narrative scenes', '2026-03-05 22:42:46.807585-05', 'drops', 'Controls which gear slot drops in narrative scenes', NULL);
INSERT INTO public.game_configs VALUES ('wave_validation_tolerance', '2.0', 'Multiplier buffer on theoretical DPS ceiling for wave validation', '2026-03-06 13:09:57.578617-05', 'anti-cheat', NULL, NULL);
INSERT INTO public.game_configs VALUES ('session_gold_tolerance', '3.0', 'Multiplier buffer for session gold plausibility at /complete', '2026-03-06 13:09:57.578617-05', 'anti-cheat', NULL, NULL);
INSERT INTO public.game_configs VALUES ('cps_warning_threshold_seconds', '5', 'Seconds of sustained CPS violations before UI toast warning', '2026-03-06 13:09:57.578617-05', 'anti-cheat', NULL, NULL);
INSERT INTO public.game_configs VALUES ('cps_warning_cooldown_seconds', '10', 'Seconds of valid CPS before clearing warning state', '2026-03-06 13:09:57.578617-05', 'anti-cheat', NULL, NULL);
INSERT INTO public.game_configs VALUES ('codex_rank_e', '1', 'Kills required for Codex Rank E (name + image + basic lore)', '2026-03-06 13:10:08.249961-05', 'discovery', NULL, NULL);
INSERT INTO public.game_configs VALUES ('codex_rank_c', '25', 'Kills required for Codex Rank C (base HP + gold drops)', '2026-03-06 13:10:08.249961-05', 'discovery', NULL, NULL);
INSERT INTO public.game_configs VALUES ('codex_rank_a', '100', 'Kills required for Codex Rank A (full stat block)', '2026-03-06 13:10:08.249961-05', 'discovery', NULL, NULL);
INSERT INTO public.game_configs VALUES ('codex_rank_ss', '500', 'Kills required for Codex Rank SS (hidden lore + completion badge)', '2026-03-06 13:10:08.249961-05', 'discovery', NULL, NULL);
INSERT INTO public.game_configs VALUES ('rare_spawn_base_chance', '0.005', 'Base probability (0.5%) per wave for a rare entity spawn', '2026-03-06 13:10:08.249961-05', 'discovery', NULL, NULL);
INSERT INTO public.game_configs VALUES ('chat_buffer_size', '200', 'Max messages held in the in-memory chat buffer', '2026-03-06 13:10:11.220573-05', 'social', NULL, NULL);
INSERT INTO public.game_configs VALUES ('chat_rate_limit_per_minute', '20', 'Max chat messages per player per minute', '2026-03-06 13:10:11.220573-05', 'social', NULL, NULL);
INSERT INTO public.game_configs VALUES ('chat_heartbeat_interval_s', '30', 'Server WebSocket ping interval in seconds', '2026-03-06 13:10:11.220573-05', 'social', NULL, NULL);
INSERT INTO public.game_configs VALUES ('broadcast_rarity_min', '4', 'Min item rarity level for system broadcast to global chat', '2026-03-06 13:10:11.220573-05', 'social', NULL, NULL);
INSERT INTO public.game_configs VALUES ('broadcast_rate_limit_per_minute', '10', 'Max system broadcasts per minute (global)', '2026-03-06 13:10:11.220573-05', 'social', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_gen_drop_chance_scene', '0.05', 'Base drop chance for generated artifact on scene complete', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_gen_drop_chance_boss', '0.15', 'Base drop chance for generated artifact on boss kill', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_gen_drop_chance_mastery', '0.30', 'Base drop chance for generated artifact on chapter mastery', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_rarity_weight_book_1', '{"epic": 1.8, "rare": 8, "common": 70, "cosmic": 0.2, "uncommon": 20}', 'Rarity weights for generated artifacts in Book 1', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_rarity_weight_book_2', '{"epic": 3.5, "rare": 11, "common": 60, "cosmic": 0.5, "uncommon": 25}', 'Rarity weights for generated artifacts in Book 2', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_rarity_weight_book_3', '{"epic": 6, "rare": 15, "common": 50, "cosmic": 2, "uncommon": 27}', 'Rarity weights for generated artifacts in Book 3', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('artifact_rarity_stat_multiplier', '{"epic": 2.0, "rare": 1.5, "common": 1.0, "cosmic": 3.0, "uncommon": 1.2}', 'Stat multiplier per rarity tier for generated artifacts', '2026-03-09 12:41:01.642429-04', 'artifacts', NULL, NULL);
INSERT INTO public.game_configs VALUES ('leaderboard_refresh_interval_min', '5', 'Minutes between leaderboard cache refresh', '2026-03-09 12:41:01.642429-04', 'leaderboard', NULL, NULL);
INSERT INTO public.game_configs VALUES ('leaderboard_top_n', '100', 'Number of entries to cache per leaderboard category', '2026-03-09 12:41:01.642429-04', 'leaderboard', NULL, NULL);
INSERT INTO public.game_configs VALUES ('achievement_milestone_essence_25', '50', 'Essence reward for Level 25 idle training milestone', '2026-03-09 12:41:01.642429-04', 'achievements', NULL, NULL);
INSERT INTO public.game_configs VALUES ('achievement_milestone_essence_50', '200', 'Essence reward for Level 50 idle training milestone', '2026-03-09 12:41:01.642429-04', 'achievements', NULL, NULL);
INSERT INTO public.game_configs VALUES ('achievement_milestone_essence_75', '500', 'Essence reward for Level 75 idle training milestone', '2026-03-09 12:41:01.642429-04', 'achievements', NULL, NULL);
INSERT INTO public.game_configs VALUES ('achievement_milestone_essence_99', '2000', 'Essence reward for Level 99 idle training milestone', '2026-03-09 12:41:01.642429-04', 'achievements', NULL, NULL);
INSERT INTO public.game_configs VALUES ('stripe_first_purchase_multiplier', '2', 'Multiplier for first shard purchase bonus', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('payment_poll_max_attempts', '20', 'Max frontend polling attempts after checkout', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('payment_poll_interval_ms', '3000', 'Frontend polling interval in milliseconds', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('reconciliation_lookback_hours', '48', 'Hours to look back in reconciliation jobs', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('checkout_expiration_minutes', '30', 'Stripe Checkout Session expiration time', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('refund_eligible_days', '14', 'Days after purchase a self-service refund is available', '2026-03-10 17:31:50.760947-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('stripe_ascendant_monthly_price_id', '""', 'Stripe Price ID for Ascendant monthly plan', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('stripe_ascendant_annual_price_id', '""', 'Stripe Price ID for Ascendant annual plan', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_base_stipend_shards', '150', 'Monthly shard stipend base amount', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_base_xp_boost', '0.15', 'Base XP multiplier bonus (e.g., 0.15 = +15%)', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_base_essence_boost', '0.15', 'Base Essence multiplier bonus', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_base_drop_boost', '0.10', 'Base artifact drop rate multiplier bonus', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_base_training_boost', '0.10', 'Base idle training speed bonus', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_streak_bonuses', '[{"months": 3, "xp_bonus": 0.05, "drop_bonus": 0, "essence_bonus": 0.05, "stipend_bonus": 0, "training_bonus": 0}, {"months": 6, "xp_bonus": 0.05, "drop_bonus": 0.05, "essence_bonus": 0.05, "stipend_bonus": 0, "training_bonus": 0}, {"months": 12, "xp_bonus": 0.05, "drop_bonus": 0.05, "essence_bonus": 0.05, "stipend_bonus": 0, "training_bonus": 0}, {"months": 24, "xp_bonus": 0, "drop_bonus": 0, "essence_bonus": 0, "stipend_bonus": 50, "training_bonus": 0.05}, {"months": 36, "xp_bonus": 0, "drop_bonus": 0, "essence_bonus": 0, "stipend_bonus": 50, "training_bonus": 0}]', 'Continuous streak bonus milestones (JSON array)', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_cumulative_milestones', '[{"months": 1, "reward_type": "title", "reward_value": "the_patron"}, {"months": 6, "reward_type": "title", "reward_value": "the_devoted"}, {"months": 12, "reward_type": "title", "reward_value": "the_eternal_ascendant"}, {"months": 24, "reward_type": "title", "reward_value": "architect_of_elysium"}, {"months": 36, "reward_type": "title", "reward_value": "voidwalker_ascendant"}, {"months": 48, "reward_type": "title", "reward_value": "keeper_of_the_spire"}, {"months": 60, "reward_type": "title", "reward_value": "elysium_incarnate"}]', 'Cumulative month milestone rewards (JSON array)', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('subscription_custom_holidays', '[]', 'Additional holiday dates for grace period (JSON array of ISO date strings)', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('gift_counts_toward_loyalty', '"false"', 'Whether admin-gifted periods count toward loyalty counters', '2026-03-11 18:48:13.444006-04', 'subscription', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_1hr_price', '75', 'Default price in shards for 1-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_8hr_price', '400', 'Default price in shards for 8-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_24hr_price', '900', 'Default price in shards for 24-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_1hr_magnitude', '1.25', 'Multiplier value for 1-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_8hr_magnitude', '1.5', 'Multiplier value for 8-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_24hr_magnitude', '2.0', 'Multiplier value for 24-hour boosters', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_bundle_default_discount', '20', 'Default bundle discount percentage', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_ping_interval_s', '30', 'Frontend booster ping interval in seconds', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('shop_booster_max_elapsed_per_ping', '60', 'Max elapsed seconds accepted per ping (anti-cheat clamp)', '2026-03-12 14:18:02.523807-04', 'economy', NULL, NULL);
INSERT INTO public.game_configs VALUES ('donation_min_cents', '100', 'Minimum donation amount in cents', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_tier_bronze_cents', '500', 'Cumulative cents for Bronze Patron', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_tier_silver_cents', '2500', 'Cumulative cents for Silver Patron', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_tier_gold_cents', '10000', 'Cumulative cents for Gold Patron', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_tier_diamond_cents', '50000', 'Cumulative cents for Diamond Patron', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_diamond_star_increment', '50000', 'Additional cents per Diamond star', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('patron_diamond_star_display_cap', '5', 'Maximum stars shown in UI', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('donor_leaderboard_size', '50', 'Maximum entries on donor leaderboard', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('recent_donors_count', '5', 'Number of recent donors in rotating banner', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('recent_donors_window_days', '7', 'Days to look back for recent donors', '2026-03-12 15:22:43.926666-04', 'donations', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_tax_rate', '"0.05"', 'Transaction tax rate (5%), deducted from seller proceeds, burned', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_listing_duration_hours', '"24"', 'Listing duration in hours before expiry', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_base_listing_slots', '"3"', 'Default listing slots per player', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_max_listing_slots', '"10"', 'Hard cap on listing slots (3 base + 7 permits)', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_min_listing_price', '"1"', 'Minimum listing price in Shards', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('marketplace_notification_retention_days', '"30"', 'Days to retain read marketplace notifications before purge', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('bazaar_permit_base_price', '"200"', 'Price of first Bazaar Permit (Shard) — doubles per tier', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('bazaar_permit_price_multiplier', '"2.0"', 'Price multiplier per subsequent permit purchase', '2026-03-12 17:19:18.946576-04', 'marketplace', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_equipment_common_essence', '"5"', 'Base Essence for salvaging Common equipment', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_equipment_uncommon_essence', '"15"', 'Base Essence for salvaging Uncommon equipment', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_equipment_rare_essence', '"50"', 'Base Essence for salvaging Rare equipment', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_equipment_epic_essence', '"150"', 'Base Essence for salvaging Epic equipment', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_equipment_legendary_essence', '"500"', 'Base Essence for salvaging Legendary/Cosmic equipment/artifacts', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_artifact_multiplier', '"2.0"', 'Multiplier for artifact salvage vs equipment base rate', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('salvage_curated_bonus_multiplier', '"1.15"', 'Additional bonus multiplier for curated artifact salvage', '2026-03-12 17:19:18.946576-04', 'salvage', NULL, NULL);
INSERT INTO public.game_configs VALUES ('anomaly_price_multiplier_threshold', '"10"', 'Price multiplier above rolling average to flag as anomaly', '2026-03-12 18:21:11.35097-04', 'marketplace_anomaly', NULL, NULL);
INSERT INTO public.game_configs VALUES ('anomaly_rapid_relist_count', '"5"', 'Number of relists within window to flag as rapid relist', '2026-03-12 18:21:11.35097-04', 'marketplace_anomaly', NULL, NULL);
INSERT INTO public.game_configs VALUES ('anomaly_rapid_relist_window_minutes', '"60"', 'Time window in minutes for rapid relist detection', '2026-03-12 18:21:11.35097-04', 'marketplace_anomaly', NULL, NULL);
INSERT INTO public.game_configs VALUES ('anomaly_wash_trade_count', '"3"', 'Number of trades between same pair within window to flag as wash trade', '2026-03-12 18:21:11.35097-04', 'marketplace_anomaly', NULL, NULL);
INSERT INTO public.game_configs VALUES ('anomaly_wash_trade_window_hours', '"24"', 'Time window in hours for wash trade detection', '2026-03-12 18:21:11.35097-04', 'marketplace_anomaly', NULL, NULL);
INSERT INTO public.game_configs VALUES ('wave_default_max_enemies', '5', 'Default max enemies per wave when no scene/chapter/book config exists', '2026-03-15 16:04:28.136831-04', 'waves', 'Controls baseline enemy density for unconfigured scenes', NULL);
INSERT INTO public.game_configs VALUES ('wave_default_wave_count', '10', 'Default number of waves per scene when no config exists', '2026-03-15 16:04:28.136831-04', 'waves', 'Controls baseline wave count for unconfigured scenes', NULL);
INSERT INTO public.game_configs VALUES ('wave_default_spawn_interval_ms', '2000', 'Default spawn interval in milliseconds when no config exists', '2026-03-15 16:04:28.136831-04', 'waves', 'Controls baseline enemy spawn timing for unconfigured scenes', NULL);
INSERT INTO public.game_configs VALUES ('wave_default_spawn_pattern', '"uniform"', 'Default spawn pattern when no config exists. Values: uniform, front_loaded, crescendo, random', '2026-03-15 16:04:28.136831-04', 'waves', 'Controls baseline enemy distribution pattern for unconfigured scenes', NULL);




-- Data for Name: gear_slots; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.gear_slots VALUES (1, 'main_hand', 'Main Hand', 'Primary weapon hand. Equips swords, emitters, staves, and other offensive instruments.', 12, '2026-03-05 20:58:05.123136-05', 7);
INSERT INTO public.gear_slots VALUES (2, 'chest', 'Chest', 'Core body armor. Provides the bulk of defensive capability.', 4, '2026-03-05 20:58:05.123136-05', 3);
INSERT INTO public.gear_slots VALUES (4, 'head', 'Head', 'Cranial protection and neural enhancement. Helmets, visors, and mind-shields.', 1, '2026-03-05 22:40:08.882121-05', 6);
INSERT INTO public.gear_slots VALUES (5, 'neck', 'Neck', 'Necklaces, amulets, and conduit chains. Channels ambient Akashic energy.', 2, '2026-03-05 22:40:08.882121-05', NULL);
INSERT INTO public.gear_slots VALUES (6, 'shoulders', 'Shoulders', 'Pauldrons and energy emitter mounts. Provides structural support and style.', 3, '2026-03-05 22:40:08.882121-05', 5);
INSERT INTO public.gear_slots VALUES (7, 'hands', 'Hands', 'Gauntlets, gloves, and haptic interfaces. Enhances grip and energy channeling.', 5, '2026-03-05 22:40:08.882121-05', 4);
INSERT INTO public.gear_slots VALUES (8, 'wrist_1', 'Wrist (L)', 'Left wrist bracelet or data band. Compact enhancement slot.', 6, '2026-03-05 22:40:08.882121-05', NULL);
INSERT INTO public.gear_slots VALUES (9, 'wrist_2', 'Wrist (R)', 'Right wrist bracelet or data band. Compact enhancement slot.', 7, '2026-03-05 22:40:08.882121-05', NULL);
INSERT INTO public.gear_slots VALUES (10, 'finger_1', 'Ring (L)', 'Left hand ring. Small but potent enhancement — often Akashic-infused.', 8, '2026-03-05 22:40:08.882121-05', NULL);
INSERT INTO public.gear_slots VALUES (11, 'finger_2', 'Ring (R)', 'Right hand ring. Small but potent enhancement — often Akashic-infused.', 9, '2026-03-05 22:40:08.882121-05', NULL);
INSERT INTO public.gear_slots VALUES (12, 'legs', 'Legs', 'Leg armor and exoskeleton components. Mobility and structural defense.', 10, '2026-03-05 22:40:08.882121-05', 2);
INSERT INTO public.gear_slots VALUES (13, 'feet', 'Feet', 'Boots and stabilizer platforms. Ground-contact enhancement and movement speed.', 11, '2026-03-05 22:40:08.882121-05', 2);
INSERT INTO public.gear_slots VALUES (14, 'off_hand', 'Off Hand', 'Secondary hand — shields, focus orbs, or dual-wield weapons.', 13, '2026-03-05 22:40:08.882121-05', 7);
INSERT INTO public.gear_slots VALUES (15, 'back', 'Back', 'Cloaks, jetpacks, and energy wings. Provides passive aura effects.', 14, '2026-03-05 22:40:08.882121-05', 1);
INSERT INTO public.gear_slots VALUES (16, 'waist', 'Waist', 'Belts and utility harnesses. Compact storage and stat augmentation.', 16, '2026-03-05 22:40:08.882121-05', 3);
INSERT INTO public.gear_slots VALUES (3, 'trinket', 'Trinket', 'Passive enhancement accessory. Boosts Intelligence and provides unique effects.', 15, '2026-03-05 20:58:05.123136-05', NULL);




-- Data for Name: idle_skill_stat_contributions; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.idle_skill_stat_contributions VALUES (1, 1, 1, 0.5000, 'Attack level × 0.5 → Strength (click damage floor)', '2026-03-05 19:39:33.626144-05', '2026-03-05 19:39:33.626144-05');
INSERT INTO public.idle_skill_stat_contributions VALUES (2, 4, 2, 0.5000, 'Precision level × 0.5 → Agility (crit chance and speed)', '2026-03-05 19:39:33.635673-05', '2026-03-05 19:39:33.635673-05');
INSERT INTO public.idle_skill_stat_contributions VALUES (3, 2, 3, 0.5000, 'Magic level × 0.5 → Intelligence (skill power and cooldowns)', '2026-03-05 19:39:33.638459-05', '2026-03-05 19:39:33.638459-05');




-- Data for Name: item_lore_tags; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.item_lore_tags VALUES (1, 'INFTR', 'Infinitron', 'S Corp''s quantum CPU breakthrough — the crystalline resonance engine', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (2, 'THRSH', 'Threshold', 'The liminal dreamscape transit space between waking and the Akashic realm', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (3, 'DRMS', 'Dreamscape', 'The Akashic dream realm — the cognitive layer of the prison', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (4, 'ETHRS', 'Etheris', 'The cosmic Etheris architecture — the prison''s outer shell', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (5, 'AKSIC', 'Akashic', 'The Akashic Index — the cosmic library existing outside update cycles', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (6, 'SBSTR', 'Substrate', 'The prison''s physical substrate — where Yaldabaoth moves and maintains', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (7, 'CNDUT', 'Conduit', 'The energy conduits Lady A channels — massive, thrumming, cosmic', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (8, 'SHPRD', 'Shepherd', 'The Shepherd Initiative — the divine council''s re-entry program', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (9, 'PNTR', 'Pointer', 'The global Pointer phenomenon — simultaneous worldwide appearance', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (10, 'ASPLN', 'Aspolin', 'Stephen''s divine name — the identity he carries into the Akashic realm', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (11, 'RDHTT', 'Red Hat', 'Todd''s Red Hat Brigade — fundamentalist terror constructs', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (12, 'GNESS', 'Genesis', 'Aditi and Hiro''s deep-space Genesis ship — edge of the solar system', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (13, 'MRGN', 'Morgan', 'Morgan''s Antarctic R&D facility (MOM) — simulation and training', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (14, 'LADYA', 'Lady A', 'Lady Astrael, Oracle of the Void — burning eyes, no patience for imprecision', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (15, 'YLDBT', 'Yaldabaoth', 'The demiurge — governor and architect of the cosmic prison', '2026-03-05 20:58:05.141713-05');
INSERT INTO public.item_lore_tags VALUES (16, 'ELYSM', 'Elysium', 'The space station Elysium — humanity''s foothold beyond Earth, crowned jewel of S Corp', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (17, 'ENGNR', 'Engineer', 'The Engineer class — those who hear the Eternal Engine''s rhythm and rebuild reality', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (18, 'VSSEL', 'Vessel', 'The Vessel class — channels of remnant power from the Thirteen Ascended', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (19, 'DRFTR', 'Drifter', 'The Drifter class — memory-walkers who navigate spaces between realities', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (20, 'CNDTC', 'Conduit', 'The Conduit class — raw cosmic energy channels, reality warpers', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (21, 'SCRPS', 'S Corp', 'Stephen''s tech empire — from Infinitron to interstellar colonization', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (22, 'STPHN', 'Aspolin', 'Stephen''s divine name — the identity he carries into the Akashic realm', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (23, 'ETRNE', 'Engine', 'The Eternal Engine — the dream-born crystalline power source of impossible design', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (24, 'THRSN', 'Thirteen', 'The Thirteen Ascended — elder cosmic entities imprisoned alongside humanity', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (25, 'SRHND', 'Sorhhinda', 'Colony world Sorhhinda — a sanctuary among the stars, 500 years of civilization', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (26, 'PTRIK', 'Patrick', 'Patrick''s security protocols — loyal, aggressive, pragmatic defense', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (27, 'MRGNS', 'Morgan', 'Morgan''s scientific genius — astrophysicist, MOM facility, nanite integration', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (28, 'ADITI', 'Aditi', 'Aditi''s courage — hijacked Genesis ship, discovered Red Hat weakness', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (29, 'FRANK', 'Frank', 'Frank the janitor — blue-collar perspective aboard Elysium, married to Pete', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (30, 'PNTRS', 'Pointers', 'The global Pointer phenomenon — silent figures appearing worldwide pointing skyward', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (31, 'MNDLE', 'Mandela', 'The Mandela Effect — not a glitch but a feature of the prison, reality overwrites', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (32, 'DRMON', 'Paimon', 'Dr. On (Pai M. On) — S Corp psychiatrist turned Red Hat infiltrator, professional gaslighter', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (33, 'SLEEP', 'Sleeper', 'The Sleepers — dormant populations activated by Elysium''s cosmic presence', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (34, 'RPLCR', 'Replicator', 'Matter replication technology — generalized alchemy, lead into gold at atomic level', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (35, 'ERBPG', 'ERB Gate', 'Einstein-Rosen Bridge portal network — teleportation and interstellar travel', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (36, 'NTRLK', 'Nutralink', 'Leon''s Nutralink neural implants — direct brain-computer interface technology', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (37, 'CRCKT', 'Circuit', 'The Crisis on Infinite Circuits — S Corp''s technical and political crises', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (38, 'TDLDR', 'Todd', 'Todd the Red Hat leader — conspiracy theorist turned terrorist figurehead', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (39, 'STACY', 'Stacey', 'Stacey — Todd''s long-suffering partner, enduring his descent into fanaticism', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (40, 'GILOP', 'Gil', 'Gil — S Corp intelligence operative, shadows and secrets', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (41, 'JMSAD', 'James', 'James — S Corp advisor, quiet counsel in the boardroom', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (42, 'LEONA', 'Leon', 'Leon — S Corp co-founder, manic tech-bro visionary, rocket builder', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (43, 'TJADV', 'TJ', 'TJ — S Corp advisor, moral compass and advocate for non-violence', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (44, 'PLUTO', 'Pluto', 'The Pluto outpost — destroyed by Red Hat forces, gateway to deep space', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (45, 'VATCN', 'Vatican', 'Shadows Beneath the Vatican — religious forces reacting to cosmic discoveries', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (46, 'PRSNR', 'Prisoner', 'The prison''s trapped souls — inmates who don''t know they''re incarcerated', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (47, 'DMRGE', 'Demiurge', 'Yaldabaoth the demiurge — parasitic governor of the cosmic prison', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (48, 'AUDIT', 'Audit', 'The System Audit — Yaldabaoth''s periodic maintenance sweep, destructive and cold', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (49, 'DRKSD', 'Dark Side', 'Breach of the Dark Side — the Red Hats'' declaration of holy war', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (50, 'FLLGD', 'Fallen God', 'Echoes of a Fallen God — aftermath of divine conflict, cosmic debris', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (51, 'CRSHD', 'Crushed', 'The prison''s crushing weight — incomprehensible scale, existential pressure', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (52, 'DREAD', 'Dread', 'Cosmic dread — the existential horror beneath the sardonic humor', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (53, 'DCPTV', 'Deceptive', 'The prison''s fundamental deception — reality itself is a lie', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (54, 'PYRTE', 'Pyrite', 'Golden Towers of Pyrite — the illusion of S Corp''s golden age cracking', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (55, 'ABYSN', 'Abyss', 'The Maw of the Infernal Abyss — where dark forces first stirred', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (56, 'SHDWS', 'Shadows', 'The Shadow Stirs — antagonistic cosmic presence making its first moves', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (57, 'HNTNG', 'Haunting', 'The Haunting Veil Beckons — the boundary between realities thinning', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (58, 'SCRTD', 'Scarlet', 'Dawn of the Scarlet Tide — Red Hat rebellion escalating to full war', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (59, 'TRLRP', 'Trailer', 'Todd''s trailer park origins — where conspiracy became fanaticism', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_lore_tags VALUES (60, 'BRCHD', 'Breached', 'Beyond the Firewall — humanity''s last defenses have been penetrated', '2026-03-05 22:40:08.882121-05');




-- Data for Name: item_prefixes; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.item_prefixes VALUES (1, 'SOLR', 'Solar', '{"agility": 1, "strength": 2}', 'Elysium Station solar arrays — intense focused energy', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (2, 'VOID', 'Void', '{"intelligence": 4}', 'Lady Astrael''s void domain — pure cosmic nullification', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (3, 'QNTM', 'Quantum', '{"agility": 2, "intelligence": 2}', 'Infinitron quantum CPU — superposition of precision', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (4, 'ELYS', 'Elysian', '{"agility": 1, "strength": 1, "intelligence": 1}', 'Elysium itself — the cosmic prison structure', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (5, 'NMTE', 'Nanite', '{"agility": 3}', 'S Corp nanite swarms operating at the Angstrom scale', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (6, 'SPEC', 'Spectral', '{"intelligence": 3}', 'Dreamscape spectral energy constructs', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (7, 'TMPL', 'Temporal', '{"agility": 2, "intelligence": 1}', 'Time distortion fields near Einstein-Rosen Bridge portals', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (8, 'CRPT', 'Corrupted', '{"strength": 4}', 'Entities corrupted by the prison''s runtime maintenance', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (9, 'PRMT', 'Prismatic', '{"agility": 1, "strength": 1, "intelligence": 2}', 'Akashic Index prismatic light encoding', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (10, 'FRCT', 'Fractured', '{"agility": 1, "strength": 3}', 'Post-Audit fractured construct remnants', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (11, 'ANCT', 'Ancient', '{"strength": 1, "intelligence": 3}', 'Pre-prison cosmic entities — predating the current runtime', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (12, 'RESN', 'Resonant', '{"agility": 2, "intelligence": 2}', 'Infinitron resonance frequency — the felt calibration', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (13, 'ECHO', 'Echo', '{"agility": 1, "intelligence": 3}', 'Dreamscape echo patterns from prior iterations', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (14, 'PHAS', 'Phase', '{"agility": 4}', 'Phase-state traversal between Threshold layers', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (15, 'DARK', 'Dark', '{"strength": 3, "intelligence": 1}', 'The Audit''s shadow construct energy signature', '2026-03-05 20:58:05.135932-05', '2026-03-05 20:58:05.135932-05');
INSERT INTO public.item_prefixes VALUES (16, 'SHLD', 'Shielded', '{"agility": 2, "strength": 1}', 'S Corp personal energy shield technology — deflective barrier', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (17, 'INFI', 'Infinite', '{"strength": 1, "intelligence": 3}', 'The Infinite Unbounded — S Corp''s limitless technological expansion', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (18, 'BLZD', 'Blazing', '{"agility": 1, "strength": 3}', 'Thermal defense grid ignition — white-hot plasma containment', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (19, 'CNDL', 'Candled', '{"agility": 1, "intelligence": 2}', 'Madam Osilari''s symbol-light — equations burning in wax and fire', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (20, 'DRMW', 'Dreamwoven', '{"agility": 1, "intelligence": 3}', 'Woven from Threshold dream-state filaments — Lady I''s craft', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (21, 'STRK', 'Starforged', '{"strength": 2, "intelligence": 2}', 'Forged in the stellar foundries of Sorhhinda colony', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (22, 'PLSM', 'Plasma', '{"strength": 3, "intelligence": 1}', 'S Corp plasma containment — superheated ionized matter', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (23, 'AURL', 'Auroral', '{"agility": 2, "intelligence": 2}', 'Elysium Station aurora field — charged particle luminescence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (24, 'CRSN', 'Crystalline', '{"intelligence": 4}', 'Infinitron crystalline architecture — atomic-level structure', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (25, 'GNSS', 'Genesis', '{"agility": 2, "strength": 1, "intelligence": 1}', 'Aditi''s Genesis ship — edge-of-system exploration technology', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (26, 'ASCN', 'Ascending', '{"agility": 1, "strength": 1, "intelligence": 2}', 'The act of ascending beyond the prison''s runtime constraints', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (27, 'DVNE', 'Divine', '{"intelligence": 4}', 'The Thirteen Ascended — remnant power of cosmic entities', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (28, 'SLCT', 'Selective', '{"agility": 3, "intelligence": 1}', 'Patrick''s tactical selectivity — precision over brute force', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (29, 'RPLC', 'Replicated', '{"agility": 2, "strength": 2}', 'Matter replicator output — atomic-level duplication technology', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (30, 'PRTL', 'Portal', '{"agility": 2, "intelligence": 2}', 'ERB portal energy signature — Einstein-Rosen Bridge residue', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (31, 'FLCR', 'Flickering', '{"agility": 3, "strength": -1}', 'Unstable phase state — present in multiple locations simultaneously', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (32, 'PRST', 'Parasitic', '{"agility": -1, "intelligence": 3}', 'Yaldabaoth''s parasitic methodology — power at a cost', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (33, 'SHTRD', 'Shattered', '{"strength": 3, "intelligence": -1}', 'Post-fracture remnant — broken but still sharp', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (34, 'UNST', 'Unstable', '{"agility": 2, "strength": -1, "intelligence": 2}', 'Quantum instability — powerful but unpredictable', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (35, 'DSTRT', 'Distorted', '{"agility": -1, "strength": 2, "intelligence": 2}', 'Reality distortion — the Distorted Monarch''s influence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (36, 'HYBRD', 'Hybrid', '{"agility": 1, "strength": 1, "intelligence": 1}', 'Merged S Corp and Akashic technology — two systems in one', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (37, 'WTHRD', 'Weathered', '{"agility": -1, "strength": 2}', 'Ancient pre-prison artifact — worn but enduring', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (38, 'GLCHD', 'Glitched', '{"agility": 3, "intelligence": -1}', 'Mandela Effect artifact — reality glitch residue', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (39, 'SRGNG', 'Surging', '{"agility": -1, "strength": 3}', 'Power surge pattern — overwhelming force with recovery lag', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (40, 'DRFTG', 'Drifting', '{"agility": 3, "strength": -1}', 'Drifter class phase-drift — present and absent simultaneously', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (41, 'BNDNG', 'Binding', '{"agility": -1, "strength": 2, "intelligence": 1}', 'Construct binding chains — restraint and control', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (42, 'MRGNG', 'Merging', '{"strength": -1, "intelligence": 3}', 'Substrate merger state — dissolving boundaries', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (43, 'RCRSV', 'Recursive', '{"agility": 1, "strength": -1, "intelligence": 2}', 'NG+ recursive loop artifact — memory stacking', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (44, 'TRNST', 'Transient', '{"agility": 2, "strength": -1, "intelligence": 1}', 'Threshold transit residue — temporary but potent', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (45, 'FLXNG', 'Fluxing', '{"agility": 2, "strength": 1, "intelligence": -1}', 'Temporal flux artifact — time-shifted properties', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (46, 'CRRPT', 'Corroded', '{"strength": -2}', 'Prison maintenance acid — substrate corrosion', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (47, 'FDDNG', 'Fading', '{"intelligence": -2}', 'Akashic signal degradation — losing coherence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (48, 'WKND', 'Weakened', '{"agility": -1, "strength": -1}', 'Post-audit weakening — system resources stripped', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (49, 'BRKN', 'Broken', '{"agility": -2}', 'Fractured construct remnant — damaged beyond repair', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (50, 'CRSED', 'Cursed', '{"agility": -1, "intelligence": -1}', 'Demiurge curse — Yaldabaoth''s deliberate sabotage', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (51, 'HLLW', 'Hollow', '{"strength": -1, "intelligence": -1}', 'Hollowed out by void exposure — structural integrity lost', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (52, 'RSTNG', 'Rusting', '{"strength": -2}', 'S Corp equipment decay — nanite maintenance failure', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (53, 'DMGD', 'Damaged', '{"agility": -1, "strength": -1}', 'Battle damage from Red Hat conflicts — scarred and dented', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (54, 'DRND', 'Drained', '{"intelligence": -2}', 'Essence-drained artifact — emptied of Akashic power', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (55, 'HVYWT', 'Heavy', '{"agility": -2}', 'Excessive mass — Etheris gravitational anomaly', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (56, 'BLTRD', 'Blistered', '{"agility": -1, "strength": -1}', 'Thermal overexposure — heat-warped and bubbled', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (57, 'SPPRD', 'Suppressed', '{"intelligence": -2}', 'System suppression field — Yaldabaoth dampening power', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (58, 'FRZN', 'Frozen', '{"agility": -2}', 'Antarctic cryo-lock — MOM facility containment overflow', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (59, 'VNSHD', 'Vanishing', '{"agility": -1, "strength": -1}', 'Phase decay — slipping out of stable existence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_prefixes VALUES (60, 'SCRD', 'Scarred', '{"strength": -1, "intelligence": -1}', 'Dreamscape psychic scarring — traumatic imprint', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');




-- Data for Name: item_qualities; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.item_qualities VALUES (1, 'ELDR', 'Elder', 'Elder gods and the Thirteen Ascended — immeasurable age', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (2, 'PRTO', 'Proto', 'Early S Corp prototypes — first-generation experimental', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (3, 'CLBR', 'Calibrated', 'Engineer Precision calibration — exact to quantum tolerance', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (4, 'STBL', 'Stabilized', 'Stabilized Threshold transit — energy held in fixed state', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (5, 'PHZL', 'Phase-Locked', 'Phase-locked quantum states near ERB portals', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (6, 'CNTD', 'Concentrated', 'Concentrated Akashic energy — distilled cosmic essence', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (7, 'HPRD', 'Hyper-Dense', 'Hyper-dense energy conduit nodes — impossible compression', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (8, 'CRYS', 'Crystalline', 'Crystalline Infinitron architecture — structured at the atomic level', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (9, 'PRIM', 'Primal', 'Primal entities that predate the prison runtime itself', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (10, 'FRMD', 'Formed', 'Freshly formed constructs — recent prison generation', '2026-03-05 20:58:05.139319-05');
INSERT INTO public.item_qualities VALUES (11, 'PRFCT', 'Perfected', 'Engineer class precision — calibrated to quantum tolerance, zero defects', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (12, 'HNDCR', 'Handcrafted', 'Custom-built by S Corp artisans — individual attention at every scale', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (13, 'RNFRC', 'Reinforced', 'Double-layer structural reinforcement — Etheris architecture inspired', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (14, 'PLSHD', 'Polished', 'Mirror-finish surface treatment — aesthetic and functional perfection', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (15, 'TMPRD', 'Tempered', 'Heat-treated in Elysium Station thermal foundries — maximum hardness', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (16, 'RSTRD', 'Restored', 'Rebuilt from pre-prison artifacts — ancient power renewed', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (17, 'CNSRD', 'Consecrated', 'Blessed by Vessel class divine channeling — cosmic entity endorsement', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (18, 'PRMD', 'Primed', 'Pre-charged with Akashic energy — ready for immediate deployment', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (19, 'HRMNC', 'Harmonic', 'Tuned to Infinitron resonance frequency — optimal energy transfer', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (20, 'MNTND', 'Maintained', 'S Corp nanite-maintained — perpetual self-repair at the atomic level', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (21, 'RCTFD', 'Rectified', 'Quantum error-corrected — impossible precision in every dimension', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (22, 'VNRBL', 'Venerable', 'Aged beyond measure — pre-dates the current prison runtime', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (23, 'BRTHL', 'Breathless', 'Void-forged in airless space — Lady A''s zero-atmosphere technique', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (24, 'SRHHD', 'Sorhhindic', 'Crafted on colony world Sorhhinda — off-world manufacturing methods', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (25, 'NTGRD', 'Integrated', 'Fully integrated with neural interface — responds to thought', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (26, 'HRDND', 'Hardened', 'Radiation-hardened against cosmic ray exposure — deep-space grade', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (27, 'SPKNG', 'Sparking', 'Crackling with residual energy — overcharged beyond specification', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (28, 'FLWLS', 'Flawless', 'Zero-defect manufacturing — statistical impossibility made real', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (29, 'LMNTD', 'Laminated', 'Multi-layer composite construction — each layer a different material', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (30, 'ANNTD', 'Anointed', 'Ritually prepared by the Shepherd Initiative — divine council approval', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (31, 'PRTTY', 'Prototype', 'First-generation experimental — powerful but unrefined', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (32, 'SLVGD', 'Salvaged', 'Recovered from wreckage — functional but aesthetically compromised', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (33, 'MDFD', 'Modified', 'Field-modified beyond original specification — unpredictable improvements', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (34, 'RPRSD', 'Repurposed', 'Originally designed for another function — adapted to combat use', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (35, 'CMPLX', 'Complex', 'Overly complicated design — powerful when it works, fragile when it doesn''t', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (36, 'EXPTL', 'Experimental', 'Morgan''s MOM facility prototype — cutting edge but untested', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (37, 'MTATD', 'Mutated', 'Akashic exposure mutation — changed in unpredictable ways', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (38, 'PRCSN', 'Pressurized', 'High-pressure energy containment — more power, more risk', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (39, 'RVRSD', 'Reversed', 'Reverse-engineered from enemy technology — imperfect understanding', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (40, 'FSSLD', 'Fossilized', 'Ancient beyond dating — preserved in prison substrate', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (41, 'SNTHT', 'Synthetic', 'Fully artificial construction — no organic components', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (42, 'CMPST', 'Composite', 'Multi-material construction — compromise between properties', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (43, 'RCLMD', 'Reclaimed', 'Recovered from Yaldabaoth''s domain — tainted but functional', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (44, 'TWSTD', 'Twisted', 'Dimensionally warped — physically impossible geometry', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (45, 'BLNCD', 'Balanced', 'Precisely balanced between offense and defense — no specialization', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (46, 'CRCKG', 'Cracking', 'Structural integrity failing — visible fracture lines spreading', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (47, 'FLKNG', 'Flaking', 'Surface material shedding — degrading with each use', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (48, 'WRPNG', 'Warping', 'Dimensionally unstable — shape shifting involuntarily', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (49, 'LKNG', 'Leaking', 'Energy containment failure — power seeping away', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (50, 'RSTNG', 'Rusted', 'Oxidation damage — surface corrosion compromising function', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (51, 'PTTNG', 'Pitting', 'Micro-crater damage from nanite attacks — Swiss cheese internals', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (52, 'DLPTD', 'Dilapidated', 'Neglected maintenance — systems failing one by one', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (53, 'JRRIG', 'Jury-Rigged', 'Emergency field repair — held together with hope and tape', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (54, 'CNTMN', 'Contaminated', 'Corruption-infected — Yaldabaoth''s influence embedded', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (55, 'DFCTV', 'Defective', 'Manufacturing flaw — bypassed quality control', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (56, 'BTRYD', 'Betrayed', 'Sabotaged by Dr. On''s Red Hat infiltrators — compromised from within', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (57, 'STRND', 'Strained', 'Operating beyond design limits — stressed to breaking point', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (58, 'BLDNG', 'Bleeding', 'Leaking internal fluids — catastrophic seal failure', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (59, 'FLTNG', 'Faltering', 'Intermittent function — works sometimes, fails unpredictably', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_qualities VALUES (60, 'CRRDD', 'Corroded', 'Acid-etched by prison maintenance fluids — pitted and worn', '2026-03-05 22:40:08.882121-05');




-- Data for Name: item_suffixes; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.item_suffixes VALUES (1, 'ASCND', 'the Ascendant', '{"agility": 2, "strength": 2, "intelligence": 2}', 'Ascending beyond the prison — transcending its runtime constraints', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (2, 'VSSEL', 'the Vessel', '{"intelligence": 5}', 'Vessel class — divine channel of the Thirteen Ascended', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (3, 'CNSTR', 'the Construct', '{"strength": 4}', 'Prison-deployed construct entities — automated immune response', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (4, 'FRSKY', 'the First Key', '{"agility": 1, "intelligence": 4}', 'The Eternal Engine as the first key — reverse-engineered in Florida', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (5, 'ACCRD', 'the Accord', '{"agility": 1, "strength": 1, "intelligence": 3}', 'The Elysian Accord — agreement between the divine council and the waking', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (6, 'THRSL', 'the Threshold', '{"agility": 4, "intelligence": 1}', 'Threshold transit mechanics — the liminal space between states', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (7, 'DRKRT', 'the Dark Ritual', '{"strength": 1, "intelligence": 5}', 'The Dark Ritual hotbar skill — chapter-wide persistent multiplier', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (8, 'VOIDT', 'the Void', '{"intelligence": 5}', 'Lady A''s void domain — zero-point Akashic energy', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (9, 'ETRNL', 'Eternal Purpose', '{"agility": 2, "strength": 2, "intelligence": 2}', 'S Corp''s stated mission — the Eternal Engine as humanity''s purpose', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (10, 'PRSON', 'the Prison', '{"strength": 5}', 'The cosmic prison structure — incomprehensible scale, crushing weight', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (11, 'DRMWK', 'the Dreamwalker', '{"agility": 2, "intelligence": 3}', 'Dreamwalking ability — conscious traversal of the Akashic realm', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (12, 'SLNCE', 'Silence', '{"agility": 5}', 'Memory Blur / Drifter invisibility — moving outside the system''s awareness', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (13, 'RECRS', 'Recursion', '{"agility": 2, "strength": 2, "intelligence": 2}', 'NG+ recursive loops — re-entering the prison with full memory intact', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (14, 'SHPDI', 'the Shepherd''s Eye', '{"agility": 1, "intelligence": 4}', 'The Shepherd Initiative — divine council''s observation methodology', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (15, 'LADYA', 'Lady A''s Blessing', '{"intelligence": 6}', 'Lady Astrael''s direct favor — rare and demanding', '2026-03-05 20:58:05.161454-05', '2026-03-05 20:58:05.161454-05');
INSERT INTO public.item_suffixes VALUES (16, 'ENGNE', 'the Engine', '{"strength": 3, "intelligence": 3}', 'The Eternal Engine — crystalline power source reverse-engineered from dreams', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (17, 'INFRN', 'the Infinitron', '{"agility": 1, "intelligence": 5}', 'The Infinitron CPU — quantum crystalline computing breakthrough', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (18, 'STRGD', 'the Starguard', '{"agility": 3, "strength": 3}', 'Elysium Station defense force — protectors of humanity''s cosmic foothold', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (19, 'SHPHR', 'the Shepherd', '{"agility": 2, "intelligence": 4}', 'The Shepherd Initiative — divine council''s program to guide trapped souls', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (20, 'ORACL', 'the Oracle', '{"intelligence": 6}', 'Lady A the Oracle of the Void — cosmic seer with burning eyes', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (21, 'SCRET', 'Secrets', '{"agility": 1, "intelligence": 5}', 'Lady Illkeserod, Goddess of Secrets — two fused souls, keeper of hidden knowledge', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (22, 'SYMBL', 'Symbols', '{"strength": 2, "intelligence": 4}', 'Madam Osilari, Madam of Symbols — robes of flowing equations', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (23, 'CLNST', 'the Colonist', '{"agility": 2, "strength": 2, "intelligence": 2}', 'Sorhhinda colonists — pioneers building civilization beyond Earth', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (24, 'RPLCN', 'Replication', '{"agility": 2, "strength": 4}', 'Matter replication — atomic-level duplication of any material', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (25, 'GRDNS', 'the Garden', '{"agility": 3, "intelligence": 3}', 'The Gardener of Elysium — cultivating new civilization', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (26, 'PRCNG', 'Piercing Light', '{"strength": 2, "intelligence": 4}', 'Bringing the Darkness to Light — hidden truths about Etheris revealed', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (27, 'TRNSC', 'Transcendence', '{"agility": 2, "strength": 2, "intelligence": 3}', 'Ascending beyond the prison — total liberation from the construct', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (28, 'UNBND', 'the Unbounded', '{"agility": 2, "strength": 2, "intelligence": 2}', 'The Infinite Unbounded — S Corp technology reshaping global infrastructure', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (29, 'GNSIS', 'Genesis', '{"agility": 4, "intelligence": 2}', 'Aditi''s Genesis ship — edge-of-system deep space exploration', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (30, 'SHLDS', 'the Shield', '{"agility": 2, "strength": 4}', 'S Corp personal energy shields — the end of conventional vulnerability', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (31, 'DSTMN', 'the Distorted', '{"agility": -1, "strength": 3, "intelligence": 2}', 'The Distorted Monarch — corrupted authority, power through distortion', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (32, 'PNDRA', 'Pandora', '{"agility": -1, "intelligence": 4}', 'Pandora''s Golden Fools — unleashing technology on an unprepared world', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (33, 'SSPHM', 'Sisyphean Toil', '{"strength": 4, "intelligence": -1}', 'The Sisyphean Job Hunt — mundane struggle while harboring cosmic knowledge', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (34, 'MNKYS', 'the Monkey', '{"agility": 4, "intelligence": -1}', 'Monkey-mind chaos — Stephen''s irreverent coping mechanism', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (35, 'CRMBG', 'the Crumbling', '{"agility": -1, "strength": 3}', 'Cracks in the Monolith — S Corp''s empire showing internal fracture', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (36, 'DSCVR', 'Discovery', '{"agility": 2, "strength": -1, "intelligence": 3}', 'Liminal Discoveries — occupying the threshold between worlds', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (37, 'DVLNC', 'Devil''s Dance', '{"agility": 3, "strength": -1, "intelligence": 2}', 'Dancing with the Devil in the Pale Moonlight — confronting dark forces', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (38, 'RFLCN', 'Reflection', '{"strength": -1, "intelligence": 3}', 'Stardust Dreams and Earthbound Realities — cosmic vs human tension', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (39, 'FRGTN', 'the Forgotten', '{"agility": -1, "strength": 2, "intelligence": 2}', 'Chronicles of a Forgotten Ruler — lost history of power', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (40, 'CHSIC', 'Chaos', '{"agility": 2, "strength": 2, "intelligence": -1}', 'Mumbai''s Moonlit Mob — global unrest and resistance to change', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (41, 'WKNGR', 'Waking', '{"agility": 1, "strength": -1, "intelligence": 3}', 'Eyes Open, World Muted — the dissonance of seeing reality''s truth', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (42, 'NVRSD', 'the Reversed', '{"agility": 3, "strength": 2, "intelligence": -1}', 'Reverse-engineered cosmic technology — imperfect human interpretation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (43, 'SHTRD', 'the Shattered', '{"agility": -1, "strength": 3, "intelligence": 1}', 'Shattered Dreams, Broken Metal — a major setback''s aftermath', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (44, 'SHDWT', 'the Shadow', '{"agility": 3, "strength": -1, "intelligence": 1}', 'The Shadow Stirs — antagonistic presence in the periphery', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (45, 'TRDML', 'the Treadmill', '{"agility": 1, "strength": 2, "intelligence": -1}', 'Stepping off the Treadmill — breaking free from corporate escalation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (46, 'YLDBH', 'Yaldabaoth', '{"strength": -2, "intelligence": -2}', 'The demiurge''s mark — cursed by the architect of the prison', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (47, 'RDHAT', 'the Red Hat', '{"agility": -1, "intelligence": -3}', 'Red Hat rebellion''s crude sabotage — fundamentalist anti-technology', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (48, 'DCAYG', 'Decay', '{"agility": -1, "strength": -2}', 'Etheris substrate decay — the prison''s material degrading', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (49, 'PRSNW', 'the Prison Wall', '{"agility": -3, "strength": -1}', 'The prison''s crushing walls — immovable cosmic architecture', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (50, 'ABYSS', 'the Abyss', '{"strength": -1, "intelligence": -3}', 'The Infernal Abyss — where comprehension fails and madness waits', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (51, 'NLLTY', 'Nullity', '{"agility": -1, "strength": -1, "intelligence": -2}', 'Zero-point void exposure — existence itself eroded', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (52, 'FLGOD', 'the Fallen', '{"strength": -2, "intelligence": -2}', 'Echoes of a Fallen God — divine power corrupted and spent', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (53, 'BTRYL', 'Betrayal', '{"agility": -2, "intelligence": -2}', 'Dr. On''s betrayal — sabotaged from within by a trusted colleague', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (54, 'DRKNS', 'Darkness', '{"intelligence": -3}', 'Death Walking — confronting mortality and the void', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (55, 'XTNCT', 'Extinction', '{"agility": -2, "strength": -2}', 'Species-level existential threat — the prison''s final solution', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (56, 'CHOKD', 'the Choked', '{"agility": -3}', 'Strangulation by bureaucracy and cosmic indifference', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (57, 'CRCKD', 'the Cracked', '{"agility": -1, "strength": -1, "intelligence": -1}', 'Fractures in everything — nothing is whole', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (58, 'WSTLG', 'Wasteland', '{"strength": -2, "intelligence": -1}', 'Post-Audit wasteland — scorched earth from Yaldabaoth''s maintenance', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (59, 'HLSSN', 'Hopelessness', '{"agility": -1, "intelligence": -2}', 'A Zero-Sum Digital Dystopia — the weight of a decaying world', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_suffixes VALUES (60, 'VDNSS', 'the Void''s Maw', '{"agility": -1, "strength": -1, "intelligence": -2}', 'The void consuming — Lady A''s domain turned hostile', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');




-- Data for Name: item_type_bases; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.item_type_bases VALUES (1, 'BLADE', 'Blade', 1, '{"agility": [2, 8], "strength": [5, 15]}', 'Close-quarters cutting weapon — derived from S Corp tactical equipment', '2026-03-05 20:58:05.144136-05', '2026-03-05 20:58:05.144136-05');
INSERT INTO public.item_type_bases VALUES (2, 'EMITR', 'Emitter', 1, '{"agility": [2, 6], "intelligence": [6, 16]}', 'Energy projection device — based on Infinitron resonance emitter technology', '2026-03-05 20:58:05.148457-05', '2026-03-05 20:58:05.148457-05');
INSERT INTO public.item_type_bases VALUES (3, 'GNTLT', 'Gauntlet', 1, '{"agility": [1, 5], "strength": [7, 18]}', 'Power-amplifying hand armor — based on S Corp combat exoskeleton components', '2026-03-05 20:58:05.150738-05', '2026-03-05 20:58:05.150738-05');
INSERT INTO public.item_type_bases VALUES (4, 'STAFF', 'Staff', 1, '{"strength": [1, 5], "intelligence": [8, 20]}', 'Channeling focus — derived from Akashic symbol-weaving instruments', '2026-03-05 20:58:05.15224-05', '2026-03-05 20:58:05.15224-05');
INSERT INTO public.item_type_bases VALUES (5, 'RSNFK', 'Resonance Fork', 1, '{"agility": [3, 10], "intelligence": [5, 12]}', 'Precision tuning instrument — adapted from Infinitron calibration tools', '2026-03-05 20:58:05.153209-05', '2026-03-05 20:58:05.153209-05');
INSERT INTO public.item_type_bases VALUES (6, 'PLSCN', 'Pulse Cannon', 1, '{"strength": [4, 12], "intelligence": [4, 12]}', 'Heavy energy weapon — based on Elysium Station defense systems', '2026-03-05 20:58:05.15397-05', '2026-03-05 20:58:05.15397-05');
INSERT INTO public.item_type_bases VALUES (7, 'SHLDG', 'Shielding', 2, '{"agility": [3, 10], "strength": [3, 10]}', 'Energy shielding layer — derived from Engineer class barrier technology', '2026-03-05 20:58:05.154923-05', '2026-03-05 20:58:05.154923-05');
INSERT INTO public.item_type_bases VALUES (8, 'CNDWV', 'Conduit Weave', 2, '{"agility": [2, 7], "intelligence": [5, 14]}', 'Energy-channeling fabric — woven from Akashic conduit filaments', '2026-03-05 20:58:05.155777-05', '2026-03-05 20:58:05.155777-05');
INSERT INTO public.item_type_bases VALUES (9, 'NMPLT', 'Nanite Plating', 2, '{"agility": [4, 12], "strength": [4, 12]}', 'Self-repairing nanite armor — S Corp nanite swarm application', '2026-03-05 20:58:05.156416-05', '2026-03-05 20:58:05.156416-05');
INSERT INTO public.item_type_bases VALUES (10, 'DRFTC', 'Drift Cloak', 2, '{"agility": [7, 18], "intelligence": [1, 5]}', 'Phase-shifting stealth garment — based on Drifter class Threshold Slip technology', '2026-03-05 20:58:05.157063-05', '2026-03-05 20:58:05.157063-05');
INSERT INTO public.item_type_bases VALUES (11, 'BRLTT', 'Barrier Lattice', 2, '{"strength": [6, 16], "intelligence": [2, 8]}', 'Crystalline defensive lattice — based on Etheris structural architecture', '2026-03-05 20:58:05.157592-05', '2026-03-05 20:58:05.157592-05');
INSERT INTO public.item_type_bases VALUES (12, 'CRYST', 'Crystal', 3, '{"intelligence": [4, 12]}', 'Resonant crystalline focus — fragment of Infinitron-adjacent material', '2026-03-05 20:58:05.158279-05', '2026-03-05 20:58:05.158279-05');
INSERT INTO public.item_type_bases VALUES (13, 'MODLT', 'Module', 3, '{"agility": [3, 10], "intelligence": [2, 7]}', 'Compact S Corp tech module — extracted from systems design blueprints', '2026-03-05 20:58:05.158884-05', '2026-03-05 20:58:05.158884-05');
INSERT INTO public.item_type_bases VALUES (14, 'FRAGM', 'Fragment', 3, '{"agility": [2, 8], "strength": [2, 8]}', 'Akashic energy fragment — broken-off piece of larger cosmic structure', '2026-03-05 20:58:05.159631-05', '2026-03-05 20:58:05.159631-05');
INSERT INTO public.item_type_bases VALUES (15, 'SIGIL', 'Sigil', 3, '{"intelligence": [5, 14]}', 'Madam Osilari''s symbol-carved token — carries encoded probability equations', '2026-03-05 20:58:05.160307-05', '2026-03-05 20:58:05.160307-05');
INSERT INTO public.item_type_bases VALUES (16, 'OPTIC', 'Lens', 3, '{"agility": [4, 12], "strength": [1, 5]}', 'Precision optical component — derived from Red Hat signal decryption instruments', '2026-03-05 20:58:05.160849-05', '2026-03-05 20:58:05.160849-05');
INSERT INTO public.item_type_bases VALUES (17, 'HLMET', 'Tactical Helm', 4, '{"agility": [2, 7], "strength": [3, 10]}', 'S Corp tactical combat helmet — HUD display and structural protection', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (18, 'VISOR', 'Neural Visor', 4, '{"agility": [2, 6], "intelligence": [4, 12]}', 'Infinitron neural interface visor — direct cognitive enhancement', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (19, 'CROWN', 'Data Crown', 4, '{"strength": [1, 4], "intelligence": [5, 14]}', 'Akashic data processing crown — streams cosmic information', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (20, 'HDGRD', 'Head Guard', 4, '{"agility": [1, 5], "strength": [4, 12]}', 'Heavy-duty cranial protection — Engineer class standard issue', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (21, 'CIRCL', 'Circlet', 4, '{"agility": [3, 10], "intelligence": [3, 10]}', 'Conduit energy circlet — channels ambient Akashic fields', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (22, 'AMULT', 'Amulet', 5, '{"strength": [1, 4], "intelligence": [4, 12]}', 'Akashic-infused amulet — pendant of concentrated cosmic energy', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (23, 'CHAIN', 'Conduit Chain', 5, '{"agility": [2, 8], "intelligence": [3, 10]}', 'Energy conduit necklace — channels power from Akashic realm', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (24, 'TORC', 'Nano Torc', 5, '{"agility": [2, 7], "strength": [3, 10]}', 'Nanite-threaded torque — self-repairing collar of microscopic machines', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (25, 'PNDNT', 'Phase Pendant', 5, '{"agility": [4, 12], "intelligence": [1, 5]}', 'Drifter class phase-shifting pendant — flickers between states', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (26, 'CHOKR', 'Data Choker', 5, '{"intelligence": [5, 14]}', 'Neural data choker — direct spinal interface for Infinitron access', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (27, 'PLDNS', 'Pauldrons', 6, '{"agility": [2, 7], "strength": [4, 12]}', 'S Corp tactical shoulder plates — structural combat protection', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (28, 'EMTMT', 'Emitter Mount', 6, '{"agility": [2, 6], "intelligence": [4, 12]}', 'Shoulder-mounted energy emitter array — Conduit class weapon platform', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (29, 'MNTLC', 'Mantle', 6, '{"strength": [3, 10], "intelligence": [3, 10]}', 'Akashic energy mantle — draping shoulders in cosmic power', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (30, 'SHRDS', 'Shard Guards', 6, '{"agility": [4, 12], "strength": [2, 6]}', 'Crystalline shard shoulder guards — Infinitron-adjacent material', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (31, 'SPRDS', 'Spreaders', 6, '{"strength": [5, 14], "intelligence": [1, 4]}', 'Force-spreading shoulder harness — distributes impact across frame', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (32, 'GLVSS', 'Haptic Gloves', 7, '{"agility": [4, 12], "intelligence": [2, 7]}', 'S Corp haptic interface gloves — precision touch and energy channeling', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (33, 'GRIPS', 'Combat Grips', 7, '{"agility": [2, 6], "strength": [4, 12]}', 'Reinforced combat hand wraps — enhanced grip and impact absorption', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (34, 'CNDGL', 'Conduit Gloves', 7, '{"strength": [1, 4], "intelligence": [5, 14]}', 'Akashic energy channeling gloves — Conduit class standard issue', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (35, 'FNGRW', 'Finger Wraps', 7, '{"agility": [5, 14], "strength": [1, 4]}', 'Drifter class precision finger wraps — for delicate phase manipulation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (36, 'PWRFT', 'Power Fists', 7, '{"agility": [1, 4], "strength": [6, 16]}', 'Exoskeleton power fists — Engineer class melee enhancement', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (37, 'BRCLT', 'Bracelet', 8, '{"agility": [2, 7], "intelligence": [3, 10]}', 'Akashic energy bracelet — ambient power collection', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (38, 'DTBND', 'Data Band', 8, '{"agility": [1, 5], "intelligence": [4, 12]}', 'Infinitron data band — real-time information stream', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (39, 'WRTGD', 'Wrist Guard', 8, '{"agility": [2, 8], "strength": [3, 10]}', 'S Corp tactical wrist guard — forearm protection and tool mount', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (40, 'PHSBR', 'Phase Bracer', 8, '{"agility": [4, 12], "intelligence": [1, 5]}', 'Drifter phase-shift bracer — enhances Threshold Slip capability', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (41, 'NNTSV', 'Nanite Sleeve', 8, '{"agility": [3, 10], "strength": [3, 10]}', 'Nanite swarm wrist sleeve — adaptive protective coating', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (42, 'SGLRG', 'Sigil Ring', 10, '{"intelligence": [4, 12]}', 'Akashic sigil-carved ring — concentrated cosmic equation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (43, 'PLTBND', 'Plating Band', 10, '{"agility": [1, 5], "strength": [3, 10]}', 'S Corp armored finger band — reinforced with nanite alloy', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (44, 'RSNRG', 'Resonance Ring', 10, '{"agility": [2, 7], "intelligence": [3, 10]}', 'Infinitron resonance frequency ring — tuned to cosmic harmonics', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (45, 'PHSRG', 'Phase Ring', 10, '{"agility": [4, 12]}', 'Drifter phase-shift ring — flickers between states of existence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (46, 'VDLOP', 'Void Loop', 10, '{"intelligence": [5, 14]}', 'Lady A''s void-forged ring — zero-point energy encircled', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (47, 'LGPLT', 'Leg Plates', 12, '{"agility": [3, 10], "strength": [4, 12]}', 'S Corp tactical leg plating — mobile defense', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (48, 'DRFTL', 'Drift Leggings', 12, '{"agility": [5, 14], "intelligence": [1, 5]}', 'Drifter class phase-shift leggings — enhanced movement and evasion', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (49, 'CNDTG', 'Conduit Tassets', 12, '{"strength": [2, 7], "intelligence": [4, 12]}', 'Akashic conduit leg guards — channels energy through lower body', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (50, 'EXSKL', 'Exo Leggings', 12, '{"agility": [2, 6], "strength": [5, 14]}', 'Exoskeleton leg components — Engineer class mobility enhancement', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (51, 'THNKR', 'Think Pants', 12, '{"agility": [1, 4], "intelligence": [5, 14]}', 'Neural-threaded lower garment — extends cognitive processing to movement', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (52, 'BOOTS', 'Tactical Boots', 13, '{"agility": [4, 12], "strength": [2, 7]}', 'S Corp tactical combat boots — grip, stability, and protection', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (53, 'HVRBT', 'Hover Boots', 13, '{"agility": [5, 14], "intelligence": [1, 5]}', 'Anti-gravity hover boots — ERB portal technology miniaturized', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (54, 'STBLZ', 'Stabilizers', 13, '{"agility": [2, 7], "strength": [4, 12]}', 'Ground-contact stabilizer platforms — Engineer class standard', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (55, 'PHSBT', 'Phase Boots', 13, '{"agility": [6, 16]}', 'Drifter class phase-shift boots — step between realities', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (56, 'GRVBT', 'Gravity Boots', 13, '{"agility": [3, 10], "strength": [3, 10]}', 'Graviton-enhanced boots — variable gravity compensation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (57, 'SHLD', 'Shield', 14, '{"agility": [2, 8], "strength": [4, 12]}', 'S Corp energy shield emitter — personal barrier defense', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (58, 'FOCUS', 'Focus Orb', 14, '{"strength": [1, 4], "intelligence": [6, 16]}', 'Akashic focus orb — concentrates cosmic energy for channeling', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (59, 'DGGR', 'Dagger', 14, '{"agility": [5, 14], "strength": [2, 6]}', 'Off-hand combat dagger — Drifter class dual-wield preference', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (60, 'BCKLD', 'Buckler', 14, '{"agility": [3, 10], "strength": [3, 10]}', 'Compact tactical buckler — balanced defense and mobility', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (61, 'TOMEV', 'Tome', 14, '{"intelligence": [7, 18]}', 'Akashic knowledge tome — pages of pure cosmic information', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (62, 'CLOAK', 'Cloak', 15, '{"agility": [3, 10], "intelligence": [3, 10]}', 'Akashic stealth cloak — phase-shifting fabric for concealment', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (63, 'JETPK', 'Jetpack', 15, '{"agility": [5, 14], "strength": [2, 6]}', 'S Corp personal propulsion unit — aerial mobility', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (64, 'WINGS', 'Energy Wings', 15, '{"agility": [2, 6], "intelligence": [5, 14]}', 'Conduit energy wing projections — aesthetic and functional', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (65, 'CAPE', 'Battle Cape', 15, '{"agility": [2, 7], "strength": [4, 12]}', 'Reinforced tactical cape — provides cover and intimidation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (66, 'DRPCK', 'Drift Pack', 15, '{"agility": [6, 16]}', 'Drifter class Threshold traverse pack — between-state navigation', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (67, 'BELT', 'Utility Belt', 16, '{"agility": [3, 10], "strength": [3, 10]}', 'S Corp multi-tool utility belt — pockets, holsters, and gadgets', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (68, 'SASH', 'Energy Sash', 16, '{"agility": [2, 7], "intelligence": [4, 12]}', 'Akashic energy sash — flowing ribbon of cosmic power', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (69, 'HRNS', 'Harness', 16, '{"agility": [1, 5], "strength": [5, 14]}', 'Heavy tactical harness — load-bearing support structure', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (70, 'CRDBL', 'Cord Belt', 16, '{"agility": [4, 12], "intelligence": [2, 6]}', 'Phase-cord belt — Drifter class enhanced mobility', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (71, 'CHRGR', 'Charger Belt', 16, '{"strength": [3, 10], "intelligence": [3, 10]}', 'Power cell charging belt — stores and releases energy on demand', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (72, 'EXOST', 'Exosuit', 2, '{"agility": [2, 8], "strength": [6, 16]}', 'Full-torso exoskeleton — Engineer class combat enhancement', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (73, 'ROBE', 'Akashic Robe', 2, '{"agility": [1, 5], "intelligence": [7, 18]}', 'Flowing robes of Akashic energy — Vessel class ceremonial and combat wear', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (74, 'JCKET', 'Stealth Jacket', 2, '{"agility": [5, 14], "intelligence": [2, 7]}', 'Drifter class phase-woven jacket — appears ordinary, shifts between states', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (75, 'VEST', 'Tactical Vest', 2, '{"agility": [3, 10], "strength": [4, 12]}', 'S Corp standard tactical vest — balanced protection and mobility', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (76, 'HRNSS', 'Conduit Harness', 2, '{"strength": [2, 7], "intelligence": [5, 14]}', 'Energy channeling chest harness — Conduit class power routing system', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (77, 'HMMER', 'War Hammer', 1, '{"agility": [1, 4], "strength": [8, 20]}', 'Massive impact weapon — Engineer class heavy melee option', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (78, 'BSTRW', 'Bow (Strand)', 1, '{"agility": [6, 16], "intelligence": [2, 6]}', 'Energy strand bow — fires condensed Akashic bolts at range', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (79, 'RFLPZ', 'Plasma Rifle', 1, '{"agility": [3, 10], "strength": [5, 14]}', 'S Corp plasma rifle — medium-range thermal projectile weapon', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (80, 'WHPNR', 'Phase Whip', 1, '{"agility": [7, 18], "intelligence": [1, 5]}', 'Drifter class phase-whip — extends through Threshold cracks', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (81, 'ORBCN', 'Orb Conduit', 1, '{"agility": [1, 4], "intelligence": [8, 20]}', 'Floating conduit orb — autonomous energy projection device', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (82, 'CLAWS', 'Nano Claws', 1, '{"agility": [4, 12], "strength": [5, 14]}', 'Retractable nanite claw array — both melee weapon and utility tool', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (83, 'SCYTH', 'Resonance Scythe', 1, '{"strength": [4, 12], "intelligence": [5, 14]}', 'Resonance-frequency scythe — cuts through energy fields and matter', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (84, 'TRWKF', 'Throwing Knives', 1, '{"agility": [6, 16], "strength": [2, 6]}', 'Nanite-guided throwing knives — seek targets after release', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (85, 'LNCHR', 'Grenade Launcher', 1, '{"agility": [2, 6], "strength": [6, 16]}', 'S Corp area-effect launcher — explosive ordnance delivery', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (86, 'RELIC', 'Relic', 3, '{"strength": [2, 8], "intelligence": [3, 10]}', 'Pre-prison cosmic artifact — ancient power in compact form', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (87, 'TOTEN', 'Totem', 3, '{"strength": [1, 5], "intelligence": [4, 12]}', 'Carved symbolic totem — Madam Osilari''s equation-bearing artifact', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (88, 'CHARM', 'Charm', 3, '{"agility": [3, 10], "intelligence": [2, 8]}', 'Akashic good-luck charm — probability-warping trinket', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (89, 'BADGE', 'Badge', 3, '{"agility": [2, 7], "strength": [3, 10]}', 'S Corp identification badge — surprisingly effective energy conduit', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');
INSERT INTO public.item_type_bases VALUES (90, 'PHYLC', 'Phylactery', 3, '{"intelligence": [5, 14]}', 'Soul container — stores a fragment of cosmic entity essence', '2026-03-05 22:40:08.882121-05', '2026-03-05 22:40:08.882121-05');




-- Data for Name: shop_items; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.shop_items VALUES (24, 'booster_xp_1hr', 'XP Boost (1 Hour)', 'Multiply all XP earned by 1.25x for 1 hour of active play.', 'booster', 75, NULL, NULL, '{"magnitude": 1.25, "boost_type": "xp", "duration_seconds": 3600}', true, false, NULL, NULL, NULL, NULL, 40, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (25, 'booster_xp_8hr', 'XP Boost (8 Hours)', 'Multiply all XP earned by 1.5x for 8 hours of active play.', 'booster', 400, NULL, NULL, '{"magnitude": 1.5, "boost_type": "xp", "duration_seconds": 28800}', true, false, NULL, NULL, NULL, NULL, 41, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (26, 'booster_xp_24hr', 'XP Boost (24 Hours)', 'Multiply all XP earned by 2.0x for 24 hours of active play.', 'booster', 900, NULL, NULL, '{"magnitude": 2.0, "boost_type": "xp", "duration_seconds": 86400}', true, false, NULL, NULL, NULL, NULL, 42, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (27, 'booster_essence_1hr', 'Essence Boost (1 Hour)', 'Multiply all Essence earned by 1.25x for 1 hour of active play.', 'booster', 75, NULL, NULL, '{"magnitude": 1.25, "boost_type": "essence", "duration_seconds": 3600}', true, false, NULL, NULL, NULL, NULL, 43, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (28, 'booster_essence_8hr', 'Essence Boost (8 Hours)', 'Multiply all Essence earned by 1.5x for 8 hours of active play.', 'booster', 400, NULL, NULL, '{"magnitude": 1.5, "boost_type": "essence", "duration_seconds": 28800}', true, false, NULL, NULL, NULL, NULL, 44, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (29, 'booster_essence_24hr', 'Essence Boost (24 Hours)', 'Multiply all Essence earned by 2.0x for 24 hours of active play.', 'booster', 900, NULL, NULL, '{"magnitude": 2.0, "boost_type": "essence", "duration_seconds": 86400}', true, false, NULL, NULL, NULL, NULL, 45, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (30, 'booster_drop_1hr', 'Drop Rate Boost (1 Hour)', 'Multiply artifact drop chance by 1.25x for 1 hour of active play.', 'booster', 75, NULL, NULL, '{"magnitude": 1.25, "boost_type": "drop_rate", "duration_seconds": 3600}', true, false, NULL, NULL, NULL, NULL, 46, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (31, 'booster_drop_8hr', 'Drop Rate Boost (8 Hours)', 'Multiply artifact drop chance by 1.5x for 8 hours of active play.', 'booster', 400, NULL, NULL, '{"magnitude": 1.5, "boost_type": "drop_rate", "duration_seconds": 28800}', true, false, NULL, NULL, NULL, NULL, 47, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (32, 'booster_drop_24hr', 'Drop Rate Boost (24 Hours)', 'Multiply artifact drop chance by 2.0x for 24 hours of active play.', 'booster', 900, NULL, NULL, '{"magnitude": 2.0, "boost_type": "drop_rate", "duration_seconds": 86400}', true, false, NULL, NULL, NULL, NULL, 48, '2026-03-12 14:18:02.515967-04', '2026-03-12 14:18:02.515967-04');
INSERT INTO public.shop_items VALUES (34, 'patron_badge_bronze', 'Bronze Patron Badge', 'A warm copper shield with a heart emblem. Awarded to Bronze Patrons.', 'patron_badge', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 900, '2026-03-12 15:22:43.891014-04', '2026-03-12 15:22:43.891014-04');
INSERT INTO public.shop_items VALUES (35, 'patron_badge_silver', 'Silver Patron Badge', 'A polished silver shield with feathered wings. Awarded to Silver Patrons.', 'patron_badge', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 901, '2026-03-12 15:22:43.891014-04', '2026-03-12 15:22:43.891014-04');
INSERT INTO public.shop_items VALUES (36, 'patron_badge_gold', 'Gold Patron Badge', 'An ornate golden shield wrapped in laurel. Awarded to Gold Patrons.', 'patron_badge', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 902, '2026-03-12 15:22:43.891014-04', '2026-03-12 15:22:43.891014-04');
INSERT INTO public.shop_items VALUES (37, 'patron_badge_diamond', 'Diamond Patron Badge', 'A crystalline diamond shield with prismatic shimmer. Awarded to Diamond Patrons.', 'patron_badge', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 903, '2026-03-12 15:22:43.891014-04', '2026-03-12 15:22:43.891014-04');
INSERT INTO public.shop_items VALUES (38, 'patron_flair_golden', 'Golden Benefactor', 'A radiant golden name border with a heart icon. Exclusive to Gold and Diamond Patrons.', 'patron_flair', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 910, '2026-03-12 15:22:43.904298-04', '2026-03-12 15:22:43.904298-04');
INSERT INTO public.shop_items VALUES (39, 'patron_avatar_benefactor', 'The Benefactor', 'A luminous figure extending a hand from a golden portal. Exclusive to Diamond Patrons.', 'patron_avatar', 0, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 920, '2026-03-12 15:22:43.904804-04', '2026-03-12 15:22:43.904804-04');
INSERT INTO public.shop_items VALUES (40, 'bazaar_permit_1', 'Bazaar Permit — Slot 4', 'Unlock a 4th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 200, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1000, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (41, 'bazaar_permit_2', 'Bazaar Permit — Slot 5', 'Unlock a 5th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 400, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1001, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (42, 'bazaar_permit_3', 'Bazaar Permit — Slot 6', 'Unlock a 6th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 800, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1002, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (43, 'bazaar_permit_4', 'Bazaar Permit — Slot 7', 'Unlock a 7th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 1600, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1003, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (44, 'bazaar_permit_5', 'Bazaar Permit — Slot 8', 'Unlock an 8th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 3200, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1004, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (45, 'bazaar_permit_6', 'Bazaar Permit — Slot 9', 'Unlock a 9th concurrent listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 6400, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1005, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (46, 'bazaar_permit_7', 'Bazaar Permit — Slot 10', 'Unlock the maximum 10th listing slot in the Dreamwalker''s Bazaar.', 'marketplace_permit', 12800, NULL, NULL, NULL, true, false, NULL, NULL, NULL, NULL, 1006, '2026-03-12 17:19:18.946576-04', '2026-03-12 17:19:18.946576-04');
INSERT INTO public.shop_items VALUES (1, 'skin_universal_void', 'Void Wanderer', 'A dark silhouette wreathed in void energy. Universal — any class.', 'skin', 500, 'skin_skin_universal_void', NULL, '{"portrait": "/assets/game/cosmetics/skins/universal_void/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/universal_void/bar.png", "avatar_config": {"particle": "void_wisps", "primary_color": "#2D1B4E", "secondary_color": "#8B00FF"}}', true, false, NULL, NULL, NULL, NULL, 1, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (2, 'skin_universal_celestial', 'Celestial Ascendant', 'Radiant golden armor emanating divine light. Universal — any class.', 'skin', 500, 'skin_skin_universal_celestial', NULL, '{"portrait": "/assets/game/cosmetics/skins/universal_celestial/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/universal_celestial/bar.png", "avatar_config": {"particle": "celestial_motes", "primary_color": "#FFD700", "secondary_color": "#FFF8DC"}}', true, false, NULL, NULL, NULL, NULL, 2, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (3, 'skin_engineer_spire', 'Spire Architect', 'Mechanical exoskeleton with glowing blueprint overlays. Engineer only.', 'skin', 350, 'skin_skin_engineer_spire', 1, '{"portrait": "/assets/game/cosmetics/skins/engineer_spire/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/engineer_spire/bar.png", "avatar_config": {"particle": "gear_sparks", "primary_color": "#4A90D9", "secondary_color": "#C0C0C0"}}', true, false, NULL, NULL, NULL, NULL, 3, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (4, 'skin_conduit_akashic', 'Akashic Conduit', 'Flowing energy channels with data-stream aura. Conduit only.', 'skin', 350, 'skin_skin_conduit_akashic', 2, '{"portrait": "/assets/game/cosmetics/skins/conduit_akashic/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/conduit_akashic/bar.png", "avatar_config": {"particle": "data_streams", "primary_color": "#00CED1", "secondary_color": "#E0FFFF"}}', true, false, NULL, NULL, NULL, NULL, 4, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (5, 'skin_drifter_phase', 'Phase Drifter', 'Semi-transparent form flickering between dimensions. Drifter only.', 'skin', 350, 'skin_skin_drifter_phase', 3, '{"portrait": "/assets/game/cosmetics/skins/drifter_phase/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/drifter_phase/bar.png", "avatar_config": {"particle": "phase_flicker", "primary_color": "#9B59B6", "secondary_color": "#D7BDE2"}}', true, false, NULL, NULL, NULL, NULL, 5, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (6, 'skin_vessel_divine', 'Divine Vessel', 'Luminous vessel form radiating holy energy. Vessel only.', 'skin', 350, 'skin_skin_vessel_divine', 4, '{"portrait": "/assets/game/cosmetics/skins/vessel_divine/portrait.png", "battle_bar": "/assets/game/cosmetics/skins/vessel_divine/bar.png", "avatar_config": {"particle": "divine_rays", "primary_color": "#FFD700", "secondary_color": "#FFFAF0"}}', true, false, NULL, NULL, NULL, NULL, 6, '2026-03-12 14:18:02.510206-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (7, 'flair_void_whisper', 'Void Whisper', 'Deep purple glow with void spiral icon.', 'flair', 150, 'flair_flair_void_whisper', NULL, '{"icon": "void_spiral", "border_color": "#8B00FF", "border_style": "glow"}', true, false, NULL, NULL, NULL, NULL, 10, '2026-03-12 14:18:02.514397-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (8, 'flair_celestial_radiance', 'Celestial Radiance', 'Golden shimmer with star burst icon.', 'flair', 150, 'flair_flair_celestial_radiance', NULL, '{"icon": "star_burst", "border_color": "#FFD700", "border_style": "shimmer"}', true, false, NULL, NULL, NULL, NULL, 11, '2026-03-12 14:18:02.514397-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (9, 'flair_infernal_ember', 'Infernal Ember', 'Crimson pulse with flame icon.', 'flair', 150, 'flair_flair_infernal_ember', NULL, '{"icon": "flame", "border_color": "#DC143C", "border_style": "pulse"}', true, false, NULL, NULL, NULL, NULL, 12, '2026-03-12 14:18:02.514397-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (10, 'flair_akashic_flow', 'Akashic Flow', 'Teal gradient with flow drop icon.', 'flair', 150, 'flair_flair_akashic_flow', NULL, '{"icon": "flow_drop", "border_color": "#008B8B", "border_style": "gradient"}', true, false, NULL, NULL, NULL, NULL, 13, '2026-03-12 14:18:02.514397-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (11, 'flair_spire_walker', 'Spire Walker', 'Silver metallic with gear icon.', 'flair', 150, 'flair_flair_spire_walker', NULL, '{"icon": "gear", "border_color": "#C0C0C0", "border_style": "metallic"}', true, false, NULL, NULL, NULL, NULL, 14, '2026-03-12 14:18:02.514397-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (12, 'badge_arcane', 'Arcane Frame', 'Glowing runic border in blue-purple tones.', 'badge', 200, 'badge_badge_arcane', NULL, '{"frame_style": "runic", "primary_color": "#6A0DAD", "secondary_color": "#4169E1"}', true, false, NULL, NULL, NULL, NULL, 20, '2026-03-12 14:18:02.514896-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (13, 'badge_void', 'Void Frame', 'Dark swirling edges with particle effects.', 'badge', 200, 'badge_badge_void', NULL, '{"frame_style": "swirl", "primary_color": "#1C1C2E", "secondary_color": "#8B00FF"}', true, false, NULL, NULL, NULL, NULL, 21, '2026-03-12 14:18:02.514896-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (14, 'badge_celestial', 'Celestial Frame', 'Radiant golden border with star accents.', 'badge', 200, 'badge_badge_celestial', NULL, '{"frame_style": "radiant", "primary_color": "#FFD700", "secondary_color": "#FFF8DC"}', true, false, NULL, NULL, NULL, NULL, 22, '2026-03-12 14:18:02.514896-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (15, 'badge_infernal', 'Infernal Frame', 'Smoldering ember border with flame wisps.', 'badge', 200, 'badge_badge_infernal', NULL, '{"frame_style": "ember", "primary_color": "#DC143C", "secondary_color": "#FF4500"}', true, false, NULL, NULL, NULL, NULL, 23, '2026-03-12 14:18:02.514896-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (16, 'avatar_pallid_mask', 'The Pallid Mask', 'Iconic antagonist — pale porcelain mask emerging from shadow.', 'avatar', 250, 'avatar_avatar_pallid_mask', NULL, '{"theme": "antagonist", "rarity": "premium"}', true, false, NULL, NULL, NULL, NULL, 30, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (17, 'avatar_spire_sentinel', 'Spire Sentinel', 'Tower guardian silhouette against a cosmic backdrop.', 'avatar', 200, 'avatar_avatar_spire_sentinel', NULL, '{"theme": "guardian", "rarity": "standard"}', true, false, NULL, NULL, NULL, NULL, 31, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (18, 'avatar_akashic_dreamer', 'Akashic Dreamer', 'Floating figure surrounded by flowing data streams.', 'avatar', 200, 'avatar_avatar_akashic_dreamer', NULL, '{"theme": "mystic", "rarity": "standard"}', true, false, NULL, NULL, NULL, NULL, 32, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (19, 'avatar_void_gazer', 'Void Gazer', 'A single eye peering from a rift in reality.', 'avatar', 200, 'avatar_avatar_void_gazer', NULL, '{"theme": "cosmic_horror", "rarity": "standard"}', true, false, NULL, NULL, NULL, NULL, 33, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (20, 'avatar_the_architect', 'The Architect', 'Cloaked figure with blueprint overlays and mechanical wings.', 'avatar', 250, 'avatar_avatar_the_architect', NULL, '{"theme": "creator", "rarity": "premium"}', true, false, NULL, NULL, NULL, NULL, 34, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (21, 'avatar_etheris_dawn', 'Etheris Dawn', 'Sunrise over the prison-world landscape of Etheris.', 'avatar', 150, 'avatar_avatar_etheris_dawn', NULL, '{"theme": "landscape", "rarity": "common"}', true, false, NULL, NULL, NULL, NULL, 35, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (22, 'avatar_cosmic_remnant', 'Cosmic Remnant', 'Shattered entity fragments slowly reassembling in void space.', 'avatar', 200, 'avatar_avatar_cosmic_remnant', NULL, '{"theme": "cosmic", "rarity": "standard"}', true, false, NULL, NULL, NULL, NULL, 36, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');
INSERT INTO public.shop_items VALUES (23, 'avatar_tower_ascendant', 'Tower Ascendant', 'Silhouette climbing an infinite spiral staircase toward light.', 'avatar', 150, 'avatar_avatar_tower_ascendant', NULL, '{"theme": "journey", "rarity": "common"}', true, false, NULL, NULL, NULL, NULL, 37, '2026-03-12 14:18:02.51544-04', '2026-03-13 17:08:57.932386-04');




-- Data for Name: shop_bundles; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.shop_bundles VALUES (1, 'adventurers_starter_pack', 'Adventurer''s Starter Pack', 'A universal skin, chat flair, and a 1-hour XP boost to start your journey.', 580, 725, 20, NULL, true, false, NULL, NULL, NULL, NULL, 1, '2026-03-12 14:18:02.517391-04', '2026-03-12 14:18:02.517391-04');
INSERT INTO public.shop_bundles VALUES (2, 'void_collectors_set', 'Void Collector''s Set', 'Complete void-themed cosmetic collection: flair, badge, and avatar.', 440, 550, 20, NULL, true, false, NULL, NULL, NULL, NULL, 2, '2026-03-12 14:18:02.517391-04', '2026-03-12 14:18:02.517391-04');
INSERT INTO public.shop_bundles VALUES (3, 'power_hour_bundle', 'Power Hour Bundle', 'One hour of boosted everything — XP, Essence, and Drop Rate.', 180, 225, 20, NULL, true, false, NULL, NULL, NULL, NULL, 3, '2026-03-12 14:18:02.517391-04', '2026-03-12 14:18:02.517391-04');




-- Data for Name: server_config; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.server_config VALUES ('game.essence_per_click', '1.0', 'numeric', 'game', 'Base essence earned per click.', '1.0', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.crit_chance', '0.05', 'numeric', 'game', 'Probability of a critical click (0.0-1.0).', '0.05', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.crit_multiplier', '2.0', 'numeric', 'game', 'Damage/essence multiplier on critical click.', '2.0', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.xp_multiplier', '1.0', 'numeric', 'game', 'Global XP multiplier.', '1.0', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.drop_rate_multiplier', '1.0', 'numeric', 'game', 'Global drop rate multiplier.', '1.0', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.offline_cap_chapters', '1', 'integer', 'game', 'Max chapters worth of offline progress.', '1', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('game.max_characters_per_player', '1', 'integer', 'game', 'Character creation limit per player.', '1', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.maintenance_mode', 'false', 'boolean', 'ops', 'Block all player API access with maintenance message.', 'false', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.maintenance_message', 'Elysium is undergoing maintenance. Please return shortly.', 'text', 'ops', 'Message shown during maintenance.', 'Elysium is undergoing maintenance. Please return shortly.', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.registration_open', 'true', 'boolean', 'ops', 'Allow new player registration.', 'true', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.announcement_banner', '', 'text', 'ops', 'Banner text displayed at top of frontend (empty = hidden).', '', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.announcement_banner_type', 'info', 'string', 'ops', 'Banner color type: info, warning, error.', 'info', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.rate_limit_clicks_per_second', '20', 'integer', 'ops', 'Max clicks/sec before rate limiting kicks in.', '20', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.rate_limit_suspicious_threshold', '15', 'integer', 'ops', 'Sustained clicks/sec that flags a player as suspicious.', '15', '2026-03-01 12:39:12.284722-05', NULL, NULL);
INSERT INTO public.server_config VALUES ('ops.admin_ip_whitelist_enabled', 'true', 'boolean', 'ops', 'If true, the Admin Panel enforces the IP whitelist. If false, any whitelisted email can access from any IP.', 'true', '2026-03-01 12:39:12.710283-05', NULL, NULL);




-- Data for Name: shop_bundle_items; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.shop_bundle_items VALUES (1, 1, 1, 1);
INSERT INTO public.shop_bundle_items VALUES (2, 1, 8, 2);
INSERT INTO public.shop_bundle_items VALUES (3, 1, 24, 3);
INSERT INTO public.shop_bundle_items VALUES (4, 2, 7, 1);
INSERT INTO public.shop_bundle_items VALUES (5, 2, 13, 2);
INSERT INTO public.shop_bundle_items VALUES (6, 2, 19, 3);
INSERT INTO public.shop_bundle_items VALUES (7, 3, 24, 1);
INSERT INTO public.shop_bundle_items VALUES (8, 3, 27, 2);
INSERT INTO public.shop_bundle_items VALUES (9, 3, 30, 3);




-- Data for Name: skill_prerequisites; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.skill_prerequisites VALUES (1, 6, 'idle_skill_level', 1, 10, 'Requires Attack Level 10', '2026-03-05 19:39:44.405919-05');
INSERT INTO public.skill_prerequisites VALUES (2, 7, 'idle_skill_level', 2, 10, 'Requires Magic Level 10', '2026-03-05 19:39:44.408127-05');
INSERT INTO public.skill_prerequisites VALUES (3, 7, 'active_skill_level', 6, 1, 'Requires Clickstorm Level 1', '2026-03-05 19:39:44.408698-05');
INSERT INTO public.skill_prerequisites VALUES (4, 8, 'idle_skill_level', 4, 18, 'Requires Precision Level 18', '2026-03-05 19:39:44.409287-05');
INSERT INTO public.skill_prerequisites VALUES (5, 9, 'idle_skill_level', 3, 25, 'Requires Lore Level 25', '2026-03-05 19:39:44.40979-05');
INSERT INTO public.skill_prerequisites VALUES (6, 9, 'idle_skill_level', 2, 25, 'Requires Magic Level 25', '2026-03-05 19:39:44.410432-05');
INSERT INTO public.skill_prerequisites VALUES (7, 10, 'idle_skill_level', 3, 35, 'Requires Lore Level 35', '2026-03-05 19:39:44.411013-05');
INSERT INTO public.skill_prerequisites VALUES (8, 10, 'active_skill_level', 9, 5, 'Requires Metal Detector Level 5', '2026-03-05 19:39:44.411687-05');
INSERT INTO public.skill_prerequisites VALUES (9, 12, 'idle_skill_level', 1, 25, 'Requires Attack Level 25', '2026-03-05 19:39:44.41229-05');
INSERT INTO public.skill_prerequisites VALUES (10, 12, 'active_skill_level', 6, 10, 'Requires Clickstorm Level 10', '2026-03-05 19:39:44.412958-05');
INSERT INTO public.skill_prerequisites VALUES (11, 13, 'idle_skill_level', 2, 45, 'Requires Magic Level 45', '2026-03-05 19:39:44.413594-05');
INSERT INTO public.skill_prerequisites VALUES (12, 13, 'idle_skill_level', 1, 20, 'Requires Attack Level 20', '2026-03-05 19:39:44.414301-05');
INSERT INTO public.skill_prerequisites VALUES (13, 13, 'active_skill_level', 7, 5, 'Requires Powersurge Level 5', '2026-03-05 19:39:44.415104-05');
INSERT INTO public.skill_prerequisites VALUES (14, 13, 'stat_value', 3, 30, 'Requires INT 30', '2026-03-05 19:39:44.41581-05');
INSERT INTO public.skill_prerequisites VALUES (15, 13, 'character_level', NULL, 15, 'Requires Character Level 15', '2026-03-05 19:39:44.417645-05');
INSERT INTO public.skill_prerequisites VALUES (16, 14, 'idle_skill_level', 4, 58, 'Requires Precision Level 58', '2026-03-05 19:39:44.418197-05');
INSERT INTO public.skill_prerequisites VALUES (17, 14, 'idle_skill_level', 2, 40, 'Requires Magic Level 40', '2026-03-05 19:39:44.418795-05');
INSERT INTO public.skill_prerequisites VALUES (18, 14, 'active_skill_level', 13, 3, 'Requires Energize Level 3', '2026-03-05 19:39:44.419337-05');
INSERT INTO public.skill_prerequisites VALUES (19, 14, 'stat_value', 2, 40, 'Requires AGI 40', '2026-03-05 19:39:44.419797-05');
INSERT INTO public.skill_prerequisites VALUES (20, 14, 'character_level', NULL, 20, 'Requires Character Level 20', '2026-03-05 19:39:44.420386-05');
INSERT INTO public.skill_prerequisites VALUES (21, 11, 'idle_skill_level', 2, 72, 'Requires Magic Level 72', '2026-03-05 19:39:44.420959-05');
INSERT INTO public.skill_prerequisites VALUES (22, 11, 'idle_skill_level', 3, 50, 'Requires Lore Level 50', '2026-03-05 19:39:44.421553-05');
INSERT INTO public.skill_prerequisites VALUES (23, 11, 'active_skill_level', 14, 1, 'Requires Reload Level 1', '2026-03-05 19:39:44.422255-05');
INSERT INTO public.skill_prerequisites VALUES (24, 11, 'active_skill_level', 7, 10, 'Requires Powersurge Level 10', '2026-03-05 19:39:44.423257-05');
INSERT INTO public.skill_prerequisites VALUES (25, 11, 'stat_value', 3, 60, 'Requires INT 60', '2026-03-05 19:39:44.42401-05');
INSERT INTO public.skill_prerequisites VALUES (26, 11, 'character_level', NULL, 30, 'Requires Character Level 30', '2026-03-05 19:39:44.424685-05');
INSERT INTO public.skill_prerequisites VALUES (27, 15, 'idle_skill_level', 1, 30, 'Requires Attack Level 30', '2026-03-05 19:39:44.430429-05');
INSERT INTO public.skill_prerequisites VALUES (28, 15, 'stat_value', 2, 40, 'Requires AGI 40', '2026-03-05 19:39:44.430911-05');
INSERT INTO public.skill_prerequisites VALUES (29, 15, 'character_level', NULL, 15, 'Requires Character Level 15', '2026-03-05 19:39:44.431368-05');
INSERT INTO public.skill_prerequisites VALUES (30, 16, 'idle_skill_level', 4, 30, 'Requires Precision Level 30', '2026-03-05 19:39:44.431849-05');
INSERT INTO public.skill_prerequisites VALUES (31, 16, 'stat_value', 2, 40, 'Requires AGI 40', '2026-03-05 19:39:44.432413-05');
INSERT INTO public.skill_prerequisites VALUES (32, 16, 'character_level', NULL, 15, 'Requires Character Level 15', '2026-03-05 19:39:44.432944-05');
INSERT INTO public.skill_prerequisites VALUES (33, 17, 'idle_skill_level', 2, 30, 'Requires Magic Level 30', '2026-03-05 19:39:44.433782-05');
INSERT INTO public.skill_prerequisites VALUES (34, 17, 'stat_value', 3, 40, 'Requires INT 40', '2026-03-05 19:39:44.435027-05');
INSERT INTO public.skill_prerequisites VALUES (35, 17, 'character_level', NULL, 15, 'Requires Character Level 15', '2026-03-05 19:39:44.436049-05');
INSERT INTO public.skill_prerequisites VALUES (36, 18, 'idle_skill_level', 3, 30, 'Requires Lore Level 30', '2026-03-05 19:39:44.437583-05');
INSERT INTO public.skill_prerequisites VALUES (37, 18, 'stat_value', 1, 30, 'Requires STR 30', '2026-03-05 19:39:44.438444-05');
INSERT INTO public.skill_prerequisites VALUES (38, 18, 'stat_value', 2, 30, 'Requires AGI 30', '2026-03-05 19:39:44.439143-05');
INSERT INTO public.skill_prerequisites VALUES (39, 18, 'stat_value', 3, 30, 'Requires INT 30', '2026-03-05 19:39:44.439638-05');
INSERT INTO public.skill_prerequisites VALUES (40, 18, 'character_level', NULL, 15, 'Requires Character Level 15', '2026-03-05 19:39:44.44015-05');





-- ============================================================================
-- Data for Name: movement_types; Type: TABLE DATA; Schema: public; Owner: -
-- ============================================================================

INSERT INTO public.movement_types (name, description, y_offset_min, y_offset_max, bob_amplitude, bob_frequency, speed_multiplier, can_change_lane, trail_effect)
VALUES
    ('ground',   'Walks/crawls on the ground plane',         0,  0, 0, 1.0, 1.0, FALSE, NULL),
    ('hover',    'Floats slightly above ground with shadow',  15, 30, 4, 0.8, 0.9, FALSE, 'shadow'),
    ('flying',   'High altitude flight with lane changes',    40, 70, 8, 1.2, 1.3, TRUE,  NULL),
    ('burrowing','Partially submerged with particle effects', -5,  0, 2, 0.5, 0.7, FALSE, 'particles'),
    ('teleport', 'Blinks between positions with afterimage',   0,  0, 0, 1.0, 0.5, TRUE,  'afterimage')
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Data for Name: size_classes; Type: TABLE DATA; Schema: public; Owner: -
-- ============================================================================

INSERT INTO public.size_classes (name, description, scale_min, scale_max, width_base, height_base, hitbox_radius, hp_bar_width, sort_order)
VALUES
    ('tiny',   'Very small creatures (insects, wisps)',   0.4, 0.6, 12, 14,  8, 16, 1),
    ('small',  'Small creatures (rats, imps)',            0.7, 0.9, 18, 22, 12, 22, 2),
    ('medium', 'Standard humanoid-sized',                1.0, 1.2, 24, 30, 16, 28, 3),
    ('large',  'Large creatures (ogres, bears)',          1.3, 1.6, 32, 40, 22, 36, 4),
    ('huge',   'Massive creatures (dragons, giants)',     1.8, 2.2, 44, 54, 30, 48, 5)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Data for Name: animation_styles; Type: TABLE DATA; Schema: public; Owner: -
-- ============================================================================

INSERT INTO public.animation_styles (name, description, idle_scale_x, idle_scale_y, idle_cycle_ms, idle_translate_x, idle_translate_y, attack_recoil, death_style, death_duration_ms, death_particle_count)
VALUES
    ('ooze',    'Slow squishing blob motion',         1.15, 0.88, 2000, 0,  0, 2.0, 'dissolve', 500,  6),
    ('stalk',   'Subtle side-to-side prowl',          1.0,  1.0,  1500, -4, 0, 4.0, 'fade',     400,  8),
    ('pulse',   'Rhythmic uniform pulsing',           1.05, 1.05, 2500, 0,  0, 2.0, 'shatter',  600, 12),
    ('aggro',   'Fast aggressive bobbing',            1.0,  1.0,  1000, 0, -3, 5.0, 'explode',  300, 15),
    ('flap',    'Wing-beat vertical motion',          1.0,  1.0,  800,  0, -4, 3.0, 'fade',     400, 10),
    ('swarm',   'Jittery multi-unit drift',           1.0,  1.0,  2000, 2,  0, 1.0, 'dissolve', 500, 20),
    ('slither', 'Horizontal wave undulation',         1.08, 1.0,  1800, 2,  0, 2.0, 'shrink',   400,  6)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Data for Name: silhouette_types; Type: TABLE DATA; Schema: public; Owner: -
-- ============================================================================

INSERT INTO public.silhouette_types (name, description, body_shape, body_ratio_w, body_ratio_h, corner_radius, has_limbs, limb_count, has_head, has_wings, has_weapon_slot, has_eye_glow, sub_unit_count)
VALUES
    ('blob',      'Amorphous shapeless mass',        'ellipse', 1.2, 0.7, 0.5, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 1),
    ('quadruped', 'Four-legged beast',               'rect',    1.4, 0.8, 0.1, TRUE,  4, TRUE,  FALSE, FALSE, TRUE,  1),
    ('biped',     'Two-legged humanoid',             'rect',    0.7, 1.3, 0.1, TRUE,  2, TRUE,  FALSE, TRUE,  FALSE, 1),
    ('orb',       'Floating sphere with eye glow',   'circle',  1.0, 1.0, 1.0, FALSE, 0, FALSE, FALSE, FALSE, TRUE,  1),
    ('winged',    'Winged flying creature',          'ellipse', 1.5, 0.6, 0.3, FALSE, 0, TRUE,  TRUE,  FALSE, TRUE,  1),
    ('cluster',   'Multi-unit swarm cluster',        'multi',   0.8, 0.8, 0.2, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 4)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- Data for Name: armor_classes; Type: TABLE DATA; Schema: public; Owner: -
-- ============================================================================

INSERT INTO public.armor_classes (code, display_name, description, overlay_opacity, color_tint_base, texture_pattern, glow_intensity, outline_width, weight_class, sort_order)
VALUES
    ('cloth',   'Cloth',   'Light fabric wrappings',              0.4,  '#645040', 'solid',      0,   0.5, 'light',  1),
    ('leather', 'Leather', 'Tanned hide armor',                   0.55, '#8b5a2b', 'solid',      0,   1.0, 'light',  2),
    ('chain',   'Chain',   'Interlocking metal rings',            0.5,  '#b4b4b4', 'crosshatch', 0,   1.0, 'medium', 3),
    ('plate',   'Plate',   'Heavy forged metal plates',           0.65, '#c8c8dc', 'gradient',   0.1, 1.5, 'heavy',  4),
    ('divine',  'Divine',  'Blessed golden armor',                0.5,  '#ffd700', 'shimmer',    0.8, 1.0, 'medium', 5),
    ('magic',   'Magic',   'Arcane-infused protective garments',  0.45, '#8844cc', 'shimmer',    0.6, 0.5, 'light',  6),
    ('bone',    'Bone',    'Skeletal plating and spurs',          0.55, '#b4aa8c', 'solid',      0,   1.0, 'medium', 7),
    ('shadow',  'Shadow',  'Dark ethereal wrappings',             0.35, '#28283c', 'solid',      0.2, 0.5, 'light',  8)
ON CONFLICT (code) DO NOTHING;


-- Re-enable triggers
SET session_replication_role = DEFAULT;
