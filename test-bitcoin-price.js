// Test specifically Bitcoin price responses
require('dotenv').config();
const claudeEnhanced = require('./lib/claude-enhanced');

async function testBitcoinPriceResponse() {
  console.log('🧪 Testing Bitcoin Price Response Fix...\n');

  const testMessage = "what's bitcoin price today?";
  console.log(`Testing: "${testMessage}"`);
  
  try {
    const response = await claudeEnhanced.getBrainrotReply(
      'test_user_789',
      testMessage,
      'telegram',
      'test_chat_789',
      true // family-friendly mode
    );
    
    console.log(`\n✅ Response: "${response}"`);
    console.log(`📏 Length: ${response.length} characters`);
    
    // Check if response contains actual Bitcoin data
    const hasPriceData = /\$\d+|\d+k|\d+,\d+/gi.test(response);
    const hasPercentage = /\d+%/gi.test(response);
    const hasBitcoinMention = /bitcoin|btc/gi.test(response);
    const hasBrainrot = /fr|ngl|diamond hands|energy|vibes|bussin/gi.test(response);
    
    console.log('\n📊 Analysis:');
    console.log(`   💰 Contains price data: ${hasPriceData ? '✅ YES' : '❌ NO'}`);
    console.log(`   📈 Contains percentage: ${hasPercentage ? '✅ YES' : '❌ NO'}`);
    console.log(`   ₿ Mentions Bitcoin: ${hasBitcoinMention ? '✅ YES' : '❌ NO'}`);
    console.log(`   🔥 Has brainrot: ${hasBrainrot ? '✅ YES' : '❌ NO'}`);
    
    const isGoodResponse = hasPriceData && hasBitcoinMention;
    console.log(`\n🎯 Overall Quality: ${isGoodResponse ? '✅ GOOD - Answered with real data!' : '❌ BAD - Missing actual price info'}`);
    
    if (!isGoodResponse) {
      console.log('\n🔧 If this failed, the bot should have said something like:');
      console.log('   "Bitcoin: $113,723, down 0.86% today. Diamond hands energy fr 💎"');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testBitcoinPriceResponse().catch(error => {
  console.error('❌ Test failed:', error);
});