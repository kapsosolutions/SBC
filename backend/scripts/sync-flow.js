// Re-uploads flow JSON to the existing menu + form flows and republishes.
require('dotenv').config();
const meta = require('../services/metaCloud');
const { buildMenuFlowJSON, buildFormFlowJSON } = require('../services/flowJson');
const { setKeys } = require('./_envFile');

async function syncOne(label, flowId, json) {
  if (!flowId) {
    console.warn(`⚠️  ${label} flow id not set — skipping. Run: npm run flow:create`);
    return 'missing';
  }
  const upd = await meta.updateFlowJSON(flowId, json);
  if (upd.validation_errors?.length) {
    console.log(`${label} validation_errors:`, JSON.stringify(upd.validation_errors, null, 2));
  }
  let status = 'draft';
  try {
    await meta.publishFlow(flowId);
    status = 'published';
  } catch (e) {
    console.warn(`${label} publish failed:`, e.response?.data?.error?.error_user_msg || e.message);
  }
  console.log(`✅ Synced ${label} ${flowId} (${status})`);
  return status;
}

(async () => {
  try {
    const m = await syncOne('MENU', process.env.WHATSAPP_FLOW_ID, buildMenuFlowJSON());
    const f = await syncOne('FORM', process.env.WHATSAPP_FORM_FLOW_ID, buildFormFlowJSON());
    if (m === 'published' && f === 'published') setKeys({ WHATSAPP_FLOW_STATUS: 'published' });
  } catch (e) {
    console.error('❌ sync-flow failed:', e.response?.data || e.message);
    process.exit(1);
  }
})();
