const db = require('./db.js');

// Shared flavor texts and constants (BRAINROT CERTIFIED! 💀🔥)
const POSITIVE_FLAVORS = [
  '🚀 ABSOLUTELY NUCLEAR FARM! Your aura is ASCENDED!',
  '🔥 W FARM! Your aura is straight up GIGACHAD energy!',
  '💯 NO CAP this is some SIGMA MALE farming!',
  '⚡ BASED FARM SUCCESS! The universe said YES!',
  '🗿 BASED FARM! Your aura game is UNMATCHED!',
  '👑 ALPHA ENERGY detected! This farm HITS DIFFERENT!',
  '💎 LEGENDARY VIBES! Your rizz is CONTAGIOUS!'
];

const NEGATIVE_FLAVORS = [
  '💀 L + RATIO! Your farm just got COOKED!',
  '😭 SKILL ISSUE! Time to touch grass fr!',
  '🤡 CRINGE FARM! Your aura said "nah fam"!',
  '💩 MID FARMING! This is some BETA behavior!',
  '🚫 COPE + SEETHE! Your aura game is WEAK!',
  '🗿 OHIO MOMENT! Your farm was SUS as hell!',
  '📉 STONKS DOWN! Your aura portfolio CRASHED!',
  '💸 FANUM TAXED! Someone stole your vibe!',
  '🍴 GET FANUM TAXED! Your aura got STOLEN!',
  '💸 FANUM TAX MOMENT! The universe just ROBBED you!'
];

const JACKPOT_FLAVORS = [
  '🎰 GYATTTT! JACKPOT! You just hit the AURA LOTTERY!',
  '💎 LEGENDARY PULL! This is some GIGACHAD luck!',
  '🚀 ABSOLUTELY NUCLEAR! Your rizz just ASCENDED!',
  '🎉 HOLY SIGMA! This farm is UTTERLY BONKERS!'
];

const IMPLOSION_FLAVORS = [
  '💥 CRITICAL DAMAGE! You just got ABSOLUTELY REKT!',
  '🌪️ EMOTIONAL DAMAGE! Your aura said BYE BYE!',
  '⚡ BRUH MOMENT! This is a CERTIFIED OHIO CLASSIC!',
  '🕳️ GET RATIO\'D BY THE UNIVERSE! Touch grass NOW!',
  '💸 ULTIMATE FANUM TAX! The universe just CLEANED YOU OUT!'
];

const DUEL_WIN_FLAVORS = [
  '⚔️ {winner} absolutely MOGGED {loser}! NO MERCY!',
  '🏆 {winner} said "GET REKT" and FANUM TAXED {loser}!',
  '💀 {winner} just RATIO\'D {loser} into the SHADOW REALM!',
  '⚡ {winner} FLEXED that SIGMA GRINDSET on {loser}!',
  '🔥 {winner} COOKED {loser} like it\'s THANKSGIVING!',
  '🗿 {winner} just ENDED {loser}\'s whole career! SHEESH!'
];

const BLESSING_FLAVORS = [
  '🚀 BASED ENERGY TRANSFER! Your rizz is CONTAGIOUS!',
  '✨ BLESSING AURA ACTIVATED! This is SIGMA BEHAVIOR!',
  '💎 GIGACHAD GENEROSITY! The universe RESPECTS this move!',
  '🔥 WHOLESOME CHAOS! Your aura just went NUCLEAR!',
  '🌟 COSMIC BLESSING! The multiverse APPROVES!',
  '💫 LEGENDARY SHARE! This is some ASCENDED energy!'
];



// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatUsername(username, platform = 'telegram') {
  if (platform === 'twitch') {
    return `@${username}`;
  }
  // For Telegram objects
  if (username && typeof username === 'object') {
    return username.username ? `@${username.username}` : username.first_name || username.id.toString();
  }
  // For plain username strings
  return username ? `@${username}` : 'Unknown';
}

// Core aura farming logic
async function farmAura(userId, chatId, platform, username, channelLogin = null) {
  const user = await db.getUser(userId, chatId, platform, username);
  
  // Check cooldown
  const farmCheck = db.canUserFarm(user);
  if (!farmCheck.canFarm) {
    return {
      success: false,
      type: 'cooldown',
      timeLeft: farmCheck.timeLeft,
      message: `⏰ YO CHILL! Farm cooldown active for ${farmCheck.timeLeft}! Stop being so THIRSTY for aura! 💀`
    };
  }

  // Get channel-specific settings (for Twitch channels with custom config)
  let channelSettings = {
    farm_min_reward: 20,
    farm_max_reward: 50,
    custom_welcome: null,
    custom_flavors: null
  };

  if (platform === 'twitch' && channelLogin) {
    try {
      channelSettings = await db.getChannelSettings(channelLogin);
    } catch (error) {
      console.log('Using default settings for channel:', channelLogin);
    }
  }

  // Check if first time (newbie protection)
  const isFirstTime = user.aura === 0 && user.last_farm === null;

  // RNG farming logic with channel-specific rewards
  const roll = Math.random() * 100;
  let auraChange, flavorText;

  // Use custom flavors if available, otherwise use defaults
  const positiveFlavors = channelSettings.custom_flavors?.positive || POSITIVE_FLAVORS;
  const negativeFlavors = channelSettings.custom_flavors?.negative || NEGATIVE_FLAVORS;
  const jackpotFlavors = channelSettings.custom_flavors?.jackpot || JACKPOT_FLAVORS;
  const implosionFlavors = channelSettings.custom_flavors?.implosion || IMPLOSION_FLAVORS;

  // Calculate reward range based on channel settings
  const minReward = channelSettings.farm_min_reward;
  const maxReward = channelSettings.farm_max_reward;
  const rewardRange = maxReward - minReward + 1;

  if (isFirstTime) {
    // First time farmers get guaranteed W (no L)! Use channel settings
    auraChange = Math.floor(Math.random() * rewardRange) + minReward;
    flavorText = getRandomElement(positiveFlavors);
  } else if (roll < 70) {
    // 70% chance: Positive reward using channel settings
    auraChange = Math.floor(Math.random() * rewardRange) + minReward;
    flavorText = getRandomElement(positiveFlavors);
  } else if (roll < 90) {
    // 20% chance: Negative amount scaled to channel settings
    const lossAmount = Math.floor((minReward + maxReward) / 4);
    auraChange = -(Math.floor(Math.random() * lossAmount) + Math.min(10, minReward));
    flavorText = getRandomElement(negativeFlavors);
  } else {
    // 10% chance: JACKPOT or IMPLOSION scaled to channel
    if (Math.random() < 0.5) {
      auraChange = Math.max(100, maxReward * 2); // JACKPOT scales with channel
      flavorText = getRandomElement(jackpotFlavors);
    } else {
      auraChange = -Math.max(50, maxReward); // IMPLOSION scales with channel
      flavorText = getRandomElement(implosionFlavors);
    }
  }

  // Update database
  await db.updateAura(userId, chatId, auraChange, platform);
  await db.updateLastFarm(userId, chatId, platform);

  // Get updated user data
  const updatedUser = await db.getUser(userId, chatId, platform, username);
  const sign = auraChange > 0 ? '+' : '';
  
  // Use custom welcome message if available
  const welcomeMessage = isFirstTime ? 
    (channelSettings.custom_welcome ? 
      `\n💀 **${channelSettings.custom_welcome}** 🔥` : 
      '\n💀 **WELCOME TO THE CHAOS!** Newbie protection activated! 🔥') : '';

  return {
    success: true,
    type: 'farm_result',
    auraChange,
    newTotal: updatedUser.aura,
    flavorText,
    isFirstTime,
    welcomeMessage,
          message: `✨ **AURA FARM SUCCESSFUL** ✨\n\n${flavorText}\n\n${formatUsername(username, platform)} ${sign}${auraChange} aura\n💫 Total: ${updatedUser.aura}${welcomeMessage}`
  };
}

// Core aura duel logic
async function auraDuel(challengerUserId, challengerUsername, targetUsername, battleAmount, chatId, platform) {
  // Get challenger data
  const challengerUser = await db.getUser(challengerUserId, chatId, platform, challengerUsername);
  
  // Get target data - FIXED: Find actual user by username, don't create fake username-based IDs
  const targetUser = await findUserByUsername(targetUsername, chatId, platform);
  if (!targetUser) {
    return {
      success: false,
      type: 'user_not_found',
      message: `💀 TARGET NOT FOUND! @${targetUsername} hasn't farmed any aura yet! Tell them to start with /aurafarm! 🔥`
    };
  }
  const targetId = targetUser.user_id.split('_').pop(); // Extract real user ID from composite key

  // Check if both users have enough aura
  if (challengerUser.aura < battleAmount) {
    return {
      success: false,
      type: 'insufficient_challenger',
      message: `💸 BROKE BOY ALERT! ${formatUsername(challengerUsername, platform)} got FANUM TAXED and can't afford ${battleAmount} aura! Current aura: ${challengerUser.aura} 💀`
    };
  }

  if (targetUser.aura < battleAmount) {
    return {
      success: false,
      type: 'insufficient_target',
      message: `💸 TARGET IS BROKE! @${targetUsername} got FANUM TAXED and can't match ${battleAmount} aura! Their aura: ${targetUser.aura} 😭`
    };
  }

  // 50/50 random chance
  const challengerWins = Math.random() < 0.5;
  
  let winner, loser, winnerId, loserId;
  if (challengerWins) {
    winner = challengerUsername;
    loser = targetUsername;
    winnerId = challengerUserId;
    loserId = targetId;
  } else {
    winner = targetUsername;
    loser = challengerUsername;
    winnerId = targetId;
    loserId = challengerUserId;
  }

  // Transfer aura
  await db.updateAura(winnerId, chatId, battleAmount, platform);
  await db.updateAura(loserId, chatId, -battleAmount, platform);

  // Get flavor text
  const flavorText = getRandomElement(DUEL_WIN_FLAVORS)
    .replace('{winner}', `@${winner}`)
    .replace('{loser}', `@${loser}`);

  return {
    success: true,
    type: 'duel_result',
    winner,
    loser,
    battleAmount,
    flavorText,
    message: `💀 **aura 4 aura result** 💀\n\n${flavorText}\n\n💰 **Stakes:** ${battleAmount} aura\n🏆 **Winner:** @${winner} (+${battleAmount})\n💀 **Loser:** @${loser} (-${battleAmount})`
  };
}

// Core aura check logic
async function checkAura(userId, chatId, platform, username, mentionedUsername = null) {
  let targetUser, targetUsername, displayName;
  
  if (mentionedUsername) {
    // Check mentioned user's aura - FIXED: Find actual user by username
    targetUser = await findUserByUsername(mentionedUsername, chatId, platform);
    if (!targetUser) {
      return {
        success: false,
        type: 'user_not_found',
        message: `💀 @${mentionedUsername} hasn't farmed any aura yet! Tell them to start with /aurafarm! 🔥`
      };
    }
    targetUsername = mentionedUsername;
    displayName = `@${mentionedUsername}`;
  } else {
    // Check own aura - FIXED: Only use real user ID
    targetUser = await db.getUser(userId, chatId, platform, username);
    
    displayName = formatUsername(username, platform);
  }

  // Determine emoji based on aura level
  let auraEmoji;
  if (targetUser.aura >= 100) auraEmoji = '✨';
  else if (targetUser.aura >= 50) auraEmoji = '🌟';
  else if (targetUser.aura >= 0) auraEmoji = '💫';
  else auraEmoji = '🌑';

  const statusText = targetUser.aura >= 0 ? 
    '🗿 Living that SIGMA GRINDSET life!' : 
    '💀 Caught in the BRAINROT CYCLE...';

  return {
    success: true,
    type: 'aura_check',
    aura: targetUser.aura,
    displayName,
    auraEmoji,
    statusText,
    message: `${auraEmoji} **AURA CHECK** ${auraEmoji}\n\n${displayName} has **${targetUser.aura}** aura\n\n${statusText}`
  };
}

// Core leaderboard logic
async function getLeaderboard(chatId, platform, chatTitle = 'This Chat') {
  const allUsers = await db.getTopUsers(chatId, platform, 10, false);
  
  if (allUsers.length === 0) {
    return {
      success: true,
      type: 'empty_leaderboard',
      message: `📊 **AURA LEADERBOARD** 📊\n\n💀 No aura farmers in this chat yet!\nBe the first to farm! 🔥`
    };
  }

  let message = '📊 **AURA LEADERBOARD** 📊\n\n';

  allUsers.forEach((user, index) => {
    const position = index + 1;
    let emoji;
    
    // Different emojis based on position and aura
    if (position === 1) emoji = '🥇';
    else if (position === 2) emoji = '🥈';
    else if (position === 3) emoji = '🥉';
    else if (user.aura >= 0) emoji = '💫';
    else emoji = '💀';
    
    message += `${emoji} ${position}. @${user.username}: ${user.aura} aura\n`;
  });

  return {
    success: true,
    type: 'leaderboard',
    message
  };
}

// Core blessing logic
async function blessUser(giverUserId, giverUsername, targetUsername, blessAmount, chatId, platform) {
  // Get giver data
  const giverUser = await db.getUser(giverUserId, chatId, platform, giverUsername);
  
  // Get target data - FIXED: Find actual user by username, don't create fake username-based IDs
  const targetUser = await findUserByUsername(targetUsername, chatId, platform);
  if (!targetUser) {
    return {
      success: false,
      type: 'user_not_found',
      message: `💀 BLESSING FAILED! @${targetUsername} hasn't farmed any aura yet! Tell them to start with /aurafarm first! 🔥`
    };
  }
  const targetId = targetUser.user_id.split('_').pop(); // Extract real user ID from composite key
  
  // Check if giver has enough aura
  if (giverUser.aura < blessAmount) {
    return {
      success: false,
      type: 'insufficient_aura',
      message: `💸 BLESSING FAILED! ${formatUsername(giverUsername, platform)} got FANUM TAXED and can't afford ${blessAmount} aura! Current aura: ${giverUser.aura} 💀\n\nStack that aura before claiming GIGACHAD status! 💀`
    };
  }
  
  // Can't bless yourself
  if (giverUserId === targetId || giverUsername?.toLowerCase() === targetUsername.toLowerCase()) {
    return {
      success: false,
      type: 'self_blessing',
      message: '🤡 NICE TRY! You can\'t bless yourself, NARCISSIST! This is some OHIO behavior! Touch grass and find some HOMIES! 💀'
    };
  }
  
  // Transfer aura
  await db.updateAura(giverUserId, chatId, -blessAmount, platform);
  await db.updateAura(targetId, chatId, blessAmount, platform);
  
  const blessing = getRandomElement(BLESSING_FLAVORS);
  
  return {
    success: true,
    type: 'blessing_success',
    giverUsername,
    targetUsername,
    blessAmount,
    blessing,
    message: `✨ **AURA BLESSING SUCCESSFUL** ✨\n\n${blessing}\n\n${formatUsername(giverUsername, platform)} just BLESSED @${targetUsername} with ${blessAmount} aura! 💸\n\n🗿 ABSOLUTE SIGMA BEHAVIOR! This chat is about to get CHAOTIC! 🔥`
  };
}

// FIXED: Helper function to find user by username without creating fake IDs
async function findUserByUsername(username, chatId, platform) {
  try {
    console.log(`🔍 Looking for user: username="${username}", chatId="${chatId}", platform="${platform}"`);
    
    // First try exact username match (case-sensitive)
    let { data: userData, error } = await db.supabase
      .from('aura')
      .select('*')
      .eq('username', username)
      .eq('platform', platform)
      .ilike('user_id', `${platform}_${chatId}_%`)
      .not('user_id', 'like', '%username_%') // Exclude fake username-based IDs
      .order('aura', { ascending: false });

    console.log(`📊 Exact match results: ${userData ? userData.length : 0} users found`);
    
    // If no exact match, try case-insensitive
    if (!userData || userData.length === 0) {
      console.log(`🔄 Trying case-insensitive search for "${username}"`);
      const result = await db.supabase
        .from('aura')
        .select('*')
        .ilike('username', username) // Case-insensitive
        .eq('platform', platform)
        .ilike('user_id', `${platform}_${chatId}_%`)
        .not('user_id', 'like', '%username_%')
        .order('aura', { ascending: false });
      
      userData = result.data;
      error = result.error;
      console.log(`📊 Case-insensitive results: ${userData ? userData.length : 0} users found`);
    }

    // If still no match, debug what users actually exist in this chat
    if (!userData || userData.length === 0) {
      console.log(`🔍 DEBUG: Checking all users in chat ${chatId} on platform ${platform}`);
      const debugResult = await db.supabase
        .from('aura')
        .select('user_id, username, aura')
        .eq('platform', platform)
        .ilike('user_id', `${platform}_${chatId}_%`)
        .not('user_id', 'like', '%username_%')
        .order('aura', { ascending: false });
      
      console.log(`📋 All users in this chat:`, debugResult.data);
      console.log(`❌ Target "${username}" not found among these users`);
      return null;
    }

    if (error) {
      console.error('❌ Database error in findUserByUsername:', error);
      return null;
    }

    const foundUser = userData[0]; // Get the first (highest aura) match
    console.log(`✅ Found user: ${foundUser.username} (${foundUser.user_id}) with ${foundUser.aura} aura`);
    return foundUser;
    
  } catch (error) {
    console.error('💥 Exception in findUserByUsername:', error);
    return null;
  }
}

module.exports = {
  farmAura,
  auraDuel,
  checkAura,
  getLeaderboard,
  blessUser,
  formatUsername,
  getRandomElement,
  findUserByUsername,
  POSITIVE_FLAVORS,
  NEGATIVE_FLAVORS,
  JACKPOT_FLAVORS,
  IMPLOSION_FLAVORS,
  DUEL_WIN_FLAVORS,
  BLESSING_FLAVORS
};