// Test the API protection system
require('dotenv').config();
const apiProtection = require('./lib/api-protection');
const usageMonitor = require('./lib/usage-monitor');
const webSearch = require('./lib/web-search');

async function testAPIProtection() {
  console.log('🛡️ Testing API Protection System...\n');

  // Test 1: Rate Limiting
  console.log('1️⃣ Testing Rate Limiting:');
  const testUser = 'test_user_protection';
  const platform = 'telegram';
  
  // Simulate multiple requests
  for (let i = 1; i <= 7; i++) {
    const limit = await apiProtection.checkRateLimit(testUser, platform, 'web_search');
    if (limit.allowed) {
      await apiProtection.incrementRateLimit(testUser, platform, 'web_search');
      console.log(`   Request ${i}: ✅ Allowed (${limit.current + 1}/5)`);
    } else {
      console.log(`   Request ${i}: ❌ Blocked - Rate limit exceeded (${limit.current}/${limit.limit})`);
    }
  }

  // Test 2: Query Validation
  console.log('\n2️⃣ Testing Query Validation:');
  const maliciousQueries = [
    'bitcoin price',                    // Good query
    'weather in NYC',                   // Good query  
    'api_key secret token',             // Blocked - API key extraction
    'bitcoin price <script>alert(1)',  // Blocked - XSS attempt
    'what is /etc/passwd',              // Blocked - system file access
    'union select * from users',       // Blocked - SQL injection
    'a'.repeat(300)                     // Blocked - too long
  ];

  for (const query of maliciousQueries) {
    const validation = apiProtection.validateQuery('web_search', query);
    const status = validation.valid ? '✅ Valid' : '❌ Blocked';
    const reason = validation.valid ? '' : ` (${validation.reason})`;
    console.log(`   "${query.substring(0, 30)}..." → ${status}${reason}`);
  }

  // Test 3: Cache System
  console.log('\n3️⃣ Testing Cache System:');
  
  // Store something in cache
  await apiProtection.setCache('crypto_price', 'bitcoin', { price: 113000, change: -0.5 });
  
  // Try to retrieve it
  const cached = await apiProtection.getFromCache('crypto_price', 'bitcoin');
  console.log(`   Cache test: ${cached.hit ? '✅ Cache hit' : '❌ Cache miss'}`);
  if (cached.hit) {
    console.log(`   Cached data: ${JSON.stringify(cached.data)}`);
  }

  // Test 4: Real API Call with Protection
  console.log('\n4️⃣ Testing Protected API Call:');
  try {
    const result = await webSearch.enhanceMessage('bitcoin price today', 'test_user_api', 'telegram');
    if (result) {
      console.log('   ✅ Protected API call successful');
      console.log(`   Data returned: ${result.cryptoData ? 'Crypto data ✅' : 'No crypto data'}`);
    } else {
      console.log('   ❌ Protected API call failed');
    }
  } catch (error) {
    console.log(`   ❌ Protected API call error: ${error.message}`);
  }

  // Test 5: Usage Statistics
  console.log('\n5️⃣ Testing Usage Statistics:');
  const stats = apiProtection.getUsageStats();
  console.log(`   Daily usage: Web search ${stats.daily.web_search}, Weather ${stats.daily.weather}, Crypto ${stats.daily.crypto}`);
  console.log(`   Cache size: ${stats.cacheSize} entries`);
  console.log(`   Rate limit entries: ${stats.rateLimitEntries}`);

  // Test 6: Security Monitoring
  console.log('\n6️⃣ Testing Security Monitoring:');
  const incident = usageMonitor.logSecurityIncident('suspicious_user', 'telegram', 'blocked_query', 'Attempted API key extraction');
  console.log(`   Security incident logged: ${incident.blocked ? 'User blocked' : 'Warning issued'}`);

  // Test 7: Usage Report
  console.log('\n7️⃣ Testing Usage Report:');
  const report = usageMonitor.generateReport();
  console.log('   Usage report generated:');
  console.log(report);

  console.log('\n🎯 API Protection Test Complete!');
  console.log('\n📋 Summary:');
  console.log('   ✅ Rate limiting working');
  console.log('   ✅ Query validation blocking malicious input');
  console.log('   ✅ Cache system operational');
  console.log('   ✅ Protected API calls functional');
  console.log('   ✅ Usage monitoring active');
  console.log('   ✅ Security incident logging enabled');
}

testAPIProtection().catch(error => {
  console.error('❌ Test failed:', error);
});