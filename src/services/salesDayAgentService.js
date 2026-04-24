import axios from 'axios';
import API_CONFIG from '../config/api.js';

const BASE = `${API_CONFIG.BASE_URL}/api/v1/sales-day-agent`;

function authHeaders() {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchSalesDayDispositions() {
  const res = await axios.get(`${BASE}/dispositions`, {
    headers: { ...authHeaders() },
    withCredentials: true,
  });
  return res.data;
}

/** CSV with UTF-8 BOM from server — triggers browser download. */
export async function downloadSalesDayImportTemplate() {
  const res = await axios.get(`${BASE}/import-template`, {
    headers: { ...authHeaders() },
    responseType: 'blob',
    withCredentials: true,
  });
  const blob = res.data;
  const dispo = res.headers?.['content-disposition'] || res.headers?.['Content-Disposition'];
  let filename = 'sales-day-agent-import-template.csv';
  if (typeof dispo === 'string') {
    const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(dispo);
    const raw = decodeURIComponent(m?.[1] || m?.[2] || '').trim();
    if (raw) filename = raw;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importSalesDayCustomers(body) {
  const res = await axios.post(`${BASE}/import`, body, {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  return res.data;
}

export async function fetchSalesDayToday(params = {}) {
  const res = await axios.get(`${BASE}/today`, {
    headers: { ...authHeaders() },
    params,
    withCredentials: true,
  });
  return res.data;
}

export async function fetchSalesDayList(params = {}) {
  const res = await axios.get(`${BASE}/list`, {
    headers: { ...authHeaders() },
    params,
    withCredentials: true,
  });
  return res.data;
}

export async function fetchSalesDayImportBatches() {
  const res = await axios.get(`${BASE}/import-batches`, {
    headers: { ...authHeaders() },
    withCredentials: true,
  });
  return res.data;
}

export async function patchSalesDayDisposition(customerId, body) {
  const res = await axios.patch(`${BASE}/${encodeURIComponent(customerId)}/disposition`, body, {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  return res.data;
}

/** Partial update of import row fields (not disposition). */
export async function patchSalesDayCustomer(customerId, body) {
  const res = await axios.patch(`${BASE}/${encodeURIComponent(customerId)}`, body, {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    withCredentials: true,
  });
  return res.data;
}
