import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { 
  InboxOutlined as InboxIcon,
  SearchOff as SearchOffIcon,
  Add as AddIcon
} from '@mui/icons-material';

/**
 * EmptyState component
 * 
 * A reusable empty state component to display when there's no data
 * 
 * @param {Object} props
 * @param {string} props.title - The title to display
 * @param {string} props.message - The message to display
 * @param {string} props.type - The type of empty state (default, search, error)
 * @param {Function} props.actionCallback - Optional callback for the action button
 * @param {string} props.actionLabel - Label for the action button
 * @param {Object} props.actionIcon - Icon for the action button
 * @param {boolean} props.compact - Whether to use a compact layout
 */
export default function EmptyState({
  title = 'No Data Available',
  message = 'There are no items to display at this time.',
  type = 'default',
  actionCallback,
  actionLabel = 'Add New',
  actionIcon = <AddIcon />,
  compact = false
}) {
  // Determine the icon based on the type
  const getIcon = () => {
    switch (type) {
      case 'search':
        return <SearchOffIcon sx={{ fontSize: compact ? 40 : 60, color: 'text.secondary' }} />;
      case 'error':
        return <InboxIcon sx={{ fontSize: compact ? 40 : 60, color: 'error.main' }} />;
      default:
        return <InboxIcon sx={{ fontSize: compact ? 40 : 60, color: 'text.secondary' }} />;
    }
  };

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: compact ? 2 : 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        backgroundColor: 'background.default',
        minHeight: compact ? 'auto' : 200
      }}
    >
      <Box sx={{ mb: compact ? 1 : 2 }}>
        {getIcon()}
      </Box>
      
      <Typography 
        variant={compact ? 'h6' : 'h5'} 
        component="h2" 
        gutterBottom
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ maxWidth: 500, mb: actionCallback ? (compact ? 2 : 3) : 0 }}
      >
        {message}
      </Typography>
      
      {actionCallback && (
        <Button
          variant="contained"
          startIcon={actionIcon}
          onClick={actionCallback}
          size={compact ? 'small' : 'medium'}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
}
