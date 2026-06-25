import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import { notificationService } from '../services';

// Create notification context
const NotificationContext = createContext({
  notify: () => {},
  closeNotification: () => {},
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  refreshUnreadCount: () => {}
});

/**
 * Custom hook to use the notification context
 * 
 * @returns {Object} Notification context
 */
export const useNotification = () => useContext(NotificationContext);

/**
 * Notification provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const NotificationProvider = ({ children }) => {
  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    title: '',
    severity: 'info',
    autoHideDuration: 6000,
    vertical: 'bottom',
    horizontal: 'center'
  });
  
  // Unread notification count
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  /**
   * Show a notification
   * 
   * @param {Object} options - Notification options
   * @param {string} options.message - Notification message
   * @param {string} options.title - Notification title
   * @param {string} options.severity - Notification severity (success, error, warning, info)
   * @param {number} options.autoHideDuration - Auto hide duration in milliseconds
   * @param {string} options.vertical - Vertical position (top, bottom)
   * @param {string} options.horizontal - Horizontal position (left, center, right)
   */
  const notify = useCallback((options) => {
    setNotification({
      open: true,
      message: options.message || '',
      title: options.title || '',
      severity: options.severity || 'info',
      autoHideDuration: options.autoHideDuration || 6000,
      vertical: options.vertical || 'bottom',
      horizontal: options.horizontal || 'center'
    });
  }, []);
  
  /**
   * Show a success notification
   * 
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifySuccess = useCallback((message, title = '', options = {}) => {
    notify({
      message,
      title,
      severity: 'success',
      ...options
    });
  }, [notify]);
  
  /**
   * Show an error notification
   * 
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyError = useCallback((message, title = '', options = {}) => {
    notify({
      message,
      title,
      severity: 'error',
      ...options
    });
  }, [notify]);
  
  /**
   * Show a warning notification
   * 
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyWarning = useCallback((message, title = '', options = {}) => {
    notify({
      message,
      title,
      severity: 'warning',
      ...options
    });
  }, [notify]);
  
  /**
   * Show an info notification
   * 
   * @param {string} message - Notification message
   * @param {string} title - Notification title
   * @param {Object} options - Additional options
   */
  const notifyInfo = useCallback((message, title = '', options = {}) => {
    notify({
      message,
      title,
      severity: 'info',
      ...options
    });
  }, [notify]);
  
  /**
   * Close the notification
   */
  const closeNotification = useCallback(() => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  }, []);
  
  // Handle notification close
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    
    closeNotification();
  };
  
  /**
   * Get unread notification count
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getUnreadCount();
      // Use count property from the response (server API returns count, not unreadCount)
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark a notification as read
   * 
   * @param {string} notificationId - Notification ID
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      // Refresh unread count
      refreshUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [refreshUnreadCount]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      // Set unread count to 0
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Check if user is authenticated by looking for token in localStorage
  const checkIsAuthenticated = useCallback(() => {
    return !!localStorage.getItem('authToken');
  }, []);
  
  // Load unread count only when user is authenticated
  useEffect(() => {
    if (checkIsAuthenticated()) {
      refreshUnreadCount();
    } else {
      // Reset unread count when user is not authenticated
      setUnreadCount(0);
    }
  }, [refreshUnreadCount, checkIsAuthenticated]);

  // Context value
  const contextValue = {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    closeNotification,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshUnreadCount,
    loading
  };
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{
          vertical: notification.vertical,
          horizontal: notification.horizontal
        }}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.title && (
            <AlertTitle>{notification.title}</AlertTitle>
          )}
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
