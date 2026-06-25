import React, { useState, useEffect } from 'react';
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
  Error as ErrorIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filteredNotifications, setFilteredNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch notifications
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate notification data
        const mockNotifications = [
          {
            id: 'notif-1',
            type: 'referral',
            title: 'New referral received',
            message: 'You have received a new referral from Dr. Johnson for Patient Smith',
            createdAt: new Date(2023, 7, 15, 9, 30).toISOString(),
            isRead: false,
            priority: 'high',
            actionUrl: '/referrals/ref-123'
          },
          {
            id: 'notif-2',
            type: 'analytics',
            title: 'Analytics report completed',
            message: 'Your requested analytics report for Q3 is now available',
            createdAt: new Date(2023, 7, 14, 15, 45).toISOString(),
            isRead: true,
            priority: 'medium',
            actionUrl: '/analytics/reports/q3-2023'
          },
          {
            id: 'notif-3',
            type: 'token',
            title: '15 tokens received',
            message: 'You have received 15 tokens for completing a patient referral',
            createdAt: new Date(2023, 7, 14, 10, 15).toISOString(),
            isRead: false,
            priority: 'low',
            actionUrl: '/tokens'
          },
          {
            id: 'notif-4',
            type: 'alert',
            title: 'High-risk patient alert',
            message: 'Patient Jones has been flagged as high-risk for readmission',
            createdAt: new Date(2023, 7, 13, 8, 0).toISOString(),
            isRead: false,
            priority: 'critical',
            actionUrl: '/patients/p-456'
          },
          {
            id: 'notif-5',
            type: 'system',
            title: 'System maintenance scheduled',
            message: 'The system will be down for maintenance on Sunday from 2-4 AM',
            createdAt: new Date(2023, 7, 12, 14, 30).toISOString(),
            isRead: true,
            priority: 'medium',
            actionUrl: null
          },
          {
            id: 'notif-6',
            type: 'referral',
            title: 'Referral status updated',
            message: 'Your referral for Patient Brown has been accepted',
            createdAt: new Date(2023, 7, 11, 11, 20).toISOString(),
            isRead: true,
            priority: 'medium',
            actionUrl: '/referrals/ref-789'
          },
          {
            id: 'notif-7',
            type: 'token',
            title: 'Token bonus awarded',
            message: 'You have received a 50 token bonus for your performance this month',
            createdAt: new Date(2023, 7, 10, 9, 0).toISOString(),
            isRead: false,
            priority: 'medium',
            actionUrl: '/tokens'
          },
          {
            id: 'notif-8',
            type: 'alert',
            title: 'New AI insight available',
            message: 'AI has detected a potential pattern in your patient data',
            createdAt: new Date(2023, 7, 9, 16, 45).toISOString(),
            isRead: true,
            priority: 'high',
            actionUrl: '/analytics/insights/ai-123'
          }
        ];
        
        setNotifications(mockNotifications);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setError('Failed to load notifications. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);

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

  const handleMarkAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleDeleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
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
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
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
              sx={{ 
                bgcolor: notification.isRead ? 'inherit' : 'action.hover',
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
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  )}
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteNotification(notification.id)}
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
