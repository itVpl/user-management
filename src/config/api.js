// API Configuration
const API_CONFIG = {
  // Base URL for all API calls
  BASE_URL: 'https://vpl-liveproject-1.onrender.com',
  
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
      withCredentials: true,
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