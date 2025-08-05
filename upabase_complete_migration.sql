[1mdiff --git a/supabase_complete_migration.sql b/supabase_complete_migration.sql[m
[1mindex b22a899..0b658d6 100644[m
[1m--- a/supabase_complete_migration.sql[m
[1m+++ b/supabase_complete_migration.sql[m
[36m@@ -43,10 +43,7 @@[m [mCREATE TABLE IF NOT EXISTS conversation_history ([m
   chat_id TEXT,[m
   message_text TEXT NOT NULL,[m
   is_user_message BOOLEAN NOT NULL DEFAULT true,[m
[31m-  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),[m
[31m-  [m
[31m-  -- Index for efficient retrieval[m
[31m-  INDEX(user_id, platform, created_at DESC)[m
[32m+[m[32m  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()[m
 );[m
 [m
 -- 4. Create bot_state table for Twitter integration[m
[36m@@ -57,6 +54,14 @@[m [mCREATE TABLE IF NOT EXISTS bot_state ([m
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()[m
 );[m
 [m
[32m+[m[32m-- Add missing columns if table exists but incomplete[m
[32m+[m[32mALTER TABLE bot_state ADD COLUMN IF NOT EXISTS value JSONB;[m
[32m+[m[32mALTER TABLE bot_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();[m
[32m+[m
[32m+[m[32m-- Make value column NOT NULL after adding it[m
[32m+[m[32mUPDATE bot_state SET value = '{}'::jsonb WHERE value IS NULL;[m
[32m+[m[32mALTER TABLE bot_state ALTER COLUMN value SET NOT NULL;[m
[32m+[m
 -- Insert default bot state for Twitter[m
 INSERT INTO bot_state (key, value) VALUES ([m
   'twitter_polling',[m
[36m@@ -75,10 +80,7 @@[m [mCREATE TABLE IF NOT EXISTS twitter_memory ([m
   message_text TEXT NOT NULL,[m
   is_user_message BOOLEAN NOT NULL DEFAULT true,[m
   tweet_id TEXT,[m
[31m-  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),[m
[31m-  [m
[31m-  -- Index for efficient retrieval[m
[31m-  INDEX(user_id, created_at DESC)[m
[32m+[m[32m  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()[m
 );[m
 [m
 -- 6. Create channel_settings table for family-friendly mode[m
