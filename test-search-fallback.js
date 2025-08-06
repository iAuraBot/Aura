const WebSearch = require('./lib/web-search');

async function testSearchFallback() {
    console.log('🧪 Testing Google Search Fallback System...\n');
    
    const webSearch = new WebSearch();
    
    // Test scenarios
    const testQueries = [
        'latest tech news today',
        'what happened with Bitcoin price',
        'current weather trends',
        'trending topics right now'
    ];
    
    console.log('🔧 Configuration Check:');
    console.log(`Brave API Key: ${webSearch.braveApiKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`Google API Key: ${webSearch.googleApiKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`Google Search Engine ID: ${webSearch.googleSearchEngineId ? '✅ Present' : '❌ Missing'}`);
    console.log(`Web Search Enabled: ${webSearch.enabled ? '✅ Yes' : '❌ No'}\n`);
    
    if (!webSearch.enabled) {
        console.log('❌ Web search is disabled - no API keys found');
        return;
    }
    
    for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`\n📝 Test ${i + 1}: "${query}"`);
        
        try {
            const startTime = Date.now();
            const results = await webSearch.searchWeb(query, 'test-user', 'telegram');
            const duration = Date.now() - startTime;
            
            if (results) {
                console.log(`✅ SUCCESS (${duration}ms)`);
                console.log(`🔍 Provider: ${results.provider || 'unknown'}`);
                console.log(`📊 Results: ${results.results.length} items`);
                
                if (results.results.length > 0) {
                    console.log(`📖 Sample: "${results.results[0].title}"`);
                    console.log(`📝 Description: "${results.results[0].description?.substring(0, 100)}..."`);
                }
                
                // Test the fallback logic specifically
                if (results.provider === 'google') {
                    console.log('🎯 FALLBACK TRIGGERED! Google Search was used as backup');
                } else if (results.provider === 'brave') {
                    console.log('🦁 Primary provider (Brave) worked successfully');
                }
            } else {
                console.log(`❌ FAILED - No results returned`);
            }
            
        } catch (error) {
            console.error(`❌ Error in test ${i + 1}:`, error.message);
        }
        
        // Small delay between tests to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎯 SEARCH FALLBACK TEST COMPLETE!');
    console.log('🔍 The system should automatically fallback to Google if Brave fails');
    console.log('📊 This provides much more reliable search results for users!');
}

// Test specific scenarios
async function testFallbackScenarios() {
    console.log('\n🎭 Testing Specific Fallback Scenarios...\n');
    
    const webSearch = new WebSearch();
    
    // Temporarily disable Brave to force Google usage
    console.log('🧪 Simulating Brave Search failure...');
    const originalBraveKey = webSearch.braveApiKey;
    webSearch.braveApiKey = null; // Force fallback
    
    try {
        const results = await webSearch.searchWeb('current events today', 'test-fallback', 'telegram');
        
        if (results && results.provider === 'google') {
            console.log('✅ SUCCESS: Google fallback worked when Brave was disabled!');
            console.log(`📊 Got ${results.results.length} results from Google`);
        } else {
            console.log('❌ FAILED: Fallback did not work as expected');
        }
    } catch (error) {
        console.error('❌ Fallback test error:', error.message);
    }
    
    // Restore original key
    webSearch.braveApiKey = originalBraveKey;
    console.log('🔄 Restored original Brave API key');
}

async function runAllTests() {
    await testSearchFallback();
    await testFallbackScenarios();
}

runAllTests().catch(console.error);