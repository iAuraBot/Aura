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

  // Landing page - Add bot to channel
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          
          @keyframes matrix-rain {
            0% { transform: translateY(-100vh); opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
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
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 30px 0;
          }
          
          .stat-card {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #333;
            border-radius: 4px;
            padding: 20px 15px;
            text-align: center;
            transition: all 0.3s ease;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .stat-card:hover {
            border-color: #00bfff;
            box-shadow: 0 0 15px rgba(0, 191, 255, 0.3);
          }
          
          .stat-number { 
            font-size: 1.8rem; 
            font-weight: 700; 
            color: #00bfff;
            margin-bottom: 8px;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .stat-label { 
            font-size: 0.9rem; 
            color: #888;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 15px;
            margin: 30px 0;
          }
          
          .feature-card {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #333;
            border-radius: 4px;
            padding: 20px;
            text-align: left;
            transition: all 0.3s ease;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .feature-card:hover {
            border-color: #00bfff;
            box-shadow: 0 0 15px rgba(0, 191, 255, 0.2);
          }
          
          .feature-emoji {
            font-size: 1.5rem;
            margin-bottom: 12px;
            display: block;
            color: #00bfff;
          }
          
          .feature-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 8px;
            color: #00bfff;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .feature-desc {
            font-size: 0.85rem;
            color: #888;
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
        </style>
        <script>
          // Terminal typing effect
          function typeWriter(element, text, speed = 50) {
            let i = 0;
            element.innerHTML = '';
            function type() {
              if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
              }
            }
            type();
          }
          
          // Matrix rain effect
          function createMatrixRain() {
            const canvas = document.createElement('canvas');
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '0';
            canvas.style.opacity = '0.1';
            document.body.appendChild(canvas);
            
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|]}}";
            const matrixArray = matrix.split("");
            const fontSize = 10;
            const columns = canvas.width / fontSize;
            const drops = [];
            
            for(let x = 0; x < columns; x++) {
              drops[x] = 1;
            }
            
            function draw() {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.fillStyle = '#00bfff';
              ctx.font = fontSize + 'px JetBrains Mono';
              
              for(let i = 0; i < drops.length; i++) {
                const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                
                if(drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                  drops[i] = 0;
                }
                drops[i]++;
              }
            }
            
            setInterval(draw, 35);
          }
          
          // Initialize effects when page loads
          document.addEventListener('DOMContentLoaded', function() {
            createMatrixRain();
            
            // Type writer effect for terminal prompt
            const prompt = document.querySelector('.terminal-prompt');
            if (prompt) {
              const originalText = prompt.textContent;
              typeWriter(prompt, originalText, 30);
            }

            // BACKROOMS CHAT FUNCTIONALITY
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
                typingIndicator.style.display = 'block';
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }

              // Hide typing indicator
              function hideTyping() {
                typingIndicator.style.display = 'none';
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
     █████╗ ██╗██████╗ ██╗ ██████╗
    ██╔══██╗██║██╔══██╗██║██╔════╝
    ███████║██║██████╔╝██║██║     
    ██╔══██║██║██╔══██╗██║██║     
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
            <a href="/auth/streamer" class="btn">$ ./deploy_bot.sh</a>
            ${req.session.user ? '<a href="/dashboard" class="btn btn-secondary">$ ./access_dashboard.sh</a>' : '<a href="#features" class="btn btn-secondary">$ ./view_modules.sh</a>'}
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

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">3</div>
              <div class="stat-label">ENDPOINTS</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">AI</div>
              <div class="stat-label">CORE</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">24/7</div>
              <div class="stat-label">UPTIME</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">∞</div>
              <div class="stat-label">CHAOS_LVL</div>
            </div>
          </div>

          <div class="features-grid" id="features">
            <div class="feature-card">
              <span class="feature-emoji">[NET]</span>
              <div class="feature-title">MULTI-ENDPOINT DEPLOY</div>
              <div class="feature-desc">Simultaneous deployment across Telegram, Twitch, and X networks with unified protocol</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[AI]</span>
              <div class="feature-title">NEURAL CHAT ENGINE</div>
              <div class="feature-desc">Advanced conversational AI with persistent memory and context-aware responses</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[RNG]</span>
              <div class="feature-title">CHAOS FARMING SYS</div>
              <div class="feature-desc">Randomized reward distribution with anti-exploitation algorithms and newbie protection</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[PVP]</span>
              <div class="feature-title">COMBAT PROTOCOL</div>
              <div class="feature-desc">1v1 wagering system with real-time balance verification and instant settlement</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[X]</span>
              <div class="feature-title">SOCIAL INFILTRATION</div>
              <div class="feature-desc">Intelligent mention detection with adaptive response throttling and engagement optimization</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[DB]</span>
              <div class="feature-title">RANKING DATABASE</div>
              <div class="feature-desc">Real-time leaderboard system with cross-platform user tracking and statistics</div>
            </div>
            <div class="feature-card">
              <span class="feature-emoji">[TXN]</span>
              <div class="feature-title">TRANSFER PROTOCOL</div>
              <div class="feature-desc">Secure peer-to-peer asset transfer with transaction logging and fraud prevention</div>
            </div>

            <div class="feature-card">
              <span class="feature-emoji">[CFG]</span>
              <div class="feature-title">CONFIG MANAGEMENT</div>
              <div class="feature-desc">Customizable parameters for chaos levels, response rates, and deployment settings</div>
            </div>
          </div>

          <div style="margin-top: 40px;">
            <div class="terminal-prompt">Deployment Instructions:</div>
            <div class="terminal-output">
              <div style="color: #ff6b6b; margin-bottom: 15px;">[TELEGRAM_ENDPOINT]</div>
              <div style="margin-bottom: 10px;">$ Commands: /aurafarm, /mog, /bless</div>
              <div style="margin-bottom: 10px;">$ AI_Interface: @airic [message]</div>
              <div style="color: #888;">$ Target: Group chats, DMs</div>
            </div>
            
            <div class="terminal-output">
              <div style="color: #ff6b6b; margin-bottom: 15px;">[X_ENDPOINT]</div>
              <div style="margin-bottom: 10px;">$ Mention: @AIRIC [query]</div>
              <div style="margin-bottom: 10px;">$ Response_Rate: Variable (anti-spam)</div>
              <div style="color: #888;">$ Behavior: Adaptive engagement</div>
            </div>
            
            <div class="terminal-output">
              <div style="color: #ff6b6b; margin-bottom: 15px;">[TWITCH_ENDPOINT]</div>
              <div style="margin-bottom: 10px;">$ Commands: !aurafarm, !mog, !bless</div>
              <div style="margin-bottom: 10px;">$ AI_Interface: @airic [message]</div>
              <div style="color: #888;">$ Setup: Streamer authorization required</div>
            </div>
          </div>

          <div style="margin-top: 40px; padding: 30px; background: rgba(0, 0, 0, 0.8); border: 1px solid #333; border-radius: 4px;">
            <div class="terminal-prompt">External Links:</div>
              <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <a href="https://x.com/AIRIC" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(0, 0, 0, 0.7)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.4)'; this.style.transform='translateY(0)'">
                  <img src="/assets/x.png" alt="X (Twitter)" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
                <a href="https://t.me/iAIRIC" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(0, 136, 204, 0.2); border: 1px solid rgba(0, 136, 204, 0.4); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(0, 136, 204, 0.4)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(0, 136, 204, 0.2)'; this.style.transform='translateY(0)'">
                  <img src="/assets/telegram.png" alt="Telegram" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
                <a href="https://www.twitch.tv/airic" target="_blank" style="display: flex; align-items: center; justify-content: center; width: 80px; height: 80px; padding: 15px; background: rgba(145, 70, 255, 0.2); border: 1px solid rgba(145, 70, 255, 0.4); border-radius: 15px; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" onmouseover="this.style.background='rgba(145, 70, 255, 0.4)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.background='rgba(145, 70, 255, 0.2)'; this.style.transform='translateY(0)'">
                  <img src="/assets/twitch.png" alt="Twitch" style="width: 50px; height: 50px; object-fit: contain;">
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Floating Social Media Bar -->
        <div class="floating-social" style="position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 1000;">
          <a href="https://x.com/AIRIC" target="_blank" title="Follow on X" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(0, 0, 0, 0.9); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/x.png" alt="X (Twitter)" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
          <a href="https://t.me/iAIRIC" target="_blank" title="Chat on Telegram" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(0, 136, 204, 0.9); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/telegram.png" alt="Telegram" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
          <a href="https://www.twitch.tv/airic" target="_blank" title="Watch Live on Twitch" style="display: flex; align-items: center; justify-content: center; width: 55px; height: 55px; padding: 8px; background: rgba(145, 70, 255, 0.9); border-radius: 50%; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
            <img src="/assets/twitch.png" alt="Twitch" style="width: 35px; height: 35px; object-fit: contain;">
          </a>
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

      // Import Claude AI function
      const { generateClaudeResponse } = require('./lib/claude');
      
      // Generate AIRIC response
      const reply = await generateClaudeResponse(
        message.trim(),
        userId || 'backrooms_visitor',
        platform || 'backrooms',
        false // family-friendly mode off for backrooms
      );

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
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connect Your Twitch Channel - AIRIC</title>
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
          <p class="description">AIRIC needs permission to join your channel and respond to commands.</p>
          
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
              <span>AIRIC will automatically join your channel</span>
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
          <title>Success - Multi-Platform AIRIC Added!</title>
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
              <img src="/assets/aurafarmbot.png" alt="AIRIC" style="width: 120px; height: 120px; border-radius: 20px; object-fit: cover; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);">
            </div>
            <h1>AIRIC Successfully Added!</h1>
            <p><strong>Channel:</strong> ${user.display_name}</p>
                            <p>🔍 <strong>Look for "airic" in your viewer list!</strong></p>
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
              <p><code>@airic [message]</code> - Chat with Claude AI</p>
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
          <title>iAIRIC Settings - ${req.session.user.display_name || req.session.user.username}</title>
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
                      <div class="command-name">@airic 🤖</div>
                      <div class="command-desc">Unhinged AI chats that remember everything</div>
                      <div class="command-usage">@airic what's up?</div>
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
              if (confirm('⚠️ Remove iAIRIC from your channel?\\n\\nThis will:\\n• Bot will immediately leave your channel\\n• Stop responding to all commands\\n• Delete all your settings\\n• Remove your channel from the active list\\n\\nThis action CANNOT be undone!')) {
                fetch('/dashboard/remove', { method: 'POST' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      alert('💀 Bot removed successfully!\\n\\n👋 iAIRIC has left your channel.\\n\\nThanks for trying iAIRIC!');
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
          <title>Advanced Settings - iAIRIC</title>
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
                    <input type="text" maxlength="25" placeholder="iAIRIC" value="${settings.branding.botName}" onchange="updateSetting('botName', this.value)">
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
  // TERMINAL CHAT DEMO ROUTES
  // ===========================================

  // Demo chat page
  app.get('/demo', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Try AuraBot - Terminal Demo</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Poppins', sans-serif;
            background: 
              linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)),
              url('/assets/aurafarmbot.png') center center;
            background-size: cover;
            background-attachment: fixed;
            background-repeat: no-repeat;
            min-height: 100vh;
            color: white;
            overflow-x: hidden;
          }
          
          .demo-container {
            display: flex;
            height: 100vh;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            gap: 20px;
          }
          
          .info-panel {
            flex: 1;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 15px;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 30px;
            overflow-y: auto;
          }
          
          .terminal-panel {
            flex: 1;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 15px;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            flex-direction: column;
            min-height: 600px;
          }
          
          .terminal-header {
            background: rgba(255, 215, 0, 0.1);
            border-bottom: 1px solid rgba(255, 215, 0, 0.3);
            padding: 15px 20px;
            border-radius: 15px 15px 0 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .terminal-dots {
            display: flex;
            gap: 8px;
          }
          
          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }
          
          .dot.red { background: #ff5f56; }
          .dot.yellow { background: #ffbd2e; }
          .dot.blue { background: #00bfff; }
          
          .terminal-title {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            color: #ffd700;
            margin-left: 10px;
          }
          
          .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            line-height: 1.5;
            background: rgba(0, 0, 0, 0.3);
          }
          
          .message {
            margin-bottom: 15px;
            padding: 10px 15px;
            border-radius: 8px;
            animation: fadeIn 0.3s ease;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .message.user {
            background: rgba(255, 215, 0, 0.1);
            border-left: 3px solid #ffd700;
            margin-left: 20px;
          }
          
          .message.bot {
            background: rgba(116, 185, 71, 0.1);
            border-left: 3px solid #74b947;
          }
          
          .message.system {
            background: rgba(255, 255, 255, 0.05);
            border-left: 3px solid #666;
            font-style: italic;
            opacity: 0.8;
          }
          
          .message-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 5px;
            font-size: 12px;
            opacity: 0.7;
          }
          
          .username {
            color: #ffd700;
            font-weight: 600;
          }
          
          .timestamp {
            color: #999;
          }
          
          .message-content {
            color: #efeff1;
            word-wrap: break-word;
          }
          
          .chat-input-container {
            padding: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.3);
            border-radius: 0 0 15px 15px;
          }
          
          .input-row {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          
          .prompt {
            color: #ffd700;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            flex-shrink: 0;
          }
          
          .chat-input {
            flex: 1;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 12px 15px;
            color: white;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
          }
          
          .chat-input:focus {
            outline: none;
            border-color: #ffd700;
            background: rgba(255, 255, 255, 0.15);
          }
          
          .send-btn {
            background: #74b947;
            border: none;
            border-radius: 8px;
            padding: 12px 20px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'JetBrains Mono', monospace;
          }
          
          .send-btn:hover {
            background: #5a8b3a;
            transform: translateY(-2px);
          }
          
          .send-btn:disabled {
            background: #333;
            cursor: not-allowed;
            transform: none;
          }
          
          .typing-indicator {
            display: none;
            padding: 10px 15px;
            background: rgba(116, 185, 71, 0.1);
            border-left: 3px solid #74b947;
            border-radius: 8px;
            margin-bottom: 15px;
            font-style: italic;
            opacity: 0.8;
          }
          
          .typing-dots {
            display: inline-block;
            animation: typing 1.5s infinite;
          }
          
          @keyframes typing {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 80% { content: '...'; }
            100% { content: '.'; }
          }
          
          .info-section {
            margin-bottom: 30px;
          }
          
          .info-section h2 {
            color: #ffd700;
            font-size: 1.5rem;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          
          .command-list {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 15px 0;
          }
          
          .command-item {
            margin: 10px 0;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            border-left: 3px solid #ffd700;
          }
          
          .command-name {
            font-family: 'JetBrains Mono', monospace;
            color: #ffd700;
            font-weight: 600;
          }
          
          .command-desc {
            font-size: 0.9rem;
            opacity: 0.8;
            margin-top: 3px;
          }
          
          .quick-commands {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
          }
          
          .quick-cmd {
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 6px;
            padding: 8px 12px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: #ffd700;
          }
          
          .quick-cmd:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: translateY(-2px);
          }
          
          .back-btn {
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 10px 15px;
            color: white;
            text-decoration: none;
            font-weight: 600;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            z-index: 1000;
          }
          
          .back-btn:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: translateY(-2px);
          }
          
          @media (max-width: 768px) {
            .demo-container {
              flex-direction: column;
              padding: 10px;
              gap: 10px;
            }
            .info-panel {
              order: 2;
              flex: none;
              max-height: 300px;
            }
            .terminal-panel {
              order: 1;
              min-height: 400px;
            }
          }
        </style>
      </head>
      <body>
        <a href="/" class="back-btn">← Back to Home</a>
        
        <div class="demo-container">
          <!-- Info Panel -->
          <div class="info-panel">
            <div class="info-section">
              <h2>🤖 Try AuraBot Demo</h2>
              <p>Test all the bot commands without joining any platform! This is a live demo using the same AI and logic as the real bot.</p>
            </div>
            
            <div class="info-section">
              <h2>⚡ Quick Commands</h2>
              <div class="quick-commands">
                <div class="quick-cmd" onclick="sendQuickCommand('/aurafarm')">!aurafarm</div>
                <div class="quick-cmd" onclick="sendQuickCommand('/aura')">!aura</div>
                <div class="quick-cmd" onclick="sendQuickCommand('/auraboard')">!auraboard</div>
                <div class="quick-cmd" onclick="sendQuickCommand('/help')">!help</div>
                <div class="quick-cmd" onclick="sendQuickCommand('yo what\\'s good aurabot?')">AI Chat</div>
              </div>
            </div>
            
            <div class="info-section">
              <h2>📋 Available Commands</h2>
              <div class="command-list">
                <div class="command-item">
                  <div class="command-name">!aurafarm</div>
                  <div class="command-desc">Farm aura with RNG (24h cooldown)</div>
                </div>
                <div class="command-item">
                  <div class="command-name">!aura [@user]</div>
                  <div class="command-desc">Check your or someone's aura balance</div>
                </div>
                <div class="command-item">
                  <div class="command-name">!mog @user [amount]</div>
                  <div class="command-desc">Challenge someone to a duel</div>
                </div>
                <div class="command-item">
                  <div class="command-name">!bless @user [amount]</div>
                  <div class="command-desc">Give aura to another user</div>
                </div>
                <div class="command-item">
                  <div class="command-name">!auraboard</div>
                  <div class="command-desc">View the leaderboard</div>
                </div>
                <div class="command-item">
                  <div class="command-name">@aurabot [message]</div>
                  <div class="command-desc">Chat with Claude AI</div>
                </div>
              </div>
            </div>
            
            <div class="info-section">
              <h2>🔥 Ready to Add to Your Platform?</h2>
              <p>Like what you see? Add AuraBot to your:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li><strong>Twitch:</strong> <a href="/auth/streamer" style="color: #ffd700;">Connect Channel</a></li>
                <li><strong>Telegram:</strong> <a href="https://t.me/iAIRIC" style="color: #ffd700;" target="_blank">@iAIRIC</a></li>
                <li><strong>X (Twitter):</strong> <a href="https://x.com/AIRIC" style="color: #ffd700;" target="_blank">@AIRIC</a></li>
              </ul>
            </div>
          </div>
          
          <!-- Terminal Panel -->
          <div class="terminal-panel">
            <div class="terminal-header">
              <div class="terminal-dots">
                <div class="dot red"></div>
                <div class="dot yellow"></div>
                <div class="dot blue"></div>
              </div>
              <div class="terminal-title">aurabot@demo:~$</div>
            </div>
            
            <div class="chat-messages" id="chatMessages">
              <div class="message system">
                <div class="message-header">
                  <span class="username">system</span>
                  <span class="timestamp">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message-content">
                  💀 Welcome to AuraBot Demo Terminal! 💀<br>
                  Try commands like <code>!aurafarm</code> or just chat with the AI!<br>
                  This is a live demo using the same logic as the real bot.
                </div>
              </div>
            </div>
            
            <div class="typing-indicator" id="typingIndicator">
              <div class="message-header">
                <span class="username">aurabot</span>
                <span class="timestamp">typing</span>
              </div>
              <div class="message-content">
                <span class="typing-dots">...</span>
              </div>
            </div>
            
            <div class="chat-input-container">
              <div class="input-row">
                <span class="prompt">demo@aura:~$</span>
                <input type="text" class="chat-input" id="messageInput" placeholder="Type a command or message..." autofocus>
                <button class="send-btn" id="sendBtn" onclick="sendMessage()">Send</button>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          const chatMessages = document.getElementById('chatMessages');
          const messageInput = document.getElementById('messageInput');
          const sendBtn = document.getElementById('sendBtn');
          const typingIndicator = document.getElementById('typingIndicator');
          
          // Demo user session (simulated)
          const demoUser = {
            id: 'demo_' + Math.random().toString(36).substr(2, 9),
            username: 'demo_user',
            platform: 'web_demo'
          };
          
          messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          });
          
          function addMessage(content, type = 'bot', username = 'aurabot') {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            const timestamp = new Date().toLocaleTimeString();
            messageDiv.innerHTML = \`
              <div class="message-header">
                <span class="username">\${username}</span>
                <span class="timestamp">\${timestamp}</span>
              </div>
              <div class="message-content">\${content}</div>
            \`;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
          
          function showTyping() {
            typingIndicator.style.display = 'block';
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
          
          function hideTyping() {
            typingIndicator.style.display = 'none';
          }
          
          async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user', demoUser.username);
            messageInput.value = '';
            sendBtn.disabled = true;
            
            // Show typing indicator
            showTyping();
            
            try {
              // Send to bot API
              const response = await fetch('/api/demo-chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: message,
                  user: demoUser
                })
              });
              
              const data = await response.json();
              
              // Hide typing and add bot response
              hideTyping();
              addMessage(data.reply, 'bot');
              
            } catch (error) {
              hideTyping();
              addMessage('❌ Error connecting to bot. Please try again.', 'bot');
            }
            
            sendBtn.disabled = false;
            messageInput.focus();
          }
          
          function sendQuickCommand(command) {
            messageInput.value = command;
            sendMessage();
          }
          
          // Welcome message after a short delay
          setTimeout(() => {
            addMessage('💀 Yo! Ready to farm some aura? Try \`!aurafarm\` or just chat with me! 🔥', 'bot');
          }, 1000);
        </script>
      </body>
      </html>
    `);
  });

  // API endpoint for demo chat
  app.post('/api/demo-chat', express.json(), async (req, res) => {
    try {
      const { message, user } = req.body;
      
      if (!message || !user) {
        return res.status(400).json({ error: 'Missing message or user data' });
      }
      
      // Create a simulated context similar to your telegram bot
      const simulatedCtx = {
        message: { text: message },
        from: { 
          id: user.id, 
          username: user.username,
          first_name: user.username 
        },
        chat: { 
          id: 'demo_chat',
          type: 'private',
          title: 'Demo Chat'
        }
      };
      
      let reply = '';
      
      // Handle commands using your existing logic
      if (message.startsWith('/') || message.startsWith('!')) {
        const command = message.replace(/^[\/!]/, '').split(' ')[0].toLowerCase();
        
        switch (command) {
          case 'aurafarm':
            const farmResult = await auraLogic.farmAura(user.id, 'demo_chat', 'web_demo', user.username);
            reply = farmResult.message;
            break;
            
          case 'aura':
            const auraResult = await auraLogic.checkAura(user.id, 'demo_chat', 'web_demo', user.username, null);
            reply = auraResult.message;
            break;
            
          case 'auraboard':
            const boardResult = await auraLogic.getLeaderboard('demo_chat', 'web_demo', 'Demo Chat');
            reply = boardResult.message;
            break;
            
          case 'mog':
            reply = '💀 **trying to mog someone?** 💀\\n\\n\`!mog @user [amount]\` - 50/50 showdown\\n\\nExample: \`!mog @friend 25\`\\n\\n*(Note: Duels require another user in this demo)*';
            break;
            
          case 'bless':
            reply = '✨ **AURA BLESSING** ✨\\n\\nUsage: \`!bless @username [amount]\`\\nShare your aura bag with the HOMIES! 💀\\nSpread that GIGACHAD ENERGY!\\n\\nExample: \`!bless @friend 10\`\\n\\n*(Note: Blessings require another user in this demo)*';
            break;
            
          case 'help':
            reply = `🤖 **AURABOT HELP - GET THAT BAG!** 🤖

💀 **YO! Here's how to use this ABSOLUTELY BASED bot:**

✨ **!aurafarm**
• Farm aura every 24 hours with RNG
• First time guaranteed NO L! Newbie protection! 💀
• 70% chance: +20 to +50 aura (W)
• 20% chance: -10 to -25 aura (L)  
• 10% chance: +100 JACKPOT or -50 IMPLOSION!

💫 **!aura [@user]**
• Check your aura balance or someone else's
• See if you're GIGACHAD or BETA energy

📊 **!auraboard**
• View top 10 users ranked by aura
• See who's winning and who's getting REKT

🤖 **Chat with AI**
• Just type normally to chat with Claude AI!
• Get chaotic zoomer responses and meme energy!

**Ready to add to your platform? Check out the info panel!** 🔥`;
            break;
            
          default:
            reply = '💀 Unknown command! Try \`!help\` to see available commands or just chat with me normally! 🔥';
        }
      } else {
        // Handle AI chat using your existing Claude integration
        const familyFriendly = false; // Default for demo
        reply = await claude.getBrainrotReply(user.id, message, 'web_demo', 'demo_chat', familyFriendly);
      }
      
      res.json({ reply: reply });
      
    } catch (error) {
      console.error('Demo chat error:', error);
      res.status(500).json({ 
        reply: '💀 Something went wrong! But hey, this is just a demo - the real bot is way more reliable! 🔥' 
      });
    }
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
        <title>Connect Your Kick Channel - AIRIC</title>
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
          <p class="description">AIRIC needs permission to join your channel and respond to commands.</p>
          
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
            <h3>🤖 What AIRIC Will Do:</h3>
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
              <span>Chat with Claude AI when mentioned (@airic)</span>
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
          <title>Success - AIRIC Added to Kick!</title>
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
            <div class="success-message">AIRIC has been added to your Kick channel!</div>
            
            <div class="status">
              <h3>📊 Status:</h3>
                            <p>🔍 <strong>Look for "airic" in your viewer list!</strong></p>
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
              <p><code>@airic [message]</code> - Chat with Claude AI</p>
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