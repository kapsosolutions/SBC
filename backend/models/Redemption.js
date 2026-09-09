const mongoose = require('mongoose');

// One document per (student, partner) pair tracking how many of the
// allowed scans (default 4) have been redeemed.
const RedemptionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    studentPhone: { type: String, index: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', index: true },

    count: { type: Number, default: 0 }, // times redeemed at this partner
    limit: { type: Number, default: 4 },

    history: [
      {
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

RedemptionSchema.index({ studentPhone: 1, partner: 1 }, { unique: true });

module.exports = mongoose.model('Redemption', RedemptionSchema);
