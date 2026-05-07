import axios from 'axios';
import API_CONFIG from '../config/api.js';

function authHeaders() {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('authToken') ||
    localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Event/manual AgentCustomer create — `POST /api/v1/shipper_driver/department/add-agent-customer-from-event` */
export async function createAgentCustomerFromEvent(payload) {
  const res = await axios.post(
    `${API_CONFIG.BASE_URL}/api/v1/shipper_driver/department/add-agent-customer-from-event`,
    payload,
    {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  return res.data;
}

/**
 * Employee management search — `GET /api/v1/agent-customer/manage/search`
 * Supports `companyName` (or `search`) with pagination.
 */
export async function searchAgentCustomersByCompany(params = {}) {
  const res = await axios.get(
    `${API_CONFIG.BASE_URL}/api/v1/agent-customer/manage/search`,
    {
      params,
      headers: { ...authHeaders() },
      withCredentials: true,
    },
  );
  return res.data;
}

/**
 * Set/reset customer password — `PATCH /api/v1/agent-customer/manage/:id/password`
 * Requires `password` and `confirmPassword`.
 */
export async function setAgentCustomerPassword(id, payload) {
  const res = await axios.patch(
    `${API_CONFIG.BASE_URL}/api/v1/agent-customer/manage/${id}/password`,
    payload,
    {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  return res.data;
}

/**
 * Edit customer details — `PATCH /api/v1/agent-customer/manage/:id`
 * Send partial payload (only changed fields).
 */
export async function updateAgentCustomerDetails(id, payload) {
  const res = await axios.patch(
    `${API_CONFIG.BASE_URL}/api/v1/agent-customer/manage/${id}`,
    payload,
    {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  return res.data;
}

/** Customer login — `POST /api/v1/agent-customer/login` */
export async function loginAgentCustomer(payload) {
  const res = await axios.post(
    `${API_CONFIG.BASE_URL}/api/v1/agent-customer/login`,
    payload,
    {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  return res.data;
}

/** Customer logout — `POST /api/v1/agent-customer/logout` */
export async function logoutAgentCustomer() {
  const res = await axios.post(
    `${API_CONFIG.BASE_URL}/api/v1/agent-customer/logout`,
    {},
    {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      withCredentials: true,
    },
  );
  return res.data;
}
