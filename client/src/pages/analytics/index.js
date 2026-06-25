/**
 * Analytics Pages Index
 * 
 * This file exports all analytics-related page components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import analytics page components
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const AnalyticsDetail = lazy(() => import('./AnalyticsDetail'));
const CreateAnalytics = lazy(() => import('./CreateAnalytics'));

// Export analytics page components
export {
  AnalyticsDashboard,
  AnalyticsDetail,
  CreateAnalytics
};

// Export all analytics page components as a group
export const AnalyticsPages = {
  AnalyticsDashboard,
  AnalyticsDetail,
  CreateAnalytics
};
