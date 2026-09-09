// Uploads the business public key to Meta (whatsapp_business_encryption).
require('dotenv').config();
const meta = require('../services/metaCloud');

(async () => {
  const pub = (process.env.FLOW_PUBLIC_KEY || '').split('\\n').join('\n');
  if (!pub) {
    console.error('FLOW_PUBLIC_KEY not set. Run: npm run flow:keys');
    process.exit(1);
  }
  try {
    const data = await meta.uploadBusinessPublicKey(pub);
    console.log('✅ Public key uploaded:', JSON.stringify(data));
  } catch (e) {
    console.error('❌ Upload failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
