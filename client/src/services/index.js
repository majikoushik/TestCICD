/**
 * Services Index
 * 
 * This file exports all services for easier imports throughout the application
 */

// Import all services
import authService from './authService';
import userService from './userService';
import patientService from './patientService';
import referralService from './referralService';
import analyticsService from './analyticsService';
import blockchainService from './blockchainService';
import tokenService from './tokenService';
import adminAuthService from './adminAuthService';
import adminService from './adminService';
import adminTokenService from './adminTokenService';
import adminAnalyticsService from './adminAnalyticsService';
import notificationService from './notificationService';
import adminEngagementService from './adminEngagementService';
import ambientSessionService from './ambientSessionService';
import referralMatchingService from './referralMatchingService';
import mockData from './mockData';

// Export individual services
export {
  // Authentication and User Services
  authService,
  userService,
  
  // Patient and Medical Services
  patientService,
  referralService,
  
  // Analytics and Token Services
  analyticsService,
  adminAnalyticsService,
  tokenService,
  notificationService,
  
  // Blockchain Services
  blockchainService,
  
  // Admin Services
  adminAuthService,
  adminService,
  adminTokenService,
  adminEngagementService,
  ambientSessionService,
  referralMatchingService,

  // Mock Data Service
  mockData
};

// Export all services as a group
export const Services = {
  authService,
  userService,
  patientService,
  referralService,
  analyticsService,
  adminAnalyticsService,
  blockchainService,
  tokenService,
  adminAuthService,
  adminService,
  adminTokenService,
  adminEngagementService,
  ambientSessionService,
  referralMatchingService,
  notificationService,
  mockData
};
