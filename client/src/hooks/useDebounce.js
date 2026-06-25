import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value
 * 
 * @param {any} value - Value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {any} Debounced value
 */
export default function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    // Set up the timeout to update the debounced value after the delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Clean up the timeout if the value or delay changes
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
