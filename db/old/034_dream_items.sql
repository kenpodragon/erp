-- Migration 034: Dream Item System Schema (2.4.2)

-- 1. gear_slots
CREATE TABLE IF NOT EXISTS gear_slots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. item_prefixes
CREATE TABLE IF NOT EXISTS item_prefixes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    lore_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_item_prefixes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_prefixes_updated_at
    BEFORE UPDATE ON item_prefixes
    FOR EACH ROW EXECUTE FUNCTION update_item_prefixes_updated_at();

-- 3. item_qualities
CREATE TABLE IF NOT EXISTS item_qualities (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    lore_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. item_lore_tags
CREATE TABLE IF NOT EXISTS item_lore_tags (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    narrative_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. item_type_bases
CREATE TABLE IF NOT EXISTS item_type_bases (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    gear_slot_id INTEGER NOT NULL REFERENCES gear_slots(id) ON DELETE RESTRICT,
    base_stat_range JSONB NOT NULL DEFAULT '{}',
    lore_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_item_type_bases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_type_bases_updated_at
    BEFORE UPDATE ON item_type_bases
    FOR EACH ROW EXECUTE FUNCTION update_item_type_bases_updated_at();

-- 6. item_suffixes
CREATE TABLE IF NOT EXISTS item_suffixes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    stat_bonuses JSONB NOT NULL DEFAULT '{}',
    lore_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_item_suffixes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_item_suffixes_updated_at
    BEFORE UPDATE ON item_suffixes
    FOR EACH ROW EXECUTE FUNCTION update_item_suffixes_updated_at();

-- 7. ALTER inventory_items for dream item support
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(60) DEFAULT NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS min_char_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS stat_requirements JSONB NOT NULL DEFAULT '{}';
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS gear_slot_id INTEGER REFERENCES gear_slots(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_dream_item BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS acquired_from VARCHAR(100) DEFAULT NULL;

-- 8. Inventory slot cap enforcement trigger
CREATE OR REPLACE FUNCTION enforce_inventory_slot_cap()
RETURNS TRIGGER AS $$
DECLARE
    stored_count INTEGER;
BEGIN
    IF NEW.is_equipped = FALSE OR NEW.is_equipped IS NULL THEN
        SELECT COUNT(*) INTO stored_count
        FROM player_inventory
        WHERE character_id = NEW.character_id
          AND (is_equipped = FALSE OR is_equipped IS NULL);
        IF stored_count >= 10 THEN
            RAISE EXCEPTION 'Inventory full: maximum 10 stored items per character.'
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_inventory_slot_cap
    BEFORE INSERT ON player_inventory
    FOR EACH ROW EXECUTE FUNCTION enforce_inventory_slot_cap();
