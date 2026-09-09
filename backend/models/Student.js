const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    // WhatsApp phone (digits only, E.164 without +), unique identity across web + WhatsApp
    phone: { type: String, required: true, unique: true, index: true },

    name: { type: String, default: '' },
    altPhone: { type: String, default: '' }, // separate "phone number" field asked in flow
    school: { type: String, default: '' }, // school / institute name
    dob: { type: String, default: '' }, // stored as YYYY-MM-DD

    plan: { type: String, enum: ['silver', 'gold', 'platinum', ''], default: '' },

    // Web account
    email: { type: String, default: '' },
    passwordHash: { type: String, default: '' },

    // Card
    cardId: { type: String, default: '', index: true }, // e.g. SBC-000123
    cardUrl: { type: String, default: '' }, // Cloudinary URL of generated card front
    photoUrl: { type: String, default: '' },

    // Registration lifecycle
    registered: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ['none', 'pending', 'paid', 'failed'],
      default: 'none',
    },
    paymentRef: { type: String, default: '' },

    // Prizes (added/updated by admin after successful payment)
    prizes: [
      {
        title: String,
        detail: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],

    source: { type: String, enum: ['whatsapp', 'web'], default: 'whatsapp' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', StudentSchema);
