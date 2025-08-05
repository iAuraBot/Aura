// API Protection System - Rate limiting, caching, and security
const Redis = require('ioredis');

class APIProtection {
  constructor() {
    // Rate limiting storage (in-memory fallback if no Redis)
    this.rateLimitStore = new Map();
    this.cacheStore = new Map();
    
    // Rate limits (per user per hour)
    this.LIMITS = {
      web_search: 5,        // 5 web searches per user per hour
      crypto_price: 10,     // 10 crypto calls per user per hour  
      weather: 3,           // 3 weather calls per user per hour
      total_api: 15         // 15 total API calls per user per hour
    };
    
    // Global daily limits (for entire bot)
    this.GLOBAL_LIMITS = {
      web_search: 500,      // 500 searches per day total (scalable for viral growth)
      weather: 300,         // 300 weather calls per day total (generous for popular bot)
    };
    
    // Cache durations (in seconds)
    this.CACHE_DURATION = {
      crypto_price: 300,    // 5 minutes for crypto prices
      weather: 1800,        // 30 minutes for weather
      web_search: 3600      // 1 hour for web search results
    };
    
    // Daily usage tracking
    this.dailyUsage = {
      web_search: 0,
      weather: 0,
      crypto: 0,
      lastReset: new Date().toDateString()
    };
    
    // Load saved usage if exists
    this.loadDailyUsage();
  }

  // Generate rate limit key
  getRateLimitKey(userId, platform, apiType) {
    const hour = new Date().getHours();
    const date = new Date().toDateString();
    return `rate_limit:${platform}:${userId}:${apiType}:${date}:${hour}`;
  }

  // Generate cache key
  getCacheKey(apiType, query) {
    // Remove user-specific data and normalize query
    const normalizedQuery = query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    return `cache:${apiType}:${normalizedQuery}`;
  }

  // Check if user has exceeded rate limits
  async checkRateLimit(userId, platform, apiType) {
    const key = this.getRateLimitKey(userId, platform, apiType);
    const current = this.rateLimitStore.get(key) || 0;
    const limit = this.LIMITS[apiType];
    
    if (current >= limit) {
      return { allowed: false, current, limit, resetIn: 3600 - (Date.now() % 3600000) / 1000 };
    }
    
    return { allowed: true, current, limit };
  }

  // Check global daily limits
  checkGlobalLimits(apiType) {
    this.resetDailyUsageIfNeeded();
    
    const globalLimit = this.GLOBAL_LIMITS[apiType];
    if (!globalLimit) return { allowed: true };
    
    const current = this.dailyUsage[apiType] || 0;
    
    if (current >= globalLimit) {
      return { allowed: false, current, limit: globalLimit, message: 'Daily global limit reached' };
    }
    
    return { allowed: true, current, limit: globalLimit };
  }

  // Increment rate limit counter
  async incrementRateLimit(userId, platform, apiType) {
    const key = this.getRateLimitKey(userId, platform, apiType);
    const current = this.rateLimitStore.get(key) || 0;
    this.rateLimitStore.set(key, current + 1);
    
    // Increment global usage
    this.dailyUsage[apiType] = (this.dailyUsage[apiType] || 0) + 1;
    this.saveDailyUsage();
    
    // Clean up old rate limit entries
    this.cleanupRateLimitStore();
  }

  // Check cache for existing data
  async getFromCache(apiType, query) {
    const key = this.getCacheKey(apiType, query);
    const cached = this.cacheStore.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return { hit: true, data: cached.data, age: Date.now() - cached.created };
    }
    
    return { hit: false };
  }

  // Store data in cache
  async setCache(apiType, query, data) {
    const key = this.getCacheKey(apiType, query);
    const duration = this.CACHE_DURATION[apiType] * 1000; // Convert to milliseconds
    
    this.cacheStore.set(key, {
      data: data,
      created: Date.now(),
      expiry: Date.now() + duration
    });
    
    // Clean up expired cache entries
    this.cleanupCache();
  }

  // Security: Validate and sanitize queries
  validateQuery(apiType, query) {
    if (!query || typeof query !== 'string') {
      return { valid: false, reason: 'Invalid query format' };
    }

    // Length limits
    if (query.length > 200) {
      return { valid: false, reason: 'Query too long' };
    }

    // Blocked patterns (potential abuse/injection)
    const blockedPatterns = [
      // API key extraction attempts
      /api[_\s]*key/gi,
      /token/gi,
      /secret/gi,
      /password/gi,
      
      // System information extraction
      /\/etc\/passwd/gi,
      /\/proc\//gi,
      /C:\\Windows/gi,
      
      // Common injection patterns
      /<script/gi,
      /javascript:/gi,
      /eval\(/gi,
      /require\(/gi,
      /import\s+/gi,
      
      // Database injection attempts
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      
      // Suspicious file operations
      /\.\.\/\.\.\//gi,
      /\/var\/log/gi,
      /\/home\//gi
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(query)) {
        return { valid: false, reason: 'Query contains blocked content', pattern: pattern.source };
      }
    }

    // API-specific validation
    switch (apiType) {
      case 'web_search':
        // Only allow reasonable search terms
        if (query.length < 3) {
          return { valid: false, reason: 'Search query too short' };
        }
        break;
        
      case 'weather':
        // Only allow city names (basic validation)
        if (!/^[a-zA-Z\s,.-]+$/.test(query)) {
          return { valid: false, reason: 'Invalid city name format' };
        }
        break;
    }

    return { valid: true };
  }

  // Clean up old rate limit entries (keep only current hour)
  cleanupRateLimitStore() {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    const currentHour = new Date().getHours();
    const currentDate = new Date().toDateString();
    
    for (const [key, timestamp] of this.rateLimitStore.entries()) {
      // If key doesn't match current hour, remove it
      if (!key.includes(`${currentDate}:${currentHour}`)) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, data] of this.cacheStore.entries()) {
      if (data.expiry < now) {
        this.cacheStore.delete(key);
      }
    }
  }

  // Reset daily usage if new day
  resetDailyUsageIfNeeded() {
    const today = new Date().toDateString();
    if (this.dailyUsage.lastReset !== today) {
      this.dailyUsage = {
        web_search: 0,
        weather: 0,
        crypto: 0,
        lastReset: today
      };
      this.saveDailyUsage();
    }
  }

  // Save daily usage to file (simple persistence)
  saveDailyUsage() {
    try {
      const fs = require('fs');
      fs.writeFileSync('.api-usage.json', JSON.stringify(this.dailyUsage));
    } catch (error) {
      console.error('Failed to save daily usage:', error.message);
    }
  }

  // Load daily usage from file
  loadDailyUsage() {
    try {
      const fs = require('fs');
      if (fs.existsSync('.api-usage.json')) {
        this.dailyUsage = JSON.parse(fs.readFileSync('.api-usage.json', 'utf8'));
        this.resetDailyUsageIfNeeded(); // Check if we need to reset
      }
    } catch (error) {
      console.log('No existing usage data found, starting fresh');
    }
  }

  // Get usage stats for monitoring
  getUsageStats() {
    this.resetDailyUsageIfNeeded();
    return {
      daily: this.dailyUsage,
      limits: this.GLOBAL_LIMITS,
      cacheSize: this.cacheStore.size,
      rateLimitEntries: this.rateLimitStore.size
    };
  }

  // Security log suspicious activity
  logSuspiciousActivity(userId, platform, reason, query) {
    const timestamp = new Date().toISOString();
    console.warn(`🚨 SUSPICIOUS ACTIVITY: ${timestamp}`);
    console.warn(`   User: ${platform}:${userId}`);
    console.warn(`   Reason: ${reason}`);
    console.warn(`   Query: ${query}`);
    
    // Could be extended to send alerts, write to security log file, etc.
  }
}

// Create singleton instance
const apiProtection = new APIProtection();

module.exports = apiProtection;