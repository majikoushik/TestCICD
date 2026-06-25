/**
 * Notifications Components Index
 * 
 * This file exports all notification-related components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import notifications components
const ReduxNotificationProvider = lazy(() => import('./ReduxNotificationProvider'));

// Export notifications components
export {
  ReduxNotificationProvider
};

// Export all notifications components as a group
export const NotificationsComponents = {
  ReduxNotificationProvider
};
