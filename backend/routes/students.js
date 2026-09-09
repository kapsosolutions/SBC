const express = require('express');
const router = express.Router();

const { auth } = require('../middleware/auth');
const Student = require('../models/Student');
const Redemption = require('../models/Redemption');
const { publicStudent } = require('./auth');

// ---------- Student self (web) ----------
router.get('/me', auth('student'), async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  res.json(publicStudent(student));
});

router.get('/me/usage', auth('student'), async (req, res) => {
  const student = await Student.findById(req.user.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  const rows = await Redemption.find({ studentPhone: student.phone })
    .populate('partner', 'name location imageUrl')
    .lean();
  res.json(
    rows.map((r) => ({
      partner: r.partner,
      count: r.count,
      limit: r.limit,
    }))
  );
});

// ---------- Admin ----------
router.get('/', auth('admin'), async (req, res) => {
  const students = await Student.find({}).sort({ createdAt: -1 }).lean();
  res.json(students.map((s) => ({ ...s, passwordHash: undefined })));
});

router.get('/:id', auth('admin'), async (req, res) => {
  const s = await Student.findById(req.params.id).lean();
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json({ ...s, passwordHash: undefined });
});

// Admin: add / update prizes for a student
router.post('/:id/prizes', auth('admin'), async (req, res) => {
  const { title, detail } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Prize title required' });
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  student.prizes.push({ title, detail: detail || '' });
  await student.save();
  res.json({ ok: true, prizes: student.prizes });
});

router.delete('/:id/prizes/:prizeId', auth('admin'), async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  student.prizes.id(req.params.prizeId)?.deleteOne();
  await student.save();
  res.json({ ok: true, prizes: student.prizes });
});

module.exports = router;
