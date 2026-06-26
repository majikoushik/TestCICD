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
    let isMounted = true;

    const loadUser = async () => {
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        if (isMounted) setCurrentUser(user);
      } catch (err) {
        console.error('Error loading user:', err);
        authStorage.remove('token');
        if (isMounted) setToken(null);
        if (isMounted) setError('Session expired. Please log in again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUser();

    return () => { isMounted = false; };
  }, [token]);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);

      authStorage.set('token', response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      // Store user for onboarding status checks
      localStorage.setItem('user', JSON.stringify(response.user));
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

      authStorage.set('token', response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
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
      authStorage.clear();
      localStorage.removeItem('user');
      setToken(null);
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      authStorage.clear();
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

  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
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
    clearError,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
