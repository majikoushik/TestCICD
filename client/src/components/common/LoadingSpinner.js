import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * LoadingSpinner component
 * 
 * A reusable loading spinner component with optional message
 * 
 * @param {Object} props
 * @param {string} props.message - Optional message to display below the spinner
 * @param {string} props.size - Size of the spinner (small, medium, large)
 * @param {boolean} props.fullPage - Whether to center the spinner on the full page
 */
export default function LoadingSpinner({ message = 'Loading...', size = 'medium', fullPage = false }) {
  // Determine spinner size based on prop
  const spinnerSize = {
    small: 24,
    medium: 40,
    large: 60
  }[size] || 40;
  
  // Base styles
  const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3
  };
  
  // Add full page styles if needed
  if (fullPage) {
    containerStyles.height = '80vh';
  }
  
  return (
    <Box sx={containerStyles}>
      <CircularProgress size={spinnerSize} />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mt: 2, textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
