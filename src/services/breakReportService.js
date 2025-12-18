import API_CONFIG from '../config/api.js';
import { debugLog, errorLog } from '../config/environment.js';

class BreakReportService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.basePath = '/api/v1/break/report';
  }

  // Get auth token
  getAuthToken() {
    return sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
  }

  // Get auth headers
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // Build query string from params
  buildQueryString(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    return queryParams.toString();
  }

  // Generic request method
  async request(endpoint, options = {}) {
    try {
      debugLog(`Break Report Request: ${endpoint}`);
      
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        withCredentials: true,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`Break Report Response:`, data);
      return data;
    } catch (error) {
      errorLog(`Break Report Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get detailed break report
  async getDetailedReport(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}${queryString ? `?${queryString}` : ''}`);
  }

  // Get summary break report
  async getSummaryReport(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/summary${queryString ? `?${queryString}` : ''}`);
  }

  // Get employee-specific break report
  async getEmployeeReport(empId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/employee/${empId}${queryString ? `?${queryString}` : ''}`);
  }

  // Get current break status
  async getCurrentBreakStatus(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/current${queryString ? `?${queryString}` : ''}`);
  }
}

const breakReportService = new BreakReportService();
export default breakReportService;

