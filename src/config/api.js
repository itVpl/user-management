// API Configuration
const API_CONFIG = {
  // Base URL for all API calls - Use environment variable or fallback
  // VITE_API_BASE_URL includes /api/v1, so we remove it to get base URL
  BASE_URL: (() => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
      // Remove /api/v1 if present
      const baseUrl = envUrl.replace('/api/v1', '').replace(/\/$/, '');
      console.log('🌍 Using API_BASE_URL from environment:', baseUrl);
      return baseUrl;
    }
    // Production fallback
    const fallback = 'https://vpl-liveproject-1.onrender.com';
    console.log('⚠️ VITE_API_BASE_URL not set, using fallback:', fallback);
    console.log('💡 Set VITE_API_BASE_URL=https://vpl-liveproject-1.onrender.com/api/v1 in Netlify environment variables');
    return fallback;
  })(),
  
  // Common headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
  
  // API endpoints
  ENDPOINTS: {
    LOGIN: '/api/v1/auth/login',
    SIGNUP: '/api/v1/auth/signup',
    LOGOUT: '/api/v1/auth/logout',
    USERS: '/api/v1/users',
    USER_PROFILE: '/api/v1/user/profile',
    DELIVERY_ORDERS: '/api/v1/delivery-orders',
    CREATE_DELIVERY_ORDER: '/api/v1/delivery-orders',
    TRUCKERS: '/api/v1/truckers',
    UPDATE_TRUCKER_STATUS: '/api/v1/truckers',
    CMT_USERS: '/api/v1/inhouseUser/department/CMT',
    INHOUSE_USER_LOGIN: '/api/v1/inhouseUser/login',
    ACCEPT_TERMS: '/api/v1/inhouseUser/terms/accept',
    GET_LOAD_BY_ID: '/api/v1/load',
    
    // Tally Company endpoints
    COMPANY_BASE: '/api/v1/tally/company',
    COMPANY_CREATE: '/api/v1/tally/company/create',
    COMPANY_ALL: '/api/v1/tally/company/all',
    COMPANY_DEFAULT: '/api/v1/tally/company/default/get',
    
    // Empty Truck Location endpoints
    EMPTY_TRUCK_UPDATE: '/api/v1/empty-truck-location/update',
    EMPTY_TRUCK_MY_TRUCKS: '/api/v1/empty-truck-location/my-trucks',
    EMPTY_TRUCK_BY_VEHICLE: '/api/v1/empty-truck-location/vehicle',
    EMPTY_TRUCK_CMT_UPDATE: '/api/v1/empty-truck-location/cmt/update',
    EMPTY_TRUCK_CMT_ALL: '/api/v1/empty-truck-location/cmt/all',
    EMPTY_TRUCK_CMT_BY_TRUCKER: '/api/v1/empty-truck-location/cmt/trucker',
    EMPTY_TRUCK_CMT_BY_VEHICLE: '/api/v1/empty-truck-location/cmt/vehicle',
    
    // QA (Quality Assurance) endpoints
    QA_CALL_RECORDINGS: '/api/v1/qa/call-recordings',
    QA_AUTO_ASSIGN: '/api/v1/qa/call-recordings/auto-assign',
    QA_ASSIGNMENT_STATS: '/api/v1/qa/assignment-stats',
    QA_DASHBOARD: '/api/v1/qa/dashboard',
    QA_PENDING_MANAGER_REVIEW: '/api/v1/qa/pending-manager-review',
    QA_REPORTS: '/api/v1/qa/reports',
    QA_DAILY_REVIEW: '/api/v1/qa/daily-review',
    
    // Credit Limit Form endpoints
    SEND_CREDIT_LIMIT_FORM: '/api/v1/shipper_driver/:userId/send-credit-limit-form',
    GET_CREDIT_LIMIT_FORM: '/api/v1/shipper_driver/credit-limit-form/:token',
    SUBMIT_CREDIT_LIMIT_FORM: '/api/v1/shipper_driver/credit-limit-form/:token',
    GET_CREDIT_LIMIT_REQUESTS: '/api/v1/shipper_driver/credit-limit-requests',
  },
  
  // Helper function to get full URL
  getFullUrl: (endpoint) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
  },
  
  // Helper function to get auth headers
  getAuthHeaders: () => {
    const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
    return {
      ...API_CONFIG.DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    };
  },
  
  // Helper function for API calls with auth
  apiCall: async (endpoint, options = {}) => {
    const url = API_CONFIG.getFullUrl(endpoint);
    const headers = API_CONFIG.getAuthHeaders();
    
    const config = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      credentials: 'include', // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Call Error:', error);
      throw error;
    }
  },
};

export default API_CONFIG; 