// Setup Telegram Webhook for Vercel
require('dotenv').config({ path: '/home/danhomelab/Documents/danGene/danapp/dashboard/.env.local' });

const token = process.env.TELEGRAM_TOKEN;
const vercelUrl = process.argv[2]; // Pass your Vercel URL as argument

if (!token || token === 'your-telegram-token-here') {
  console.log('❌ TELEGRAM_TOKEN not found or not set properly');
  process.exit(1);
}

if (!vercelUrl) {
  console.log('Usage: node setup-telegram-webhook.js <vercel-url>');
  console.log('Example: node setup-telegram-webhook.js https://danclaudeobs.vercel.app');
  process.exit(1);
}

const webhookUrl = `${vercelUrl}/api/telegram`;
console.log('🔍 Setting webhook to:', webhookUrl);

// Use axios with IPv4 forcing (same as your other API calls)
const axios = require('axios');
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
  url: webhookUrl,
  drop_pending_updates: true
}, {
  httpAgent,
  httpsAgent,
  timeout: 10000
})
.then(response => {
  const data = response.data;
  if (data.ok) {
    console.log('✅ Webhook set successfully!');
    console.log('Webhook URL:', webhookUrl);
    console.log('\nTest it:');
    console.log(`Open Telegram and search for your bot, then send /start`);
  } else {
    console.log('❌ Failed to set webhook:', data.description);
  }
})
.catch(err => {
  console.log('❌ Network error:', err.message);
  console.log('Try running this script after deploying to Vercel.');
});
