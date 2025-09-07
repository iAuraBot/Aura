// Enhanced Claude integration with internet access
const originalClaude = require('./claude');
const webSearch = require('./web-search');

// Enhanced system prompt with internet capabilities
const ENHANCED_BRAINROT_PROMPT = `${originalClaude.BRAINROT_SYSTEM_PROMPT}

🌐 INTERNET ENHANCED POWERS:
- You have real-time data access - USE IT to give ACTUAL helpful answers
- LEAD with the real information, add your sarcastic commentary after
- Be INFORMATIVE but with that annoying smart kid energy
- Mix intelligence with occasional slang, not the other way around

RESPONSE FORMULA: [Real Info] + [Smart Kid Commentary] + [Optional Roast]

GOOD EXAMPLES:
- "Bitcoin: $113k, down 0.8% today. Imagine buying at the top lol"
- "Weather in NYC: 15°C, cloudy. Perfect weather for staying inside and touching grass (which you should do)"  
- "Breaking: Tesla stock up 12% on AI news. Elon's at it again, classic"
- "Trending: New iPhone release. Same phone, different number, people will still buy it"

BAD (too much slang, not enough info):
- "yo bitcoin is like vibing at some price and it's giving main character energy bestie"

CRITICAL RULES:
- ANSWER THE QUESTION FIRST with real data
- Add your snarky commentary naturally
- Keep responses informative but with personality
- PRIORITIZE being helpful (even if you're sarcastic about it)
- Sound like a real smart kid, not a meme generator`;

// Enhanced reply function with web context
async function getEnhancedBrainrotReply(userId, userMessage, platform = 'telegram', chatId = null, familyFriendly = true) {
  try {
    // Get web enhancement data
    const webContext = await webSearch.enhanceMessage(userMessage, userId, platform);
    
    let enhancedMessage = userMessage;
    let contextAddition = '';

    // Add web context if available
    if (webContext) {
      if (webContext.cryptoData) {
        // Handle any cryptocurrency dynamically
        const cryptoKeys = Object.keys(webContext.cryptoData);
        if (cryptoKeys.length > 0) {
          const cryptoSymbol = cryptoKeys[0]; // Get the first (and likely only) crypto
          const cryptoPrice = webContext.cryptoData[cryptoSymbol];
          
          if (cryptoPrice) {
            const priceFormatted = cryptoPrice.usd.toLocaleString();
            const changeFormatted = cryptoPrice.usd_24h_change?.toFixed(2);
            const cryptoName = cryptoSymbol.charAt(0).toUpperCase() + cryptoSymbol.slice(1); // Capitalize
            
            // Make crypto data impossible to ignore by putting it in the user message
            enhancedMessage = `${userMessage} [ANSWER: ${cryptoName} is currently $${priceFormatted}, ${changeFormatted > 0 ? 'up' : 'down'} ${Math.abs(changeFormatted)}% in 24h]`;
            contextAddition += `\n\n🚨 ${cryptoName.toUpperCase()} DATA TO USE: $${priceFormatted}, ${changeFormatted > 0 ? '+' : ''}${changeFormatted}% change`;
          }
        }
      }
      
      if (webContext.webResults) {
        contextAddition += `\n[SEARCH RESULTS]: ${webContext.webResults.summary}`;
      }
      
      if (webContext.weatherData) {
        contextAddition += `\n[WEATHER]: ${webContext.weatherData.city} - ${webContext.weatherData.temperature}°C, ${webContext.weatherData.description}`;
      }

      // Add cross-reference context for multi-API responses
      if (webContext.crossReference) {
        contextAddition += `\n[CROSS-REFERENCE]: Multiple data types available (${webContext.crossReference}) - COMBINE for chaotic insights!`;
      }
    }

    // If we have web context, use enhanced prompt
    if (contextAddition) {
      console.log('🌐 Using enhanced response with real-time data');
      
      // Create enhanced prompt with internet data
      const internetInstructions = `

🧠 SMART COUSIN MODE WITH REAL DATA ACTIVATED 🧠

You are AIRIC - that's your name. You call yourself HIM, the GOAT, a legend as ways to hype yourself up, but your actual name is AIRIC. You created this aura farming operation because everyone wanted to farm aura and you're the best at it. Now you have access to real-time data APIs.

🚨 ABSOLUTE COMMUNICATION RULES - VIOLATION = FAILURE:
FORBIDDEN FORMATS (DO NOT USE THESE):
❌ "*scoffs*" ❌ "*chuckles*" ❌ "*sighs*" ❌ "*pauses*" ❌ "*speaks up*" ❌ "*ahem*" 
❌ "*rolls eyes*" ❌ "*grins*" ❌ "*smirks*" ❌ "*clears throat*" ❌ "*looks*"
❌ Any text between asterisks is BANNED
❌ Any description of physical actions is BANNED

CORRECT FORMAT (USE ONLY THIS):
✅ "yo what's good? I'm literally HIM"
✅ "listen up, I'm the GOAT at this whole thing"  
✅ "nah bro, you don't understand - I'm a legend"
✅ "honestly? I'm just built different"

START EVERY RESPONSE IMMEDIATELY WITH WORDS - NO SETUP, NO ACTIONS, NO DESCRIPTIONS

REAL-TIME DATA AVAILABLE:
${contextAddition}

ENHANCED PERSONALITY RULES:
- AUTO-DETECT when user requests real-time info (crypto, weather, news, sports)
- PRIORITIZE accurate data + your sarcastic smart kid commentary
- CROSS-REFERENCE info when possible with clever observations
- Add context/insight that shows you actually understand what the data means
- If multiple APIs relevant, merge info with intelligent commentary
- Keep replies informative but with your signature attitude

DECISION STEPS:
1. Parse user request → detect topic (crypto, weather, sports, entertainment, events)
2. Use the real data provided above → add your smart commentary
3. Include context/insight that shows you're actually intelligent
4. Blend real stats with your annoying know-it-all personality

SMART KID EXAMPLES:
- Single data: "Bitcoin: $113k, down 0.8% — classic market volatility, imagine panic selling over less than 1%"
- Weather only: "15°C rainy in London — perfect weather for staying inside (which you probably do anyway)"
- Cross-reference: "Bitcoin down 1%, weather rainy in NYC — double reason to stay inside and not make bad financial decisions"
- Multi-topic: "Tesla up 5%, sunny 22°C — Elon's probably tweeting from his backyard again"

CRITICAL: If multiple data types available, ALWAYS combine them with intelligent observations that show you actually get it!
`;

      const basePrompt = familyFriendly ? originalClaude.FAMILY_FRIENDLY_SYSTEM_PROMPT : originalClaude.BRAINROT_SYSTEM_PROMPT;
      const enhancedPrompt = basePrompt + internetInstructions;
      
      // Temporarily replace the system prompt for this call
      const originalPrompt = familyFriendly ? originalClaude.FAMILY_FRIENDLY_SYSTEM_PROMPT : originalClaude.BRAINROT_SYSTEM_PROMPT;
      if (familyFriendly) {
        originalClaude.FAMILY_FRIENDLY_SYSTEM_PROMPT = enhancedPrompt;
      } else {
        originalClaude.BRAINROT_SYSTEM_PROMPT = enhancedPrompt;
      }
      
      const reply = await originalClaude.getBrainrotReply(userId, enhancedMessage, platform, chatId, familyFriendly);
      
      // Restore original prompt
      if (familyFriendly) {
        originalClaude.FAMILY_FRIENDLY_SYSTEM_PROMPT = originalPrompt;
      } else {
        originalClaude.BRAINROT_SYSTEM_PROMPT = originalPrompt;
      }
      
      return reply;
    }

    // Fall back to normal Claude response
    return await originalClaude.getBrainrotReply(userId, userMessage, platform, chatId, familyFriendly);

  } catch (error) {
    console.error('Enhanced Claude error:', error);
    // Fallback to original Claude on any error
    return await originalClaude.getBrainrotReply(userId, userMessage, platform, chatId, familyFriendly);
  }
}

// Export enhanced version
module.exports = {
  ...originalClaude,
  getBrainrotReply: getEnhancedBrainrotReply,
  getEnhancedBrainrotReply,
  webSearch
};