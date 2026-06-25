/**
 * Utils Index
 * 
 * This file exports all utility functions for easier imports throughout the application
 */

// Import Date Formatter Utils
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateRange,
  formatTime,
  getAge
} from './dateFormatter';

// Import String Formatter Utils
import {
  capitalize,
  toTitleCase,
  truncate,
  formatName,
  formatPhoneNumber,
  formatCurrency,
  formatPercentage,
  snakeToCamel,
  camelToSnake,
  formatFileSize
} from './stringFormatter';

// Import Validation Utils
import {
  isValidEmail,
  validatePassword,
  isValidPhoneNumber,
  isValidDate,
  isValidUrl,
  validateRequiredFields,
  validateForm
} from './validationUtils';

// Import Blockchain Utils
import {
  formatTransactionId,
  getExplorerUrl,
  verifyTransaction,
  getTransactionStatus,
  formatAddress,
  generateMockTransactionId,
  getNetworkName
} from './blockchainUtils';

// Import Storage Utils
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getStorageKeys,
  hasStorageItem,
  getStorageSize,
  createNamespacedStorage,
  authStorage,
  userStorage,
  settingsStorage,
  cacheStorage
} from './storageUtils';

// Import API Utils
import {
  get,
  post,
  put,
  patch,
  del,
  mockResponse
} from './apiUtils';

// Import default API instance
import apiInstance from './apiUtils';
const api = apiInstance;

// Export all utilities
export {
  // Date Formatter Utils
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateRange,
  formatTime,
  getAge,

  // String Formatter Utils
  capitalize,
  toTitleCase,
  truncate,
  formatName,
  formatPhoneNumber,
  formatCurrency,
  formatPercentage,
  snakeToCamel,
  camelToSnake,
  formatFileSize,

  // Validation Utils
  isValidEmail,
  validatePassword,
  isValidPhoneNumber,
  isValidDate,
  isValidUrl,
  validateRequiredFields,
  validateForm,

  // Blockchain Utils
  formatTransactionId,
  getExplorerUrl,
  verifyTransaction,
  getTransactionStatus,
  formatAddress,
  generateMockTransactionId,
  getNetworkName,

  // Storage Utils
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getStorageKeys,
  hasStorageItem,
  getStorageSize,
  createNamespacedStorage,
  authStorage,
  userStorage,
  settingsStorage,
  cacheStorage,

  // API Utils
  get,
  post,
  put,
  patch,
  del,
  mockResponse,
  api
};

// Export utility groups
export const dateUtils = {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDateRange,
  formatTime,
  getAge
};

export const stringUtils = {
  capitalize,
  toTitleCase,
  truncate,
  formatName,
  formatPhoneNumber,
  formatCurrency,
  formatPercentage,
  snakeToCamel,
  camelToSnake,
  formatFileSize
};

export const validationUtils = {
  isValidEmail,
  validatePassword,
  isValidPhoneNumber,
  isValidDate,
  isValidUrl,
  validateRequiredFields,
  validateForm
};

export const blockchainUtils = {
  formatTransactionId,
  getExplorerUrl,
  verifyTransaction,
  getTransactionStatus,
  formatAddress,
  generateMockTransactionId,
  getNetworkName
};

export const storageUtils = {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getStorageKeys,
  hasStorageItem,
  getStorageSize,
  createNamespacedStorage,
  authStorage,
  userStorage,
  settingsStorage,
  cacheStorage
};

export const apiUtils = {
  get,
  post,
  put,
  patch,
  del,
  mockResponse,
  api
};
