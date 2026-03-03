/**
 * Employee Target Report API Service
 * Requires "Employee Target Report" module.
 * - List: GET /api/v1/employee-target-report (paginated, filters)
 * - Summary: GET /api/v1/employee-target-report/summary (same filters, no pagination)
 */
import API_CONFIG from '../config/api';

const BASE = '/api/v1/employee-target-report';

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
 * GET /api/v1/employee-target-report
 * Paginated list with filters. Progress is refreshed from backend.
 * @param {Object} params - { empId, department, weekStartDate, weekEndDate, status, page, limit }
 */
export const getEmployeeTargetReportList = async (params = {}) => {
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

/**
 * GET /api/v1/employee-target-report/summary
 * Summary for KPIs (total, completed, averageProgress, byDepartment, byStatus).
 * Same filters as list, no pagination.
 */
export const getEmployeeTargetReportSummary = async (params = {}) => {
  const { empId, department, weekStartDate, weekEndDate, status } = params;
  const query = buildQuery({
    empId,
    department,
    weekStartDate,
    weekEndDate,
    status,
  });
  return apiFetch(`${BASE}/summary${query}`);
};
