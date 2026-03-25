-- Migration 063: Add max_enemy_hp column to scene_gameplay_data + seed early game values
-- Per-scene HP cap override. NULL means use the global scene_hp formula.
-- Values based on simulation toolkit findings (casual ~60h target, 1.012 scaling).

-- 1. Add the column
ALTER TABLE scene_gameplay_data ADD COLUMN IF NOT EXISTS max_enemy_hp REAL DEFAULT NULL;

-- 2. Seed early game scenes (Book 1, first ~50 scenes) with tuned HP caps.
--    These keep early game snappy while the global formula handles mid/late game.
--    Formula rationale: base_hp(20) * 1.012^(pos-1), rounded, with gentle caps.
--
--    Scene positions 1-10:  HP 20-22  (tutorial / intro pace)
--    Scene positions 11-25: HP 23-27  (early game ramp)
--    Scene positions 26-50: HP 28-36  (mid Book 1)

-- Book 1 scenes: set max_enemy_hp for scene_gameplay_data rows
-- We update by joining scenes → chapters → books to get global position ordering.
-- Early scenes (positions 1-10): cap at 25 HP
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 25
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 1
  AND c.chapter_number <= 3
  AND s.scene_type = 'normal';

-- Mid-early scenes (Book 1, chapters 4-8): cap at 40 HP
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 40
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 1
  AND c.chapter_number BETWEEN 4 AND 8
  AND s.scene_type = 'normal';

-- Mid scenes (Book 1, chapters 9-15): cap at 60 HP
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 60
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 1
  AND c.chapter_number BETWEEN 9 AND 15
  AND s.scene_type = 'normal';

-- Late Book 1 (chapters 16+): cap at 100 HP
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 100
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 1
  AND c.chapter_number >= 16
  AND s.scene_type = 'normal';

-- Early Book 2 (chapters 1-5): cap at 120 HP
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 120
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 2
  AND c.chapter_number <= 5
  AND s.scene_type = 'normal';

-- Boss scenes: set higher caps (bosses should feel tough)
-- Book 1 bosses: 200 HP base (before hp_multiplier from boss_config)
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 200
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 1
  AND s.scene_type IN ('chapter_boss', 'book_boss');

-- Book 2 bosses: 300 HP base
UPDATE scene_gameplay_data sgd
SET max_enemy_hp = 300
FROM scenes s
JOIN chapters c ON s.chapter_id = c.id
JOIN books b ON c.book_id = b.id
WHERE sgd.scene_id = s.id
  AND b.book_number = 2
  AND s.scene_type IN ('chapter_boss', 'book_boss');

-- Remaining scenes (Book 3+) use NULL = global formula (no override needed,
-- players are strong enough that the exponential scaling feels right).
