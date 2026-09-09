const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['silver', 'gold', 'platinum'],
    },
    title: { type: String, required: true }, // "Silver Plan"
    description: { type: String, default: '' },
    price: { type: Number, required: true }, // INR
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', PlanSchema);
