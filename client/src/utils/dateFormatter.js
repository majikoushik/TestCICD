/**
 * Date Formatter Utility
 *
 * Reads the admin-configured date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
 * from localStorage so every page honours the platform setting automatically.
 * Call setDateFormat() whenever the admin saves or loads their org settings.
 */

const DATE_FORMAT_KEY = 'ct_dateFormat';

/** Read the currently active date format preference */
export const getDateFormat = () =>
  (typeof localStorage !== 'undefined' && localStorage.getItem(DATE_FORMAT_KEY)) || 'MM/DD/YYYY';

/** Persist a new date format preference (called from AdminSettings on load/save) */
export const setDateFormat = (fmt) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(DATE_FORMAT_KEY, fmt);
};

/**
 * Core formatter — applies the stored format to a Date object.
 * Returns e.g. "12/31/2024", "31/12/2024", or "2024-12-31"
 */
const applyFormat = (dateObj, fmt) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  switch (fmt) {
    case 'DD/MM/YYYY': return `${d}/${m}/${y}`;
    case 'YYYY-MM-DD': return `${y}-${m}-${d}`;
    default:           return `${m}/${d}/${y}`; // MM/DD/YYYY
  }
};

/**
 * Format a date using the platform's configured date format.
 * @param {string|Date} date
 * @returns {string}  e.g. "12/31/2024"
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return applyFormat(dateObj, getDateFormat());
  } catch {
    return '';
  }
};

/**
 * Format a date + time using the platform's configured date format.
 * @param {string|Date} date
 * @returns {string}  e.g. "12/31/2024, 02:30 PM"
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const datePart = applyFormat(dateObj, getDateFormat());
    const timePart = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  } catch {
    return '';
  }
};

/**
 * Format a date to a relative time string (e.g., "2 days ago", "just now").
 * Falls back to formatDate() for dates older than 7 days.
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    const diffInSeconds = Math.floor((Date.now() - dateObj.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours   = Math.floor(diffInMinutes / 60);
    const diffInDays    = Math.floor(diffInHours / 24);
    if (diffInSeconds < 60)  return 'just now';
    if (diffInMinutes < 60)  return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24)    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7)      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return formatDate(dateObj);
  } catch {
    return '';
  }
};

/**
 * Format a date range (e.g. "12/01/2024 - 12/31/2024")
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {string}
 */
export const formatDateRange = (startDate, endDate) => {
  const s = formatDate(startDate);
  const e = formatDate(endDate);
  if (!s || !e) return s || e || '';
  return `${s} – ${e}`;
};

/**
 * Format a time only (e.g., "02:30 PM")
 * @param {string|Date} date
 * @returns {string}
 */
export const formatTime = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Get age in years from a date of birth.
 * @param {string|Date} dateOfBirth
 * @returns {number}
 */
export const getAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;
  try {
    const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (isNaN(dob.getTime())) return 0;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  } catch {
    return 0;
  }
};
