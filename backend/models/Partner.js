const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // partner / brand name
    description: { type: String, default: '' },
    location: { type: String, default: '' }, // business location
    imageUrl: { type: String, default: '' }, // 1:1 ratio image
    imagePublicId: { type: String, default: '' },

    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    offerPercent: { type: Number, default: 0 }, // discount % they provide

    // Auto-generated login credentials for the partner panel
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    plainPasswordHint: { type: String, default: '' }, // shown once in admin after creation

    active: { type: Boolean, default: true },

    // Aggregate usage counters
    totalScans: { type: Number, default: 0 },
    totalRedemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', PartnerSchema);
