const express = require('express');
const multer = require('multer');
const router = express.Router();

const { auth } = require('../middleware/auth');
const Category = require('../models/Category');
const Partner = require('../models/Partner');
const { uploadBuffer, destroy } = require('../config/cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Public: active categories
router.get('/', async (req, res) => {
  const cats = await Category.find({ active: true }).sort({ order: 1, name: 1 }).lean();
  res.json(cats);
});

// Admin: all categories
router.get('/all', auth('admin'), async (req, res) => {
  const cats = await Category.find({}).sort({ order: 1, name: 1 }).lean();
  res.json(cats);
});

// Admin: create category (with 1:1 image)
router.post('/', auth('admin'), upload.single('image'), async (req, res) => {
  const { name, order } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Category name required' });
  let imageUrl = '';
  let imagePublicId = '';
  if (req.file) {
    const up = await uploadBuffer(req.file.buffer, { folder: 'sbc/categories' });
    imageUrl = up.secure_url;
    imagePublicId = up.public_id;
  }
  const cat = await Category.create({
    name,
    order: Number(order) || 0,
    imageUrl,
    imagePublicId,
  });
  res.json(cat);
});

// Admin: update category
router.put('/:id', auth('admin'), upload.single('image'), async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  const { name, order, active } = req.body || {};
  if (name !== undefined) cat.name = name;
  if (order !== undefined) cat.order = Number(order) || 0;
  if (active !== undefined) cat.active = active === true || active === 'true';
  if (req.file) {
    if (cat.imagePublicId) await destroy(cat.imagePublicId).catch(() => {});
    const up = await uploadBuffer(req.file.buffer, { folder: 'sbc/categories' });
    cat.imageUrl = up.secure_url;
    cat.imagePublicId = up.public_id;
  }
  await cat.save();
  res.json({ ok: true });
});

// Admin: delete category (unassigns it from partners)
router.delete('/:id', auth('admin'), async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Not found' });
  if (cat.imagePublicId) await destroy(cat.imagePublicId).catch(() => {});
  await cat.deleteOne();
  await Partner.updateMany({ category: cat._id }, { $set: { category: null } });
  res.json({ ok: true });
});

module.exports = router;
