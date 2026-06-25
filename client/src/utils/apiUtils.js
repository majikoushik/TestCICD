/**
 * API Utilities
 * 
 * This utility provides functions for API requests
 */

import axios from 'axios';
import { authStorage } from './storageUtils';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from storage
    const token = authStorage.get('token', false);

    // If token exists, add it to the request headers
    if (token) {
      const cleanToken = token.replace(/^"|"$/g, '');
      // Ensure token is properly formatted
      const formattedToken = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
      config.headers.Authorization = formattedToken;
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log the error for debugging
    console.error('API Response Error:', error.message);
    
    // Handle authentication errors
    if (error.response) {
      if (error.response.status === 401) {
        console.warn('Authentication error detected, redirecting to login');
        authStorage.clear();
        const isAdminPath = window.location.pathname.startsWith('/admin');
        window.location.href = isAdminPath ? '/admin/login' : '/login';
      } else if (error.response.status === 403) {
        console.warn('Authorization error detected:', error.response.data?.error || 'Access denied');
      }
    }
    
    return Promise.reject(error);
  }
);

// Response validator
const handleResponse = (response) => {
   if (response.status >= 200 && response.status < 300) {
    return response.data;
   } else {
    throw new Error(`Unexpected response status: ${response.status}`);
   }
  };

/**
 * Make a GET request
 * 
 * @param {string} url - Request URL
 * @param {Object} params - Query parameters
 * @param {Object} config - Axios config
 * @returns {Promise} Promise that resolves with the response
 */
export const get = async (url, params = {}, config = {}) => {
  try {
    const response = await api.get(url, { params, ...config });
    return handleResponse(response);
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Make a POST request
 * 
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} config - Axios config
 * @returns {Promise} Promise that resolves with the response
 */
export const post = async (url, data = {}, config = {}) => {
  try {
    const response = await api.post(url, data, config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Make a PUT request
 * 
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} config - Axios config
 * @returns {Promise} Promise that resolves with the response
 */
export const put = async (url, data = {}, config = {}) => {
  try {
    const response = await api.put(url, data, config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Make a PATCH request
 * 
 * @param {string} url - Request URL
 * @param {Object} data - Request data
 * @param {Object} config - Axios config
 * @returns {Promise} Promise that resolves with the response
 */
export const patch = async (url, data = {}, config = {}) => {
  try {
    const response = await api.patch(url, data, config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Make a DELETE request
 * 
 * @param {string} url - Request URL
 * @param {Object} config - Axios config
 * @returns {Promise} Promise that resolves with the response
 */
export const del = async (url, config = {}) => {
  try {
    const response = await api.delete(url, config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Handle API errors
 * 
 * @param {Error} error - Error object
 */
const handleApiError = (error) => {
  // Log the error
  console.error('API Error:', error);
  
  // Extract error message
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { data } = error.response;

    errorMessage = data.message || data.error || errorMessage;
  } else if (error.request) {
    // The request was made but no response was received
    console.error('Request:', error.request);
    errorMessage = 'No response received from server';
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Error message:', error.message);
    errorMessage = error.message;
  }
  
  // You can add additional error handling here, such as showing a toast notification
  
  throw new Error(errorMessage);
};

/**
 * Create a mock API response
 * 
 * @param {any} data - Response data
 * @param {number} delay - Delay in milliseconds
 * @param {boolean} success - Whether the response is successful
 * @param {number} status - Response status code
 * @returns {Promise} Promise that resolves with the response
 */
export const mockResponse = async (data, delay = 1000, success = true, status = 200) => {
  // Check if mock API is enabled
  const mockEnabled = process.env.REACT_APP_MOCK_API === 'true';
  
  if (!mockEnabled) {
    throw new Error('Mock API is disabled');
  }
  
  // Get mock delay from env or use provided delay
  const mockDelay = process.env.REACT_APP_MOCK_DELAY 
    ? parseInt(process.env.REACT_APP_MOCK_DELAY) 
    : delay;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, mockDelay));
  
  // If success, resolve with data
  if (success) {
    return { data, status };
  }
  
  // Otherwise, reject with error
  throw {
    response: {
      data: { message: 'Mock API error' },
      status
    }
  };
};

// Export the axios instance
export default api;
