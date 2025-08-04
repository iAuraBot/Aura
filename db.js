const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Get user from database or create if doesn't exist
 * @param {string} userId - Telegram user ID or username-based ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {string} username - Telegram username (optional)
 * @returns {Object} User data
 */
async function getUser(userId, chatId, username = null) {
  try {
    // Create composite key for chat-specific user
    const compositeKey = `${chatId}_${userId}`;
    
    // First try to get existing user by composite key
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

    // If this is a username-based lookup, also try to find by username in this chat
    if (userId.startsWith('username_') && username) {
      const { data: userByUsername, error: usernameError } = await supabase
        .from('aura')
        .select('*')
        .eq('username', username)
        .eq('user_id', compositeKey)
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
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {number} amount - Amount to add/subtract (can be negative)
 * @returns {Object} Updated user data
 */
async function updateAura(userId, chatId, amount) {
  try {
    const compositeKey = `${chatId}_${userId}`;
    
    // First get current aura
    const { data: currentUser, error: fetchError } = await supabase
      .from('aura')
      .select('aura')
      .eq('user_id', compositeKey)
      .single();

    if (fetchError) {
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
  } catch (error) {
    console.error('Error in updateAura:', error);
    throw error;
  }
}

/**
 * Update last farm timestamp
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @returns {Object} Updated user data
 */
async function updateLastFarm(userId, chatId) {
  try {
    const compositeKey = `${chatId}_${userId}`;
    
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
 * @param {string} userId - Telegram user ID
 * @param {string} chatId - Chat ID for separate ecosystems
 * @returns {Object} Updated user data
 */
async function updateReactions(userId, chatId) {
  try {
    const compositeKey = `${chatId}_${userId}`;
    
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
 * Get top aura users (leaderboard) for specific chat
 * @param {string} chatId - Chat ID for separate ecosystems
 * @param {number} limit - Number of users to return
 * @param {boolean} ascending - Sort order (true for lowest, false for highest)
 * @returns {Array} Array of user data
 */
async function getTopUsers(chatId, limit = 10, ascending = false) {
  try {
    // Get users from this specific chat only
    const { data: chatUsers, error } = await supabase
      .from('aura')
      .select('user_id, username, aura')
      .like('user_id', `${chatId}_%`)
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
 * Get user with most reactions today for specific chat
 * @param {string} chatId - Chat ID for separate ecosystems
 * @returns {Object|null} User with most reactions or null
 */
async function getMostReactiveUser(chatId) {
  try {
    const { data, error } = await supabase
      .from('aura')
      .select('user_id, username, reactions_today')
      .like('user_id', `${chatId}_%`)
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
 * Reset all users' daily reactions to 0 for specific chat
 * @param {string} chatId - Chat ID for separate ecosystems
 * @returns {boolean} Success status
 */
async function resetDailyReactions(chatId) {
  try {
    const { error } = await supabase
      .from('aura')
      .update({ reactions_today: 0 })
      .like('user_id', `${chatId}_%`);

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

module.exports = {
  getUser,
  updateAura,
  updateLastFarm,
  updateReactions,
  getTopUsers,
  getMostReactiveUser,
  resetDailyReactions,
  canUserFarm
};