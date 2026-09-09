const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Plan = require('../models/Plan');

// Public: active plans
router.get('/', async (req, res) => {
  const plans = await Plan.find({ active: true }).sort({ order: 1 }).lean();
  res.json(plans);
});

// Admin: all plans
router.get('/all', auth('admin'), async (req, res) => {
  const plans = await Plan.find({}).sort({ order: 1 }).lean();
  res.json(plans);
});

// Admin: create/update a plan by key
router.put('/:key', auth('admin'), async (req, res) => {
  const { key } = req.params;
  if (!['silver', 'gold', 'platinum'].includes(key)) {
    return res.status(400).json({ error: 'Invalid plan key' });
  }
  const { title, description, price, order, active } = req.body || {};
  const doc = await Plan.findOneAndUpdate(
    { key },
    {
      $set: {
        title: title ?? key,
        description: description ?? '',
        price: Number(price) || 0,
        order: Number(order) || 0,
        active: active !== false,
      },
    },
    { upsert: true, new: true }
  );
  res.json(doc);
});

module.exports = router;
