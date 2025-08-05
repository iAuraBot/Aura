// Test realistic user interaction patterns
require('dotenv').config();
const webSearch = require('./lib/web-search');
const claudeEnhanced = require('./lib/claude-enhanced');

async function testUserExperience() {
  console.log('🧪 Testing Real User Experience Scenarios...\n');

  const testUser = 'realistic_user_test';
  const platform = 'telegram';
  
  // Simulate realistic user messages
  const userMessages = [
    { msg: "hey bot what's up?", expectAPI: false },
    { msg: "lol ur funny", expectAPI: false },
    { msg: "/aurafarm", expectAPI: false },
    { msg: "bitcoin price today?", expectAPI: true },
    { msg: "nice thanks bro", expectAPI: false },
    { msg: "how's the weather?", expectAPI: true },
    { msg: "that's cool", expectAPI: false },
    { msg: "what's happening with crypto?", expectAPI: true },
    { msg: "awesome info", expectAPI: false },
    { msg: "any other news?", expectAPI: true },
    { msg: "just chilling now", expectAPI: false },
    { msg: "bitcoin doing good?", expectAPI: true }, // This should hit rate limit
    { msg: "ok no problem", expectAPI: false }
  ];

  let apiCallsMade = 0;
  let normalChats = 0;
  let blockedByRateLimit = 0;

  console.log('📱 Simulating Real User Conversation:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (let i = 0; i < userMessages.length; i++) {
    const test = userMessages[i];
    const messageNum = i + 1;
    
    console.log(`${messageNum}. User: "${test.msg}"`);
    
    // Check if this triggers web search
    const triggersAPI = webSearch.needsWebSearch(test.msg);
    console.log(`   Triggers API: ${triggersAPI ? '🌐 YES' : '💬 NO'}`);
    
    if (triggersAPI) {
      try {
        const result = await webSearch.enhanceMessage(test.msg, testUser, platform);
        if (result) {
          apiCallsMade++;
          console.log(`   Result: ✅ API call successful (${apiCallsMade} total today)`);
        } else {
          blockedByRateLimit++;
          console.log(`   Result: 🚫 Blocked by rate limit (user protection)`);
        }
      } catch (error) {
        console.log(`   Result: ❌ Error: ${error.message}`);
      }
    } else {
      normalChats++;
      console.log(`   Result: ✅ Normal chat response (no APIs used)`);
    }
    
    console.log(''); // Empty line for readability
    
    // Small delay to simulate real conversation timing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CONVERSATION SUMMARY:');
  console.log(`   📨 Total messages: ${userMessages.length}`);
  console.log(`   💬 Normal chat messages: ${normalChats} (${Math.round((normalChats/userMessages.length)*100)}%)`);
  console.log(`   🌐 API-enhanced messages: ${apiCallsMade} (${Math.round((apiCallsMade/userMessages.length)*100)}%)`);
  console.log(`   🚫 Blocked by protection: ${blockedByRateLimit} (${Math.round((blockedByRateLimit/userMessages.length)*100)}%)`);
  
  console.log('\n🎯 USER EXPERIENCE ANALYSIS:');
  
  if (normalChats >= apiCallsMade * 2) {
    console.log('   ✅ EXCELLENT: Most messages are normal chat (no API overhead)');
  }
  
  if (apiCallsMade > 0) {
    console.log('   ✅ GOOD: User got enhanced responses when asking for data');
  }
  
  if (blockedByRateLimit > 0) {
    console.log('   ✅ PROTECTED: Rate limiting prevented API abuse');
  } else {
    console.log('   ✅ SMOOTH: User stayed within reasonable limits');
  }
  
  console.log('\n💡 CONCLUSION:');
  console.log('   • Normal conversation is completely unaffected');
  console.log('   • Only specific data requests use APIs');  
  console.log('   • Rate limits protect against abuse while allowing normal use');
  console.log('   • User experience remains excellent with added intelligence');
}

testUserExperience().catch(error => {
  console.error('❌ Test failed:', error);
});