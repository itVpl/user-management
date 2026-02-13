/**
 * Employee Feedback & Employee Feedback Report API Service
 * - Submit feedback: POST /api/v1/employee-feedback
 * - My submissions: GET /api/v1/employee-feedback/my
 * - Report list: GET /api/v1/employee-feedback-report
 * - Report detail: GET /api/v1/employee-feedback-report/:id
 * - Accept: PATCH /api/v1/employee-feedback-report/:id/accept
 * - Reject: PATCH /api/v1/employee-feedback-report/:id/reject
 */
import API_CONFIG from '../config/api';

const FEEDBACK_BASE = '/api/v1/employee-feedback';
const REPORT_BASE = '/api/v1/employee-feedback-report';

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
 * POST /api/v1/employee-feedback
 * Submit employee feedback for a new trainee.
 */
export const submitEmployeeFeedback = async (payload) => {
  return apiFetch(FEEDBACK_BASE, {
    method: 'POST',
    body: JSON.stringify({
      traineeEmployeeFullName: payload.traineeEmployeeFullName,
      experience: payload.experience,
      englishFrequency: payload.englishFrequency,
      communication: payload.communication,
      departmentFit: payload.departmentFit,
      remark: payload.remark || '',
    }),
  });
};

/**
 * GET /api/v1/employee-feedback/my?page=1&limit=20
 * List my submitted feedbacks (Employee Feedback module).
 */
export const getMyFeedbacks = async ({ page = 1, limit = 20 } = {}) => {
  return apiFetch(`${FEEDBACK_BASE}/my${buildQuery({ page, limit })}`);
};

/**
 * GET /api/v1/employee-feedback-report?status=...&page=1&limit=20
 * List all feedbacks for report (Employee Feedback Report module).
 */
export const getFeedbackReportList = async ({ status, page = 1, limit = 20 } = {}) => {
  const params = { page, limit };
  if (status && status !== 'all') params.status = status;
  return apiFetch(`${REPORT_BASE}${buildQuery(params)}`);
};

/**
 * GET /api/v1/employee-feedback-report/:id
 * Get single feedback detail (report).
 */
export const getFeedbackReportById = async (id) => {
  return apiFetch(`${REPORT_BASE}/${id}`);
};

/**
 * PATCH /api/v1/employee-feedback-report/:id/accept
 * Accept trainee (optional responseRemark).
 */
export const acceptTrainee = async (id, { responseRemark } = {}) => {
  return apiFetch(`${REPORT_BASE}/${id}/accept`, {
    method: 'PATCH',
    body: JSON.stringify({ responseRemark: responseRemark || '' }),
  });
};

/**
 * PATCH /api/v1/employee-feedback-report/:id/reject
 * Reject trainee (optional but recommended responseRemark).
 */
export const rejectTrainee = async (id, { responseRemark } = {}) => {
  return apiFetch(`${REPORT_BASE}/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ responseRemark: responseRemark || '' }),
  });
};
