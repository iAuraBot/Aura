# 🤖 Claude AI Integration Guide

## ✅ **Integration Complete!**

Claude Haiku has been successfully integrated into your AuraFarmBot with memory, Redis fallback, and Sentry error handling.

---

## 🔧 **What Was Added**

### **New Files:**
- `lib/claude.js` - Main Claude integration with memory & error handling
- `supabase_claude_migration.sql` - Database schema for conversation history
- `CLAUDE_INTEGRATION_GUIDE.md` - This guide

### **Modified Files:**
- `package.json` - Added Claude, Redis, and Sentry dependencies
- `index.js` - Added Telegram `/chat` command and message handlers
- `twitchBot.js` - Added Twitch `!chat` command and mention handlers  
- `oauth.js` - Added Sentry middleware to Express server

---

## 🗂️ **New Dependencies Added**

```json
{
  "@anthropic-ai/sdk": "^0.24.3",
  "@sentry/node": "^8.0.0", 
  "ioredis": "^5.4.1"
}
```

---

## ⚙️ **Required Environment Variables**

Add these to your Railway environment variables:

### **Required:**
```env
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### **Optional (but recommended):**
```env
REDIS_URL=your_redis_connection_string  # For faster memory
SENTRY_DSN=your_sentry_dsn_here        # For error monitoring
```

---

## 🗄️ **Database Setup**

**Run this SQL in your Supabase SQL Editor:**

```sql
-- Copy and paste the contents of supabase_claude_migration.sql
-- This creates the conversation_history table
```

---

## 🎮 **New Bot Commands**

### **Telegram:**
- `/chat [message]` - Talk to Claude AI directly
- Bot responds when mentioned in groups or in DMs
- Example: `/chat what do you think about aura farming?`

### **Twitch:**
- `!chat [message]` - Talk to Claude AI directly  
- Bot responds when mentioned in chat
- Example: `!chat what do you think about aura farming?`

---

## 🧠 **How Memory Works**

### **Two-Layer Memory System:**

1. **Redis (Fast, 1-hour TTL)** - If `REDIS_URL` is set
   - Stores last 5 messages per user
   - 1 hour expiration for active conversations
   - Used for immediate context

2. **Supabase (Persistent)** - Always active
   - Stores full conversation history
   - Used when Redis unavailable
   - Backup and long-term storage

### **Conversation Context:**
- Claude receives last 3-5 messages for context
- Conversations are platform-specific (Telegram vs Twitch)
- Each user has separate conversation threads

---

## 🛡️ **Error Handling**

### **Sentry Integration:**
- Automatic error monitoring if `SENTRY_DSN` is set
- Express middleware captures web errors
- Claude errors logged with context

### **Graceful Fallbacks:**
- **No Redis**: Falls back to Supabase memory
- **No Sentry**: Falls back to console logging  
- **Claude API errors**: Returns funny fallback messages
- **Rate limits**: User-friendly error messages

---

## 🚀 **Deployment Steps**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Set Environment Variables in Railway**
Go to Railway dashboard → Your project → Variables:
```env
ANTHROPIC_API_KEY=your_key_here
REDIS_URL=your_redis_url      # Optional
SENTRY_DSN=your_sentry_dsn    # Optional  
```

### **3. Run Database Migration**
In Supabase SQL Editor:
```sql
-- Paste contents of supabase_claude_migration.sql
```

### **4. Deploy to Railway**
```bash
git add .
git commit -m "Add Claude AI integration with memory and error handling"
git push origin master
```

Railway will auto-deploy the changes.

---

## 📋 **Startup Logs**

When the bot starts, you'll see:

```
✅ Supabase client connection healthy
✅ Database connection healthy!
🤖 Claude AI Service Status:
   Redis: ✅ Connected to Redis
   Sentry: ✅ Sentry initialized  
   Claude: ✅ Claude AI ready
```

Or with fallbacks:
```
🤖 Claude AI Service Status:
   Redis: ⚠️ Using Supabase memory only
   Sentry: ⚠️ Sentry disabled
   Claude: ✅ Claude AI ready
```

---

## 🎯 **Testing Commands**

### **Telegram:**
```
/chat hello there!
/chat what do you think about sigma grindset?
@yourbotname what's up?
```

### **Twitch:**
```
!chat hello there!
!chat what do you think about sigma grindset?  
@yourbotname what's up?
```

---

## 🔧 **Customization**

### **Edit System Prompt:**
In `lib/claude.js`, modify:
```javascript
const BRAINROT_SYSTEM_PROMPT = `Your custom prompt here...`;
```

### **Trigger Conditions:**
In `lib/claude.js`, modify `shouldTriggerClaude()` function.

### **Response Length:**
In `lib/claude.js`, adjust `max_tokens` in Claude API call.

---

## ⚡ **Performance Notes**

- **Redis**: ~1ms memory access vs ~50ms Supabase
- **Claude API**: ~500-1000ms response time
- **Memory**: 5 messages per user = ~1KB Redis storage
- **Rate Limits**: Claude Haiku = 25,000 tokens/hour

---

## 🔍 **Monitoring**

### **Logs to Watch:**
- `✅ Connected to Redis` / `⚠️ Redis connection closed`
- `✅ Sentry initialized` / `⚠️ Sentry disabled`
- `Error in getBrainrotReply:` - Claude API issues

### **Error Scenarios:**
- **Rate limits**: Returns "yo claude is getting ratio'd rn"
- **API quota**: Returns "ran out of brain cells"  
- **Invalid request**: Returns "that message broke my brain fr"
- **General error**: Returns "bro u just crashed me 😭"

---

## 🌟 **Features Summary**

✅ **Claude Haiku Integration** - Fast, cost-effective AI responses  
✅ **Memory Management** - Redis + Supabase dual-layer system  
✅ **Error Handling** - Sentry monitoring + graceful fallbacks  
✅ **Multi-Platform** - Works on both Telegram and Twitch  
✅ **Non-Destructive** - Doesn't break existing aura commands  
✅ **Production Ready** - Async/await, rate limiting, monitoring  

---

## 🎉 **Ready to Deploy!**

Your AuraFarmBot now has chaotic zoomer AI personality powered by Claude! 🤖🔥

Push to Railway and watch the brainrot conversations begin! 💀