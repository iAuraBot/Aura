const tmi = require('tmi.js');
const auraLogic = require('./auraLogic.js');
const db = require('./db.js'); // Import database functions for channel settings
const claude = require('./lib/claude-enhanced');

// Twitch client instance
let twitchClient = null;
let isConnected = false;
let pendingJoins = new Set(); // Queue channels to join when connected

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

  // Get initial channels from env (optional for OAuth flow)
  const channels = process.env.TWITCH_CHANNELS ? process.env.TWITCH_CHANNELS.split(',').map(ch => ch.trim()) : [];
  
  console.log('🔥 Initializing Twitch bot...');
  if (channels.length > 0) {
    console.log(`🎯 Initial channels: ${channels.join(', ')}`);
  } else {
    console.log('🎯 Starting with no channels - will join via OAuth flow');
  }
  
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
    channels: channels.length > 0 ? channels.map(channel => channel.toLowerCase()) : [] // Start with no channels if none specified
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

// Function to attempt Twitch reconnection
async function attemptTwitchReconnection() {
  if (!twitchClient) {
    console.log('❌ No Twitch client available for reconnection');
    return false;
  }

  if (isConnected) {
    console.log('✅ Twitch already connected');
    return true;
  }

  try {
    console.log('🔄 Attempting Twitch reconnection...');
    await twitchClient.connect();
    return true;
  } catch (error) {
    console.error('❌ Twitch reconnection failed:', error);
    return false;
  }
}

// Setup all Twitch event listeners
function setupTwitchEventListeners() {
  if (!twitchClient) return;

  // Connection events
  twitchClient.on('connected', (addr, port) => {
    console.log(`💀 AuraBot connected to Twitch IRC at ${addr}:${port}`);
    isConnected = true;
    
    // Process pending channel joins
    if (pendingJoins.size > 0) {
      console.log(`🎯 Processing ${pendingJoins.size} pending channel joins...`);
      for (const channelName of pendingJoins) {
        twitchClient.join(channelName).then(() => {
          console.log(`✅ Successfully joined pending channel: #${channelName}`);
        }).catch(error => {
          console.error(`❌ Failed to join pending channel #${channelName}:`, error);
        });
      }
      pendingJoins.clear();
    }
  });

  twitchClient.on('disconnected', (reason) => {
    console.log(`💔 Disconnected from Twitch: ${reason}`);
    isConnected = false;
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

        case 'edge':
          await handleSpecialCommand(channel, chatId, userId, username, 'edge');
          break;

        case 'goon':
          await handleSpecialCommand(channel, chatId, userId, username, 'goon');
          break;

        case 'mew':
          await handleSpecialCommand(channel, chatId, userId, username, 'mew');
          break;

        case 'emote':
          await handleEmote(channel, chatId, userId, username, args);
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
    • Bot starts in family-friendly mode by default
    • Switches AI personality for the whole channel
    • Use again to flip between wholesome and brainrot

💀 **UNHINGED MODE SPECIALS** (3 uses total per day):
**!edge** - 60% chance of +2-13 aura (unhinged only)
**!goon** - 60% chance of +2-13 aura (unhinged only)  
**!mew** - 60% chance of +2-13 aura (works in both modes)

🕺 **!emote [dance move]**
• Celebrate with brainrot dance energy!
• Use \`!emote\` for random dance or \`!emote custom move\`
• Example: \`!emote\` or \`!emote hit the griddy\`

💀 **PRO TIPS:**
• Each channel has its own aura ecosystem! 🏘️
• Farm daily to stack that aura bag! 💸
    • Start beef at your own risk! 💀

**LET'S GET THIS AURA! NO CAP! 🚀**`;

  await sayInChannel(channel, helpMessage);
}

// Emote command - BRAINROT DANCE CELEBRATION! 🕺💀
async function handleEmote(channel, chatId, userId, username, args) {
  let danceMove = args.join(' ').trim();
  
  // If no dance move provided, pick a random one!
  if (!danceMove) {
    const randomDances = [
      'hit the griddy',
      'default dance',
      'orange justice', 
      'twerking',
      'sigma strut',
      'flossing',
      'take the L',
      'windmill',
      'robot dance',
      'moonwalk',
      'dab',
      'whip and nae nae',
      'macarena',
      'gangnam style',
      'fortnite dance',
      'breakdancing',
      'salsa',
      'tango',
      'ballet pirouette',
      'chicken dance'
    ];
    danceMove = randomDances[Math.floor(Math.random() * randomDances.length)];
  }
  
  // Generate brainrot celebration response
  const celebrations = [
    `💀 @${username} witerally ${danceMove} - that's some goated energy fr!`,
    `🔥 @${username} said "${danceMove}" and now the whole chat is blessed ngl`,
    `🕺 @${username} hittin the ${danceMove} - absolutely based behavior!`,
    `💃 @${username} ${danceMove} era activated - chat's aura just increased!`,
    `⚡ @${username} really said "${danceMove}" and left no crumbs 💀`,
    `🎯 @${username} ${danceMove} and the vibes are IMMACULATE fr`,
    `🫵😹 @${username} ${danceMove} got everyone shook - main character energy!`,
    `🚀 @${username} ${danceMove} hit different - chat's locked in now!`,
    `💫 @${username} really ${danceMove} and said "this is my moment" ong`,
    `🎪 @${username} ${danceMove} supremacy - the griddy could never compare!`
  ];
  
  const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
  await sayInChannel(channel, randomCelebration);
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
    
    // 🎯 TWITCH FIX: Ensure response fits in single message (no chunking/cutoffs)
    const fullResponse = `@${username} ${reply}`;
    
    // Twitch has 500 char limit - but we want ULTRA-SHORT meme energy  
    const maxTwitchLength = 200; // Much shorter for easy brainrot vibes
    let finalResponse = fullResponse;
    
    if (finalResponse.length > maxTwitchLength) {
      // Truncate at word boundary and add indicator
      const truncated = finalResponse.substring(0, maxTwitchLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      finalResponse = (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
    }
    
    await sayInChannel(channel, finalResponse);
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

// Function to dynamically join a new channel
async function joinTwitchChannel(channelName) {
  if (!twitchClient) {
    console.error('❌ Twitch client not available');
    return false;
  }

  if (!isConnected) {
    console.log(`📋 Twitch not connected. Attempting reconnection for channel: #${channelName}`);
    pendingJoins.add(channelName);
    
    // Try to reconnect
    const reconnected = await attemptTwitchReconnection();
    if (!reconnected) {
      console.log(`❌ Reconnection failed. Channel #${channelName} will remain queued.`);
      return false;
    }
    
    // If reconnection succeeded, the 'connected' event will process pending joins
    return true;
  }

  try {
    console.log(`🎯 Attempting to join channel: #${channelName}`);
    await twitchClient.join(channelName);
    console.log(`✅ Successfully joined Twitch channel: #${channelName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to join channel #${channelName}:`, error);
    return false;
  }
}

// Function to dynamically leave a channel
async function leaveTwitchChannel(channelName) {
  if (!twitchClient) {
    console.error('❌ Twitch client not available');
    return false;
  }

  // Remove from pending joins if it's queued but not connected yet
  if (pendingJoins.has(channelName)) {
    pendingJoins.delete(channelName);
    console.log(`📋 Removed #${channelName} from pending joins queue`);
    return true;
  }

  if (!isConnected) {
    console.log(`⚠️ Cannot leave channel #${channelName} - not connected to Twitch`);
    return false;
  }

  try {
    console.log(`👋 Attempting to leave channel: #${channelName}`);
    await twitchClient.part(channelName);
    console.log(`✅ Successfully left Twitch channel: #${channelName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to leave channel #${channelName}:`, error);
    return false;
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

// Handle special commands (edge, goon, mew)
async function handleSpecialCommand(channel, chatId, userId, username, commandType) {
  try {
    // Get family-friendly setting for this channel
    const familyFriendly = await db.getFamilyFriendlySetting('twitch', chatId);
    
    const result = await auraLogic.handleSpecialCommand(
      userId, username, 'twitch', chatId, commandType, familyFriendly
    );
    
    await sayInChannel(channel, `@${username} ${result.message}`);
  } catch (error) {
    console.error(`Error in handleSpecialCommand (${commandType}):`, error);
    await sayInChannel(channel, `@${username} Error with special command! 💀`);
  }
}

module.exports = {
  initializeTwitchBot,
  getTwitchChannels,
  sendDailyReactionWinner,
  joinTwitchChannel,
  leaveTwitchChannel,
  attemptTwitchReconnection,
  twitchClient: () => twitchClient
};