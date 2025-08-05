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
        platform: config.platform || 'twitch', // Default to twitch for backward compatibility
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
        return await updateChannelConfig(channelId, config.platform || 'twitch', config);
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error creating channel config:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error
    });
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

async function updateChannelConfig(channelId, platform, config) {
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
      .eq('platform', platform)
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

// Get family-friendly setting for a channel
async function getFamilyFriendlySetting(platform, channelId) {
  try {
    const { data, error } = await supabase
      .from('channel_settings')
      .select('family_friendly')
      .eq('platform', platform)
      .eq('channel_id', channelId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting family-friendly setting:', error);
      return false; // Default to non-family-friendly on error
    }

    return data?.family_friendly || false;
  } catch (error) {
    console.error('Error in getFamilyFriendlySetting:', error);
    return false; // Default to non-family-friendly on error
  }
}

// Set family-friendly setting for a channel
async function setFamilyFriendlySetting(platform, channelId, channelName, familyFriendly) {
  try {
    const { data, error } = await supabase
      .from('channel_settings')
      .upsert({
        platform,
        channel_id: channelId,
        channel_name: channelName,
        family_friendly: familyFriendly,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'platform,channel_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error setting family-friendly setting:', error);
      return false;
    }

    console.log(`✅ Set family-friendly mode ${familyFriendly ? 'ON' : 'OFF'} for ${platform} channel: ${channelName}`);
    return true;
  } catch (error) {
    console.error('Error in setFamilyFriendlySetting:', error);
    return false;
  }
}

// Update special command data for daily usage tracking
async function updateSpecialData(userId, specialData) {
  try {
    const { data, error } = await supabase
      .from('aura')
      .update({ 
        special_data: specialData,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating special data:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateSpecialData:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    return false;
  }
}

// Comprehensive settings management for new dashboard
async function getComprehensiveSettings(channelId, platform) {
  try {
    // Get existing channel config
    const channelConfig = await getChannelConfig(channelId);
    const familyFriendly = await getFamilyFriendlySetting(platform, channelId);
    
    // Return comprehensive settings with defaults
    return {
      personality: {
        unhinged: !familyFriendly,
        responseStyle: channelConfig?.settings?.response_style || 'energetic',
        responseFrequency: channelConfig?.settings?.response_frequency || 50
      },
      aura: {
        farmCooldown: channelConfig?.settings?.farm_cooldown || 24,
        auraName: channelConfig?.settings?.aura_name || 'aura',
        minReward: channelConfig?.settings?.farm_min_reward || 20,
        maxReward: channelConfig?.settings?.farm_max_reward || 50,
        duelsEnabled: channelConfig?.settings?.duel_enabled !== false,
        blessingsEnabled: channelConfig?.settings?.blessing_enabled !== false,
        specialCommands: channelConfig?.settings?.special_commands || false
      },
      commands: {
        enabled: channelConfig?.settings?.commands_enabled || {
          aurafarm: true, mog: true, bless: true, aura: true, auraboard: true, emote: true
        },
        aiChat: channelConfig?.settings?.ai_chat !== false,
        globalCooldown: channelConfig?.settings?.global_cooldown || 3,
        userCooldown: channelConfig?.settings?.user_cooldown || 10
      },
      moderation: {
        spamProtection: channelConfig?.settings?.spam_protection || false,
        rateLimit: channelConfig?.settings?.rate_limit || 10,
        timeoutDuration: channelConfig?.settings?.timeout_duration || 60,
        blacklistedUsers: channelConfig?.settings?.blacklisted_users || []
      },
      branding: {
        botName: channelConfig?.settings?.bot_name || '',
        welcomeMessage: channelConfig?.settings?.custom_welcome || '',
        winTerms: channelConfig?.settings?.win_terms || '',
        lossTerms: channelConfig?.settings?.loss_terms || '',
        successEmoji: channelConfig?.settings?.success_emoji || '💀',
        failEmoji: channelConfig?.settings?.fail_emoji || '😭'
      }
    };
  } catch (error) {
    console.error('Error getting comprehensive settings:', error);
    // Return defaults if error
    return {
      personality: { unhinged: false, responseStyle: 'energetic', responseFrequency: 50 },
      aura: { farmCooldown: 24, auraName: 'aura', minReward: 20, maxReward: 50, duelsEnabled: true, blessingsEnabled: true, specialCommands: false },
      commands: { enabled: { aurafarm: true, mog: true, bless: true, aura: true, auraboard: true, emote: true }, aiChat: true, globalCooldown: 3, userCooldown: 10 },
      moderation: { spamProtection: false, rateLimit: 10, timeoutDuration: 60, blacklistedUsers: [] },
      branding: { botName: '', welcomeMessage: '', winTerms: '', lossTerms: '', successEmoji: '💀', failEmoji: '😭' }
    };
  }
}

async function saveComprehensiveSettings(channelId, platform, settings) {
  try {
    // Update family friendly setting
    await setFamilyFriendlySetting(platform, channelId, !settings.personality.unhinged);
    
    // Prepare comprehensive settings object
    const comprehensiveSettings = {
      // Existing settings
      farm_cooldown: settings.aura.farmCooldown,
      farm_min_reward: settings.aura.minReward,
      farm_max_reward: settings.aura.maxReward,
      duel_enabled: settings.aura.duelsEnabled,
      blessing_enabled: settings.aura.blessingsEnabled,
      custom_welcome: settings.branding.welcomeMessage,
      
      // New comprehensive settings
      response_style: settings.personality.responseStyle,
      response_frequency: settings.personality.responseFrequency,
      aura_name: settings.aura.auraName,
      special_commands: settings.aura.specialCommands,
      commands_enabled: settings.commands.enabled,
      ai_chat: settings.commands.aiChat,
      global_cooldown: settings.commands.globalCooldown,
      user_cooldown: settings.commands.userCooldown,
      spam_protection: settings.moderation.spamProtection,
      rate_limit: settings.moderation.rateLimit,
      timeout_duration: settings.moderation.timeoutDuration,
      blacklisted_users: settings.moderation.blacklistedUsers,
      bot_name: settings.branding.botName,
      win_terms: settings.branding.winTerms,
      loss_terms: settings.branding.lossTerms,
      success_emoji: settings.branding.successEmoji,
      fail_emoji: settings.branding.failEmoji
    };
    
    // Update channel config
    const { data, error } = await supabase
      .from('channel_configs')
      .update({
        settings: comprehensiveSettings,
        updated_at: new Date().toISOString()
      })
      .eq('channel_id', channelId)
      .eq('platform', platform);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error saving comprehensive settings:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  supabase, // Export the supabase client for direct queries
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
  getFamilyFriendlySetting,
  setFamilyFriendlySetting,
  updateSpecialData,
  checkDatabaseHealth,
  retryOperation,
  getComprehensiveSettings,
  saveComprehensiveSettings
};