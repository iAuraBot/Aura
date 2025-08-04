const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Get user from database or create if doesn't exist
 * @param {string} userId - Telegram user ID or username-based ID
 * @param {string} username - Telegram username (optional)
 * @returns {Object} User data
 */
async function getUser(userId, username = null) {
  try {
    // First try to get existing user by exact ID
    const { data: existingUser, error: fetchError } = await supabase
      .from('aura')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingUser && !fetchError) {
      // Update username if provided and different
      if (username && existingUser.username !== username) {
        await supabase
          .from('aura')
          .update({ username })
          .eq('user_id', userId);
        existingUser.username = username;
      }
      return existingUser;
    }

    // If this is a username-based lookup, also try to find by username
    if (userId.startsWith('username_') && username) {
      const { data: userByUsername, error: usernameError } = await supabase
        .from('aura')
        .select('*')
        .eq('username', username)
        .single();

      if (userByUsername && !usernameError) {
        // Found existing user by username - update their user_id to the new format
        await supabase
          .from('aura')
          .update({ user_id: userId })
          .eq('username', username);
        
        userByUsername.user_id = userId;
        return userByUsername;
      }
    }

    // Create new user if doesn't exist
    const { data: newUser, error: insertError } = await supabase
      .from('aura')
      .insert({
        user_id: userId,
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
 * @param {number} amount - Amount to add/subtract (can be negative)
 * @returns {Object} Updated user data
 */
async function updateAura(userId, amount) {
  try {
    // First get current aura
    const { data: currentUser, error: fetchError } = await supabase
      .from('aura')
      .select('aura')
      .eq('user_id', userId)
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
      .eq('user_id', userId)
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
 * @returns {Object} Updated user data
 */
async function updateLastFarm(userId) {
  try {
    const { data, error } = await supabase
      .from('aura')
      .update({ 
        last_farm: new Date().toISOString()
      })
      .eq('user_id', userId)
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
 * @returns {Object} Updated user data
 */
async function updateReactions(userId) {
  try {
    // First get current reactions count
    const { data: currentUser, error: fetchError } = await supabase
      .from('aura')
      .select('reactions_today')
      .eq('user_id', userId)
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
      .eq('user_id', userId)
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
 * Get top aura users (leaderboard) with deduplication
 * @param {number} limit - Number of users to return
 * @param {boolean} ascending - Sort order (true for lowest, false for highest)
 * @returns {Array} Array of user data
 */
async function getTopUsers(limit = 5, ascending = false) {
  try {
    // Get all users first to deduplicate
    const { data: allUsers, error } = await supabase
      .from('aura')
      .select('user_id, username, aura')
      .order('aura', { ascending });

    if (error) {
      console.error('Error getting users:', error);
      throw error;
    }

    if (!allUsers) return [];

    // Deduplicate by username, keeping the best record
    const userMap = new Map();
    
    allUsers.forEach(user => {
      const username = user.username?.toLowerCase();
      if (!username || username === 'unknown') return;
      
      const existing = userMap.get(username);
      if (!existing) {
        userMap.set(username, user);
      } else {
        // Keep the record with real Telegram ID (no prefix) or higher aura
        const isRealId = !user.user_id.includes('_');
        const existingIsRealId = !existing.user_id.includes('_');
        
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
 * Get user with most reactions today
 * @returns {Object|null} User with most reactions or null
 */
async function getMostReactiveUser() {
  try {
    const { data, error } = await supabase
      .from('aura')
      .select('user_id, username, reactions_today')
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
 * Reset all users' daily reactions to 0
 * @returns {boolean} Success status
 */
async function resetDailyReactions() {
  try {
    const { error } = await supabase
      .from('aura')
      .update({ reactions_today: 0 })
      .neq('user_id', ''); // Update all rows

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