-- Migration 026: Add updated_at to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
