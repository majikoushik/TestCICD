import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, userService } from '../services';
import { authStorage } from '../utils/storageUtils';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(authStorage.get('token', false));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // No need to configure axios defaults as it's handled in apiUtils

  // Load user on initial render if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Error loading user:', err);
        authStorage.remove('token');
        setToken(null);
        setError('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      
      localStorage.setItem('authToken', response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      setError('');
      
      return response;
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authService.login({ email, password });
      
      localStorage.setItem('authToken', response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      setError('');
      
      return response;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('authToken');
      setToken(null);
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      localStorage.removeItem('authToken');
      setToken(null);
      setCurrentUser(null);
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      const updatedUser = await userService.updateUserProfile(userData);
      
      setCurrentUser(updatedUser);
      setError('');
      
      return updatedUser;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password request
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      const response = await authService.requestPasswordReset({ email });
      setError('');
      return response;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process password reset.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, password) => {
    try {
      setLoading(true);
      const response = await authService.resetPassword({ token, password });
      setError('');
      return response;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear any error messages
  const clearError = () => {
    setError('');
  };

  const value = {
    currentUser,
    token,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    forgotPassword,
    resetPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
