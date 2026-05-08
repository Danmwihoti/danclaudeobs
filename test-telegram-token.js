// Test Telegram Bot Token (IPv4 forced)
require('dotenv').config({ path: '/home/danhomelab/Documents/danGene/danapp/dashboard/.env.local' });
const axios = require('axios');
const http = require('http');
const https = require('https');

const token = process.env.TELEGRAM_TOKEN;

if (!token || token === 'your-telegram-token-here') {
  console.log('❌ TELEGRAM_TOKEN not found or not set properly in .env.local');
  process.exit(1);
}

console.log('🔍 Testing Telegram token...');
console.log('Token starts with:', token.substring(0, 10) + '...');

const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

axios.get(`https://api.telegram.org/bot${token}/getMe`, {
  httpAgent,
  httpsAgent,
  timeout: 10000
})
.then(response => {
  const data = response.data;
  if (data.ok) {
    console.log('✅ Token is VALID!');
    console.log('Bot Info:');
    console.log('  Username:', data.result.username);
    console.log('  First Name:', data.result.first_name);
    console.log('  Bot ID:', data.result.id);
    console.log('\n🤖 Your bot is ready to use!');
    console.log('Open Telegram and search for: @' + data.result.username);
    console.log('\nTest commands:');
    console.log('  /note <text>  - Save a note to Inbox.md');
    console.log('  /ask <question> - Ask Claude (requires ANTHROPIC_API_KEY)');
  } else {
    console.log('❌ Token is INVALID!');
    console.log('Error:', data.description);
  }
})
.catch(err => {
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
    console.log('❌ Network timeout - IPv6 issue detected');
    console.log('Your machine has IPv6 connectivity issues.');
  } else {
    console.log('❌ Error:', err.message);
  }
});
