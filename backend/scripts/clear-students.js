// One-time cleanup: remove all student records + their redemptions + OTPs.
// Does NOT touch partners, plans, admin, or flow images.
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Student = require('../models/Student');
const Redemption = require('../models/Redemption');
const Otp = require('../models/Otp');

(async () => {
  await connectDB();
  const s = await Student.deleteMany({});
  const r = await Redemption.deleteMany({});
  const o = await Otp.deleteMany({});
  console.log(`✅ Deleted students=${s.deletedCount} redemptions=${r.deletedCount} otps=${o.deletedCount}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('clear-students failed:', e);
  process.exit(1);
});
