// Creates the SBC WhatsApp Flows (menu + form), uploads JSON, publishes, and
// writes WHATSAPP_FLOW_ID / WHATSAPP_FORM_FLOW_ID / WHATSAPP_FLOW_STATUS to .env.
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildMenuFlowJSON, buildFormFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

async function createAndPublish(name, json, endpointUri) {
  // Reuse an existing flow with the same name (names must be unique per WABA).
  let flowId;
  try {
    const flows = await meta.getFlows();
    const existing = (flows.data || []).find((f) => f.name === name);
    if (existing) flowId = existing.id;
  } catch {
    /* ignore */
  }

  if (flowId) {
    console.log(`\nReusing flow "${name}" -> ${flowId}`);
  } else {
    console.log(`\nCreating flow "${name}"...`);
    const created = await meta.createFlow(name, ['OTHER'], { endpointUri });
    flowId = created.id;
    console.log('  id:', flowId, created.validation_errors || '');
  }

  const upd = await meta.updateFlowJSON(flowId, json);
  if (upd.validation_errors?.length) {
    console.log('  validation_errors:', JSON.stringify(upd.validation_errors, null, 2));
  }

  let status = 'draft';
  try {
    await meta.publishFlow(flowId);
    status = 'published';
    console.log('  published ✅');
  } catch (e) {
    console.warn('  publish failed (kept as draft):', e.response?.data?.error?.error_user_msg || e.message);
  }
  return { flowId, status };
}

(async () => {
  const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backendUrl.startsWith('https://')) {
    console.warn('⚠️  BACKEND_URL is not HTTPS. Meta requires a public HTTPS endpoint (use ngrok).');
  }
  const endpointUri = `${backendUrl}/api/flow-endpoint`;

  try {
    const menu = await createAndPublish('SBC Choose Service', buildMenuFlowJSON(), endpointUri);
    const form = await createAndPublish('SBC Registration', buildFormFlowJSON(), endpointUri);

    setKeys({
      WHATSAPP_FLOW_ID: menu.flowId,
      WHATSAPP_FORM_FLOW_ID: form.flowId,
      WHATSAPP_FLOW_STATUS: menu.status === 'published' && form.status === 'published' ? 'published' : 'draft',
    });
    console.log(`\n✅ Done.\n  WHATSAPP_FLOW_ID=${menu.flowId} (${menu.status})\n  WHATSAPP_FORM_FLOW_ID=${form.flowId} (${form.status})`);
  } catch (e) {
    console.error('❌ create-flow failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
