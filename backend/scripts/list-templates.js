require('dotenv').config();
const axios = require('axios');
const v = process.env.META_GRAPH_VERSION || 'v22.0';
const waba = process.env.META_WABA_ID;
const tok = process.env.META_ACCESS_TOKEN;

axios
  .get(`https://graph.facebook.com/${v}/${waba}/message_templates`, {
    params: { fields: 'name,status,category,language,components', limit: 100 },
    headers: { Authorization: `Bearer ${tok}` },
  })
  .then((r) => {
    for (const t of r.data.data) {
      console.log(`\n[${t.category}] ${t.name} (${t.language}) — ${t.status}`);
      console.log('  components:', JSON.stringify(t.components));
    }
  })
  .catch((e) => console.log('ERR', JSON.stringify(e.response?.data || e.message)));
