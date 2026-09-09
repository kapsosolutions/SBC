const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { sign } = require('../middleware/auth');
const Admin = require('../models/Admin');
const Partner = require('../models/Partner');
const Student = require('../models/Student');
const Otp = require('../models/Otp');
const meta = require('../services/metaCloud');

// ---------- Admin login ----------
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  const admin = await Admin.findOne({ email: (email || '').toLowerCase() });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password || '', admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign({ role: 'admin', id: String(admin._id), email: admin.email });
  res.json({ token, admin: { email: admin.email, name: admin.name } });
});

// ---------- Partner login ----------
router.post('/partner/login', async (req, res) => {
  const { username, password } = req.body || {};
  const partner = await Partner.findOne({ username: (username || '').toLowerCase() });
  if (!partner) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password || '', partner.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign({ role: 'partner', id: String(partner._id), username: partner.username });
  res.json({ token, partner: { id: partner._id, name: partner.name, username: partner.username } });
});

// ---------- Student web: request OTP ----------
router.post('/student/request-otp', async (req, res) => {
  const phone = meta.normalizePhone(req.body?.phone);
  if (!phone || phone.length < 10) return res.status(400).json({ error: 'Valid WhatsApp number required' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await Otp.findOneAndUpdate(
    { phone },
    { phone, code, expiresAt, verified: false, attempts: 0 },
    { upsert: true }
  );

  try {
    await meta.sendText(phone, `Your Student Benefit Card verification code is ${code}. It expires in 5 minutes.`);
  } catch (e) {
    console.error('[auth] OTP send failed:', e.message);
    return res.status(502).json({ error: 'Could not send OTP on WhatsApp. Check the number.' });
  }
  res.json({ ok: true, message: 'OTP sent on WhatsApp' });
});

// ---------- Student web: verify OTP ----------
router.post('/student/verify-otp', async (req, res) => {
  const phone = meta.normalizePhone(req.body?.phone);
  const { code } = req.body || {};
  const otp = await Otp.findOne({ phone });
  if (!otp) return res.status(400).json({ error: 'Request an OTP first' });
  if (otp.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });
  otp.attempts += 1;
  if (otp.attempts > 6) {
    await otp.save();
    return res.status(429).json({ error: 'Too many attempts' });
  }
  if (otp.code !== String(code || '')) {
    await otp.save();
    return res.status(400).json({ error: 'Incorrect code' });
  }
  otp.verified = true;
  await otp.save();
  res.json({ ok: true, message: 'Number verified' });
});

// ---------- Student web: register (after OTP verified) ----------
router.post('/student/register', async (req, res) => {
  const phone = meta.normalizePhone(req.body?.phone);
  const { name, email, password, confirmPassword, school, dob, altPhone } = req.body || {};

  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be 6+ characters' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

  const otp = await Otp.findOne({ phone });
  if (!otp || !otp.verified) return res.status(400).json({ error: 'Verify your WhatsApp number first' });

  let student = await Student.findOne({ phone });
  const passwordHash = await bcrypt.hash(password, 10);

  if (student) {
    // Existing (maybe from WhatsApp) -> attach web credentials
    student.name = name || student.name;
    student.email = email || student.email;
    student.school = school || student.school;
    student.dob = dob || student.dob;
    student.altPhone = altPhone || student.altPhone;
    student.passwordHash = passwordHash;
    await student.save();
  } else {
    student = await Student.create({
      phone,
      name: name || '',
      email: email || '',
      school: school || '',
      dob: dob || '',
      altPhone: altPhone || '',
      passwordHash,
      source: 'web',
    });
  }

  const token = sign({ role: 'student', id: String(student._id), phone });
  res.json({
    token,
    student: publicStudent(student),
    note: 'Complete plan selection & payment on WhatsApp to activate your card.',
  });
});

// ---------- Student web: login ----------
router.post('/student/login', async (req, res) => {
  const phone = meta.normalizePhone(req.body?.phone);
  const { password } = req.body || {};
  const student = await Student.findOne({ phone });
  if (!student || !student.passwordHash) {
    return res.status(401).json({ error: 'No web account. Please register.' });
  }
  const ok = await bcrypt.compare(password || '', student.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = sign({ role: 'student', id: String(student._id), phone });
  res.json({ token, student: publicStudent(student) });
});

function publicStudent(s) {
  return {
    id: s._id,
    phone: s.phone,
    name: s.name,
    email: s.email,
    school: s.school,
    dob: s.dob,
    plan: s.plan,
    registered: s.registered,
    paymentStatus: s.paymentStatus,
    cardId: s.cardId,
    cardUrl: s.cardUrl,
    prizes: s.prizes,
  };
}

module.exports = router;
module.exports.publicStudent = publicStudent;
