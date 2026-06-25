import React, { memo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  DataUsage as DataUsageIcon,
  SwapHoriz as SwapHorizIcon,
  LocalHospital as LocalHospitalIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

/**
 * TokenEarnSources Component
 * 
 * Displays a breakdown of ways to earn tokens in the system
 */
const TokenEarnSources = ({ earnSources = [] }) => {
  // Get icon based on source type - memoized with useCallback
  const getSourceIcon = useCallback((type) => {
    switch (type.toLowerCase()) {
      case 'analytics':
        return <AnalyticsIcon color="primary" />;
      case 'data':
        return <DataUsageIcon color="secondary" />;
      case 'referral':
        return <SwapHorizIcon color="success" />;
      case 'clinical':
        return <LocalHospitalIcon color="error" />;
      case 'education':
        return <SchoolIcon color="info" />;
      default:
        return <AssignmentIcon color="action" />;
    }
  }, []);

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Token Earn Sources
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {!Array.isArray(earnSources) || earnSources.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No token earn sources available
        </Typography>
      ) : (
        <List disablePadding>
          {Array.isArray(earnSources) && earnSources.map((source, index) => (
            <React.Fragment key={source.id || index}>
              <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                <ListItemIcon>
                  {getSourceIcon(source.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1">
                        {source.name}
                      </Typography>
                      <Tooltip title="Tokens earned for this activity">
                        <Chip 
                          label={`+${source.tokenAmount}`} 
                          color="primary" 
                          size="small" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Tooltip>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {source.description}
                    </Typography>
                  }
                />
              </ListItem>
              {index < earnSources.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

// Export as memoized component to prevent unnecessary re-renders
export default memo(TokenEarnSources);
