const meta = require('./metaCloud');
const flowImages = require('./flowImages');
const Student = require('../models/Student');
const Plan = require('../models/Plan');
const { generateAndUploadCard } = require('./memberCard');
const { nextCardId } = require('../utils/helpers');

function flowMode() {
  return (process.env.WHATSAPP_FLOW_STATUS || 'published').toLowerCase() === 'draft'
    ? 'draft'
    : 'published';
}

function frontend() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * Send the "Choose Service" flow message (image header + body + Choose Service CTA).
 * Optionally override the header image (e.g. the freshly generated card).
 */
async function sendChooseService(phone, opts = {}) {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  const headerImageUrl = opts.headerImageUrl || (await flowImages.getUrl('chat_welcome_header')) || undefined;
  const bodyText =
    opts.bodyText ||
    'Namaste 🙏\n\nWelcome to *Student Benefit Card*. Tap *Choose Service* below to register, view your card, explore our partners or contact us.';

  if (!flowId) {
    // Fallback if flow not yet created
    return meta.sendButtons(phone, {
      headerImageUrl,
      bodyText,
      footerText: 'Student Benefit Card',
      buttons: [{ id: 'register', title: 'Register' }, { id: 'partners', title: 'Our Partners' }, { id: 'contact', title: 'Contact' }],
    });
  }

  return meta.sendFlowMessage(phone, {
    flowId,
    flowCta: 'Choose Service',
    headerImageUrl,
    headerText: headerImageUrl ? undefined : 'Student Benefit Card',
    bodyText,
    footerText: 'Student Benefit Card',
    flowToken: `welcome_${meta.normalizePhone(phone)}`,
    mode: flowMode(),
    flowAction: 'data_exchange',
  });
}

/**
 * Reopen a focused flow (Register or Partners) directly at its first screen
 * via flow_action=navigate, so the user doesn't see an intermediate screen.
 */
async function sendServiceFlow(phone, service) {
  const flowId = process.env.WHATSAPP_FORM_FLOW_ID;
  if (!flowId) return sendChooseService(phone);
  const fe = require('../routes/flowEndpoint');
  const nav = await fe.getServiceNavScreen(service, phone);
  if (!nav) return sendChooseService(phone);

  const isRegister = service === 'register';
  const headerImageUrl = isRegister
    ? (await flowImages.getUrl('chat_welcome_header')) || undefined
    : (await flowImages.getUrl('chat_welcome_header')) || undefined;

  return meta.sendFlowMessage(phone, {
    flowId,
    flowCta: isRegister ? 'Register' : 'View Partners',
    headerImageUrl,
    headerText: headerImageUrl ? undefined : isRegister ? 'Register' : 'Our Partners',
    bodyText: isRegister
      ? '📝 Complete your registration to get your Student Benefit Card.'
      : '🤝 Browse our partners and their offers.',
    footerText: 'Student Benefit Card',
    flowToken: `form_${meta.normalizePhone(phone)}`,
    mode: flowMode(),
    flowAction: 'navigate',
    screen: nav.screen,
    screenData: nav.data,
  });
}

/** Send the member card (generate if needed). */
async function sendMyCard(phone) {
  const student = await Student.findOne({ phone: meta.normalizePhone(phone) });
  if (!student || !student.registered) {
    return meta.sendText(phone, 'You are not registered yet. Send "hi" and tap *Register* to get your card.');
  }
  let cardUrl = student.cardUrl;
  if (!cardUrl) {
    const gen = await generateAndUploadCard(student);
    cardUrl = gen.url;
    student.cardUrl = cardUrl;
    await student.save();
  }
  // Card image as the header + body + Choose Service CTA.
  return sendChooseService(phone, {
    headerImageUrl: cardUrl,
    bodyText: `🪪 *Your Student Benefit Card*\nCard ID: ${student.cardId}\n\nTap *Choose Service* for more options.`,
  });
}

/** Use Card -> message with image header + scan CTA (opens web scanner). */
async function sendUseCard(phone) {
  const p = meta.normalizePhone(phone);
  const headerImageUrl = (await flowImages.getUrl('chat_usecard_header')) || undefined;
  const url = `${frontend()}/scan?phone=${encodeURIComponent(p)}`;
  return meta.sendCtaUrl(phone, {
    headerImageUrl,
    bodyText: '📲 *Use your card*\n\nTap below to open the scanner and scan a partner QR to redeem your offer.',
    footerText: 'Student Benefit Card',
    buttonText: 'Open Scanner',
    url,
  });
}

/** After a redemption: confirm + re-offer services. */
async function sendOfferRedeemed(phone, { partnerName, count, limit }) {
  const headerImageUrl = (await flowImages.getUrl('chat_redeemed_header')) || undefined;
  const body = `✅ *Offer redeemed!*\n\nPartner: ${partnerName}\nUsage: ${count} of ${limit} used.`;
  return sendChooseService(phone, { headerImageUrl, bodyText: body });
}

/** Limit reached. */
async function sendLimitReached(phone, { partnerName, limit }) {
  return meta.sendText(
    phone,
    `⚠️ You have reached the limit of ${limit} redemptions at *${partnerName}*.`
  );
}

/** Contact -> image header + body + call action. */
async function sendContact(phone) {
  const headerImageUrl = (await flowImages.getUrl('chat_contact_header')) || undefined;
  const contactPhone = process.env.CONTACT_PHONE || '+919000000000';
  const url = `${frontend()}/contact`;
  return meta.sendCtaUrl(phone, {
    headerImageUrl,
    bodyText: `📞 *Contact us*\n\nCall us at ${contactPhone} or tap below.`,
    footerText: 'Student Benefit Card',
    buttonText: 'Call / Contact',
    url,
  });
}

/**
 * Finalize registration after native payment success:
 * mark paid+registered, assign card id, generate card, send success message.
 */
async function completeRegistration(phone, paymentRef) {
  const p = meta.normalizePhone(phone);
  const student = await Student.findOne({ phone: p });
  if (!student) return;
  student.paymentStatus = 'paid';
  student.registered = true;
  student.paymentRef = paymentRef || student.paymentRef;
  if (!student.cardId) student.cardId = await nextCardId();
  await student.save();

  // Generate card and use it as the header of the success message
  let cardUrl = '';
  try {
    const gen = await generateAndUploadCard(student);
    cardUrl = gen.url;
    student.cardUrl = cardUrl;
    await student.save();
  } catch (e) {
    console.error('[chatbot] card generation failed:', e.message);
  }

  const body = `🎉 *Registration successful!*\n\nWelcome aboard, ${student.name || 'Student'}. Your Student Benefit Card (${student.cardId}) is ready. Tap *Choose Service* to use it.`;
  return sendChooseService(phone, {
    headerImageUrl: cardUrl || undefined,
    bodyText: body,
    headerType: 'card',
  });
}

module.exports = {
  sendChooseService,
  sendServiceFlow,
  sendMyCard,
  sendUseCard,
  sendOfferRedeemed,
  sendLimitReached,
  sendContact,
  completeRegistration,
};
