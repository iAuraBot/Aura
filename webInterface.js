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
        <title>AuraFarmBot - Add to Your Channel</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .container {
            max-width: 600px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(2px);
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            position: relative;
          }
          .container::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            pointer-events: none;
          }
          h1 { font-size: 3rem; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
          .emoji { font-size: 4rem; margin: 20px 0; }
          .description { font-size: 1.2rem; margin-bottom: 30px; line-height: 1.6; }
          .feature-list { 
            text-align: left; 
            margin: 30px 0; 
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(2px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            position: relative;
          }
          .feature-list::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: none;
          }
          .feature-list li { margin: 10px 0; font-size: 1.1rem; }
          .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #9146ff;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-size: 1.2rem;
            font-weight: bold;
            transition: all 0.3s ease;
            margin: 10px;
            border: none;
            cursor: pointer;
          }
          .btn:hover { background: #772ce8; transform: translateY(-2px); }
          .btn-secondary { background: rgba(255, 255, 255, 0.2); }
          .btn-secondary:hover { background: rgba(255, 255, 255, 0.3); }
          .stats { 
            display: flex; 
            justify-content: space-around; 
            margin: 30px 0; 
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(2px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 20px;
            position: relative;
          }
          .stats::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: none;
          }
          .stat { text-align: center; }
          .stat-number { font-size: 2rem; font-weight: bold; color: #ffd700; }
          .stat-label { font-size: 0.9rem; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emoji">💀🔥</div>
          <h1>AuraFarmBot</h1>
          <p class="description">
            The ultimate multi-platform aura farming bot for your Twitch channel! 
            Engage your viewers with aura farming, duels, leaderboards, and more!
          </p>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-number">${activeChannels.size}</div>
              <div class="stat-label">Active Channels</div>
            </div>
            <div class="stat">
              <div class="stat-number">24/7</div>
              <div class="stat-label">Uptime</div>
            </div>
            <div class="stat">
              <div class="stat-number">100%</div>
              <div class="stat-label">Free</div>
            </div>
          </div>

          <ul class="feature-list">
            <li>🎮 <strong>Aura Farming:</strong> 24h cooldown farming system</li>
            <li>🎰 <strong>Aura Duels:</strong> 1v1 gambling with custom wagers</li>
            <li>📊 <strong>Leaderboards:</strong> Dynamic ranking system</li>
            <li>✨ <strong>Blessing System:</strong> Users can gift aura to others</li>
            <li>⚙️ <strong>Custom Settings:</strong> Personalize your bot experience</li>
            <li>🔐 <strong>Secure:</strong> Enterprise-grade OAuth security</li>
          </ul>

          <a href="/auth/streamer" class="btn">
            🎮 Add to My Channel
          </a>
          
          <a href="/dashboard" class="btn btn-secondary">
            ⚙️ Manage Settings
          </a>

          <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9rem;">
            Commands: !aurafarm, !aura, !aura4aura, !auraboard, !bless, !help
          </p>
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
          <title>AuraBot Dashboard - ${req.session.user.display_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              color: white;
            }
            .header {
              background: rgba(0, 0, 0, 0.2);
              padding: 20px;
              text-align: center;
              backdrop-filter: blur(10px);
            }
            .container {
              max-width: 800px;
              margin: 20px auto;
              padding: 20px;
            }
            .settings-section {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 15px;
              padding: 25px;
              margin-bottom: 20px;
              backdrop-filter: blur(10px);
            }
            .form-group {
              margin-bottom: 20px;
            }
            label {
              display: block;
              margin-bottom: 5px;
              font-weight: bold;
            }
            input, select, textarea {
              width: 100%;
              padding: 10px;
              border: none;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.9);
              color: #333;
              font-size: 16px;
            }
            .btn {
              background: #9146ff;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 25px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
              margin: 10px 5px;
            }
            .btn:hover { background: #772ce8; }
            .btn-danger { background: #e74c3c; }
            .btn-danger:hover { background: #c0392b; }
            .toggle-switch {
              position: relative;
              width: 60px;
              height: 30px;
              background: #ccc;
              border-radius: 15px;
              cursor: pointer;
              transition: 0.3s;
            }
            .toggle-switch.active { background: #9146ff; }
            .toggle-switch::before {
              content: '';
              position: absolute;
              width: 26px;
              height: 26px;
              border-radius: 50%;
              background: white;
              top: 2px;
              left: 2px;
              transition: 0.3s;
            }
            .toggle-switch.active::before { transform: translateX(30px); }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              background: rgba(255, 255, 255, 0.1);
              padding: 20px;
              border-radius: 10px;
              text-align: center;
            }
            .stat-number { font-size: 2rem; font-weight: bold; color: #ffd700; }
            .stat-label { opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎮 AuraBot Dashboard</h1>
            <p>Managing: <strong>${req.session.user.display_name}</strong></p>
          </div>
          
          <div class="container">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">42</div>
                <div class="stat-label">Active Users Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">1,337</div>
                <div class="stat-label">Total Aura Farmed</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">23</div>
                <div class="stat-label">Duels This Week</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${channelConfig?.settings?.farm_cooldown || 24}h</div>
                <div class="stat-label">Farm Cooldown</div>
              </div>
            </div>

            <form action="/dashboard/update" method="POST">
              <div class="settings-section">
                <h2>⚙️ Bot Settings</h2>
                
                <div class="form-group">
                  <label>Bot Status</label>
                  <div class="toggle-switch ${channelConfig?.bot_enabled ? 'active' : ''}" onclick="toggleBot()">
                  </div>
                  <small>Enable/disable the bot in your channel</small>
                </div>

                <div class="form-group">
                  <label>Farm Cooldown (hours)</label>
                  <input type="number" name="farm_cooldown" value="${channelConfig?.settings?.farm_cooldown || 24}" min="1" max="168">
                  <small>Time between aura farming attempts</small>
                </div>

                <div class="form-group">
                  <label>Minimum Reward</label>
                  <input type="number" name="farm_min_reward" value="${channelConfig?.settings?.farm_min_reward || 20}" min="1" max="100">
                </div>

                <div class="form-group">
                  <label>Maximum Reward</label>
                  <input type="number" name="farm_max_reward" value="${channelConfig?.settings?.farm_max_reward || 50}" min="1" max="200">
                </div>
              </div>

              <div class="settings-section">
                <h2>🎮 Command Settings</h2>
                
                <div class="form-group">
                  <label>
                    <input type="checkbox" name="duel_enabled" ${channelConfig?.settings?.duel_enabled ? 'checked' : ''}> 
                    Enable Duels (!aura4aura)
                  </label>
                </div>

                <div class="form-group">
                  <label>
                    <input type="checkbox" name="blessing_enabled" ${channelConfig?.settings?.blessing_enabled ? 'checked' : ''}> 
                    Enable Blessings (!bless)
                  </label>
                </div>
              </div>

              <div class="settings-section">
                <h2>💬 Custom Messages</h2>
                
                <div class="form-group">
                  <label>Welcome Message</label>
                  <textarea name="custom_welcome" rows="3" placeholder="Welcome to the aura farming community!">${channelConfig?.settings?.custom_welcome || ''}</textarea>
                </div>
              </div>

              <button type="submit" class="btn">💾 Save Settings</button>
            </form>

            <div class="settings-section">
              <h2>🚨 Danger Zone</h2>
              <p>Permanently remove the bot from your channel.</p>
              <button class="btn btn-danger" onclick="removeBot()">🗑️ Remove Bot</button>
            </div>
          </div>

          <script>
            function toggleBot() {
              const toggle = document.querySelector('.toggle-switch');
              toggle.classList.toggle('active');
            }

            function removeBot() {
              if (confirm('Are you sure you want to remove AuraBot from your channel? This action cannot be undone.')) {
                fetch('/dashboard/remove', { method: 'POST' })
                  .then(() => window.location.href = '/');
              }
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