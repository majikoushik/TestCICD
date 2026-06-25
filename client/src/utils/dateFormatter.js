/**
 * Date Formatter Utility
 * 
 * This utility provides consistent date formatting throughout the application
 */

/**
 * Format a date to a standard date string (e.g., "Jan 1, 2023")
 * 
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format a date to a standard date and time string (e.g., "Jan 1, 2023, 12:00 PM")
 * 
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date and time:', error);
    return '';
  }
};

/**
 * Format a date to a relative time string (e.g., "2 days ago", "in 3 hours")
 * 
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return formatDate(dateObj);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

/**
 * Format a date range (e.g., "Jan 1 - Jan 5, 2023")
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate, options = {}) => {
  if (!startDate || !endDate) return '';
  
  try {
    const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    // Check if dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return '';
    }
    
    // If same year, don't repeat the year
    const sameYear = startDateObj.getFullYear() === endDateObj.getFullYear();
    
    // If same month and year, don't repeat the month and year
    const sameMonth = sameYear && startDateObj.getMonth() === endDateObj.getMonth();
    
    const startOptions = {
      year: sameYear ? undefined : 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    const endOptions = {
      year: 'numeric',
      month: sameMonth ? undefined : 'short',
      day: 'numeric'
    };
    
    const formattedStartDate = startDateObj.toLocaleDateString('en-US', { ...startOptions, ...options });
    const formattedEndDate = endDateObj.toLocaleDateString('en-US', { ...endOptions, ...options });
    
    return `${formattedStartDate} - ${formattedEndDate}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
};

/**
 * Format a time (e.g., "12:00 PM")
 * 
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted time string
 */
export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return dateObj.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Get age from date of birth
 * 
 * @param {string|Date} dateOfBirth - Date of birth
 * @returns {number} Age in years
 */
export const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  
  try {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    
    // Check if date is valid
    if (isNaN(dob.getTime())) {
      return 0;
    }
    
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return 0;
  }
};
