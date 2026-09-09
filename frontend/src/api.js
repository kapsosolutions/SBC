const BASE = import.meta.env.VITE_API_BASE || '';

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
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
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
