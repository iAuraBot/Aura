// Quick test script for internet enhancement features
require('dotenv').config();
const webSearch = require('./lib/web-search');

async function testInternetFeatures() {
  console.log('🧪 Testing Internet Enhancement Features...\n');

  // Test 1: Web Search Detection
  console.log('1️⃣ Testing Web Search Detection:');
  const testMessages = [
    "what's happening with bitcoin today?",
    "how's the weather in New York?",
    "what's trending right now?",
    "just farming some aura"
  ];

  testMessages.forEach(msg => {
    const needsSearch = webSearch.needsWebSearch(msg);
    console.log(`   "${msg}" → ${needsSearch ? '🌐 SEARCH' : '💬 NORMAL'}`);
  });

  // Test 2: Environment Variables
  console.log('\n2️⃣ Checking Environment Variables:');
  console.log(`   ENABLE_WEB_SEARCH: ${process.env.ENABLE_WEB_SEARCH || '❌ Missing'}`);
  console.log(`   BRAVE_SEARCH_API_KEY: ${process.env.BRAVE_SEARCH_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OPENWEATHER_API_KEY: ${process.env.OPENWEATHER_API_KEY ? '✅ Set' : '❌ Missing'}`);

  // Test 3: Crypto API (Always Free)
  console.log('\n3️⃣ Testing Crypto Price API:');
  try {
    const cryptoData = await webSearch.getCryptoPrice('bitcoin');
    if (cryptoData && cryptoData.bitcoin) {
      console.log(`   ✅ Bitcoin: $${cryptoData.bitcoin.usd.toLocaleString()}`);
      console.log(`   📈 24h Change: ${cryptoData.bitcoin.usd_24h_change?.toFixed(2)}%`);
    } else {
      console.log('   ❌ Crypto API failed');
    }
  } catch (error) {
    console.log(`   ❌ Crypto Error: ${error.message}`);
  }

  // Test 4: Web Search (if API key provided)
  if (process.env.BRAVE_SEARCH_API_KEY) {
    console.log('\n4️⃣ Testing Web Search API:');
    try {
      const searchResults = await webSearch.searchWeb('bitcoin price today');
      if (searchResults && searchResults.results.length > 0) {
        console.log(`   ✅ Found ${searchResults.results.length} search results`);
        console.log(`   📰 Sample: ${searchResults.results[0].title}`);
      } else {
        console.log('   ❌ No search results returned');
      }
    } catch (error) {
      console.log(`   ❌ Search Error: ${error.message}`);
    }
  } else {
    console.log('\n4️⃣ Web Search API: ⚠️ Skipped (no API key)');
  }

  // Test 5: Weather API (if API key provided)
  if (process.env.OPENWEATHER_API_KEY) {
    console.log('\n5️⃣ Testing Weather API:');
    try {
      const weatherData = await webSearch.getWeather('New York');
      if (weatherData) {
        console.log(`   ✅ ${weatherData.city}: ${weatherData.temperature}°C`);
        console.log(`   🌤️ ${weatherData.description}`);
      } else {
        console.log('   ❌ No weather data returned');
      }
    } catch (error) {
      console.log(`   ❌ Weather Error: ${error.message}`);
    }
  } else {
    console.log('\n5️⃣ Weather API: ⚠️ Skipped (no API key)');
  }

  console.log('\n🎯 Test Complete! Check results above.');
  
  // Provide setup guidance
  console.log('\n📋 Next Steps:');
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    console.log('   🔍 Get Brave Search API key: https://api.search.brave.com/');
  }
  if (!process.env.OPENWEATHER_API_KEY) {
    console.log('   🌤️ Get OpenWeather API key: https://openweathermap.org/api');
  }
  if (process.env.BRAVE_SEARCH_API_KEY && process.env.OPENWEATHER_API_KEY) {
    console.log('   🚀 All APIs configured! Try these test messages:');
    console.log('   • @botname what\'s bitcoin price today?');
    console.log('   • @botname how\'s the weather in London?');
    console.log('   • @botname what\'s happening with crypto?');
  }
}

// Run the test
testInternetFeatures().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});