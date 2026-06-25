import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  fetchTokenBalance,
  fetchTokenTransactions,
  fetchRedemptionServices,
  transferTokens,
  redeemTokens,
  selectTokenBalance,
  selectTokenLoading,
  selectTokenError
} from '../slices/tokenSlice';

/**
 * TokenProvider component that provides token functionality using Redux
 * This is a bridge component to help transition from context to Redux
 * It provides the same interface as the TokenContext but uses Redux under the hood
 */
export const TokenProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  
  // Get token state from Redux
  const balance = useSelector(selectTokenBalance);
  const loading = useSelector(selectTokenLoading);
  const error = useSelector(selectTokenError);
  
  // Load token data when user changes
  useEffect(() => {
    if (currentUser) {
      dispatch(fetchTokenBalance());
      dispatch(fetchRedemptionServices());
    }
  }, [currentUser, dispatch]);
  
  return children;
};

/**
 * Custom hook to use token functionality with Redux
 * This provides the same interface as the useToken hook but uses Redux
 */
export const useToken = () => {
  const dispatch = useDispatch();
  const { notifySuccess, notifyError } = useNotification();
  
  // Get token state from Redux
  const balance = useSelector(selectTokenBalance);
  const loading = useSelector(selectTokenLoading).balance;
  const error = useSelector(selectTokenError);
  
  // Functions that mimic the original TokenContext API
  const getBalance = () => {
    dispatch(fetchTokenBalance());
  };
  
  const getTransactions = (options = {}) => {
    return dispatch(fetchTokenTransactions(options)).unwrap();
  };
  
  const transferTokensHandler = async (transferData) => {
    try {
      await dispatch(transferTokens(transferData)).unwrap();
      notifySuccess('Tokens transferred successfully');
    } catch (err) {
      notifyError(err.message || 'Failed to transfer tokens');
      throw err;
    }
  };
  
  const redeemTokensHandler = async (redemptionData) => {
    try {
      await dispatch(redeemTokens(redemptionData)).unwrap();
      notifySuccess('Service redeemed successfully');
    } catch (err) {
      notifyError(err.message || 'Failed to redeem tokens');
      throw err;
    }
  };
  
  return {
    balance,
    loading,
    error,
    getBalance,
    getTransactions,
    transferTokens: transferTokensHandler,
    redeemTokens: redeemTokensHandler
  };
};

export default TokenProvider;
