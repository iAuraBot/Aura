const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with optimized settings
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Connection': 'keep-alive'
      }
    }
  }
);

// Database health check
async function checkDatabaseHealth() {
  try {
    const { data, error } = await supabase
      .from('aura')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Supabase client connection healthy');
    return true;
  } catch (error) {
    console.log('💀 Database health check failed:', error.message);
    return false;
  }
}

// Retry wrapper for database operations
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      console.log(`⚠️ DB operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
      if (i === maxRetries - 1) throw error;
      // Wait before retry: 1s, 2s, 3s
      await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
    }
  }
}



// Check database health every 5 minutes
setInterval(async () => {
  const isHealthy = await checkDatabaseHealth();
  if (!isHealthy) {
    console.log('⚠️ Database unhealthy - connection issues detected');
  }
}, 5 * 60 * 1000);

/**
 * Get user from database or create if doesn't exist
 * @param {string} userId - User ID (Telegram ID or Twitch username)
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @param {string} username - Username (optional)
 * @returns {Object} User data
 */
async function getUser(userId, chatId, platform = 'telegram', username = null) {
  try {
    // Create composite key for platform-chat-specific user
    const compositeKey = `${platform}_${chatId}_${userId}`;
    
    // Use Supabase client consistently
    const { data: existingUser, error: fetchError } = await supabase
      .from('aura')
      .select('*')
      .eq('user_id', compositeKey)
      .single();

    if (existingUser && !fetchError) {
      // Update username if provided and different
      if (username && existingUser.username !== username) {
        await supabase
          .from('aura')
          .update({ username })
          .eq('user_id', compositeKey);
        existingUser.username = username;
      }
      return existingUser;
    }

    // If this is a username-based lookup, also try to find by username in this chat/platform
    if (userId.startsWith('username_') && username) {
      const { data: userByUsername, error: usernameError } = await supabase
        .from('aura')
        .select('*')
        .eq('username', username)
        .ilike('user_id', `${platform}_${chatId}_%`)
        .single();

      if (userByUsername && !usernameError) {
        return userByUsername;
      }
    }

    // Create new user if doesn't exist
    const { data: newUser, error: insertError } = await supabase
      .from('aura')
      .insert({
        user_id: compositeKey,
        username: username || 'Unknown',
        platform: platform,
        aura: 0,
        last_farm: null,
        reactions_today: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      throw insertError;
    }

    return newUser;
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
}

/**
 * Update user's aura points
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {number} amount - Amount to add/subtract (can be negative)
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @returns {Object} Updated user data
 */
async function updateAura(userId, chatId, amount, platform = 'telegram') {
  try {
    const compositeKey = `${platform}_${chatId}_${userId}`;
    
    // Use Supabase client with retry logic for timing issues
    let retries = 3;
    while (retries > 0) {
      try {
        // First get current aura
        const { data: currentUser, error: fetchError } = await supabase
          .from('aura')
          .select('aura')
          .eq('user_id', compositeKey)
          .single();

        if (fetchError) {
          // If user not found, try to create them first
          if (fetchError.code === 'PGRST116') {
            console.log(`User ${compositeKey} not found, creating...`);
            await getUser(userId, chatId, platform, 'Unknown');
            // Retry the fetch after creating
            const { data: newUser, error: retryError } = await supabase
              .from('aura')
              .select('aura')
              .eq('user_id', compositeKey)
              .single();
            
            if (retryError) {
              console.error('Error fetching user after creation:', retryError);
              throw retryError;
            }
            
            const newAura = newUser.aura + amount;
            const { data: updatedData, error: updateError } = await supabase
              .from('aura')
              .update({ aura: newAura })
              .eq('user_id', compositeKey)
              .select()
              .single();

            if (updateError) {
              console.error('Error updating aura after creation:', updateError);
              throw updateError;
            }

            return updatedData;
          }
          
          console.error('Error fetching current aura:', fetchError);
          throw fetchError;
        }

        // Calculate new aura value
        const newAura = currentUser.aura + amount;

        // Update with new value
        const { data, error } = await supabase
          .from('aura')
          .update({ aura: newAura })
          .eq('user_id', compositeKey)
          .select()
          .single();

        if (error) {
          console.error('Error updating aura:', error);
          throw error;
        }

        return data;
      } catch (retryError) {
        retries--;
        if (retries === 0) throw retryError;
        console.log(`Retrying updateAura, ${retries} attempts left...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error('Error in updateAura:', error);
    throw error;
  }
}

/**
 * Update last farm timestamp
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @returns {Object} Updated user data
 */
async function updateLastFarm(userId, chatId, platform = 'telegram') {
  try {
    const compositeKey = `${platform}_${chatId}_${userId}`;
    
    // Use Supabase client consistently
    const { data, error } = await supabase
      .from('aura')
      .update({ 
        last_farm: new Date().toISOString()
      })
      .eq('user_id', compositeKey)
      .select()
      .single();

    if (error) {
      console.error('Error updating last farm:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateLastFarm:', error);
    throw error;
  }
}

/**
 * Increment user's daily reactions count
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @returns {Object} Updated user data
 */
async function updateReactions(userId, chatId, platform = 'telegram') {
  try {
    const compositeKey = `${platform}_${chatId}_${userId}`;
    
    // First get current reactions count
    const { data: currentUser, error: fetchError } = await supabase
      .from('aura')
      .select('reactions_today')
      .eq('user_id', compositeKey)
      .single();

    if (fetchError) {
      console.error('Error fetching current reactions:', fetchError);
      throw fetchError;
    }

    // Increment reactions count
    const newReactions = currentUser.reactions_today + 1;

    // Update with new value
    const { data, error } = await supabase
      .from('aura')
      .update({ reactions_today: newReactions })
      .eq('user_id', compositeKey)
      .select()
      .single();

    if (error) {
      console.error('Error updating reactions:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateReactions:', error);
    throw error;
  }
}

/**
 * Get top aura users (leaderboard) for specific chat and platform
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @param {number} limit - Number of users to return
 * @param {boolean} ascending - Sort order (true for lowest, false for highest)
 * @returns {Array} Array of user data
 */
async function getTopUsers(chatId, platform = 'telegram', limit = 10, ascending = false) {
  try {
    // Get users from this specific chat and platform only
    const { data: chatUsers, error } = await supabase
      .from('aura')
      .select('user_id, username, aura, platform')
      .like('user_id', `${platform}_${chatId}_%`)
      .order('aura', { ascending });

    if (error) {
      console.error('Error getting chat users:', error);
      throw error;
    }

    if (!chatUsers) return [];

    // Simple deduplication by username for this chat
    const userMap = new Map();
    
    chatUsers.forEach(user => {
      const username = user.username?.toLowerCase();
      if (!username || username === 'unknown') return;
      
      const existing = userMap.get(username);
      if (!existing) {
        userMap.set(username, user);
      } else {
        // Keep the record with higher aura or real ID
        const isRealId = !user.user_id.split('_')[1].includes('username_');
        const existingIsRealId = !existing.user_id.split('_')[1].includes('username_');
        
        if (isRealId && !existingIsRealId) {
          userMap.set(username, user);
        } else if (!isRealId && existingIsRealId) {
          // Keep existing real ID
        } else if (user.aura > existing.aura) {
          userMap.set(username, user);
        }
      }
    });

    // Convert back to array and sort
    const deduplicatedUsers = Array.from(userMap.values());
    deduplicatedUsers.sort((a, b) => ascending ? a.aura - b.aura : b.aura - a.aura);

    return deduplicatedUsers.slice(0, limit);
  } catch (error) {
    console.error('Error in getTopUsers:', error);
    throw error;
  }
}

/**
 * Get user with most reactions today for specific chat and platform
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @returns {Object|null} User with most reactions or null
 */
async function getMostReactiveUser(chatId, platform = 'telegram') {
  try {
    const { data, error } = await supabase
      .from('aura')
      .select('user_id, username, reactions_today, platform')
      .like('user_id', `${platform}_${chatId}_%`)
      .gt('reactions_today', 0)
      .order('reactions_today', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error getting most reactive user:', error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error in getMostReactiveUser:', error);
    return null;
  }
}

/**
 * Reset all users' daily reactions to 0 for specific chat and platform
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} platform - Platform ('telegram' or 'twitch')
 * @returns {boolean} Success status
 */
async function resetDailyReactions(chatId, platform = 'telegram') {
  try {
    const { error } = await supabase
      .from('aura')
      .update({ reactions_today: 0 })
      .like('user_id', `${platform}_${chatId}_%`);

    if (error) {
      console.error('Error resetting daily reactions:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in resetDailyReactions:', error);
    throw error;
  }
}

/**
 * Check if user can farm (24h cooldown)
 * @param {Object} user - User data object
 * @returns {Object} { canFarm: boolean, timeLeft: string }
 */
function canUserFarm(user) {
  if (!user.last_farm) {
    return { canFarm: true, timeLeft: null };
  }

  const lastFarm = new Date(user.last_farm);
  const now = new Date();
  const timeDiff = now - lastFarm;
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  if (timeDiff >= twentyFourHours) {
    return { canFarm: true, timeLeft: null };
  }

  // Calculate time left
  const timeLeft = twentyFourHours - timeDiff;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return { 
    canFarm: false, 
    timeLeft: `${hoursLeft}h ${minutesLeft}m` 
  };
}

// Channel configuration functions for web interface
async function createChannelConfig(channelId, channelLogin, config) {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .insert({
        channel_id: channelId,
        channel_login: channelLogin.toLowerCase(),
        display_name: config.display_name,
        email: config.email,
        bot_enabled: config.bot_enabled,
        settings: config.settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // If channel already exists, update it instead
      if (error.code === '23505') {
        return await updateChannelConfig(channelId, config);
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating channel config:', error);
    throw error;
  }
}

async function getChannelConfig(channelId) {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .select('*')
      .eq('channel_id', channelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting channel config:', error);
    throw error;
  }
}

async function updateChannelSettings(channelId, settings) {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .update({
        settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating channel settings:', error);
    throw error;
  }
}

async function updateChannelConfig(channelId, config) {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .update({
        display_name: config.display_name,
        email: config.email,
        bot_enabled: config.bot_enabled,
        settings: config.settings,
        updated_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error updating channel config:', error);
    throw error;
  }
}

async function removeChannelConfig(channelId) {
  try {
    const { error } = await supabase
      .from('channel_configs')
      .delete()
      .eq('channel_id', channelId);

    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error removing channel config:', error);
    throw error;
  }
}

async function getAllActiveChannels() {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .select('channel_login, settings')
      .eq('bot_enabled', true);

    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting active channels:', error);
    throw error;
  }
}

async function getChannelSettings(channelLogin) {
  try {
    const { data, error } = await supabase
      .from('channel_configs')
      .select('settings, bot_enabled')
      .eq('channel_login', channelLogin.toLowerCase())
      .eq('bot_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Return default settings if no custom config found
    if (!data) {
      return {
        farm_cooldown: 24,
        farm_min_reward: 20,
        farm_max_reward: 50,
        duel_enabled: true,
        blessing_enabled: true,
        custom_welcome: null,
        custom_flavors: null
      };
    }
    
    return data.settings;
  } catch (error) {
    console.error('Error getting channel settings:', error);
    // Return defaults on error
    return {
      farm_cooldown: 24,
      farm_min_reward: 20,
      farm_max_reward: 50,
      duel_enabled: true,
      blessing_enabled: true,
      custom_welcome: null,
      custom_flavors: null
    };
  }
}

module.exports = { 
  getUser, 
  updateAura, 
  updateLastFarm, 
  updateReactions, 
  getTopUsers, 
  getMostReactiveUser, 
  resetDailyReactions,
  canUserFarm,
  createChannelConfig,
  getChannelConfig,
  updateChannelSettings,
  updateChannelConfig,
  removeChannelConfig,
  getAllActiveChannels,
  getChannelSettings,
  checkDatabaseHealth,
  retryOperation
};