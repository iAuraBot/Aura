-- Add special_data column to aura table for tracking daily special command usage
-- Run this in your Supabase SQL Editor

ALTER TABLE aura 
ADD COLUMN IF NOT EXISTS special_data TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN aura.special_data IS 'JSON data tracking daily usage of special commands (/edge, /goon, /mew)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'aura' AND column_name = 'special_data';