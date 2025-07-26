import API_CONFIG from '../config/api.js';
import { debugLog, errorLog } from '../config/environment.js';

// API Service Class
class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.endpoints = API_CONFIG.ENDPOINTS;
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

  // Generic GET request
  async get(endpoint, options = {}) {
    try {
      debugLog(`GET Request: ${endpoint}`);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`GET Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`GET Response:`, data);
      return data;
    } catch (error) {
      errorLog(`GET Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic POST request
  async post(endpoint, body = {}, options = {}) {
    try {
      debugLog(`POST Request: ${endpoint}`, body);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`POST Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`POST Response:`, data);
      return data;
    } catch (error) {
      errorLog(`POST Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic PUT request
  async put(endpoint, body = {}, options = {}) {
    try {
      debugLog(`PUT Request: ${endpoint}`, body);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`PUT Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`PUT Response:`, data);
      return data;
    } catch (error) {
      errorLog(`PUT Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic PATCH request
  async patch(endpoint, body = {}, options = {}) {
    try {
      debugLog(`PATCH Request: ${endpoint}`, body);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`PATCH Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`PATCH Response:`, data);
      return data;
    } catch (error) {
      errorLog(`PATCH Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Generic DELETE request
  async delete(endpoint, options = {}) {
    try {
      debugLog(`DELETE Request: ${endpoint}`);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`DELETE Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`DELETE Response:`, data);
      return data;
    } catch (error) {
      errorLog(`DELETE Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // File upload
  async uploadFile(endpoint, file, options = {}) {
    try {
      debugLog(`File Upload Request: ${endpoint}`, file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const url = API_CONFIG.getFullUrl(endpoint);
      const token = this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        withCredentials: true,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLog(`Upload Response:`, data);
      return data;
    } catch (error) {
      errorLog(`Upload Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Specific API methods
  // Auth methods
  async login(credentials) {
    return this.post(this.endpoints.LOGIN, credentials);
  }

  async signup(userData) {
    return this.post(this.endpoints.SIGNUP, userData);
  }

  async logout() {
    return this.post(this.endpoints.LOGOUT);
  }

  // User methods
  async getUsers() {
    return this.get(this.endpoints.USERS);
  }

  async getUserProfile() {
    return this.get(this.endpoints.USER_PROFILE);
  }

  // Delivery Order methods
  async getDeliveryOrders() {
    return this.get(this.endpoints.DELIVERY_ORDERS);
  }

  async createDeliveryOrder(orderData) {
    return this.post(this.endpoints.CREATE_DELIVERY_ORDER, orderData);
  }

  // Trucker methods
  async getTruckers() {
    return this.get(this.endpoints.TRUCKERS);
  }

  async updateTruckerStatus(userId, statusData) {
    return this.patch(`${this.endpoints.UPDATE_TRUCKER_STATUS}/${userId}`, statusData);
  }
}

// Create and export singleton instance
const apiService = new ApiService();
export default apiService; 