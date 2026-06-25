/**
 * Token Components Index
 * 
 * This file exports all token components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamic imports for token components
const TokenEarnSources = lazy(() => import('./TokenEarnSources'));
const RedeemServicesCatalog = lazy(() => import('./RedeemServicesCatalog'));

// Export token components
export { 
  TokenEarnSources,
  RedeemServicesCatalog
};

// Export all token components as a group
export const TokenComponents = {
  TokenEarnSources,
  RedeemServicesCatalog
};
