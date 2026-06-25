import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar, Alert, AlertTitle } from '@mui/material';
import {
  showNotification,
  closeNotification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  selectUnreadCount,
  selectNotificationsLoading,
  selectUiNotification
} from '../../redux/slices/notificationSlice';

/**
 * Custom hook to use notifications with Redux
 * 
 * @returns {Object} Notification methods and state
 */
export const useNotification = () => {
  const dispatch = useDispatch();
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
    dispatch(fetchNotifications());
  }, [dispatch]);

  /**
   * Mark a notification as read
   * 
   * @param {string} notificationId - Notification ID
   */
  const handleMarkAsRead = useCallback((notificationId) => {
    dispatch(markNotificationAsRead(notificationId));
  }, [dispatch]);

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllNotificationsAsRead());
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
const ReduxNotificationProvider = ({ children }) => {
  const dispatch = useDispatch();
  const uiNotification = useSelector(selectUiNotification);

  // Check if user is authenticated by looking for token in localStorage
  const checkIsAuthenticated = useCallback(() => {
    return !!localStorage.getItem('authToken');
  }, []);

  // Load unread count only when user is authenticated
  useEffect(() => {
    if (checkIsAuthenticated()) {
      dispatch(fetchNotifications());
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
        open={uiNotification.open}
        autoHideDuration={uiNotification.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={{
          vertical: uiNotification.vertical,
          horizontal: uiNotification.horizontal
        }}
      >
        <Alert
          onClose={handleClose}
          severity={uiNotification.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {uiNotification.title && (
            <AlertTitle>{uiNotification.title}</AlertTitle>
          )}
          {uiNotification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReduxNotificationProvider;
