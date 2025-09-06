// oauth.js - Secure Twitch OAuth implementation + Web Interface
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const { setupWebInterface } = require('./webInterface');
const claude = require('./lib/claude-enhanced');

let app = null;
let server = null;

// OAuth state storage (in production, use Redis or database)
const oauthStates = new Map();

function initializeOAuth() {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    console.log('⚠️ Twitch OAuth credentials not found. OAuth server not started.');
    return null;
  }

  app = express();
  
  // Add Sentry middleware (if available)
  const sentryMiddleware = claude.getSentryMiddleware();
  app.use(sentryMiddleware.requestHandler);
  
  app.use(express.json());

  // Setup web interface for streamers to add bot to their channels
  const { activeChannels } = setupWebInterface(app);

  // Bot OAuth URL (for bot account authorization)
  app.get('/auth/twitch', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const scopes = 'chat:read chat:edit'; // FIXED: chat:edit is the correct scope for sending messages
    
    // Store state for verification
    oauthStates.set(state, { timestamp: Date.now() });
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${process.env.TWITCH_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.TWITCH_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;
    
    console.log('🔐 OAuth URL generated for manual authorization');
    res.json({ 
      authUrl,
      instructions: 'Visit this URL to authorize your bot account',
      note: 'Make sure to login with your BOT account, not your main account!'
    });
  });

  // Handle OAuth callback
  app.get('/auth/twitch/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('❌ OAuth error:', error);
      return res.status(400).json({ error: 'Authorization failed', details: error });
    }
    
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing authorization code or state' });
    }
    
    // Verify state
    if (!oauthStates.has(state)) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    // Clean up state
    oauthStates.delete(state);
    
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.TWITCH_REDIRECT_URI,
        }),
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenData.message || 'Unknown error'}`);
      }
      
      // Get user info to verify it's the correct account
      const userResponse = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID,
        },
      });
      
      const userData = await userResponse.json();
      const username = userData.data[0]?.login;
      
      console.log('✅ OAuth successful for user:', username);
      console.log('🔑 Access token obtained (expires in', tokenData.expires_in, 'seconds)');
      
      // Store token securely (in production, encrypt and store in database)
      const secureToken = `oauth:${tokenData.access_token}`;
      
      res.json({
        success: true,
        message: `OAuth successful for @${username}`,
        instructions: [
          '🔐 Add this to your Railway environment variables:',
          `TWITCH_BOT_USERNAME=${username}`,
          `TWITCH_OAUTH_TOKEN=${secureToken}`,
          `TWITCH_CHANNELS=your_channel_name`,
          '',
          '⚠️ SECURITY WARNING: Store these credentials securely!',
          '💀 Token expires in ' + Math.floor(tokenData.expires_in / 3600) + ' hours'
        ],
        token_info: {
          username: username,
          expires_in: tokenData.expires_in,
          scopes: tokenData.scope
        }
      });
      
    } catch (error) {
      console.error('❌ OAuth token exchange failed:', error);
      res.status(500).json({ 
        error: 'Token exchange failed', 
        details: error.message 
      });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      service: 'AuraFarmBot OAuth Server',
      timestamp: new Date().toISOString()
    });
  });

  // Add Sentry error handler (must be last middleware)
  app.use(sentryMiddleware.errorHandler);

  // Start server - Railway provides PORT dynamically
  const port = process.env.PORT || 3080;
  console.log(`🔍 Using port: ${port} (Railway PORT: ${process.env.PORT})`);
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`🔐 OAuth server running on port ${port}`);
    console.log(`🌍 OAuth URL: https://aura-production-877f.up.railway.app/auth/twitch`);
    console.log(`🔗 Health check: https://aura-production-877f.up.railway.app/health`);
  });

  return app;
}

function stopOAuth() {
  if (server) {
    server.close();
    console.log('🛑 OAuth server stopped');
  }
}

module.exports = { initializeOAuth, stopOAuth };