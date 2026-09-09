const mongoose = require('mongoose');

// OTP for web registration WhatsApp number verification.
const OtpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL index — auto-remove 1 hour after expiry
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('Otp', OtpSchema);
