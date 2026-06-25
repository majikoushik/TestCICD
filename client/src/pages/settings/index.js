/**
 * Settings Pages Index
 * 
 * This file exports all settings-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import settings page component
const Settings = lazy(() => import('./Settings'));

// Export settings page component
export { Settings };

// Export settings page component as a group
export const SettingsPages = {
  Settings
};
