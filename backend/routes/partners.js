const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const router = express.Router();

const { auth } = require('../middleware/auth');
const Partner = require('../models/Partner');
const Redemption = require('../models/Redemption');
const { uploadBuffer, destroy } = require('../config/cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function slugify(name) {
  return String(name || 'partner')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12) || 'partner';
}
function randPassword() {
  return Math.random().toString(36).slice(-4) + Math.floor(1000 + Math.random() * 9000);
}

// Public: active partners list
router.get('/', async (req, res) => {
  const partners = await Partner.find({ active: true })
    .select('name description location imageUrl')
    .sort({ name: 1 })
    .lean();
  res.json(partners);
});

// Admin: list all partners
router.get('/all', auth('admin'), async (req, res) => {
  const partners = await Partner.find({}).sort({ createdAt: -1 }).lean();
  res.json(
    partners.map((p) => ({
      ...p,
      passwordHash: undefined,
    }))
  );
});

// Admin: create partner (auto-generates username + password)
router.post('/', auth('admin'), upload.single('image'), async (req, res) => {
  const { name, description, location } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Partner name required' });

  // Unique username
  let base = slugify(name);
  let username = base;
  let i = 0;
  while (await Partner.findOne({ username })) {
    i += 1;
    username = `${base}${i}`;
  }
  const plainPassword = randPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  let imageUrl = '';
  let imagePublicId = '';
  if (req.file) {
    const up = await uploadBuffer(req.file.buffer, { folder: 'sbc/partners' });
    imageUrl = up.secure_url;
    imagePublicId = up.public_id;
  }

  const partner = await Partner.create({
    name,
    description: description || '',
    location: location || '',
    imageUrl,
    imagePublicId,
    username,
    passwordHash,
    plainPasswordHint: plainPassword,
  });

  res.json({
    id: partner._id,
    name: partner.name,
    username,
    password: plainPassword, // shown once
    imageUrl,
  });
});

// Admin: update partner
router.put('/:id', auth('admin'), upload.single('image'), async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Not found' });
  const { name, description, location, active } = req.body || {};
  if (name !== undefined) partner.name = name;
  if (description !== undefined) partner.description = description;
  if (location !== undefined) partner.location = location;
  if (active !== undefined) partner.active = active === true || active === 'true';
  if (req.file) {
    if (partner.imagePublicId) await destroy(partner.imagePublicId).catch(() => {});
    const up = await uploadBuffer(req.file.buffer, { folder: 'sbc/partners' });
    partner.imageUrl = up.secure_url;
    partner.imagePublicId = up.public_id;
  }
  await partner.save();
  res.json({ ok: true });
});

// Admin: reset partner password
router.post('/:id/reset-password', auth('admin'), async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Not found' });
  const plainPassword = randPassword();
  partner.passwordHash = await bcrypt.hash(plainPassword, 10);
  partner.plainPasswordHint = plainPassword;
  await partner.save();
  res.json({ username: partner.username, password: plainPassword });
});

// Admin: delete partner
router.delete('/:id', auth('admin'), async (req, res) => {
  const partner = await Partner.findById(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Not found' });
  if (partner.imagePublicId) await destroy(partner.imagePublicId).catch(() => {});
  await partner.deleteOne();
  await Redemption.deleteMany({ partner: partner._id });
  res.json({ ok: true });
});

module.exports = router;
