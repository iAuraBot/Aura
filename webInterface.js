// webInterface.js - Comprehensive web interface for AuraBot management
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const db = require('./db');

// Store for OAuth states and user sessions
const oauthStates = new Map();
const activeChannels = new Set(); // Track which channels the bot has joined

function setupWebInterface(app) {
  // Session middleware for user authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Serve static files
  app.use(express.static('public'));
  app.use('/assets', express.static('assets'));
  app.use(express.urlencoded({ extended: true }));

  // Landing page - Add bot to channel
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>iAuraFarmBot - Your Chat Made Brainrot</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: 
              linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
              url('/assets/aurafarmbot.png') center center;
            background-size: cover;
            background-attachment: fixed;
            background-repeat: no-repeat;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            overflow-x: hidden;
          }
          .container {
            width: 100%;
            padding: 60px 80px;
            text-align: center;
            position: relative;
            z-index: 2;
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .bot-icon {
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 40px;
            font-size: 4rem;
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
          }
          h1 { 
            font-size: 4rem; 
            margin-bottom: 20px; 
            font-weight: 800;
            background: linear-gradient(45deg, #ffd700, #ffeb3b, #ff9800);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
            line-height: 1.1;
            filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.7));
          }
          .subtitle {
            font-size: 2.5rem;
            margin-bottom: 30px;
            font-weight: 600;
            opacity: 0.9;
          }
          .description { 
            font-size: 1.4rem; 
            margin-bottom: 50px; 
            line-height: 1.6; 
            opacity: 0.8;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
          }
          .cta-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-bottom: 60px;
            flex-wrap: wrap;
          }
          .btn {
            display: inline-block;
            padding: 18px 36px;
            background: rgba(255, 255, 255, 0.9);
            color: #1f2937;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }
          .btn:hover { 
            background: rgba(255, 255, 255, 1);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          }
          .btn-secondary { 
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          .btn-secondary:hover { 
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
          }
          .stat-card {
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 30px 20px;
            text-align: center;
            transition: transform 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .stat-card:hover {
            transform: translateY(-5px);
          }
          .stat-number { 
            font-size: 2.5rem; 
            font-weight: 800; 
            color: #ffd700;
            margin-bottom: 10px;
          }
          .stat-label { 
            font-size: 1rem; 
            opacity: 0.8;
            font-weight: 500;
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
          }
          .feature-card {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 25px;
            text-align: left;
            transition: all 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          .feature-card:hover {
            transform: translateY(-3px);
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .feature-emoji {
            font-size: 2rem;
            margin-bottom: 15px;
            display: block;
          }
          .feature-title {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 10px;
            color: #ffd700;
          }
          .feature-desc {
            font-size: 0.95rem;
            opacity: 0.8;
            line-height: 1.4;
          }
                      @media (max-width: 768px) {
            .container { padding: 40px 20px; }
            h1 { font-size: 2.5rem; }
            .subtitle { font-size: 1.8rem; }
            .description { font-size: 1.1rem; }
            .cta-buttons { flex-direction: column; align-items: center; }
            .floating-social { position: fixed; bottom: 10px; right: 10px; }
            .floating-social a { width: 40px; height: 40px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="bot-icon">
            <img src="/assets/aurafarmbot.png" alt="AuraFarmBot" style="width: 160px; height: 160px; border-radius: 20px; object-fit: cover;">
          </div>
                      <h2 class="subtitle">absolutely unhinged ai bot that's hittin different on telegram, twitch, and x fr 💀 farm aura, mog your friends, and have chaotic convos with pure brainrot energy</h2>

          
          <div class="cta-buttons">
            <a href="/auth/streamer" class="btn">Add to Chat 💀</a>
            ${req.session.user ? `<a href="/dashboard" class="btn btn-secondary">Dashboard</a>` : `<a href="#features" class="btn btn-secondary">See the Chaos</a>`}
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">3</div>
              <div class="stat-label">Platforms</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">AI</div>
              <div class="stat-label">Chaos</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">24/7</div>
              <div class="stat-label">Grindin</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">∞</div>
              <div class="stat-label">Chaos Level</div>
            </div>
          </div>

          <div class="features-grid" id="features">
            <div class="feature-card">
              <span class="feature-emoji">🌐</span>
              <div class="feature-title">Multi-Platform Vibes</div>
              <div class="feature-desc">Hits different on Telegram, Twitch, and X - same chaotic energy everywhere fr</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">🤖</span>
              <div class="feature-title">Unhinged AI Chats</div>
              <div class="feature-desc">Just @mention for absolutely bussin conversations that remember your whole vibe</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">✨</span>
              <div class="feature-title">Aura Farmin Grindset</div>
              <div class="feature-desc">Daily chaos harvest with random W's and L's - noobs get extra protection fr</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">🫵😹</span>
              <div class="feature-title">Get Mogged</div>
              <div class="feature-desc">1v1 showdowns where you bet your aura - winner takes all, loser gets absolutely cooked</div>
            </div>
                          <div class="feature-card">
                <span class="feature-emoji">𝕏</span>
                <div class="feature-title">X Mention Chaos</div>
                <div class="feature-desc">Random reply vibes with smart throttlin - sometimes ignores you, sometimes destroys you</div>
              </div>
            <div class="feature-card">
              <span class="feature-emoji">📊</span>
              <div class="feature-title">Aura Leaderboards</div>
              <div class="feature-desc">See who's absolutely goated and who's mid af - pure sigma energy rankings</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">🙏</span>
              <div class="feature-title">Bless Your Homies</div>
              <div class="feature-desc">Gift aura to your friends with absolutely unhinged blessing messages - pure wholesome chaos</div>
            </div>

            <div class="feature-card">
              <span class="feature-emoji">⚙️</span>
              <div class="feature-title">Custom Chaos Levels</div>
              <div class="feature-desc">Tweak your grind settings and chaos energy to match your vibe - make it yours fr</div>
            </div>
          </div>

          <div style="margin-top: 60px; text-align: center;">
            <h2 style="font-size: 2.5rem; margin-bottom: 30px; color: #ffd700;">How to Get Started 💀</h2>
            <div class="features-grid">
              <div class="feature-card">
                <img src="/assets/telegram.png" alt="Telegram" style="width: 48px; height: 48px; margin-bottom: 15px; display: block;">
                <div class="feature-title">Telegram Vibes</div>
                <div class="feature-desc">
                  <strong>Grind Commands:</strong> /aurafarm, /mog, /bless<br>
                  <strong>Chat with AI:</strong> @aurafarmbot yo what's good?<br>
                  <strong>Where:</strong> Any group chat or DMs fr
                </div>
              </div>
              <div class="feature-card">
                <img src="/assets/x.png" alt="X (Twitter)" style="width: 48px; height: 48px; margin-bottom: 15px; display: block;">
                <div class="feature-title">X Chaos Mode</div>
                <div class="feature-desc">
                  <strong>Roast Request:</strong> @AuraFarmBot thoughts on my aura?<br>
                  <strong>Random Energy:</strong> Sometimes replies, sometimes ghosts you<br>
                  <strong>Vibe Check:</strong> Might destroy you or hype you up
                </div>
              </div>
              <div class="feature-card">
                <img src="/assets/twitch.png" alt="Twitch" style="width: 48px; height: 48px; margin-bottom: 15px; display: block;">
                <div class="feature-title">Twitch Stream Energy</div>
                <div class="feature-desc">
                  <strong>Chat Commands:</strong> !aurafarm, !mog, !bless<br>
                  <strong>AI Roasts:</strong> @aurafarmbot rate my gameplay<br>
                  <strong>Setup:</strong> Streamers can add bot to their channel
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top: 60px; text-align: center; padding: 40px; background: rgba(0, 0, 0, 0.4); border-radius: 20px; backdrop-filter: blur(15px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);">
            <div>
              <h4 style="font-size: 1.4rem; margin-bottom: 20px; color: #ffd700;">🔗 Find Us Everywhere</h4>
              <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <a href="https://x.com/AuraFarmBot" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(0, 0, 0, 0.7)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.4)'; this.style.transform='translateY(0)'">
                  <img src="/assets/x.png" alt="X (Twitter)" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
                <a href="https://t.me/iAuraFarmBot" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(0, 136, 204, 0.2); border: 1px solid rgba(0, 136, 204, 0.4); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(0, 136, 204, 0.4)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(0, 136, 204, 0.2)'; this.style.transform='translateY(0)'">
                  <img src="/assets/telegram.png" alt="Telegram" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
                <a href="https://www.twitch.tv/iaurafarmbot" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(145, 70, 255, 0.2); border: 1px solid rgba(145, 70, 255, 0.4); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(145, 70, 255, 0.4)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(145, 70, 255, 0.2)'; this.style.transform='translateY(0)'">
                  <img src="/assets/twitch.png" alt="Twitch" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Floating Social Media Bar -->
        <div class="floating-social" style="position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 1000;">
          <a href="https://x.com/AuraFarmBot" target="_blank" title="Follow on X" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(0, 0, 0, 0.9); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/x.png" alt="X (Twitter)" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
          <a href="https://t.me/iAuraFarmBot" target="_blank" title="Chat on Telegram" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(0, 136, 204, 0.9); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/telegram.png" alt="Telegram" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
          <a href="https://www.twitch.tv/iaurafarmbot" target="_blank" title="Watch Live on Twitch" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(145, 70, 255, 0.9); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/twitch.png" alt="Twitch" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
        </div>
      </body>
      </html>
    `);
  });

  // Streamer OAuth - Step 1: Show permission explanation then redirect
  app.get('/auth/streamer', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connect Your Twitch Channel - AuraFarmBot</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: 
              linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
              url('/assets/aurafarmbot.png') center center;
            background-size: cover;
            background-attachment: fixed;
            background-repeat: no-repeat;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            overflow-x: hidden;
          }
          .container {
            width: 100%;
            max-width: 700px;
            padding: 60px 40px;
            text-align: center;
            position: relative;
            z-index: 2;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 { 
            font-size: 2.5rem; 
            margin-bottom: 20px; 
            font-weight: 700;
            background: linear-gradient(45deg, #ffd700, #ffeb3b, #ff9800);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.7));
            line-height: 1.2;
          }
          .description { 
            font-size: 1.2rem; 
            margin-bottom: 30px; 
            line-height: 1.6; 
            opacity: 0.8;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .permissions {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 25px;
            margin: 25px 0;
            text-align: left;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }
          .permissions:hover {
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .permissions h3 {
            color: #ffd700;
            font-weight: 700;
            margin-bottom: 15px;
            font-size: 1.2rem;
          }
          .permission-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            font-size: 16px;
            line-height: 1.4;
          }
          .permission-item .icon {
            font-size: 24px;
            margin-right: 15px;
            width: 30px;
            flex-shrink: 0;
          }
          .btn {
            display: inline-block;
            padding: 18px 36px;
            background: rgba(255, 255, 255, 0.9);
            color: #1f2937;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            margin: 10px;
          }
          .btn:hover { 
            background: rgba(255, 255, 255, 1);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          }
          .btn-secondary { 
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          .btn-secondary:hover { 
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
          @media (max-width: 768px) {
            .container { padding: 40px 20px; }
            h1 { font-size: 2rem; }
            .permissions { padding: 20px; }
            .permission-item { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎮 Connect Your Twitch Channel</h1>
          <p class="description">AuraFarmBot needs permission to join your channel and respond to commands.</p>
          
          <div class="permissions">
            <h3>📋 What We're Requesting:</h3>
            <div class="permission-item">
              <span class="icon">👤</span>
              <span><strong>Channel Identity</strong> - Know your username to join the right chat</span>
            </div>
            <div class="permission-item">
              <span class="icon">💬</span>
              <span><strong>Chat Access</strong> - Read messages and respond to commands</span>
            </div>
            <div class="permission-item">
              <span class="icon">🎯</span>
              <span><strong>Command Processing</strong> - Handle aura farming, duels, and AI conversations</span>
            </div>
          </div>

          <div class="permissions">
            <h3>🚀 What Happens Next:</h3>
            <div class="permission-item">
              <span class="icon">1️⃣</span>
              <span>You'll be redirected to Twitch to grant permissions</span>
            </div>
            <div class="permission-item">
              <span class="icon">2️⃣</span>
              <span>AuraFarmBot will automatically join your channel</span>
            </div>
            <div class="permission-item">
              <span class="icon">3️⃣</span>
              <span>You'll see the bot in your viewer list within 1-2 minutes</span>
            </div>
            <div class="permission-item">
              <span class="icon">4️⃣</span>
              <span>Your community can start using aura commands!</span>
            </div>
          </div>

          <a href="/auth/streamer/authorize" class="btn">🔗 Connect Channel</a>
          <a href="/" class="btn btn-secondary">← Go Back</a>
        </div>
      </body>
      </html>
    `);
  });

  // Actual authorization redirect
  app.get('/auth/streamer/authorize', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = 'user:read:email'; // We need email to identify the user
    
    // Store state for verification
    oauthStates.set(state, { 
      timestamp: Date.now(),
      type: 'streamer_auth'
    });
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${process.env.TWITCH_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.TWITCH_REDIRECT_URI.replace('/auth/twitch/callback', '/auth/streamer/callback'))}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;
    
    res.redirect(authUrl);
  });

  // Streamer OAuth - Step 2: Handle callback and authorize bot for their channel
  app.get('/auth/streamer/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error}</p>
          <a href="/" style="color: #9146ff;">← Back to Homepage</a>
        </div>
      `);
    }
    
    if (!oauthStates.has(state)) {
      return res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Invalid Request</h2>
          <p>Security verification failed. Please try again.</p>
          <a href="/" style="color: #9146ff;">← Back to Homepage</a>
        </div>
      `);
    }
    
    oauthStates.delete(state);
    
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.TWITCH_REDIRECT_URI.replace('/auth/twitch/callback', '/auth/streamer/callback'),
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenData.message}`);
      }
      
      // Get user info
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      });
      
      const userData = await userResponse.json();
      const user = userData.data[0];
      
      // Store user session
      req.session.user = {
        id: user.id,
        login: user.login,
        display_name: user.display_name,
        email: user.email,
        access_token: tokenData.access_token
      };
      
      // Store channel configuration in database
      await db.createChannelConfig(user.id, user.login, {
        display_name: user.display_name,
        email: user.email,
        bot_enabled: true,
        settings: {
          farm_cooldown: 24, // hours
          farm_min_reward: 20,
          farm_max_reward: 50,
          duel_enabled: true,
          blessing_enabled: true,
          custom_welcome: `Welcome to ${user.display_name}'s aura farming community!`,
          custom_flavors: null // Will use defaults
        }
      });
      
      // Add channel to active channels 
      activeChannels.add(user.login);
      
      // Actually join the channel!
      const twitchBot = require('./twitchBot');
      const joinSuccess = await twitchBot.joinTwitchChannel(user.login);
      
      console.log(`🎮 New channel authorized: ${user.login} (${user.display_name})`);
      console.log(`🔗 Bot join attempt: ${joinSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Success - Multi-Platform AuraFarmBot Added!</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: 
                linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
                url('/assets/aurafarmbot.png') center center;
              background-size: cover;
              background-attachment: fixed;
              background-repeat: no-repeat;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              overflow-x: hidden;
            }
            .container {
              max-width: 600px;
              padding: 60px 40px;
              text-align: center;
              position: relative;
              z-index: 2;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .success-icon { 
              font-size: 4rem; 
              margin-bottom: 20px; 
            }
            h1 { 
              font-size: 3rem; 
              margin-bottom: 20px; 
              font-weight: 800;
              background: linear-gradient(45deg, #ffd700, #ffeb3b, #ff9800);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
              line-height: 1.1;
              filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.7));
            }
            .btn {
              display: inline-block;
              padding: 18px 36px;
              background: rgba(255, 255, 255, 0.9);
              color: #1f2937;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 700;
              font-size: 1.1rem;
              transition: all 0.3s ease;
              cursor: pointer;
              border: none;
              backdrop-filter: blur(10px);
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
              margin: 10px;
            }
            .btn:hover { 
              background: rgba(255, 255, 255, 1);
              transform: translateY(-3px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }
            .btn-secondary { 
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .btn-secondary:hover { 
              background: rgba(255, 255, 255, 0.2);
              color: white;
            }
            .commands {
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              padding: 25px;
              margin: 25px 0;
              text-align: left;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <img src="/assets/aurafarmbot.png" alt="AuraFarmBot" style="width: 120px; height: 120px; border-radius: 20px; object-fit: cover; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            </div>
            <h1>AuraFarmBot Successfully Added!</h1>
            <p><strong>Channel:</strong> ${user.display_name}</p>
                            <p>🔍 <strong>Look for "iaurafarmbot" in your viewer list!</strong></p>
                <p>The bot should appear in your chat within 30-60 seconds.</p>
            
            <div class="commands">
              <h3>Available Commands:</h3>
              <p><code>!aurafarm</code> - Farm aura (24h cooldown)</p>
              <p><code>!aura [@user]</code> - Check aura balance</p>
              <p><code>!mog @user [amount]</code> - Challenge to mog</p>
              <p><code>!auraboard</code> - View leaderboard</p>
              <p><code>!bless @user [amount]</code> - Give aura to someone</p>
              <p><code>!emote [dance move]</code> - Random brainrot dance celebration</p>
              <p><code>!help</code> - Show command list</p>
              <h3>AI Conversations:</h3>
              <p><code>@aurafarmbot [message]</code> - Chat with Claude AI</p>
              <p style="font-size: 0.9rem; color: #adadb8; margin-top: 5px;">Just mention the bot to have chaotic brainrot conversations!</p>
              <h3>Multi-Platform Support:</h3>
              <p style="font-size: 0.9rem; color: #adadb8;">Also works on <strong>Telegram</strong> (/commands) and <strong>X (Twitter)</strong> (@mentions)</p>
            </div>
            
            <a href="/dashboard" class="btn">⚙️ Customize Settings</a>
            <a href="https://twitch.tv/${user.login}" class="btn">🎮 Go to Channel</a>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Streamer OAuth error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        error: error
      });
      res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Setup Failed</h2>
          <p>Error: ${error.message}</p>
          <a href="/" style="color: #9146ff;">← Try Again</a>
        </div>
      `);
    }
  });

  // Dashboard - Comprehensive settings page
  app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/streamer');
    }
    
    try {
      const channelConfig = await db.getChannelConfig(req.session.user.id);
      const platform = req.session.user.platform || 'twitch';
      const familyFriendlySetting = await db.getFamilyFriendlySetting(platform, req.session.user.id);
      
      // Get comprehensive settings from database
      const settings = await db.getComprehensiveSettings(req.session.user.id, platform);
      const channelUrl = platform === 'twitch' ? `https://twitch.tv/${req.session.user.login}` : 
                        platform === 'kick' ? `https://kick.com/${req.session.user.slug}` : '#';
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>iAuraFarmBot Settings - ${req.session.user.display_name || req.session.user.username}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: 
                linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)),
                url('/assets/aurafarmbot.png') center center;
              background-size: cover;
              background-attachment: fixed;
              background-repeat: no-repeat;
              color: #efeff1;
              min-height: 100vh;
            }
            .header {
              background: rgba(26, 61, 46, 0.9);
              border-bottom: 1px solid rgba(116, 185, 71, 0.2);
              padding: 20px 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              backdrop-filter: blur(10px);
            }
            .header h1 {
              font-size: 1.8rem;
              font-weight: 600;
              color: #ffd700;
            }
            .header .subtitle {
              font-size: 0.9rem;
              color: #adadb8;
              margin-top: 4px;
            }
            .header .join-btn {
              background: #76b947;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              text-decoration: none;
            }
            .header .join-btn:hover { background: #5a8b3a; }
            .main-content {
              padding: 40px 80px;
              width: 100%;
              margin: 0;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 40px;
              margin-bottom: 60px;
            }
            .metric-card {
              text-align: center;
            }
            .metric-number {
              font-size: 3rem;
              font-weight: 800;
              color: #ffd700;
              margin-bottom: 8px;
            }
            .metric-label {
              font-size: 1.1rem;
              color: #adadb8;
              font-weight: 500;
            }
            .metric-change {
              font-size: 0.9rem;
              color: #9fff7a;
              margin-top: 4px;
            }
            .dashboard-sections {
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .analytics-section {
              background: rgba(26, 61, 46, 0.8);
              border-radius: 12px;
              border: 1px solid rgba(116, 185, 71, 0.3);
              overflow: hidden;
              backdrop-filter: blur(15px);
            }
            .section-header {
              background: rgba(15, 31, 26, 0.9);
              padding: 20px 24px;
              border-bottom: 1px solid rgba(116, 185, 71, 0.2);
              font-size: 1.1rem;
              font-weight: 600;
            }
            .section-content {
              padding: 24px;
            }
            .chart-placeholder {
              height: 200px;
              background: linear-gradient(135deg, rgba(116, 185, 71, 0.2), rgba(159, 255, 122, 0.1));
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.2rem;
              color: #c5e8a7;
              border: 2px dashed rgba(116, 185, 71, 0.4);
              margin-bottom: 20px;
            }
            .leaderboard-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #2f2f35;
            }
            .leaderboard-item:last-child { border-bottom: none; }
            .leaderboard-rank {
              font-weight: 700;
              color: #ffd700;
              width: 30px;
            }
            .leaderboard-name {
              flex: 1;
              margin-left: 12px;
            }
            .leaderboard-value {
              font-weight: 600;
              color: #9fff7a;
            }
            .commands-section {
              background: rgba(26, 61, 46, 0.8);
              border-radius: 12px;
              border: 1px solid rgba(116, 185, 71, 0.3);
              height: fit-content;
              backdrop-filter: blur(15px);
            }
            .commands-grid {
              display: grid;
              gap: 12px;
            }
            .command-item {
              background: rgba(15, 31, 26, 0.7);
              padding: 16px;
              border-radius: 8px;
              border: 1px solid rgba(116, 185, 71, 0.2);
              transition: background 0.2s;
            }
            .command-item:hover {
              background: rgba(45, 93, 67, 0.5);
            }
            .command-name {
              font-weight: 600;
              color: #ffd700;
              margin-bottom: 4px;
            }
            .command-desc {
              font-size: 0.9rem;
              color: #adadb8;
            }
            .command-usage {
              font-size: 0.8rem;
              color: #9fff7a;
              margin-top: 8px;
              background: rgba(15, 31, 26, 0.8);
              padding: 4px 8px;
              border-radius: 4px;
            }
            .settings-toggle {
              margin-top: 30px;
              padding-top: 30px;
              border-top: 1px solid #2f2f35;
            }
            .toggle-group {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .toggle-switch {
              position: relative;
              width: 50px;
              height: 24px;
              background: #2f2f35;
              border-radius: 12px;
              cursor: pointer;
              transition: 0.3s;
            }
            .toggle-switch.active { background: #76b947; }
            .toggle-switch::before {
              content: '';
              position: absolute;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: white;
              top: 3px;
              left: 3px;
              transition: 0.3s;
            }
            .toggle-switch.active::before { transform: translateX(26px); }
            .btn {
              background: #76b947;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin: 8px 4px;
              transition: background 0.2s;
            }
            .btn:hover { background: #5a8b3a; }
            .btn-secondary { background: #2f2f35; }
            .btn-secondary:hover { background: #3f3f45; }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
            .quick-settings {
              background: rgba(26, 61, 46, 0.8);
              border-radius: 12px;
              border: 1px solid rgba(116, 185, 71, 0.3);
              margin-top: 40px;
              overflow: hidden;
              backdrop-filter: blur(15px);
            }
            .settings-form {
              padding: 24px;
            }
            .form-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-group label {
              display: block;
              margin-bottom: 8px;
              font-weight: 600;
              color: #efeff1;
            }
            .form-group input, .form-group textarea {
              width: 100%;
              padding: 12px;
              background: rgba(15, 31, 26, 0.8);
              border: 1px solid rgba(116, 185, 71, 0.3);
              border-radius: 6px;
              color: #efeff1;
              font-size: 14px;
            }
            .form-group input:focus, .form-group textarea:focus {
              outline: none;
              border-color: #76b947;
            }
            .form-group small {
              color: #adadb8;
              font-size: 0.8rem;
              margin-top: 4px;
              display: block;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Good Morning, ${req.session.user.display_name} 💀🔥</h1>
              <div class="subtitle">Here's your brainrot aura farming overview</div>
            </div>
            <a href="https://twitch.tv/${req.session.user.login}" class="join-btn">Join Channel</a>
          </div>
          
          <div class="main-content">
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-number">0</div>
                <div class="metric-label">Farms Today</div>
                <div class="metric-change">💀 pure chaos</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">0</div>
                <div class="metric-label">Duels Today</div>
                <div class="metric-change">🔥 beef zone</div>
              </div>
              <div class="metric-card">
                <div class="metric-number">0</div>
                <div class="metric-label">Blessings Today</div>
                <div class="metric-change">✨ good vibes</div>
              </div>
            </div>

            <div class="dashboard-sections">
              <div class="analytics-section">
                <div class="section-header">📊 Top AURA MOGGERS</div>
                <div class="section-content">
                  <div class="chart-placeholder">
                    💀 Your aura moggers will appear here when they start farming! 🔥
                  </div>
                  <div class="leaderboard-item">
                    <div class="leaderboard-rank">🥇</div>
                    <div class="leaderboard-name">Waiting for first farmer...</div>
                    <div class="leaderboard-value">0 aura</div>
                  </div>
                  <div class="leaderboard-item">
                    <div class="leaderboard-rank">🥈</div>
                    <div class="leaderboard-name">No one yet...</div>
                    <div class="leaderboard-value">0 aura</div>
                  </div>
                  <div class="leaderboard-item">
                    <div class="leaderboard-rank">🥉</div>
                    <div class="leaderboard-name">Get farming!</div>
                    <div class="leaderboard-value">0 aura</div>
                  </div>
                </div>
              </div>

              <div class="commands-section">
                <div class="section-header">🎮 Commands</div>
                <div class="section-content">
                  <div class="commands-grid">
                    <div class="command-item" style="border: 2px solid #ffd700;">
                      <div class="command-name">@aurafarmbot 🤖</div>
                      <div class="command-desc">Unhinged AI chats that remember everything</div>
                      <div class="command-usage">@aurafarmbot what's up?</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!aurafarm</div>
                      <div class="command-desc">Grind that aura with pure random chaos</div>
                      <div class="command-usage">daily cooldown</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!mog</div>
                      <div class="command-desc">tryna mog someone? bet your aura</div>
                      <div class="command-usage">!mog @user [amount]</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!bless</div>
                      <div class="command-desc">bless your homies with good vibes</div>
                      <div class="command-usage">!bless @user [amount]</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!aura</div>
                      <div class="command-desc">check your (or someone's) aura level</div>
                      <div class="command-usage">!aura [@user]</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!auraboard</div>
                      <div class="command-desc">see who's absolutely goated</div>
                      <div class="command-usage">shows top aura moggers</div>
                    </div>
                  </div>
                  <div style="margin-top: 20px; padding: 15px; background: rgba(255, 215, 0, 0.1); border-radius: 8px; border: 1px solid rgba(255, 215, 0, 0.3);">
                    <p style="margin: 0; font-size: 0.9rem; color: #ffd700;"><strong>Multi-Platform Chaos:</strong></p>
                    <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #adadb8;">Same energy on Telegram (/commands) and X (@mentions with random reply vibes)</p>
                  </div>
                  
                  <div class="settings-toggle">
                    <div class="toggle-group">
                      <span>Enable Duels</span>
                      <div class="toggle-switch ${channelConfig?.settings?.duel_enabled ? 'active' : ''}" onclick="toggleDuels()"></div>
                    </div>
                    <div class="toggle-group">
                      <span>Enable Blessings</span>
                      <div class="toggle-switch ${channelConfig?.settings?.blessing_enabled ? 'active' : ''}" onclick="toggleBlessings()"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="quick-settings">
              <div class="section-header">⚙️ Quick Settings</div>
              <form action="/dashboard/update" method="POST" class="settings-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Farm Cooldown (hours)</label>
                    <input type="number" name="farm_cooldown" value="${channelConfig?.settings?.farm_cooldown || 24}" min="1" max="168">
                    <small>Time between farming attempts (1-168 hours)</small>
                  </div>
                  <div class="form-group">
                    <label>Min Aura Reward</label>
                    <input type="number" name="farm_min_reward" value="${channelConfig?.settings?.farm_min_reward || 20}" min="1" max="100">
                    <small>Minimum aura gain from farming</small>
                  </div>
                </div>
                
                <div class="form-row">
                  <div class="form-group">
                    <label>Max Aura Reward</label>
                    <input type="number" name="farm_max_reward" value="${channelConfig?.settings?.farm_max_reward || 50}" min="1" max="200">
                    <small>Maximum aura gain from farming</small>
                  </div>
                  <div class="form-group">
                    <label>Bot Status</label>
                    <div class="toggle-group">
                      <span>Bot Enabled</span>
                      <div class="toggle-switch ${channelConfig?.bot_enabled ? 'active' : ''}" onclick="toggleBot()"></div>
                    </div>
                    <small>Enable/disable the bot in your channel</small>
                  </div>
                </div>

                <div class="form-group">
                  <label>AI Personality Mode</label>
                  <div class="toggle-group">
                    <span>Wholesome AI Vibes</span>
                    <div class="toggle-switch ${familyFriendlySetting ? 'active' : ''}" onclick="toggleUnhingeMode()"></div>
                  </div>
                  <small>ON = Clean, wholesome chaos | OFF = Full unhinged brainrot mode</small>
                </div>

                <div class="form-group">
                  <label>Custom Welcome Message</label>
                  <textarea name="custom_welcome" rows="3" placeholder="Welcome to ${req.session.user.display_name}'s aura farming community! 💀🔥">${channelConfig?.settings?.custom_welcome || ''}</textarea>
                  <small>Message shown to new farmers (leave empty for default brainrot message)</small>
                </div>

                                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid #2f2f35;">
                    <div>
                      <button type="submit" class="btn">💾 Save Changes</button>
                      <button type="button" class="btn btn-secondary" onclick="resetToDefaults()">🔄 Reset to Defaults</button>
                      <a href="/dashboard/advanced" class="btn" style="background: linear-gradient(45deg, #ffd700, #ffeb3b); color: #000; font-weight: 700;">⚙️ Advanced Settings</a>
                    </div>
                    <button type="button" class="btn btn-danger" onclick="removeBot()">🗑️ Remove Bot</button>
                  </div>
              </form>
            </div>
          </div>

          <script>
            function toggleBot() {
              const toggle = document.querySelector('.toggle-switch');
              toggle.classList.toggle('active');
            }

            function toggleDuels() {
              const toggle = document.querySelectorAll('.toggle-switch')[1];
              toggle.classList.toggle('active');
            }

            function toggleBlessings() {
              const toggle = document.querySelectorAll('.toggle-switch')[2];
              toggle.classList.toggle('active');
            }

            function toggleUnhingeMode() {
              const toggle = document.querySelectorAll('.toggle-switch')[3];
              toggle.classList.toggle('active');
              
              // Send update to server
              const isActive = toggle.classList.contains('active');
              fetch('/dashboard/family-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ familyFriendly: isActive })
              }).then(response => response.json())
                .then(data => {
                  if (!data.success) {
                    // Revert toggle on error
                    toggle.classList.toggle('active');
                    alert('Error updating AI mode: ' + data.error);
                  }
                }).catch(err => {
                  // Revert toggle on error
                  toggle.classList.toggle('active');
                  alert('Error updating AI mode');
                });
            }

            function resetToDefaults() {
              if (confirm('Reset all settings to default values? This will:\n• Set farm cooldown to 24 hours\n• Set rewards to 20-50 aura\n• Enable all commands\n• Clear custom messages')) {
                document.querySelector('input[name="farm_cooldown"]').value = 24;
                document.querySelector('input[name="farm_min_reward"]').value = 20;
                document.querySelector('input[name="farm_max_reward"]').value = 50;
                document.querySelector('textarea[name="custom_welcome"]').value = '';
                
                // Enable all toggles
                document.querySelectorAll('.toggle-switch').forEach(toggle => {
                  toggle.classList.add('active');
                });
              }
            }

            function removeBot() {
              if (confirm('⚠️ Remove iAuraFarmBot from your channel?\\n\\nThis will:\\n• Bot will immediately leave your channel\\n• Stop responding to all commands\\n• Delete all your settings\\n• Remove your channel from the active list\\n\\nThis action CANNOT be undone!')) {
                fetch('/dashboard/remove', { method: 'POST' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('💀 Bot removed successfully!\\n\\n👋 iAuraFarmBot has left your channel.\\n\\nThanks for trying iAuraFarmBot!');
                      window.location.href = '/';
                    } else {
                      alert('Error removing bot: ' + data.error);
                    }
                  });
              }
            }

            // Show success/error messages
            const params = new URLSearchParams(window.location.search);
            if (params.get('success')) {
              const message = document.createElement('div');
              message.innerHTML = '✅ Settings saved successfully!';
              message.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #00f5ff; color: #0e0e10; padding: 12px 20px; border-radius: 6px; font-weight: 600; z-index: 1000;';
              document.body.appendChild(message);
              setTimeout(() => message.remove(), 3000);
            }
            if (params.get('error')) {
              const message = document.createElement('div');
              message.innerHTML = '❌ Error saving settings. Please try again.';
              message.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 12px 20px; border-radius: 6px; font-weight: 600; z-index: 1000;';
              document.body.appendChild(message);
              setTimeout(() => message.remove(), 3000);
            }
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Dashboard error:', error);
      res.send('Error loading dashboard. Please try again.');
    }
  });

  // Advanced Settings Dashboard - Comprehensive customization page
  app.get('/dashboard/advanced', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/streamer');
    }
    
    try {
      const platform = req.session.user.platform || 'twitch';
      const settings = await db.getComprehensiveSettings(req.session.user.id, platform);
      const channelUrl = platform === 'twitch' ? `https://twitch.tv/${req.session.user.login}` : 
                        platform === 'kick' ? `https://kick.com/${req.session.user.slug}` : '#';
      const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Advanced Settings - iAuraFarmBot</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Poppins', sans-serif;
              background: linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)), url('/assets/aurafarmbot.png') center center;
              background-size: cover;
              background-attachment: fixed;
              color: #efeff1;
              min-height: 100vh;
            }
            .header {
              background: rgba(26, 61, 46, 0.9);
              padding: 20px 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              backdrop-filter: blur(10px);
              border-bottom: 1px solid rgba(116, 185, 71, 0.2);
            }
            .header h1 { font-size: 1.8rem; color: #ffd700; }
            .platform-badge {
              background: #ffd700;
              color: #000;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.8rem;
              font-weight: 600;
              text-transform: uppercase;
              margin-left: 10px;
            }
            .btn {
              background: #76b947;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              text-decoration: none;
              font-size: 0.9rem;
              transition: all 0.3s ease;
              margin-left: 10px;
            }
            .btn:hover { background: #5a8b3a; }
            .btn-secondary { background: #424249; }
            .btn-secondary:hover { background: #36363d; }
            .main-content {
              padding: 40px;
              max-width: 1200px;
              margin: 0 auto;
            }
            .settings-container {
              background: rgba(0, 0, 0, 0.5);
              border-radius: 12px;
              padding: 30px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .section {
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .section:last-child { border-bottom: none; }
            .section-title {
              font-size: 1.3rem;
              color: #ffd700;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .form-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-group label {
              display: block;
              margin-bottom: 8px;
              color: #efeff1;
              font-weight: 500;
            }
            .form-group input, .form-group select, .form-group textarea {
              width: 100%;
              padding: 12px;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 6px;
              color: #efeff1;
              font-family: inherit;
            }
            .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
              outline: none;
              border-color: #ffd700;
              background: rgba(255, 255, 255, 0.15);
            }
            .form-group small {
              display: block;
              margin-top: 5px;
              color: #adadb8;
              font-size: 0.85rem;
            }
            .toggle-group {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              margin-bottom: 10px;
            }
            .toggle-switch {
              width: 50px;
              height: 24px;
              background: #424249;
              border-radius: 24px;
              position: relative;
              cursor: pointer;
              transition: background 0.3s ease;
            }
            .toggle-switch::after {
              content: '';
              position: absolute;
              top: 2px;
              left: 2px;
              width: 20px;
              height: 20px;
              background: white;
              border-radius: 50%;
              transition: transform 0.3s ease;
            }
            .toggle-switch.active {
              background: #76b947;
            }
            .toggle-switch.active::after {
              transform: translateX(26px);
            }
            .feature-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 15px;
            }
            .feature-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              background: rgba(255, 255, 255, 0.05);
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .feature-info {
              flex: 1;
            }
            .feature-name {
              font-weight: 600;
              color: #ffd700;
              margin-bottom: 4px;
            }
            .feature-desc {
              font-size: 0.85rem;
              color: #adadb8;
            }
            .save-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-top: 30px;
              margin-top: 30px;
              border-top: 2px solid rgba(255, 215, 0, 0.3);
            }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
            .success-banner {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #00f5ff;
              color: #0e0e10;
              padding: 15px 25px;
              border-radius: 8px;
              font-weight: 600;
              z-index: 1000;
              opacity: 0;
              transform: translateX(100px);
              transition: all 0.3s ease;
            }
            .success-banner.show {
              opacity: 1;
              transform: translateX(0);
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>⚙️ Advanced Settings</h1>
              <span class="platform-badge">${platformName}</span>
            </div>
            <div>
              <a href="${channelUrl}" class="btn btn-secondary">🎮 View Channel</a>
              <a href="/dashboard" class="btn btn-secondary">← Back to Dashboard</a>
              <a href="/" class="btn btn-secondary">🏠 Home</a>
            </div>
          </div>

          <div class="main-content">
            <div class="settings-container">
              <!-- Bot Personality Section -->
              <div class="section">
                <div class="section-title">
                  🎭 Bot Personality & Behavior
                </div>
                
                <div class="toggle-group">
                  <div>
                    <strong>Unhinged Mode</strong>
                    <small>OFF = Family-friendly AI | ON = Full brainrot chaos mode</small>
                  </div>
                  <div class="toggle-switch ${settings.personality.unhinged ? 'active' : ''}" onclick="toggleSetting('unhinged')"></div>
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>AI Response Style</label>
                    <select id="response-style" onchange="updateSetting('responseStyle', this.value)">
                      <option value="chill" ${settings.personality.responseStyle === 'chill' ? 'selected' : ''}>😎 Chill - Laid back vibes</option>
                      <option value="energetic" ${settings.personality.responseStyle === 'energetic' ? 'selected' : ''}>⚡ Energetic - Hyped responses</option>
                      <option value="chaotic" ${settings.personality.responseStyle === 'chaotic' ? 'selected' : ''}>🔥 Chaotic - Pure brainrot energy</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>AI Response Rate (%)</label>
                    <input type="range" min="25" max="100" step="25" value="${settings.personality.responseFrequency}" onchange="updateSetting('responseFrequency', this.value); document.getElementById('freq-display').textContent = this.value + '%';">
                    <small id="freq-display">${settings.personality.responseFrequency}% - How often bot responds to @mentions</small>
                  </div>
                </div>
              </div>

              <!-- Aura System Section -->
              <div class="section">
                <div class="section-title">
                  💀 Aura System Customization
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>Farm Cooldown Period</label>
                    <select id="farm-cooldown" onchange="updateSetting('farmCooldown', parseInt(this.value))">
                      <option value="12" ${settings.aura.farmCooldown === 12 ? 'selected' : ''}>12 hours - Fast grind mode</option>
                      <option value="24" ${settings.aura.farmCooldown === 24 ? 'selected' : ''}>24 hours - Standard (default)</option>
                      <option value="48" ${settings.aura.farmCooldown === 48 ? 'selected' : ''}>48 hours - Hardcore mode</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Custom Aura Name</label>
                    <select id="aura-name" onchange="updateSetting('auraName', this.value)">
                      <option value="aura" ${settings.aura.auraName === 'aura' ? 'selected' : ''}>aura (default)</option>
                      <option value="energy" ${settings.aura.auraName === 'energy' ? 'selected' : ''}>energy</option>
                      <option value="vibes" ${settings.aura.auraName === 'vibes' ? 'selected' : ''}>vibes</option>
                      <option value="points" ${settings.aura.auraName === 'points' ? 'selected' : ''}>points</option>
                      <option value="rizz" ${settings.aura.auraName === 'rizz' ? 'selected' : ''}>rizz</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Min Reward Range</label>
                    <input type="number" min="1" max="100" value="${settings.aura.minReward}" onchange="updateSetting('minReward', parseInt(this.value))">
                  </div>
                  <div class="form-group">
                    <label>Max Reward Range</label>
                    <input type="number" min="1" max="200" value="${settings.aura.maxReward}" onchange="updateSetting('maxReward', parseInt(this.value))">
                  </div>
                </div>

                <div class="toggle-group">
                  <div>
                    <strong>Mog Duels</strong>
                    <small>Allow users to battle each other for aura</small>
                  </div>
                  <div class="toggle-switch ${settings.aura.duelsEnabled ? 'active' : ''}" onclick="toggleSetting('duelsEnabled')"></div>
                </div>
                
                <div class="toggle-group">
                  <div>
                    <strong>Aura Blessings</strong>
                    <small>Allow users to give aura to others</small>
                  </div>
                  <div class="toggle-switch ${settings.aura.blessingsEnabled ? 'active' : ''}" onclick="toggleSetting('blessingsEnabled')"></div>
                </div>

                <div class="toggle-group">
                  <div>
                    <strong>Special Commands (/edge, /goon, /mew)</strong>
                    <small>Enable unhinged mode special commands</small>
                  </div>
                  <div class="toggle-switch ${settings.aura.specialCommands ? 'active' : ''}" onclick="toggleSetting('specialCommands')"></div>
                </div>
              </div>

              <!-- Commands & Features Section -->
              <div class="section">
                <div class="section-title">
                  ⚡ Command Management
                </div>
                
                <div class="feature-grid">
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!aurafarm</div>
                      <div class="feature-desc">Core farming command</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.aurafarm ? 'active' : ''}" onclick="toggleCommand('aurafarm')"></div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!mog</div>
                      <div class="feature-desc">Duel battles</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.mog ? 'active' : ''}" onclick="toggleCommand('mog')"></div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!bless</div>
                      <div class="feature-desc">Give aura to others</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.bless ? 'active' : ''}" onclick="toggleCommand('bless')"></div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!aura</div>
                      <div class="feature-desc">Check aura balance</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.aura ? 'active' : ''}" onclick="toggleCommand('aura')"></div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!auraboard</div>
                      <div class="feature-desc">Leaderboard</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.auraboard ? 'active' : ''}" onclick="toggleCommand('auraboard')"></div>
                  </div>
                  <div class="feature-item">
                    <div class="feature-info">
                      <div class="feature-name">!emote</div>
                      <div class="feature-desc">Dance celebrations</div>
                    </div>
                    <div class="toggle-switch ${settings.commands.enabled.emote ? 'active' : ''}" onclick="toggleCommand('emote')"></div>
                  </div>
                </div>

                <div class="toggle-group">
                  <div>
                    <strong>Claude AI Conversations</strong>
                    <small>Allow @mentions for AI chat responses</small>
                  </div>
                  <div class="toggle-switch ${settings.commands.aiChat ? 'active' : ''}" onclick="toggleSetting('aiChat')"></div>
                </div>
              </div>

              <!-- Branding Section -->
              <div class="section">
                <div class="section-title">
                  🎨 Custom Branding & Messages
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>Custom Bot Name</label>
                    <input type="text" maxlength="25" placeholder="iAuraFarmBot" value="${settings.branding.botName}" onchange="updateSetting('botName', this.value)">
                    <small>Name shown in bot responses (leave empty for default)</small>
                  </div>
                  <div class="form-group">
                    <label>Success Emoji</label>
                    <input type="text" maxlength="5" value="${settings.branding.successEmoji}" onchange="updateSetting('successEmoji', this.value)">
                  </div>
                </div>
                
                <div class="form-group">
                  <label>Custom Welcome Message</label>
                  <textarea rows="3" placeholder="Welcome to the aura farming community! 💀🔥" onchange="updateSetting('welcomeMessage', this.value)">${settings.branding.welcomeMessage}</textarea>
                  <small>Message shown to new farmers (leave empty for default brainrot welcome)</small>
                </div>
                
                <div class="form-grid">
                  <div class="form-group">
                    <label>Custom Win Terms</label>
                    <input type="text" placeholder="goated, based, W, slay" value="${settings.branding.winTerms}" onchange="updateSetting('winTerms', this.value)">
                    <small>Comma-separated terms for wins</small>
                  </div>
                  <div class="form-group">
                    <label>Custom Loss Terms</label>
                    <input type="text" placeholder="mid, L, cooked, down bad" value="${settings.branding.lossTerms}" onchange="updateSetting('lossTerms', this.value)">
                    <small>Comma-separated terms for losses</small>
                  </div>
                </div>
              </div>

              <!-- Save Section -->
              <div class="save-section">
                <div>
                  <button class="btn btn-secondary" onclick="loadPreset('family')">👨‍👩‍👧‍👦 Family Mode</button>
                  <button class="btn btn-secondary" onclick="loadPreset('standard')">⚖️ Standard</button>
                  <button class="btn btn-secondary" onclick="loadPreset('chaos')">🔥 Max Chaos</button>
                </div>
                <div>
                  <button class="btn" onclick="saveAllSettings()">💾 Save All Settings</button>
                </div>
              </div>
            </div>
          </div>

          <script>
            // Current settings state
            let currentSettings = ${JSON.stringify(settings)};

            function toggleSetting(setting) {
              const toggles = event.target;
              toggles.classList.toggle('active');
              
              // Update settings object
              if (setting.includes('.')) {
                const [section, key] = setting.split('.');
                currentSettings[section][key] = toggles.classList.contains('active');
              } else {
                // Handle top-level settings
                if (setting === 'unhinged') {
                  currentSettings.personality.unhinged = toggles.classList.contains('active');
                } else if (setting === 'duelsEnabled') {
                  currentSettings.aura.duelsEnabled = toggles.classList.contains('active');
                } else if (setting === 'blessingsEnabled') {
                  currentSettings.aura.blessingsEnabled = toggles.classList.contains('active');
                } else if (setting === 'specialCommands') {
                  currentSettings.aura.specialCommands = toggles.classList.contains('active');
                } else if (setting === 'aiChat') {
                  currentSettings.commands.aiChat = toggles.classList.contains('active');
                }
              }
            }

            function toggleCommand(command) {
              const toggle = event.target;
              toggle.classList.toggle('active');
              currentSettings.commands.enabled[command] = toggle.classList.contains('active');
            }

            function updateSetting(setting, value) {
              // Update currentSettings based on setting path
              if (setting === 'responseStyle') {
                currentSettings.personality.responseStyle = value;
              } else if (setting === 'responseFrequency') {
                currentSettings.personality.responseFrequency = parseInt(value);
              } else if (setting === 'farmCooldown') {
                currentSettings.aura.farmCooldown = value;
              } else if (setting === 'auraName') {
                currentSettings.aura.auraName = value;
              } else if (setting === 'minReward') {
                currentSettings.aura.minReward = value;
              } else if (setting === 'maxReward') {
                currentSettings.aura.maxReward = value;
              } else if (setting === 'botName') {
                currentSettings.branding.botName = value;
              } else if (setting === 'welcomeMessage') {
                currentSettings.branding.welcomeMessage = value;
              } else if (setting === 'winTerms') {
                currentSettings.branding.winTerms = value;
              } else if (setting === 'lossTerms') {
                currentSettings.branding.lossTerms = value;
              } else if (setting === 'successEmoji') {
                currentSettings.branding.successEmoji = value;
              }
            }

            function loadPreset(preset) {
              switch(preset) {
                case 'family':
                  currentSettings.personality.unhinged = false;
                  currentSettings.personality.responseStyle = 'chill';
                  currentSettings.aura.specialCommands = false;
                  break;
                case 'standard':
                  currentSettings.personality.unhinged = false;
                  currentSettings.personality.responseStyle = 'energetic';
                  currentSettings.aura.specialCommands = false;
                  break;
                case 'chaos':
                  currentSettings.personality.unhinged = true;
                  currentSettings.personality.responseStyle = 'chaotic';
                  currentSettings.personality.responseFrequency = 100;
                  currentSettings.aura.specialCommands = true;
                  break;
              }
              location.reload(); // Reload to show new settings
            }

            function saveAllSettings() {
              fetch('/dashboard/save-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentSettings)
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  showBanner('✅ Settings saved successfully!');
                } else {
                  showBanner('❌ Error saving settings: ' + data.error);
                }
              })
              .catch(err => {
                showBanner('❌ Network error saving settings');
              });
            }

            function showBanner(message) {
              const banner = document.createElement('div');
              banner.className = 'success-banner show';
              banner.textContent = message;
              document.body.appendChild(banner);
              
              setTimeout(() => {
                banner.classList.remove('show');
                setTimeout(() => banner.remove(), 300);
              }, 3000);
            }
          </script>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Advanced settings error:', error);
      res.send('Error loading advanced settings. Please try again.');
    }
  });

  // Save comprehensive settings from new dashboard
  app.post('/dashboard/save-settings', async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    try {
      const platform = req.session.user.platform || 'twitch';
      const result = await db.saveComprehensiveSettings(req.session.user.id, platform, req.body);
      
      res.json(result);
    } catch (error) {
      console.error('Comprehensive settings save error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Legacy update settings (keep for compatibility)
  app.post('/dashboard/update', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/streamer');
    }
    
    try {
      const settings = {
        farm_cooldown: parseInt(req.body.farm_cooldown) || 24,
        farm_min_reward: parseInt(req.body.farm_min_reward) || 20,
        farm_max_reward: parseInt(req.body.farm_max_reward) || 50,
        duel_enabled: req.body.duel_enabled === 'on',
        blessing_enabled: req.body.blessing_enabled === 'on',
        custom_welcome: req.body.custom_welcome || '',
      };
      
      await db.updateChannelSettings(req.session.user.id, settings);
      
      res.redirect('/dashboard?success=1');
      
    } catch (error) {
      console.error('Settings update error:', error);
      res.redirect('/dashboard?error=1');
    }
  });

  // Remove bot
  app.post('/dashboard/remove', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/streamer');
    }
    
    try {
      const username = req.session.user.login;
      
      // Remove from database and active channels
      await db.removeChannelConfig(req.session.user.id);
      activeChannels.delete(username);
      
      // Actually make the bot leave the Twitch channel!
      const twitchBot = require('./twitchBot');
      const leaveSuccess = await twitchBot.leaveTwitchChannel(username);
      
      console.log(`🗑️ Bot removal requested for: ${username}`);
      console.log(`👋 Bot leave attempt: ${leaveSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      req.session.destroy();
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Remove bot error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Family-friendly mode toggle
  app.post('/dashboard/family-mode', async (req, res) => {
    if (!req.session.user) {
      return res.json({ success: false, error: 'Not authenticated' });
    }
    
    try {
      const { familyFriendly } = req.body;
      const success = await db.setFamilyFriendlySetting(
        'twitch', 
        req.session.user.id, 
        req.session.user.login, 
        familyFriendly
      );
      
      if (success) {
        res.json({ success: true });
      } else {
        res.json({ success: false, error: 'Failed to update setting' });
      }
    } catch (error) {
      console.error('Family-friendly toggle error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Database health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const isHealthy = await db.checkDatabaseHealth();
      res.json({ 
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: isHealthy ? '✅ Connected' : '❌ Connection issues'
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        timestamp: new Date().toISOString(),
        database: '💀 Failed to check',
        error: error.message
      });
    }
  });

  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  // ===========================================
  // KICK OAUTH ROUTES
  // ===========================================

  // Kick Streamer OAuth - Step 1: Show permission explanation then redirect
  app.get('/auth/kick/streamer', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connect Your Kick Channel - AuraFarmBot</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: 
              linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
              url('/assets/aurafarmbot.png') center center;
            background-size: cover;
            background-attachment: fixed;
            background-repeat: no-repeat;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            overflow-x: hidden;
          }
          .container {
            width: 100%;
            max-width: 700px;
            padding: 60px 40px;
            text-align: center;
            position: relative;
            z-index: 2;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          h1 { 
            font-size: 2.5rem; 
            margin-bottom: 20px; 
            font-weight: 700;
            background: linear-gradient(45deg, #ffd700, #ffeb3b, #ff9800);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.7));
            line-height: 1.2;
          }
          .description { 
            font-size: 1.2rem; 
            margin-bottom: 30px; 
            line-height: 1.6; 
            opacity: 0.8;
            max-width: 500px;
            margin-left: auto;
            margin-right: auto;
          }
          .permissions {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 25px;
            margin: 25px 0;
            text-align: left;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
          }
          .permissions:hover {
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .permissions h3 {
            color: #ffd700;
            font-weight: 700;
            margin-bottom: 15px;
            font-size: 1.2rem;
          }
          .permission-item {
            display: flex;
            align-items: center;
            margin: 15px 0;
            font-size: 16px;
            line-height: 1.4;
          }
          .permission-item .icon {
            font-size: 24px;
            margin-right: 15px;
            width: 30px;
            flex-shrink: 0;
          }
          .btn {
            display: inline-block;
            padding: 18px 36px;
            background: rgba(255, 255, 255, 0.9);
            color: #1f2937;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            margin: 10px;
          }
          .btn:hover { 
            background: rgba(255, 255, 255, 1);
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          }
          .btn-secondary { 
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
          }
          .btn-secondary:hover { 
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
          @media (max-width: 768px) {
            .container { padding: 40px 20px; }
            h1 { font-size: 2rem; }
            .permissions { padding: 20px; }
            .permission-item { font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🦶 Connect Your Kick Channel</h1>
          <p class="description">AuraFarmBot needs permission to join your channel and respond to commands.</p>
          
          <div class="permissions">
            <h3>🔐 Required Permissions:</h3>
            <div class="permission-item">
              <span class="icon">👤</span>
              <span><strong>Read user information:</strong> To identify your channel and manage settings</span>
            </div>
            <div class="permission-item">
              <span class="icon">💬</span>
              <span><strong>Write to chat:</strong> To respond to commands and send aura updates</span>
            </div>
          </div>
          
          <div class="permissions">
            <h3>🤖 What AuraFarmBot Will Do:</h3>
            <div class="permission-item">
              <span class="icon">🎮</span>
              <span>Join your Kick channel automatically</span>
            </div>
            <div class="permission-item">
              <span class="icon">💀</span>
              <span>Respond to !aurafarm, !mog, !emote, and other commands</span>
            </div>
            <div class="permission-item">
              <span class="icon">🧠</span>
              <span>Chat with Claude AI when mentioned (@iaurafarmbot)</span>
            </div>
            <div class="permission-item">
              <span class="icon">📊</span>
              <span>Track aura points separately for your channel</span>
            </div>
          </div>
          
          <a href="/auth/kick/streamer/authorize" class="btn">🔗 Connect Channel</a>
          <a href="/" class="btn btn-secondary">Cancel</a>
        </div>
      </body>
      </html>
    `);
  });

  // Actual Kick authorization redirect
  app.get('/auth/kick/streamer/authorize', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = 'user:read+chatroom:write'; // Kick scopes for reading user info and writing to chat
    
    // Store state for verification
    oauthStates.set(state, { 
      timestamp: Date.now(),
      type: 'kick_streamer_auth'
    });
    
    const authUrl = `https://kick.com/oauth2/authorize?` +
      `client_id=${process.env.KICK_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.KICK_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;
    
    res.redirect(authUrl);
  });

  // Kick Streamer OAuth - Step 2: Handle callback and authorize bot for their channel
  app.get('/auth/kick/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error}</p>
          <a href="/" style="color: #53fc18;">← Back to Homepage</a>
        </div>
      `);
    }
    
    if (!oauthStates.has(state)) {
      return res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Invalid Request</h2>
          <p>Security verification failed. Please try again.</p>
          <a href="/" style="color: #53fc18;">← Back to Homepage</a>
        </div>
      `);
    }
    
    oauthStates.delete(state);
    
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://kick.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.KICK_CLIENT_ID,
          client_secret: process.env.KICK_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.KICK_REDIRECT_URI,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenData.message}`);
      }
      
      // Get user info from Kick API
      const userResponse = await fetch('https://kick.com/api/v2/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });
      
      const userData = await userResponse.json();
      const user = userData; // Kick API structure
      
      // Store user session
      req.session.user = {
        id: user.id,
        username: user.username,
        slug: user.slug,
        access_token: tokenData.access_token,
        platform: 'kick'
      };
      
      // Store channel configuration in database
      await db.createChannelConfig(user.id, user.slug, {
        display_name: user.username,
        bot_enabled: true,
        platform: 'kick', // Will be stored in platform column
        settings: {
          farm_cooldown: 24, // hours
          farm_min_reward: 20,
          farm_max_reward: 50,
          duel_enabled: true,
          blessing_enabled: true,
          custom_welcome: `Welcome to ${user.username}'s aura farming community!`,
          custom_flavors: null // Will use defaults
        }
      });
      
      // Add channel to active channels 
      activeChannels.add(user.slug);
      
      // Actually join the channel!
      const kickBot = require('./kickBot');
      const joinSuccess = await kickBot.joinKickChannel(user.slug);
      
      console.log(`🦶 New Kick channel authorized: ${user.slug} (${user.username})`);
      console.log(`🔗 Bot join attempt: ${joinSuccess ? 'SUCCESS' : 'FAILED'}`);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Success - AuraFarmBot Added to Kick!</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: 
                linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)),
                url('/assets/aurafarmbot.png') center center;
              background-size: cover;
              background-attachment: fixed;
              background-repeat: no-repeat;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              overflow-x: hidden;
            }
            .container {
              width: 100%;
              max-width: 700px;
              padding: 60px 40px;
              text-align: center;
              position: relative;
              z-index: 2;
              margin: 0 auto;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 20px;
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            h1 { 
              font-size: 2.5rem; 
              margin-bottom: 20px; 
              font-weight: 700;
              background: linear-gradient(45deg, #ffd700, #ffeb3b, #ff9800);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.7));
              line-height: 1.2;
            }
            .success-message {
              font-size: 1.3rem;
              margin-bottom: 30px;
              color: #53fc18;
              font-weight: 600;
            }
            .status {
              background: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(15px);
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              padding: 25px;
              margin: 25px 0;
              text-align: left;
            }
            .commands {
              background: rgba(0, 0, 0, 0.5);
              backdrop-filter: blur(15px);
              border-radius: 16px;
              border: 1px solid rgba(255, 255, 255, 0.2);
              padding: 25px;
              margin: 25px 0;
              text-align: left;
            }
            .commands h3 {
              color: #ffd700;
              font-weight: 700;
              margin-bottom: 15px;
              font-size: 1.2rem;
            }
            .commands p {
              margin: 10px 0;
              font-family: 'Courier New', monospace;
              background: rgba(255, 255, 255, 0.1);
              padding: 8px 12px;
              border-radius: 6px;
              font-size: 14px;
            }
            .btn {
              display: inline-block;
              padding: 18px 36px;
              background: rgba(255, 255, 255, 0.9);
              color: #1f2937;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 700;
              font-size: 1.1rem;
              transition: all 0.3s ease;
              cursor: pointer;
              border: none;
              backdrop-filter: blur(10px);
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
              margin: 10px;
            }
            .btn:hover { 
              background: rgba(255, 255, 255, 1);
              transform: translateY(-3px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
            }
            .btn-secondary { 
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 2px solid rgba(255, 255, 255, 0.3);
            }
            .btn-secondary:hover { 
              background: rgba(255, 255, 255, 0.2);
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Success!</h1>
            <div class="success-message">AuraFarmBot has been added to your Kick channel!</div>
            
            <div class="status">
              <h3>📊 Status:</h3>
                            <p>🔍 <strong>Look for "iaurafarmbot" in your viewer list!</strong></p>
                <p>The bot should appear in your chat within 30-60 seconds.</p>
            
            <div class="commands">
              <h3>Available Commands:</h3>
              <p><code>!aurafarm</code> - Farm aura (24h cooldown)</p>
              <p><code>!aura [@user]</code> - Check aura balance</p>
              <p><code>!mog @user [amount]</code> - Challenge to mog</p>
              <p><code>!auraboard</code> - View leaderboard</p>
              <p><code>!bless @user [amount]</code> - Give aura to someone</p>
              <p><code>!emote [dance move]</code> - Random brainrot dance celebration</p>
              <p><code>!help</code> - Show command list</p>
              <h3>AI Conversations:</h3>
              <p><code>@iaurafarmbot [message]</code> - Chat with Claude AI</p>
              <p style="font-size: 0.9rem; color: #adadb8; margin-top: 5px;">Just mention the bot to have chaotic brainrot conversations!</p>
              <h3>Multi-Platform Support:</h3>
              <p style="font-size: 0.9rem; color: #adadb8;">Also works on <strong>Telegram</strong> (/commands), <strong>Twitch</strong> (!commands), and <strong>X (Twitter)</strong> (@mentions)</p>
            </div>
            
            <a href="/dashboard" class="btn">⚙️ Customize Settings</a>
            <a href="https://kick.com/${user.slug}" class="btn">🦶 Go to Channel</a>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ Kick OAuth error:', error);
      res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error.message}</p>
          <a href="/auth/kick/streamer" style="color: #53fc18;">← Try Again</a>
        </div>
      `);
    }
  });

  return { activeChannels };
}

module.exports = { setupWebInterface };