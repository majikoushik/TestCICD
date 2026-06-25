/**
 * Authentication Utilities
 * 
 * Helper functions for authentication-related tasks
 */

import { authStorage } from './storageUtils';

/**
 * Get the authentication token from storage
 * 
 * @returns {string|null} The authentication token or null if not found
 */
export const getToken = () => {
  return authStorage.get('token');
};

/**
 * Get the current user from storage
 * 
 * @returns {Object|null} The user object or null if not found
 */
export const getCurrentUser = () => {
  return authStorage.get('user');
};

/**
 * Check if the user is authenticated
 * 
 * @returns {boolean} True if the user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Check if the user has a specific role
 * 
 * @param {string|Array} roles - Role or array of roles to check
 * @returns {boolean} True if the user has the role
 */
export const hasRole = (roles) => {
  const user = getCurrentUser();
  
  if (!user || !user.role) {
    return false;
  }
  
  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }
  
  return user.role === roles;
};

/**
 * Log out the user by clearing storage
 */
export const logout = () => {
  authStorage.clear();
  window.location.href = '/login';
};

export default {
  getToken,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  logout
};
