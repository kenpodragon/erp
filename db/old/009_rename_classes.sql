-- 009_rename_classes.sql
-- Rename character classes from generic fantasy to sci-fi/cosmic horror theming
-- Matches the Towers of Elysium book trilogy aesthetic
-- See docs/STYLE_GUIDE.md and docs/CHARACTER_GUIDE.md for full rationale

BEGIN;

-- Rename classes and update sprite_keys
UPDATE character_classes SET name = 'Engineer', sprite_key = 'class_engineer' WHERE sprite_key = 'class_sentinel';
UPDATE character_classes SET name = 'Conduit',  sprite_key = 'class_conduit'  WHERE sprite_key = 'class_arcanist';
UPDATE character_classes SET name = 'Drifter',  sprite_key = 'class_drifter'  WHERE sprite_key = 'class_wanderer';
UPDATE character_classes SET name = 'Vessel',   sprite_key = 'class_vessel'   WHERE sprite_key = 'class_invoker';

-- Update lore blurbs to match new sci-fi theming
UPDATE character_classes SET lore_blurb = 'Those who hear the Eternal Engine''s rhythm and bend its mechanisms to their will. Engineers rebuild what the prison unmakes, constructing shields and weapons from the substrate''s own architecture.'
WHERE sprite_key = 'class_engineer';

UPDATE character_classes SET lore_blurb = 'Channels of raw cosmic energy flowing from beyond the prison walls. Conduits manipulate reality itself, warping the Akashic Flow to unmake enemies and rewrite the rules of engagement.'
WHERE sprite_key = 'class_conduit';

UPDATE character_classes SET lore_blurb = 'Memory-walkers who navigate the spaces between realities. Drifters slip through cracks in Etheris, striking from impossible angles and vanishing before the system can register their presence.'
WHERE sprite_key = 'class_drifter';

UPDATE character_classes SET lore_blurb = 'Those who channel the remnant power of cosmic entities — fragments of the Thirteen, echoes of elder gods. Vessels wield divine fury and existential dread in equal measure.'
WHERE sprite_key = 'class_vessel';

COMMIT;
