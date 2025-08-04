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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a3d2e 0%, #2d5d43 25%, #4a7c59 50%, #76b947 75%, #9fff7a 100%);
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
          }
          .bot-icon {
            width: 120px;
            height: 120px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 40px;
            font-size: 4rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          h1 { 
            font-size: 4rem; 
            margin-bottom: 20px; 
            font-weight: 800;
            background: linear-gradient(45deg, #ffd700, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: none;
            line-height: 1.1;
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
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 30px 20px;
            text-align: center;
            transition: transform 0.3s ease;
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
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 25px;
            text-align: left;
            transition: all 0.3s ease;
          }
          .feature-card:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.12);
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="bot-icon">💀🔥</div>
          <h1>iAuraFarmBot</h1>
          <h2 class="subtitle">Your Chat Made Brainrot</h2>
          <p class="description">
            The most unhinged aura farming bot for maximum chaos and engagement! 
            Turn your Twitch chat into pure brainrot energy with epic duels and farming.
          </p>
          
          <div class="cta-buttons">
            <a href="/auth/streamer" class="btn">Add to Chat</a>
            ${req.session.user ? `<a href="/dashboard" class="btn btn-secondary">Dashboard</a>` : `<a href="#features" class="btn btn-secondary">Learn More</a>`}
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${activeChannels.size}</div>
              <div class="stat-label">Active Channels</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">24/7</div>
              <div class="stat-label">Uptime</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">∞</div>
              <div class="stat-label">Chaos Level</div>
            </div>
          </div>

          <div class="features-grid" id="features">
            <div class="feature-card">
              <span class="feature-emoji">✨</span>
              <div class="feature-title">Aura Farming</div>
              <div class="feature-desc">24h cooldown farming system with RNG chaos and newbie protection</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">💀</span>
              <div class="feature-title">really goin aura 4 aura huh?</div>
              <div class="feature-desc">1v1 showdowns with custom stakes for maximum brainrot energy</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">📊</span>
              <div class="feature-title">Leaderboards</div>
              <div class="feature-desc">Dynamic ranking system with AURA MOGGERS and epic fails</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">🙏</span>
              <div class="feature-title">Blessing System</div>
              <div class="feature-desc">Users can gift aura to others with maximum brainrot blessings</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">⚙️</span>
              <div class="feature-title">Custom Settings</div>
              <div class="feature-desc">Personalize cooldowns, rewards, and chaos levels per channel</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">🔐</span>
              <div class="feature-title">Secure OAuth</div>
              <div class="feature-desc">Enterprise-grade security with easy self-service setup</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Streamer OAuth - Step 1: Generate authorization URL
  app.get('/auth/streamer', (req, res) => {
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
      
      // Add channel to active channels (this would trigger bot to join)
      activeChannels.add(user.login);
      
      // In a real implementation, you'd signal the bot to join this channel
      // For now, we'll simulate it
      console.log(`🎮 New channel authorized: ${user.login} (${user.display_name})`);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Success - AuraFarmBot Added!</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0;
              color: white;
            }
            .container {
              max-width: 500px;
              padding: 40px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 20px;
              text-align: center;
              backdrop-filter: blur(10px);
            }
            .success-icon { font-size: 4rem; margin-bottom: 20px; }
            h1 { margin-bottom: 20px; }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: #9146ff;
              color: white;
              text-decoration: none;
              border-radius: 25px;
              margin: 10px;
              font-weight: bold;
            }
            .btn:hover { background: #772ce8; }
            .commands {
              background: rgba(0, 0, 0, 0.2);
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">🎉💀</div>
            <h1>AuraBot Successfully Added!</h1>
            <p><strong>Channel:</strong> ${user.display_name}</p>
            <p>The bot will join your channel within a few minutes.</p>
            
            <div class="commands">
              <h3>Available Commands:</h3>
              <p><code>!aurafarm</code> - Farm aura (24h cooldown)</p>
              <p><code>!aura [@user]</code> - Check aura balance</p>
              <p><code>!aura4aura @user [amount]</code> - Challenge to duel</p>
              <p><code>!auraboard</code> - View leaderboard</p>
              <p><code>!bless @user [amount]</code> - Give aura to someone</p>
              <p><code>!help</code> - Show command list</p>
            </div>
            
            <a href="/dashboard" class="btn">⚙️ Customize Settings</a>
            <a href="https://twitch.tv/${user.login}" class="btn">🎮 Go to Channel</a>
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Streamer OAuth error:', error);
      res.send(`
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
          <h2>❌ Setup Failed</h2>
          <p>Error: ${error.message}</p>
          <a href="/" style="color: #9146ff;">← Try Again</a>
        </div>
      `);
    }
  });

  // Dashboard - Manage bot settings
  app.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
      return res.redirect('/auth/streamer');
    }
    
    try {
      const channelConfig = await db.getChannelConfig(req.session.user.id);
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>iAuraFarmBot Dashboard - ${req.session.user.display_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0f1f1a 0%, #1a3d2e 25%, #2d5d43 50%, #4a7c59 75%, #5a8b3a 100%);
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
                    <div class="command-item">
                      <div class="command-name">!aurafarm</div>
                      <div class="command-desc">Farm aura with RNG chaos</div>
                      <div class="command-usage">24h cooldown</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!aura4aura</div>
                      <div class="command-desc">really goin aura 4 aura huh?</div>
                      <div class="command-usage">!aura4aura @user [amount]</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!auraboard</div>
                      <div class="command-desc">See the aura moggers</div>
                      <div class="command-usage">Shows leaderboard</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!bless</div>
                      <div class="command-desc">Gift aura to someone</div>
                      <div class="command-usage">!bless @user [amount]</div>
                    </div>
                    <div class="command-item">
                      <div class="command-name">!aura</div>
                      <div class="command-desc">Check aura balance</div>
                      <div class="command-usage">!aura [@user]</div>
                    </div>
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
                  <label>Custom Welcome Message</label>
                  <textarea name="custom_welcome" rows="3" placeholder="Welcome to ${req.session.user.display_name}'s aura farming community! 💀🔥">${channelConfig?.settings?.custom_welcome || ''}</textarea>
                  <small>Message shown to new farmers (leave empty for default brainrot message)</small>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid #2f2f35;">
                  <div>
                    <button type="submit" class="btn">💾 Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="resetToDefaults()">🔄 Reset to Defaults</button>
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
              if (confirm('⚠️ Remove iAuraFarmBot from your channel?\\n\\nThis will:\\n• Stop the bot from responding to commands\\n• Delete all your settings\\n• Remove your channel from the active list\\n\\nThis action CANNOT be undone!')) {
                fetch('/dashboard/remove', { method: 'POST' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('💀 Bot removed successfully! Thanks for trying iAuraFarmBot!');
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

  // Update settings
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
      await db.removeChannelConfig(req.session.user.id);
      activeChannels.delete(req.session.user.login);
      req.session.destroy();
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Remove bot error:', error);
      res.json({ success: false, error: error.message });
    }
  });

  // Logout
  app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
  });

  return { activeChannels };
}

module.exports = { setupWebInterface };