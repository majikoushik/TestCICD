/**
 * Storage Utilities
 * 
 * This utility provides functions for local storage operations
 */

/**
 * Get an item from local storage
 * 
 * @param {string} key - Storage key
 * @param {boolean} parse - Whether to parse the value as JSON
 * @returns {any} Stored value
 */
export const getStorageItem = (key, parse = true) => {
  try {
    const item = localStorage.getItem(key);
    
    if (item === null) {
      return null;
    }
    console.log("Storage Key", JSON.parse(item));
    return parse ? JSON.parse(item) : item;
  } catch (error) {
    console.error(`Error getting item from storage (${key}):`, error);
    return null;
  }
};

/**
 * Set an item in local storage
 * 
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {boolean} stringify - Whether to stringify the value
 * @returns {boolean} Whether the operation was successful
 */
export const setStorageItem = (key, value, stringify = true) => {
  try {
    const storageValue = stringify ? JSON.stringify(value) : value;
    localStorage.setItem(key, storageValue);
    return true;
  } catch (error) {
    console.error(`Error setting item in storage (${key}):`, error);
    return false;
  }
};

/**
 * Remove an item from local storage
 * 
 * @param {string} key - Storage key
 * @returns {boolean} Whether the operation was successful
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item from storage (${key}):`, error);
    return false;
  }
};

/**
 * Clear all items from local storage
 * 
 * @returns {boolean} Whether the operation was successful
 */
export const clearStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    return false;
  }
};

/**
 * Get all keys from local storage
 * 
 * @returns {Array} Array of storage keys
 */
export const getStorageKeys = () => {
  try {
    return Object.keys(localStorage);
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
};

/**
 * Check if an item exists in local storage
 * 
 * @param {string} key - Storage key
 * @returns {boolean} Whether the item exists
 */
export const hasStorageItem = (key) => {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking if item exists in storage (${key}):`, error);
    return false;
  }
};

/**
 * Get the size of local storage in bytes
 * 
 * @returns {number} Size in bytes
 */
export const getStorageSize = () => {
  try {
    let size = 0;
    
    for (const key of Object.keys(localStorage)) {
      size += localStorage.getItem(key).length;
    }
    
    return size;
  } catch (error) {
    console.error('Error getting storage size:', error);
    return 0;
  }
};

/**
 * Create a namespaced storage utility
 * 
 * @param {string} namespace - Storage namespace
 * @returns {Object} Namespaced storage utility
 */
export const createNamespacedStorage = (namespace) => {
  const getKey = (key) => `${namespace}:${key}`;
  
  return {
    get: (key, parse = true) => getStorageItem(getKey(key), parse),
    set: (key, value, stringify = true) => setStorageItem(getKey(key), value, stringify),
    remove: (key) => removeStorageItem(getKey(key)),
    clear: () => {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(`${namespace}:`)) {
            localStorage.removeItem(key);
          }
        }
        return true;
      } catch (error) {
        console.error(`Error clearing namespaced storage (${namespace}):`, error);
        return false;
      }
    },
    keys: () => {
      try {
        return Object.keys(localStorage)
          .filter(key => key.startsWith(`${namespace}:`))
          .map(key => key.replace(`${namespace}:`, ''));
      } catch (error) {
        console.error(`Error getting namespaced storage keys (${namespace}):`, error);
        return [];
      }
    },
    has: (key) => hasStorageItem(getKey(key)),
    size: () => {
      try {
        let size = 0;
        
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(`${namespace}:`)) {
            size += localStorage.getItem(key).length;
          }
        }
        
        return size;
      } catch (error) {
        console.error(`Error getting namespaced storage size (${namespace}):`, error);
        return 0;
      }
    }
  };
};

// Create namespaced storage utilities for different parts of the application
export const authStorage = createNamespacedStorage('auth');
export const userStorage = createNamespacedStorage('user');
export const settingsStorage = createNamespacedStorage('settings');
export const cacheStorage = createNamespacedStorage('cache');
