const express = require('express');
const router = express.Router();

const { auth } = require('../middleware/auth');
const Partner = require('../models/Partner');
const Redemption = require('../models/Redemption');

// Dashboard: partner profile + QR data + summary stats
router.get('/dashboard', auth('partner'), async (req, res) => {
  const partner = await Partner.findById(req.user.id).lean();
  if (!partner) return res.status(404).json({ error: 'Not found' });

  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const uniqueCustomers = await Redemption.countDocuments({ partner: partner._id });

  res.json({
    partner: {
      id: partner._id,
      name: partner.name,
      description: partner.description,
      location: partner.location,
      imageUrl: partner.imageUrl,
      username: partner.username,
    },
    // Students scan this to redeem
    qrData: `${frontend}/scan?partner=${partner._id}`,
    stats: {
      totalScans: partner.totalScans || 0,
      totalRedemptions: partner.totalRedemptions || 0,
      uniqueCustomers,
    },
  });
});

// Customers who redeemed at this partner
router.get('/customers', auth('partner'), async (req, res) => {
  const rows = await Redemption.find({ partner: req.user.id })
    .populate('student', 'name phone cardId plan')
    .sort({ updatedAt: -1 })
    .lean();
  res.json(
    rows.map((r) => ({
      name: r.student?.name || '',
      phone: r.studentPhone,
      cardId: r.student?.cardId || '',
      plan: r.student?.plan || '',
      count: r.count,
      limit: r.limit,
      lastUsed: r.updatedAt,
    }))
  );
});

// Usage log (all redemption events)
router.get('/usage', auth('partner'), async (req, res) => {
  const rows = await Redemption.find({ partner: req.user.id })
    .populate('student', 'name phone cardId')
    .lean();
  const events = [];
  for (const r of rows) {
    for (const h of r.history || []) {
      events.push({
        name: r.student?.name || '',
        phone: r.studentPhone,
        cardId: r.student?.cardId || '',
        at: h.at,
      });
    }
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json(events);
});

module.exports = router;
