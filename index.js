require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const db = require('./db');

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Flavor text arrays
const POSITIVE_FLAVORS = [
  '💀 SHEESH! This farm is absolutely BUSSIN fr fr!',
  '🔥 W FARM! Your aura is straight up GIGACHAD energy!',
  '💯 NO CAP this is some SIGMA MALE farming!',
  '⚡ FR FR you just got that RIZZ boost!',
  '🗿 BASED FARM! Your aura game is UNMATCHED!',
  '💸 STONKS! Your aura portfolio going BRRRR!',
  '👑 ALPHA ENERGY detected! This farm HITS DIFFERENT!',
  '🚀 TO THE MOON! Your aura just went PARABOLIC!'
];

const NEGATIVE_FLAVORS = [
  '💀 L + RATIO! Your farm just got COOKED!',
  '😭 SKILL ISSUE! Time to touch grass fr!',
  '🤡 CRINGE FARM! Your aura said "nah fam"!',
  '💩 MID FARMING! This is some BETA behavior!',
  '🚫 COPE + SEETHE! Your aura game is WEAK!',
  '🗿 OHIO MOMENT! Your farm was SUS as hell!',
  '📉 STONKS DOWN! Your aura portfolio CRASHED!',
  '💸 FANUM TAXED! Someone stole your vibe!'
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
  '🕳️ GET RATIO\'D BY THE UNIVERSE! Touch grass NOW!'
];

const DUEL_WIN_FLAVORS = [
  '⚔️ {winner} absolutely MOGGED {loser}! NO MERCY!',
  '🏆 {winner} said "GET REKT" and FANUM TAXED {loser}!',
  '💀 {winner} just RATIO\'D {loser} into the SHADOW REALM!',
  '⚡ {winner} hit {loser} with that SIGMA GRINDSET!',
  '🔥 {winner} COOKED {loser} like it\'s THANKSGIVING!',
  '🗿 {winner} just ENDED {loser}\'s whole career! SHEESH!'
];

// Utility functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Removed rollDice() - no longer needed for 50/50 gambling system

function formatUsername(user) {
  if (user.username) {
    return `@${user.username}`;
  }
  return user.first_name || user.id.toString();
}

// Error handling wrapper
async function handleCommand(ctx, commandFn) {
  try {
    await commandFn(ctx);
  } catch (error) {
    console.error('Command error:', error);
    await ctx.reply('💀 BRUH! The aura servers just got REKT! This is a certified OHIO moment! Try again fr fr! 🤡');
  }
}

// Commands

// /aurafarm command
bot.command('aurafarm', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const userId = ctx.from.id.toString();
    const username = ctx.from.username;
    
    // Get or create user
    const user = await db.getUser(userId, username);
    
    // Check cooldown
    const farmCheck = db.canUserFarm(user);
    if (!farmCheck.canFarm) {
      await ctx.reply(`⏰ YO CHILL! Farm cooldown active for ${farmCheck.timeLeft}! Stop being so THIRSTY for aura! 💀`);
      return;
    }
    
    // RNG farming logic
    const roll = Math.random() * 100;
    let auraChange, flavorText;
    
    if (roll < 70) {
      // 70% chance: +20 to +50 aura
      auraChange = Math.floor(Math.random() * 31) + 20; // 20-50
      flavorText = getRandomElement(POSITIVE_FLAVORS);
    } else if (roll < 90) {
      // 20% chance: -10 to -25 aura
      auraChange = -(Math.floor(Math.random() * 16) + 10); // -10 to -25
      flavorText = getRandomElement(NEGATIVE_FLAVORS);
    } else {
      // 10% chance: jackpot (+100) or implosion (-50)
      if (Math.random() < 0.5) {
        auraChange = 100;
        flavorText = getRandomElement(JACKPOT_FLAVORS);
      } else {
        auraChange = -50;
        flavorText = getRandomElement(IMPLOSION_FLAVORS);
      }
    }
    
    // Update database
    await db.updateAura(userId, auraChange);
    await db.updateLastFarm(userId);
    
    const updatedUser = await db.getUser(userId, username);
    const sign = auraChange > 0 ? '+' : '';
    
    await ctx.reply(
      `✨ **AURA FARM SUCCESSFUL** ✨\n\n` +
      `${flavorText}\n\n` +
      `${formatUsername(ctx.from)} ${sign}${auraChange} aura\n` +
      `💫 Total Aura: ${updatedUser.aura}`
    );
  });
});

// /aura4aura command
bot.command('aura4aura', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const challenger = ctx.from;
    
    // Parse command: /aura4aura @username amount
    const parts = message.split(' ');
    const mentionMatch = message.match(/@(\w+)/);
    
    if (!mentionMatch || parts.length < 3) {
      await ctx.reply('🎰 **AURA CASINO** 🎰\n\nUsage: `/aura4aura @username [amount]`\nCHALLENGE SOMEONE TO A 50/50 AURA GAMBLE! 💀\nBoth players must have enough aura to match the wager!\n\nExample: `/aura4aura @friend 25`');
      return;
    }
    
    const targetUsername = mentionMatch[1];
    const wagerAmount = parseInt(parts[2]);
    
    if (isNaN(wagerAmount) || wagerAmount <= 0) {
      await ctx.reply('💀 BRUH! Enter a valid positive number for the wager! Stop being SUS! 🤡');
      return;
    }
    
    // Get challenger user (real ID)
    const challengerId = challenger.id.toString();
    const challengerUser = await db.getUser(challengerId, challenger.username);
    
    // For target user, we need to use username as ID since we can't get real Telegram ID from mention
    // This will create consistent user records based on username
    const targetId = `username_${targetUsername.toLowerCase()}`;
    const targetUser = await db.getUser(targetId, targetUsername);
    
    // Check if both users have enough aura
    if (challengerUser.aura < wagerAmount) {
      await ctx.reply(`💸 BROKE BOY ALERT! ${formatUsername(challenger)} doesn't have ${wagerAmount} aura to wager! Current aura: ${challengerUser.aura} 💀`);
      return;
    }
    
    if (targetUser.aura < wagerAmount) {
      await ctx.reply(`💸 TARGET IS BROKE! @${targetUsername} doesn't have ${wagerAmount} aura to match the wager! Their aura: ${targetUser.aura} 😭`);
      return;
    }
    
    // 50/50 random chance
    const challengerWins = Math.random() < 0.5;
    
    let winnerName, loserName, winnerUser, loserUser;
    
    if (challengerWins) {
      winnerName = formatUsername(challenger);
      loserName = `@${targetUsername}`;
      winnerUser = challengerUser;
      loserUser = targetUser;
      
      // Transfer aura
      await db.updateAura(challengerId, wagerAmount);
      await db.updateAura(targetId, -wagerAmount);
    } else {
      winnerName = `@${targetUsername}`;
      loserName = formatUsername(challenger);
      winnerUser = targetUser;
      loserUser = challengerUser;
      
      // Transfer aura
      await db.updateAura(targetId, wagerAmount);
      await db.updateAura(challengerId, -wagerAmount);
    }
    
    const flavorText = getRandomElement(DUEL_WIN_FLAVORS)
      .replace('{winner}', winnerName)
      .replace('{loser}', loserName);
    
    await ctx.reply(
      `🎰 **AURA CASINO RESULT** 🎰\n\n` +
      `💰 **Wager:** ${wagerAmount} aura\n\n` +
      `${flavorText}\n\n` +
      `💫 ${winnerName} wins +${wagerAmount} aura\n` +
      `💀 ${loserName} loses -${wagerAmount} aura\n\n` +
      `🏦 Final balances will be updated!`
    );
  });
});

// /auraboard command
bot.command('auraboard', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const allUsers = await db.getTopUsers(10, false); // Top 10 users sorted by aura (highest to lowest)
    
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
      
      const username = user.username || 'Unknown';
      message += `${emoji} ${position}. @${username}: ${user.aura} aura\n`;
    });
    
    await ctx.reply(message);
  });
});

// /help command (only responds when bot is mentioned or in DM)
bot.command('help', async (ctx) => {
  // Only respond in DMs or when bot is mentioned
  if (ctx.chat.type !== 'private' && !ctx.message.text.includes(`@${ctx.botInfo.username}`)) {
    return; // Ignore /help if not mentioned in group chats
  }
  
  await handleCommand(ctx, async (ctx) => {
    const helpMessage = `
🤖 **AURABOT HELP - GET THAT BAG!** 🤖

💀 **YO! Here's how to use this ABSOLUTELY BASED bot:**

✨ **/aurafarm**
• Farm aura every 24 hours with RNG
• 70% chance: +20 to +50 aura (W)
• 20% chance: -10 to -25 aura (L)  
• 10% chance: +100 JACKPOT or -50 IMPLOSION!
• Example: \`/aurafarm\`

🎰 **/aura4aura @user [amount]**
• 50/50 aura gambling casino - PURE DEGENERACY!
• Both players need enough aura to match bet
• Winner takes ALL the wagered aura
• Example: \`/aura4aura @friend 25\`

💫 **/aura [@user]**
• Check your aura balance or someone else's
• See if you're GIGACHAD or BETA energy
• Example: \`/aura\` or \`/aura @someone\`

📊 **/auraboard**
• View top 10 users ranked by aura
• See who's winning and who's getting REKT
• Example: \`/auraboard\`

❓ **/help**
• Shows this menu (you're here now, genius!)

💀 **PRO TIPS:**
• Farm daily to stack that aura bag! 💸
• Gamble responsibly... or don't, I'm not your mom! 🎰
• React to messages for daily bonus aura! 📱
• Touch grass occasionally! 🌱

**LET'S GET THIS AURA! NO CAP! 🚀**`;

    await ctx.reply(helpMessage);
  });
});

// /aura command
bot.command('aura', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const mentionMatch = message.match(/@(\w+)/);
    
    let targetId, targetUsername;
    
    if (mentionMatch) {
      // Check mentioned user's aura (use consistent username-based ID)
      targetUsername = mentionMatch[1];
      targetId = `username_${targetUsername.toLowerCase()}`;
    } else {
      // Check own aura (use real Telegram ID)
      targetId = ctx.from.id.toString();
      targetUsername = ctx.from.username;
    }
    
    const user = await db.getUser(targetId, targetUsername);
    
    let auraEmoji;
    if (user.aura >= 100) auraEmoji = '✨';
    else if (user.aura >= 50) auraEmoji = '🌟';
    else if (user.aura >= 0) auraEmoji = '💫';
    else if (user.aura >= -50) auraEmoji = '🌑';
    else auraEmoji = '💀';
    
    const displayName = mentionMatch ? `@${targetUsername}` : formatUsername(ctx.from);
    
    await ctx.reply(
      `${auraEmoji} **AURA CHECK** ${auraEmoji}\n\n` +
      `${displayName} has **${user.aura}** aura points\n\n` +
      `${user.aura >= 0 ? '✨ Radiating positive energy!' : '💀 Cursed with negative vibes...'}`
    );
  });
});

// Inline mode for @botname suggestions
bot.on('inline_query', async (ctx) => {
  try {
    const query = ctx.inlineQuery.query.toLowerCase();
    
    const results = [
      {
        type: 'article',
        id: '1',
        title: '✨ /aurafarm',
        description: 'Farm aura with RNG (24h cooldown)',
        input_message_content: {
          message_text: 'Use /aurafarm to farm some aura! ✨💫'
        }
      },
      {
        type: 'article', 
        id: '2',
        title: '🎰 /aura4aura @user [amount]',
        description: '50/50 aura gambling casino',
        input_message_content: {
          message_text: 'Challenge someone: /aura4aura @username [amount] 🎰💀'
        }
      },
      {
        type: 'article',
        id: '3', 
        title: '💫 /aura [@user]',
        description: 'Check aura balance',
        input_message_content: {
          message_text: 'Check aura: /aura or /aura @username 💫'
        }
      },
      {
        type: 'article',
        id: '4',
        title: '📊 /auraboard', 
        description: 'View leaderboard',
        input_message_content: {
          message_text: 'See the rankings: /auraboard 📊🏆'
        }
      },
      {
        type: 'article',
        id: '5',
        title: '❓ /help', 
        description: 'Show all commands and usage',
        input_message_content: {
          message_text: 'Get help: /help 📖💀'
        }
      }
    ];
    
    // Filter results based on query
    const filteredResults = query ? 
      results.filter(r => r.title.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)) : 
      results;
    
    await ctx.answerInlineQuery(filteredResults, { cache_time: 60 });
  } catch (error) {
    console.error('Inline query error:', error);
  }
});

// Reaction tracking
bot.on('message_reaction', async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    if (userId) {
      await db.updateReactions(userId);
    }
  } catch (error) {
    console.error('Reaction tracking error:', error);
  }
});

// Daily reset cron job (runs at midnight UTC)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily reset...');
    
    // Get most reactive user before reset
    const mostReactiveUser = await db.getMostReactiveUser();
    
    if (mostReactiveUser && mostReactiveUser.reactions_today > 0) {
      // Award bonus aura
      await db.updateAura(mostReactiveUser.user_id, 25);
      console.log(`Daily reaction winner: @${mostReactiveUser.username} (+25 aura)`);
      
      // You might want to broadcast this to a specific chat
      // bot.telegram.sendMessage(CHAT_ID, `🎉 Daily Reaction Champion: @${mostReactiveUser.username} wins +25 aura!`);
    }
    
    // Reset all reactions
    await db.resetDailyReactions();
    console.log('Daily reactions reset completed');
  } catch (error) {
    console.error('Daily reset error:', error);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('🔥 Something went wrong! The aura spirits are restless...');
});

// Start bot
bot.launch().then(() => {
  console.log('🚀 AuraFarmBot is running!');
  console.log('Available commands:');
  console.log('  /aurafarm - Farm aura (24h cooldown)');
  console.log('  /aura4aura @user - Challenge to duel');
  console.log('  /auraboard - View leaderboard');
  console.log('  /aura [@user] - Check aura balance');
}).catch(error => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  bot.stop('SIGTERM');
});