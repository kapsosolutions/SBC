// One-time cleanup: canonicalize all student phones to include the country code
// and MERGE any duplicate records (e.g. web "8106811285" + WhatsApp "918106811285").
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { normalizePhone } = require('../services/metaCloud');
const Student = require('../models/Student');
const Redemption = require('../models/Redemption');

function pick(target, source, field) {
  if (target[field] === undefined || target[field] === null || target[field] === '') {
    target[field] = source[field];
  }
}

(async () => {
  await connectDB();
  const students = await Student.find({}).sort({ createdAt: 1 });
  const byCanonical = new Map();
  let merged = 0;
  let renamed = 0;

  for (const s of students) {
    const canonical = normalizePhone(s.phone);
    if (!byCanonical.has(canonical)) {
      // First record for this canonical number
      if (s.phone !== canonical) {
        s.phone = canonical;
        await s.save();
        renamed += 1;
      }
      byCanonical.set(canonical, s);
      continue;
    }

    // Duplicate -> merge s into the existing target
    const target = byCanonical.get(canonical);
    for (const f of ['name', 'altPhone', 'school', 'dob', 'email', 'passwordHash', 'plan', 'cardId', 'cardUrl', 'photoUrl', 'paymentRef']) {
      pick(target, s, f);
    }
    target.registered = target.registered || s.registered;
    if (s.paymentStatus === 'paid') target.paymentStatus = 'paid';
    else if (!target.paymentStatus || target.paymentStatus === 'none') target.paymentStatus = s.paymentStatus;
    target.prizes = [...(target.prizes || []), ...(s.prizes || [])];

    await target.save();
    // Re-point any redemptions from the dup to the target
    await Redemption.updateMany({ studentPhone: s.phone }, { $set: { studentPhone: canonical, student: target._id } });
    await s.deleteOne();
    merged += 1;
    console.log(`Merged ${s.phone} -> ${canonical}`);
  }

  console.log(`\n✅ Done. renamed=${renamed} merged=${merged}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('normalize-phones failed:', e);
  process.exit(1);
});
