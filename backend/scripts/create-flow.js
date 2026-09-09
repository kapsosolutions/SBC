// Creates (or reuses) the single SBC "Choose Service" flow, uploads the JSON,
// publishes it, and writes WHATSAPP_FLOW_ID / WHATSAPP_FLOW_STATUS to .env.
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  if (!backendUrl.startsWith('https://')) {
    console.warn('⚠️  BACKEND_URL is not HTTPS. Meta requires a public HTTPS endpoint.');
  }
  const endpointUri = `${backendUrl}/api/flow-endpoint`;
  const name = 'SBC Choose Service';

  try {
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
      console.log(`Reusing flow "${name}" -> ${flowId}`);
      await meta.setFlowEndpoint(flowId, endpointUri);
    } else {
      const created = await meta.createFlow(name, ['OTHER'], { endpointUri });
      flowId = created.id;
      console.log('Created flow:', flowId, created.validation_errors || '');
    }

    const upd = await meta.updateFlowJSON(flowId, buildFlowJSON());
    if (upd.validation_errors?.length) {
      console.log('validation_errors:', JSON.stringify(upd.validation_errors, null, 2));
    }

    let status = 'draft';
    try {
      await meta.publishFlow(flowId);
      status = 'published';
      console.log('published ✅');
    } catch (e) {
      console.warn('publish failed (kept as draft):', e.response?.data?.error?.error_user_msg || e.message);
    }

    setKeys({ WHATSAPP_FLOW_ID: flowId, WHATSAPP_FLOW_STATUS: status });
    console.log(`\n✅ Done. WHATSAPP_FLOW_ID=${flowId} (${status})`);
  } catch (e) {
    console.error('❌ create-flow failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
