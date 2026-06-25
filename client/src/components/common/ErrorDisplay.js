import React from 'react';
import { Box, Alert, AlertTitle, Button, Paper, Typography } from '@mui/material';
import { Warning as WarningIcon, Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * ErrorDisplay component
 * 
 * A reusable error display component with different severity levels
 * and optional retry functionality
 * 
 * @param {Object} props
 * @param {string} props.message - The error message to display
 * @param {string} props.title - Optional title for the error
 * @param {string} props.severity - Error severity (error, warning, info)
 * @param {Function} props.onRetry - Optional retry function
 * @param {boolean} props.fullPage - Whether to display as a full page error
 */
export default function ErrorDisplay({ 
  message = 'An unexpected error occurred.',
  title,
  severity = 'error',
  onRetry,
  fullPage = false
}) {
  // If it's not a full page error, just show an alert
  if (!fullPage) {
    return (
      <Alert 
        severity={severity}
        action={onRetry && (
          <Button 
            color="inherit" 
            size="small" 
            onClick={onRetry}
            startIcon={<RefreshIcon />}
          >
            Retry
          </Button>
        )}
        sx={{ mb: 2 }}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    );
  }
  
  // Full page error display
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '80vh' 
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 500, 
          textAlign: 'center',
          borderTop: 5,
          borderColor: severity === 'warning' ? 'warning.main' : 'error.main'
        }}
      >
        <WarningIcon 
          color={severity === 'warning' ? 'warning' : 'error'} 
          sx={{ fontSize: 60, mb: 2 }} 
        />
        
        <Typography variant="h5" component="h2" gutterBottom>
          {title || (severity === 'warning' ? 'Warning' : 'Error')}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph>
          {message}
        </Typography>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {onRetry && (
            <Button 
              variant="contained" 
              color={severity === 'warning' ? 'warning' : 'error'}
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
          
          <Button 
            variant="outlined"
            component={RouterLink}
            to="/dashboard"
            startIcon={<HomeIcon />}
          >
            Go to Dashboard
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
