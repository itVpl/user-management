/**
 * Hourly check-in report API — requires backend module **Hourly Performance Report**
 * (see HOURLY_PERFORMANCE_REPORT_API_FRONTEND_ALIGNMENT.md).
 *
 * - GET /api/v1/hourly-checkin/report
 * - GET /api/v1/hourly-checkin/report/employee/:empId  (path empId wins over query empId)
 * - GET /api/v1/hourly-checkin/:checkinId — single check-in (metrics, full fields)
 */
import API_CONFIG from '../config/api';

const BASE = '/api/v1/hourly-checkin/report';

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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data?.message || `API Error: ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

/**
 * Main report listing.
 * @param {Object} params
 * @param {string} [params.department]
 * @param {string} [params.empId]
 * @param {string} [params.date] YYYY-MM-DD
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {'asc'|'desc'} [params.sortDir] — sort hourBucketStart (backend default desc)
 * @param {'asc'|'desc'} [params.order] — alias if backend prefers
 * @param {number} [params.page] — default 1 when paginating
 * @param {number} [params.limit] — omit for full result set (no cap); max 2000 per page when paginating
 */
export const getHourlyCheckinReport = async (params = {}) => {
  const {
    department,
    empId,
    date,
    startDate,
    endDate,
    sortDir,
    order,
    page,
    limit,
  } = params;
  const query = buildQuery({
    department,
    empId,
    date,
    startDate,
    endDate,
    sortDir,
    order,
    page,
    limit,
  });
  return apiFetch(`${BASE}${query}`);
};

/**
 * Per-employee drill-down (path empId wins over query).
 * @param {string} empId — business employee code
 * @param {Object} params — same filters as main report except do not pass empId in query for identity (optional query ignored for id)
 */
/**
 * Single hourly check-in by Mongo id (full document incl. metrics.cmt).
 * GET /api/v1/hourly-checkin/:checkinId
 */
export const getHourlyCheckinById = async (checkinId) => {
  const id = encodeURIComponent(String(checkinId ?? '').trim());
  if (!id) throw new Error('checkinId is required');
  return apiFetch(`/api/v1/hourly-checkin/${id}`);
};

export const getHourlyCheckinReportForEmployee = async (empId, params = {}) => {
  const enc = encodeURIComponent(String(empId ?? '').trim());
  const {
    department,
    date,
    startDate,
    endDate,
    sortDir,
    order,
    page,
    limit,
  } = params;
  const query = buildQuery({
    department,
    date,
    startDate,
    endDate,
    sortDir,
    order,
    page,
    limit,
  });
  return apiFetch(`${BASE}/employee/${enc}${query}`);
};

/**
 * Logged-in employee’s own hourly check-ins (not the admin report).
 * GET /api/v1/hourly-checkin/my-history
 * @param {Object} params
 * @param {string} [params.date] — single day YYYY-MM-DD
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {number} [params.limit] — default 50, max 500
 */
export const getHourlyCheckinMyHistory = async (params = {}) => {
  const { date, startDate, endDate, limit } = params;
  const query = buildQuery({
    date,
    startDate,
    endDate,
    limit,
  });
  return apiFetch(`/api/v1/hourly-checkin/my-history${query}`);
};

export default {
  getHourlyCheckinReport,
  getHourlyCheckinReportForEmployee,
  getHourlyCheckinById,
  getHourlyCheckinMyHistory,
};
