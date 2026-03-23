-- Migration 065: Add visual/combat FK columns to entity_gameplay_data
-- Extends the table with nullable references to lookup tables (created in 064).
-- All columns NULLABLE — NOT NULL constraints added after data population.

ALTER TABLE entity_gameplay_data
    ADD COLUMN IF NOT EXISTS movement_type_id INTEGER REFERENCES movement_types(id),
    ADD COLUMN IF NOT EXISTS size_class_id INTEGER REFERENCES size_classes(id),
    ADD COLUMN IF NOT EXISTS animation_style_id INTEGER REFERENCES animation_styles(id),
    ADD COLUMN IF NOT EXISTS silhouette_type_id INTEGER REFERENCES silhouette_types(id),
    ADD COLUMN IF NOT EXISTS color_primary TEXT,
    ADD COLUMN IF NOT EXISTS color_secondary TEXT,
    ADD COLUMN IF NOT EXISTS primary_attack_type_id INTEGER REFERENCES attack_types(id),
    ADD COLUMN IF NOT EXISTS secondary_attack_type_id INTEGER REFERENCES attack_types(id),
    ADD COLUMN IF NOT EXISTS tertiary_attack_type_id INTEGER REFERENCES attack_types(id);
