/**
 * Salary Modification API Service
 * Base path: /api/v1/salary-modification
 * Module ID: 698cac833cc4c135b6aa56c2
 */
import API_CONFIG from '../config/api';

const BASE_PATH = '/api/v1/salary-modification';

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

/**
 * Build query string from params
 */
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

// ─── HR Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /employees/leave-summary
 * Employee-wise approved leave count for the month (paginated)
 */
export const getEmployeesLeaveSummary = async ({ month, year, page = 1, limit = 20 } = {}) => {
  const params = { month, year: year?.toString(), page, limit };
  return apiFetch(`${BASE_PATH}/employees/leave-summary${buildQuery(params)}`);
};

/**
 * GET /employees/:empId/leaves
 * Approved leaves for a specific employee (paginated)
 */
export const getEmployeeLeaves = async (empId, { month, year, page = 1, limit = 20 } = {}) => {
  const params = { month, year: year?.toString(), page, limit };
  return apiFetch(`${BASE_PATH}/employees/${empId}/leaves${buildQuery(params)}`);
};

/**
 * GET /employees/taken-leaves
 * Employees who have taken leaves in the month (paginated)
 */
export const getEmployeesTakenLeaves = async ({ month, year, page = 1, limit = 20 } = {}) => {
  const params = { month, year: year?.toString(), page, limit };
  return apiFetch(`${BASE_PATH}/employees/taken-leaves${buildQuery(params)}`);
};

/**
 * GET /employees/:empId/leaves/sandwich-days
 * Monday/Friday leaves for sandwich leave marking
 */
export const getSandwichDays = async (empId, { month, year } = {}) => {
  const params = { month, year: year?.toString() };
  return apiFetch(`${BASE_PATH}/employees/${empId}/leaves/sandwich-days${buildQuery(params)}`);
};

/**
 * POST /employees/:empId/sandwich-leave
 * Add manual sandwich leave
 */
export const addSandwichLeave = async (empId, { date, remarks = '' }) => {
  return apiFetch(`${BASE_PATH}/employees/${empId}/sandwich-leave`, {
    method: 'POST',
    body: JSON.stringify({ date, remarks }),
  });
};

/**
 * PUT /sandwich-leave/:id
 * Update sandwich leave
 */
export const updateSandwichLeave = async (id, { date, remarks }) => {
  return apiFetch(`${BASE_PATH}/sandwich-leave/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ date, remarks }),
  });
};

/**
 * DELETE /sandwich-leave/:id
 * Delete sandwich leave
 */
export const deleteSandwichLeave = async (id) => {
  return apiFetch(`${BASE_PATH}/sandwich-leave/${id}`, { method: 'DELETE' });
};

/**
 * GET /summary/:empId
 * Salary modification summary for an employee
 */
export const getSalarySummary = async (empId, { month, year } = {}) => {
  const params = { month, year: year?.toString() };
  return apiFetch(`${BASE_PATH}/summary/${empId}${buildQuery(params)}`);
};

// ─── Employee Endpoint ──────────────────────────────────────────────────────

/**
 * GET /my-salary
 * Employee's salary based on present days
 */
export const getMySalary = async ({ month, year } = {}) => {
  const params = { month, year: year?.toString() };
  return apiFetch(`${BASE_PATH}/my-salary${buildQuery(params)}`);
};
