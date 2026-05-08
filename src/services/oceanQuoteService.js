import axios from 'axios';
import API_CONFIG from '../config/api.js';

function bearerToken() {
  return (
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    ''
  );
}

export function oceanQuoteStaffHeaders() {
  const token = bearerToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Public — no auth. */
export async function submitOceanQuote(body) {
  return axios.post(
    `${API_CONFIG.BASE_URL}/api/v1/ocean-quote/submit`,
    body,
    {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
}

/** Staff list — Bearer JWT + module access (or superadmin on backend). */
export async function listOceanQuotes({ page = 1, limit = 20, mine = false } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  return axios.get(`${API_CONFIG.BASE_URL}/api/v1/ocean-quote`, {
    params: {
      page: safePage,
      limit: safeLimit,
      ...(mine ? { mine: 'true' } : {}),
    },
    headers: oceanQuoteStaffHeaders(),
    withCredentials: true,
  });
}

export async function getOceanQuoteById(id) {
  return axios.get(`${API_CONFIG.BASE_URL}/api/v1/ocean-quote/${encodeURIComponent(id)}`, {
    headers: oceanQuoteStaffHeaders(),
    withCredentials: true,
  });
}
