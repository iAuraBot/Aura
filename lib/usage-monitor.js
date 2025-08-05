// API Usage Monitoring and Alerting System
const apiProtection = require('./api-protection');

class UsageMonitor {
  constructor() {
    this.alertThresholds = {
      web_search: { warning: 70, critical: 90 }, // % of daily limit
      weather: { warning: 60, critical: 80 },
      user_abuse: 3 // Number of blocked requests before flagging user
    };
    
    this.blockedUsers = new Map(); // Track users with suspicious activity
  }

  // Get comprehensive usage statistics
  getDetailedStats() {
    const stats = apiProtection.getUsageStats();
    const analysis = this.analyzeUsage(stats);
    
    return {
      ...stats,
      analysis,
      alerts: this.generateAlerts(stats),
      efficiency: this.calculateEfficiency(),
      topUsers: this.getTopUsers()
    };
  }

  // Analyze usage patterns
  analyzeUsage(stats) {
    const analysis = {
      costSavingsFromCache: 0,
      requestsBlocked: 0,
      efficiencyScore: 0
    };

    // Calculate cache efficiency
    const totalRequests = stats.daily.web_search + stats.daily.weather;
    const cacheHitRate = stats.cacheSize > 0 ? (stats.cacheSize / totalRequests) * 100 : 0;
    
    analysis.cacheHitRate = Math.round(cacheHitRate);
    analysis.costSavingsFromCache = Math.round(totalRequests * 0.3); // Estimate 30% cache hit rate savings
    
    return analysis;
  }

  // Generate alerts for high usage
  generateAlerts(stats) {
    const alerts = [];
    
    // Check web search usage
    const webSearchPercent = (stats.daily.web_search / stats.limits.web_search) * 100;
    if (webSearchPercent >= this.alertThresholds.web_search.critical) {
      alerts.push({
        level: 'CRITICAL',
        type: 'web_search',
        message: `Web search usage at ${Math.round(webSearchPercent)}% of daily limit`,
        action: 'Consider upgrading API plan or implementing stricter limits'
      });
    } else if (webSearchPercent >= this.alertThresholds.web_search.warning) {
      alerts.push({
        level: 'WARNING',
        type: 'web_search',
        message: `Web search usage at ${Math.round(webSearchPercent)}% of daily limit`,
        action: 'Monitor usage closely'
      });
    }

    // Check weather usage
    const weatherPercent = (stats.daily.weather / stats.limits.weather) * 100;
    if (weatherPercent >= this.alertThresholds.weather.critical) {
      alerts.push({
        level: 'CRITICAL',
        type: 'weather',
        message: `Weather API usage at ${Math.round(weatherPercent)}% of daily limit`,
        action: 'Weather requests will be blocked soon'
      });
    }

    return alerts;
  }

  // Calculate overall efficiency metrics
  calculateEfficiency() {
    const stats = apiProtection.getUsageStats();
    const totalRequests = stats.daily.web_search + stats.daily.weather + stats.daily.crypto;
    
    return {
      totalRequestsToday: totalRequests,
      cacheSize: stats.cacheSize,
      rateLimitEntriesActive: stats.rateLimitEntries,
      estimatedCostSavings: `$${(totalRequests * 0.001).toFixed(3)}` // Rough estimate
    };
  }

  // Track top users (for abuse detection)
  getTopUsers() {
    // This would be more sophisticated with persistent storage
    return {
      note: "User tracking would require database integration",
      blockedUsersCount: this.blockedUsers.size
    };
  }

  // Log security incident
  logSecurityIncident(userId, platform, type, details) {
    const timestamp = new Date().toISOString();
    const incident = {
      timestamp,
      userId: `${platform}:${userId}`,
      type,
      details,
      severity: this.calculateSeverity(type, details)
    };

    console.log(`🚨 SECURITY INCIDENT: ${JSON.stringify(incident, null, 2)}`);
    
    // Track repeat offenders
    const userKey = `${platform}:${userId}`;
    const userIncidents = this.blockedUsers.get(userKey) || 0;
    this.blockedUsers.set(userKey, userIncidents + 1);

    // Auto-block after multiple incidents
    if (userIncidents >= this.alertThresholds.user_abuse) {
      console.log(`🔒 AUTO-BLOCKING USER: ${userKey} (${userIncidents + 1} incidents)`);
      return { blocked: true, reason: 'Multiple security violations' };
    }

    return { blocked: false, incidents: userIncidents + 1 };
  }

  // Calculate incident severity
  calculateSeverity(type, details) {
    const severityMap = {
      'blocked_query': 'MEDIUM',
      'rate_limit_exceeded': 'LOW',
      'injection_attempt': 'HIGH',
      'api_key_extraction': 'CRITICAL'
    };

    return severityMap[type] || 'MEDIUM';
  }

  // Generate usage report
  generateReport() {
    const stats = this.getDetailedStats();
    const report = `
🛡️ AURABOT API PROTECTION REPORT
Generated: ${new Date().toISOString()}

📊 DAILY USAGE:
   Web Search: ${stats.daily.web_search}/${stats.limits.web_search} (${Math.round((stats.daily.web_search/stats.limits.web_search)*100)}%)
   Weather: ${stats.daily.weather}/${stats.limits.weather} (${Math.round((stats.daily.weather/stats.limits.weather)*100)}%)
   Crypto: ${stats.daily.crypto} (unlimited)

📦 CACHE EFFICIENCY:
   Cache Size: ${stats.cacheSize} entries
   Hit Rate: ~${stats.analysis.cacheHitRate}%
   Estimated Savings: ${stats.efficiency.estimatedCostSavings}

🚨 ALERTS: ${stats.alerts.length > 0 ? stats.alerts.map(a => `${a.level}: ${a.message}`).join(', ') : 'None'}

🔒 SECURITY:
   Blocked Users: ${stats.topUsers.blockedUsersCount}
   Rate Limit Entries: ${stats.efficiency.rateLimitEntriesActive}

💡 RECOMMENDATIONS:
${this.generateRecommendations(stats).join('\n')}
`;

    return report;
  }

  // Generate optimization recommendations
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.analysis.cacheHitRate < 20) {
      recommendations.push('   • Consider increasing cache duration for better efficiency');
    }
    
    if (stats.daily.web_search > stats.limits.web_search * 0.8) {
      recommendations.push('   • Web search usage high - consider upgrading Brave Search plan');
    }
    
    if (stats.cacheSize > 100) {
      recommendations.push('   • Large cache size detected - implement periodic cleanup');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('   • System operating efficiently - no issues detected');
    }
    
    return recommendations;
  }

  // Cleanup old data
  cleanup() {
    // Clear old blocked user entries (older than 24 hours)
    // This would be more sophisticated with timestamps
    if (this.blockedUsers.size > 50) {
      this.blockedUsers.clear();
      console.log('🧹 Cleaned up old blocked user entries');
    }
  }
}

// Create singleton instance
const usageMonitor = new UsageMonitor();

// Auto-cleanup every hour
setInterval(() => {
  usageMonitor.cleanup();
}, 3600000);

module.exports = usageMonitor;