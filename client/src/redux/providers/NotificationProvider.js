import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import {
  showNotification,
  closeNotification,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  selectNotification,
  selectUnreadCount,
  selectNotificationsLoading
} from '../slices/notificationsSlice';

/**
 * Custom hook to use notifications with Redux
 * 
 * @returns {Object} Notification methods and state
 */
export const useNotification = () => {
  const dispatch = useDispatch();
  const notification = useSelector(selectNotification);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);

  /**
   * Show a notification
   * 
   * @param {Object} options - Notification options
   */
  const notify = useCallback((options) => {
    dispatch(showNotification(options));
  }, [dispatch]);

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
  const handleCloseNotification = useCallback(() => {
    dispatch(closeNotification());
  }, [dispatch]);

  /**
   * Refresh unread notification count
   */
  const refreshUnreadCount = useCallback(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  /**
   * Mark a notification as read
   * 
   * @param {string} notificationId - Notification ID
   */
  const handleMarkAsRead = useCallback((notificationId) => {
    dispatch(markAsRead(notificationId));
  }, [dispatch]);

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    closeNotification: handleCloseNotification,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refreshUnreadCount,
    loading
  };
};

/**
 * Notification provider component that uses Redux
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const NotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const notification = useSelector(selectNotification);

  // Check if user is authenticated by looking for token in localStorage
  const checkIsAuthenticated = useCallback(() => {
    return !!localStorage.getItem('authToken');
  }, []);

  // Load unread count only when user is authenticated
  useEffect(() => {
    if (checkIsAuthenticated()) {
      dispatch(fetchUnreadCount());
    }
  }, [dispatch, checkIsAuthenticated]);

  // Handle notification close
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    
    dispatch(closeNotification());
  };

  return (
    <>
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
    </>
  );
};

export default NotificationProvider;
