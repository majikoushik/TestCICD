import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { keyframes } from '@mui/system';

/**
 * ModernLoadingIndicator component
 * 
 * A modern, animated loading indicator with customizable options
 * 
 * @param {Object} props
 * @param {string} props.message - Optional message to display below the spinner
 * @param {string} props.size - Size of the spinner (small, medium, large)
 * @param {boolean} props.fullPage - Whether to center the spinner on the full page
 * @param {string} props.variant - Variant of the spinner (circular, pulse, dots)
 * @param {string} props.color - Color of the spinner (primary, secondary, success, error, info, warning)
 */
export default function ModernLoadingIndicator({ 
  message = 'Loading...', 
  size = 'medium', 
  fullPage = false,
  variant = 'circular',
  color = 'primary'
}) {
  const theme = useTheme();
  
  // Determine spinner size based on prop
  const spinnerSizes = {
    small: 24,
    medium: 40,
    large: 60
  };
  
  const spinnerSize = spinnerSizes[size] || spinnerSizes.medium;
  
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
    containerStyles.width = '100%';
  }

  // Pulse animation
  const pulseAnimation = keyframes`
    0% {
      transform: scale(0.95);
      opacity: 0.7;
    }
    50% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.7;
    }
  `;

  // Dots animation
  const dotAnimation = keyframes`
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.6;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  `;

  // Render different variants
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'pulse':
        return (
          <Box
            sx={{
              width: spinnerSize,
              height: spinnerSize,
              borderRadius: '50%',
              backgroundColor: `${color}.main`,
              animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
            }}
          />
        );
      case 'dots':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: spinnerSize / 3,
                  height: spinnerSize / 3,
                  borderRadius: '50%',
                  backgroundColor: `${color}.main`,
                  animation: `${dotAnimation} 1.4s infinite ease-in-out both`,
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </Box>
        );
      case 'circular':
      default:
        return <CircularProgress size={spinnerSize} color={color} />;
    }
  };
  
  return (
    <Box sx={containerStyles} className="modern-loading-indicator">
      {renderLoadingIndicator()}
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mt: 2, 
            textAlign: 'center',
            fontWeight: 500,
            opacity: 0.9
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
}
