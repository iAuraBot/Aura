# 🚨 Deployment Troubleshooting Guide

## Common Railway Deployment Issues

### 1. Telegram Bot Conflict (409 Error)
**Error:** `409: Conflict: terminated by other getUpdates request`

**Cause:** Multiple bot instances running simultaneously

**Solutions:**
```bash
# Stop local development bot
pkill -f "node index.js"

# Or use Ctrl+C in terminal where bot is running
```

**Prevention:**
- Always stop local bot before deploying to Railway
- Use different bot tokens for development vs production

---

### 2. Claude API Overloaded (529 Errors)
**Error:** `Error in getBrainrotReply: 529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`

**Cause:** Anthropic's Claude API servers experiencing high load

**Auto-Handling:** ✅ Bot now includes:
- **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Graceful Fallback**: "servers are absolutely cooked rn 🔥💀 try again in a sec fam"
- **Smart Detection**: Recognizes 529 errors and overload messages

**Manual Solutions:**
- Wait 5-10 minutes for Anthropic servers to recover
- Check Anthropic status page: https://status.anthropic.com
- No action needed - bot handles this automatically now

---

### 3. Twitter Rate Limiting
**Message:** `⏰ Twitter API rate limit reached. Waiting for next poll cycle...`

**Status:** ✅ Normal behavior - not an error

**Info:**
- Twitter limits API calls per 15-minute window
- Bot automatically waits and retries
- No action needed

---

### 4. Environment Variables Missing
**Check Railway has these variables set:**

**Required:**
- `TELEGRAM_BOT_TOKEN`
- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**Internet Enhancement (Optional):**
- `BRAVE_SEARCH_API_KEY`
- `OPENWEATHER_API_KEY`
- `GOOGLE_CUSTOM_SEARCH_API_KEY`
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`

**Other Platforms (Optional):**
- `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` + `TWITCH_BOT_TOKEN`
- `KICK_USERNAME` + `KICK_PASSWORD`

---

### 5. Google Custom Search Setup
**To get Search Engine ID:**
1. Go to: https://cse.google.com/cse/
2. Create new search engine
3. Set to search "Entire web"
4. Copy the Search Engine ID
5. Add to Railway as `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`

---

## Health Check Commands

### Check Bot Status
```bash
# Railway logs
railway logs

# Check specific errors
railway logs | grep -i error
```

### Verify Environment Variables
```bash
# List all variables
railway variables

# Check specific ones
railway variables | grep -E "(TELEGRAM|ANTHROPIC|SUPABASE)"
```

### Restart Deployment
```bash
# Force restart
railway redeploy
```

---

## Success Indicators

### ✅ Healthy Startup Logs:
```
🌐 Web search integration enabled!
✅ Brave Search API ready (primary)
✅ Google Custom Search API ready (fallback)
✅ OpenWeather API ready
✅ Supabase client connection healthy
🛡️ AURA FARMING BOT SECURITY STATUS:
✅ Persona lock engaged
✅ Rate limiting active
🐕 Ready to farm aura securely! 💀🔒
```

### ✅ Healthy Operation:
```
📊 Rate limit usage: 1/50
🛡️ Secure reply sent: *ears perk up*
✅ Set family-friendly mode OFF for telegram channel
🦁 Trying Brave Search (primary)...
🔍 Web search API call: "bitcoin price" by telegram:user123
```

---

## Error Recovery Strategies

### Automatic Recovery (Built-in):
- **529 Overload**: 3 retries with exponential backoff
- **Rate Limits**: Graceful fallback messages
- **Search Failures**: Brave → Google fallback
- **API Errors**: Contextual error messages

### Manual Recovery:
1. **Check Railway logs** for specific error
2. **Verify environment variables** are set
3. **Restart deployment** if needed
4. **Check external API status** (Anthropic, Twitter, etc.)

---

## Contact & Support
- **GitHub Issues**: For code-related problems
- **Railway Support**: For deployment issues
- **API Status Pages**: For external service outages
  - Anthropic: https://status.anthropic.com
  - Twitter: https://api.twitterstat.us