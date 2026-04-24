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
