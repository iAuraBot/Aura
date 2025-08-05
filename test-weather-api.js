// Test OpenWeather API specifically
require('dotenv').config();
const axios = require('axios');

async function testWeatherAPI() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  console.log('🌤️ Testing OpenWeather API...');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : 'Missing'}`);
  
  if (!apiKey) {
    console.log('❌ No API key found in environment variables');
    return;
  }
  
  // Test with direct URL
  const testUrl = `https://api.openweathermap.org/data/2.5/weather?q=London&appid=${apiKey}&units=metric`;
  
  try {
    console.log('🔗 Testing URL:', testUrl.replace(apiKey, 'YOUR_API_KEY'));
    
    const response = await axios.get(testUrl, { timeout: 5000 });
    
    console.log('✅ Weather API Response:');
    console.log(`   City: ${response.data.name}`);
    console.log(`   Temperature: ${response.data.main.temp}°C`);
    console.log(`   Description: ${response.data.weather[0].description}`);
    console.log(`   Feels like: ${response.data.main.feels_like}°C`);
    
  } catch (error) {
    console.log('❌ Weather API Error:');
    console.log(`   Status: ${error.response?.status || 'No response'}`);
    console.log(`   Message: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Fix for 401 Error:');
      console.log('   1. Check your API key is correct');
      console.log('   2. Make sure you activated your account via email');
      console.log('   3. Wait up to 2 hours for new keys to activate');
      console.log('   4. Get a new key at: https://openweathermap.org/api');
    }
  }
}

testWeatherAPI();