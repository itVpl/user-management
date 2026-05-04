import API_CONFIG from '../config/api.js';

const BASE = `${API_CONFIG.BASE_URL}/api/v1/sales-buyer-handoff`;

function getToken() {
  return (
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken')
  );
}

function authHeaders(json = true) {
  const token = getToken();
  const h = { Authorization: `Bearer ${token}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text || 'Invalid response' };
  }
}

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** @param {Record<string, unknown>} body */
export async function createSalesBuyer(body) {
  const res = await fetch(`${BASE}/buyers`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

export async function fetchMyPendingBuyers(params = {}) {
  const res = await fetch(`${BASE}/buyers/my-pending${buildQuery(params)}`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

export async function fetchBuyerHandoffReceiverPool() {
  const res = await fetch(`${BASE}/receiver-pool`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

export async function forwardSalesBuyers(buyerIds) {
  const res = await fetch(`${BASE}/forward`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ buyerIds }),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

export async function fetchMyForwardedBuyers(params = {}) {
  const res = await fetch(`${BASE}/buyers/my-forwarded${buildQuery(params)}`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

export async function fetchMyIncomingBuyers(params = {}) {
  const res = await fetch(`${BASE}/buyers/my-incoming${buildQuery(params)}`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

/** GET binary Excel template (Buyers + Instructions sheets). */
export async function fetchImportTemplateBlob() {
  const token = getToken();
  const res = await fetch(`${BASE}/import-template`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) {
    const parsed = await parseJson(res);
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  const blob = await res.blob();
  let filename = 'buyer-handoff-import-template.xlsx';
  const cd = res.headers.get('Content-Disposition');
  if (cd) {
    const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;\s]+)/i.exec(cd);
    const raw = match?.[1] || match?.[2] || match?.[3];
    if (raw) {
      try {
        filename = decodeURIComponent(raw.replace(/["']/g, ''));
      } catch {
        filename = raw.replace(/["']/g, '');
      }
    }
  }
  return { blob, filename };
}

/** POST multipart; field `excelFile` (preferred). Max 10 MB / .xlsx .xls .xlsm enforced on server. */
export async function postImportExcel(file) {
  const token = getToken();
  const form = new FormData();
  form.append('excelFile', file);
  const res = await fetch(`${BASE}/import-excel`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: 'include',
  });
  const parsed = await parseJson(res);
  if (!res.ok) {
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}
