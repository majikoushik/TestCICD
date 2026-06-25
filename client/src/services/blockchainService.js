/**
 * Blockchain Service
 * 
 * This service handles blockchain-related operations including fetching transaction history
 */

import { get } from '../utils/apiUtils';
import { generateMockTransactionId } from '../utils/blockchainUtils';
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

/**
 * Generate mock blockchain transactions
 * 
 * @param {number} count - Number of transactions to generate
 * @returns {Array} Array of transaction objects
 */
const generateMockTransactions = (count = 20) => {
  const events = ['ReferralCreated', 'ReferralAccepted', 'ReferralRejected', 'TokenTransfer', 'TokenReward'];
  const statuses = ['Confirmed', 'Pending'];
  
  return Array.from({ length: count }, (_, index) => {
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - Math.floor(Math.random() * 30)); // Random date in the last 30 days
    timestamp.setHours(timestamp.getHours() - Math.floor(Math.random() * 24)); // Random hour in the day
    
    const hash = generateMockTransactionId();
    const event = events[Math.floor(Math.random() * events.length)];
    const blockNumber = 10000000 + Math.floor(Math.random() * 1000000);
    const status = Math.random() > 0.1 ? 'Confirmed' : 'Pending'; // 90% confirmed, 10% pending
    
    return {
      id: index + 1,
      hash,
      event,
      blockNumber,
      from: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      to: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: timestamp.toISOString(),
      status,
      confirmations: status === 'Confirmed' ? Math.floor(Math.random() * 100) + 1 : 0
    };
  });
};

export default {
  getTransactionHistory,
  getTransactionDetails
};
