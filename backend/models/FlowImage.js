const mongoose = require('mongoose');

// Admin-uploadable images used in WhatsApp flows and message headers.
// Keyed by a stable slot name (see services/flowImages.js IMAGE_KEYS).
const FlowImageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: '' },
    url: { type: String, default: '' }, // Cloudinary secure_url
    publicId: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FlowImage', FlowImageSchema);
