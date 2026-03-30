-- Migration 071: Lore Audit Phase 0.1b — Create 12 missing character entities
-- These characters were identified during the lore audit book extraction (Phase 0.0)
-- but had no matching entities in the DB.
--
-- Entity type IDs: 1=enemy, 2=creature, 3=character, 4=manifestation, 5=object, 6=group, 7=environment, 8=event, 9=other

BEGIN;

-- Fix sequences that were left behind by bulk inserts with explicit IDs
SELECT setval('entities_id_seq', (SELECT MAX(id) FROM entities));
SELECT setval('entity_aliases_id_seq', (SELECT MAX(id) FROM entity_aliases));

-- 1. Lady Astrael — cosmic entity, dreamwalker guide (ER Ch.51)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Lady Astrael',
  4, -- manifestation
  'One of three cosmic entities guiding Stephen through dreamwalking. Materializes with stark, undeniable presence. Her gaze is steady, voice firm but not cruel. Commands with a blend of allure and dread. Bestows the name Aspolin upon Stephen after his dreamwalker training is complete.',
  189, -- ER Ch.51 scene 1: "The World''s Wealthiest Company"
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Lady A', 'Common shorthand'),
  (currval('entities_id_seq'), 'አስትራኤል', 'Ge''ez script name'),
  (currval('entities_id_seq'), 'Astrael', 'Shortened name');

-- 2. Construct Wife — Stephen's NPC prison guard wife (all 3 books)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Construct Wife',
  3, -- character
  'Stephen''s assigned partner inside the prison. An NPC designed to keep him docile, controlled, and spiritually suppressed. Alternates between emotional abuse and calculated affection. Was never designed to bear children (making Xavier''s existence impossible). Deliberately nameless — referred to only as "my wife." NOT Jamie/Velistra, NOT Ilse/Lady Illkeserod.',
  8, -- ER Ch.4 scene 1: "Frost and Whispers at Home" (first "my wife" mention)
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Stephen''s Epilogue Wife', 'EF epilogue reference'),
  (currval('entities_id_seq'), 'NPC Wife', 'What she truly is');

-- 3. YHVH — God figure, Heaven reformer (EFE Ch.17)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'YHVH',
  4, -- manifestation
  'Works with Yeshua to oversee the transition of Heaven from a propaganda machine to a real rehabilitation center. Partner in Heaven reform.',
  529, -- EFE Ch.17 scene 1: "The Endless Fall"
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Yahweh', 'Alternate name');

-- 4. Mrs. Henderson — minor character, connected to Coach Henderson
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Mrs. Henderson',
  3, -- character
  'Mentioned in relation to Coach Henderson. Minimal presence in the narrative.',
  434, -- EF Ch.18 scene 3: "The Greyhound to Nowhere"
  false
);

-- 5. Pastor Jim — minor character, 1990s Florida religious community
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Pastor Jim',
  3, -- character
  'A pastor connected to the religious/fundamentalist community in 1990s Florida. Mentioned twice in the narrative.',
  395, -- EF Ch.9 scene 2: "William Carson's Entrance"
  false
);

-- 6. Dr. Morrison — minor character, doctor
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Dr. Morrison',
  3, -- character
  'A doctor mentioned once. Minimal role in the narrative.',
  369, -- EF Ch.4 scene 4: "Beating"
  false
);

-- 7. ማሪያቤላሚች (The Unseen Blessing) — cosmic saboteur entity (ER Ch.50)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'ማሪያቤላሚች (The Unseen Blessing)',
  4, -- manifestation
  'An ethereal presence that drifts through halls spreading doubt and fear into S Corp''s systems. Infects confidence, turning it into paralyzing dread. Makes people move like puppets.',
  186, -- ER Ch.50 scene 1: "Awakening in the Frozen Tomb"
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Mariyabelamich', 'Romanized name'),
  (currval('entities_id_seq'), 'The Unseen Blessing', 'English translation');

-- 8. The Shadowy Figure (Chapter 27) — mysterious entity (ER Ch.27)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'The Shadowy Figure',
  4, -- manifestation
  'A mysterious shadowy presence encountered during ER Chapter 27. Identity unclear — possibly a manifestation of deeper cosmic forces.',
  101, -- ER Ch.27 scene 1: "The Crimson Abyss"
  false
);

-- 9. The Dream Demons (Chapter 15) — group of dreamscape tormentors (ER Ch.15)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'The Dream Demons',
  6, -- group
  'Shadowy figures with twisted, grotesque forms during Stephen''s job-hunting despair. Metaphorical/dreamscape manifestation of anxieties that torment Stephen.',
  48, -- ER Ch.15 scene 1: "Descent Into the Threshold"
  false
);

-- 10. Alpha Ancient — unnamed ancient being
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Alpha Ancient',
  2, -- creature
  'An ancient being referenced in the narrative. Details sparse.',
  NULL,
  false
);

-- 11. The Oenomancer — unnamed character
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'The Oenomancer',
  3, -- character
  'A character referenced in the narrative. The name suggests mastery of wine/fermentation as a mystical art.',
  15, -- ER Ch.6 scene 3: "Death and Transcendence"
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Oenomancer', 'Shortened name');

-- 12. Reagan — cultural reference through TJ (EF Ch.5)
INSERT INTO entities (canonical_name, entity_type_id, base_description, first_appearance_scene_id, is_generated)
VALUES (
  'Reagan',
  9, -- other (cultural reference, not a story character)
  'Not a character but a recurring cultural reference through TJ''s obsession. TJ wears Reagan shirts, buttons, and displays ''Reagan-era confidence.''',
  373, -- EF Ch.5 scene 1: "Monday Morning Routines and Hidden Attention"
  false
);
INSERT INTO entity_aliases (entity_id, alias, context) VALUES
  (currval('entities_id_seq'), 'Ronald Reagan', 'Full name');

COMMIT;
