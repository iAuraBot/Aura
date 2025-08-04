# 🐦 Twitter Integration Guide

## ✅ **Twitter Integration Complete!**

Twitter mention reply functionality has been successfully integrated into your AuraFarmBot with Claude Haiku, smart throttling, and memory management.

---

## 🔧 **What Was Added**

### **New Files:**
- `lib/twitter.js` - Complete Twitter integration with polling, throttling, and memory
- `supabase_twitter_migration.sql` - Database schema for Twitter state and memory
- `TWITTER_INTEGRATION_GUIDE.md` - This guide

### **Modified Files:**
- `package.json` - Added `twitter-api-v2` dependency
- `index.js` - Integrated Twitter polling with graceful startup/shutdown

---

## 🗂️ **New Dependencies Added**

```json
{
  "twitter-api-v2": "^1.17.2"
}
```

---

## ⚙️ **Required Environment Variables**

Add these to your Railway environment variables:

### **Required:**
```env
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
```

### **Optional (with defaults):**
```env
TWITTER_DAILY_CAP=50                 # Max replies per day
TWITTER_REPLY_CHANCE=0.4             # 40% reply probability
USE_SHARED_MEMORY=false              # Use separate Twitter memory table
TWITTER_BOT_USERNAME=aurafarmbot     # For cleaning @mentions
```

---

## 🗄️ **Database Setup**

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Copy and paste the contents of supabase_twitter_migration.sql
-- This creates bot_state and twitter_memory tables
```

---

## 🤖 **How Twitter Integration Works**

### **Polling & Mentions:**
- **Polls every 3 minutes** for new @mentions
- **Persistent state** - remembers last processed mention ID
- **No duplicate replies** after restarts/deploys

### **Smart Throttling:**
1. **Daily Cap**: Max 50 replies/day (Free API = 1,500 posts/month)
2. **Random Chance**: 40% probability per mention (reduces spam)
3. **User Cooldown**: 10 minutes between replies to same user
4. **Automatic Reset**: Daily count resets at midnight UTC

### **Claude Integration:**
- **Same brainrot personality** as Telegram/Twitch
- **Conversation memory** - remembers last 5 interactions per user
- **Tweet cleaning** - removes @mentions and URLs before Claude
- **Short responses** - Optimized for Twitter's character limits

---

## 🔍 **Memory Management**

### **Two Options:**

#### **Option 1: Separate Twitter Memory (Default)**
```env
USE_SHARED_MEMORY=false
```
- Uses `twitter_memory` table
- Twitter conversations separate from Telegram/Twitch
- Better isolation and debugging

#### **Option 2: Shared Memory**
```env
USE_SHARED_MEMORY=true
```
- Uses existing `conversation_history` table
- All platforms share conversation context
- More unified experience across platforms

---

## 📊 **Rate Limiting & Free Tier**

### **Twitter Free API Limits:**
- **1,500 posts/month** total
- **50 posts/day** average (our default cap)
- **10,000 reads/month** for mentions

### **Our Throttling Strategy:**
- **50 replies/day max** (stays well under monthly limit)
- **40% reply chance** (only replies to 40% of mentions)
- **Smart filtering** (skips very short tweets, URLs only, etc.)

**Result**: ~600-750 replies/month (well within 1,500 limit) 📈

---

## 🚀 **Deployment Steps**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Get Twitter API Credentials**
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new App (or use existing)
3. Generate API Keys & Access Tokens
4. Copy the 4 required credentials

### **3. Set Environment Variables in Railway**
Go to Railway dashboard → Your project → Variables:
```env
TWITTER_API_KEY=your_key_here
TWITTER_API_SECRET=your_secret_here
TWITTER_ACCESS_TOKEN=your_token_here
TWITTER_ACCESS_SECRET=your_token_secret_here
```

### **4. Run Database Migration**
In Supabase SQL Editor:
```sql
-- Paste contents of supabase_twitter_migration.sql
```

### **5. Deploy to Railway**
```bash
git add .
git commit -m "Add Twitter integration with Claude and smart throttling"
git push origin master
```

Railway will auto-deploy the changes.

---

## 📋 **Startup Logs**

When the bot starts, you'll see:

```
🤖 Service Status Summary:
   Redis: ✅ Connected to Redis
   Sentry: ✅ Sentry initialized  
   Claude: ✅ Claude AI ready
   Twitter: ✅ Twitter integration ready

🐦 Twitter mention polling active (every 3 minutes)
🚀💀 MULTI-PLATFORM AURAFARMBOT IS RUNNING! 💀🚀

📱 TELEGRAM PLATFORM ACTIVE!
🎮 TWITCH PLATFORM: ACTIVE! 🔥
🐦 TWITTER PLATFORM: ACTIVE! 🔥

🐦 TWITTER FEATURES:
  🤖 @mention bot for Claude conversations
  🎲 40% reply chance with smart throttling
  📊 Max 50 replies/day on Free API tier
```

---

## 🎯 **Testing Twitter Integration**

### **1. Tweet @mentions:**
```
@yourbotname hey what's up?
@yourbotname tell me something wild
@yourbotname thoughts on the aura meta?
```

### **2. Check Logs:**
```
🐦 Polling Twitter mentions...
📬 Found 3 new Twitter mentions
🔍 Processing mention from @username: "hey what's up?"
🤖 Generating Claude reply for @username...
✅ Replied to @username: "yooo what's good fam! 🔥"
🎯 Twitter polling complete: 3 processed, 1 replied, 49 remaining today
```

---

## 🔧 **Customization**

### **Adjust Reply Rate:**
```env
TWITTER_REPLY_CHANCE=0.6  # 60% chance instead of 40%
```

### **Increase Daily Cap:**
```env
TWITTER_DAILY_CAP=75      # 75 replies/day instead of 50
```

### **Use Shared Memory:**
```env
USE_SHARED_MEMORY=true    # Share context across all platforms
```

### **Modify Polling Interval:**
In `lib/twitter.js`, change:
```javascript
const pollInterval = setInterval(pollMentionsAndReply, 5 * 60 * 1000); // 5 minutes
```

---

## ⚡ **Performance & Monitoring**

### **Logs to Watch:**
- `✅ Twitter integration initialized` - Startup success
- `🐦 Twitter mention polling active` - Polling started
- `🎯 Twitter polling complete: X processed, Y replied, Z remaining` - Activity summary
- `⏰ Daily Twitter reply cap reached` - Hit daily limit
- `⏱️ User @username on cooldown` - User throttled

### **Error Scenarios:**
- **API rate limits**: Automatically skips until next polling cycle
- **Invalid credentials**: Twitter integration disabled
- **Network errors**: Logged and skipped, retries next cycle
- **Claude errors**: Falls back to simple error message

---

## 📊 **Database Tables**

### **bot_state table:**
- Tracks `last_mention_id` (prevents duplicate processing)
- Tracks `daily_reply_count` and `daily_reset_date`
- Persists across deploys and restarts

### **twitter_memory table** (if USE_SHARED_MEMORY=false):
- Stores Twitter conversation history
- Separate from Telegram/Twitch conversations
- Includes tweet_id for reference

---

## 🎉 **Features Summary**

✅ **Twitter API Integration** - Full mention monitoring and replies  
✅ **Smart Throttling** - Daily caps, random chance, user cooldowns  
✅ **Claude Conversations** - Same brainrot personality as other platforms  
✅ **Memory Management** - Context-aware replies with conversation history  
✅ **Free Tier Optimized** - Stays well within API limits  
✅ **Production Ready** - Error handling, logging, graceful shutdown  
✅ **Non-Destructive** - Doesn't affect existing Telegram/Twitch functionality  

---

## 🎯 **Ready to Tweet!**

Your AuraFarmBot now has chaotic Twitter presence! 🐦🤖

**Tweet @mentions at your bot and watch the brainrot conversations begin!** 💀🔥

### **Expected Behavior:**
- **40% of mentions** get Claude replies
- **Max 50 replies/day** (stays within Free API limits)
- **Smart cooldowns** prevent spam
- **Conversation memory** makes replies contextual
- **Same chaotic energy** as Telegram/Twitch

**Happy tweeting!** 🚀