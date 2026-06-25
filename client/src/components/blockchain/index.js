/**
 * Blockchain Components Index
 * 
 * This file exports all blockchain-related components with dynamic imports for better performance
 */
import { lazy } from 'react';

// Dynamically import blockchain components
const TransactionDetails = lazy(() => import('./TransactionDetails'));

// Export blockchain components
export {
  TransactionDetails
};

// Export all blockchain components as a group
export const BlockchainComponents = {
  TransactionDetails
};
