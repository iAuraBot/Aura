// Simple test server to view the new terminal UI
require('dotenv').config();
const express = require('express');
const { setupWebInterface } = require('./webInterface');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup the web interface
setupWebInterface(app);

// Start the server
app.listen(PORT, () => {
  console.log(`🖥️  Terminal UI Test Server running at:`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`💀 Ready to view the hacker aesthetic!`);
});
