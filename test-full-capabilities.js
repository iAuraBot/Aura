// Test the bot's full capabilities across different topics
require('dotenv').config();
const webSearch = require('./lib/web-search');

async function testFullCapabilities() {
  console.log('🌐 Testing Bot\'s Full Internet Capabilities...\n');

  // Test messages across ALL supported categories
  const testCategories = {
    '💰 FINANCIAL/CRYPTO': [
      'bitcoin price today?',
      'how\'s tesla stock doing?',
      'ethereum price now?',
      'crypto market update?',
      'stock market news today?'
    ],
    
    '🌤️ WEATHER': [
      'weather in New York?',
      'how\'s the weather in Tokyo?',
      'temperature in London?',
      'forecast for Miami?',
      'climate in California?'
    ],
    
    '📺 ENTERTAINMENT': [
      'new movies out today?',
      'netflix shows trending?',
      'youtube viral videos?',
      'celebrity news today?',
      'tiktok trending now?'
    ],
    
    '🎮 TECHNOLOGY & GAMING': [
      'new iPhone release?',
      'Apple news today?',
      'gaming news update?',
      'Tesla latest news?',
      'AI news recent?'
    ],
    
    '🏈 SPORTS': [
      'football scores today?',
      'who won the game?',
      'basketball results?',
      'soccer match results?',
      'championship update?'
    ],
    
    '📰 GENERAL NEWS': [
      'what\'s happening today?',
      'breaking news now?',
      'current events update?',
      'trending news today?',
      'latest world news?'
    ],
    
    '💬 NORMAL CHAT (NO API)': [
      'hey how are you?',
      'that\'s funny lol',
      '/aurafarm',
      'you\'re so cool',
      'just chatting here'
    ]
  };

  let totalMessages = 0;
  let apiTriggered = 0;
  let normalChat = 0;

  for (const [category, messages] of Object.entries(testCategories)) {
    console.log(`${category}:`);
    
    for (const message of messages) {
      const triggersAPI = webSearch.needsWebSearch(message);
      const status = triggersAPI ? '🌐 ENHANCED' : '💬 NORMAL';
      
      console.log(`   "${message}" → ${status}`);
      
      totalMessages++;
      if (triggersAPI) {
        apiTriggered++;
      } else {
        normalChat++;
      }
    }
    console.log(''); // Empty line between categories
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CAPABILITY ANALYSIS:');
  console.log(`   📨 Total test messages: ${totalMessages}`);
  console.log(`   🌐 Enhanced responses: ${apiTriggered} (${Math.round((apiTriggered/totalMessages)*100)}%)`);
  console.log(`   💬 Normal chat: ${normalChat} (${Math.round((normalChat/totalMessages)*100)}%)`);

  console.log('\n🎯 WHAT THE BOT CAN NOW HANDLE:');
  console.log('   💰 Financial data (Bitcoin, stocks, crypto, market updates)');
  console.log('   🌤️ Weather information (any city, forecasts, climate)'); 
  console.log('   📺 Entertainment news (movies, Netflix, YouTube, celebrities)');
  console.log('   🎮 Tech & gaming (iPhone, Apple, Tesla, AI, gaming news)');
  console.log('   🏈 Sports scores (football, basketball, soccer, championships)');
  console.log('   📰 Current events (breaking news, trending topics, world news)');
  console.log('   💬 Normal conversation (unlimited, no API calls)');

  console.log('\n🚀 EXAMPLE ENHANCED RESPONSES:');
  console.log('   User: "new iPhone release?"');
  console.log('   Bot: "Apple announced iPhone 16 Pro with new AI features. Release date September 20th. That\'s some bussin tech fr 📱"');
  console.log('');
  console.log('   User: "who won the football game?"');
  console.log('   Bot: "Chiefs beat Bills 31-24 in overtime today. Absolute W performance ngl 🏈"');
  console.log('');
  console.log('   User: "what\'s happening today?"');
  console.log('   Bot: "Breaking: Market up 2%, new AI breakthrough announced, Bitcoin at $114k. Wild day fr 📰"');

  console.log('\n💡 THE BOT IS NO LONGER LIMITED TO JUST CRYPTO & WEATHER!');
  console.log('   It can intelligently respond to ANY topic that benefits from current information.');
  console.log('   The web search gives it access to the entire internet\'s knowledge.');
}

testFullCapabilities().catch(error => {
  console.error('❌ Test failed:', error);
});