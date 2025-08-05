// User cooldown system to prevent spam across platforms
class UserCooldowns {
  constructor() {
    // Store cooldowns: { platform_userId: lastUsedTimestamp }
    this.cooldowns = new Map();
    
    // Cooldown settings (in milliseconds)
    this.COOLDOWN_SETTINGS = {
      telegram: 3000,    // 3 seconds for Telegram
      twitch: 15000,     // 15 seconds for Twitch  
      kick: 15000,       // 15 seconds for Kick
      default: 10000     // 10 seconds default
    };
    
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Check if user is on cooldown
  isOnCooldown(userId, platform = 'default') {
    const key = `${platform}_${userId}`;
    const lastUsed = this.cooldowns.get(key);
    
    if (!lastUsed) {
      return false; // Never used before
    }
    
    const cooldownDuration = this.COOLDOWN_SETTINGS[platform] || this.COOLDOWN_SETTINGS.default;
    const timeSinceLastUse = Date.now() - lastUsed;
    
    return timeSinceLastUse < cooldownDuration;
  }

  // Get remaining cooldown time in seconds
  getRemainingCooldown(userId, platform = 'default') {
    const key = `${platform}_${userId}`;
    const lastUsed = this.cooldowns.get(key);
    
    if (!lastUsed) {
      return 0;
    }
    
    const cooldownDuration = this.COOLDOWN_SETTINGS[platform] || this.COOLDOWN_SETTINGS.default;
    const timeSinceLastUse = Date.now() - lastUsed;
    const remaining = Math.max(0, cooldownDuration - timeSinceLastUse);
    
    return Math.ceil(remaining / 1000); // Return in seconds
  }

  // Set user cooldown (call this after processing a request)
  setCooldown(userId, platform = 'default') {
    const key = `${platform}_${userId}`;
    this.cooldowns.set(key, Date.now());
  }

  // Clean up entries older than 1 hour
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const toDelete = [];
    
    for (const [key, timestamp] of this.cooldowns.entries()) {
      if (timestamp < oneHourAgo) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cooldowns.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} old cooldown entries`);
    }
  }

  // Get current cooldown settings
  getCooldownSettings() {
    return { ...this.COOLDOWN_SETTINGS };
  }

  // Update cooldown for a platform
  setCooldownDuration(platform, milliseconds) {
    this.COOLDOWN_SETTINGS[platform] = milliseconds;
    console.log(`⏰ Updated ${platform} cooldown to ${milliseconds / 1000}s`);
  }

  // Get status for debugging
  getStatus() {
    return {
      activeCooldowns: this.cooldowns.size,
      settings: this.COOLDOWN_SETTINGS,
      platforms: Object.keys(this.COOLDOWN_SETTINGS)
    };
  }

  // Destroy the cleanup interval
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = new UserCooldowns();