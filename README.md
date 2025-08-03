# 🌟 AuraFarmBot

A mystical Telegram bot that rewards or removes aura points through RNG-based farming, epic duels, and social interactions in group chats. Built with Node.js, Telegraf, and Supabase for persistent data storage.

## ✨ Features

### 🌾 Aura Farming (`/aurafarm`)
- **24-hour cooldown** between farms
- **RNG-based rewards:**
  - 70% chance: +20 to +50 aura
  - 20% chance: -10 to -25 aura  
  - 10% chance: +100 jackpot or -50 implosion
- Mystical flavor text for each outcome

### ⚔️ Aura Duels (`/aura4aura @user`)
- **Best of 3 dice rolls** (1-10)
- Winner steals **+15 aura** from loser
- Epic battle commentary with meme flavor text
- Unlimited duels (no cooldown)

### 📊 Leaderboard (`/auraboard`)
- **Top 5 Aura Legends** (highest aura)
- **Top 5 Cursed Champions** (lowest aura)
- Real-time rankings from Supabase

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

**Duels:**
- ⚔️ {winner} dominated {loser} in an epic aura duel!
- 🏆 {winner} drained {loser}'s essence! Victory tastes sweet!

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
| `/aura4aura @user` | Challenge to duel | None |
| `/auraboard` | View leaderboard | None |
| `/aura [@user]` | Check aura balance | None |

---

Built with ❤️ for the aura farming community! 🌟