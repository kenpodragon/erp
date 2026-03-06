-- Migration 032: Skill Prerequisite System (2.4.1)
-- Creates: skill_prerequisites
-- Modifies: skills (add display_name, level_0_xp_requirement, class_id, is_class_exclusive, idle_level_scaling, effect_type)
-- Modifies: character_skill_levels (add max_session_level)
-- ============================================================================

-- §4.1 skill_prerequisites table
CREATE TABLE IF NOT EXISTS skill_prerequisites (
    id                  SERIAL PRIMARY KEY,
    skill_id            INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    prerequisite_type   VARCHAR(30) NOT NULL
                            CHECK (prerequisite_type IN (
                                'idle_skill_level',
                                'active_skill_level',
                                'stat_value',
                                'character_level',
                                'scene_cleared'
                            )),
    ref_id              INTEGER DEFAULT NULL,
    min_value           INTEGER NOT NULL DEFAULT 1,
    display_hint        TEXT DEFAULT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_prerequisites_skill_id
    ON skill_prerequisites(skill_id);

-- §4.2 Modify skills: add display_name, Level 0 support, class-exclusivity, idle_level_scaling, effect_type
ALTER TABLE skills
    ADD COLUMN IF NOT EXISTS display_name            VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS level_0_xp_requirement  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS class_id                INTEGER REFERENCES character_classes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_class_exclusive       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS idle_level_scaling       JSONB   DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS effect_type              VARCHAR(50) DEFAULT NULL;

-- Backfill display_name for existing skills (set to name if NULL)
UPDATE skills SET display_name = name WHERE display_name IS NULL;

-- §4.3 Modify character_skill_levels: add max_session_level
ALTER TABLE character_skill_levels
    ADD COLUMN IF NOT EXISTS max_session_level INTEGER NOT NULL DEFAULT 0;
