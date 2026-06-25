import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Storage as StorageIcon,
  Security as SecurityIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

export default function AnalyticsDataSources({ dataSources }) {
  if (!dataSources || dataSources.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">
          No data sources information available for this analysis.
        </Typography>
      </Paper>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total records
  const totalRecords = dataSources.reduce((sum, source) => sum + source.recordCount, 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Sources
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        The following data sources were used in this analysis. All data is processed in accordance with privacy regulations and patient consent.
      </Typography>
      
      {/* Summary Card */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {dataSources.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data Sources
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {totalRecords.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Records
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {dataSources.every(source => source.anonymized) ? 'Yes' : 'Partial'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Anonymized
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Data Sources Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Records</TableCell>
              <TableCell>Date Range</TableCell>
              <TableCell>Anonymized</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataSources.map((source, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
                    {source.source}
                  </Box>
                </TableCell>
                <TableCell>{source.type}</TableCell>
                <TableCell align="right">{source.recordCount.toLocaleString()}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon fontSize="small" sx={{ mr: 0.5 }} />
                    {formatDate(source.dateRange.start)} - {formatDate(source.dateRange.end)}
                  </Box>
                </TableCell>
                <TableCell>
                  {source.anonymized ? (
                    <Chip 
                      icon={<SecurityIcon />} 
                      label="Anonymized" 
                      color="success" 
                      size="small" 
                      variant="outlined" 
                    />
                  ) : (
                    <Chip 
                      label="Not Anonymized" 
                      color="default" 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Data Distribution */}
      <Typography variant="h6" gutterBottom>
        Data Distribution
      </Typography>
      <Grid container spacing={3}>
        {dataSources.map((source, index) => {
          const percentage = (source.recordCount / totalRecords * 100).toFixed(1);
          
          return (
            <Grid item xs={12} key={index}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {source.source}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ flexGrow: 1, mr: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={parseFloat(percentage)} 
                        sx={{ height: 10, borderRadius: 5 }} 
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {percentage}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {source.recordCount.toLocaleString()} records
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      
      {/* Privacy Notice */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="subtitle2" gutterBottom>
          Privacy Notice
        </Typography>
        <Typography variant="body2">
          All data used in this analysis is processed in accordance with healthcare privacy regulations. 
          Patient data is anonymized where indicated and all processing is done with appropriate consent 
          and security measures in place. The blockchain ensures immutable records of data access and usage.
        </Typography>
      </Paper>
    </Box>
  );
}
