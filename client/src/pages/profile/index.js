/**
 * Profile Pages Index
 * 
 * This file exports all profile-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import profile page component
const Profile = lazy(() => import('./Profile'));

// Export profile page component
export { Profile };

// Export profile page component as a group
export const ProfilePages = {
  Profile
};
