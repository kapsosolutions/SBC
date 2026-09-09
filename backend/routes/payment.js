const express = require('express');
const router = express.Router();

const razorpay = require('../services/razorpay');
const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');
const Student = require('../models/Student');
const Plan = require('../models/Plan');
const { auth } = require('../middleware/auth');

// ---------- Website checkout (Razorpay Standard Checkout) ----------

// Create a Razorpay order for the logged-in student's chosen plan.
router.post('/create-order', auth('student'), async (req, res) => {
  if (!razorpay.keysConfigured()) {
    return res.status(503).json({ error: 'Payments are not configured' });
  }
  const planKey = req.body?.planKey;
  const plan = await Plan.findOne({ key: planKey, active: true }).lean();
  if (!plan) return res.status(400).json({ error: 'Invalid plan' });

  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  if (student.registered) return res.status(409).json({ error: 'Already registered' });

  try {
    const order = await razorpay.createOrder(
      Math.round(plan.price * 100),
      `sbc_web_${student.phone}`.slice(0, 40),
      { reference_id: student.phone, phone: student.phone, planKey }
    );
    student.plan = planKey;
    student.paymentStatus = 'pending';
    student.paymentRef = order.id; // razorpay order id
    await student.save();

    res.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planTitle: plan.title,
      name: process.env.MERCHANT_NAME || 'Student Benefit Card',
      prefill: { name: student.name || '', contact: student.phone || '', email: student.email || '' },
    });
  } catch (e) {
    console.error('[payment] create-order failed:', e.response?.data || e.message);
    res.status(502).json({ error: 'Could not start payment' });
  }
});

// Verify the checkout signature and activate the account on success.
router.post('/verify', auth('student'), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }
  if (!razorpay.verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Mark paid, generate card, send WhatsApp success message (shared with the WA flow).
  await chatbot.completeRegistration(student.phone, razorpay_payment_id);

  const updated = await Student.findById(req.user.id).lean();
  res.json({
    ok: true,
    student: {
      id: updated._id,
      phone: updated.phone,
      name: updated.name,
      plan: updated.plan,
      registered: updated.registered,
      paymentStatus: updated.paymentStatus,
      cardId: updated.cardId,
      cardUrl: updated.cardUrl,
    },
  });
});

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
