require('dotenv').config();
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const db = require('./db');
const auraLogic = require('./auraLogic');
const twitchBot = require('./twitchBot');
const oauth = require('./oauth');
const claude = require('./lib/claude');
const twitter = require('./lib/twitter');

// Initialize Supabase client for cron job
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize bots
const bot = new Telegraf(process.env.BOT_TOKEN);
console.log('🤖 Telegram bot initialized!');

// Check database health on startup
db.checkDatabaseHealth().then(healthy => {
  if (healthy) {
    console.log('✅ Database connection healthy!');
  } else {
    console.log('⚠️ Database connection issues detected on startup');
  }
});

// Check services status on startup
setTimeout(() => {
  console.log('🤖 Service Status Summary:');
  console.log(`   Redis: ${claude.isRedisAvailable() ? '✅ Connected to Redis' : '⚠️ Using Supabase memory only'}`);
  console.log(`   Sentry: ${claude.isSentryAvailable() ? '✅ Sentry initialized' : '⚠️ Sentry disabled'}`);
  console.log(`   Claude: ${process.env.ANTHROPIC_API_KEY ? '✅ Claude AI ready' : '❌ Claude AI disabled (ANTHROPIC_API_KEY missing)'}`);
  console.log(`   Twitter: ${twitter.isTwitterAvailable() ? '✅ Twitter integration ready' : '⚠️ Twitter disabled (credentials missing)'}`);
}, 1000);

// Initialize OAuth server for secure Twitch authentication
const oauthServer = oauth.initializeOAuth();

// Initialize Twitch bot (optional)
const twitchClient = twitchBot.initializeTwitchBot();

// Multi-platform bot setup complete! 🔥💀

// Initialize Twitter polling
let twitterPollInterval = null;
if (twitter.isTwitterAvailable()) {
  twitterPollInterval = twitter.startTwitterPolling();
}

// Error handling wrapper
async function handleCommand(ctx, commandFn) {
  try {
    await commandFn(ctx);
  } catch (error) {
    // Log detailed error information
    console.error('💀 Command error details:');
    console.error('- Error:', error.message);
    console.error('- Stack:', error.stack);
    console.error('- User:', ctx.from?.username || 'unknown');
    console.error('- Chat:', ctx.chat?.id || 'unknown');
    
    // Check if it's a database-related error
    if (error.message?.includes('supabase') || error.message?.includes('database') || error.message?.includes('connection')) {
      console.error('🔴 DATABASE ERROR DETECTED');
    }
    
    await ctx.reply('💀 Aura servers having a moment... try again! 🔄');
  }
}

// Commands

// /aurafarm command - MULTI-PLATFORM SIGMA GRINDSET! 🔥
bot.command('aurafarm', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username;
    
    const result = await auraLogic.farmAura(userId, chatId, 'telegram', username);
    await ctx.reply(result.message);
  });
});

// /mog command - MULTI-PLATFORM MOGGING! 🎰💀
bot.command('mog', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const challenger = ctx.from;
    
    // Parse command: /mog @username amount
    const parts = message.split(' ');
    const mentionMatch = message.match(/@(\w+)/);
    
    if (!mentionMatch || parts.length < 3) {
      await ctx.reply('💀 **trying to mog someone?** 💀\n\n`/mog @user [amount]` - 50/50 showdown\n\nExample: `/mog @friend 25`');
      return;
    }
    
    const targetUsername = mentionMatch[1];
    const battleAmount = parseInt(parts[2]);
    
      if (isNaN(battleAmount) || battleAmount <= 0) {
    await ctx.reply('💀 Enter a valid amount! Stop being SUS!');
      return;
    }
    
    const userId = challenger.id.toString();
    const chatId = ctx.chat.id.toString();
    const username = challenger.username;
    
    const result = await auraLogic.auraDuel(userId, username, targetUsername, battleAmount, chatId, 'telegram');
    await ctx.reply(result.message);
  });
});

// /auraboard command - MULTI-PLATFORM LEADERBOARD! 📊💀
bot.command('auraboard', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const chatTitle = ctx.chat.title || 'This Chat';
    
    const result = await auraLogic.getLeaderboard(chatId, 'telegram', chatTitle);
    await ctx.reply(result.message);
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
• First time guaranteed NO L! Newbie protection! 💀
• 70% chance: +20 to +50 aura (W)
• 20% chance: -10 to -25 aura (L)  
• 10% chance: +100 JACKPOT or -50 IMPLOSION!
• Example: \`/aurafarm\`

🎰 **/mog @user [amount]**
    • 50/50 mogging showdowns
• Both players need enough aura to match bet
    • Winner mogs the loser and takes ALL the aura
• Example: \`/mog @friend 25\`

💫 **/aura [@user]**
• Check your aura balance or someone else's
• See if you're GIGACHAD or BETA energy
• Example: \`/aura\` or \`/aura @someone\`

📊 **/auraboard**
• View top 10 users ranked by aura
• See who's winning and who's getting REKT
• Example: \`/auraboard\`

✨ **/bless @user [amount]**
• Give your aura to another user - GIGACHAD GENEROSITY!
• Transfers aura from you to them - SIGMA SHARING!
• Example: \`/bless @friend 25\`

🤖 **@botname [message]**
• Just mention the bot to start UNHINGED brainrot conversations!
• Get chaotic zoomer responses and meme energy!
• Example: \`@aurafarmbot what do you think about aura farming?\`

❓ **/help**
• Shows this menu (you're here now, genius!)

🔒 **/unhinge** (ADMINS/CHAT OWNERS ONLY)
• Toggle between family-friendly and unhinged mode
• Switches AI personality for the whole chat
• Use again to flip between wholesome and brainrot

💀 **UNHINGED MODE SPECIALS** (3 uses total per day):
**/edge** - 60% chance of +2-13 aura (unhinged only)
**/goon** - 60% chance of +2-13 aura (unhinged only)  
**/mew** - 60% chance of +2-13 aura (works in both modes)

💀 **PRO TIPS:**
• Each chat has its own aura ecosystem! 🏘️
• Farm daily to stack that aura bag! 💸
    • Start beef at your own risk! 💀
• React to messages for daily bonus aura! 📱
• Your aura balance is separate in each group! 🔥

**LET'S GET THIS AURA! NO CAP! 🚀**`;

    await ctx.reply(helpMessage);
  });
});

// /unhinge command - Toggle family-friendly mode (ADMINS/OWNERS ONLY)
bot.command('unhinge', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const chatType = ctx.chat.type;
    
    // Permission check: Only admins and chat owners can toggle mode
    try {
      const chatMember = await ctx.getChatMember(userId);
      const isAdmin = ['creator', 'administrator'].includes(chatMember.status);
      
      if (!isAdmin) {
        await ctx.reply('🔒 Only admins and chat owners can unhinge the AI!');
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      await ctx.reply('💀 Error checking permissions! Try again.');
      return;
    }
    
    // Get current setting and toggle it
    const currentSetting = await db.getFamilyFriendlySetting('telegram', chatId);
    const newValue = !currentSetting; // Toggle the setting
    const chatName = ctx.chat.title || ctx.chat.first_name || 'this chat';
    const success = await db.setFamilyFriendlySetting('telegram', chatId, chatName, newValue);
    
    if (success) {
      const modeText = newValue ? 'FAMILY-FRIENDLY 🌸' : 'UNHINGED BRAINROT 💀';
      const emoji = newValue ? '🌸' : '💀';
      await ctx.reply(`${emoji} AI TOGGLED! Chat is now in ${modeText} mode! Use /unhinge again to flip it back.`);
    } else {
      await ctx.reply('💀 Failed to toggle AI mode. Try again!');
    }
  });
});

// /bless command - MULTI-PLATFORM GENEROSITY! ✨💀
bot.command('bless', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const giver = ctx.from;
    const chatId = ctx.chat.id.toString();
    
    // Parse command: /bless @username amount
    const parts = message.split(' ');
    const mentionMatch = message.match(/@(\w+)/);
    
    if (!mentionMatch || parts.length < 3) {
      await ctx.reply('✨ **AURA BLESSING** ✨\n\nUsage: `/bless @username [amount]`\nShare your aura bag with the HOMIES! 💀\nSpread that GIGACHAD ENERGY!\n\nExample: `/bless @friend 10`');
      return;
    }
    
    const targetUsername = mentionMatch[1];
    const blessAmount = parseInt(parts[2]);
    
    if (isNaN(blessAmount) || blessAmount <= 0) {
      await ctx.reply('💀 Enter a valid blessing amount!');
      return;
    }
    
    const userId = giver.id.toString();
    const username = giver.username;
    
    const result = await auraLogic.blessUser(userId, username, targetUsername, blessAmount, chatId, 'telegram');
    await ctx.reply(result.message);
  });
});

// /aura command - MULTI-PLATFORM AURA CHECK! 💫💀
bot.command('aura', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const message = ctx.message.text;
    const mentionMatch = message.match(/@(\w+)/);
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username;
    
    const mentionedUsername = mentionMatch ? mentionMatch[1] : null;
    
    const result = await auraLogic.checkAura(userId, chatId, 'telegram', username, mentionedUsername);
    await ctx.reply(result.message);
  });
});

// /edge command - Unhinged special command
bot.command('edge', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'unknown';
    
    // Get family-friendly setting for this chat
    const familyFriendly = await db.getFamilyFriendlySetting('telegram', chatId);
    
    const result = await auraLogic.handleSpecialCommand(
      userId, username, 'telegram', chatId, 'edge', familyFriendly
    );
    
    await ctx.reply(result.message);
  });
});

// /goon command - Unhinged special command  
bot.command('goon', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'unknown';
    
    // Get family-friendly setting for this chat
    const familyFriendly = await db.getFamilyFriendlySetting('telegram', chatId);
    
    const result = await auraLogic.handleSpecialCommand(
      userId, username, 'telegram', chatId, 'goon', familyFriendly
    );
    
    await ctx.reply(result.message);
  });
});

// /mew command - Family-friendly special command
bot.command('mew', async (ctx) => {
  await handleCommand(ctx, async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'unknown';
    
    // Get family-friendly setting for this chat (mew works in both modes)
    const familyFriendly = await db.getFamilyFriendlySetting('telegram', chatId);
    
    const result = await auraLogic.handleSpecialCommand(
      userId, username, 'telegram', chatId, 'mew', familyFriendly
    );
    
    await ctx.reply(result.message);
  });
});

// General message handler for Claude - Natural conversation when mentioned!
bot.on('text', async (ctx) => {
  // Respond in DMs or when bot is mentioned
  const isPrivateChat = ctx.chat.type === 'private';
  const isBotMentioned = ctx.message.text.includes(`@${ctx.botInfo.username}`);
  
  if (!isPrivateChat && !isBotMentioned) return;
  
  // Clean the message (remove bot mention)
  const messageText = ctx.message.text.replace(`@${ctx.botInfo.username}`, '').trim();
  
  // Skip if it's a command AFTER cleaning (so @bot /help gets properly handled)
  if (messageText.startsWith('/')) return;
  
  // Basic filtering - ignore very short messages or obvious spam
  if (messageText.length < 2 || messageText.length > 500) return;
  
  // Respond with Claude for natural conversation!
  await handleCommand(ctx, async (ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id.toString();
    
    // Check if family-friendly mode is enabled for this Telegram chat
    const familyFriendly = await db.getFamilyFriendlySetting('telegram', chatId);
    const reply = await claude.getBrainrotReply(userId, messageText, 'telegram', chatId, familyFriendly);
    await ctx.reply(reply);
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
        title: '🎰 /mog @user [amount]',
        description: '50/50 mogging showdowns',
        input_message_content: {
          message_text: 'Try to mog someone: /mog @username [amount] 🎰💀'
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
        title: '✨ /bless @user [amount]',
        description: 'Give aura to another user',
        input_message_content: {
          message_text: 'BLESS others with aura: /bless @username [amount] 💸🔥'
        }
      },
      {
        type: 'article',
        id: '6',
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

// Reaction tracking - TELEGRAM ONLY! 💫
bot.on('message_reaction', async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const chatId = ctx.chat?.id?.toString();
    if (userId && chatId) {
      await db.updateReactions(userId, chatId, 'telegram');
    }
  } catch (error) {
    console.error('Reaction tracking error:', error);
  }
});

// Daily reset cron job - MULTI-PLATFORM! 🕛💀
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔄 Running daily reset for ALL platforms and chats...');
    
    // Get all distinct platform-chat combinations from the database
    const { data: allUsers, error } = await supabase
      .from('aura')
      .select('user_id, platform')
      .neq('user_id', '');
    
    if (error) {
      console.error('Error getting users for daily reset:', error);
      return;
    }
    
    // Extract unique platform-chat combinations
    const platformChats = new Set();
    allUsers.forEach(user => {
      const [platform, chatId] = user.user_id.split('_');
      if (platform && chatId) {
        platformChats.add(`${platform}_${chatId}`);
      }
    });
    
    // Process each platform-chat combination separately
    for (const platformChat of platformChats) {
      const [platform, chatId] = platformChat.split('_');
      
      try {
        // Get most reactive user for this platform-chat
        const mostReactiveUser = await db.getMostReactiveUser(chatId, platform);
        
        if (mostReactiveUser && mostReactiveUser.reactions_today > 0) {
          // Extract user ID from composite key (platform_chatId_userId)
          const userId = mostReactiveUser.user_id.split('_')[2];
          await db.updateAura(userId, chatId, 25, platform);
          console.log(`🏆 Daily reaction winner in ${platform} chat ${chatId}: @${mostReactiveUser.username} (+25 aura)`);
          
          // Broadcast to specific platform-chat
          try {
            if (platform === 'telegram') {
              await bot.telegram.sendMessage(chatId, `🎉 **DAILY REACTION CHAMPION** 🎉\n\n@${mostReactiveUser.username} wins +25 aura for being the most reactive today! 💀🔥`);
            } else if (platform === 'twitch') {
              await twitchBot.sendDailyReactionWinner(chatId, mostReactiveUser.username, 25);
            }
          } catch (broadcastError) {
            console.error(`❌ Failed to broadcast to ${platform} chat ${chatId}:`, broadcastError);
          }
        }
        
        // Reset reactions for this platform-chat
        await db.resetDailyReactions(chatId, platform);
        console.log(`✅ Daily reactions reset completed for ${platform} chat ${chatId}`);
      } catch (chatError) {
        console.error(`❌ Error processing ${platform} chat ${chatId}:`, chatError);
      }
    }
    
    console.log('🎯 Daily reset completed for all platforms!');
  } catch (error) {
    console.error('❌ Daily reset error:', error);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('🔥 Something went wrong! The aura spirits are restless...');
});

// Start bot
bot.launch().then(() => {
  console.log('🚀💀 MULTI-PLATFORM AURAFARMBOT IS RUNNING! 💀🚀');
  console.log('');
  console.log('📱 TELEGRAM PLATFORM ACTIVE!');
  console.log('🎮 TWITCH PLATFORM:', twitchClient ? 'ACTIVE! 🔥' : 'DISABLED (missing credentials)');
  console.log('🐦 TWITTER PLATFORM:', twitter.isTwitterAvailable() ? 'ACTIVE! 🔥' : 'DISABLED (missing credentials)');
  console.log('');
  console.log('🗿 AVAILABLE COMMANDS (Telegram/Twitch):');
  console.log('  📱 /aurafarm (!aurafarm) - Farm aura (24h cooldown)');
  console.log('  🎰 /mog (!mog) @user [amount] - Challenge to mog');
  console.log('  📊 /auraboard (!auraboard) - View leaderboard');
  console.log('  💫 /aura (!aura) [@user] - Check aura balance');
  console.log('  ✨ /bless (!bless) @user [amount] - Give aura to others');
  console.log('  ❓ /help (!help) - Show command list');
  console.log('');
  console.log('🐦 TWITTER FEATURES:');
  console.log('  🤖 @mention bot for Claude conversations');
  console.log('  🎲 40% reply chance with smart throttling');
  console.log('  📊 Max 50 replies/day on Free API tier');
  console.log('');
  console.log('💀 EACH PLATFORM HAS SEPARATE AURA ECOSYSTEMS! 💀');
}).catch(error => {
  console.error('❌ Failed to start Telegram bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('💀 Received SIGINT, shutting down gracefully...');
  oauth.stopOAuth();
  if (twitterPollInterval) {
    twitter.stopTwitterPolling(twitterPollInterval);
  }
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('💀 Received SIGTERM, shutting down gracefully...');
  oauth.stopOAuth();
  if (twitterPollInterval) {
    twitter.stopTwitterPolling(twitterPollInterval);
  }
  bot.stop('SIGTERM');
});