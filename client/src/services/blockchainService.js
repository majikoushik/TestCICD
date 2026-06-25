/**
 * Blockchain Service
 * 
 * This service handles blockchain-related operations including fetching transaction history
 */

import { get } from '../utils/apiUtils';
import { blockchainTransactionsMockData, blockchainTransactionDetailsMockData } from './mockData';

/**
 * Get blockchain transaction history
 * 
 * @returns {Promise<Array>} Promise that resolves with transaction history
 */
export const getTransactionHistory = async () => {
  try {
    // For development with mock data
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_MOCK_API === 'true') {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Use mock transaction data from mockData.js
      return blockchainTransactionsMockData;
    }
    
    // Real API call using apiUtils
    return await get('/blockchain/transactions');
  } catch (error) {
    console.error('Error fetching blockchain transactions:', error);
    throw error;
  }
};

/**
 * Get transaction details
 * 
 * @param {string} hash - Transaction hash
 * @returns {Promise<Object>} Promise that resolves with transaction details
 */
export const getTransactionDetails = async (hash) => {
  try {
    // For development with mock data
    if (process.env.NODE_ENV === 'development' || process.env.REACT_APP_MOCK_API === 'true') {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Use mock transaction details from mockData.js
      const transaction = blockchainTransactionDetailsMockData[hash];
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      return transaction;
    }
    
    // Real API call using apiUtils
    return await get(`/blockchain/transactions/${hash}`);
  } catch (error) {
    console.error(`Error fetching transaction details for ${hash}:`, error);
    throw error;
  }
};

export default {
  getTransactionHistory,
  getTransactionDetails
};
