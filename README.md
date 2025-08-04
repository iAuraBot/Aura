# 🌟 AuraFarmBot

A mystical Telegram bot that rewards or removes aura points through RNG-based farming, epic duels, and social interactions in group chats. Built with Node.js, Telegraf, and Supabase for persistent data storage.

## ✨ Features

### ✨ Aura Farming (`/aurafarm`)
- **24-hour cooldown** between farms
- **RNG-based rewards:**
  - 70% chance: +20 to +50 aura
  - 20% chance: -10 to -25 aura  
  - 10% chance: +100 jackpot or -50 implosion
- Mystical flavor text for each outcome

### 🎰 Aura Casino (`/aura4aura @user [amount]`)
- **50/50 gambling system** with custom wagers
- Both players must have enough aura to match the bet
- Winner takes the full wager amount from loser
- Pure RNG with BRAINROT flavor text
- Unlimited gambling (no cooldown)

### 📊 Leaderboard (`/auraboard`)
- **Top 10 users** ranked by aura (highest to lowest)
- **Medal system** for top 3 positions
- **Real-time rankings** from Supabase

### 💫 Aura Check (`/aura` or `/aura @user`)
- Check your own or someone else's aura balance
- Dynamic emoji based on aura level
- Positive/negative energy indicators

### 🎉 Daily Reaction Bonus
- Automatic tracking of message reactions
- **Daily reset at midnight UTC**
- User with most reactions gets **+25 aura bonus**
- Automated daily winner announcement

## 🚀 Quick Setup

### 1. Dependencies
```bash
npm install telegraf @supabase/supabase-js node-cron dotenv
```

### 2. Supabase Schema
Run this in your Supabase SQL Editor:
```sql
create table aura (
  user_id text primary key,
  username text,
  aura int default 0,
  last_farm timestamp,
  reactions_today int default 0
);
```

### 3. Environment Variables
Create a `.env` file:
```env
BOT_TOKEN=your_telegram_bot_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_anon_public_key
```

### 4. Run the Bot
```bash
npm start
```

## 🔧 Railway Deployment

1. **Push to GitHub** and connect to Railway
2. **Set environment variables** in Railway dashboard:
   - `BOT_TOKEN`
   - `SUPABASE_URL` 
   - `SUPABASE_KEY`
3. **Deploy** and test in your Telegram group!

## 🎭 Flavor Text Examples

**Positive Outcomes:**
- ✨ The cosmos smiles upon you!
- 🌟 Stellar vibes detected!
- ⚡ Pure aura energy flows through you!

**Negative Outcomes:**
- 💀 The vibes have betrayed you...
- 🌩️ Dark clouds gather around your aura...
- ⚫ A shadow falls upon your spirit...

**Jackpots:**
- 🎰 JACKPOT! The universe rewards your patience!
- 💎 LEGENDARY! You've struck aura gold!

**Casino Wins:**
- ⚔️ {winner} absolutely MOGGED {loser}! NO MERCY!
- 🏆 {winner} said "GET REKT" and FANUM TAXED {loser}!

## 📁 File Structure

```
AuraFarmBot/
├── index.js          # Main bot file with all commands
├── db.js             # Supabase database helper functions
├── package.json      # Dependencies and scripts
└── README.md         # This file
```

## 🛠️ Database Functions

- `getUser(userId, username)` - Get/create user
- `updateAura(userId, amount)` - Add/subtract aura  
- `updateReactions(userId)` - Track daily reactions
- `getTopUsers(limit, ascending)` - Leaderboard data
- `canUserFarm(user)` - Check 24h cooldown
- `resetDailyReactions()` - Midnight reset

## 🔐 Security Features

- **Error handling** for all database operations
- **Graceful shutdown** handling
- **Auto-retry** logic for failed operations
- **User validation** and sanitization
- **Rate limiting** through 24h farm cooldown

## 🎮 Bot Commands Summary

| Command | Description | Cooldown |
|---------|-------------|----------|
| `/aurafarm` | Farm aura with RNG | 24 hours |
| `/aura4aura @user [amount]` | 50/50 aura gambling | None |
| `/auraboard` | View top 10 aura leaderboard | None |
| `/aura [@user]` | Check aura balance | None |
| `/help` | Show all commands and usage | None |

---

Built with ❤️ for the aura farming community! 🌟