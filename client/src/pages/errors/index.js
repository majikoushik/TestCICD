/**
 * Error Pages Index
 * 
 * This file exports all error-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import error page component
const NotFound = lazy(() => import('./NotFound'));

// Export error page component
export { NotFound };

// Export error page component as a group
export const ErrorPages = {
  NotFound
};
