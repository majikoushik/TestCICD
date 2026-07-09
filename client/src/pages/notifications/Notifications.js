import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Divider,
  Chip,
  Button,
  Alert,
  Snackbar,
  Tabs,
  Tab
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Notifications as NotificationsIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { formatDateTime } from '../../utils/dateFormatter';
import * as notificationService from '../../services/notificationService';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`notifications-tabpanel-${index}`}
      aria-labelledby={`notifications-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [actionError, setActionError] = useState('');

  // Normalize the server's Notification document (read/_id) into the shape this page renders
  const normalize = (n) => ({
    id: n._id || n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    createdAt: n.createdAt,
    isRead: Boolean(n.read),
    priority: n.priority || 'medium',
    actionUrl: n.link || null,
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await notificationService.getNotifications({ limit: 100 });
      const rawList = response?.data || response?.notifications || [];
      setNotifications(rawList.map(normalize));
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on tab value
  useEffect(() => {
    if (notifications.length === 0) {
      setFilteredNotifications([]);
      return;
    }
    
    let filtered = [...notifications];
    
    // Apply tab filters
    if (tabValue === 1) { // Unread
      filtered = filtered.filter(notif => !notif.isRead);
    } else if (tabValue === 2) { // High Priority
      filtered = filtered.filter(notif => ['high', 'critical'].includes(notif.priority));
    } else if (tabValue === 3) { // Read
      filtered = filtered.filter(notif => notif.isRead);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredNotifications(filtered);
  }, [notifications, tabValue]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setActionError('Failed to mark notification as read. Please try again.');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      setActionError('Failed to delete notification. Please try again.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setActionError('Failed to mark all notifications as read. Please try again.');
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) handleMarkAsRead(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  const getNotificationIcon = (type, priority) => {
    switch (type) {
      case 'referral':
        return <Avatar sx={{ bgcolor: 'primary.main' }}><NotificationsIcon /></Avatar>;
      case 'analytics':
        return <Avatar sx={{ bgcolor: 'info.main' }}><InfoIcon /></Avatar>;
      case 'token':
        return <Avatar sx={{ bgcolor: 'success.main' }}><CheckCircleIcon /></Avatar>;
      case 'alert':
        return <Avatar sx={{ bgcolor: 'error.main' }}><WarningIcon /></Avatar>;
      case 'system':
        return <Avatar sx={{ bgcolor: 'warning.main' }}><ErrorIcon /></Avatar>;
      default:
        return <Avatar sx={{ bgcolor: 'primary.main' }}><NotificationsIcon /></Avatar>;
    }
  };

  const getPriorityChip = (priority) => {
    switch (priority) {
      case 'critical':
        return <Chip size="small" color="error" label="Critical" />;
      case 'high':
        return <Chip size="small" color="warning" label="High" />;
      case 'medium':
        return <Chip size="small" color="info" label="Medium" />;
      case 'low':
        return <Chip size="small" color="success" label="Low" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return formatDateTime(dateString);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <ModernLoadingIndicator variant="dots" message="Loading notifications..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={5000}
        onClose={() => setActionError('')}
      >
        <Alert severity="error" onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Notifications
        </Typography>
        <Button
          variant="outlined"
          onClick={handleMarkAllAsRead}
          startIcon={<CheckCircleIcon />}
          disabled={!notifications.some(notif => !notif.isRead)}
        >
          Mark All as Read
        </Button>
      </Box>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="notification tabs"
          >
            <Tab label="All" />
            <Tab label={`Unread (${notifications.filter(n => !n.isRead).length})`} />
            <Tab label="High Priority" />
            <Tab label="Read" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <NotificationList
            notifications={filteredNotifications}
            handleMarkAsRead={handleMarkAsRead}
            handleDeleteNotification={handleDeleteNotification}
            handleNotificationClick={handleNotificationClick}
            getNotificationIcon={getNotificationIcon}
            getPriorityChip={getPriorityChip}
            formatDate={formatDate}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <NotificationList
            notifications={filteredNotifications}
            handleMarkAsRead={handleMarkAsRead}
            handleDeleteNotification={handleDeleteNotification}
            handleNotificationClick={handleNotificationClick}
            getNotificationIcon={getNotificationIcon}
            getPriorityChip={getPriorityChip}
            formatDate={formatDate}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <NotificationList
            notifications={filteredNotifications}
            handleMarkAsRead={handleMarkAsRead}
            handleDeleteNotification={handleDeleteNotification}
            handleNotificationClick={handleNotificationClick}
            getNotificationIcon={getNotificationIcon}
            getPriorityChip={getPriorityChip}
            formatDate={formatDate}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <NotificationList
            notifications={filteredNotifications}
            handleMarkAsRead={handleMarkAsRead}
            handleDeleteNotification={handleDeleteNotification}
            handleNotificationClick={handleNotificationClick}
            getNotificationIcon={getNotificationIcon}
            getPriorityChip={getPriorityChip}
            formatDate={formatDate}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
}

// Separate component for the notification list
function NotificationList({
  notifications,
  handleMarkAsRead,
  handleDeleteNotification,
  handleNotificationClick,
  getNotificationIcon,
  getPriorityChip,
  formatDate
}) {
  return (
    <List>
      {notifications.length > 0 ? (
        notifications.map((notification, index) => (
          <React.Fragment key={notification.id}>
            <ListItem
              alignItems="flex-start"
              onClick={() => handleNotificationClick(notification)}
              sx={{
                bgcolor: notification.isRead ? 'inherit' : 'action.hover',
                cursor: notification.actionUrl ? 'pointer' : 'default',
                '&:hover': { bgcolor: 'action.selected' }
              }}
            >
              <ListItemAvatar>
                {getNotificationIcon(notification.type, notification.priority)}
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" component="span">
                      {notification.title}
                    </Typography>
                    {getPriorityChip(notification.priority)}
                  </Box>
                }
                secondary={
                  <React.Fragment>
                    <Typography
                      sx={{ display: 'block' }}
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {notification.message}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {formatDate(notification.createdAt)}
                    </Typography>
                  </React.Fragment>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex' }}>
                  {!notification.isRead && (
                    <IconButton
                      edge="end"
                      aria-label="mark as read"
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notification.id); }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))
      ) : (
        <ListItem>
          <ListItemText 
            primary="No notifications" 
            secondary="You don't have any notifications in this category"
          />
        </ListItem>
      )}
    </List>
  );
}
