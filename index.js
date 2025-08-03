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

function rollDice() {
  return Math.floor(Math.random() * 10) + 1;
}

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
      `🌾 **AURA FARM SUCCESSFUL** 🌾\n\n` +
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
    
    // Parse mentioned user
    const mentionMatch = message.match(/@(\w+)/);
    if (!mentionMatch) {
      await ctx.reply('⚔️ **AURA DUEL** ⚔️\n\nUsage: `/aura4aura @username`\nCHALLENGE SOMEONE TO GET ABSOLUTELY MOGGED! 💀\nBest of 3 dice - winner takes NO PRISONERS!');
      return;
    }
    
    const targetUsername = mentionMatch[1];
    
    // Get both users
    const challengerId = challenger.id.toString();
    const challengerUser = await db.getUser(challengerId, challenger.username);
    
    // For demo purposes, we'll simulate the target user
    // In a real bot, you'd need to find the actual user ID from username
    const targetId = `target_${targetUsername}`;
    const targetUser = await db.getUser(targetId, targetUsername);
    
    // Best of 3 dice rolls
    const challengerRolls = [rollDice(), rollDice(), rollDice()];
    const targetRolls = [rollDice(), rollDice(), rollDice()];
    
    let challengerWins = 0;
    let targetWins = 0;
    
    let rollResults = '🎲 **DICE BATTLE RESULTS** 🎲\n\n';
    
    for (let i = 0; i < 3; i++) {
      const cRoll = challengerRolls[i];
      const tRoll = targetRolls[i];
      
      rollResults += `Round ${i + 1}: ${formatUsername(challenger)} rolled ${cRoll} vs @${targetUsername} rolled ${tRoll}\n`;
      
      if (cRoll > tRoll) {
        challengerWins++;
        rollResults += `✅ ${formatUsername(challenger)} wins this round!\n\n`;
      } else if (tRoll > cRoll) {
        targetWins++;
        rollResults += `✅ @${targetUsername} wins this round!\n\n`;
      } else {
        rollResults += `🤝 Draw this round!\n\n`;
      }
    }
    
    // Determine winner
    let winner, loser, winnerName, loserName;
    if (challengerWins > targetWins) {
      winner = challengerUser;
      loser = targetUser;
      winnerName = formatUsername(challenger);
      loserName = `@${targetUsername}`;
      await db.updateAura(challengerId, 15);
      await db.updateAura(targetId, -15);
    } else if (targetWins > challengerWins) {
      winner = targetUser;
      loser = challengerUser;
      winnerName = `@${targetUsername}`;
      loserName = formatUsername(challenger);
      await db.updateAura(targetId, 15);
      await db.updateAura(challengerId, -15);
    } else {
      // Draw
      rollResults += `🤝 **ABSOLUTE STALEMATE!** 🤝\n\nBoth of y'all are MID! No aura exchanged cause nobody got MOGGED! 💀`;
      await ctx.reply(rollResults);
      return;
    }
    
    const flavorText = getRandomElement(DUEL_WIN_FLAVORS)
      .replace('{winner}', winnerName)
      .replace('{loser}', loserName);
    
    const finalResult = `🏆 **DUEL COMPLETE** 🏆\n\n${flavorText}\n\n💫 ${winnerName} gains +15 aura\n💀 ${loserName} loses -15 aura`;
    
    await ctx.reply(rollResults + finalResult);
  });
});

// /auraboard command
bot.command('auraboard', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const topUsers = await db.getTopUsers(5, false); // Top 5 highest
    const bottomUsers = await db.getTopUsers(5, true); // Top 5 lowest
    
    let message = '📊 **AURA LEADERBOARD** 📊\n\n';
    
    message += '🏆 **AURA LEGENDS** 🏆\n';
    topUsers.forEach((user, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index] || '🏅';
      const username = user.username || 'Unknown';
      message += `${medal} @${username}: ${user.aura} aura\n`;
    });
    
    message += '\n💀 **CURSED CHAMPIONS** 💀\n';
    bottomUsers.forEach((user, index) => {
      const skull = ['💀', '🕳️', '👻', '⚫', '🌑'][index] || '💀';
      const username = user.username || 'Unknown';
      message += `${skull} @${username}: ${user.aura} aura\n`;
    });
    
    await ctx.reply(message);
  });
});

// /aura command
bot.command('aura', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const mentionMatch = message.match(/@(\w+)/);
    
    let targetId, targetUsername;
    
    if (mentionMatch) {
      // Check mentioned user's aura
      targetUsername = mentionMatch[1];
      targetId = `target_${targetUsername}`; // Simulated for demo
    } else {
      // Check own aura
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