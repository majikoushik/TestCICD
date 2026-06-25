/**
 * Notifications Pages Index
 * 
 * This file exports all notification-related page components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import notifications page component
const Notifications = lazy(() => import('./Notifications'));

// Export notifications page component
export { Notifications };

// Export notifications page component as a group
export const NotificationsPages = {
  Notifications
};

// For backward compatibility
export default Notifications;
