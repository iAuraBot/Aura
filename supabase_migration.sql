-- Add platform column to support multi-platform aura ecosystems
-- Run this in your Supabase SQL Editor

ALTER TABLE aura 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'telegram';

-- Update existing records to be marked as 'telegram'
UPDATE aura 
SET platform = 'telegram' 
WHERE platform IS NULL;

-- Make platform NOT NULL now that all records have values
ALTER TABLE aura 
ALTER COLUMN platform SET NOT NULL;

-- Optional: Add an index for better performance on platform queries
CREATE INDEX IF NOT EXISTS idx_aura_platform_chat ON aura(platform, user_id);

-- Verify the changes
SELECT platform, COUNT(*) as user_count 
FROM aura 
GROUP BY platform;