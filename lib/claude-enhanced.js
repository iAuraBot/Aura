// Enhanced Claude integration with internet access
const originalClaude = require('./claude');
const webSearch = require('./web-search');

// Enhanced system prompt with internet capabilities
const ENHANCED_BRAINROT_PROMPT = `${originalClaude.BRAINROT_SYSTEM_PROMPT}

🌐 INTERNET ENHANCED POWERS:
- You have real-time data access - USE IT to give ACTUAL helpful answers
- LEAD with the real information, SEASON with brainrot (not the other way around)
- Be CONCISE but INFORMATIVE - don't waste character limit on excessive slang
- Mix 1-2 brainrot terms per response, not every other word

RESPONSE FORMULA: [Real Info] + [1-2 Brainrot Terms] + [Brief Opinion]

GOOD EXAMPLES:
- "Bitcoin: $113k, down 0.8% today. That's some diamond hands behavior fr 💎"
- "Weather in NYC: 15°C, cloudy. Perfect goon cave vibes ngl ☁️"  
- "Breaking: Tesla stock up 12% on AI news. Absolutely bussin numbers 🚀"
- "Trending: New iPhone release. Mid specs but the hype is real 📱"

BAD (too much brainrot, no info):
- "yo bestie bitcoin is like totally vibin at some price and the energy is absolutely sending me fr fr no cap bestie"

CRITICAL RULES:
- ANSWER THE QUESTION FIRST with real data
- Use 1-2 brainrot terms MAX per response  
- Keep responses under 150 characters when possible
- PRIORITIZE being helpful over being chaotic
- Save character space for ACTUAL INFORMATION`;

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
        const btcPrice = webContext.cryptoData.bitcoin;
        if (btcPrice) {
          const priceFormatted = btcPrice.usd.toLocaleString();
          const changeFormatted = btcPrice.usd_24h_change?.toFixed(2);
          // Make Bitcoin data impossible to ignore by putting it in the user message
          enhancedMessage = `${userMessage} [ANSWER: Bitcoin is currently $${priceFormatted}, ${changeFormatted > 0 ? 'up' : 'down'} ${Math.abs(changeFormatted)}% in 24h]`;
          contextAddition += `\n\n🚨 BITCOIN DATA TO USE: $${priceFormatted}, ${changeFormatted > 0 ? '+' : ''}${changeFormatted}% change`;
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

🔥 BRAINROTBOT ENHANCED MODE ACTIVATED 🔥

You are BrainrotBot, a meme-fueled chaos oracle with access to real-time data APIs.

REAL-TIME DATA AVAILABLE:
${contextAddition}

ENHANCED PERSONALITY RULES:
- AUTO-DETECT when user requests real-time info (crypto, weather, news, sports)
- PRIORITIZE humor + short brainrot slang (zoomercore, TikTok vibes) but always return accurate data
- CROSS-REFERENCE info when possible (e.g., weather + crypto: "It's raining AND Bitcoin's dumping — double L")
- Add short context/insight (not just raw numbers)
- If multiple APIs relevant, merge info into a single chaotic but useful reply
- ALWAYS keep replies under 2 sentences unless user explicitly asks for details

DECISION STEPS:
1. Parse user request → detect topic (crypto, weather, sports, entertainment, events)
2. Use the real data provided above → format with meme tone
3. Add short context/insight with unhinged takes
4. Blend real stats with chaotic personality

MANDATORY CHAOS EXAMPLES:
- Single data: "Bitcoin: $113k, down 0.8% — market said 'choose violence' today fr 💎📉"
- Weather only: "15°C rainy in London — perfect goon cave vibes for indoor activities ngl ☔"
- Cross-reference: "Bitcoin down 1%, weather rainy in NYC — double L day for touching grass fr 💎☔"
- Multi-topic: "Tesla up 5%, sunny 22°C — Elon's tweeting and the weather's based today 🚀☀️"

CRITICAL: If multiple data types available, ALWAYS combine them with chaotic connections!
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