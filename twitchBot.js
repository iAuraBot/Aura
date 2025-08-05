const tmi = require('tmi.js');
const auraLogic = require('./auraLogic.js');
const db = require('./db.js'); // Import database functions for channel settings
const claude = require('./lib/claude.js');

// Twitch client instance
let twitchClient = null;

// Initialize Twitch bot
function initializeTwitchBot() {
  if (!process.env.TWITCH_BOT_USERNAME || !process.env.TWITCH_OAUTH_TOKEN) {
    console.log('⚠️ Twitch credentials not found. Skipping Twitch bot initialization.');
    return null;
  }

  // Validate OAuth token format (must start with 'oauth:')
  if (!process.env.TWITCH_OAUTH_TOKEN.startsWith('oauth:')) {
    console.log('❌ TWITCH_OAUTH_TOKEN must start with "oauth:" - check your .env file!');
    return null;
  }

  const channels = process.env.TWITCH_CHANNELS ? process.env.TWITCH_CHANNELS.split(',').map(ch => ch.trim()) : [];
  
  if (channels.length === 0) {
    console.log('⚠️ No Twitch channels specified. Skipping Twitch bot initialization.');
    return null;
  }

  console.log('🔥 Initializing Twitch bot...');
  console.log(`🎯 Target channels: ${channels.join(', ')}`);
  
  twitchClient = new tmi.Client({
    options: { 
      debug: process.env.NODE_ENV === 'development',
      messagesLogLevel: 'info'
    },
    connection: {
      reconnect: true,
      secure: true
    },
    identity: {
      username: process.env.TWITCH_BOT_USERNAME.toLowerCase(), // CRITICAL: Username must be lowercase per Twitch docs
      password: process.env.TWITCH_OAUTH_TOKEN // Should be in format: oauth:your_token_here
    },
    channels: channels.map(channel => channel.toLowerCase()) // Ensure channel names are lowercase
  });

  // Event listeners
  setupTwitchEventListeners();
  
  // Connect to Twitch
  twitchClient.connect().then(() => {
    console.log('🚀 Connected to Twitch IRC!');
  }).catch(err => {
    console.error('❌ Failed to connect to Twitch:', err);
  });

  return twitchClient;
}

// Setup all Twitch event listeners
function setupTwitchEventListeners() {
  if (!twitchClient) return;

  // Connection events
  twitchClient.on('connected', (addr, port) => {
    console.log(`💀 AuraBot connected to Twitch IRC at ${addr}:${port}`);
  });

  twitchClient.on('disconnected', (reason) => {
    console.log(`💔 Disconnected from Twitch: ${reason}`);
  });

  // Authentication events
  twitchClient.on('logon', () => {
    console.log('🔐 Successfully authenticated with Twitch IRC!');
  });

  twitchClient.on('authenticationfailure', (reason) => {
    console.error('❌ Twitch authentication failed:', reason);
    console.error('💡 Check your TWITCH_BOT_USERNAME and TWITCH_OAUTH_TOKEN in .env');
  });

  // Channel events
  twitchClient.on('join', (channel, username, self) => {
    if (self) {
      console.log(`✅ Successfully joined Twitch channel: ${channel}`);
    }
  });

  twitchClient.on('part', (channel, username, self) => {
    if (self) {
      console.log(`👋 Left Twitch channel: ${channel}`);
    }
  });

  // Message handling
  twitchClient.on('message', async (channel, userstate, message, self) => {
    // Ignore messages from the bot itself
    if (self) return;

    // Extract user info
    const username = userstate.username;
    const userId = userstate['user-id'] || username; // Fallback to username if no user ID
    const chatId = channel.replace('#', ''); // Remove # from channel name
    
    await handleTwitchMessage(channel, chatId, userId, username, message, userstate);
  });

  // Error handling
  twitchClient.on('error', (err) => {
    console.error('❌ Twitch bot error:', err);
  });
}

// Handle incoming Twitch messages and commands
async function handleTwitchMessage(channel, chatId, userId, username, message, userstate) {
  try {
    // Check if message is a command (starts with !)
    if (message.startsWith('!')) {
      const commandMatch = message.match(/^!(\w+)(?:\s+(.*))?/);
      if (!commandMatch) return;

      const command = commandMatch[1].toLowerCase();
      const args = commandMatch[2] ? commandMatch[2].trim().split(/\s+/) : [];

      console.log(`🎮 Twitch command: !${command} from ${username} in ${channel}`);

      // Handle different commands
      switch (command) {
        case 'aurafarm':
        case 'farm':
          await handleAuraFarm(channel, chatId, userId, username);
          break;

        case 'aura':
          await handleAuraCheck(channel, chatId, userId, username, args);
          break;

        case 'mog':
          if (command === 'mog' && args.length >= 2) {
            await handleAuraDuel(channel, chatId, userId, username, args);
          } else {
            await sayInChannel(channel, '💀 **trying to mog someone?** 💀\n\n`!mog @user [amount]` - 50/50 showdown\n\nExample: `!mog @friend 25`');
          }
          break;

        case 'auraboard':
        case 'leaderboard':
          await handleLeaderboard(channel, chatId);
          break;

        case 'bless':
          if (args.length >= 2) {
            await handleBless(channel, chatId, userId, username, args);
          } else {
            await sayInChannel(channel, '✨ **AURA BLESSING** ✨\n\nUsage: `!bless @username [amount]`\nShare your aura bag with the HOMIES! 💀\n\nExample: `!bless @friend 10`');
          }
          break;



        case 'unhinge':
          await handleUnhinge(channel, chatId, userId, username, userstate, args);
          break;

        case 'help':
        case 'commands':
          await handleHelp(channel);
          break;

        default:
          // Unknown command - ignore
          break;
      }
    } else {
      // Handle non-command messages for Claude (when bot is mentioned) - Natural conversation!
      const botName = process.env.TWITCH_BOT_USERNAME?.toLowerCase();
      if (botName && (message.toLowerCase().includes(`@${botName}`) || message.toLowerCase().includes(botName))) {
        await handleNaturalConversation(channel, chatId, userId, username, message);
      }
    }
  } catch (error) {
    console.error('❌ Error handling Twitch message:', error);
    await sayInChannel(channel, '💀 Aura servers having a moment... try again! 🔄');
  }
}

// Aura farming command
async function handleAuraFarm(channel, chatId, userId, username) {
  const result = await auraLogic.farmAura(userId, chatId, 'twitch', username, chatId);
  await sayInChannel(channel, result.message);
}

// Aura check command
async function handleAuraCheck(channel, chatId, userId, username, args) {
  const mentionedUser = args.length > 0 ? args[0].replace('@', '') : null;
  const result = await auraLogic.checkAura(userId, chatId, 'twitch', username, mentionedUser);
  await sayInChannel(channel, result.message);
}

// Aura duel command
async function handleAuraDuel(channel, chatId, userId, username, args) {
  // Check if duels are enabled for this channel
  try {
    const channelSettings = await db.getChannelSettings(chatId);
    if (!channelSettings.duel_enabled) {
      await sayInChannel(channel, '🚫 Duels are disabled in this channel! Contact the streamer to enable them.');
      return;
    }
  } catch (error) {
    // Default to enabled if no settings found
  }

  if (args.length < 2) {
              await sayInChannel(channel, '💀 **trying to mog someone?** 💀\n\n`!mog @user [amount]` - 50/50 showdown\n\nExample: `!mog @friend 25`');
    return;
  }

  const targetUsername = args[0].replace('@', '');
  const battleAmount = parseInt(args[1]);

  if (isNaN(battleAmount) || battleAmount <= 0) {
    await sayInChannel(channel, '💀 Enter a valid amount! Stop being SUS!');
    return;
  }

  const result = await auraLogic.auraDuel(userId, username, targetUsername, battleAmount, chatId, 'twitch');
  await sayInChannel(channel, result.message);
}

// Leaderboard command
async function handleLeaderboard(channel, chatId) {
  const channelName = channel.replace('#', '').toUpperCase();
  const result = await auraLogic.getLeaderboard(chatId, 'twitch', channelName);
  await sayInChannel(channel, result.message);
}

// Blessing command
async function handleBless(channel, chatId, userId, username, args) {
  if (args.length < 2) {
    await sayInChannel(channel, '✨ **AURA BLESSING** ✨\n\nUsage: `!bless @username [amount]`\nShare your aura bag with the HOMIES! 💀\n\nExample: `!bless @friend 10`');
    return;
  }

  const targetUsername = args[0].replace('@', '');
  const blessAmount = parseInt(args[1]);

  if (isNaN(blessAmount) || blessAmount <= 0) {
    await sayInChannel(channel, '💀 Enter a valid blessing amount!');
    return;
  }

  const result = await auraLogic.blessUser(userId, username, targetUsername, blessAmount, chatId, 'twitch');
  await sayInChannel(channel, result.message);
}

// Help command
async function handleHelp(channel) {
  const helpMessage = `
🤖 **AURABOT HELP - GET THAT BAG!** 🤖

💀 **YO! Here's how to use this ABSOLUTELY BASED bot:**

✨ **!aurafarm** (or !farm)
• Farm aura every 24 hours with RNG
• First time guaranteed NO L! Newbie protection! 💀
• 70% chance: +20 to +50 aura (W)
• 20% chance: -10 to -25 aura (L)  
• 10% chance: +100 JACKPOT or -50 IMPLOSION!

🎰 **!mog @user [amount]**
    • 50/50 mogging showdowns
• Both players need enough aura to match bet
    • Winner mogs the loser and takes ALL the aura
• Example: \`!mog @friend 25\`

💫 **!aura [@user]**
• Check your aura balance or someone else's
• See if you're GIGACHAD or BETA energy
• Example: \`!aura\` or \`!aura @someone\`

📊 **!auraboard** (or !leaderboard)
• View top 10 users ranked by aura
• See who's winning and who's getting REKT

✨ **!bless @user [amount]**
• Give your aura to another user - GIGACHAD GENEROSITY!
• Transfers aura from you to them - SIGMA SHARING!
• Example: \`!bless @friend 25\`

🤖 **@botname [message]**
• Just mention the bot to start UNHINGED brainrot conversations!
• Get chaotic zoomer responses and meme energy!
• Example: \`@aurafarmbot what do you think about aura farming?\`

❓ **!help** (or !commands)
• Shows this menu (you're here now, genius!)

🔒 **!unhinge** (MODS/BROADCASTER ONLY)
    • Toggle between family-friendly and unhinged mode
    • Switches AI personality for the whole channel
    • Use again to flip between wholesome and brainrot

💀 **PRO TIPS:**
• Each channel has its own aura ecosystem! 🏘️
• Farm daily to stack that aura bag! 💸
    • Start beef at your own risk! 💀

**LET'S GET THIS AURA! NO CAP! 🚀**`;

  await sayInChannel(channel, helpMessage);
}

// Handle natural conversation when bot is mentioned - Much more fluid!
async function handleNaturalConversation(channel, chatId, userId, username, message) {
  // Clean the message (remove bot mentions)
  const botName = process.env.TWITCH_BOT_USERNAME?.toLowerCase();
  let cleanMessage = message;
  if (botName) {
    cleanMessage = message.replace(new RegExp(`@?${botName}`, 'gi'), '').trim();
  }
  
  // Basic filtering - ignore very short messages or obvious spam
  if (cleanMessage.length < 2 || cleanMessage.length > 500) return;
  
  try {
    // Check if family-friendly mode is enabled for this channel
    const familyFriendly = await db.getFamilyFriendlySetting('twitch', chatId);
    
    const reply = await claude.getBrainrotReply(userId, cleanMessage, 'twitch', chatId, familyFriendly);
    await sayInChannel(channel, `@${username} ${reply}`);
  } catch (error) {
    claude.logError('Error in Twitch natural conversation:', error);
    await sayInChannel(channel, `@${username} bro u just crashed me 😭`);
  }
}

// Utility function to send messages to Twitch channel
async function sayInChannel(channel, message) {
  if (!twitchClient) return;
  
  try {
    // Split long messages into chunks (Twitch has a 500 char limit)
    const maxLength = 450; // Leave some buffer
    const chunks = [];
    
    if (message.length <= maxLength) {
      chunks.push(message);
    } else {
      // Split by lines first, then by length if needed
      const lines = message.split('\n');
      let currentChunk = '';
      
      for (const line of lines) {
        if ((currentChunk + line + '\n').length <= maxLength) {
          currentChunk += line + '\n';
        } else {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = line + '\n';
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
    }
    
    // Send each chunk with rate limit compliance
    // Twitch IRC rate limits: 1 message per second per channel (regular users)
    for (let i = 0; i < chunks.length; i++) {
      try {
        await twitchClient.say(channel, chunks[i]);
        if (i < chunks.length - 1) {
          // 1 second delay to comply with Twitch rate limits (1 msg/sec/channel)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (msgError) {
        console.error(`❌ Failed to send message chunk ${i + 1}:`, msgError);
        // If rate limited, wait longer before next attempt
        if (msgError.message && msgError.message.includes('rate')) {
          console.log('⏰ Rate limited - waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  } catch (error) {
    console.error('❌ Error sending message to Twitch:', error);
  }
}

// Get connected Twitch channels for daily reset
function getTwitchChannels() {
  if (!twitchClient || !twitchClient.getChannels) return [];
  
  try {
    return twitchClient.getChannels().map(channel => channel.replace('#', ''));
  } catch (error) {
    console.error('❌ Error getting Twitch channels:', error);
    return [];
  }
}

// Send daily reaction winner message to Twitch
async function sendDailyReactionWinner(chatId, username, auraGained) {
  if (!twitchClient) return;
  
  const channel = `#${chatId}`;
  const message = `🎉 **DAILY REACTION CHAMPION** 🎉\n\n@${username} wins +${auraGained} aura for being the most reactive today! 💀🔥`;
  
  await sayInChannel(channel, message);
}

// Handle AI mode toggle (MODS/BROADCASTER only)
async function handleUnhinge(channel, chatId, userId, username, userstate, args) {
  try {
    // Check if user is broadcaster or mod
    const isMod = userstate.mod || userstate.badges?.broadcaster === '1' || userstate.badges?.moderator === '1';
    const isBroadcaster = userstate.badges?.broadcaster === '1';
    
    if (!isMod && !isBroadcaster) {
      await sayInChannel(channel, `@${username} Only mods and the broadcaster can unhinge the AI! 🔒`);
      return;
    }

    // Get current setting and toggle it
    const currentSetting = await db.getFamilyFriendlySetting('twitch', chatId);
    const newValue = !currentSetting; // Toggle the setting

    // Update the setting
    const success = await db.setFamilyFriendlySetting('twitch', chatId, channel.replace('#', ''), newValue);
    
    if (success) {
      const modeText = newValue ? 'FAMILY-FRIENDLY 🌸' : 'UNHINGED BRAINROT 💀';
      const emoji = newValue ? '🌸' : '💀';
      await sayInChannel(channel, `@${username} ${emoji} AI TOGGLED! Channel is now in ${modeText} mode! Use !unhinge again to flip it back.`);
    } else {
      await sayInChannel(channel, `@${username} Failed to toggle AI mode. Try again! 💀`);
    }
  } catch (error) {
    console.error('Error in handleUnhinge:', error);
    await sayInChannel(channel, `@${username} Error toggling AI mode! 💀`);
  }
}

module.exports = {
  initializeTwitchBot,
  getTwitchChannels,
  sendDailyReactionWinner,
  twitchClient: () => twitchClient
};