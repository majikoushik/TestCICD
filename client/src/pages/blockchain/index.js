/**
 * Blockchain Pages Index
 * 
 * This file exports all blockchain-related page components with dynamic imports for better performance
 */
import React, { lazy } from 'react';

// Dynamically import blockchain page components
const BlockchainHistory = lazy(() => import('./BlockchainHistory'));
const BlockchainTransactionDetails = lazy(() => import('./BlockchainTransactionDetails'));

// Export blockchain page components
export {
  BlockchainHistory,
  BlockchainTransactionDetails
};

// Export all blockchain page components as a group
export const BlockchainPages = {
  BlockchainHistory,
  BlockchainTransactionDetails
};
