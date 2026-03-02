-- Migration 017: Add audio_path and audio_duration_seconds to story_beats
-- Purpose: Brings DB schema in sync with the StoryBeat ORM model.
--          audio_path   — future hook for per-beat audio narration files.
--          audio_duration_seconds — precomputed duration used for WPM-gating
--                                   fallback when no audio file is present.
--          Both are currently unused by the narrative route; default values
--          keep existing rows functional with zero code changes.

BEGIN;

ALTER TABLE story_beats
    ADD COLUMN IF NOT EXISTS audio_path VARCHAR(255) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER NOT NULL DEFAULT 0;

COMMIT;
