/**
 * Hooks Index
 * 
 * This file exports all custom hooks for easier imports throughout the application
 */

// Import all hooks
import useForm from './useForm';
import useDebounce from './useDebounce';
import useAsync from './useAsync';
import useLocalStorage from './useLocalStorage';
import useConfirmation from './useConfirmation';

// Export individual hooks
export {
  // Form and Input Hooks
  useForm,
  useDebounce,
  
  // Async and Data Hooks
  useAsync,
  useLocalStorage,
  
  // UI Hooks
  useConfirmation
};

// Export all hooks as a group
export const Hooks = {
  useForm,
  useDebounce,
  useAsync,
  useLocalStorage,
  useConfirmation
};
