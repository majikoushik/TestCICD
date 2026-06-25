import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Share as ShareIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon
} from '@mui/icons-material';

// Import chart components
import { LineChart, BarChart, RadarChart } from '../charts';

/**
 * ReferralAnalyticsDashboard Component
 * 
 * A comprehensive dashboard for visualizing referral patterns and performance
 * 
 * @param {Object} props - Component props
 * @param {Array} props.referrals - Referral data array
 * @param {Array} props.providers - Provider data array
 * @param {Array} props.specialties - Specialty data array
 * @param {boolean} props.loading - Loading state
 */
export default function ReferralAnalyticsDashboard({
  referrals = [],
  providers = [],
  specialties = [],
  loading = false
}) {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('month');
  const [referralTrend, setReferralTrend] = useState([]);
  const [referralByStatus, setReferralByStatus] = useState([]);
  const [referralBySpecialty, setReferralBySpecialty] = useState([]);
  const [referralByProvider, setReferralByProvider] = useState([]);
  const [completionTimeData, setCompletionTimeData] = useState([]);
  const [networkMetrics, setNetworkMetrics] = useState([]);
  
  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Generate referral analytics data when component mounts or time range changes
  useEffect(() => {
    generateReferralAnalytics(timeRange);
  }, [timeRange]);
  
  // Generate referral analytics data based on time range
  const generateReferralAnalytics = (range) => {
    // Generate referral trend data
    const trendData = [];
    const now = new Date();
    const dataPoints = range === 'week' ? 7 : range === 'month' ? 30 : 90;
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (dataPoints - i));
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent: Math.floor(Math.random() * 8) + 1,
        received: Math.floor(Math.random() * 5) + 1,
        completed: Math.floor(Math.random() * 6) + 1
      });
    }
    setReferralTrend(trendData);
    
    // Generate referral by status data
    setReferralByStatus([
      { name: 'Completed', value: Math.floor(Math.random() * 100) + 150 },
      { name: 'In Progress', value: Math.floor(Math.random() * 80) + 50 },
      { name: 'Pending', value: Math.floor(Math.random() * 60) + 30 },
      { name: 'Cancelled', value: Math.floor(Math.random() * 30) + 10 }
    ]);
    
    // Generate referral by specialty data
    const specialtyData = [];
    const specialtyNames = [
      'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 
      'Pediatrics', 'Oncology', 'Psychiatry', 'Radiology'
    ];
    
    for (const specialty of specialtyNames) {
      specialtyData.push({
        name: specialty,
        sent: Math.floor(Math.random() * 50) + 10,
        received: Math.floor(Math.random() * 40) + 5
      });
    }
    setReferralBySpecialty(specialtyData);
    
    // Generate referral by provider data
    const providerData = [];
    const providerNames = [
      'Dr. Sarah Johnson', 'Dr. Michael Chen', 'Dr. Lisa Rodriguez',
      'Dr. David Kim', 'Dr. Emily Wilson'
    ];
    
    for (const provider of providerNames) {
      providerData.push({
        name: provider,
        sent: Math.floor(Math.random() * 30) + 5,
        received: Math.floor(Math.random() * 25) + 3,
        completion: Math.floor(Math.random() * 40) + 60
      });
    }
    setReferralByProvider(providerData);
    
    // Generate completion time data
    const completionData = [];
    const specialtyList = [
      'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics'
    ];
    
    for (const specialty of specialtyList) {
      completionData.push({
        name: specialty,
        average: Math.floor(Math.random() * 10) + 5,
        min: Math.floor(Math.random() * 3) + 1,
        max: Math.floor(Math.random() * 15) + 10
      });
    }
    setCompletionTimeData(completionData);
    
    // Generate network metrics data
    setNetworkMetrics([
      {
        category: 'Network Size',
        value: Math.floor(Math.random() * 30) + 20,
        benchmark: Math.floor(Math.random() * 25) + 15
      },
      {
        category: 'Response Time',
        value: Math.floor(Math.random() * 5) + 1,
        benchmark: Math.floor(Math.random() * 7) + 3
      },
      {
        category: 'Completion Rate',
        value: Math.floor(Math.random() * 20) + 80,
        benchmark: Math.floor(Math.random() * 15) + 75
      },
      {
        category: 'Patient Satisfaction',
        value: Math.floor(Math.random() * 15) + 85,
        benchmark: Math.floor(Math.random() * 10) + 80
      },
      {
        category: 'Token Efficiency',
        value: Math.floor(Math.random() * 25) + 75,
        benchmark: Math.floor(Math.random() * 20) + 70
      }
    ]);
  };
  
  // Get trend indicator
  const getTrendIndicator = (current, previous) => {
    const percentChange = ((current - previous) / previous) * 100;
    
    if (percentChange > 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: theme.palette.success.main }}>
          <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">
            {percentChange.toFixed(1)}%
          </Typography>
        </Box>
      );
    } else if (percentChange < 0) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: theme.palette.error.main }}>
          <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2" component="span">
            {Math.abs(percentChange).toFixed(1)}%
          </Typography>
        </Box>
      );
    }
    
    return null;
  };
  
  // Referral summary card
  const ReferralSummaryCard = () => {
    // Calculate summary metrics
    const totalReferrals = referralByStatus.reduce((sum, item) => sum + item.value, 0);
    const completedReferrals = referralByStatus.find(item => item.name === 'Completed')?.value || 0;
    const completionRate = totalReferrals > 0 ? (completedReferrals / totalReferrals) * 100 : 0;
    
    return (
      <Card elevation={1} sx={{ height: '100%' }}>
        <CardHeader
          title="Referral Summary"
          subheader="Overview of referral activity"
          avatar={
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              <ShareIcon />
            </Avatar>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Total Referrals
              </Typography>
              <Typography variant="h4" component="div" gutterBottom>
                {totalReferrals}
              </Typography>
              {getTrendIndicator(totalReferrals, totalReferrals * 0.9)}
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Completion Rate
              </Typography>
              <Typography variant="h4" component="div" gutterBottom>
                {completionRate.toFixed(1)}%
              </Typography>
              {getTrendIndicator(completionRate, completionRate * 0.95)}
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Avg. Response Time
              </Typography>
              <Typography variant="h6" component="div">
                {Math.floor(Math.random() * 24) + 12} hrs
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                Avg. Completion Time
              </Typography>
              <Typography variant="h6" component="div">
                {Math.floor(Math.random() * 5) + 3} days
              </Typography>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" gutterBottom>
            Status Breakdown
          </Typography>
          
          <Box sx={{ mt: 1.5 }}>
            {referralByStatus.map((status) => (
              <Box key={status.name} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{status.name}</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {status.value} ({((status.value / totalReferrals) * 100).toFixed(1)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(status.value / totalReferrals) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: 
                        status.name === 'Completed' ? theme.palette.success.main :
                        status.name === 'In Progress' ? theme.palette.primary.main :
                        status.name === 'Pending' ? theme.palette.warning.main :
                        theme.palette.error.main,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  // Referral trend chart
  const ReferralTrendChart = () => (
    <LineChart
      title="Referral Activity Trend"
      subtitle={`Referral activity for the selected time period (${timeRange})`}
      data={referralTrend}
      lines={[
        { dataKey: 'sent', name: 'Sent', color: theme.palette.primary.main },
        { dataKey: 'received', name: 'Received', color: theme.palette.secondary.main },
        { dataKey: 'completed', name: 'Completed', color: theme.palette.success.main }
      ]}
      xAxisDataKey="date"
      height={350}
      showBrush={true}
    />
  );
  
  // Referral by specialty chart
  const ReferralBySpecialtyChart = () => (
    <BarChart
      title="Referrals by Specialty"
      subtitle="Sent vs received referrals by medical specialty"
      data={referralBySpecialty}
      bars={[
        { dataKey: 'sent', name: 'Sent', color: theme.palette.primary.main },
        { dataKey: 'received', name: 'Received', color: theme.palette.secondary.main }
      ]}
      xAxisDataKey="name"
      height={350}
      layout="vertical"
    />
  );
  
  // Completion time chart
  const CompletionTimeChart = () => (
    <BarChart
      title="Referral Completion Time"
      subtitle="Average days to complete by specialty"
      data={completionTimeData}
      bars={[
        { dataKey: 'average', name: 'Average Days', color: theme.palette.primary.main },
        { dataKey: 'min', name: 'Minimum', color: theme.palette.success.main },
        { dataKey: 'max', name: 'Maximum', color: theme.palette.error.main }
      ]}
      xAxisDataKey="name"
      height={350}
    />
  );
  
  // Network metrics chart
  const NetworkMetricsChart = () => (
    <RadarChart
      title="Network Performance Metrics"
      subtitle="Your metrics compared to network benchmark"
      data={networkMetrics}
      variables={[
        { dataKey: 'value', name: 'Your Practice', color: theme.palette.primary.main },
        { dataKey: 'benchmark', name: 'Network Benchmark', color: theme.palette.grey[500] }
      ]}
      categoryKey="category"
      height={350}
    />
  );
  
  // Top providers table
  const TopProvidersTable = () => (
    <Card elevation={1}>
      <CardHeader
        title="Top Referral Partners"
        subheader="Providers with highest referral activity"
        action={
          <Tooltip title="View all providers">
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <Divider />
      <TableContainer component={Box} sx={{ maxHeight: 350 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Provider</TableCell>
              <TableCell align="right">Sent</TableCell>
              <TableCell align="right">Received</TableCell>
              <TableCell align="right">Completion Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {referralByProvider.map((provider) => (
              <TableRow key={provider.name}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        mr: 1,
                        bgcolor: theme.palette.primary.light
                      }}
                    >
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    {provider.name}
                  </Box>
                </TableCell>
                <TableCell align="right">{provider.sent}</TableCell>
                <TableCell align="right">{provider.received}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Box sx={{ width: '60%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={provider.completion}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: theme.palette.grey[200],
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            backgroundColor: 
                              provider.completion >= 80 ? theme.palette.success.main :
                              provider.completion >= 60 ? theme.palette.primary.main :
                              theme.palette.warning.main,
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2">{provider.completion}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
  
  return (
    <Box sx={{ mt: 2 }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Referral Analytics Dashboard
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
            startAdornment={<CalendarIcon fontSize="small" sx={{ mr: 1, opacity: 0.7 }} />}
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={3}>
        {/* Referral Summary */}
        <Grid item xs={12} md={4}>
          <ReferralSummaryCard />
        </Grid>
        
        {/* Referral Trend */}
        <Grid item xs={12} md={8}>
          <ReferralTrendChart />
        </Grid>
        
        {/* Referral by Specialty */}
        <Grid item xs={12} md={6}>
          <ReferralBySpecialtyChart />
        </Grid>
        
        {/* Completion Time */}
        <Grid item xs={12} md={6}>
          <CompletionTimeChart />
        </Grid>
        
        {/* Network Metrics */}
        <Grid item xs={12} md={6}>
          <NetworkMetricsChart />
        </Grid>
        
        {/* Top Providers */}
        <Grid item xs={12} md={6}>
          <TopProvidersTable />
        </Grid>
      </Grid>
    </Box>
  );
}
