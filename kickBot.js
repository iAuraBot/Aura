const auraLogic = require('./auraLogic.js');
const db = require('./db.js');
const claude = require('./lib/claude-enhanced');
const { WebSocket } = require('ws');
// Using built-in fetch instead of axios (Node.js 18+)

// Kick client instance and connection state
let kickWebSocket = null;
let isConnected = false;
let pendingChannels = new Set(); // Queue channels to join when connected
let chatroomMapping = new Map(); // Map channel names to chatroom IDs

// Kick API base URL
const KICK_API_BASE = 'https://kick.com/api/v2';

// Initialize Kick bot
function initializeKickBot() {
  if (!process.env.KICK_CLIENT_ID || !process.env.KICK_CLIENT_SECRET) {
    console.log('⚠️ Kick credentials not found. Skipping Kick bot initialization.');
    return null;
  }

  console.log('🦶 Initializing Kick bot...');
  console.log('🎯 Starting with no channels - will join via OAuth flow');
  
  return true;
}

// Function to attempt Kick connection
async function attemptKickConnection() {
  if (isConnected) {
    console.log('✅ Kick already connected');
    return true;
  }

  try {
    console.log('🔄 Attempting Kick connection...');
    
    // Initialize WebSocket connection for Kick (using Pusher)
    // Note: This is a simplified connection - Kick uses Pusher WebSockets
    kickWebSocket = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.4.0&flash=false');
    
    kickWebSocket.on('open', () => {
      console.log('💀 AuraBot connected to Kick WebSocket');
      isConnected = true;
      
      // Process pending channel joins
      if (pendingChannels.size > 0) {
        console.log(`🎯 Processing ${pendingChannels.size} pending channel joins...`);
        for (const channelName of pendingChannels) {
          joinKickChannel(channelName);
        }
        pendingChannels.clear();
      }
    });

    kickWebSocket.on('close', () => {
      console.log('💔 Disconnected from Kick WebSocket');
      isConnected = false;
    });

    kickWebSocket.on('message', (data) => {
      handleKickWebSocketMessage(data);
    });

    kickWebSocket.on('error', (error) => {
      console.error('❌ Kick WebSocket error:', error);
      isConnected = false;
    });

    return true;
  } catch (error) {
    console.error('❌ Kick connection failed:', error);
    return false;
  }
}

// Handle incoming WebSocket messages from Kick
function handleKickWebSocketMessage(data) {
  try {
    const message = JSON.parse(data);
    
    // Handle different Kick event types
    if (message.event && message.data) {
      const eventData = JSON.parse(message.data);
      
      switch (message.event) {
        case 'App\\Events\\ChatMessageSentEvent':
          handleKickChatMessage(eventData);
          break;
        case 'App\\Events\\ChannelSubscriptionEvent':
          console.log('🎯 Kick subscription event:', eventData);
          break;
        default:
          // Log unknown events for debugging
          // console.log('🔍 Unknown Kick event:', message.event);
          break;
      }
    }
  } catch (error) {
    // Ignore parse errors for non-JSON messages (heartbeats, etc.)
  }
}

// Handle Kick chat messages
async function handleKickChatMessage(messageData) {
  try {
    const { chatroom, sender, content } = messageData;
    const channelId = chatroom.channel.id;
    const channelName = chatroom.channel.slug;
    const userId = sender.id.toString();
    const username = sender.username;
    const message = content;

    console.log(`🦶 Kick message from ${username} in ${channelName}: ${message}`);
    
    await handleKickMessage(channelName, channelId, userId, username, message);
  } catch (error) {
    console.error('❌ Error handling Kick chat message:', error);
  }
}

// Handle incoming Kick messages and commands
async function handleKickMessage(channelName, channelId, userId, username, message) {
  try {
    // Check if message is a command (starts with !)
    if (message.startsWith('!')) {
      const commandMatch = message.match(/^!(\w+)(?:\s+(.*))?/);
      if (!commandMatch) return;

      const command = commandMatch[1].toLowerCase();
      const args = commandMatch[2] ? commandMatch[2].trim().split(/\s+/) : [];

      console.log(`🦶 Kick command: !${command} from ${username} in ${channelName}`);

      // Handle different commands
      switch (command) {
        case 'aurafarm':
        case 'farm':
          await handleAuraFarm(channelName, channelId, userId, username);
          break;

        case 'aura':
          await handleAuraCheck(channelName, channelId, userId, username, args);
          break;

        case 'mog':
          if (args.length >= 2) {
            await handleAuraDuel(channelName, channelId, userId, username, args);
          } else {
            await sayInChannel(channelName, '💀 **trying to mog someone?** 💀\n\n`!mog @user [amount]` - 50/50 showdown\n\nExample: `!mog @friend 25`');
          }
          break;

        case 'auraboard':
        case 'leaderboard':
          await handleLeaderboard(channelName, channelId);
          break;

        case 'bless':
          if (args.length >= 2) {
            await handleBless(channelName, channelId, userId, username, args);
          } else {
            await sayInChannel(channelName, '✨ **AURA BLESSING** ✨\n\nUsage: `!bless @username [amount]`\nShare your aura bag with the HOMIES! 💀\n\nExample: `!bless @friend 10`');
          }
          break;

        case 'unhinge':
          await handleUnhinge(channelName, channelId, userId, username, args);
          break;

        case 'edge':
          await handleSpecialCommand(channelName, channelId, userId, username, 'edge');
          break;

        case 'goon':
          await handleSpecialCommand(channelName, channelId, userId, username, 'goon');
          break;

        case 'mew':
          await handleSpecialCommand(channelName, channelId, userId, username, 'mew');
          break;

        case 'emote':
          await handleEmote(channelName, channelId, userId, username, args);
          break;

        case 'help':
        case 'commands':
          await handleHelp(channelName);
          break;

        default:
          // Unknown command - ignore
          break;
      }
    } else {
      // Handle non-command messages for Claude (when bot is mentioned)
      const botName = 'iaurafarmbot'; // Our bot username
      if (message.toLowerCase().includes(`@${botName}`) || message.toLowerCase().includes(botName)) {
        await handleNaturalConversation(channelName, channelId, userId, username, message);
      }
    }
  } catch (error) {
    console.error('❌ Error handling Kick message:', error);
    await sayInChannel(channelName, '💀 Aura servers having a moment... try again! 🔄');
  }
}

// Command handlers (similar to Twitch)
async function handleAuraFarm(channelName, channelId, userId, username) {
  const result = await auraLogic.farmAura(userId, channelId, 'kick', username, channelId);
  await sayInChannel(channelName, result.message);
}

async function handleAuraCheck(channelName, channelId, userId, username, args) {
  const mentionedUser = args.length > 0 ? args[0].replace('@', '') : null;
  const result = await auraLogic.checkAura(userId, channelId, 'kick', username, mentionedUser);
  await sayInChannel(channelName, result.message);
}

async function handleAuraDuel(channelName, channelId, userId, username, args) {
  if (args.length < 2) {
    await sayInChannel(channelName, '💀 **trying to mog someone?** 💀\n\n`!mog @user [amount]` - 50/50 showdown\n\nExample: `!mog @friend 25`');
    return;
  }

  const targetUsername = args[0].replace('@', '');
  const battleAmount = parseInt(args[1]);

  if (isNaN(battleAmount) || battleAmount <= 0) {
    await sayInChannel(channelName, '💀 Enter a valid amount! Stop being SUS!');
    return;
  }

  const result = await auraLogic.auraDuel(userId, username, targetUsername, battleAmount, channelId, 'kick');
  await sayInChannel(channelName, result.message);
}

async function handleLeaderboard(channelName, channelId) {
  const channelDisplayName = channelName.toUpperCase();
  const result = await auraLogic.getLeaderboard(channelId, 'kick', channelDisplayName);
  await sayInChannel(channelName, result.message);
}

async function handleBless(channelName, channelId, userId, username, args) {
  if (args.length < 2) {
    await sayInChannel(channelName, '✨ **AURA BLESSING** ✨\n\nUsage: `!bless @username [amount]`\nShare your aura bag with the HOMIES! 💀\n\nExample: `!bless @friend 10`');
    return;
  }

  const targetUsername = args[0].replace('@', '');
  const blessAmount = parseInt(args[1]);

  if (isNaN(blessAmount) || blessAmount <= 0) {
    await sayInChannel(channelName, '💀 Enter a valid blessing amount!');
    return;
  }

  const result = await auraLogic.blessUser(userId, username, targetUsername, blessAmount, channelId, 'kick');
  await sayInChannel(channelName, result.message);
}

async function handleUnhinge(channelName, channelId, userId, username, args) {
  // For now, implement basic unhinge functionality
  // TODO: Add proper permission checking for Kick moderators/channel owners
  await sayInChannel(channelName, '🔒 **UNHINGE MODE TOGGLE** 🔒\n\nThis feature will be available soon for Kick! For now, the bot runs in full brainrot mode! 💀');
}

async function handleSpecialCommand(channelName, channelId, userId, username, commandType) {
  // Get family-friendly setting (defaulting to false for Kick for now)
  const familyFriendly = false; // TODO: Implement channel settings for Kick
  
  const result = await auraLogic.handleSpecialCommand(
    userId, username, 'kick', channelId, commandType, familyFriendly
  );
  
  await sayInChannel(channelName, result.message);
}

async function handleEmote(channelName, channelId, userId, username, args) {
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
  await sayInChannel(channelName, randomCelebration);
}

async function handleHelp(channelName) {
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

🕺 **!emote [dance move]**
• Celebrate with brainrot dance energy!
• Use \`!emote\` for random dance or \`!emote custom move\`
• Example: \`!emote\` or \`!emote hit the griddy\`

🤖 **@iaurafarmbot [message]**
• Just mention the bot to start UNHINGED brainrot conversations!
• Get chaotic zoomer responses and meme energy!

❓ **!help** (or !commands)
• Shows this menu (you're here now, genius!)

💀 **PRO TIPS:**
• Each channel has its own aura ecosystem! 🏘️
• Farm daily to stack that aura bag! 💸
    • Start beef at your own risk! 💀

**LET'S GET THIS AURA! NO CAP! 🚀**`;

  await sayInChannel(channelName, helpMessage);
}

// Handle natural conversation when bot is mentioned
async function handleNaturalConversation(channelName, channelId, userId, username, message) {
  // Clean the message (remove bot mentions)
  const botName = 'iaurafarmbot';
  let cleanMessage = message.replace(new RegExp(`@?${botName}`, 'gi'), '').trim();
  
  // Basic filtering - ignore very short messages or obvious spam
  if (cleanMessage.length < 2 || cleanMessage.length > 500) return;
  
  try {
    // Check if family-friendly mode is enabled (default false for Kick for now)
    const familyFriendly = true; // TODO: Implement channel settings for Kick
    
    const reply = await claude.getBrainrotReply(userId, cleanMessage, 'kick', channelId, familyFriendly);
    
    // Kick response length optimization (similar to Twitch)
    const fullResponse = `@${username} ${reply}`;
    
    // Kick message limit optimization
    const maxKickLength = 200; // Ultra-short for easy brainrot vibes
    let finalResponse = fullResponse;
    
    if (finalResponse.length > maxKickLength) {
      // Truncate at word boundary and add indicator
      const truncated = finalResponse.substring(0, maxKickLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      finalResponse = (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
    }
    
    await sayInChannel(channelName, finalResponse);
  } catch (error) {
    claude.logError('Error in Kick natural conversation:', error);
    await sayInChannel(channelName, `@${username} bro u just crashed me 😭`);
  }
}

// Utility function to send messages to Kick channel
async function sayInChannel(channelName, message) {
  if (!isConnected) {
    console.log('⚠️ Cannot send message to Kick - not connected');
    return;
  }
  
  try {
    // Get chatroom ID for channel
    const chatroomId = chatroomMapping.get(channelName);
    if (!chatroomId) {
      console.log(`⚠️ No chatroom ID found for channel ${channelName}`);
      return;
    }

    // TODO: Implement actual message sending via Kick API
    // This requires authenticated API calls to Kick's message endpoint
    // For now, log the message
    console.log(`🦶 [${channelName}] Bot: ${message}`);
    
    // Split long messages into chunks (Kick has similar limits to Twitch)
    const maxLength = 400;
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
    
    // Send each chunk (rate limited for Kick)
    for (let i = 0; i < chunks.length; i++) {
      try {
        // TODO: Make actual API call to send message
        // await sendKickMessage(chatroomId, chunks[i]);
        console.log(`🦶 [${channelName}] Chunk ${i + 1}: ${chunks[i]}`);
        
        if (i < chunks.length - 1) {
          // 1 second delay between messages
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (msgError) {
        console.error(`❌ Failed to send message chunk ${i + 1} to Kick:`, msgError);
      }
    }
  } catch (error) {
    console.error('❌ Error sending message to Kick:', error);
  }
}

// Function to dynamically join a channel
async function joinKickChannel(channelName) {
  if (!isConnected) {
    console.log(`📋 Kick not connected. Queuing channel: ${channelName}`);
    pendingChannels.add(channelName);
    await attemptKickConnection();
    return false;
  }

  try {
    console.log(`🎯 Attempting to join Kick channel: ${channelName}`);
    
    // Get channel information from Kick API
    const channelInfo = await getKickChannelInfo(channelName);
    if (!channelInfo) {
      console.log(`❌ Could not get info for Kick channel: ${channelName}`);
      return false;
    }

    const chatroomId = channelInfo.chatroom.id;
    chatroomMapping.set(channelName, chatroomId);

    // Subscribe to channel's chat events via WebSocket
    // TODO: Implement actual Pusher subscription
    console.log(`✅ Successfully joined Kick channel: ${channelName} (chatroom: ${chatroomId})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to join Kick channel ${channelName}:`, error);
    return false;
  }
}

// Function to dynamically leave a channel
async function leavKickChannel(channelName) {
  if (pendingChannels.has(channelName)) {
    pendingChannels.delete(channelName);
    console.log(`📋 Removed ${channelName} from pending Kick joins queue`);
    return true;
  }

  if (!isConnected) {
    console.log(`⚠️ Cannot leave Kick channel ${channelName} - not connected`);
    return false;
  }

  try {
    console.log(`👋 Attempting to leave Kick channel: ${channelName}`);
    
    // Remove from mapping
    chatroomMapping.delete(channelName);
    
    // TODO: Unsubscribe from Pusher events
    console.log(`✅ Successfully left Kick channel: ${channelName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to leave Kick channel ${channelName}:`, error);
    return false;
  }
}

// Get Kick channel information
async function getKickChannelInfo(channelName) {
  try {
    const response = await fetch(`${KICK_API_BASE}/channels/${channelName}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error getting Kick channel info for ${channelName}:`, error);
    return null;
  }
}

// Get connected Kick channels for daily reset
function getKickChannels() {
  return Array.from(chatroomMapping.keys());
}

module.exports = {
  initializeKickBot,
  attemptKickConnection,
  joinKickChannel,
  leavKickChannel,
  getKickChannels,
  sayInChannel
};