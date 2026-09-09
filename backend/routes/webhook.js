const express = require('express');
const router = express.Router();

const meta = require('../services/metaCloud');
const chatbot = require('../services/chatbot');
const Student = require('../models/Student');
const Plan = require('../models/Plan');
const flowImages = require('../services/flowImages');

// ---------- Webhook verification (GET) ----------
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---------- Incoming events (POST) ----------
router.post('/', async (req, res) => {
  // Respond fast so Meta does not retry
  res.sendStatus(200);
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value) return;

    // Payment status updates
    if (Array.isArray(value.statuses)) {
      for (const status of value.statuses) {
        await handlePaymentStatus(status);
      }
    }

    // Inbound messages
    if (Array.isArray(value.messages)) {
      for (const msg of value.messages) {
        await handleMessage(msg, value);
      }
    }
  } catch (err) {
    console.error('[Webhook] error:', err.message);
  }
});

async function handleMessage(msg, value) {
  const from = msg.from; // phone (digits)
  const type = msg.type;

  // 1. Text: greeting -> Choose Service
  if (type === 'text') {
    const body = (msg.text?.body || '').trim().toLowerCase();
    if (['hi', 'hello', 'hey', 'start', 'hai', 'menu'].includes(body)) {
      return chatbot.sendChooseService(from);
    }
    // default: also offer services
    return chatbot.sendChooseService(from);
  }

  // 2. Interactive
  if (type === 'interactive') {
    const it = msg.interactive;

    // Flow completion (nfm_reply)
    if (it?.type === 'nfm_reply') {
      let payload = {};
      try {
        payload = JSON.parse(it.nfm_reply.response_json || '{}');
      } catch {
        payload = {};
      }
      return handleFlowCompletion(from, payload);
    }

    // Button replies (fallback path when no flow)
    if (it?.type === 'button_reply') {
      const id = it.button_reply.id;
      if (id === 'register') return chatbot.sendChooseService(from);
      if (id === 'partners') return chatbot.sendChooseService(from);
      if (id === 'contact') return chatbot.sendContact(from);
      return chatbot.sendChooseService(from);
    }
  }

  // Anything else -> menu
  return chatbot.sendChooseService(from);
}

/**
 * Handle the payload returned when the WhatsApp Flow completes.
 * For register_payment we save the student and send native payment.
 */
async function handleFlowCompletion(from, payload) {
  // Only the CONFIRM screen completes the flow (register + pay).
  if (payload?.intent !== 'register_payment') return;
  const phone = meta.normalizePhone(from);

  const planKey = payload.selected_plan;
  const plan = await Plan.findOne({ key: planKey }).lean();
  if (!plan) {
    return meta.sendText(from, 'Selected plan is unavailable. Please try again.');
  }

  // Upsert latest data from the flow payload
  await Student.updateOne(
    { phone },
    {
      $set: {
        phone,
        name: payload.student_name || '',
        school: payload.school || '',
        dob: payload.dob || '',
        plan: planKey,
        paymentStatus: 'pending',
        source: 'whatsapp',
      },
    },
    { upsert: true }
  );

  const referenceId = `SBC${Date.now().toString(36).toUpperCase()}`;
  await Student.updateOne({ phone }, { $set: { paymentRef: referenceId } });

  const headerImageUrl = (await flowImages.getUrl('chat_payment_header')) || undefined;

  try {
    await meta.sendOrderDetails(from, {
      referenceId,
      items: [{ name: `${plan.title} - Student Benefit Card`, amount: plan.price, quantity: 1 }],
      totalAmount: plan.price,
      headerImageUrl,
      bodyText: `🧾 *${plan.title}*\nReview and pay ₹${plan.price} securely to activate your card.`,
    });
  } catch (e) {
    console.error('[Webhook] sendOrderDetails failed:', e.message);
    // Fallback: web payment/registration link
    const url = `${(process.env.FRONTEND_URL || '').replace(/\/+$/, '')}/register?phone=${phone}`;
    await meta.sendCtaUrl(from, {
      bodyText: `Complete your ${plan.title} registration (₹${plan.price}) securely on our site.`,
      buttonText: 'Complete Payment',
      url,
    });
  }
}

/**
 * Payment status from value.statuses[].payment
 */
async function handlePaymentStatus(status) {
  const payment = status?.payment;
  if (!payment) return;

  const txn = payment.transaction || {};
  const referenceId = payment.reference_id || payment.receipt || txn.id || status.id;
  const state = (payment.status || txn.status || '').toLowerCase();

  const student = await Student.findOne({ paymentRef: referenceId });
  if (!student) {
    console.warn('[Webhook] payment for unknown ref', referenceId);
    return;
  }
  const phone = student.phone;

  if (['captured', 'success', 'completed', 'paid'].includes(state)) {
    if (student.paymentStatus === 'paid') return; // idempotent
    await chatbot.completeRegistration(phone, txn.id || referenceId);
  } else if (['failed', 'cancelled', 'canceled', 'declined'].includes(state)) {
    student.paymentStatus = 'failed';
    await student.save();
    await meta.sendText(phone, 'Your payment did not go through. Send "hi" and tap Register to try again.');
  }
  // pending -> wait
}

module.exports = router;
