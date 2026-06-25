import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon,
  InfoOutlined as InfoIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

/**
 * ProviderBenchmarking Component
 * 
 * Compares clinic performance metrics against network averages
 */
const ProviderBenchmarking = ({ metrics, loading = false }) => {
  // Ensure metrics is always an array
  const metricsArray = Array.isArray(metrics) ? metrics : [];
  // Get trend icon based on comparison
  const getTrendIcon = (value) => {
    if (value > 5) return <TrendingUpIcon color="success" />;
    if (value < -5) return <TrendingDownIcon color="error" />;
    return <TrendingFlatIcon color="action" />;
  };

  // Get color based on comparison
  const getComparisonColor = (value) => {
    if (value > 0) return 'success.main';
    if (value < 0) return 'error.main';
    return 'text.secondary';
  };

  // Format percentage with sign
  const formatPercentage = (value) => {
    return value > 0 ? `+${value}%` : `${value}%`;
  };

  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <CompareArrowsIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          Provider Benchmarking
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {loading ? (
        <Box sx={{ width: '100%' }}>
          <LinearProgress />
        </Box>
      ) : metricsArray.length === 0 ? (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
          No benchmarking data available
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {metricsArray.map((metric) => (
            <Grid item xs={12} key={metric.id || metric.name}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      {metric.name}
                    </Typography>
                    <Tooltip title={metric.description || 'No description available'}>
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getTrendIcon(metric.comparisonPercentage)}
                    <Typography 
                      variant="subtitle1" 
                      sx={{ ml: 0.5, color: getComparisonColor(metric.comparisonPercentage) }}
                    >
                      {formatPercentage(metric.comparisonPercentage)}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative', height: 8, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, (metric.clinicValue / metric.maxValue) * 100))}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 1
                    }}
                  />
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      height: '120%',
                      width: 2,
                      bgcolor: 'secondary.main',
                      left: `${Math.min(100, Math.max(0, (metric.networkAverage / metric.maxValue) * 100))}%`,
                      zIndex: 1
                    }}
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Your Clinic: {metric.clinicValue}{metric.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Network Avg: {metric.networkAverage}{metric.unit}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Data is compared against the average of all clinics in the ClinicTrust AI network. Last updated: {new Date().toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProviderBenchmarking;
