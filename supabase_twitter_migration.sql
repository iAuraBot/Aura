-- Migration for Twitter integration
-- Run this in your Supabase SQL editor

-- Create bot_state table for persisting Twitter state
CREATE TABLE IF NOT EXISTS bot_state (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    last_mention_id TEXT,
    daily_reply_count INTEGER DEFAULT 0,
    daily_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create twitter_memory table (separate from shared conversation_history)
-- Only needed if USE_SHARED_MEMORY=false
CREATE TABLE IF NOT EXISTS twitter_memory (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'twitter',
    chat_id TEXT NOT NULL DEFAULT 'twitter_global',
    user_message TEXT,
    claude_reply TEXT,
    tweet_id TEXT,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bot_state_key ON bot_state (key);

CREATE INDEX IF NOT EXISTS idx_twitter_memory_user_platform 
ON twitter_memory (user_id, platform);

CREATE INDEX IF NOT EXISTS idx_twitter_memory_created_at 
ON twitter_memory (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_twitter_memory_tweet_id 
ON twitter_memory (tweet_id);

-- Add RLS (Row Level Security)
ALTER TABLE bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_memory ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations
DROP POLICY IF EXISTS "Allow all operations on bot_state" ON bot_state;
CREATE POLICY "Allow all operations on bot_state" 
ON bot_state FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on twitter_memory" ON twitter_memory;
CREATE POLICY "Allow all operations on twitter_memory" 
ON twitter_memory FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE bot_state IS 'Stores persistent bot state (Twitter lastMentionId, daily counts, etc.)';
COMMENT ON COLUMN bot_state.key IS 'State key identifier (e.g., "twitter")';
COMMENT ON COLUMN bot_state.last_mention_id IS 'Last processed Twitter mention ID';
COMMENT ON COLUMN bot_state.daily_reply_count IS 'Number of replies sent today';
COMMENT ON COLUMN bot_state.daily_reset_date IS 'Date when daily count was last reset';

COMMENT ON TABLE twitter_memory IS 'Stores Twitter conversation history (if not using shared memory)';
COMMENT ON COLUMN twitter_memory.user_id IS 'Twitter user ID';
COMMENT ON COLUMN twitter_memory.platform IS 'Platform identifier (always "twitter")';
COMMENT ON COLUMN twitter_memory.chat_id IS 'Chat identifier (always "twitter_global")';
COMMENT ON COLUMN twitter_memory.user_message IS 'User tweet content (cleaned)';
COMMENT ON COLUMN twitter_memory.claude_reply IS 'Bot reply content';
COMMENT ON COLUMN twitter_memory.tweet_id IS 'Original tweet ID for reference';
COMMENT ON COLUMN twitter_memory.username IS 'Twitter username for debugging';