import API_CONFIG from '../config/api.js';
import { debugLog, errorLog } from '../config/environment.js';

/**
 * Empty Truck Location Service
 * Handles all API calls related to empty truck location tracking
 */
class EmptyTruckLocationService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.basePath = '/api/v1/empty-truck-location';
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
  buildQueryString(params) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return queryParams.toString();
  }

  // Generic request handler
  async request(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      debugLog(`Request: ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      debugLog(`Response:`, data);
      return data;
    } catch (error) {
      errorLog(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // ==================== TRUCKER ENDPOINTS ====================

  /**
   * Update empty truck location (Trucker)
   * @param {Object} locationData - Location data
   * @returns {Promise<Object>}
   */
  async updateLocation(locationData) {
    return this.request(`${this.basePath}/update`, {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  /**
   * Get my empty trucks (Trucker)
   * @param {Object} filters - Optional filters (status, city, state)
   * @returns {Promise<Object>}
   */
  async getMyTrucks(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = `${this.basePath}/my-trucks${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Get empty truck location by vehicle number (Trucker)
   * @param {string} vehicleNo - Vehicle registration number
   * @returns {Promise<Object>}
   */
  async getTruckByVehicleNo(vehicleNo) {
    return this.request(`${this.basePath}/vehicle/${vehicleNo}`);
  }

  // ==================== CMT ENDPOINTS ====================

  /**
   * Update empty truck location (CMT)
   * @param {Object} locationData - Location data (must include truckerId)
   * @returns {Promise<Object>}
   */
  async updateLocationCMT(locationData) {
    return this.request(`${this.basePath}/cmt/update`, {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  /**
   * Get all empty trucks (CMT)
   * @param {Object} filters - Optional filters (status, city, state, truckerId)
   * @returns {Promise<Object>}
   */
  async getAllTrucksCMT(filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = `${this.basePath}/cmt/all${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Get empty trucks by trucker (CMT)
   * @param {string} truckerId - Trucker ID
   * @param {Object} filters - Optional filters (status, city, state)
   * @returns {Promise<Object>}
   */
  async getTrucksByTruckerCMT(truckerId, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const endpoint = `${this.basePath}/cmt/trucker/${truckerId}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  /**
   * Get empty truck location by vehicle number (CMT)
   * @param {string} vehicleNo - Vehicle registration number
   * @returns {Promise<Object>}
   */
  async getTruckByVehicleNoCMT(vehicleNo) {
    return this.request(`${this.basePath}/cmt/vehicle/${vehicleNo}`);
  }
}

// Create and export singleton instance
const emptyTruckLocationService = new EmptyTruckLocationService();
export default emptyTruckLocationService;
