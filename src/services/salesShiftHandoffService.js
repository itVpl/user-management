import API_CONFIG from '../config/api.js';

const BASE = `${API_CONFIG.BASE_URL}/api/v1/sales-shift-handoff`;

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

/**
 * @param {string} imageUrl
 * @returns {string}
 */
export function resolveHandoffImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}

export async function fetchReceiverPool() {
  const res = await fetch(`${BASE}/receiver-pool`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchMyDistributions() {
  const res = await fetch(`${BASE}/my-distributions`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchMyPendingUploads() {
  const res = await fetch(`${BASE}/my-pending-uploads`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * @param {File[]} files
 */
export async function uploadHandoffImages(files) {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * @param {string[]} imageIds
 */
export async function distributeHandoffImages(imageIds) {
  const res = await fetch(`${BASE}/distribute`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ imageIds }),
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function fetchMyAssignments() {
  const res = await fetch(`${BASE}/my-assignments`, {
    method: 'GET',
    headers: authHeaders(true),
    credentials: 'include',
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const err = new Error(body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
