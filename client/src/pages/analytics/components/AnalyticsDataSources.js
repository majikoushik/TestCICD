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
import EllipsisCell from '../../../components/common/EllipsisCell';
import EllipsisHeaderCell from '../../../components/common/EllipsisHeaderCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../../components/common/adminTableStyles';
import { formatDate } from '../../../utils/dateFormatter';

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
      <TableContainer component={Paper} variant="outlined" sx={{ ...tableContainerSx, mb: 3 }}>
        <Table size="small" sx={tableSx}>
          <TableHead>
            <TableRow sx={tableHeadRowSx}>
              <EllipsisHeaderCell label="Source" sx={{ width: '28%' }} />
              <EllipsisHeaderCell label="Type" sx={{ width: '15%' }} />
              <EllipsisHeaderCell label="Records" sx={{ width: '15%' }} align="right" />
              <EllipsisHeaderCell label="Date Range" sx={{ width: '27%' }} />
              <EllipsisHeaderCell label="Anonymized" sx={{ width: '15%' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {dataSources.map((source, index) => (
              <TableRow key={index} hover sx={tableBodyRowSx}>
                <TableCell sx={{ width: '28%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <StorageIcon sx={{ mr: 1, color: 'primary.main', flexShrink: 0 }} />
                    <EllipsisCell value={source.source} />
                  </Box>
                </TableCell>
                <TableCell sx={{ width: '15%' }}><EllipsisCell value={source.type} /></TableCell>
                <TableCell sx={{ width: '15%' }} align="right">{source.recordCount.toLocaleString()}</TableCell>
                <TableCell sx={{ width: '27%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <CalendarIcon fontSize="small" sx={{ mr: 0.5, flexShrink: 0 }} />
                    <EllipsisCell value={`${formatDate(source.dateRange.start)} - ${formatDate(source.dateRange.end)}`} />
                  </Box>
                </TableCell>
                <TableCell sx={{ width: '15%' }}>
                  {source.anonymized ? (
                    <Chip
                      icon={<SecurityIcon />}
                      label="Anonymized"
                      color="success"
                      size="small"
                      variant="outlined"
                      sx={compactChipSx}
                    />
                  ) : (
                    <Chip
                      label="Not Anonymized"
                      color="default"
                      size="small"
                      variant="outlined"
                      sx={compactChipSx}
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
