-- =============================================================================
-- SQL Script for Book Agent Reader Database Schema
-- Based on requirements in docs/BOOK_AGENT_READER.md
-- =============================================================================
--
-- Table creation order accounts for FK dependencies:
--   books -> chapters -> locations -> scenes -> story_beats -> semantic_tags
--   entities -> entity_aliases, entity_scene_appearances, entity_beat_appearances
--   locations -> location_aliases, location_scene_appearances
--   processing_runs, review_items
--

-- Helper function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';


-- =============================================================================
-- 4.1 Narrative Hierarchy
-- =============================================================================

-- books
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    book_number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_books_modtime
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- chapters
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title VARCHAR(255),
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'not_started',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, chapter_number)
);

CREATE TRIGGER update_chapters_modtime
    BEFORE UPDATE ON chapters
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- locations (created before scenes so scenes.primary_location_id can reference it)
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    location_type VARCHAR(50),
    base_visual TEXT,
    base_auditory TEXT,
    base_olfactory TEXT,
    base_tactile TEXT,
    base_atmosphere TEXT,
    first_appearance_scene_id INTEGER, -- FK added via ALTER after scenes table exists
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_locations_modtime
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- scenes
CREATE TABLE IF NOT EXISTS scenes (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scene_number INTEGER NOT NULL,
    title VARCHAR(255),
    summary TEXT,
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    primary_location_id INTEGER REFERENCES locations(id),
    has_hard_break BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chapter_id, scene_number)
);

CREATE TRIGGER update_scenes_modtime
    BEFORE UPDATE ON scenes
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Now add the deferred FK from locations -> scenes
ALTER TABLE locations
    ADD CONSTRAINT fk_locations_first_appearance_scene
    FOREIGN KEY (first_appearance_scene_id) REFERENCES scenes(id) ON DELETE SET NULL;

-- story_beats
CREATE TABLE IF NOT EXISTS story_beats (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    beat_number INTEGER NOT NULL,
    summary VARCHAR(500),
    raw_text TEXT,
    sort_order INTEGER NOT NULL,
    location_id INTEGER REFERENCES locations(id),
    intensity SMALLINT CHECK (intensity BETWEEN 1 AND 5),
    pacing VARCHAR(50),
    timeline_context VARCHAR(50) CHECK (timeline_context IN ('present', 'flashback', 'dream', 'vision', 'future')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id, beat_number)
);

CREATE TRIGGER update_story_beats_modtime
    BEFORE UPDATE ON story_beats
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- =============================================================================
-- 4.2 Entities (Characters, Enemies, Neutral Figures)
-- =============================================================================

-- entities
CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(255) UNIQUE NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    is_generated BOOLEAN DEFAULT FALSE,
    base_description TEXT,
    base_emotional_state TEXT,
    base_sounds TEXT,
    base_smells TEXT,
    base_equipment TEXT,
    base_abilities TEXT,
    first_appearance_scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_entities_modtime
    BEFORE UPDATE ON entities
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- entity_aliases
CREATE TABLE IF NOT EXISTS entity_aliases (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    context TEXT,
    UNIQUE(entity_id, alias)
);

-- entity_scene_appearances
CREATE TABLE IF NOT EXISTS entity_scene_appearances (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_present BOOLEAN DEFAULT TRUE,
    description_delta TEXT,
    emotional_state_delta TEXT,
    equipment_delta TEXT,
    exit_reason VARCHAR(255),
    entry_context TEXT,
    relationships TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, scene_id)
);

CREATE TRIGGER update_entity_scene_appearances_modtime
    BEFORE UPDATE ON entity_scene_appearances
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- entity_beat_appearances
CREATE TABLE IF NOT EXISTS entity_beat_appearances (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    story_beat_id INTEGER NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    beat_context TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_id, story_beat_id)
);


-- =============================================================================
-- 4.3 Locations (aliases and scene appearances)
-- =============================================================================

-- location_aliases
CREATE TABLE IF NOT EXISTS location_aliases (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    alias VARCHAR(255) NOT NULL,
    context TEXT,
    UNIQUE(location_id, alias)
);

-- location_scene_appearances
CREATE TABLE IF NOT EXISTS location_scene_appearances (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    visual_delta TEXT,
    auditory_delta TEXT,
    olfactory_delta TEXT,
    tactile_delta TEXT,
    atmosphere_delta TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, scene_id)
);

CREATE TRIGGER update_location_scene_appearances_modtime
    BEFORE UPDATE ON location_scene_appearances
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- =============================================================================
-- 4.4 Semantic Tags
-- =============================================================================

CREATE TABLE IF NOT EXISTS semantic_tags (
    id SERIAL PRIMARY KEY,
    story_beat_id INTEGER NOT NULL REFERENCES story_beats(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    value VARCHAR(100) NOT NULL,
    canonical_value VARCHAR(100),
    notes TEXT,
    ai_provider VARCHAR(50),
    ai_model_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_semantic_tags_modtime
    BEFORE UPDATE ON semantic_tags
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- =============================================================================
-- 4.5 Processing State & Audit
-- =============================================================================

-- processing_runs
CREATE TABLE IF NOT EXISTS processing_runs (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    phase INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running',
    last_completed_chapter_id INTEGER REFERENCES chapters(id),
    claude_tokens_used BIGINT DEFAULT 0,
    gemini_tokens_used BIGINT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- review_items
CREATE TABLE IF NOT EXISTS review_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    suggested_action TEXT,
    affected_entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
    affected_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    affected_scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    affected_beat_id INTEGER REFERENCES story_beats(id) ON DELETE SET NULL,
    review_status VARCHAR(50) DEFAULT 'pending_review',
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_review_items_modtime
    BEFORE UPDATE ON review_items
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- =============================================================================
-- 4.6 Indexes
-- =============================================================================

-- Narrative hierarchy
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_processing_status ON chapters(processing_status);
CREATE INDEX idx_scenes_chapter_id ON scenes(chapter_id);
CREATE INDEX idx_scenes_primary_location_id ON scenes(primary_location_id);
CREATE INDEX idx_story_beats_scene_id ON story_beats(scene_id);
CREATE INDEX idx_story_beats_location_id ON story_beats(location_id);

-- Entity appearances
CREATE INDEX idx_entity_scene_app_entity_id ON entity_scene_appearances(entity_id);
CREATE INDEX idx_entity_scene_app_scene_id ON entity_scene_appearances(scene_id);
CREATE INDEX idx_entity_beat_app_entity_id ON entity_beat_appearances(entity_id);
CREATE INDEX idx_entity_beat_app_beat_id ON entity_beat_appearances(story_beat_id);

-- Location appearances
CREATE INDEX idx_location_scene_app_location_id ON location_scene_appearances(location_id);
CREATE INDEX idx_location_scene_app_scene_id ON location_scene_appearances(scene_id);

-- Semantic tags
CREATE INDEX idx_semantic_tags_beat_id ON semantic_tags(story_beat_id);
CREATE INDEX idx_semantic_tags_category ON semantic_tags(category);

-- Review items
CREATE INDEX idx_review_items_status ON review_items(review_status);
