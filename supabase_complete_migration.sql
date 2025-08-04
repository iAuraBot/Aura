-- Complete AuraFarmBot Database Migration
-- Run this in your Supabase SQL Editor

-- 1. Ensure aura table has platform support
ALTER TABLE aura 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'telegram';

-- Update existing records to be marked as 'telegram'
UPDATE aura 
SET platform = 'telegram' 
WHERE platform IS NULL;

-- Make platform NOT NULL now that all records have values
ALTER TABLE aura 
ALTER COLUMN platform SET NOT NULL;

-- 2. Create channel_configs table for Twitch OAuth
CREATE TABLE IF NOT EXISTS channel_configs (
  id BIGSERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_login TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  bot_enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{
    "farm_cooldown": 24,
    "farm_min_reward": 20,
    "farm_max_reward": 50,
    "duel_enabled": true,
    "blessing_enabled": true,
    "custom_welcome": null,
    "custom_flavors": null
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create conversation_history table for Claude AI
CREATE TABLE IF NOT EXISTS conversation_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'telegram',
  chat_id TEXT,
  message_text TEXT NOT NULL,
  is_user_message BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient retrieval
  INDEX(user_id, platform, created_at DESC)
);

-- 4. Create bot_state table for Twitter integration
CREATE TABLE IF NOT EXISTS bot_state (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default bot state for Twitter
INSERT INTO bot_state (key, value) VALUES (
  'twitter_polling',
  '{
    "last_mention_id": null,
    "daily_reply_count": 0,
    "daily_reset_date": null
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- 5. Create twitter_memory table for Twitter conversations
CREATE TABLE IF NOT EXISTS twitter_memory (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT,
  message_text TEXT NOT NULL,
  is_user_message BOOLEAN NOT NULL DEFAULT true,
  tweet_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient retrieval
  INDEX(user_id, created_at DESC)
);

-- 6. Create channel_settings table for family-friendly mode
CREATE TABLE IF NOT EXISTS channel_settings (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  family_friendly BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one setting per platform+channel combination
  UNIQUE(platform, channel_id)
);

-- 7. Enable Row Level Security (RLS) on all tables
ALTER TABLE aura ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_settings ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for public access (bot operations)
-- Aura table policies
DROP POLICY IF EXISTS "Allow all operations on aura table" ON aura;
CREATE POLICY "Allow all operations on aura table"
  ON aura FOR ALL
  USING (true)
  WITH CHECK (true);

-- Channel configs policies
DROP POLICY IF EXISTS "Allow all operations on channel_configs table" ON channel_configs;
CREATE POLICY "Allow all operations on channel_configs table"
  ON channel_configs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Conversation history policies
DROP POLICY IF EXISTS "Allow all operations on conversation_history table" ON conversation_history;
CREATE POLICY "Allow all operations on conversation_history table"
  ON conversation_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- Bot state policies
DROP POLICY IF EXISTS "Allow all operations on bot_state table" ON bot_state;
CREATE POLICY "Allow all operations on bot_state table"
  ON bot_state FOR ALL
  USING (true)
  WITH CHECK (true);

-- Twitter memory policies
DROP POLICY IF EXISTS "Allow all operations on twitter_memory table" ON twitter_memory;
CREATE POLICY "Allow all operations on twitter_memory table"
  ON twitter_memory FOR ALL
  USING (true)
  WITH CHECK (true);

-- Channel settings policies
DROP POLICY IF EXISTS "Allow all operations on channel_settings table" ON channel_settings;
CREATE POLICY "Allow all operations on channel_settings table"
  ON channel_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_aura_platform_chat ON aura(platform, user_id);
CREATE INDEX IF NOT EXISTS idx_aura_username ON aura(username);
CREATE INDEX IF NOT EXISTS idx_channel_configs_login ON channel_configs(channel_login);
CREATE INDEX IF NOT EXISTS idx_conversation_user_platform ON conversation_history(user_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_memory_user ON twitter_memory(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_settings_platform_channel ON channel_settings(platform, channel_id);

-- 10. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Create triggers to automatically update updated_at on changes
DROP TRIGGER IF EXISTS update_channel_configs_updated_at ON channel_configs;
CREATE TRIGGER update_channel_configs_updated_at
  BEFORE UPDATE ON channel_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channel_settings_updated_at ON channel_settings;
CREATE TRIGGER update_channel_settings_updated_at
  BEFORE UPDATE ON channel_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Verify all tables exist
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('aura', 'channel_configs', 'conversation_history', 'bot_state', 'twitter_memory', 'channel_settings')
ORDER BY table_name;