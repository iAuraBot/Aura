-- Bot Statistics Table for persistent rate limiting
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS bot_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    daily_replies INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_bot_stats_date ON bot_stats(date);

-- Add RLS policy if needed (optional - adjust based on your security needs)
-- ALTER TABLE bot_stats ENABLE ROW LEVEL SECURITY;

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_bot_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bot_stats_updated_at
    BEFORE UPDATE ON bot_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_bot_stats_updated_at();

-- Insert today's row if it doesn't exist (with 0 replies)
INSERT INTO bot_stats (date, daily_replies) 
VALUES (CURRENT_DATE::TEXT, 0) 
ON CONFLICT (date) DO NOTHING;

