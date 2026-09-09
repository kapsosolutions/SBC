// API base:
// - dev (localhost): '' so Vite proxies /api -> backend
// - production: VITE_API_BASE if set, else fall back to the Render backend
const isLocal =
  typeof window !== 'undefined' &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const BASE =
  import.meta.env.VITE_API_BASE || (isLocal ? '' : 'https://sbc-t47t.onrender.com');

function tokenKey(role) {
  return `sbc_${role}_token`;
}

export function saveToken(role, token) {
  localStorage.setItem(tokenKey(role), token);
}
export function getToken(role) {
  return localStorage.getItem(tokenKey(role));
}
export function clearToken(role) {
  localStorage.removeItem(tokenKey(role));
}

async function request(path, { method = 'GET', body, role, isForm } = {}) {
  const headers = {};
  const token = role ? getToken(role) : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data;
  let parseOk = true;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    parseOk = false;
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (!parseOk) {
    // Got a non-JSON body on a 2xx (e.g. HTML index because API base is wrong).
    const err = new Error('Unexpected non-JSON response from API');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p, role) => request(p, { role }),
  post: (p, body, role) => request(p, { method: 'POST', body, role }),
  put: (p, body, role) => request(p, { method: 'PUT', body, role }),
  del: (p, role) => request(p, { method: 'DELETE', role }),
  form: (p, formData, role, method = 'POST') =>
    request(p, { method, body: formData, role, isForm: true }),
};
