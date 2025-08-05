// Test the optimized enhanced Claude responses
require('dotenv').config();
const claudeEnhanced = require('./lib/claude-enhanced');

async function testOptimizedResponses() {
  console.log('🧪 Testing Optimized Enhanced Responses...\n');

  // Test messages that should get enhanced, informative responses
  const testMessages = [
    "what's bitcoin price today?",
    "how's bitcoin doing?", 
    "what's happening with crypto news?",
    "any crypto updates?"
  ];

  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i];
    console.log(`${i + 1}️⃣ Testing: "${msg}"`);
    
    try {
      const response = await claudeEnhanced.getBrainrotReply(
        'test_user_456',
        msg,
        'telegram',
        'test_chat_456',
        true // family-friendly mode
      );
      
      console.log(`   Response: "${response}"`);
      console.log(`   Length: ${response.length} characters`);
      
      // Analyze response quality
      const hasRealInfo = /\$\d+|bitcoin|btc|\d+%|\d+k/gi.test(response);
      const hasBrainrot = /fr|ngl|no cap|bussin|vibes|sigma|based|diamond hands/gi.test(response);
      const isConsise = response.length <= 200;
      
      console.log(`   ✅ Has real info: ${hasRealInfo ? 'Yes' : 'No'}`);
      console.log(`   ✅ Has brainrot: ${hasBrainrot ? 'Yes' : 'No'}`);
      console.log(`   ✅ Concise: ${isConsise ? 'Yes' : 'No'}\n`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎯 Response optimization test complete!');
  console.log('\n📋 Looking for responses that:');
  console.log('   ✅ Lead with actual Bitcoin price/data');
  console.log('   ✅ Include 1-2 brainrot terms (not excessive)');
  console.log('   ✅ Stay under 200 characters');
  console.log('   ✅ Answer the question helpfully');
}

testOptimizedResponses().catch(error => {
  console.error('❌ Test failed:', error);
});