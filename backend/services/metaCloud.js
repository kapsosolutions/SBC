const axios = require('axios');
const FormData = require('form-data');

function cfg() {
  const v = process.env.META_GRAPH_VERSION || 'v22.0';
  const accessToken = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const wabaId = process.env.META_WABA_ID;
  if (!accessToken || !phoneNumberId) {
    throw new Error('Meta credentials missing (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)');
  }
  return {
    graphVersion: v,
    graphRoot: `https://graph.facebook.com/${v}`,
    baseUrl: `https://graph.facebook.com/${v}/${phoneNumberId}`,
    accessToken,
    phoneNumberId,
    wabaId,
  };
}

const api = axios.create({ timeout: 20000 });

/**
 * Canonicalize a phone number to E.164 digits WITH country code (no +).
 * This guarantees a web signup (e.g. "8106811285") and a WhatsApp message
 * (which arrives as "918106811285") resolve to the SAME identity.
 */
function normalizePhone(phone) {
  let d = String(phone || '').replace(/[^\d]/g, '');
  const cc = (process.env.COUNTRY_CODE || '91').replace(/[^\d]/g, '');
  if (!d) return '';
  // Drop a leading 0 (national trunk prefix), e.g. 08106... -> 8106...
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  // Bare 10-digit national number -> prepend country code
  if (d.length === 10) d = cc + d;
  return d;
}

function authHeaders() {
  const { accessToken } = cfg();
  return { Authorization: `Bearer ${accessToken}` };
}

// ---------- Basic messages ----------

async function sendText(phone, text) {
  const { baseUrl } = cfg();
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'text',
    text: { body: text },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

async function sendImage(phone, link, caption) {
  const { baseUrl } = cfg();
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'image',
    image: { link, caption: caption || undefined },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

/**
 * Interactive message with image header + body + buttons (reply buttons).
 * buttons: [{ id, title }]
 */
async function sendButtons(phone, { headerImageUrl, headerText, bodyText, footerText, buttons }) {
  const { baseUrl } = cfg();
  let header;
  if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else if (headerText) header = { type: 'text', text: headerText };

  const interactive = {
    type: 'button',
    body: { text: bodyText },
    action: {
      buttons: (buttons || []).slice(0, 3).map((b) => ({
        type: 'reply',
        reply: { id: b.id, title: b.title.slice(0, 20) },
      })),
    },
  };
  if (header) interactive.header = header;
  if (footerText) interactive.footer = { text: footerText };

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'interactive',
    interactive,
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

/**
 * cta_url interactive message (opens a URL, e.g. scan page / call).
 */
async function sendCtaUrl(phone, { headerImageUrl, bodyText, footerText, buttonText, url }) {
  const { baseUrl } = cfg();
  const interactive = {
    type: 'cta_url',
    body: { text: bodyText },
    action: {
      name: 'cta_url',
      parameters: { display_text: buttonText || 'Open', url },
    },
  };
  if (headerImageUrl) interactive.header = { type: 'image', image: { link: headerImageUrl } };
  if (footerText) interactive.footer = { text: footerText };

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'interactive',
    interactive,
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

/**
 * Send a WhatsApp Flow message (interactive type "flow") with an image header.
 */
async function sendFlowMessage(phone, {
  flowId,
  flowCta,
  headerImageUrl,
  headerText,
  bodyText,
  footerText,
  flowToken,
  mode = 'published',
  flowAction = 'data_exchange',
  screen,
  screenData,
}) {
  const { baseUrl } = cfg();
  let header;
  if (headerImageUrl) header = { type: 'image', image: { link: headerImageUrl } };
  else if (headerText) header = { type: 'text', text: headerText };

  const parameters = {
    flow_message_version: '3',
    flow_token: flowToken,
    flow_id: flowId,
    flow_cta: flowCta,
    mode,
    flow_action: flowAction,
  };
  if (flowAction === 'navigate') {
    parameters.flow_action_payload = {
      screen: screen,
      data: { ...(screenData || {}), flow_token: flowToken },
    };
  }

  const interactive = {
    type: 'flow',
    body: { text: bodyText },
    action: { name: 'flow', parameters },
  };
  if (header) interactive.header = header;
  if (footerText) interactive.footer = { text: footerText };

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(phone),
    type: 'interactive',
    interactive,
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

/**
 * Native WhatsApp Pay — order_details ("Review and pay").
 * items: [{ name, amount(INR), quantity, imageUrl }]
 */
async function sendOrderDetails(phone, {
  referenceId,
  items,
  totalAmount,
  headerImageUrl,
  bodyText,
}) {
  const { baseUrl } = cfg();
  const paymentConfig = process.env.WHATSAPP_PAYMENT_CONFIG;
  if (!paymentConfig) throw new Error('WHATSAPP_PAYMENT_CONFIG not configured');
  const toPaise = (r) => Math.round(Number(r) * 100);
  const businessName = process.env.MERCHANT_NAME || 'Student Benefit Card';

  const orderItems = items.map((item) => {
    const o = {
      name: item.name,
      amount: { value: toPaise(item.amount), offset: 100 },
      quantity: item.quantity || 1,
    };
    if (item.imageUrl) {
      o.image = { link: item.imageUrl };
      o.country_of_origin = 'India';
      o.importer_name = businessName;
      o.importer_address = {
        address_line1: businessName,
        city: 'Local',
        zone_code: 'AP',
        postal_code: '500001',
        country_code: 'IN',
      };
    }
    return o;
  });

  const subtotal = items.reduce((s, i) => s + Number(i.amount) * (i.quantity || 1), 0);

  // Build the payment_gateway block (mirrors the FMCG "devine" Razorpay config).
  // The reference_id is stamped into razorpay.notes so a Razorpay backup webhook
  // can map the payment back to our record.
  const gatewayType = process.env.WHATSAPP_PAYMENT_GATEWAY_TYPE || 'razorpay';
  const paymentGateway = { type: gatewayType, configuration_name: paymentConfig };
  if (gatewayType === 'razorpay') {
    paymentGateway.razorpay = {
      receipt: `sbc_${String(referenceId).slice(-12)}`,
      notes: { reference_id: String(referenceId) },
    };
  }

  const interactive = {
    type: 'order_details',
    body: { text: bodyText || `🧾 *Order #${referenceId}*\nReview and pay securely.` },
    footer: { text: 'Powered by WhatsApp Pay' },
    action: {
      name: 'review_and_pay',
      parameters: {
        reference_id: referenceId,
        type: 'digital-goods',
        payment_settings: [{ type: 'payment_gateway', payment_gateway: paymentGateway }],
        currency: 'INR',
        total_amount: { value: toPaise(totalAmount), offset: 100 },
        order: {
          status: 'pending',
          expiration: {
            timestamp: Math.floor(Date.now() / 1000) + 900,
            description: 'Order expires in 15 minutes',
          },
          items: orderItems,
          subtotal: { value: toPaise(subtotal), offset: 100 },
          tax: { value: 0, offset: 100, description: 'Tax' },
        },
      },
    },
  };
  if (headerImageUrl) interactive.header = { type: 'image', image: { link: headerImageUrl } };

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'interactive',
    interactive,
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

/**
 * order_status ("review_order") acknowledgement message sent after payment.
 */
async function sendOrderStatusUpdate(phone, referenceId, status, description) {
  const { baseUrl } = cfg();
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone(phone),
    type: 'interactive',
    interactive: {
      type: 'order_status',
      body: {
        text:
          description ||
          (status === 'completed'
            ? '✅ Payment received! Your registration is confirmed.'
            : `Order status: ${status}`),
      },
      action: {
        name: 'review_order',
        parameters: {
          reference_id: referenceId,
          order: { status, description: description || `Order ${status}` },
        },
      },
    },
  };
  const { data } = await api.post(`${baseUrl}/messages`, payload, { headers: authHeaders() });
  return data;
}

// ---------- Flow management (Graph API) ----------

async function createFlow(name, categories = ['OTHER'], { endpointUri } = {}) {
  const { graphRoot, wabaId } = cfg();
  const body = { name, categories };
  if (endpointUri) body.endpoint_uri = endpointUri;
  const { data } = await api.post(`${graphRoot}/${wabaId}/flows`, body, { headers: authHeaders() });
  return data;
}

async function updateFlowJSON(flowId, flowJsonObj) {
  const { graphRoot } = cfg();
  const fd = new FormData();
  fd.append('file', Buffer.from(JSON.stringify(flowJsonObj)), {
    filename: 'flow.json',
    contentType: 'application/json',
  });
  fd.append('name', 'flow.json');
  fd.append('asset_type', 'FLOW_JSON');
  const { data } = await api.post(`${graphRoot}/${flowId}/assets`, fd, {
    headers: { ...authHeaders(), ...fd.getHeaders() },
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });
  return data;
}

async function publishFlow(flowId) {
  const { graphRoot } = cfg();
  const { data } = await api.post(`${graphRoot}/${flowId}/publish`, {}, { headers: authHeaders() });
  return data;
}

// Update a flow's data-exchange endpoint URI (e.g. when moving from ngrok to Render).
async function setFlowEndpoint(flowId, endpointUri) {
  const { graphRoot } = cfg();
  const { data } = await api.post(
    `${graphRoot}/${flowId}`,
    { endpoint_uri: endpointUri },
    { headers: authHeaders() }
  );
  return data;
}

async function getFlows() {
  const { graphRoot, wabaId } = cfg();
  const { data } = await api.get(`${graphRoot}/${wabaId}/flows`, { headers: authHeaders() });
  return data;
}

async function uploadBusinessPublicKey(publicKeyPem) {
  const { graphRoot, phoneNumberId } = cfg();
  const url = `${graphRoot}/${phoneNumberId}/whatsapp_business_encryption`;
  const fd = new URLSearchParams();
  fd.append('business_public_key', publicKeyPem);
  const { data } = await api.post(url, fd.toString(), {
    headers: { ...authHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

module.exports = {
  cfg,
  normalizePhone,
  sendText,
  sendImage,
  sendButtons,
  sendCtaUrl,
  sendFlowMessage,
  sendOrderDetails,
  sendOrderStatusUpdate,
  createFlow,
  updateFlowJSON,
  publishFlow,
  setFlowEndpoint,
  getFlows,
  uploadBusinessPublicKey,
};
