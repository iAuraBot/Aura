# 🔧 MULTI-PLATFORM AURAFARMBOT ENVIRONMENT SETUP

## 📋 Required Environment Variables

Create a `.env` file in your project root with these variables:

### 🤖 **TELEGRAM BOT (Required)**
```env
BOT_TOKEN=your_telegram_bot_token_here
```

### 📊 **SUPABASE DATABASE (Required)**
```env
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# RECOMMENDED: Direct PostgreSQL connection for better performance
# Get this from Supabase Dashboard > Settings > Database > Connection pooling
DATABASE_URL=postgresql://postgres.xxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**📈 Performance Tip:** Adding `DATABASE_URL` enables direct PostgreSQL connections with connection pooling, which significantly reduces the database connection issues you may experience with high bot usage. This bypasses Supabase's REST API and connects directly to your database.

### 🎮 **TWITCH BOT (Optional)**

#### **METHOD 1: SECURE OAUTH (RECOMMENDED)**
```env
# Your Twitch application credentials (from dev.twitch.tv)
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_REDIRECT_URI=https://your-railway-domain.up.railway.app/auth/twitch/callback

# These will be set after OAuth authorization:
TWITCH_BOT_USERNAME=your_bot_username
TWITCH_OAUTH_TOKEN=oauth:your_secure_token_here
TWITCH_CHANNELS=your_channel,another_channel
```

#### **METHOD 2: SIMPLE TOKEN (LESS SECURE)**
```env
# Your Twitch bot's username
TWITCH_BOT_USERNAME=your_twitch_bot_username

# OAuth token (from third-party generator - not recommended for production)
TWITCH_OAUTH_TOKEN=oauth:your_twitch_token_here

# Comma-separated list of channels to join (without # symbol)
TWITCH_CHANNELS=your_channel,another_channel
```

### 🌐 **WEB INTERFACE (For Streamer Dashboard)**
```env
# Secret key for web session management (generate a random string)
SESSION_SECRET=your_random_session_secret_here
```

### 🚀 **DEPLOYMENT (Optional)**
```env
NODE_ENV=production
```

---

## 🎮 TWITCH SETUP GUIDE

### Step 1: Create Twitch Bot Account
1. Go to [Twitch](https://twitch.tv) and create a new account for your bot
2. Choose a username like `YourChannelBot` or `AuraFarmBot`

### Step 2: Get OAuth Token
1. Visit [TwitchTokenGenerator.com](https://twitchtokengenerator.com/)
2. Click **"Bot Chat Token"**
3. Login with your **BOT ACCOUNT** (not your main account!)
4. Select these scopes:
   - `chat:read` - Read chat messages
   - `chat:write` - Send chat messages (NOT chat:edit)
5. Copy the token (it starts with `oauth:`)
6. **CRITICAL:** Your token MUST include the `oauth:` prefix!

### Step 3: Configure Channels
1. Add your Twitch channel username to `TWITCH_CHANNELS`
2. You can add multiple channels separated by commas
3. Don't include the `#` symbol - just the channel name
4. **IMPORTANT:** All usernames and channel names will be converted to lowercase automatically

### Step 4: Test Setup
1. Add the environment variables to your `.env` file
2. Restart your bot
3. Check the console - you should see "TWITCH PLATFORM: ACTIVE! 🔥"
4. Type `!help` in your Twitch chat to test

---

## 🚀 RAILWAY DEPLOYMENT

Add these environment variables in your Railway dashboard:

1. Go to your Railway project
2. Click **"Variables"** tab
3. Add each variable from your `.env` file
4. **Deploy** your updated code

⚠️ **Important:** Your Railway service will restart when you add the Twitch variables!

---

## 🔄 PLATFORM BEHAVIOR

### **Telegram Features:**
- All commands work: `/aurafarm`, `/aura4aura`, `/aura`, `/auraboard`, `/bless`, `/help`
- Message reactions count for daily bonus
- Inline command suggestions with `@botname`

### **Twitch Features:**
- All commands work: `!aurafarm`, `!aura4aura`, `!aura`, `!auraboard`, `!bless`, `!help`
- Daily bonus system (no reaction tracking on Twitch)
- Rate-limited message chunks for long responses

### **Cross-Platform:**
- **Separate aura ecosystems** - Telegram aura ≠ Twitch aura
- **Shared database** - but platform-specific user records
- **Independent cooldowns** - can farm on both platforms separately
- **Daily reset** - runs for both platforms simultaneously

---

## 🛠️ TROUBLESHOOTING

### Twitch Bot Not Connecting
1. ✅ Check `TWITCH_BOT_USERNAME` matches your bot account exactly (case insensitive)
2. ✅ Verify `TWITCH_OAUTH_TOKEN` includes `oauth:` prefix
3. ✅ Ensure OAuth token has `chat:read` and `chat:write` scopes (NOT chat:edit)
4. ✅ Verify bot account generated the OAuth token (not your main account)
5. ✅ Check channel names in `TWITCH_CHANNELS` are correct (no # symbol)
6. ✅ All usernames/channels are automatically converted to lowercase

### Bot Not Responding in Twitch
1. ✅ Type `!help` to test basic functionality
2. ✅ Make sure the bot account is not banned/timed out
3. ✅ Check Railway logs for connection errors
4. ✅ Verify the bot account has chat permissions

### Database Issues
1. ✅ Run the SQL migration in `supabase_migration.sql`
2. ✅ Check Supabase for the `platform` column in your `aura` table
3. ✅ Verify existing Telegram users still work

---

## 🎯 SUCCESS CHECKLIST

- [ ] Database migration completed
- [ ] Telegram bot still works normally
- [ ] Twitch OAuth token configured
- [ ] Twitch channels added to environment
- [ ] Bot connects to Twitch IRC
- [ ] Commands work in Twitch chat (`!help`)
- [ ] Separate aura balances between platforms
- [ ] Railway deployment updated with new variables

**YOU'RE NOW RUNNING A MULTI-PLATFORM SIGMA GRINDSET EMPIRE!** 🚀💀🔥