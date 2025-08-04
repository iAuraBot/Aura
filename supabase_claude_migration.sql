-- Migration for Claude conversation history
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS conversation_history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('telegram', 'twitch')),
    chat_id TEXT NOT NULL,
    user_message TEXT,
    claude_reply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_user_platform 
ON conversation_history (user_id, platform, chat_id);

CREATE INDEX IF NOT EXISTS idx_conversation_created_at 
ON conversation_history (created_at DESC);

-- Add RLS (Row Level Security) if needed
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY IF NOT EXISTS "Allow all operations on conversation_history" 
ON conversation_history FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE conversation_history IS 'Stores conversation history between users and Claude AI';
COMMENT ON COLUMN conversation_history.user_id IS 'User ID from Telegram or Twitch';
COMMENT ON COLUMN conversation_history.platform IS 'Platform: telegram or twitch';
COMMENT ON COLUMN conversation_history.chat_id IS 'Chat/Channel ID where conversation happened';
COMMENT ON COLUMN conversation_history.user_message IS 'Message from user';
COMMENT ON COLUMN conversation_history.claude_reply IS 'Reply from Claude AI';