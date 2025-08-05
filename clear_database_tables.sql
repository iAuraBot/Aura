-- CLEAR ALL AURA BOT TABLE DATA
-- Run this in Supabase SQL Editor to start fresh

-- Clear all user aura data
TRUNCATE TABLE aura RESTART IDENTITY CASCADE;

-- Clear conversation history
TRUNCATE TABLE conversation_history RESTART IDENTITY CASCADE;

-- Clear Twitter memory data  
TRUNCATE TABLE twitter_memory RESTART IDENTITY CASCADE;

-- Clear bot state (but keep the structure)
TRUNCATE TABLE bot_state RESTART IDENTITY CASCADE;

-- Re-insert default bot state for Twitter
INSERT INTO bot_state (key, value) VALUES (
  'twitter_polling',
  '{
    "last_mention_id": null,
    "daily_reply_count": 0,
    "daily_reset_date": null
  }'::jsonb
);

-- Clear channel settings (optional - this will reset family-friendly modes)
-- TRUNCATE TABLE channel_settings RESTART IDENTITY CASCADE;

-- Verify tables are empty
SELECT 'aura' as table_name, COUNT(*) as remaining_rows FROM aura
UNION ALL
SELECT 'conversation_history', COUNT(*) FROM conversation_history  
UNION ALL
SELECT 'twitter_memory', COUNT(*) FROM twitter_memory
UNION ALL
SELECT 'bot_state', COUNT(*) FROM bot_state;

-- Success message
SELECT 'Database cleared successfully! All user data reset.' as status;