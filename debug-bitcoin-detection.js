// Debug why Bitcoin price detection isn't working
require('dotenv').config();
const webSearch = require('./lib/web-search');

async function debugBitcoinDetection() {
  console.log('🔍 Debugging Bitcoin Price Detection...\n');

  const testMessage = "what's bitcoin price today?";
  console.log(`Testing message: "${testMessage}"`);
  
  // Check if message triggers web search
  const needsSearch = webSearch.needsWebSearch(testMessage);
  console.log(`\n1️⃣ Needs web search: ${needsSearch ? '✅ YES' : '❌ NO'}`);
  
  if (needsSearch) {
    console.log('2️⃣ Getting enhanced message data...');
    
    try {
      const enhancedData = await webSearch.enhanceMessage(testMessage);
      console.log('\n3️⃣ Enhanced data result:');
      console.log(JSON.stringify(enhancedData, null, 2));
      
      if (enhancedData && enhancedData.cryptoData) {
        console.log('\n4️⃣ ✅ Crypto data found!');
        const btc = enhancedData.cryptoData.bitcoin;
        if (btc) {
          console.log(`   Price: $${btc.usd.toLocaleString()}`);
          console.log(`   24h Change: ${btc.usd_24h_change?.toFixed(2)}%`);
        }
      } else {
        console.log('\n4️⃣ ❌ No crypto data found');
      }
      
    } catch (error) {
      console.log(`\n❌ Error getting enhanced data: ${error.message}`);
    }
  }
}

debugBitcoinDetection().catch(error => {
  console.error('❌ Debug failed:', error);
});