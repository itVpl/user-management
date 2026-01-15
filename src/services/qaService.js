import API_CONFIG from '../config/api.js';
import { debugLog, errorLog } from '../config/environment.js';

class QAService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.basePath = '/api/v1/qa';
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
      debugLog(`QA Request: ${endpoint}`);
      
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
      debugLog(`QA Response:`, data);
      return data;
    } catch (error) {
      errorLog(`QA Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // ============ Call Recording Management ============

  // Get all call recordings (with filters)
  async getCallRecordings(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/call-recordings${queryString ? `?${queryString}` : ''}`);
  }

  // Get single call recording
  async getCallRecording(id) {
    return this.request(`${this.basePath}/call-recordings/${id}`);
  }

  // Automatic assignment (assigns 5 recordings per employee to QA user(s))
  async autoAssignCallRecordings(date) {
    return this.request(`${this.basePath}/call-recordings/auto-assign`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  // Manual assign call recording to QA
  async assignCallRecording(recordingId, qaUserId) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ qaUserId }),
    });
  }

  // Get assignment statistics
  async getAssignmentStats(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/assignment-stats${queryString ? `?${queryString}` : ''}`);
  }

  // ============ QA Feedback ============

  // Submit QA feedback
  async submitQAFeedback(recordingId, feedback) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  // Update QA feedback
  async updateQAFeedback(recordingId, feedback) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify(feedback),
    });
  }

  // Get QA feedback
  async getQAFeedback(recordingId) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/feedback`);
  }

  // ============ Manager Feedback ============

  // Get recordings pending manager review
  async getPendingManagerReviews(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/pending-manager-review${queryString ? `?${queryString}` : ''}`);
  }

  // Submit manager feedback
  async submitManagerFeedback(recordingId, feedback) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/manager-feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  // Update manager feedback
  async updateManagerFeedback(recordingId, feedback) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/manager-feedback`, {
      method: 'PUT',
      body: JSON.stringify(feedback),
    });
  }

  // ============ Combined Review ============

  // Get complete review (QA + Manager feedback)
  async getCompleteReview(recordingId) {
    return this.request(`${this.basePath}/call-recordings/${recordingId}/review`);
  }

  // Get all reviews for an employee
  async getEmployeeReviews(empId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/employee/${empId}/reviews${queryString ? `?${queryString}` : ''}`);
  }

  // ============ Dashboard & Reports ============

  // QA dashboard stats (daily summary)
  async getDashboardStats(date = null) {
    const endpoint = date 
      ? `${this.basePath}/dashboard/${date}`
      : `${this.basePath}/dashboard`;
    return this.request(endpoint);
  }

  // QA reports (filters: date range, employee, score range)
  async getReports(filters = {}) {
    const queryString = this.buildQueryString(filters);
    return this.request(`${this.basePath}/reports${queryString ? `?${queryString}` : ''}`);
  }

  // Get all recordings for a specific date
  async getDailyReview(date) {
    return this.request(`${this.basePath}/daily-review/${date}`);
  }
}

const qaService = new QAService();
export default qaService;
