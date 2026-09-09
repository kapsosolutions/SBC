const mongoose = require('mongoose');

// Atomic sequence generator (used for card IDs like SBC-000123).
const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.statics.next = async function (key) {
  const doc = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', CounterSchema);
