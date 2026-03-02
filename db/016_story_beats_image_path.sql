-- Migration 016: Add content_image_path to story_beats
-- Purpose: Brings the DB schema in sync with the StoryBeat ORM model.
--          This column is the hook point for future PNG-based copy-protected
--          narrative assets. The narrative route reads it and the frontend
--          switches from <p> to <img> when it is non-null.
--          Currently NULL for all rows; will be populated by the asset pipeline.

BEGIN;

ALTER TABLE story_beats
    ADD COLUMN IF NOT EXISTS content_image_path VARCHAR(255) DEFAULT NULL;

COMMIT;
