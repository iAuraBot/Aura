-- Kick Platform Integration Migration
-- Run this in your Supabase SQL Editor

-- 1. Add platform column to channel_configs table
ALTER TABLE channel_configs 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'twitch';

-- 2. Update existing Twitch records to have platform set
UPDATE channel_configs 
SET platform = 'twitch' 
WHERE platform IS NULL;

-- 3. Make platform column NOT NULL
ALTER TABLE channel_configs 
ALTER COLUMN platform SET NOT NULL;

-- 4. Update unique constraint to include platform (allows same channel on different platforms)
ALTER TABLE channel_configs 
DROP CONSTRAINT IF EXISTS channel_configs_channel_id_key;

-- Add new unique constraint on platform + channel_id combination
ALTER TABLE channel_configs 
ADD CONSTRAINT channel_configs_platform_channel_unique 
UNIQUE (platform, channel_id);

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_channel_configs_platform_channel 
ON channel_configs(platform, channel_id);

-- 6. Insert default bot state for Kick (if needed in future)
INSERT INTO bot_state (key, value) VALUES (
  'kick_polling',
  '{
    "connected_channels": [],
    "last_connection_attempt": null
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 7. Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'channel_configs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;