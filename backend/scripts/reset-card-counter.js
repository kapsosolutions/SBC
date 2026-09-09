require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Counter = require('../models/Counter');

(async () => {
  await connectDB();
  await Counter.updateOne({ key: 'cardId' }, { $set: { seq: 0 } }, { upsert: true });
  console.log('✅ cardId counter reset to 0 (next card = SBC-000001)');
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
