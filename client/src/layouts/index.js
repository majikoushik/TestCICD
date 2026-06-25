/**
 * Layouts Index
 * 
 * This file exports all layout components as static imports since they are critical
 * for the application structure and should be loaded immediately to avoid layout flicker or delays.
 */
import AdminLayout from './AdminLayout';
import AuthLayout from './AuthLayout';
import LandingLayout from './LandingLayout';
import MainLayout from './MainLayout';

// Export layout components
export {
  AdminLayout,
  AuthLayout,
  LandingLayout,
  MainLayout
};

// Export all layout components as a group
export const Layouts = {
  AdminLayout,
  AuthLayout,
  LandingLayout,
  MainLayout
};
