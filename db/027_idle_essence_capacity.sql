-- Migration 027: Idle Essence Capacity Config
-- Purpose: Adds configurable essence capacity for idle training soft-gate.

INSERT INTO game_configs (key, value_json, description)
VALUES
    ('idle_essence_capacity', 
     '1000', 
     'Base Elysium Essence capacity for idle training stability calculation. Overflows are allowed but stability caps at 100%.')
ON CONFLICT (key) DO NOTHING;
