const express = require('express');
const router = express.Router();

const Student = require('../models/Student');
const Partner = require('../models/Partner');
const Redemption = require('../models/Redemption');
const chatbot = require('../services/chatbot');
const meta = require('../services/metaCloud');

function extractPartnerId(raw) {
  const s = String(raw || '').trim();
  // Accept a bare id, or a URL like https://site/scan?partner=<id> or /p/<id>
  const q = s.match(/[?&]partner=([a-f0-9]{24})/i);
  if (q) return q[1];
  const p = s.match(/\/p\/([a-f0-9]{24})/i);
  if (p) return p[1];
  const id = s.match(/([a-f0-9]{24})/i);
  return id ? id[1] : s;
}

/**
 * Public redeem endpoint hit by the web scanner.
 * body: { phone, partner (raw scanned text or id) }
 */
router.post('/redeem', async (req, res) => {
  const phone = meta.normalizePhone(req.body?.phone);
  const partnerId = extractPartnerId(req.body?.partner);
  if (!phone) return res.status(400).json({ error: 'Missing phone' });
  if (!partnerId) return res.status(400).json({ error: 'Invalid QR' });

  const student = await Student.findOne({ phone });
  if (!student || !student.registered) {
    return res.status(403).json({ error: 'Card not active. Please register first.' });
  }
  const partner = await Partner.findById(partnerId).catch(() => null);
  if (!partner || !partner.active) return res.status(404).json({ error: 'Partner not found' });

  const limit = Number(process.env.CARD_SCAN_LIMIT || 4);
  let redemption = await Redemption.findOne({ studentPhone: phone, partner: partner._id });
  if (!redemption) {
    redemption = new Redemption({
      student: student._id,
      studentPhone: phone,
      partner: partner._id,
      count: 0,
      limit,
    });
  }

  if (redemption.count >= limit) {
    // Send limit reached WhatsApp message
    setImmediate(() =>
      chatbot.sendLimitReached(phone, { partnerName: partner.name, limit }).catch(() => {})
    );
    return res.status(409).json({
      error: 'limit_reached',
      message: `You have reached the limit of ${limit} redemptions at ${partner.name}.`,
      count: redemption.count,
      limit,
    });
  }

  redemption.count += 1;
  redemption.history.push({ at: new Date() });
  await redemption.save();

  partner.totalScans += 1;
  partner.totalRedemptions += 1;
  await partner.save();

  // Send offer-redeemed WhatsApp message + re-offer services
  setImmediate(() =>
    chatbot
      .sendOfferRedeemed(phone, { partnerName: partner.name, count: redemption.count, limit })
      .catch(() => {})
  );

  res.json({
    ok: true,
    partner: partner.name,
    count: redemption.count,
    limit,
    remaining: limit - redemption.count,
  });
});

module.exports = router;
