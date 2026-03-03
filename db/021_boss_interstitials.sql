-- Migration 021: Boss Interstitials
-- Purpose: Add Chapter Boss and Book Boss gating nodes to the scene hierarchy.
--          Add transition lore text for post-boss narrative reveals.
--          Track boss completions separately from linear player_progress.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add scene_type and boss_config to scenes
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS scene_type TEXT NOT NULL DEFAULT 'normal';
  -- values: 'normal' | 'chapter_boss' | 'book_boss'

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS boss_config JSONB DEFAULT NULL;
  -- {
  --   "timer_seconds": int,          -- countdown timer duration
  --   "hp_multiplier": float,        -- boss HP relative to zone-scaled baseline
  --   "interrupt_interval_min": int, -- min seconds between interrupt challenges
  --   "interrupt_interval_max": int, -- max seconds between interrupt challenges
  --   "interrupt_window_seconds": int, -- window to complete challenge
  --   "interrupt_refill_seconds": int, -- timer refill on successful interrupt
  --   "interrupt_clicks_required": int -- clicks needed for click_burst mechanic
  -- }


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Transition lore text for post-boss narrative reveals
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS transition_lore_text TEXT DEFAULT NULL;
ALTER TABLE books    ADD COLUMN IF NOT EXISTS transition_lore_text TEXT DEFAULT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Boss completion tracking (separate from linear player_progress)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boss_completions (
    id           SERIAL PRIMARY KEY,
    player_id    INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scene_id     INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    boss_type    TEXT NOT NULL CHECK (boss_type IN ('chapter_boss', 'book_boss')),
    chapter_id   INTEGER REFERENCES chapters(id) ON DELETE SET NULL,
    book_id      INTEGER REFERENCES books(id) ON DELETE SET NULL,
    session_id   TEXT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_boss_completion ON boss_completions(player_id, scene_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed chapter boss scenes — one per chapter (sort_order = 9999)
--    scene_number = 9999 to distinguish from regular scenes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO scenes (chapter_id, scene_number, title, sort_order, scene_type, boss_config)
SELECT
    c.id,
    9999,
    c.title || ' — Chapter Boss',
    9999,
    'chapter_boss',
    jsonb_build_object(
        'timer_seconds',             120,
        'hp_multiplier',             8,
        'interrupt_interval_min',    10,
        'interrupt_interval_max',    25,
        'interrupt_window_seconds',  5,
        'interrupt_refill_seconds',  15,
        'interrupt_clicks_required', 20
    )
FROM chapters c
WHERE NOT EXISTS (
    SELECT 1 FROM scenes s2
    WHERE s2.chapter_id = c.id AND s2.scene_type = 'chapter_boss'
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed book boss scenes — one per book, placed in the last chapter of each book
--    Uses scene_number = 9998 to not collide with chapter boss (9999)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO scenes (chapter_id, scene_number, title, sort_order, scene_type, boss_config)
SELECT DISTINCT ON (c.book_id)
    c.id,
    9998,
    b.title || ' — Book Boss',
    9998,
    'book_boss',
    jsonb_build_object(
        'timer_seconds',             180,
        'hp_multiplier',             20,
        'interrupt_interval_min',    8,
        'interrupt_interval_max',    20,
        'interrupt_window_seconds',  4,
        'interrupt_refill_seconds',  20,
        'interrupt_clicks_required', 30
    )
FROM chapters c
JOIN books b ON b.id = c.book_id
WHERE NOT EXISTS (
    SELECT 1 FROM scenes s2
    WHERE s2.chapter_id = c.id AND s2.scene_type = 'book_boss'
)
ORDER BY c.book_id, c.chapter_number DESC;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Seed transition_lore_text for early chapters and book 1
--    (Placeholder content — replace via content pipeline or admin panel)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE chapters
SET transition_lore_text = 'You have ascended beyond the First Veil, Seeker. The Tower remembers those who climb. Rest here a moment — breathe in what you have survived — for the shadows above grow thicker with each floor you claim. The architects of this place did not build it to be conquered. And yet, here you stand. Press on.'
WHERE chapter_number = 1
  AND book_id = (SELECT id FROM books WHERE book_number = 1 LIMIT 1)
  AND transition_lore_text IS NULL;

UPDATE chapters
SET transition_lore_text = 'The Second Veil parts before you. Two chapters of this Tower now lie in your wake — two layers of its architecture stripped bare. The entities that guard these halls do not forget. They have watched you learn. They will adjust. What worked before may not work again. This is the nature of the Tower: it is a living test, and you are its subject.'
WHERE chapter_number = 2
  AND book_id = (SELECT id FROM books WHERE book_number = 1 LIMIT 1)
  AND transition_lore_text IS NULL;

UPDATE books
SET transition_lore_text = 'The First Book of Elysium is sealed behind you. What you endured within those walls has changed you — reshaped your perception of what is real, what is shadow, and what lurks in the spaces between. The Tower is only beginning to reveal its truth. The next bound tome awaits. You will not emerge from it the same as you entered. That is a promise.'
WHERE book_number = 1
  AND transition_lore_text IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Trigger for boss_completions timestamp (optional — completed_at is set on insert)
-- ─────────────────────────────────────────────────────────────────────────────
-- No update trigger needed; boss_completions rows are insert-only.


COMMIT;
