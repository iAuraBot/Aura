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
  '💀 SHEESH! This blessing is absolutely BUSSIN! FR FR!',
  '🗿 GIGACHAD GENEROSITY! Your aura game is UNMATCHED!',
  '🔥 W BLESSING! This is some SIGMA MALE sharing!',
  '💯 NO CAP! That blessing just HIT DIFFERENT!',
  '🚀 BASED ENERGY TRANSFER! Your rizz is CONTAGIOUS!',
  '💸 W GENEROSITY! Someone just got BLESSED not REKT!',
  '⚡ ABSOLUTELY NUCLEAR! This chat is about to EXPLODE!',
  '👑 ALPHA GENEROSITY! This blessing is UTTERLY BONKERS!'
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
    message: `✨ **AURA FARM SUCCESSFUL** ✨\n\n${flavorText}\n\n${formatUsername(username, platform)} ${sign}${auraChange} aura\n💫 Total Aura: ${updatedUser.aura} (${platform} - ${chatId})${welcomeMessage}`
  };
}

// Core aura duel logic
async function auraDuel(challengerUserId, challengerUsername, targetUsername, wagerAmount, chatId, platform) {
  // Get challenger data
  const challengerUser = await db.getUser(challengerUserId, chatId, platform, challengerUsername);
  
  // Get target data (use username-based ID for consistency)
  const targetId = `username_${targetUsername.toLowerCase()}`;
  const targetUser = await db.getUser(targetId, chatId, platform, targetUsername);

  // Check if both users have enough aura
  if (challengerUser.aura < wagerAmount) {
    return {
      success: false,
      type: 'insufficient_challenger',
      message: `💸 BROKE BOY ALERT! ${formatUsername(challengerUsername, platform)} got FANUM TAXED and can't afford ${wagerAmount} aura! Current aura: ${challengerUser.aura} 💀`
    };
  }

  if (targetUser.aura < wagerAmount) {
    return {
      success: false,
      type: 'insufficient_target',
      message: `💸 TARGET IS BROKE! @${targetUsername} got FANUM TAXED and can't match ${wagerAmount} aura! Their aura: ${targetUser.aura} 😭`
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
  await db.updateAura(winnerId, chatId, wagerAmount, platform);
  await db.updateAura(loserId, chatId, -wagerAmount, platform);

  // Get flavor text
  const flavorText = getRandomElement(DUEL_WIN_FLAVORS)
    .replace('{winner}', `@${winner}`)
    .replace('{loser}', `@${loser}`);

  return {
    success: true,
    type: 'duel_result',
    winner,
    loser,
    wagerAmount,
    flavorText,
    message: `🎰 **AURA CASINO RESULT** 🎰\n\n${flavorText}\n\n💰 **Wager:** ${wagerAmount} aura\n🏆 **Winner:** @${winner} (+${wagerAmount})\n💀 **Loser:** @${loser} (-${wagerAmount})`
  };
}

// Core aura check logic
async function checkAura(userId, chatId, platform, username, mentionedUsername = null) {
  let targetUser, targetUsername, displayName;
  
  if (mentionedUsername) {
    // Check mentioned user's aura (use consistent username-based ID)
    const targetId = `username_${mentionedUsername.toLowerCase()}`;
    targetUser = await db.getUser(targetId, chatId, platform, mentionedUsername);
    targetUsername = mentionedUsername;
    displayName = `@${mentionedUsername}`;
  } else {
    // Check own aura - try BOTH real ID and username-based ID, merge if needed
    const realId = userId;
    const usernameId = `username_${username?.toLowerCase()}`;
    
    // Try real ID first
    targetUser = await db.getUser(realId, chatId, platform, username);
    
    // Also check if they have a username-based record with higher aura
    if (username) {
      try {
        const usernameUser = await db.getUser(usernameId, chatId, platform, username);
        
        // If username-based record has higher aura, use that and merge
        if (usernameUser.aura > targetUser.aura) {
          // Transfer the higher aura to the real ID record
          const auraDiff = usernameUser.aura - targetUser.aura;
          await db.updateAura(realId, chatId, auraDiff, platform);
          targetUser = await db.getUser(realId, chatId, platform, username);
          
          // Clean up the old username-based record by setting it to 0
          await db.updateAura(usernameId, chatId, -usernameUser.aura, platform);
        }
      } catch (error) {
        // Username-based record doesn't exist, that's fine
      }
    }
    
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
    message: `${auraEmoji} **AURA CHECK** ${auraEmoji}\n\n${displayName} has **${targetUser.aura}** aura points\n💬 Platform: ${platform.toUpperCase()}\n💬 Chat: ${chatId}\n\n${statusText}`
  };
}

// Core leaderboard logic
async function getLeaderboard(chatId, platform, chatTitle = 'This Chat') {
  const allUsers = await db.getTopUsers(chatId, platform, 10, false);
  
  if (allUsers.length === 0) {
    return {
      success: true,
      type: 'empty_leaderboard',
      message: `📊 **AURA LEADERBOARD** 📊\n💬 Platform: ${platform.toUpperCase()}\n💬 Chat: ${chatTitle}\n\n💀 No aura farmers in this chat yet!\nBe the first to farm! 🔥`
    };
  }

  let message = '📊 **AURA LEADERBOARD** 📊\n';
  message += `💬 Platform: ${platform.toUpperCase()}\n`;
  message += `💬 Chat: ${chatTitle}\n\n`;

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
  
  // Get target data
  const targetId = `username_${targetUsername.toLowerCase()}`;
  const targetUser = await db.getUser(targetId, chatId, platform, targetUsername);
  
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

module.exports = {
  farmAura,
  auraDuel,
  checkAura,
  getLeaderboard,
  blessUser,
  formatUsername,
  getRandomElement,
  POSITIVE_FLAVORS,
  NEGATIVE_FLAVORS,
  JACKPOT_FLAVORS,
  IMPLOSION_FLAVORS,
  DUEL_WIN_FLAVORS,
  BLESSING_FLAVORS
};