import ReactDOM from 'react-dom/client';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store.js';
import './index.css'
import '@fontsource/poppins'
import App from './App.jsx'

// 🔥 CRITICAL: Configure axios globally for Safari/iOS compatibility
// This ensures ALL axios calls (even direct imports) have credentials and Authorization headers
import axios from 'axios';
import API_CONFIG from './config/api.js';

// Set global axios defaults
axios.defaults.withCredentials = true; // 🔥 CRITICAL: Required for Safari/iOS cross-site cookies
axios.defaults.baseURL = API_CONFIG.BASE_URL;

// Global request interceptor - Add Authorization header to ALL axios requests
axios.interceptors.request.use(
  (config) => {
    // Ensure withCredentials is always true (Safari requirement)
    config.withCredentials = true;
    
    // Only add Authorization header if not already set by component
    if (!config.headers?.Authorization) {
      // Get token from storage (check all possible locations)
      const token = 
        sessionStorage.getItem('token') || 
        localStorage.getItem('token') ||
        sessionStorage.getItem('authToken') || 
        localStorage.getItem('authToken');
      
      // Add Authorization header if token exists
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response interceptor - Handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear tokens
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('authToken');
      localStorage.removeItem('authToken');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
);