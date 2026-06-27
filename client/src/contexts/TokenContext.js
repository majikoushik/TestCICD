import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tokenService } from '../services';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

// Create token context
const TokenContext = createContext({
  balance: 0,
  transactions: [],
  loading: false,
  error: null,
  getBalance: () => {},
  getTransactions: () => {},
  transferTokens: () => {},
  redeemTokens: () => {},
  services: []
});

/**
 * Custom hook to use the token context
 * 
 * @returns {Object} Token context
 */
export const useToken = () => useContext(TokenContext);

/**
 * Token provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const TokenProvider = ({ children }) => {
  // State
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Get auth context
  const { currentUser } = useAuth();
  
  // Get notification context
  const { notifySuccess, notifyError } = useNotification();
  
  /**
   * Get token balance
   * 
   * @returns {Promise} Promise that resolves with the token balance
   */
  const getBalance = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await tokenService.getTokenBalance();
      setBalance(response.balance);
      return response.balance;
    } catch (err) {
      console.error('Error getting token balance:', err);
      setError('Failed to get token balance');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  /**
   * Get token transactions
   * 
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Page size
   * @param {string} options.type - Transaction type
   * @returns {Promise} Promise that resolves with the transactions
   */
  const getTransactions = useCallback(async (options = {}) => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await tokenService.getTokenTransactions(options);
      setTransactions(response.transactions);
      setPagination(response.pagination);
      return response;
    } catch (err) {
      console.error('Error getting token transactions:', err);
      setError('Failed to get token transactions');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  /**
   * Transfer tokens to another user
   * 
   * @param {Object} transferData - Transfer data
   * @param {string} transferData.recipientId - Recipient user ID
   * @param {number} transferData.amount - Amount to transfer
   * @param {string} transferData.description - Transfer description
   * @returns {Promise} Promise that resolves with the transfer result
   */
  const transferTokens = useCallback(async (transferData) => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await tokenService.transferTokens(transferData);
      
      // Update balance
      setBalance(response.balance);
      
      // Show success notification
      notifySuccess('Tokens transferred successfully');
      
      return response;
    } catch (err) {
      console.error('Error transferring tokens:', err);
      setError('Failed to transfer tokens');
      notifyError(err.response?.data?.error || 'Failed to transfer tokens');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, notifySuccess, notifyError]);
  
  /**
   * Redeem tokens for a service
   * 
   * @param {Object} redemptionData - Redemption data
   * @param {string} redemptionData.serviceId - Service ID
   * @param {number} redemptionData.amount - Amount to redeem
   * @param {Object} redemptionData.parameters - Service parameters
   * @returns {Promise} Promise that resolves with the redemption result
   */
  const redeemTokens = useCallback(async (redemptionData) => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await tokenService.redeemTokens(redemptionData);
      
      // Update balance
      setBalance(response.balance);
      
      // Show success notification
      notifySuccess('Service redeemed successfully');
      
      return response;
    } catch (err) {
      console.error('Error redeeming tokens:', err);
      setError('Failed to redeem tokens');
      notifyError(err.response?.data?.error || 'Failed to redeem tokens');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser, notifySuccess, notifyError]);
  
  /**
   * Get available services for token redemption
   */
  const getRedemptionServices = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await tokenService.getRedemptionServices();
      setServices(response);
      return response;
    } catch (err) {
      console.error('Error getting redemption services:', err);
      setError('Failed to get redemption services');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Load token balance only for fully verified users — skip during onboarding
  useEffect(() => {
    if (currentUser && currentUser.onboardingStatus === 'verified') {
      getBalance();
      getRedemptionServices();
    } else {
      setBalance(0);
      setTransactions([]);
      setServices([]);
    }
  }, [currentUser, getBalance, getRedemptionServices]);
  
  // Context value
  const value = {
    balance,
    transactions,
    loading,
    error,
    pagination,
    getBalance,
    getTransactions,
    transferTokens,
    redeemTokens,
    services
  };
  
  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};
