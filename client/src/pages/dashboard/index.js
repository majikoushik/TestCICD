/**
 * Dashboard Pages Index
 * 
 * This file exports all dashboard-related page components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import dashboard page component
const Dashboard = lazy(() => import('./Dashboard'));

// Export dashboard page component
export { Dashboard };

// Export dashboard page component as a group
export const DashboardPages = {
  Dashboard
};
