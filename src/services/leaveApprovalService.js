/**
 * Leave Approval API Service – Sandwich Leave Removal Requests
 * Base path: /api/v1/leave-approval
 */
import API_CONFIG from '../config/api';

const BASE_PATH = '/api/v1/leave-approval';

const getAuthHeaders = () => {
  const token =
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || `API Error: ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

const buildQuery = (params) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

/**
 * GET /removal-requests
 * List sandwich leave removal requests (for manager).
 */
export const getRemovalRequests = async ({ status, page = 1, limit = 20 } = {}) => {
  const params = { status, page, limit };
  return apiFetch(`${BASE_PATH}/removal-requests${buildQuery(params)}`);
};

/**
 * GET /removal-requests/:id
 * Get single removal request detail.
 */
export const getRemovalRequest = async (id) => {
  return apiFetch(`${BASE_PATH}/removal-requests/${id}`);
};

/**
 * PATCH /removal-requests/:id/accept
 * Accept removal request (sandwich leave is deleted).
 */
export const acceptRemovalRequest = async (id, { responseRemark } = {}) => {
  return apiFetch(`${BASE_PATH}/removal-requests/${id}/accept`, {
    method: 'PATCH',
    body: JSON.stringify({ responseRemark: responseRemark || '' }),
  });
};

/**
 * PATCH /removal-requests/:id/reject
 * Reject removal request.
 */
export const rejectRemovalRequest = async (id, { responseRemark } = {}) => {
  return apiFetch(`${BASE_PATH}/removal-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ responseRemark: responseRemark || '' }),
  });
};
