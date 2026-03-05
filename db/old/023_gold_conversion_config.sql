-- Migration 023: Gold to Essence Conversion Configuration
-- Sets up the tuning values for converting Story Mode session gold into permanent Player Essence.

INSERT INTO game_configs (key, value_json, description) VALUES
    ('gold_to_essence_base_rate', 
     '1000', 
     'The initial amount of gold required to earn 1 unit of Essence at Zone 1.'),
    
    ('gold_to_essence_growth_factor', 
     '1.07', 
     'The exponential growth of the conversion rate per zone. A factor of 1.07 means the cost in gold for 1 essence increases by 7% each zone, keeping essence gain normalized against exponential gold scaling.')
ON CONFLICT (key) DO NOTHING;
