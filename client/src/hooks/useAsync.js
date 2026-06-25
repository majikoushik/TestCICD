import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for handling asynchronous operations
 * 
 * @param {Function} asyncFunction - Async function to execute
 * @param {Array} dependencies - Dependencies array for useEffect
 * @param {boolean} immediate - Whether to execute the function immediately
 * @param {any} initialData - Initial data
 * @returns {Object} Async operation state and methods
 */
export default function useAsync(
  asyncFunction,
  dependencies = [],
  immediate = true,
  initialData = null
) {
  // State for async operation
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(immediate ? 'pending' : 'idle');
  
  // Execute the async function
  const execute = useCallback(async (...args) => {
    setLoading(true);
    setStatus('pending');
    setError(null);
    
    try {
      const result = await asyncFunction(...args);
      setData(result);
      setStatus('success');
      return result;
    } catch (error) {
      setError(error);
      setStatus('error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);
  
  // Reset the state
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
    setStatus('idle');
  }, [initialData]);
  
  // Execute the function immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...dependencies]);
  
  return {
    data,
    loading,
    error,
    status,
    execute,
    reset,
    setData,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  };
}
