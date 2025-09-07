// webInterface.js - Comprehensive web interface for AuraBot management
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const db = require('./db');
const auraLogic = require('./auraLogic');
const claude = require('./lib/claude-enhanced');

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

  // Helper function to generate consistent hacker terminal UI
  function generateHackerPage(title, content, additionalCSS = '', additionalJS = '') {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          @keyframes terminal-glow {
            0%, 100% { text-shadow: 0 0 5px #00bfff, 0 0 10px #00bfff, 0 0 15px #00bfff; }
            50% { text-shadow: 0 0 2px #00bfff, 0 0 5px #00bfff, 0 0 8px #00bfff; }
          }
          
          @keyframes cursor-blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          body {
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            background: #0a0a0a;
            background-image: 
              radial-gradient(circle at 25% 25%, #001122 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, #000a22 0%, transparent 50%),
              linear-gradient(0deg, #000000 0%, #001a22 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00bfff;
            overflow-x: hidden;
            position: relative;
          }
          
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 191, 255, 0.03) 2px,
              rgba(0, 191, 255, 0.03) 4px
            );
            pointer-events: none;
            z-index: 1;
          }
          
          .container {
            width: 100%;
            padding: 40px;
            text-align: left;
            position: relative;
            z-index: 2;
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00bfff;
            border-radius: 8px;
            box-shadow: 
              0 0 20px rgba(0, 191, 255, 0.3),
              inset 0 0 20px rgba(0, 191, 255, 0.1);
          }
          
          .terminal-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #00bfff;
          }
          
          .terminal-dots {
            display: flex;
            gap: 8px;
            margin-right: 15px;
          }
          
          .terminal-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff5f56;
          }
          
          .terminal-dot:nth-child(2) { background: #ffbd2e; }
          .terminal-dot:nth-child(3) { background: #27ca3f; }
          
          .terminal-title {
            color: #00bfff;
            font-weight: 500;
            font-size: 14px;
          }
          
          .terminal-prompt {
            color: #888;
            margin-bottom: 20px;
            font-size: 12px;
          }
          
          h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 15px;
            animation: terminal-glow 2s ease-in-out infinite alternate;
          }
          
          .cursor {
            display: inline-block;
            width: 2px;
            height: 1em;
            background: #00bfff;
            margin-left: 5px;
            animation: cursor-blink 1s infinite;
          }
          
          .subtitle {
            color: #888;
            margin-bottom: 10px;
            font-size: 1rem;
          }
          
          .description {
            color: #ccc;
            margin: 20px 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
          }
          
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: transparent;
            color: #00bfff;
            text-decoration: none;
            border: 2px solid #00bfff;
            border-radius: 4px;
            font-weight: 500;
            font-size: 14px;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            margin: 10px 10px 10px 0;
          }
          
          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: #00bfff;
            transition: left 0.3s ease;
            z-index: -1;
          }
          
          .btn:hover::before {
            left: 0;
          }
          
          .btn:hover { 
            color: #000;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.5);
          }
          
          .btn-primary { 
            background: #00bfff;
            color: #000;
          }
          
          .btn-primary:hover {
            background: transparent;
            color: #00bfff;
          }
          
          .btn-secondary { 
            border-color: #ff6b6b;
            color: #ff6b6b;
          }
          
          .btn-secondary::before {
            background: #ff6b6b;
          }
          
          .btn-secondary:hover { 
            color: #000;
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
          }

          .success-message {
            color: #27ca3f;
            font-size: 1.2rem;
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #27ca3f;
            border-radius: 4px;
            background: rgba(39, 202, 63, 0.1);
          }

          .error-message {
            color: #ff5f56;
            font-size: 1.2rem;
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ff5f56;
            border-radius: 4px;
            background: rgba(255, 95, 86, 0.1);
          }

          .info-section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #333;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.5);
          }

          .info-section h3 {
            color: #00bfff;
            margin-bottom: 15px;
            font-size: 1.1rem;
          }

          .info-section p, .info-section li {
            color: #ccc;
            line-height: 1.5;
            margin-bottom: 8px;
          }

          .info-section ul {
            list-style: none;
            padding: 0;
          }

          .info-section li::before {
            content: '> ';
            color: #00bfff;
            font-weight: bold;
          }

          .button-group {
            margin: 30px 0;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
          }

          .warning {
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
          }

          .warning h3 {
            color: #ffc107;
            margin-bottom: 10px;
          }

          .warning-content {
            color: #ccc;
            font-size: 0.9rem;
            line-height: 1.4;
          }

          ${additionalCSS}
        </style>
        ${additionalJS}
      </head>
      <body>
        <div class="container">
          <div class="terminal-header">
            <div class="terminal-dots">
              <div class="terminal-dot"></div>
              <div class="terminal-dot"></div>
              <div class="terminal-dot"></div>
            </div>
            <div class="terminal-title">root@airic:~$ ./execute_protocol.sh</div>
          </div>
          
          <div class="terminal-prompt">Executing AIRIC Terminal Protocol...</div>
          
          ${content}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #333;">
            <a href="/" class="btn">← Back to Terminal</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // All the main page content from the original file (lines 312-1467)
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>AIRIC - Terminal Interface</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700;800&family=Fira+Code:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          @keyframes terminal-glow {
            0%, 100% { text-shadow: 0 0 5px #00bfff, 0 0 10px #00bfff, 0 0 15px #00bfff; }
            50% { text-shadow: 0 0 2px #00bfff, 0 0 5px #00bfff, 0 0 8px #00bfff; }
          }
          
          @keyframes cursor-blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          
          body {
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            background: #0a0a0a;
            background-image: 
              radial-gradient(circle at 25% 25%, #001122 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, #000a22 0%, transparent 50%),
              linear-gradient(0deg, #000000 0%, #001a22 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00bfff;
            overflow-x: hidden;
            position: relative;
          }
          
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 191, 255, 0.03) 2px,
              rgba(0, 191, 255, 0.03) 4px
            );
            pointer-events: none;
            z-index: 1;
          }
          .container {
            width: 100%;
            padding: 40px;
            text-align: left;
            position: relative;
            z-index: 2;
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00bfff;
            border-radius: 8px;
            box-shadow: 
              0 0 20px rgba(0, 191, 255, 0.3),
              inset 0 0 20px rgba(0, 191, 255, 0.1);
          }
          
          .terminal-header {
            display: flex;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #00bfff;
          }
          
          .terminal-dots {
            display: flex;
            gap: 8px;
            margin-right: 15px;
          }
          
          .terminal-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff5f56;
          }
          
          .terminal-dot:nth-child(2) { background: #ffbd2e; }
          .terminal-dot:nth-child(3) { background: #27ca3f; }
          
          .terminal-title {
            font-size: 14px;
            color: #00bfff;
            font-weight: 500;
          }
          .terminal-prompt {
            color: #00bfff;
            margin-bottom: 20px;
            font-size: 16px;
            font-weight: 500;
          }
          
          .terminal-prompt::before {
            content: '$ ';
            color: #ff6b6b;
          }
          
          .ascii-art {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            line-height: 1.2;
            color: #00bfff;
            margin-bottom: 30px;
            white-space: pre;
            animation: terminal-glow 2s infinite;
          }
          
          h1 { 
            font-size: 2.5rem; 
            margin-bottom: 20px; 
            font-weight: 700;
            color: #00bfff;
            text-shadow: 0 0 10px #00bfff;
            font-family: 'JetBrains Mono', monospace;
            animation: terminal-glow 3s infinite;
          }
          
          .cursor {
            display: inline-block;
            width: 10px;
            height: 20px;
            background: #00bfff;
            animation: cursor-blink 1s infinite;
            margin-left: 5px;
          }
          .subtitle {
            font-size: 1.2rem;
            margin-bottom: 30px;
            font-weight: 400;
            color: #888;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .description { 
            font-size: 1rem; 
            margin-bottom: 30px; 
            line-height: 1.6; 
            color: #00bfff;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .terminal-output {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #333;
            border-radius: 4px;
            padding: 20px;
            margin: 20px 0;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
          }
          .cta-buttons {
            display: flex;
            gap: 15px;
            justify-content: flex-start;
            margin-bottom: 40px;
            flex-wrap: wrap;
          }
          
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: transparent;
            color: #00bfff;
            text-decoration: none;
            border: 2px solid #00bfff;
            border-radius: 4px;
            font-weight: 500;
            font-size: 14px;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
          }
          
          .btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: #00bfff;
            transition: left 0.3s ease;
            z-index: -1;
          }
          
          .btn:hover::before {
            left: 0;
          }
          
          .btn:hover { 
            color: #000;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.5);
          }
          
          .btn-primary { 
            background: #00bfff;
            color: #000;
          }
          
          .btn-primary:hover {
            background: transparent;
            color: #00bfff;
          }
          
          .btn-secondary { 
            border-color: #ff6b6b;
            color: #ff6b6b;
          }
          
          .btn-secondary::before {
            background: #ff6b6b;
          }
          
          .btn-secondary:hover { 
            color: #000;
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
          }

          /* Platform Connection Styles */
          .platform-connections {
            margin: 50px 0;
            padding: 30px 0;
            border-top: 1px solid #333;
          }

          .connection-header {
            margin-bottom: 30px;
          }

          .connection-header h2 {
            color: #00bfff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.5rem;
            margin-bottom: 8px;
            animation: terminal-glow 2s ease-in-out infinite alternate;
          }

          .connection-subtitle {
            color: #888;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
          }

          .platform-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 25px;
            margin-top: 25px;
          }

          .platform-card {
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #333;
            border-radius: 8px;
            padding: 25px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .platform-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 191, 255, 0.1), transparent);
            transition: left 0.5s ease;
          }

          .platform-card:hover::before {
            left: 100%;
          }

          .platform-card:hover {
            border-color: #00bfff;
            box-shadow: 0 0 25px rgba(0, 191, 255, 0.3);
            transform: translateY(-2px);
          }

          .twitch-card:hover {
            border-color: #9146ff;
            box-shadow: 0 0 25px rgba(145, 70, 255, 0.3);
          }

          .kick-card:hover {
            border-color: #53fc18;
            box-shadow: 0 0 25px rgba(83, 252, 24, 0.3);
          }

          .platform-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            background: rgba(0, 191, 255, 0.1);
            border-radius: 8px;
            margin-bottom: 20px;
            color: #00bfff;
          }

          .twitch-card .platform-icon {
            background: rgba(145, 70, 255, 0.1);
            color: #9146ff;
          }

          .kick-card .platform-icon {
            background: rgba(83, 252, 24, 0.1);
            color: #53fc18;
          }

          .platform-info h3 {
            color: #00bfff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.1rem;
            margin-bottom: 10px;
            font-weight: 600;
          }

          .twitch-card .platform-info h3 {
            color: #9146ff;
          }

          .kick-card .platform-info h3 {
            color: #53fc18;
          }

          .platform-info p {
            color: #ccc;
            font-size: 0.9rem;
            margin-bottom: 15px;
            line-height: 1.4;
          }

          .platform-features {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 20px;
          }

          .platform-features span {
            color: #888;
            font-size: 0.8rem;
            font-family: 'JetBrains Mono', monospace;
          }

          .platform-btn {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: transparent;
            border: 2px solid #00bfff;
            border-radius: 6px;
            color: #00bfff;
            text-decoration: none;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 500;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .platform-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: #00bfff;
            transition: left 0.3s ease;
            z-index: -1;
          }

          .platform-btn:hover::before {
            left: 0;
          }

          .platform-btn:hover {
            color: #000;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.5);
          }

          .twitch-btn {
            border-color: #9146ff;
            color: #9146ff;
          }

          .twitch-btn::before {
            background: #9146ff;
          }

          .twitch-btn:hover {
            box-shadow: 0 0 20px rgba(145, 70, 255, 0.5);
          }

          .kick-btn {
            border-color: #53fc18;
            color: #53fc18;
          }

          .kick-btn::before {
            background: #53fc18;
          }

          .kick-btn:hover {
            box-shadow: 0 0 20px rgba(83, 252, 24, 0.5);
          }

          .btn-text {
            font-size: 0.9rem;
          }

          .btn-arrow {
            font-size: 1.2rem;
            transition: transform 0.3s ease;
          }

          .platform-btn:hover .btn-arrow {
            transform: translateX(5px);
          }

          /* BACKROOMS CHAT STYLES */
          .backrooms-chat-container {
            margin: 60px auto;
            max-width: 800px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00bfff;
            border-radius: 15px;
            box-shadow: 
              0 0 30px rgba(0, 191, 255, 0.3),
              inset 0 0 30px rgba(0, 191, 255, 0.1);
            overflow: hidden;
            position: relative;
          }

          .backrooms-header {
            background: linear-gradient(45deg, rgba(0, 191, 255, 0.2), rgba(0, 0, 0, 0.8));
            padding: 15px 20px;
            border-bottom: 1px solid #00bfff;
          }

          .backrooms-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .glitch-text {
            font-family: 'JetBrains Mono', monospace;
            font-size: 1.2rem;
            color: #00bfff;
            text-shadow: 0 0 10px #00bfff;
            animation: glitch 2s infinite;
          }

          @keyframes glitch {
            0%, 100% { transform: translateX(0); }
            10% { transform: translateX(-2px); }
            20% { transform: translateX(2px); }
            30% { transform: translateX(-1px); }
            40% { transform: translateX(1px); }
            50% { transform: translateX(0); }
          }

          .connection-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            color: #888;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            background: #00bfff;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }

          .backrooms-messages {
            height: 300px;
            overflow-y: auto;
            padding: 20px;
            background: rgba(0, 0, 0, 0.7);
            font-family: 'JetBrains Mono', monospace;
          }

          .backrooms-messages::-webkit-scrollbar {
            width: 8px;
          }

          .backrooms-messages::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
          }

          .backrooms-messages::-webkit-scrollbar-thumb {
            background: #00bfff;
            border-radius: 4px;
          }

          /* MOBILE RESPONSIVENESS */
          @media (max-width: 768px) {
            body {
              padding: 10px;
            }
            
            .container {
              max-width: 100%;
              margin: 0;
              border-radius: 0;
              min-height: 100vh;
            }
            
            .backrooms-chat-container {
              margin: 20px 10px;
              max-width: calc(100vw - 20px);
              border-radius: 8px;
            }
            
            .backrooms-messages {
              height: 250px; /* Shorter on mobile */
              padding: 15px;
              font-size: 12px;
              line-height: 1.4;
              /* Ensure scrolling works on mobile */
              -webkit-overflow-scrolling: touch;
              overflow-y: scroll;
            }
            
            .backrooms-input-container {
              padding: 15px;
              flex-direction: column;
              gap: 10px;
            }
            
            .backrooms-input {
              font-size: 14px;
              padding: 12px;
              margin-bottom: 10px;
            }
            
            .backrooms-send-btn {
              width: 100%;
              padding: 12px;
              font-size: 14px;
            }
            
            /* Fix viewport issues on mobile */
            .terminal-window {
              margin: 20px 0;
              border-radius: 8px;
            }
            
            .platform-card {
              margin: 10px 0;
              padding: 20px;
            }
            
            /* Ensure text doesn't overflow */
            .message {
              word-wrap: break-word;
              overflow-wrap: break-word;
              max-width: 100%;
            }
          }

          @media (max-width: 480px) {
            .backrooms-chat-container {
              margin: 10px 5px;
              max-width: calc(100vw - 10px);
            }
            
            .backrooms-messages {
              height: 200px;
              padding: 10px;
              font-size: 11px;
            }
            
            .backrooms-input {
              font-size: 12px;
              padding: 10px;
            }
            
            .backrooms-send-btn {
              padding: 10px;
              font-size: 12px;
            }
          }

          .system-message, .ai-message, .user-message {
            margin-bottom: 15px;
            line-height: 1.4;
            animation: messageSlide 0.3s ease-out;
          }

          @keyframes messageSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .timestamp {
            color: #666;
            font-size: 0.8rem;
            margin-right: 8px;
          }

          .username {
            color: #00bfff;
            font-weight: bold;
            margin-right: 8px;
          }

          .system-message .message-text {
            color: #888;
            font-style: italic;
          }

          .ai-message .message-text {
            color: #fff;
          }

          .user-message .username {
            color: #ffd700;
          }

          .user-message .message-text {
            color: #ddd;
          }

          .backrooms-input-container {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background: rgba(0, 0, 0, 0.8);
            border-top: 1px solid #00bfff;
            gap: 10px;
          }

          .input-prompt {
            color: #00bfff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            white-space: nowrap;
          }

          #chatInput {
            flex: 1;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00bfff;
            border-radius: 8px;
            padding: 10px 15px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
          }

          #chatInput:focus {
            outline: none;
            box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
          }

          .send-btn {
            background: #00bfff;
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .send-btn:hover {
            background: #0099cc;
            box-shadow: 0 0 15px rgba(0, 191, 255, 0.5);
          }

          .typing-indicator {
            padding: 10px 20px;
            background: rgba(0, 0, 0, 0.5);
            border-top: 1px solid rgba(0, 191, 255, 0.3);
          }

          .typing-dots span {
            animation: typingDots 1.4s infinite;
            color: #00bfff;
          }

          .typing-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typingDots {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
          }

          /* Terminal Window Styles for Demo */
          .terminal-window {
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00bfff;
            border-radius: 8px;
            margin: 30px 0;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0, 191, 255, 0.3);
          }

          .terminal-window .terminal-header {
            background: rgba(0, 191, 255, 0.1);
            padding: 10px 15px;
            border-bottom: 1px solid #00bfff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0;
          }

          .terminal-controls {
            display: flex;
            gap: 8px;
          }

          .control {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ff5f56;
          }

          .control.maximize { background: #ffbd2e; }
          .control.close { background: #27ca3f; }

          .terminal-content {
            padding: 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
          }

          .chat-message, .bot-response {
            margin-bottom: 15px;
            display: flex;
            gap: 10px;
          }

          .chat-message .username {
            color: #ffd700;
            font-weight: bold;
          }

          .chat-message .message {
            color: #ccc;
          }

          .bot-response .bot-name {
            color: #00bfff;
            font-weight: bold;
          }

          .bot-response .response {
            color: #fff;
          }

          .terminal-prompt {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 20px;
          }

          .prompt-symbol {
            color: #00bfff;
            font-weight: bold;
          }

          .typing-cursor {
            color: #00bfff;
            animation: cursor-blink 1s infinite;
          }
        </style>
        <script>
          // BACKROOMS CHAT FUNCTIONALITY
          document.addEventListener('DOMContentLoaded', function() {
            const chatInput = document.getElementById('chatInput');
            const sendButton = document.getElementById('sendButton');
            const chatMessages = document.getElementById('chatMessages');
            const typingIndicator = document.getElementById('typingIndicator');

            if (chatInput && sendButton && chatMessages) {
              // Send message function
              async function sendMessage() {
                const message = chatInput.value.trim();
                if (!message) return;

                // Add user message
                addMessage('user', 'visitor', message);
                chatInput.value = '';

                // Show typing indicator
                showTyping();

                try {
                  // Send to AIRIC backend
                  const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      message: message,
                      platform: 'backrooms',
                      userId: 'visitor_' + Date.now()
                    })
                  });

                  const data = await response.json();
                  
                  // Hide typing indicator
                  hideTyping();

                  if (data.reply) {
                    // Add AI response with typing effect
                    setTimeout(() => {
                      addMessage('ai', 'AIRIC', data.reply);
                    }, 500);
                  }
                } catch (error) {
                  hideTyping();
                  addMessage('system', 'ERROR', 'Connection to the void failed... try again');
                }
              }

              // Add message to chat
              function addMessage(type, username, text) {
                const messageDiv = document.createElement('div');
                messageDiv.className = type + '-message';
                
                const timestamp = new Date().toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                });

                messageDiv.innerHTML = \`
                  <span class="timestamp">[\${timestamp}]</span>
                  <span class="username">\${username}:</span>
                  <span class="message-text">\${text}</span>
                \`;

                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }

              // Show typing indicator
              function showTyping() {
                if (typingIndicator) {
                  typingIndicator.style.display = 'block';
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }
              }

              // Hide typing indicator
              function hideTyping() {
                if (typingIndicator) {
                  typingIndicator.style.display = 'none';
                }
              }

              // Mobile-specific improvements
              function handleMobileScrolling() {
                // Prevent body scroll when scrolling in chat
                chatMessages.addEventListener('touchstart', function(e) {
                  e.stopPropagation();
                });
                
                chatMessages.addEventListener('touchmove', function(e) {
                  e.stopPropagation();
                });

                // Handle virtual keyboard on mobile
                if (window.visualViewport) {
                  window.visualViewport.addEventListener('resize', function() {
                    const viewportHeight = window.visualViewport.height;
                    if (viewportHeight < window.innerHeight * 0.75) {
                      // Keyboard is likely open - adjust chat height
                      chatMessages.style.height = Math.max(150, viewportHeight * 0.3) + 'px';
                    } else {
                      // Keyboard closed - restore normal height
                      chatMessages.style.height = '';
                    }
                  });
                }
              }

              // Initialize mobile improvements
              if ('ontouchstart' in window) {
                handleMobileScrolling();
              }

              // Event listeners
              sendButton.addEventListener('click', sendMessage);
              chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              });

              // Auto-focus input
              chatInput.focus();
            }
          });
        </script>
      </head>
      <body>
        <div class="container">
          <div class="terminal-header">
            <div class="terminal-dots">
              <div class="terminal-dot"></div>
              <div class="terminal-dot"></div>
              <div class="terminal-dot"></div>
            </div>
            <div class="terminal-title">root@airic:~$ ./initialize_chaos.sh</div>
          </div>
          
          <div class="terminal-prompt">Initializing AIRIC Terminal Interface...</div>
          
          <div class="ascii-art">
     ████████╗ ██╗██████╗ ██╗ ██████╗
    ██╔═══██╗██║██╔══██╗██║██╔═══╝
    ███████╔╝██║██████╔╝██║██║     
    ██╔═══██╗██║██╔═══██╗██║██║     
    ██║  ██║██║██║  ██║██║╚██████╗
    ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝
          </div>
          
          <h1>AIRIC TERMINAL<span class="cursor"></span></h1>
          <div class="subtitle"># Multi-platform chaos deployment system</div>
          <div class="description">
            > Executing unhinged AI protocols across Telegram, Twitch, and X<br/>
            > Status: ONLINE | Chaos Level: MAXIMUM | Targets: ACQUIRED
          </div>

          
          <div class="cta-buttons">
            <a href="/demo" class="btn btn-primary">$ ./run_demo.sh</a>
            <a href="#features" class="btn btn-secondary">$ ./view_modules.sh</a>
            ${req.session.user ? '<a href="/dashboard" class="btn btn-secondary">$ ./access_dashboard.sh</a>' : ''}
          </div>

          <!-- PLATFORM CONNECTION SECTION -->
          <div class="platform-connections">
            <div class="connection-header">
              <h2>$ ./connect_platforms.sh</h2>
              <div class="connection-subtitle"># Deploy AIRIC to your channels</div>
            </div>
            
            <div class="platform-grid">
              <div class="platform-card twitch-card">
                <div class="platform-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                  </svg>
                </div>
                <div class="platform-info">
                  <h3>TWITCH_DEPLOYMENT</h3>
                  <p>Connect your Twitch channel for live stream chaos</p>
                  <div class="platform-features">
                    <span>• Live chat integration</span>
                    <span>• Subscriber perks</span>
                    <span>• Stream commands</span>
                  </div>
                </div>
                <a href="/auth/streamer" class="platform-btn twitch-btn">
                  <span class="btn-text">$ ./connect_twitch.sh</span>
                  <span class="btn-arrow">→</span>
                </a>
              </div>

              <div class="platform-card kick-card">
                <div class="platform-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div class="platform-info">
                  <h3>KICK_DEPLOYMENT</h3>
                  <p>Deploy to Kick for maximum streaming energy</p>
                  <div class="platform-features">
                    <span>• Real-time chat</span>
                    <span>• Creator support</span>
                    <span>• Community building</span>
                  </div>
                </div>
                <a href="/auth/kick/streamer" class="platform-btn kick-btn">
                  <span class="btn-text">$ ./connect_kick.sh</span>
                  <span class="btn-arrow">→</span>
                </a>
              </div>
            </div>
          </div>

          <!-- BACKROOMS CHAT INTERFACE -->
          <div class="backrooms-chat-container" id="backroomsChat">
            <div class="backrooms-header">
              <div class="backrooms-title">
                <span class="glitch-text">LEVEL_0_CHAT_TERMINAL</span>
                <div class="connection-status">
                  <span class="status-dot"></span>
                  <span>CONNECTED_TO_THE_VOID</span>
                </div>
              </div>
            </div>
            
            <div class="backrooms-messages" id="chatMessages">
              <div class="system-message">
                <span class="timestamp">[00:00:00]</span>
                <span class="message-text">AIRIC has entered the backrooms...</span>
              </div>
              <div class="ai-message">
                <span class="timestamp">[00:00:01]</span>
                <span class="username">AIRIC:</span>
                <span class="message-text">yo what's good? you found your way into the void huh... I'm bout that liminal space life 💀 ask me anything, I'm literally HIM when it comes to conversations</span>
              </div>
            </div>
            
            <div class="backrooms-input-container">
              <div class="input-prompt">visitor@backrooms:~$</div>
              <input type="text" id="chatInput" placeholder="type your message into the void..." maxlength="500">
              <button id="sendButton" class="send-btn">TRANSMIT</button>
            </div>
            
            <div class="typing-indicator" id="typingIndicator" style="display: none;">
              <span class="timestamp">[--:--:--]</span>
              <span class="username">AIRIC:</span>
              <span class="typing-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // BACKROOMS CHAT API ENDPOINT
  app.post('/api/chat', express.json(), async (req, res) => {
    try {
      const { message, platform, userId } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      let reply;
      
      try {
        // Try to use Claude AI function
        const claude = require('./lib/claude-enhanced');
        reply = await claude.getBrainrotReply(
          userId || 'backrooms_visitor',
          message.trim(),
          platform || 'backrooms',
          null, // chatId
          false // family-friendly mode off for backrooms
        );
      } catch (claudeError) {
        console.log('Claude not available for local testing, using fallback responses');
        
        // Fallback responses for local testing
        const fallbackResponses = [
          "yo what's good? I'm running in local mode rn but still got that sigma energy 💀",
          "bruh I'm in test mode but I'm still HIM when it comes to conversations fr fr",
          "local server vibes but the aura farming never stops 🔥",
          "testing mode activated but the grindset remains undefeated 💯",
          "yo I'm running offline but my personality is still unhinged as always 😤"
        ];
        
        reply = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }

      res.json({ reply: reply || "yo my brain just glitched... try again" });
      
    } catch (error) {
      console.error('Backrooms chat error:', error);
      res.status(500).json({ 
        error: 'Connection to the void failed',
        reply: "bruh the void is acting up rn... connection unstable 💀"
      });
    }
  });

  // Streamer OAuth - Step 1: Show permission explanation then redirect
  app.get('/auth/streamer', (req, res) => {
    const twitchAuthContent = `
      <h1>TWITCH DEPLOYMENT<span class="cursor"></span></h1>
      <div class="subtitle"># Connect your Twitch channel to AIRIC</div>
      <div class="description">
        > Initializing Twitch integration protocol<br/>
        > Status: AWAITING AUTHORIZATION | Platform: TWITCH.TV | Security: ENABLED
      </div>

      <div class="info-section">
        <h3>PERMISSION REQUIREMENTS:</h3>
        <ul>
          <li><strong>Channel Identity</strong> - Know your username to join the right chat</li>
          <li><strong>Chat Access</strong> - Read messages and respond to commands</li>
          <li><strong>Command Processing</strong> - Handle aura farming, duels, and AI conversations</li>
        </ul>
      </div>

      <div class="info-section">
        <h3>DEPLOYMENT SEQUENCE:</h3>
        <ul>
          <li>You'll be redirected to Twitch to grant permissions</li>
          <li>AIRIC will automatically join your channel</li>
          <li>You'll see the bot in your viewer list within 1-2 minutes</li>
          <li>Your community can start using aura commands!</li>
        </ul>
      </div>

      <div class="button-group">
        <a href="/auth/streamer/authorize" class="btn">CONNECT CHANNEL</a>
        <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
      </div>
    `;

    res.send(generateHackerPage('AIRIC - Twitch Integration', twitchAuthContent));
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
      `redirect_uri=${encodeURIComponent((process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/streamer/callback'))}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;
    
    res.redirect(authUrl);
  });

  // Streamer OAuth - Step 2: Handle callback and authorize bot for their channel
  app.get('/auth/streamer/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
      const errorContent = `
        <h1>ERROR<span class="cursor"></span></h1>
        <div class="subtitle"># Authorization failed</div>
        <div class="description">
          > Error: ${error}<br/>
          > Status: FAILED | Security: BREACH DETECTED
        </div>
        <div class="button-group">
          <a href="/auth/streamer" class="btn">TRY AGAIN</a>
          <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
        </div>
      `;
      return res.send(generateHackerPage('Authorization Failed', errorContent));
    }
    
    if (!oauthStates.has(state)) {
      const errorContent = `
        <h1>ERROR<span class="cursor"></span></h1>
        <div class="subtitle"># Security verification failed</div>
        <div class="description">
          > Invalid state parameter<br/>
          > Status: SECURITY BREACH | Action: REQUEST DENIED
        </div>
        <div class="button-group">
          <a href="/auth/streamer" class="btn">TRY AGAIN</a>
          <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
        </div>
      `;
      return res.send(generateHackerPage('Security Error', errorContent));
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
          redirect_uri: (process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/streamer/callback'),
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
      
      const successContent = `
        <h1>TWITCH CONNECTED<span class="cursor"></span></h1>
        <div class="subtitle"># Successfully connected to ${user.display_name}'s channel</div>
        <div class="description">
          > Channel: ${user.login}<br/>
          > Bot Status: ${joinSuccess ? 'DEPLOYED' : 'DEPLOYMENT PENDING'}<br/>
          > Integration: ACTIVE | Security: VERIFIED
        </div>
        
        <div class="info-section">
          <h3>DEPLOYMENT COMPLETE:</h3>
          <ul>
            <li>AIRIC bot has been added to your channel</li>
            <li>Aura farming commands are now active</li>
            <li>Your viewers can use !farm, !duel, !blessing</li>
            <li>Bot should appear in your viewer list within 1-2 minutes</li>
          </ul>
        </div>
        
        <div class="button-group">
          <a href="/" class="btn">← RETURN TO TERMINAL</a>
        </div>
      `;
      
      res.send(generateHackerPage('Twitch Integration Complete', successContent));
      
    } catch (error) {
      console.error('Twitch OAuth error:', error);
      const errorContent = `
        <h1>ERROR<span class="cursor"></span></h1>
        <div class="subtitle"># Connection failed</div>
        <div class="description">
          > Error: ${error.message}<br/>
          > Status: FAILED | Retry: RECOMMENDED
        </div>
        <div class="button-group">
          <a href="/auth/streamer" class="btn">TRY AGAIN</a>
          <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
        </div>
      `;
      res.send(generateHackerPage('Connection Failed', errorContent));
    }
  });

  // Demo chat page
  app.get('/demo', (req, res) => {
    const demoContent = `
      <h1>AIRIC DEMO<span class="cursor"></span></h1>
      <div class="subtitle"># Interactive terminal demonstration</div>
      <div class="description">
        > Simulating live chat environment<br/>
        > Status: DEMO MODE | Platform: MULTI | Security: SANDBOX
      </div>

      <div class="terminal-window">
        <div class="terminal-header">
          <div class="terminal-title">AIRIC_CHAT_TERMINAL_v2.1</div>
          <div class="terminal-controls">
            <span class="control minimize"></span>
            <span class="control maximize"></span>
            <span class="control close"></span>
          </div>
        </div>
        
        <div class="terminal-content">
          <div class="chat-message">
            <span class="username">viewer123:</span>
            <span class="message">!farm</span>
          </div>
          <div class="bot-response">
            <span class="bot-name">AIRIC:</span>
            <span class="response">💀 viewer123 farmed 42 aura points! Total: 1,337 | Rank: Sigma Grindset</span>
          </div>
          
          <div class="chat-message">
            <span class="username">noob_gamer:</span>
            <span class="message">@airic what's the meaning of life?</span>
          </div>
          <div class="bot-response typing">
            <span class="bot-name">AIRIC:</span>
            <span class="response">The meaning of life is to farm aura, touch grass occasionally, and maintain that sigma grindset 💀</span>
          </div>
          
          <div class="chat-message">
            <span class="username">pro_player:</span>
            <span class="message">!duel @viewer123</span>
          </div>
          <div class="bot-response">
            <span class="bot-name">AIRIC:</span>
            <span class="response">⚔️ AURA DUEL: pro_player vs viewer123 | Winner: pro_player (+25 aura) | Loser: -10 aura</span>
          </div>
          
          <div class="terminal-prompt">
            <span class="prompt-symbol">></span>
            <span class="typing-cursor">_</span>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>AVAILABLE COMMANDS:</h3>
        <ul>
          <li><strong>!farm</strong> - Harvest aura points (24h cooldown)</li>
          <li><strong>!duel @user</strong> - Challenge another user to an aura duel</li>
          <li><strong>!blessing</strong> - Receive a random blessing or curse</li>
          <li><strong>@airic [message]</strong> - Chat with AI (powered by Claude)</li>
          <li><strong>!leaderboard</strong> - View top aura farmers</li>
        </ul>
      </div>

      <div class="button-group">
        <a href="/auth/streamer" class="btn">CONNECT TWITCH</a>
        <a href="/auth/kick/streamer" class="btn">CONNECT KICK</a>
        <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
      </div>
    `;

    res.send(generateHackerPage('AIRIC Demo - Terminal Interface', demoContent));
  });

  // Kick OAuth routes (placeholder - need to be implemented)
  app.get('/auth/kick/streamer', (req, res) => {
    const kickAuthContent = `
      <h1>KICK DEPLOYMENT<span class="cursor"></span></h1>
      <div class="subtitle"># Connect your Kick channel to AIRIC</div>
      <div class="description">
        > Initializing Kick integration protocol<br/>
        > Status: AWAITING AUTHORIZATION | Platform: KICK.COM | Security: ENABLED
      </div>

      <div class="info-section">
        <h3>PERMISSION REQUIREMENTS:</h3>
        <ul>
          <li><strong>Channel Identity</strong> - Know your username to join the right chat</li>
          <li><strong>Chat Access</strong> - Read messages and respond to commands</li>
          <li><strong>Command Processing</strong> - Handle aura farming, duels, and AI conversations</li>
        </ul>
      </div>

      <div class="warning">
        <h3>⚠️ DEVELOPMENT STATUS</h3>
        <div class="warning-content">
          Kick integration is currently under development. This feature will be available soon!
        </div>
      </div>

      <div class="button-group">
        <a href="/" class="btn btn-secondary">← RETURN TO TERMINAL</a>
      </div>
    `;

    res.send(generateHackerPage('AIRIC - Kick Integration', kickAuthContent));
  });

  // Return the activeChannels for other modules to use
  return { activeChannels };
}

module.exports = { setupWebInterface };
