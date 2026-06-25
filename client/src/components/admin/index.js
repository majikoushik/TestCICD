/**
 * Admin Components Index
 * 
 * This file exports all admin components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import admin components
const AIModelDetails = lazy(() => import('./AIModelDetails'));
const AIModelTrainingFeedback = lazy(() => import('./AIModelTrainingFeedback'));
const AIReportScheduler = lazy(() => import('./AIReportScheduler'));
const AIStatisticsDialog = lazy(() => import('./AIStatisticsDialog'));
const AdminActionCard = lazy(() => import('./AdminActionCard'));
const AdminMetricCard = lazy(() => import('./AdminMetricCard'));
const AdminStatusCard = lazy(() => import('./AdminStatusCard'));
const ScheduleReportDialog = lazy(() => import('./ScheduleReportDialog'));
const SettingCard = lazy(() => import('./SettingCard'));

// Export individual components
export {
  // AI Components
  AIModelDetails,
  AIModelTrainingFeedback,
  AIReportScheduler,
  AIStatisticsDialog,
  
  // Admin UI Components
  AdminActionCard,
  AdminMetricCard,
  AdminStatusCard,
  ScheduleReportDialog,
  SettingCard
};

// Export all components as a group
export const AdminComponents = {
  AIModelDetails,
  AIModelTrainingFeedback,
  AIReportScheduler,
  AIStatisticsDialog,
  AdminActionCard,
  AdminMetricCard,
  AdminStatusCard,
  ScheduleReportDialog,
  SettingCard
};
