// Generates the RSA key pair used for WhatsApp Flow encryption and writes
// FLOW_PRIVATE_KEY / FLOW_PUBLIC_KEY into .env (newlines escaped as \n).
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { setKeys } = require('./_envFile');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const dir = path.join(__dirname, '..', 'flow_keys');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(dir, 'public.pem'), publicKey);

setKeys({
  FLOW_PRIVATE_KEY: `"${privateKey.trim().split('\n').join('\\n')}"`,
  FLOW_PUBLIC_KEY: `"${publicKey.trim().split('\n').join('\\n')}"`,
});

console.log('✅ Generated flow keys -> flow_keys/ and updated .env');
console.log('Next: npm run flow:upload-key');
