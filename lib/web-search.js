const axios = require('axios');
const apiProtection = require('./api-protection');

// Web search integration for enhanced Claude responses
class WebSearchIntegration {
  constructor() {
    this.braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    // Enable web search if we have API keys, regardless of ENABLE_WEB_SEARCH setting
    this.enabled = !!(this.braveApiKey || process.env.OPENWEATHER_API_KEY);
  }

  // Detect if message needs web search
  needsWebSearch(message) {
    const searchTriggers = [
      // GENERAL CURRENT EVENTS
      /what.*happening/gi,
      /current.*news/gi,
      /trending/gi,
      /latest/gi,
      /today.*news/gi,
      /breaking.*news/gi,
      /recent.*update/gi,
      /any.*news/gi,
      
      // FINANCIAL/MARKET DATA  
      /.*price.*today/gi,
      /.*price.*now/gi,
      /bitcoin.*price/gi,
      /crypto.*price/gi,
      /stock.*price/gi,
      /how.*doing/gi, // "how's X doing"
      /what.*cost/gi,
      /worth.*now/gi,
      /btc.*price/gi,
      /ethereum.*price/gi,
      /crypto.*news/gi,
      /market.*update/gi,
      /stock.*market/gi,
      
      // WEATHER
      /weather.*in/gi,
      /how.*weather/gi,
      /temperature.*in/gi,
      /forecast.*for/gi,
      /climate.*in/gi,
      
      // TECHNOLOGY & GAMING
      /new.*iphone/gi,
      /apple.*release/gi,
      /google.*update/gi,
      /tesla.*news/gi,
      /ai.*news/gi,
      /gaming.*news/gi,
      /new.*game/gi,
      /console.*release/gi,
      
      // ENTERTAINMENT & SOCIAL
      /movie.*review/gi,
      /new.*movie/gi,
      /netflix.*show/gi,
      /youtube.*trend/gi,
      /tiktok.*viral/gi,
      /instagram.*update/gi,
      /twitter.*drama/gi,
      /celebrity.*news/gi,
      
      // SPORTS
      /sports.*score/gi,
      /game.*result/gi,
      /football.*score/gi,
      /basketball.*score/gi,
      /soccer.*score/gi,
      /who.*won/gi,
      /championship.*result/gi,
      
      // GENERAL KNOWLEDGE WITH CURRENT INFO
      /when.*release/gi,
      /who.*won.*today/gi,
      /what.*happened.*today/gi,
      /update.*on/gi,
      /status.*of/gi,
      /current.*situation/gi
    ];
    
    return searchTriggers.some(pattern => pattern.test(message));
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

  // Search the web using Brave Search API (with protection)
  async searchWeb(query, userId = 'anonymous', platform = 'telegram') {
    if (!this.enabled || !this.braveApiKey) {
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

      const results = this.formatSearchResults(response.data.web?.results || []);
      
      // 🛡️ CACHE: Store results
      await apiProtection.setCache('web_search', query, results);
      
      return results;
    } catch (error) {
      console.error('Web search error:', error.message);
      return null;
    }
  }

  // Format search results for Claude context
  formatSearchResults(results) {
    if (!results || results.length === 0) {
      return null;
    }

    const formatted = results.slice(0, 3).map(result => ({
      title: result.title,
      description: result.description,
      url: result.url
    }));

    return {
      query_time: new Date().toISOString(),
      results: formatted,
      summary: formatted.map(r => `${r.title}: ${r.description}`).join('\n')
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