// Re-uploads the single flow JSON to WHATSAPP_FLOW_ID, points its endpoint at
// the current BACKEND_URL, and republishes.
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

(async () => {
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!flowId) {
    console.error('WHATSAPP_FLOW_ID not set. Run: npm run flow:create');
    process.exit(1);
  }
  try {
    const backendUrl = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
    if (backendUrl.startsWith('https://')) {
      try {
        await meta.setFlowEndpoint(flowId, `${backendUrl}/api/flow-endpoint`);
        console.log(`endpoint -> ${backendUrl}/api/flow-endpoint`);
      } catch (e) {
        console.warn('setFlowEndpoint failed:', e.response?.data?.error?.error_user_msg || e.message);
      }
    }

    const upd = await meta.updateFlowJSON(flowId, buildFlowJSON());
    if (upd.validation_errors?.length) {
      console.log('validation_errors:', JSON.stringify(upd.validation_errors, null, 2));
    }
    let status = 'draft';
    try {
      await meta.publishFlow(flowId);
      status = 'published';
    } catch (e) {
      console.warn('publish failed:', e.response?.data?.error?.error_user_msg || e.message);
    }
    setKeys({ WHATSAPP_FLOW_STATUS: status });
    console.log(`✅ Synced flow ${flowId} (${status})`);
  } catch (e) {
    console.error('❌ sync-flow failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
