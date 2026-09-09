const express = require('express');
const router = express.Router();

const razorpay = require('../services/razorpay');
const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');
const Student = require('../models/Student');

/**
 * Razorpay backup webhook.
 * The primary confirmation path is the Meta payment status webhook (routes/webhook.js);
 * this is the belt-and-suspenders path that maps a Razorpay event back to our student
 * via the reference_id we stamped into razorpay.notes when sending order_details.
 *
 * Configure in Razorpay Dashboard -> Webhooks:
 *   URL:    {BACKEND_URL}/api/payment/razorpay-webhook
 *   Events: payment.captured, payment.failed, order.paid
 *   Secret: RAZORPAY_WEBHOOK_SECRET
 */
router.post('/razorpay-webhook', async (req, res) => {
  if (!razorpay.webhookConfigured()) {
    return res.status(503).json({ status: 'razorpay webhook not configured' });
  }
  const signature = req.headers['x-razorpay-signature'];
  if (!razorpay.verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ status: 'invalid signature' });
  }

  // Always ACK 200 to prevent Razorpay retries; process best-effort.
  try {
    const event = req.body?.event;
    const payEntity = req.body?.payload?.payment?.entity;
    const orderEntity = req.body?.payload?.order?.entity;
    const notes = payEntity?.notes || orderEntity?.notes || {};
    const referenceId = notes.reference_id || payEntity?.receipt || orderEntity?.receipt;

    if (referenceId) {
      if (['payment.captured', 'order.paid', 'payment_link.paid'].includes(event)) {
        await confirmPaidStudent(referenceId, payEntity?.id);
      } else if (event === 'payment.failed') {
        await failPaidStudent(referenceId);
      }
    }
  } catch (e) {
    console.error('[payment] razorpay-webhook error:', e.message);
  }
  return res.sendStatus(200);
});

async function confirmPaidStudent(referenceId, txnId) {
  const student = await Student.findOne({ paymentRef: referenceId });
  if (!student) {
    console.warn('[payment] razorpay paid for unknown ref', referenceId);
    return;
  }
  if (student.paymentStatus === 'paid') return; // idempotent
  await chatbot.completeRegistration(student.phone, txnId || referenceId);
}

async function failPaidStudent(referenceId) {
  const student = await Student.findOne({ paymentRef: referenceId });
  if (!student) return;
  student.paymentStatus = 'failed';
  await student.save();
  await meta.sendText(
    student.phone,
    'Your payment did not go through. Send "hi" and tap Register to try again.'
  );
}

module.exports = router;
