// Test Brave Search API specifically
require('dotenv').config();
const axios = require('axios');

async function testBraveAPI() {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  
  console.log('🔍 Testing Brave Search API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'Missing'}`);
  
  if (!apiKey) {
    console.log('❌ No API key found in environment variables');
    return;
  }
  
  try {
    console.log('🔗 Testing search query: "bitcoin price"');
    
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json'
      },
      params: {
        q: 'bitcoin price',
        count: 3,
        safesearch: 'moderate',
        freshness: 'pd' // Past day
      },
      timeout: 10000
    });
    
    console.log('✅ Brave Search API Response:');
    console.log(`   Total results: ${response.data.web?.results?.length || 0}`);
    
    if (response.data.web?.results?.length > 0) {
      response.data.web.results.slice(0, 2).forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.title}`);
        console.log(`      ${result.description?.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.log('❌ Brave Search API Error:');
    console.log(`   Status: ${error.response?.status || 'No response'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Fix for 401 Error:');
      console.log('   1. Check your API key is correct (should start with BSA)');
      console.log('   2. Make sure you\'re using the right key from dashboard');
      console.log('   3. Get a new key at: https://api.search.brave.com/');
    }
    
    if (error.response?.status === 429) {
      console.log('\n🔧 Fix for 429 Error:');
      console.log('   1. You\'ve hit the rate limit (2000 searches/month)');
      console.log('   2. Wait for next month or upgrade plan');
    }
  }
}

testBraveAPI();