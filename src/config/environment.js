// Environment Configuration
const ENV = process.env.NODE_ENV || 'development';

const ENVIRONMENTS = {
  development: {
    API_BASE_URL: 'https://vpl-liveproject-1.onrender.com',
    APP_NAME: 'VPL Management System',
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  
  staging: {
    API_BASE_URL: 'https://vpl-staging.onrender.com/api/v1',
    APP_NAME: 'VPL Management System (Staging)',
    DEBUG: true,
    LOG_LEVEL: 'info',
  },
  
  production: {
    API_BASE_URL: 'https://vpl-liveproject-1.onrender.com',
    APP_NAME: 'VPL Management System',
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
};

// Get current environment config
export const getConfig = () => {
  return ENVIRONMENTS[ENV] || ENVIRONMENTS.development;
};

// Environment variables
export const config = getConfig();

// Helper functions
export const isDevelopment = () => ENV === 'development';
export const isProduction = () => ENV === 'production';
export const isStaging = () => ENV === 'staging';

// API URL helper
export const getApiUrl = (endpoint = '') => {
  return `${config.API_BASE_URL}${endpoint}`;
};

// Debug logging
export const debugLog = (...args) => {
  if (config.DEBUG) {
    console.log(`[${ENV.toUpperCase()}]`, ...args);
  }
};

// Error logging
export const errorLog = (...args) => {
  console.error(`[${ENV.toUpperCase()}]`, ...args);
};

export default config; 