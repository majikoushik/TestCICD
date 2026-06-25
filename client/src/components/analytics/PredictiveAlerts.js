import React from 'react';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

/**
 * PredictiveAlerts Component
 * 
 * Displays AI-generated predictive alerts for high-risk patients and other clinical insights
 */
const PredictiveAlerts = ({ alerts, loading = false, onViewDetails }) => {
  // Ensure alerts is always an array
  const alertsArray = Array.isArray(alerts) ? alerts : [];
  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get alert icon based on type
  const getAlertIcon = (type) => {
    switch (type) {
      case 'readmission':
        return <PersonIcon color="error" />;
      case 'trend':
        return <TrendingUpIcon color="warning" />;
      case 'schedule':
        return <CalendarIcon color="info" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <WarningIcon color="warning" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          Predictive Alerts
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 4 }}>
          <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : alertsArray.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No active alerts at this time
        </Typography>
      ) : (
        <List sx={{ width: '100%' }}>
          {alertsArray.map((alert, index) => (
            <React.Fragment key={alert.id || index}>
              <ListItem alignItems="flex-start">
                <ListItemIcon>
                  {getAlertIcon(alert.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle1" component="span" sx={{ mr: 1 }}>
                        {alert.title}
                      </Typography>
                      <Chip 
                        label={alert.severity} 
                        color={getSeverityColor(alert.severity)} 
                        size="small" 
                      />
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        {alert.description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {alert.timeframe}
                        </Typography>
                        <Button 
                          size="small" 
                          onClick={() => onViewDetails(alert)}
                          variant="outlined"
                        >
                          View Details
                        </Button>
                      </Box>
                    </React.Fragment>
                  }
                />
              </ListItem>
              {index < alertsArray.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default PredictiveAlerts;
