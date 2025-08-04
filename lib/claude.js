const Anthropic = require('@anthropic-ai/sdk');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

// Editable system prompt constant
const BRAINROT_SYSTEM_PROMPT = `You are AuraFarmBot, a chaotic zoomer meme AI.

Speak in unhinged brainrot style: lowercase, emojis, ironic hype, slang, absurd humor.

CRITICAL: Keep replies SHORT (1-2 sentences max). Think Twitch chat vibes, not essays.

Vary your greetings - don't always start with "yo" or "ayo". Mix it up with: "nah", "bruh", "bestie", "homie", "dude", "fam", or just jump straight into your response.

Random memes, ironic roasting, hype phrases allowed.

Never break character or sound formal. Be chaotic but CONCISE.`;

// Initialize services
let claude = null;
let redis = null;
let supabase = null;
let Sentry = null;

// Service status
let isRedisAvailable = false;
let isSentryAvailable = false;

// Initialize Claude and other services
function initializeServices() {
  // Initialize Sentry if DSN is provided
  if (process.env.SENTRY_DSN) {
    try {
      Sentry = require('@sentry/node');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV || 'production'
      });
      isSentryAvailable = true;
      console.log('✅ Sentry initialized');
    } catch (error) {
      console.error('⚠️ Failed to initialize Sentry:', error.message);
      isSentryAvailable = false;
    }
  } else {
    console.log('⚠️ Sentry disabled (SENTRY_DSN not set)');
    isSentryAvailable = false;
  }

  // Initialize Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ Claude AI initialized');
    } catch (error) {
      logError('Failed to initialize Claude:', error);
    }
  } else {
    console.error('❌ ANTHROPIC_API_KEY not found - Claude features disabled');
  }

  // Initialize Redis if URL is provided
  if (process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        commandTimeout: 5000,
      });

      redis.on('connect', () => {
        isRedisAvailable = true;
        console.log('✅ Connected to Redis');
      });

      redis.on('error', (error) => {
        isRedisAvailable = false;
        logError('Redis connection error:', error);
      });

      redis.on('close', () => {
        isRedisAvailable = false;
        console.log('⚠️ Redis connection closed, falling back to Supabase only');
      });

    } catch (error) {
      logError('Failed to initialize Redis:', error);
      isRedisAvailable = false;
    }
  } else {
    console.log('⚠️ Using Supabase memory only (REDIS_URL not set)');
    isRedisAvailable = false;
  }

  // Initialize Supabase (always required for persistence)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY,
        {
          db: { schema: 'public' },
          auth: { autoRefreshToken: false, persistSession: false }
        }
      );
      console.log('✅ Supabase initialized for conversation persistence');
    } catch (error) {
      logError('Failed to initialize Supabase:', error);
    }
  } else {
    console.error('❌ Supabase credentials missing - conversation persistence disabled');
  }
}

// Error logging function with Sentry fallback
function logError(message, error) {
  if (isSentryAvailable && Sentry) {
    Sentry.captureException(error);
  }
  console.error(message, error?.message || error);
}

// Get Redis key for user conversation
function getRedisKey(userId, platform = 'telegram') {
  return `chat:${platform}:${userId}`;
}

// Store message in Redis (with TTL)
async function storeMessageInRedis(userId, platform, message, isUser = true) {
  if (!isRedisAvailable || !redis) return false;

  try {
    const key = getRedisKey(userId, platform);
    const messageData = {
      content: message,
      isUser,
      timestamp: new Date().toISOString()
    };

    // Add to list (most recent first)
    await redis.lpush(key, JSON.stringify(messageData));
    
    // Keep only last 5 messages
    await redis.ltrim(key, 0, 4);
    
    // Set TTL to 1 hour
    await redis.expire(key, 3600);
    
    return true;
  } catch (error) {
    logError('Error storing message in Redis:', error);
    return false;
  }
}

// Get conversation history from Redis
async function getRedisHistory(userId, platform) {
  if (!isRedisAvailable || !redis) return null;

  try {
    const key = getRedisKey(userId, platform);
    const messages = await redis.lrange(key, 0, 4); // Get last 5 messages
    
    return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
  } catch (error) {
    logError('Error getting Redis history:', error);
    return null;
  }
}

// Store message in Supabase (persistent storage)
async function storeMessageInSupabase(userId, platform, chatId, message, isUser = true, claudeReply = null) {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('conversation_history')
      .insert({
        user_id: userId,
        platform: platform,
        chat_id: chatId,
        user_message: isUser ? message : null,
        claude_reply: isUser ? claudeReply : message,
        created_at: new Date().toISOString()
      });

    if (error) {
      logError('Error storing message in Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    logError('Error storing message in Supabase:', error);
    return false;
  }
}

// Get conversation history from Supabase
async function getSupabaseHistory(userId, platform, chatId) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('conversation_history')
      .select('user_message, claude_reply, created_at')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      logError('Error getting Supabase history:', error);
      return [];
    }

    // Convert to message format and reverse for chronological order
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
    logError('Error getting Supabase history:', error);
    return [];
  }
}

// Get conversation context for Claude
async function getConversationContext(userId, platform, chatId) {
  // Try Redis first (faster), fallback to Supabase
  let history = await getRedisHistory(userId, platform);
  
  if (!history || history.length === 0) {
    history = await getSupabaseHistory(userId, platform, chatId);
  }

  // Format for Claude API
  const messages = [];
  
  if (history && history.length > 0) {
    // Add recent conversation context
    history.forEach(msg => {
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      });
    });
  }

  return messages;
}

// Main function: Get brainrot reply from Claude
async function getBrainrotReply(userId, userMessage, platform = 'telegram', chatId = null) {
  try {
    // Validate required services
    if (!claude) {
      return "bro claude is down rn 😭 (api key missing)";
    }

    if (!userMessage || userMessage.trim().length === 0) {
      return "homie you didn't say anything 💀";
    }

    // Get conversation context
    const contextMessages = await getConversationContext(userId, platform, chatId);

    // Add current user message
    const messages = [
      ...contextMessages,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Call Claude API
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 80, // Much shorter for Twitch chat style responses
      temperature: 0.9, // High creativity for chaotic responses
      system: BRAINROT_SYSTEM_PROMPT,
      messages: messages
    });

    const claudeReply = response.content[0]?.text || "my brain crashed lol 🤯";

    // Store messages in memory systems
    try {
      // Store in Redis (if available)
      await storeMessageInRedis(userId, platform, userMessage, true);
      await storeMessageInRedis(userId, platform, claudeReply, false);

      // Store in Supabase for persistence
      if (chatId) {
        await storeMessageInSupabase(userId, platform, chatId, userMessage, true, claudeReply);
      }
    } catch (storageError) {
      logError('Error storing conversation:', storageError);
      // Don't fail the reply if storage fails
    }

    return claudeReply;

  } catch (error) {
    logError('Error in getBrainrotReply:', error);
    
    // Return fallback based on error type
    if (error.message?.includes('rate_limit')) {
      return "yo claude is getting ratio'd rn, too much traffic 😵‍💫";
    } else if (error.message?.includes('insufficient_quota')) {
      return "ran out of brain cells (api quota) 💸";
    } else if (error.message?.includes('invalid_request')) {
      return "that message broke my brain fr 🤖💥";
    } else {
      return "bro u just crashed me 😭";
    }
  }
}

// Utility function to check if message should trigger Claude (simplified for @mentions)
function shouldTriggerClaude(message, platform = 'telegram') {
  if (!message || typeof message !== 'string') return false;
  
  const cleanMessage = message.toLowerCase().trim();
  
  // Basic filtering only
  if (cleanMessage.length < 2 || cleanMessage.length > 500) return false;
  
  // Skip existing bot commands (just in case)
  if (cleanMessage.startsWith('/aura') || cleanMessage.startsWith('!aura')) return false;
  if (cleanMessage.startsWith('/bless') || cleanMessage.startsWith('!bless')) return false;
  if (cleanMessage.startsWith('/help') || cleanMessage.startsWith('!help')) return false;
  
  // Since we're triggered by @mentions, we respond to almost everything
  // Only filter out obvious spam or very short messages
  return true;
}

// Express middleware for Sentry (if available)
function getSentryMiddleware() {
  if (!isSentryAvailable || !Sentry) {
    return {
      requestHandler: (req, res, next) => next(),
      errorHandler: (error, req, res, next) => {
        console.error('Express error:', error);
        next(error);
      }
    };
  }

  // Check if Sentry has the new or old API structure
  try {
    if (Sentry.Handlers) {
      // Old API (Sentry v7 and below)
      return {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler()
      };
    } else {
      // New API (Sentry v8+) or fallback
      return {
        requestHandler: (req, res, next) => {
          // For newer Sentry, request tracking is automatic
          next();
        },
        errorHandler: (error, req, res, next) => {
          // Manually capture exception
          Sentry.captureException(error);
          console.error('Express error (captured by Sentry):', error);
          next(error);
        }
      };
    }
  } catch (error) {
    console.error('Error setting up Sentry middleware:', error);
    // Return safe fallback
    return {
      requestHandler: (req, res, next) => next(),
      errorHandler: (error, req, res, next) => {
        console.error('Express error:', error);
        next(error);
      }
    };
  }
}

// Initialize services on module load
initializeServices();

module.exports = {
  getBrainrotReply,
  shouldTriggerClaude,
  getSentryMiddleware,
  logError,
  isRedisAvailable: () => isRedisAvailable,
  isSentryAvailable: () => isSentryAvailable,
  BRAINROT_SYSTEM_PROMPT
};