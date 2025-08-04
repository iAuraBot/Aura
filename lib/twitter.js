const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');
const claude = require('./claude');

// Configuration
const TWITTER_DAILY_CAP = parseInt(process.env.TWITTER_DAILY_CAP) || 50;
const TWITTER_REPLY_CHANCE = parseFloat(process.env.TWITTER_REPLY_CHANCE) || 0.4;
const USE_SHARED_MEMORY = process.env.USE_SHARED_MEMORY === 'true';
const USER_COOLDOWN_MINUTES = 10;

// Initialize services
let twitterClient = null;
let supabase = null;
let isTwitterAvailable = false;

// Initialize Twitter client and Supabase
function initializeTwitter() {
  // Check if Twitter credentials are available
  if (!process.env.TWITTER_API_KEY || 
      !process.env.TWITTER_API_SECRET || 
      !process.env.TWITTER_ACCESS_TOKEN || 
      !process.env.TWITTER_ACCESS_SECRET) {
    console.log('⚠️ Twitter credentials not found. Twitter functionality disabled.');
    return false;
  }

  try {
    // Initialize Twitter client
    twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    // Initialize Supabase
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY,
      {
        db: { schema: 'public' },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    isTwitterAvailable = true;
    console.log('✅ Twitter integration initialized');
    console.log(`🎯 Daily cap: ${TWITTER_DAILY_CAP} replies, Reply chance: ${(TWITTER_REPLY_CHANCE * 100)}%`);
    return true;

  } catch (error) {
    claude.logError('Failed to initialize Twitter:', error);
    console.log('❌ Twitter initialization failed');
    return false;
  }
}

// Get bot state from Supabase
async function getBotState() {
  try {
    const { data, error } = await supabase
      .from('bot_state')
      .select('*')
      .eq('key', 'twitter')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Default state if not found
    if (!data) {
      const defaultState = {
        key: 'twitter',
        last_mention_id: null,
        daily_reply_count: 0,
        daily_reset_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('bot_state')
        .insert(defaultState);

      if (insertError) {
        claude.logError('Error creating default bot state:', insertError);
      }

      return defaultState;
    }

    return data;
  } catch (error) {
    claude.logError('Error getting bot state:', error);
    return {
      last_mention_id: null,
      daily_reply_count: 0,
      daily_reset_date: new Date().toISOString().split('T')[0]
    };
  }
}

// Update bot state in Supabase
async function updateBotState(updates) {
  try {
    const { error } = await supabase
      .from('bot_state')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('key', 'twitter');

    if (error) {
      claude.logError('Error updating bot state:', error);
    }
  } catch (error) {
    claude.logError('Error updating bot state:', error);
  }
}

// Check if daily count needs reset
function shouldResetDailyCount(currentDate, lastResetDate) {
  return currentDate !== lastResetDate;
}

// Check user cooldown
async function isUserOnCooldown(userId) {
  try {
    const cooldownMinutes = USER_COOLDOWN_MINUTES;
    const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    const tableName = USE_SHARED_MEMORY ? 'conversation_history' : 'twitter_memory';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('created_at')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .gte('created_at', cooldownTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      claude.logError('Error checking user cooldown:', error);
      return false; // If error, allow reply
    }

    return data && data.length > 0;
  } catch (error) {
    claude.logError('Error checking user cooldown:', error);
    return false; // If error, allow reply
  }
}

// Store Twitter conversation
async function storeTwitterConversation(userId, username, userMessage, claudeReply, tweetId) {
  try {
    const tableName = USE_SHARED_MEMORY ? 'conversation_history' : 'twitter_memory';
    
    const conversationData = {
      user_id: userId,
      platform: 'twitter',
      chat_id: 'twitter_global', // Twitter doesn't have chat rooms
      user_message: userMessage,
      claude_reply: claudeReply,
      tweet_id: tweetId,
      username: username,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(tableName)
      .insert(conversationData);

    if (error) {
      claude.logError('Error storing Twitter conversation:', error);
    }
  } catch (error) {
    claude.logError('Error storing Twitter conversation:', error);
  }
}

// Get conversation context for user
async function getTwitterContext(userId) {
  try {
    const tableName = USE_SHARED_MEMORY ? 'conversation_history' : 'twitter_memory';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('user_message, claude_reply, created_at')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      claude.logError('Error getting Twitter context:', error);
      return [];
    }

    // Convert to Claude message format
    const messages = [];
    if (data) {
      data.reverse().forEach(row => {
        if (row.user_message) {
          messages.push({
            content: row.user_message,
            isUser: true,
            timestamp: row.created_at
          });
        }
        if (row.claude_reply) {
          messages.push({
            content: row.claude_reply,
            isUser: false,
            timestamp: row.created_at
          });
        }
      });
    }

    return messages;
  } catch (error) {
    claude.logError('Error getting Twitter context:', error);
    return [];
  }
}

// Clean tweet text for Claude
function cleanTweetText(text, botUsername) {
  // Remove @mentions of the bot
  let cleanText = text.replace(new RegExp(`@${botUsername}`, 'gi'), '').trim();
  
  // Remove URLs
  cleanText = cleanText.replace(/https?:\/\/\S+/gi, '').trim();
  
  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return cleanText;
}

// Main polling function
async function pollMentionsAndReply() {
  if (!isTwitterAvailable || !twitterClient || !supabase) {
    return;
  }

  try {
    console.log('🐦 Polling Twitter mentions...');

    // Get current bot state
    const botState = await getBotState();
    const currentDate = new Date().toISOString().split('T')[0];

    // Reset daily count if needed
    let dailyReplyCount = botState.daily_reply_count;
    if (shouldResetDailyCount(currentDate, botState.daily_reset_date)) {
      dailyReplyCount = 0;
      await updateBotState({
        daily_reply_count: 0,
        daily_reset_date: currentDate
      });
      console.log('🔄 Daily Twitter reply count reset');
    }

    // Check daily cap
    if (dailyReplyCount >= TWITTER_DAILY_CAP) {
      console.log(`⏰ Daily Twitter reply cap reached (${TWITTER_DAILY_CAP}). Skipping polling.`);
      return;
    }

    // Fetch mentions
    const mentionsQuery = {
      max_results: 10,
      'tweet.fields': 'id,text,author_id,created_at,public_metrics',
      'user.fields': 'username,name',
      expansions: 'author_id'
    };

    if (botState.last_mention_id) {
      mentionsQuery.since_id = botState.last_mention_id;
    }

    // Get bot's user ID first
    const botUser = await twitterClient.v2.me();
    const mentions = await twitterClient.v2.userMentionTimeline(botUser.data.id, mentionsQuery);

    if (!mentions.data || mentions.data.length === 0) {
      console.log('📭 No new Twitter mentions found');
      return;
    }

    console.log(`📬 Found ${mentions.data.length} new Twitter mentions`);

    let repliesProcessed = 0;
    let repliesSent = 0;
    let lastProcessedId = botState.last_mention_id;

    // Process each mention
    for (const tweet of mentions.data) {
      try {
        repliesProcessed++;

        // Update last processed ID
        lastProcessedId = tweet.id;

        // Get author info
        const author = mentions.includes?.users?.find(user => user.id === tweet.author_id);
        const authorUsername = author?.username || 'unknown';

        console.log(`🔍 Processing mention from @${authorUsername}: "${tweet.text.substring(0, 50)}..."`);

        // Check if we've hit daily cap
        if (dailyReplyCount >= TWITTER_DAILY_CAP) {
          console.log(`⏰ Hit daily cap during processing. Stopping at ${TWITTER_DAILY_CAP} replies.`);
          break;
        }

        // Apply random chance filter
        if (Math.random() > TWITTER_REPLY_CHANCE) {
          console.log(`🎲 Random chance skip for @${authorUsername} (${(TWITTER_REPLY_CHANCE * 100)}% chance)`);
          continue;
        }

        // Check user cooldown
        if (await isUserOnCooldown(tweet.author_id)) {
          console.log(`⏱️ User @${authorUsername} on cooldown (${USER_COOLDOWN_MINUTES}min). Skipping.`);
          continue;
        }

        // Clean tweet text
        const cleanText = cleanTweetText(tweet.text, process.env.TWITTER_BOT_USERNAME || 'aurafarmbot');

        if (cleanText.length < 2) {
          console.log(`📝 Tweet too short after cleaning. Skipping.`);
          continue;
        }

        // Get conversation context
        const context = await getTwitterContext(tweet.author_id);

        // Generate Claude reply
        console.log(`🤖 Generating Claude reply for @${authorUsername}...`);
        const claudeReply = await claude.getBrainrotReply(
          tweet.author_id, 
          cleanText, 
          'twitter', 
          'twitter_global'
        );

        // Post reply
        const reply = await twitterClient.v2.reply(claudeReply, tweet.id);

        if (reply.data) {
          console.log(`✅ Replied to @${authorUsername}: "${claudeReply}"`);
          repliesSent++;
          dailyReplyCount++;

          // Store conversation
          await storeTwitterConversation(
            tweet.author_id,
            authorUsername,
            cleanText,
            claudeReply,
            tweet.id
          );

          // Update daily count
          await updateBotState({
            daily_reply_count: dailyReplyCount
          });

        } else {
          console.log(`❌ Failed to reply to @${authorUsername}`);
        }

      } catch (tweetError) {
        claude.logError(`Error processing tweet ${tweet.id}:`, tweetError);
        continue;
      }
    }

    // Update last mention ID
    if (lastProcessedId && lastProcessedId !== botState.last_mention_id) {
      await updateBotState({
        last_mention_id: lastProcessedId
      });
    }

    const remaining = TWITTER_DAILY_CAP - dailyReplyCount;
    console.log(`🎯 Twitter polling complete: ${repliesProcessed} processed, ${repliesSent} replied, ${remaining} remaining today`);

  } catch (error) {
    // Handle rate limiting specifically
    if (error.code === 429 || error.rateLimit) {
      console.log('⏰ Twitter API rate limit reached. Waiting for next poll cycle...');
      return;
    }
    
    // Handle other API errors
    if (error.code) {
      console.error(`❌ Twitter API Error ${error.code}: ${error.message || error}`);
    } else {
      console.error('❌ Error in Twitter polling:', error.message || error);
    }
    
    // Log to Sentry if available
    if (claude.logError) {
      claude.logError('Twitter polling error:', error);
    }
  }
}

// Start Twitter polling
function startTwitterPolling() {
  if (!isTwitterAvailable) {
    console.log('⚠️ Twitter polling not started (credentials missing)');
    return null;
  }

  console.log('🐦 Twitter mention polling active (every 5 minutes)');
  
  // Initial poll
  setTimeout(pollMentionsAndReply, 30000); // Wait 30 seconds after startup
  
  // Set up interval (5 minutes to avoid rate limits)
  const pollInterval = setInterval(pollMentionsAndReply, 5 * 60 * 1000);
  
  return pollInterval;
}

// Stop Twitter polling
function stopTwitterPolling(pollInterval) {
  if (pollInterval) {
    clearInterval(pollInterval);
    console.log('🐦 Twitter polling stopped');
  }
}

// Initialize on module load
const initialized = initializeTwitter();

module.exports = {
  pollMentionsAndReply,
  startTwitterPolling,
  stopTwitterPolling,
  isTwitterAvailable: () => isTwitterAvailable,
  TWITTER_DAILY_CAP,
  TWITTER_REPLY_CHANCE,
  USE_SHARED_MEMORY
};