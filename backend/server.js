require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
require('./config/cloudinary');

const flowImagesService = require('./services/flowImages');

const app = express();

app.use(cors());
// Capture the raw request body so the Razorpay webhook can verify its HMAC signature.
app.use(
  express.json({
    limit: '5mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/webhook', require('./routes/webhook'));
app.use('/api/flow-endpoint', require('./routes/flowEndpoint'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/flow-images', require('./routes/flowImages'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/students', require('./routes/students'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/partner-panel', require('./routes/partnerPanel'));
app.use('/api/payment', require('./routes/payment'));

app.get('/', (req, res) => res.json({ service: 'SBC backend', status: 'ok' }));
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await flowImagesService.ensureKeysExist();
  await ensureAdmin();
  await ensureDefaultPlans();
  app.listen(PORT, () => {
    console.log(`[SBC] backend listening on :${PORT}`);
    console.log(`[SBC] webhook:        {BACKEND_URL}/webhook`);
    console.log(`[SBC] flow endpoint:  {BACKEND_URL}/api/flow-endpoint`);
  });
}

// Seed default admin from env if none exists
async function ensureAdmin() {
  const bcrypt = require('bcryptjs');
  const Admin = require('./models/Admin');
  const email = (process.env.ADMIN_EMAIL || 'admin@sbc.com').toLowerCase();
  const existing = await Admin.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    await Admin.create({ email, passwordHash, name: 'Admin' });
    console.log(`[SBC] created admin: ${email}`);
  }
}

// Seed default plans if empty
async function ensureDefaultPlans() {
  const Plan = require('./models/Plan');
  const count = await Plan.countDocuments();
  if (count === 0) {
    await Plan.insertMany([
      { key: 'silver', title: 'Silver Plan', description: 'Basic student benefits', price: 199, order: 1 },
      { key: 'gold', title: 'Gold Plan', description: 'Popular — more partner offers', price: 399, order: 2 },
      { key: 'platinum', title: 'Platinum Plan', description: 'All benefits & priority offers', price: 599, order: 3 },
    ]);
    console.log('[SBC] seeded default plans');
  }
}

start().catch((err) => {
  console.error('[SBC] fatal:', err);
  process.exit(1);
});
