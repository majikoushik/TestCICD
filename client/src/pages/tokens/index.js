/**
 * Token Pages Index
 * 
 * This file exports all token-related page components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import token page components
const TokenDashboard = lazy(() => import('./TokenDashboard'));
const TokenRedeem = lazy(() => import('./TokenRedeem'));
const TokenTransfer = lazy(() => import('./TokenTransfer'));

// Export token page components
export {
  TokenDashboard,
  TokenRedeem,
  TokenTransfer
};

// Export all token page components as a group
export const TokenPages = {
  TokenDashboard,
  TokenRedeem,
  TokenTransfer
};
