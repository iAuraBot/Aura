// Test the enhanced BrainrotBot personality with real-time data
require('dotenv').config();
const claudeEnhanced = require('./lib/claude-enhanced');

async function testBrainrotBotEnhanced() {
  console.log('🔥 Testing Enhanced BrainrotBot Personality...\n');

  const testScenarios = [
    {
      category: '💰 CRYPTO ONLY',
      message: 'bitcoin price today?',
      expectation: 'Should get Bitcoin price with brainrot commentary'
    },
    {
      category: '🌤️ WEATHER ONLY', 
      message: 'weather in Tokyo?',
      expectation: 'Should get Tokyo weather with meme energy'
    },
    {
      category: '🔥 CROSS-REFERENCE CHAOS',
      message: 'how are the markets and weather today?',
      expectation: 'Should combine crypto + weather data with chaotic insights'
    },
    {
      category: '📰 GENERAL NEWS',
      message: 'what\'s happening with crypto news?',
      expectation: 'Should get current crypto news with unhinged takes'
    },
    {
      category: '🎯 SPECIFIC CHAOS',
      message: 'is it good trading weather today?',
      expectation: 'Should cross-reference weather + trading vibes'
    }
  ];

  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`${i + 1}️⃣ ${scenario.category}`);
    console.log(`Message: "${scenario.message}"`);
    console.log(`Expected: ${scenario.expectation}`);
    
    try {
      const response = await claudeEnhanced.getBrainrotReply(
        'brainrot_test_user',
        scenario.message,
        'telegram', 
        'brainrot_test_chat',
        true // family-friendly mode for testing
      );
      
      console.log(`Response: "${response}"`);
      
      // Analyze response quality
      const hasRealData = /\$\d+|bitcoin|\d+%|\d+°C|°F|\d+k/gi.test(response);
      const hasBrainrot = /fr|ngl|no cap|bussin|vibes|sigma|based|diamond hands|goon|bruh|fam|bestie|delulu|mid|cooked|unhinged/gi.test(response);
      const isShort = response.length <= 200;
      const hasCrossRef = scenario.message.includes('weather') && scenario.message.includes('market') ? /weather.*crypto|crypto.*weather|trading.*weather|weather.*trading/gi.test(response) : true;
      
      console.log(`Analysis:`);
      console.log(`   📊 Has real data: ${hasRealData ? '✅' : '❌'}`);
      console.log(`   🔥 Has brainrot: ${hasBrainrot ? '✅' : '❌'}`);
      console.log(`   📏 Concise: ${isShort ? '✅' : '❌'} (${response.length} chars)`);
      console.log(`   🎯 Cross-ref: ${hasCrossRef ? '✅' : '❌'}`);
      
      const overallQuality = hasRealData && hasBrainrot && isShort ? '🔥 PEAK BRAINROT' : 
                            hasRealData && hasBrainrot ? '✅ GOOD' : 
                            hasRealData ? '⚠️ TOO FORMAL' : '❌ MISSING DATA';
      
      console.log(`   🎯 Quality: ${overallQuality}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log(''); // Empty line
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for rate limiting
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 BRAINROTBOT ENHANCED FEATURES:');
  console.log('   🔥 Meme-fueled chaos oracle personality');
  console.log('   📊 Real-time data with unhinged commentary');
  console.log('   🌐 Cross-references multiple APIs for chaotic insights');
  console.log('   ⚡ Ultra-short responses (under 2 sentences)');
  console.log('   🎭 TikTok/zoomer vibes with accurate information');
  console.log('   🚀 Perfect blend of helpful + hilarious');

  console.log('\n💡 EXAMPLE ENHANCED RESPONSES:');
  console.log('   User: "bitcoin and weather today?"');
  console.log('   Bot: "Bitcoin: $113k down 0.8%, NYC: 15°C rainy — double L day for touching grass fr 💎☔"');
  console.log('');
  console.log('   User: "how are the markets?"');
  console.log('   Bot: "Bitcoin dipping but ETH up 3% — crypto said \'choose your fighter\' today ngl 📈📉"');
  console.log('');
  console.log('   User: "trading weather good?"');
  console.log('   Bot: "22°C sunny in NYC, Bitcoin stable at $113k — perfect conditions for diamond hands fr ☀️💎"');
}

testBrainrotBotEnhanced().catch(error => {
  console.error('❌ Test failed:', error);
});