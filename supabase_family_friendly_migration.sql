-- Add family-friendly mode support for Twitch channels
-- Run this in your Supabase SQL Editor

-- Create channel_settings table to track per-channel preferences
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

-- Add RLS (Row Level Security) policies
ALTER TABLE channel_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read channel settings
DROP POLICY IF EXISTS "Allow authenticated users to read channel settings" ON channel_settings;
CREATE POLICY "Allow authenticated users to read channel settings"
  ON channel_settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update channel settings
DROP POLICY IF EXISTS "Allow authenticated users to manage channel settings" ON channel_settings;
CREATE POLICY "Allow authenticated users to manage channel settings"
  ON channel_settings FOR ALL
  TO authenticated
  USING (true);

-- Allow anonymous users to read/update for bot functionality
DROP POLICY IF EXISTS "Allow anonymous access for bot operations" ON channel_settings;
CREATE POLICY "Allow anonymous access for bot operations"
  ON channel_settings FOR ALL
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channel_settings_platform_channel ON channel_settings(platform, channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_settings_family_friendly ON channel_settings(platform, family_friendly);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on changes
DROP TRIGGER IF EXISTS update_channel_settings_updated_at ON channel_settings;
CREATE TRIGGER update_channel_settings_updated_at
  BEFORE UPDATE ON channel_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'channel_settings'
ORDER BY ordinal_position;