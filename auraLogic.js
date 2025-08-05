const db = require('./db.js');

// Shared flavor texts and constants (BRAINROT CERTIFIED! 💀🔥)
const POSITIVE_FLAVORS = [
  '🚀 ABSOLUTELY NUCLEAR FARM! Your aura is ASCENDED!',
  '🔥 W FARM! Your aura is straight up GIGACHAD energy!',
  '💯 NO CAP this is some SIGMA MALE farming!',
  '⚡ BASED AF FARM SUCCESS! The universe said YES!',
  '🗿 BASED AF FARM! Your aura game is UNMATCHED!',
  '👑 ALPHA ENERGY detected! This farm HITS DIFFERENT!',
  '💎 LEGENDARY VIBES! Your rizz is CONTAGIOUS AF!',
  '🎭 GYATT DAYUM! That farm was absolutely BUSSIN AF!',
  '🏆 SKIBIDI SIGMA! Your grindset is GOATED AF fr fr!',
  '⭐ POGGERS FARM! You\'re the BIGGEST BIRD in here!',
  '🌟 BASED AF ENERGY! This aura farm was absolutely FIRE!',
  '💫 RIZZIN UP the universe! Your charm is UNMATCHED AF!',
  '🔥 LOCKED IN! You\'re absolutely AURA MAXXIN right now!',
  '⚡ QUIT EDGING AND FARMED! That was some SIGMA behavior!'
];

const NEGATIVE_FLAVORS = [
  '🫵😹 L + RATIO! Your farm just got COOKED AF!',
  '😭 SKILL ISSUE! Time to touch grass fr!',
  '🫵😹 CRINGE AF FARM! Your aura said "nah fam"!',
  '💩 MID AF FARMING! This is some BETA behavior!',
  '🚫 COPE + SEETHE! Your aura game is WEAK AF!',
  '🗿 ONLY IN OHIO! Your farm was SUS AF as hell!',
  '📉 STONKS DOWN! Your aura portfolio CRASHED!',
  '💸 FANUM TAXED! Someone stole your vibe!',
  '🍴 GET FANUM TAXED! Your aura got STOLEN!',
  '💸 FANUM TAX MOMENT! The universe just ROBBED you!',
  '📉 GENERATIONAL AURA DEBT! Your bloodline is COOKED AF!',
  '🏦 FILED FOR AURA BANKRUPTCY! Your ancestors felt that!',
  '⚰️ NEGATIVE AURA TERRITORY! Your kids gonna inherit this L!',
  '💸 AURA RECESSION! This debt transcends BLOODLINES!',
  '🌊 GENERATIONAL WEALTH GAP in your aura! DEMOLISHED!',
  '🎭 GOOFY AHH FARM! That was absolutely DELULU AF behavior!',
  '🤮 NOT BUSSIN AF! Your aura tastes like expired milk!',
  '🕺 SKIBIDI TOILET LUCK! Your farm got FLUSHED!',
  '😵 SUSSY AF IMPOSTER vibes! Your farm was CAP!',
  '🧠 NEGATIVE RIZZ detected! You\'re in your FLOP era AF!',
  '😵 STOP GOONING AROUND! Your farm got absolutely COOKED!',
  '🫵😹 YOU\'RE COOKED BRO! This L hit different!',
  '🤮 ZESTY AF BEHAVIOR! Your farm was absolutely SUS!',
  '😵 SUSSY AND ZESTY VIBES! That farm was questionable fr!'
];

const JACKPOT_FLAVORS = [
  '🎰 GYATTTT! JACKPOT! You just hit the AURA LOTTERY!',
  '💎 LEGENDARY PULL! This is some GIGACHAD AF luck!',
  '🚀 ABSOLUTELY NUCLEAR! Your rizz just ASCENDED AF!',
  '🎉 HOLY SIGMA! This farm is UTTERLY BONKERS AF!',
  '🕺 SKIBIDI BOP YES YES! Your grindset just went NUCLEAR AF!',
  '🏆 POGGERS! You\'re literally the BIGGEST BIRD in existence!',
  '⭐ BUSSIN AF JACKPOT! This luck is absolutely GOATED!',
  '💫 LEGENDARY AF ENERGY OVERFLOW! Your aura is hittin DIFFERENT!',
  '🚀 LOCKED IN JACKPOT! You\'re absolutely AURA MAXXIN!',
  '⚡ QUIT EDGING THE UNIVERSE! This luck is UNHINGED!'
];

const IMPLOSION_FLAVORS = [
  '💥 CRITICAL DAMAGE! You just got ABSOLUTELY REKT!',
  '🌪️ EMOTIONAL DAMAGE! Your aura said BYE BYE!',
  '⚡ BRUH MOMENT! This is a CERTIFIED OHIO CLASSIC!',
  '🕳️ GET RATIO\'D BY THE UNIVERSE! Touch grass NOW!',
  '💸 ULTIMATE FANUM TAX! The universe just CLEANED YOU OUT!',
  '📉 GENERATIONAL AURA CATASTROPHE! Your bloodline got NUKED!',
  '🏦 DECLARED INTER-DIMENSIONAL AURA BANKRUPTCY!',
  '⚰️ GENERATIONAL AURA ANNIHILATION! Seven generations will feel this!',
  '💸 AURA APOCALYPSE! Your family tree is in DEBT forever!'
];

const DUEL_WIN_FLAVORS = [
  '⚔️ {winner} absolutely MOGGED {loser}! NO MERCY!',
  '🏆 {winner} said "GET REKT" and FANUM TAXED {loser}!',
  '🫵😹 {winner} just RATIO\'D {loser} into the SHADOW REALM!',
  '⚡ {winner} FLEXED that SIGMA GRINDSET on {loser}!',
  '🔥 {winner} COOKED {loser} like it\'s THANKSGIVING!',
  '🗿 {winner} just ENDED {loser}\'s whole career! SHEESH!',
  '📉 {loser} now has GENERATIONAL AURA DEBT thanks to {winner}!',
  '🏦 {winner} sent {loser} to AURA BANKRUPTCY court!',
  '💸 {loser}\'s great-grandchildren will feel this L from {winner}!',
  '📊 {winner} put {loser} in NEGATIVE AURA TERRITORY!',
  '⚰️ {winner} buried {loser}\'s aura bloodline for CENTURIES!',
  '🌊 {winner} created a GENERATIONAL WEALTH GAP in {loser}\'s aura!',
  '🎭 GYATT! {winner} just RIZZIN UP their W while {loser} got DELULU AF!',
  '🕺 {winner} hit the GRIDDY on {loser}\'s aura! SKIBIDI AF MOMENT!',
  '🫵😹 {loser} really thought they could mog {winner}? GOOFY AHH move frfr!',
  '🎯 {winner} is the BIGGEST BIRD! {loser} got sent to OHIO AF!',
  '🧠 {winner}\'s GIGACHAD energy was too much for {loser}\'s mid AF rizz!',
  '🍕 {winner} served {loser} a GLIZZY SIZED L! That was BUSSIN AF!',
  '🔥 {winner} LOCKED IN while {loser} was just GOONING AROUND!',
  '🫵😹 {loser} got absolutely COOKED by {winner}\'s SIGMA energy!',
  '🤮 {loser}\'s ZESTY AF performance got destroyed by {winner}!',
  '😵 {winner} called out {loser}\'s SUSSY AND ZESTY behavior!'
];

const BLESSING_FLAVORS = [
  '🚀 BASED AF ENERGY TRANSFER! Your rizz is CONTAGIOUS!',
  '✨ BLESSING AURA ACTIVATED! This is SIGMA AF BEHAVIOR!',
  '💎 GIGACHAD AF GENEROSITY! The universe RESPECTS this move!',
  '🔥 WHOLESOME CHAOS! Your aura just went NUCLEAR AF!',
  '🌟 COSMIC BLESSING! The multiverse APPROVES!',
  '💫 LEGENDARY SHARE! This is some ASCENDED AF energy!',
  '🎭 GYATT! That blessing was absolutely BUSSIN AF!',
  '🕺 SKIBIDI GENEROUS AF! You\'re hittin the GRIDDY of kindness!',
  '🏆 POGGERS BLESSING! You\'re the BIGGEST BIRD of generosity!',
  '🌟 GIGACHAD AF GIVING! This blessing energy is OFF THE CHARTS!',
  '🔥 LOCKED IN GENEROSITY! You\'re AURA MAXXIN for the homies!',
  '⚡ QUIT EDGING AND BLESSED! That\'s some GIGACHAD behavior!'
];

// Special command flavors
const EDGE_FLAVORS = [
  '🔥 EDGING SUCCESS! You got that +{amount} aura without finishing!',
  '💀 EDGE LORD ACTIVATED! +{amount} aura from pure self-control!',
  '⚡ EDGING MASTER! Your restraint earned +{amount} aura!',
  '🎯 EDGE GAME STRONG! +{amount} aura for that sigma behavior!',
  '🔥 LOCKED IN EDGING! Your willpower got you +{amount} aura!'
];

const GOON_FLAVORS = [
  '💀 GOONING SESSION COMPLETE! +{amount} aura acquired!',
  '🔥 GOON MODE ACTIVATED! That focus got you +{amount} aura!',
  '⚡ GOONING GRINDSET! Your dedication earned +{amount} aura!',
  '🎯 PROFESSIONAL GOONER! +{amount} aura for that commitment!',
  '💪 GOON CAVE ENERGY! Your session produced +{amount} aura!'
];

const MEW_FLAVORS = [
  '🗿 MEWING SUCCESS! Your jawline grind earned +{amount} aura!',
  '💪 JAWLINE GAINS! Mewing session got you +{amount} aura!',
  '🔥 MEWING STREAK! Your facial gains earned +{amount} aura!',
  '💀 CHAD JAWLINE! Mewing technique got +{amount} aura!',
  '⚡ FACIAL STRUCTURE LOCKED IN! Mewing earned +{amount} aura!'
];

const SPECIAL_FAIL_FLAVORS = [
  '💀 COOKED! Your special move backfired - no aura!',
  '🫵😹 FUMBLED THE BAG! That attempt was mid af!',
  '🤡 L + RATIO! Your special command got absolutely rekt!',
  '💥 FAILED! Your technique was too weak for aura!',
  '😭 SKILL ISSUE! Maybe try again later!'
];



// Special Commands Logic (/edge, /goon, /mew)
async function handleSpecialCommand(userId, username, platform, chatId, commandType, familyFriendly = false) {
  try {
    // Check if /edge or /goon is used in family-friendly mode
    if (familyFriendly && (commandType === 'edge' || commandType === 'goon')) {
      return {
        success: false,
        message: '🌸 These commands are only available in unhinged mode! Use `/unhinge` to unlock them.'
      };
    }

    // Get user data
    const user = await db.getUser(userId, username, platform, chatId);
    if (!user) {
      return {
        success: false, 
        message: '💀 User not found! Try `/aurafarm` first to get started!'
      };
    }

    // Check daily special commands usage (stored in a hypothetical special_uses column)
    const today = new Date().toDateString();
    let specialUses = 0;
    let lastSpecialDate = null;

    // Parse special command data (we'll store as JSON in a column)
    if (user.special_data) {
      try {
        const specialData = JSON.parse(user.special_data);
        if (specialData.date === today) {
          specialUses = specialData.uses || 0;
        }
        lastSpecialDate = specialData.date;
      } catch (e) {
        // Invalid JSON, reset
        specialUses = 0;
      }
    }

    // Check if user has uses remaining
    if (specialUses >= 3) {
      return {
        success: false,
        message: `💀 You've used all 3 special commands today! Resets in ${getTimeUntilReset()} hours.`
      };
    }

    // 60% success rate
    const success = Math.random() < 0.6;
    
    if (!success) {
      // Increment usage even on failure
      const newSpecialData = {
        date: today,
        uses: specialUses + 1
      };

      await db.updateSpecialData(userId, JSON.stringify(newSpecialData));

      const failFlavor = getRandomElement(SPECIAL_FAIL_FLAVORS);
      const remaining = 3 - (specialUses + 1);
      
      return {
        success: true,
        message: `${failFlavor}\n\n**Special commands remaining today: ${remaining}/3**`
      };
    }

    // Success! Award aura
    const auraGain = Math.floor(Math.random() * 12) + 2; // 2-13 aura
    await db.updateAura(userId, user.aura + auraGain);

    // Update special command usage
    const newSpecialData = {
      date: today,
      uses: specialUses + 1
    };
    await db.updateSpecialData(userId, JSON.stringify(newSpecialData));

    // Get appropriate flavor text
    let flavors;
    switch (commandType) {
      case 'edge':
        flavors = EDGE_FLAVORS;
        break;
      case 'goon':
        flavors = GOON_FLAVORS;
        break;
      case 'mew':
        flavors = MEW_FLAVORS;
        break;
      default:
        flavors = EDGE_FLAVORS;
    }

    const flavor = getRandomElement(flavors).replace('{amount}', auraGain);
    const remaining = 3 - (specialUses + 1);
    const newTotal = user.aura + auraGain;

    return {
      success: true,
      message: `${flavor}\n\n💫 **Total: ${newTotal} aura**\n**Special commands remaining today: ${remaining}/3**`
    };

  } catch (error) {
    console.error('Error in handleSpecialCommand:', error);
    return {
      success: false,
      message: '💀 Something went wrong! Try again later.'
    };
  }
}

function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const hoursUntilReset = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
  return hoursUntilReset;
}

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
    message: `💀 **mog battle result** 💀\n\n${flavorText}\n\n💰 **Stakes:** ${battleAmount} aura\n🏆 **Winner:** @${winner} (+${battleAmount})\n💀 **Got Mogged:** @${loser} (-${battleAmount})`
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
  handleSpecialCommand,
  POSITIVE_FLAVORS,
  NEGATIVE_FLAVORS,
  JACKPOT_FLAVORS,
  IMPLOSION_FLAVORS,
  DUEL_WIN_FLAVORS,
  BLESSING_FLAVORS
};