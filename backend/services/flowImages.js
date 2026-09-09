const FlowImage = require('../models/FlowImage');

// Stable image slots the admin can upload. Grouped for the admin UI.
const IMAGE_KEYS = [
  // Chat message headers (image header of interactive messages)
  { key: 'chat_welcome_header', label: 'Welcome message header (hi reply)', group: 'Chat Headers' },
  { key: 'chat_usecard_header', label: 'Use Card message header', group: 'Chat Headers' },
  { key: 'chat_redeemed_header', label: 'Offer redeemed message header', group: 'Chat Headers' },
  { key: 'chat_contact_header', label: 'Contact message header', group: 'Chat Headers' },
  { key: 'chat_success_header', label: 'Registration success header', group: 'Chat Headers' },
  { key: 'chat_payment_header', label: 'Payment / order summary header', group: 'Chat Headers' },

  // Flow banners (shown inside the flow screens, 8:1 ratio)
  { key: 'flow_welcome_banner', label: 'Flow welcome banner (8:1)', group: 'Flow Banners' },
  { key: 'flow_register_banner', label: 'Flow register banner (8:1)', group: 'Flow Banners' },
  { key: 'flow_plan_banner', label: 'Flow plan-select banner (8:1)', group: 'Flow Banners' },
  { key: 'flow_partners_banner', label: 'Flow partners banner (8:1)', group: 'Flow Banners' },

  // Service icons (square) shown in the choose-service radio list
  { key: 'icon_register', label: 'Service icon: Register', group: 'Service Icons' },
  { key: 'icon_mycard', label: 'Service icon: My Card', group: 'Service Icons' },
  { key: 'icon_usecard', label: 'Service icon: Use Card', group: 'Service Icons' },
  { key: 'icon_partners', label: 'Service icon: Our Partners', group: 'Service Icons' },
  { key: 'icon_contact', label: 'Service icon: Contact', group: 'Service Icons' },
];

const KEY_SET = new Set(IMAGE_KEYS.map((k) => k.key));

function isValidKey(key) {
  return KEY_SET.has(key);
}

// Ensure a row exists for every key so the admin UI always shows all slots.
async function ensureKeysExist() {
  for (const { key, label } of IMAGE_KEYS) {
    await FlowImage.updateOne(
      { key },
      { $setOnInsert: { key, label, url: '', publicId: '' } },
      { upsert: true }
    );
  }
}

async function getUrl(key) {
  const doc = await FlowImage.findOne({ key }).lean();
  return doc?.url || '';
}

async function getMap(keys) {
  const docs = await FlowImage.find({ key: { $in: keys } }).lean();
  const map = {};
  for (const d of docs) map[d.key] = d.url || '';
  return map;
}

async function listAll() {
  const docs = await FlowImage.find({}).lean();
  const byKey = {};
  for (const d of docs) byKey[d.key] = d;
  return IMAGE_KEYS.map((k) => ({
    key: k.key,
    label: k.label,
    group: k.group,
    url: byKey[k.key]?.url || '',
    publicId: byKey[k.key]?.publicId || '',
  }));
}

module.exports = {
  IMAGE_KEYS,
  isValidKey,
  ensureKeysExist,
  getUrl,
  getMap,
  listAll,
};
