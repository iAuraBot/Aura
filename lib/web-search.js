const axios = require('axios');
const apiProtection = require('./api-protection');

// Web search integration for enhanced Claude responses
class WebSearchIntegration {
  constructor() {
    this.braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    this.googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
    
    // Enable web search if we have API keys, regardless of ENABLE_WEB_SEARCH setting
    this.enabled = !!(this.braveApiKey || this.googleApiKey || process.env.OPENWEATHER_API_KEY);
    
    if (this.enabled) {
      console.log('🌐 Web search integration enabled!');
      if (this.braveApiKey) console.log('✅ Brave Search API ready (primary)');
      if (this.googleApiKey && this.googleSearchEngineId) console.log('✅ Google Custom Search API ready (fallback)');
      if (process.env.OPENWEATHER_API_KEY) console.log('✅ OpenWeather API ready');
    }
  }

  // Advanced semantic trigger detection with 3-tier system
  needsWebSearch(message) {
    const msg = message.toLowerCase();
    
    // TIER 1: Fast keyword detection
    if (this.checkKeywordTriggers(msg)) return true;
    
    // TIER 2: Natural language patterns
    if (this.checkNaturalLanguagePatterns(msg)) return true;
    
    // TIER 3: Intent-based semantic detection
    if (this.checkIntentPatterns(msg)) return true;
    
    return false;
  }

  // TIER 1: Direct keyword mentions (fastest)
  checkKeywordTriggers(msg) {
    // Core keyword lists
    const cryptoKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'doge', 'crypto', 'altcoin', 'blockchain', 'defi', 'nft', 'coin'];
    const weatherKeywords = ['weather', 'rain', 'sunny', 'snow', 'forecast', 'temperature', 'degrees', 'storm', 'umbrella', 'jacket', 'cold', 'hot', 'cloudy', 'wind'];
    const newsKeywords = ['news', 'trending', 'breaking', 'headline', 'happening', 'drama', 'viral', 'controversy', 'update'];
    const techKeywords = ['iphone', 'apple', 'tesla', 'google', 'ai', 'gaming', 'playstation', 'xbox', 'nintendo', 'console', 'tech'];
    const sportsKeywords = ['score', 'game', 'team', 'championship', 'winner', 'playoff', 'finals', 'match', 'tournament', 'league', 'lakers', 'warriors', 'celtics', 'knicks', 'dub'];
    
    const allKeywords = [...cryptoKeywords, ...weatherKeywords, ...newsKeywords, ...techKeywords, ...sportsKeywords];
    return allKeywords.some(keyword => msg.includes(keyword));
  }

  // TIER 2: Natural conversational patterns
  checkNaturalLanguagePatterns(msg) {
    const patterns = [
      // CRYPTO NATURAL PATTERNS
      /should i (buy|sell|invest|trade)|worth (buying|selling|investing)|good investment/gi,
      /is.*(up|down|pumping|dumping|crashing|mooning|tanking)|going (up|down)/gi,
      /(how.*doing|performing|chart|market|bull|bear|moon|bag)/gi,
      /(price check|what.*cost|worth.*now|value.*today)/gi,
      
      // WEATHER NATURAL PATTERNS  
      /(should i bring|need.*(umbrella|jacket|coat|sweater)|what.*wear)/gi,
      /(is it.*(hot|cold|raining|snowing)|outside|temperature.*like)/gi,
      /(sky.*looking|storm.*coming|nice.*day|good.*weather)/gi,
      /(dress.*weather|feel.*like.*outside|bring.*umbrella)/gi,
      
      // NEWS/CURRENT EVENTS NATURAL PATTERNS
      /(why.*everyone.*(talking|saying)|what.*(going.*on|happening)|any.*drama)/gi,
      /(heard.*about|seen.*news|what.*happened|fill.*me.*in)/gi,
      /(any.*updates|latest.*on|status.*of|current.*situation)/gi,
      /(what.*big|trending|viral|everyone.*talking)/gi,
      
      // TECH NATURAL PATTERNS
      /(when.*(dropping|coming.*out|release)|release.*date|new.*version)/gi,
      /(any.*updates|latest.*features|what.*new)/gi,
      /(heard.*about.*new|seen.*announcement|tech.*news)/gi,
      
      // SPORTS NATURAL PATTERNS
      /(who.*won|final.*score|did.*(team|they).*win|catch.*game)/gi,
      /(how.*(team|season).*doing|playoffs|championship)/gi,
      /(any.*games.*today|sports.*update|score.*check)/gi,
      /(caught.*the.*dub|got.*the.*dub|who.*caught)/gi,
      /(lakers|warriors|celtics|knicks|bulls|heat).*win/gi
    ];
    
    return patterns.some(pattern => pattern.test(msg));
  }

  // TIER 3: Intent classification with slang/context understanding
  checkIntentPatterns(msg) {
    // Crypto slang and intent patterns
    const cryptoSlang = [
      /(cooking|cooked|bag|moon|diamond.*hands|paper.*hands|hodl|rekt)/gi,
      /(pumping|dumping|alt.*season|degen|ape.*into|fomo|rugpull)/gi,
      /(to.*the.*moon|diamond.*hands|when.*lambo|this.*is.*the.*way)/gi
    ];
    
    // Weather activity implications
    const weatherActivity = [
      /(going.*(outside|beach|park|mall)|plans.*today|dress.*for)/gi,
      /(outfit.*check|what.*to.*wear|too.*(hot|cold))/gi,
      /(sky.*looking|weather.*looking|outside.*vibes)/gi
    ];
    
    // News/drama detection
    const newsSlang = [
      /(tea|spill|drama|beef|controversy|cancelled|trending)/gi,
      /(what.*the.*hype|why.*everyone|heard.*about)/gi,
      /(any.*tea|drama.*check|what.*missed)/gi
    ];
    
    // Location + activity patterns (weather implied)
    const locationActivity = /in.*(paris|london|tokyo|nyc|la|miami|chicago|seattle|vegas|city)|going.*to.*(beach|park|outside|mall)/gi;
    
    // Financial action patterns (crypto implied)  
    const financialAction = /(buy|sell|invest|trade|hold).*(worth|good|bad)|worth.*(buying|selling|investing)/gi;
    
    // Time-sensitive queries (likely need real-time data)
    const timeSensitive = /(right.*now|currently|at.*moment|as.*of.*today|this.*week|lately|recent)/gi;
    
    const allSlangPatterns = [...cryptoSlang, ...weatherActivity, ...newsSlang];
    
    return allSlangPatterns.some(pattern => pattern.test(msg)) ||
           locationActivity.test(msg) ||
           financialAction.test(msg) ||
           timeSensitive.test(msg);
  }

  // Extract search query from user message
  extractSearchQuery(message) {
    // Simple extraction - could be made smarter
    const cleanMessage = message
      .replace(/what.*happening.*with/gi, '')
      .replace(/how.*doing/gi, '')
      .replace(/price.*of/gi, '')
      .replace(/latest.*on/gi, '')
      .trim();
    
    return cleanMessage.substring(0, 100); // Limit query length
  }

  // Search the web using Brave Search API (with Google fallback)
  async searchWeb(query, userId = 'anonymous', platform = 'telegram') {
    if (!this.enabled || (!this.braveApiKey && !this.googleApiKey)) {
      return null;
    }

    try {
      // 🛡️ SECURITY: Validate query
      const validation = apiProtection.validateQuery('web_search', query);
      if (!validation.valid) {
        apiProtection.logSuspiciousActivity(userId, platform, validation.reason, query);
        return null;
      }

      // 🛡️ RATE LIMITING: Check user limits
      const userLimit = await apiProtection.checkRateLimit(userId, platform, 'web_search');
      if (!userLimit.allowed) {
        console.log(`🚫 User ${userId} hit web search rate limit: ${userLimit.current}/${userLimit.limit}`);
        return null;
      }

      // 🛡️ GLOBAL LIMITS: Check daily limits
      const globalLimit = apiProtection.checkGlobalLimits('web_search');
      if (!globalLimit.allowed) {
        console.log(`🚫 Global web search limit reached: ${globalLimit.current}/${globalLimit.limit}`);
        return null;
      }

      // 🛡️ CACHE: Check for existing results
      const cached = await apiProtection.getFromCache('web_search', query);
      if (cached.hit) {
        console.log(`📦 Cache hit for web search: ${query} (${Math.round(cached.age/1000)}s old)`);
        return cached.data;
      }

      // 🛡️ INCREMENT: Count this API call
      await apiProtection.incrementRateLimit(userId, platform, 'web_search');

      console.log(`🔍 Web search API call: "${query}" by ${platform}:${userId}`);
      
      // Try Brave Search first (primary)
      let results = null;
      if (this.braveApiKey) {
        try {
          console.log('🦁 Trying Brave Search (primary)...');
          const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
            headers: {
              'X-Subscription-Token': this.braveApiKey,
              'Accept': 'application/json'
            },
            params: {
              q: query,
              count: 3,
              safesearch: 'moderate',
              freshness: 'pd' // Past day for recent results
            },
            timeout: 5000 // 5 second timeout
          });

          results = this.formatSearchResults(response.data.web?.results || [], 'brave');
        } catch (braveError) {
          console.warn('⚠️ Brave Search failed:', braveError.message);
        }
      }

      // Fallback to Google Custom Search if Brave failed or no results
      if ((!results || results.results.length === 0) && this.googleApiKey && this.googleSearchEngineId) {
        try {
          console.log('🔍 Falling back to Google Custom Search...');
          const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: this.googleApiKey,
              cx: this.googleSearchEngineId,
              q: query,
              num: 3,
              safe: 'medium',
              dateRestrict: 'd1' // Past day for recent results
            },
            timeout: 5000
          });

          results = this.formatSearchResults(response.data.items || [], 'google');
        } catch (googleError) {
          console.warn('⚠️ Google Custom Search failed:', googleError.message);
        }
      }

      if (!results) {
        console.log('❌ All search providers failed');
        return null;
      }
      
      // 🛡️ CACHE: Store results
      await apiProtection.setCache('web_search', query, results);
      
      return results;
    } catch (error) {
      console.error('Web search error:', error.message);
      return null;
    }
  }

  // Format search results for Claude context (handles both Brave and Google formats)
  formatSearchResults(results, provider = 'unknown') {
    if (!results || results.length === 0) {
      return { query_time: new Date().toISOString(), results: [], summary: '', provider };
    }

    const formatted = results.slice(0, 3).map(result => {
      // Handle Google Custom Search format
      if (provider === 'google') {
        return {
          title: result.title,
          description: result.snippet || result.description,
          url: result.link
        };
      }
      
      // Handle Brave Search format (default)
      return {
        title: result.title,
        description: result.description,
        url: result.url
      };
    });

    return {
      query_time: new Date().toISOString(),
      results: formatted,
      summary: formatted.map(r => `${r.title}: ${r.description}`).join('\n'),
      provider
    };
  }

  // Get crypto prices (free API)
  async getCryptoPrice(symbol) {
    try {
      const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: {
          ids: symbol.toLowerCase(),
          vs_currencies: 'usd',
          include_24hr_change: true
        },
        timeout: 3000
      });

      return response.data;
    } catch (error) {
      console.error('Crypto price error:', error.message);
      return null;
    }
  }

  // Get weather data (free API with protection)
  async getWeather(city, userId = 'anonymous', platform = 'telegram') {
    if (!process.env.OPENWEATHER_API_KEY) {
      return null;
    }

    try {
      // 🛡️ SECURITY: Validate city name
      const validation = apiProtection.validateQuery('weather', city);
      if (!validation.valid) {
        apiProtection.logSuspiciousActivity(userId, platform, validation.reason, city);
        return null;
      }

      // 🛡️ RATE LIMITING: Check user limits
      const userLimit = await apiProtection.checkRateLimit(userId, platform, 'weather');
      if (!userLimit.allowed) {
        console.log(`🚫 User ${userId} hit weather rate limit: ${userLimit.current}/${userLimit.limit}`);
        return null;
      }

      // 🛡️ GLOBAL LIMITS: Check daily limits
      const globalLimit = apiProtection.checkGlobalLimits('weather');
      if (!globalLimit.allowed) {
        console.log(`🚫 Global weather limit reached: ${globalLimit.current}/${globalLimit.limit}`);
        return null;
      }

      // 🛡️ CACHE: Check for existing results
      const cached = await apiProtection.getFromCache('weather', city);
      if (cached.hit) {
        console.log(`📦 Cache hit for weather: ${city} (${Math.round(cached.age/1000)}s old)`);
        return cached.data;
      }

      // 🛡️ INCREMENT: Count this API call
      await apiProtection.incrementRateLimit(userId, platform, 'weather');

      console.log(`🌤️ Weather API call: "${city}" by ${platform}:${userId}`);
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: city,
          appid: process.env.OPENWEATHER_API_KEY,
          units: 'metric'
        },
        timeout: 3000
      });

      const weatherData = {
        city: response.data.name,
        temperature: response.data.main.temp,
        description: response.data.weather[0].description,
        feels_like: response.data.main.feels_like
      };

      // 🛡️ CACHE: Store results
      await apiProtection.setCache('weather', city, weatherData);

      return weatherData;
    } catch (error) {
      console.error('Weather error:', error.message);
      return null;
    }
  }

  // Enhanced message processing with web context
  async enhanceMessage(userMessage, userId = 'anonymous', platform = 'telegram') {
    if (!this.needsWebSearch(userMessage)) {
      return null;
    }

    const searchQuery = this.extractSearchQuery(userMessage);
    const webResults = await this.searchWeb(searchQuery, userId, platform);

    // Check for specific data types - SMART CROSS-REFERENCING
    let cryptoData = null;
    let weatherData = null;
    let multiApiContext = [];

    // Always get crypto data if crypto-related OR if asking about general markets/trends
    if (/bitcoin|btc|crypto|ethereum|eth|market|price|stock|trading|investment/gi.test(userMessage)) {
      cryptoData = await this.getCryptoPrice('bitcoin');
      if (cryptoData) {
        multiApiContext.push('crypto');
      }
    }

    // Get weather data if weather-related OR if asking about general current conditions
    if (/weather|temperature|climate|forecast|raining|sunny|cold|hot|degrees/gi.test(userMessage)) {
      // Extract city from message or use default
      const cityMatch = userMessage.match(/(?:weather|temperature|climate).*in\s+(\w+)/i);
      const city = cityMatch ? cityMatch[1] : 'new york';
      weatherData = await this.getWeather(city, userId, platform);
      if (weatherData) {
        multiApiContext.push('weather');
      }
    }

    // Cross-reference opportunity detected
    const crossReference = multiApiContext.length > 1 ? multiApiContext.join('+') : null;

    return {
      webResults,
      cryptoData,
      weatherData,
      crossReference,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new WebSearchIntegration();