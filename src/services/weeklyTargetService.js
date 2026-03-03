/**
 * Weekly Target API Service
 * - Create: POST /api/v1/weekly-target
 * - Update: PUT /api/v1/weekly-target/:targetId
 * - Get by ID: GET /api/v1/weekly-target/:targetId
 * - List: GET /api/v1/weekly-target (filters)
 * - My targets: GET /api/v1/weekly-target/my
 * - Progress: GET /api/v1/weekly-target/:targetId/progress
 * - Patch progress: PATCH /api/v1/weekly-target/:targetId/progress
 * - Delete: DELETE /api/v1/weekly-target/:targetId
 */
import API_CONFIG from '../config/api';

const BASE = '/api/v1/weekly-target';

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

/** POST /api/v1/weekly-target - Create weekly target (requires Weekly Target Setup module) */
export const createWeeklyTarget = async (payload) => {
  return apiFetch(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/** PUT /api/v1/weekly-target/:targetId - Update weekly target */
export const updateWeeklyTarget = async (targetId, payload) => {
  return apiFetch(`${BASE}/${targetId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/** GET /api/v1/weekly-target/:targetId - Get by ID */
export const getWeeklyTargetById = async (targetId) => {
  return apiFetch(`${BASE}/${targetId}`);
};

/** GET /api/v1/weekly-target - List with filters */
export const listWeeklyTargets = async (params = {}) => {
  const { page = 1, limit = 20, empId, department, weekStartDate, weekEndDate, status } = params;
  const query = buildQuery({
    page,
    limit,
    empId,
    department,
    weekStartDate,
    weekEndDate,
    status,
  });
  return apiFetch(`${BASE}${query}`);
};

/** GET /api/v1/weekly-target/my - My weekly targets */
export const getMyWeeklyTargets = async (params = {}) => {
  const { page = 1, limit = 20, weekStartDate, weekEndDate, status } = params;
  const query = buildQuery({ page, limit, weekStartDate, weekEndDate, status });
  return apiFetch(`${BASE}/my${query}`);
};

/** GET /api/v1/weekly-target/:targetId/progress - Get progress (target vs completed) */
export const getWeeklyTargetProgress = async (targetId) => {
  return apiFetch(`${BASE}/${targetId}/progress`);
};

/** PATCH /api/v1/weekly-target/:targetId/progress - Update completed values (manual) */
export const patchWeeklyTargetProgress = async (targetId, payload) => {
  return apiFetch(`${BASE}/${targetId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

/** DELETE /api/v1/weekly-target/:targetId - Delete (requires Weekly Target Setup module) */
export const deleteWeeklyTarget = async (targetId) => {
  return apiFetch(`${BASE}/${targetId}`, {
    method: 'DELETE',
  });
};
