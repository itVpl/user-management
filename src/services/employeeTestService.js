/**
 * Employee Test API — /api/v1/employee-test
 * Public flow uses fetch + Bearer publicToken (no employee JWT).
 * Admin uses employee JWT (same as rest of app).
 */
import API_CONFIG from '../config/api';

const BASE = '/api/v1/employee-test';

const getEmployeeToken = () =>
  sessionStorage.getItem('authToken') ||
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('token') ||
  localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getEmployeeToken()}`,
});

const publicHeaders = (publicToken) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicToken}`,
});

const fullUrl = (path) => `${API_CONFIG.BASE_URL}${path}`;

async function handleResponse(response) {
  let data = {};
  const ct = response.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json') && response.status !== 204) {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    }
  } catch {
    data = {};
  }
  if (!response.ok) {
    const err = new Error(data?.message || response.statusText || `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  if (data && data.success === false) {
    const err = new Error(data?.message || 'Request failed');
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Authenticated admin / superadmin calls */
export async function adminFetch(path, options = {}) {
  const { method = 'GET', body } = options;
  const res = await fetch(fullUrl(path), {
    method,
    headers: authHeaders(),
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

/** Candidate session — pass publicToken from start attempt */
export async function publicFetch(path, publicToken, options = {}) {
  const { method = 'GET', body } = options;
  const res = await fetch(fullUrl(path), {
    method,
    headers: publicHeaders(publicToken),
    credentials: 'include',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

export async function publicStartAttempt(payload = {}) {
  const res = await fetch(fullUrl(`${BASE}/public/attempts`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload || {}),
  });
  return handleResponse(res);
}

export const publicPatchProfile = (attemptId, publicToken, body) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/profile`, publicToken, {
    method: 'PATCH',
    body,
  });

export const publicAcceptTerms = (attemptId, publicToken, body) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/accept-terms`, publicToken, {
    method: 'PATCH',
    body,
  });

export const publicGetQuestions = (attemptId, publicToken) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/questions`, publicToken, { method: 'GET' });

export const publicPutAnswers = (attemptId, publicToken, body) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/answers`, publicToken, {
    method: 'PUT',
    body,
  });

export const publicSubmit = (attemptId, publicToken, body = {}) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/submit`, publicToken, {
    method: 'POST',
    body,
  });

export const publicGetResult = (attemptId, publicToken) =>
  publicFetch(`${BASE}/public/attempts/${attemptId}/result`, publicToken, { method: 'GET' });

export const adminListTests = () => adminFetch(`${BASE}/admin/tests`, { method: 'GET' });

export const adminCreateTest = (body) =>
  adminFetch(`${BASE}/admin/tests`, { method: 'POST', body });

export const adminPatchTest = (testId, body) =>
  adminFetch(`${BASE}/admin/tests/${testId}`, { method: 'PATCH', body });

export const adminListQuestions = (testId) =>
  adminFetch(`${BASE}/admin/tests/${testId}/questions`, { method: 'GET' });

export const adminCreateQuestion = (testId, body) =>
  adminFetch(`${BASE}/admin/tests/${testId}/questions`, { method: 'POST', body });

export const adminPatchQuestion = (questionId, body) =>
  adminFetch(`${BASE}/admin/questions/${questionId}`, { method: 'PATCH', body });

export const adminPatchQuestionOptions = (questionId, body) =>
  adminFetch(`${BASE}/admin/questions/${questionId}/options`, { method: 'PATCH', body });

export const adminDeleteQuestion = (questionId) =>
  adminFetch(`${BASE}/admin/questions/${questionId}`, { method: 'DELETE' });

export const adminListAttempts = (testId, { page = 1, limit = 20 } = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return adminFetch(`${BASE}/admin/tests/${testId}/attempts?${q}`, { method: 'GET' });
};
