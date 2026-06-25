/**
 * String Formatter Utility
 * 
 * This utility provides consistent string formatting throughout the application
 */

/**
 * Capitalize the first letter of a string
 * 
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Convert a string to title case
 * 
 * @param {string} str - String to convert
 * @returns {string} Title case string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Truncate a string to a specified length and add ellipsis
 * 
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
};

/**
 * Format a name (first name, last name)
 * 
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @param {boolean} lastNameFirst - Whether to put last name first
 * @returns {string} Formatted name
 */
export const formatName = (firstName, lastName, lastNameFirst = false) => {
  if (!firstName && !lastName) return '';
  if (!firstName) return lastName;
  if (!lastName) return firstName;
  
  return lastNameFirst
    ? `${lastName}, ${firstName}`
    : `${firstName} ${lastName}`;
};

/**
 * Format a phone number (e.g., "(123) 456-7890")
 * 
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the input is of correct length
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  
  return phoneNumber;
};

/**
 * Format currency (e.g., "$1,234.56")
 * 
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @param {string} locale - Locale
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === undefined || amount === null) return '';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '';
  }
};

/**
 * Format a percentage (e.g., "12.34%")
 * 
 * @param {number} value - Value to format
 * @param {number} decimalPlaces - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimalPlaces = 2) => {
  if (value === undefined || value === null) return '';
  
  try {
    return `${(value * 100).toFixed(decimalPlaces)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '';
  }
};

/**
 * Convert snake_case to camelCase
 * 
 * @param {string} str - String to convert
 * @returns {string} Converted string
 */
export const snakeToCamel = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
};

/**
 * Convert camelCase to snake_case
 * 
 * @param {string} str - String to convert
 * @returns {string} Converted string
 */
export const camelToSnake = (str) => {
  if (!str) return '';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Format a file size (e.g., "1.23 MB")
 * 
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
