// Helper to print the exact Meta configuration values once ngrok is running.
// Usage:
//   1. In one terminal:  ngrok http 5000
//   2. Copy the https URL ngrok prints, set BACKEND_URL in .env
//   3. Run: node scripts/start-ngrok.js   (prints the values to paste into Meta)
require('dotenv').config();

const backend = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || '';

if (!backend.startsWith('https://')) {
  console.log('⚠️  BACKEND_URL is not an https ngrok URL yet.');
  console.log('    Run "ngrok http 5000", copy the https forwarding URL into .env as BACKEND_URL, then re-run this.');
}

console.log('\n===== Meta / WhatsApp configuration =====\n');
console.log('Webhook Callback URL :', `${backend}/webhook`);
console.log('Verify Token         :', verifyToken);
console.log('Flow Endpoint URI    :', `${backend}/api/flow-endpoint`);
console.log('\nWebhook fields to subscribe: messages');
console.log('\nNext steps:');
console.log('  1. WhatsApp > Configuration > Edit callback URL: paste the two values above.');
console.log('  2. npm run flow:keys        (generate encryption keys)');
console.log('  3. npm run flow:upload-key  (register public key with Meta)');
console.log('  4. npm run flow:create      (create + publish the flow, saves WHATSAPP_FLOW_ID)');
console.log('');
