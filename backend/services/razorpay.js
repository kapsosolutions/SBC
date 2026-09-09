const crypto = require('crypto');
const axios = require('axios');

/**
 * Create a Razorpay order via REST (for the website checkout).
 * @param {number} amountPaise  amount in paise
 * @param {string} receipt
 * @param {object} notes
 */
async function createOrder(amountPaise, receipt, notes = {}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const { data } = await axios.post(
    'https://api.razorpay.com/v1/orders',
    { amount: amountPaise, currency: 'INR', receipt, notes },
    { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  return data;
}

// Whether the Razorpay backup webhook is usable (needs the webhook secret).
function webhookConfigured() {
  return !!process.env.RAZORPAY_WEBHOOK_SECRET;
}

// Whether Razorpay keys are present (for the optional website checkout path).
function keysConfigured() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/**
 * Verify a Razorpay webhook signature.
 * signature = HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET) hex.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody) return false;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Verify a Razorpay checkout callback signature (website flow).
 * expected = HMAC_SHA256(`${order_id}|${payment_id}`, RAZORPAY_KEY_SECRET) hex.
 */
function verifyCheckoutSignature(orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

module.exports = {
  createOrder,
  webhookConfigured,
  keysConfigured,
  verifyWebhookSignature,
  verifyCheckoutSignature,
};
