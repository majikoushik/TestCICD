/**
 * Admin Pages Index
 * 
 * This file exports all admin-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import admin page components
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const AdminSettings = lazy(() => import('./AdminSettings'));
const AdminUsers = lazy(() => import('./AdminUsers'));
const AdminProviders = lazy(() => import('./AdminProviders'));
const AdminLogin = lazy(() => import('./AdminLogin'));
const AdminLoginAudit = lazy(() => import('./AdminLoginAudit'));
const AdminPatientRecords = lazy(() => import('./AdminPatientRecords'));
const AdminReferrals = lazy(() => import('./AdminReferrals'));
const AdminAIManagement = lazy(() => import('./AdminAIManagement'));
const AdminTokenManagement = lazy(() => import('./AdminTokenManagement'));
const AdminMessaging = lazy(() => import('./AdminMessaging'));

// Export admin page components
export {
  AdminDashboard,
  AdminSettings,
  AdminUsers,
  AdminProviders,
  AdminLogin,
  AdminLoginAudit,
  AdminPatientRecords,
  AdminReferrals,
  AdminAIManagement,
  AdminTokenManagement,
  AdminMessaging
};

// Export all admin page components as a group
export const AdminPages = {
  AdminDashboard,
  AdminSettings,
  AdminUsers,
  AdminProviders,
  AdminLogin,
  AdminLoginAudit,
  AdminPatientRecords,
  AdminReferrals,
  AdminAIManagement,
  AdminTokenManagement,
  AdminMessaging
};
