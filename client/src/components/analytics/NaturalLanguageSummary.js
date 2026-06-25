import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Skeleton,
  Chip
} from '@mui/material';
import {
  Description as DescriptionIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

/**
 * NaturalLanguageSummary Component
 * 
 * Displays a GPT-generated natural language summary of analytics data
 */
const NaturalLanguageSummary = ({ summary = null, loading = false, timeframe = 'This Month' }) => {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DescriptionIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" component="h2">
            Analytics Summary
          </Typography>
        </Box>
        <Chip 
          icon={<AutoAwesomeIcon />} 
          label="AI Generated" 
          size="small" 
          color="secondary" 
          variant="outlined" 
        />
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {timeframe}
        </Typography>
      </Box>
      
      {loading ? (
        <>
          <Skeleton variant="text" height={20} width="90%" />
          <Skeleton variant="text" height={20} width="100%" />
          <Skeleton variant="text" height={20} width="95%" />
          <Skeleton variant="text" height={20} width="98%" />
          <Skeleton variant="text" height={20} width="85%" />
        </>
      ) : summary ? (
        <Typography variant="body1" color="text.primary" paragraph>
          {summary}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No summary available for this period
        </Typography>
      )}
      
      {summary && !loading && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            This summary was generated using AI based on your clinic's data. The analysis highlights key trends and insights but should be reviewed by healthcare professionals.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default NaturalLanguageSummary;
