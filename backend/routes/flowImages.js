const express = require('express');
const multer = require('multer');
const router = express.Router();

const { auth } = require('../middleware/auth');
const flowImages = require('../services/flowImages');
const FlowImage = require('../models/FlowImage');
const { uploadBuffer, destroy } = require('../config/cloudinary');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function bustFlowCache() {
  try {
    const fe = require('./flowEndpoint');
    if (fe.clearImageCache) fe.clearImageCache();
  } catch {
    /* ignore */
  }
}

// List all slots (admin)
router.get('/', auth('admin'), async (req, res) => {
  const list = await flowImages.listAll();
  res.json(list);
});

// Upload / replace a slot
router.post('/:key', auth('admin'), upload.single('image'), async (req, res) => {
  const { key } = req.params;
  if (!flowImages.isValidKey(key)) return res.status(400).json({ error: 'Unknown image key' });
  if (!req.file) return res.status(400).json({ error: 'No file' });

  const existing = await FlowImage.findOne({ key });
  if (existing?.publicId) await destroy(existing.publicId).catch(() => {});

  const up = await uploadBuffer(req.file.buffer, { folder: `sbc/flow/${key}` });
  const doc = await FlowImage.findOneAndUpdate(
    { key },
    { $set: { url: up.secure_url, publicId: up.public_id } },
    { upsert: true, new: true }
  );
  bustFlowCache();
  res.json({ key: doc.key, url: doc.url });
});

// Delete a slot's image
router.delete('/:key', auth('admin'), async (req, res) => {
  const { key } = req.params;
  const existing = await FlowImage.findOne({ key });
  if (existing?.publicId) await destroy(existing.publicId).catch(() => {});
  await FlowImage.updateOne({ key }, { $set: { url: '', publicId: '' } });
  bustFlowCache();
  res.json({ ok: true });
});

module.exports = router;
