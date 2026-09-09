const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const bcrypt = require('bcryptjs');
const flowImages = require('../services/flowImages');
const { urlToBase64 } = require('../services/imageBase64');
const { phoneFromToken } = require('../utils/helpers');
const Student = require('../models/Student');
const Plan = require('../models/Plan');
const Partner = require('../models/Partner');
const Redemption = require('../models/Redemption');

// ---------- Key loading ----------
function loadPrivateKey() {
  const raw = process.env.FLOW_PRIVATE_KEY || '';
  return raw.split('\\n').join('\n');
}
const FLOW_PRIVATE_KEY = loadPrivateKey();
const FLOW_PRIVATE_KEY_PASSPHRASE = process.env.FLOW_PRIVATE_KEY_PASSPHRASE || '';

// ---------- Crypto ----------
function decryptRequest(body) {
  if (!FLOW_PRIVATE_KEY) throw new Error('FLOW_PRIVATE_KEY not configured');
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body || {};
  if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
    throw new Error('Missing encryption fields');
  }
  const keyOptions = { key: FLOW_PRIVATE_KEY, format: 'pem' };
  if (FLOW_PRIVATE_KEY_PASSPHRASE) keyOptions.passphrase = FLOW_PRIVATE_KEY_PASSPHRASE;
  const privateKey = crypto.createPrivateKey(keyOptions);

  const aesKeyBuffer = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  const ivBuffer = Buffer.from(initial_vector, 'base64');
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const TAG_LEN = 16;
  const authTag = flowDataBuffer.slice(-TAG_LEN);
  const ciphertext = flowDataBuffer.slice(0, -TAG_LEN);

  const alg = aesKeyBuffer.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
  const decipher = crypto.createDecipheriv(alg, aesKeyBuffer, ivBuffer);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return { decryptedBody: JSON.parse(plain.toString('utf-8')), aesKeyBuffer, ivBuffer };
}

function encryptResponse(obj, aesKeyBuffer, ivBuffer) {
  if (!aesKeyBuffer || !ivBuffer) return obj;
  const flipped = Buffer.alloc(ivBuffer.length);
  for (let i = 0; i < ivBuffer.length; i++) flipped[i] = ~ivBuffer[i] & 0xff;
  const alg = aesKeyBuffer.length === 32 ? 'aes-256-gcm' : 'aes-128-gcm';
  const cipher = crypto.createCipheriv(alg, aesKeyBuffer, flipped);
  const out = Buffer.concat([
    cipher.update(JSON.stringify(obj), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return out.toString('base64');
}

function sendResponse(res, obj, aesKeyBuffer, ivBuffer) {
  const payload = { version: '3.0', ...obj };
  const out = encryptResponse(payload, aesKeyBuffer, ivBuffer);
  if (typeof out === 'string') {
    res.set('Content-Type', 'text/plain');
    return res.send(out);
  }
  return res.json(out);
}

// ---------- Image cache (10 min) ----------
let imgCache = { data: null, ts: 0 };
const IMG_TTL = 10 * 60 * 1000;
function clearImageCache() {
  imgCache = { data: null, ts: 0 };
}

const BANNER_KEYS = ['flow_welcome_banner', 'flow_register_banner', 'flow_plan_banner', 'flow_partners_banner'];
const ICON_KEYS = [
  'icon_register',
  'icon_mycard',
  'icon_usecard',
  'icon_partners',
  'icon_contact',
  'icon_plan_silver',
  'icon_plan_gold',
  'icon_plan_platinum',
];

// Screen payload budget is ~240KB. Keep the banner high quality (~150KB) and
// each square icon small (~10KB). base64 inflates ~33%, so target sub-limits.
const BANNER_OPTS = { width: 1400, height: 175, crop: 'fill', quality: 80, format: 'jpg' };
const ICON_OPTS = { width: 130, height: 130, crop: 'fill', quality: 55, format: 'jpg' };

async function loadImagesB64() {
  if (imgCache.data && Date.now() - imgCache.ts < IMG_TTL) return imgCache.data;
  const keys = [...BANNER_KEYS, ...ICON_KEYS];
  const map = await flowImages.getMap(keys);
  const entries = await Promise.all(
    keys.map(async (k) => {
      const url = map[k];
      if (!url) return [k, ''];
      const opts = k.startsWith('icon_') ? ICON_OPTS : BANNER_OPTS;
      return [k, await urlToBase64(url, opts)];
    })
  );
  imgCache = { data: Object.fromEntries(entries), ts: Date.now() };
  return imgCache.data;
}

// Map each service to its uploaded icon slot and attach the base64 image.
const SERVICE_ICON = {
  register: 'icon_register',
  mycard: 'icon_mycard',
  usecard: 'icon_usecard',
  partners: 'icon_partners',
  contact: 'icon_contact',
};
function withIcons(services, imgs) {
  return services.map((s) => {
    const b64 = imgs[SERVICE_ICON[s.id]];
    return b64 ? { ...s, image: b64 } : s;
  });
}

// ---------- Service catalogs ----------
function servicesForNewUser() {
  return [
    { id: 'register', title: 'Register', description: 'Get your student benefit card' },
    { id: 'partners', title: 'Our Partners', description: 'Browse partner offers' },
    { id: 'contact', title: 'Contact', description: 'Talk to our team' },
  ];
}
function servicesForRegistered() {
  return [
    { id: 'mycard', title: 'My Card', description: 'View your student card' },
    { id: 'usecard', title: 'Use Card', description: 'Scan & redeem an offer' },
    { id: 'partners', title: 'Our Partners', description: 'Browse partner offers' },
    { id: 'contact', title: 'Contact', description: 'Talk to our team' },
  ];
}

// ---------- Screen builders ----------
async function handleInit(flowToken) {
  const phone = phoneFromToken(flowToken);
  const imgs = await loadImagesB64();
  const student = phone ? await Student.findOne({ phone }) : null;
  const registered = !!(student && student.registered);
  const banner = imgs.flow_welcome_banner || '';
  return {
    screen: 'SERVICE_SELECT',
    data: {
      welcome_banner: banner,
      has_welcome_banner: !!banner,
      heading: 'Welcome to Student Benefit Card',
      services: withIcons(registered ? servicesForRegistered() : servicesForNewUser(), imgs),
    },
  };
}

async function screenRegister(phone, imgs) {
  const banner = imgs.flow_register_banner || '';
  return {
    screen: 'REGISTER',
    data: {
      register_banner: banner,
      has_register_banner: !!banner,
      whatsapp_number: phone,
    },
  };
}

async function screenPlans(imgs) {
  const banner = imgs.flow_plan_banner || '';
  const plans = await Plan.find({ active: true }).sort({ order: 1 }).lean();
  const list = (plans.length ? plans : []).map((p) => {
    const b64 = imgs[`icon_plan_${p.key}`];
    const item = {
      id: p.key,
      title: `${p.title} — ₹${p.price}`,
      description: p.description || '',
    };
    if (b64) item.image = b64;
    return item;
  });
  return {
    screen: 'PLAN_SELECT',
    data: {
      plan_banner: banner,
      has_plan_banner: !!banner,
      plans: list,
    },
  };
}

async function screenPartnersList(imgs) {
  const banner = imgs.flow_partners_banner || '';
  const partners = await Partner.find({ active: true }).sort({ name: 1 }).limit(10).lean();
  const list = partners.map((p) => ({
    id: String(p._id),
    title: p.name,
    description: p.location || p.description || '',
  }));
  return {
    screen: 'PARTNERS_LIST',
    data: {
      partners_banner: banner,
      has_partners_banner: !!banner,
      partners: list.length ? list : [{ id: 'none', title: 'No partners yet', description: 'Check back soon' }],
    },
  };
}

async function screenPartnerDetails(partnerId, phone) {
  const partner = await Partner.findById(partnerId).lean().catch(() => null);
  if (!partner) {
    return { screen: 'INFO', data: { info_title: 'Not found', info_body: 'That partner is unavailable.' } };
  }
  const limit = Number(process.env.CARD_SCAN_LIMIT || 4);
  let count = 0;
  if (phone) {
    const r = await Redemption.findOne({ studentPhone: phone, partner: partner._id }).lean();
    count = r?.count || 0;
  }
  let img = '';
  if (partner.imageUrl) {
    img = await urlToBase64(partner.imageUrl, { width: 300, height: 300, crop: 'fill', quality: 75, format: 'jpg' });
  }
  const body = [
    partner.description || '',
    partner.location ? `📍 ${partner.location}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    screen: 'PARTNER_DETAILS',
    data: {
      partner_image: img,
      has_partner_image: !!img,
      partner_name: partner.name,
      partner_body: body || 'Partner offer',
      usage_text: `Redeemed ${count} of ${limit} times`,
    },
  };
}

async function handleDataExchange({ screen, data, flowToken }) {
  const phone = phoneFromToken(flowToken);
  const imgs = await loadImagesB64();

  if (screen === 'SERVICE_SELECT') {
    const svc = data?.selected_service;
    if (svc === 'register') return screenRegister(phone, imgs);
    if (svc === 'partners') return screenPartnersList(imgs);

    // Terminal services: send the chat message, show a brief confirmation screen.
    const chatbot = require('../services/chatbot');
    if (svc === 'mycard') {
      setImmediate(() => chatbot.sendMyCard(phone).catch(() => {}));
      return { screen: 'INFO', data: { info_title: 'My Card', info_body: 'Your card has been sent to this chat 👇' } };
    }
    if (svc === 'usecard') {
      setImmediate(() => chatbot.sendUseCard(phone).catch(() => {}));
      return { screen: 'INFO', data: { info_title: 'Use Card', info_body: 'The scanner link has been sent to this chat 👇' } };
    }
    if (svc === 'contact') {
      setImmediate(() => chatbot.sendContact(phone).catch(() => {}));
      return { screen: 'INFO', data: { info_title: 'Contact', info_body: 'Contact details have been sent to this chat 👇' } };
    }
    return { screen: 'INFO', data: { info_title: 'Choose Service', info_body: 'Please pick a valid option.' } };
  }

  if (screen === 'REGISTER') {
    const password = data?.password || '';
    const confirm = data?.confirm_password || '';
    if (password.length < 6) {
      return {
        screen: 'INFO',
        data: { info_title: 'Weak password', info_body: 'Password must be at least 6 characters. Send "hi" and tap Register to try again.' },
      };
    }
    if (password !== confirm) {
      return {
        screen: 'INFO',
        data: { info_title: 'Passwords do not match', info_body: 'Please re-register and make sure both passwords are the same. Send "hi" and tap Register.' },
      };
    }
    const passwordHash = await bcrypt.hash(password, 10);
    // Persist partial registration data (incl. web password)
    await Student.updateOne(
      { phone },
      {
        $set: {
          phone,
          name: data?.student_name || '',
          altPhone: data?.phone_number || '',
          school: data?.school || '',
          dob: data?.dob || '',
          passwordHash,
          source: 'whatsapp',
        },
      },
      { upsert: true }
    );
    return screenPlans(imgs);
  }

  if (screen === 'PLAN_SELECT') {
    const planKey = data?.selected_plan;
    const plan = await Plan.findOne({ key: planKey }).lean();
    await Student.updateOne({ phone }, { $set: { plan: planKey } });
    const student = await Student.findOne({ phone }).lean();
    const esc = (v) => String(v == null || v === '' ? '-' : v).replace(/\|/g, '\\|');
    const details_table = [
      '# Confirm Your Details',
      'Please review and confirm to complete registration.',
      '',
      '| Field | Value |',
      '| --- | --- |',
      `| Name | ${esc(student?.name)} |`,
      `| WhatsApp | ${esc(phone)} |`,
      `| Phone | ${esc(student?.altPhone)} |`,
      `| School | ${esc(student?.school)} |`,
      `| DOB | ${esc(student?.dob)} |`,
      `| Plan | ${esc(plan ? plan.title : planKey)} |`,
      `| Amount | ₹${esc(plan ? plan.price : '')} |`,
    ];
    return {
      screen: 'CONFIRM',
      data: {
        details_table,
        student_name: student?.name || '',
        phone_number: student?.altPhone || '',
        school: student?.school || '',
        dob: student?.dob || '',
        selected_plan: planKey,
      },
    };
  }

  if (screen === 'PARTNERS_LIST') {
    const pid = data?.selected_partner;
    if (pid === 'none') {
      return { screen: 'INFO', data: { info_title: 'Our Partners', info_body: 'No partners available yet.' } };
    }
    return screenPartnerDetails(pid, phone);
  }

  return handleInit(flowToken);
}

// ---------- Route ----------
router.post('/', async (req, res) => {
  let aesKeyBuffer;
  let ivBuffer;
  let decryptedBody;
  try {
    ({ decryptedBody, aesKeyBuffer, ivBuffer } = decryptRequest(req.body));
  } catch (err) {
    console.error('[FlowEndpoint] decrypt failed:', err.message);
    return res.status(421).send();
  }

  const { action, screen, data, flow_token } = decryptedBody || {};

  if (action === 'ping') {
    return sendResponse(res, { data: { status: 'active' } }, aesKeyBuffer, ivBuffer);
  }
  if (data?.error) {
    return sendResponse(res, { data: { acknowledged: true } }, aesKeyBuffer, ivBuffer);
  }

  try {
    let response;
    if (action === 'INIT' || action === 'BACK') {
      response = await handleInit(flow_token);
    } else if (action === 'data_exchange') {
      response = await handleDataExchange({ screen, data, flowToken: flow_token });
    } else {
      response = await handleInit(flow_token);
    }
    return sendResponse(res, response, aesKeyBuffer, ivBuffer);
  } catch (err) {
    console.error('[FlowEndpoint] handler error:', err.message);
    const fallback = {
      screen: 'INFO',
      data: { info_title: 'Something went wrong', info_body: 'Please try again later.' },
    };
    return sendResponse(res, fallback, aesKeyBuffer, ivBuffer);
  }
});

// Build the initial {screen, data} for a service so the chatbot can open a
// focused flow directly (flow_action=navigate) without the extra INFO screen.
async function getServiceNavScreen(service, phone) {
  const imgs = await loadImagesB64();
  if (service === 'register') return screenRegister(phone, imgs);
  if (service === 'partners') return screenPartnersList(imgs);
  return null;
}

module.exports = router;
module.exports.clearImageCache = clearImageCache;
module.exports.getServiceNavScreen = getServiceNavScreen;
