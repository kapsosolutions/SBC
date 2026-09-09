const Counter = require('../models/Counter');

function digits(s) {
  return String(s || '').replace(/[^\d]/g, '');
}

// Derive phone from a flow token like "welcome_919000000000".
function phoneFromToken(token) {
  const raw = String(token || '');
  const stripped = raw.replace(/^welcome_/, '').replace(/[^\d]/g, '');
  return stripped;
}

async function nextCardId() {
  const n = await Counter.next('cardId');
  return `SBC-${String(n).padStart(6, '0')}`;
}

module.exports = { digits, phoneFromToken, nextCardId };
