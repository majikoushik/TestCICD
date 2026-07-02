import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Tabs,
  Tab,
  Chip,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import EllipsisCell from '../../components/common/EllipsisCell';
import EllipsisHeaderCell from '../../components/common/EllipsisHeaderCell';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as AttachMoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Insights as InsightsIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

// Import our chart components
import { LineChart, BarChart, PieChart, RadarChart } from '../../components/charts';

// Import enhanced analytics components
import { 
  PredictiveAlerts, 
  NaturalLanguageSummary, 
  ProviderBenchmarking 
} from '../../components/analytics';

// Import analytics service
import { analyticsService } from '../../services';

// Import ModernLoadingIndicator
import { ModernLoadingIndicator } from '../../components/common';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [analyticsReports, setAnalyticsReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSnackbar, setActionSnackbar] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  
  // Chart data states
  const [patientRiskData, setPatientRiskData] = useState([]);
  const [referralData, setReferralData] = useState([]);
  const [tokenActivityData, setTokenActivityData] = useState([]);
  const [diagnosisDistributionData, setDiagnosisDistributionData] = useState([]);
  const [patientMetricsData, setPatientMetricsData] = useState([]);
  
  // Enhanced analytics states
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [, setAlertsError] = useState(null);

  const [nlSummary, setNlSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [, setSummaryError] = useState(null);

  const [benchmarkingData, setBenchmarkingData] = useState([]);
  const [benchmarkingLoading, setBenchmarkingLoading] = useState(true);
  const [, setBenchmarkingError] = useState(null);
  
  // Alert details dialog state
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertDetailsOpen, setAlertDetailsOpen] = useState(false);

  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Generate chart data based on time range
        generateChartData(timeRange);
        
        // Fetch analytics reports
        const reports = await analyticsService.getAnalyticsReports();
        setAnalyticsReports(reports.reports || []);
        setFilteredReports(reports.reports || []);
        
        // Simulate insights (this would be a real API call in production)
        const mockInsights = [
          {
            id: 'insight-1',
            title: 'Increasing trend in respiratory conditions',
            description: 'There has been a 23% increase in respiratory-related visits over the past two weeks.',
            severity: 'medium',
            category: 'diagnosis',
            createdAt: new Date(2023, 6, 15).toISOString()
          },
          {
            id: 'insight-2',
            title: 'High readmission rate for cardiac patients',
            description: 'Cardiac patients have a 15% higher readmission rate than the clinic average.',
            severity: 'high',
            category: 'readmission',
            createdAt: new Date(2023, 6, 14).toISOString()
          },
          {
            id: 'insight-3',
            title: 'Token rewards improving patient engagement',
            description: 'Patients receiving token rewards show 27% higher engagement with preventive care.',
            severity: 'low',
            category: 'engagement',
            createdAt: new Date(2023, 6, 12).toISOString()
          },
          {
            id: 'insight-4',
            title: 'Referral completion time improved',
            description: 'Average referral completion time has decreased by 18% this month.',
            severity: 'low',
            category: 'referral',
            createdAt: new Date(2023, 6, 10).toISOString()
          },
          {
            id: 'insight-5',
            title: 'Potential medication interaction risk',
            description: 'AI has identified potential medication interaction risks for 12 patients.',
            severity: 'high',
            category: 'medication',
            createdAt: new Date(2023, 6, 16).toISOString()
          }
        ];
        
        setInsights(mockInsights);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);
  
  // Fetch predictive alerts
  useEffect(() => {
    const fetchPredictiveAlerts = async () => {
      try {
        setAlertsLoading(true);
        const alerts = await analyticsService.getPredictiveAlerts({ timeframe: timeRange });
        setPredictiveAlerts(alerts || []);
        setAlertsLoading(false);
      } catch (err) {
        console.error('Error fetching predictive alerts:', err);
        setAlertsError('Failed to load predictive alerts');
        setAlertsLoading(false);
      }
    };
    
    fetchPredictiveAlerts();
  }, [timeRange]);
  
  // Fetch natural language summary
  useEffect(() => {
    const fetchNaturalLanguageSummary = async () => {
      try {
        setSummaryLoading(true);
        const response = await analyticsService.getNaturalLanguageSummary({ timeframe: timeRange });
        setNlSummary(response.summary || null);
        setSummaryLoading(false);
      } catch (err) {
        console.error('Error fetching natural language summary:', err);
        setSummaryError('Failed to load analytics summary');
        setSummaryLoading(false);
      }
    };
    
    fetchNaturalLanguageSummary();
  }, [timeRange]);
  
  // Fetch provider benchmarking data
  useEffect(() => {
    const fetchProviderBenchmarking = async () => {
      try {
        setBenchmarkingLoading(true);
        const data = await analyticsService.getProviderBenchmarking({ timeframe: timeRange });
        setBenchmarkingData(data || []);
        setBenchmarkingLoading(false);
      } catch (err) {
        console.error('Error fetching provider benchmarking data:', err);
        setBenchmarkingError('Failed to load benchmarking data');
        setBenchmarkingLoading(false);
      }
    };
    
    fetchProviderBenchmarking();
  }, [timeRange]);

  useEffect(() => {
    // Filter reports based on tab selection
    if (tabValue === 0) {
      // All reports
      setFilteredReports(analyticsReports);
    } else if (tabValue === 1) {
      // Completed reports
      setFilteredReports(analyticsReports.filter(report => report.status === 'completed'));
    } else if (tabValue === 2) {
      // In progress reports
      setFilteredReports(analyticsReports.filter(report => ['pending', 'processing'].includes(report.status)));
    }
  }, [tabValue, analyticsReports]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreateAnalytics = () => {
    navigate('/app/analytics/create');
  };

  const handleViewReport = (reportId) => {
    navigate(`/app/analytics/reports/${reportId}`);
  };
  
  // Handle viewing alert details
  const handleViewAlertDetails = (alert) => {
    setSelectedAlert(alert);
    setAlertDetailsOpen(true);
  };
  
  // Handle closing alert details dialog
  const handleCloseAlertDetails = () => {
    setAlertDetailsOpen(false);
    setSelectedAlert(null);
  };

  // Get status chip for analytics reports
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip size="small" icon={<ScheduleIcon />} label="Pending" color="default" />;
      case 'processing':
        return <Chip size="small" icon={<ScheduleIcon />} label="Processing" color="primary" />;
      case 'completed':
        return <Chip size="small" icon={<CheckCircleIcon />} label="Completed" color="success" />;
      case 'failed':
        return <Chip size="small" icon={<WarningIcon />} label="Failed" color="error" />;
      default:
        return <Chip size="small" label={status} />;
    }
  };

  // Get severity chip for insights
  const getSeverityChip = (severity) => {
    switch (severity) {
      case 'high':
        return <Chip size="small" label="High Priority" color="error" />;
      case 'medium':
        return <Chip size="small" label="Medium Priority" color="warning" />;
      case 'low':
        return <Chip size="small" label="Low Priority" color="success" />;
      default:
        return <Chip size="small" label={severity} />;
    }
  };

  // Get icon for analytics type
  const getAnalyticsTypeIcon = (type) => {
    switch (type) {
      case 'patientRisk':
        return <PersonIcon />;
      case 'operationalEfficiency':
        return <BusinessIcon />;
      case 'patientOutcomes':
        return <TrendingUpIcon />;
      case 'financialMetrics':
        return <AttachMoneyIcon />;
      default:
        return <InsightsIcon />;
    }
  };

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
  
  // Generate chart data based on time range
  const generateChartData = (range) => {
    // Patient risk trend data
    const riskData = [];
    const now = new Date();
    const dataPoints = range === 'week' ? 7 : range === 'month' ? 30 : 90;
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (dataPoints - i));
      
      riskData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        highRisk: Math.floor(Math.random() * 10) + 5,
        mediumRisk: Math.floor(Math.random() * 15) + 10,
        lowRisk: Math.floor(Math.random() * 25) + 20,
      });
    }
    setPatientRiskData(riskData);
    
    // Referral data
    const referralStats = [
      { name: 'Cardiology', completed: Math.floor(Math.random() * 50) + 30, pending: Math.floor(Math.random() * 20) + 5 },
      { name: 'Neurology', completed: Math.floor(Math.random() * 40) + 20, pending: Math.floor(Math.random() * 15) + 5 },
      { name: 'Orthopedics', completed: Math.floor(Math.random() * 35) + 25, pending: Math.floor(Math.random() * 10) + 5 },
      { name: 'Dermatology', completed: Math.floor(Math.random() * 30) + 15, pending: Math.floor(Math.random() * 10) + 3 },
      { name: 'Pediatrics', completed: Math.floor(Math.random() * 25) + 20, pending: Math.floor(Math.random() * 8) + 2 },
    ];
    setReferralData(referralStats);
    
    // Token activity data
    const tokenData = [];
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - (dataPoints - i));
      
      tokenData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earned: Math.floor(Math.random() * 8) + 1,
        spent: Math.floor(Math.random() * 5),
      });
    }
    setTokenActivityData(tokenData);
    
    // Diagnosis distribution data
    const diagnosisData = [
      { name: 'Hypertension', value: Math.floor(Math.random() * 100) + 150 },
      { name: 'Diabetes', value: Math.floor(Math.random() * 80) + 120 },
      { name: 'Asthma', value: Math.floor(Math.random() * 60) + 80 },
      { name: 'Arthritis', value: Math.floor(Math.random() * 50) + 70 },
      { name: 'Depression', value: Math.floor(Math.random() * 40) + 60 },
      { name: 'Other', value: Math.floor(Math.random() * 100) + 100 },
    ];
    setDiagnosisDistributionData(diagnosisData);
    
    // Patient metrics data
    const metricsData = [
      {
        category: 'Engagement',
        current: Math.floor(Math.random() * 30) + 70,
        previous: Math.floor(Math.random() * 30) + 60,
        benchmark: 75
      },
      {
        category: 'Compliance',
        current: Math.floor(Math.random() * 25) + 65,
        previous: Math.floor(Math.random() * 25) + 60,
        benchmark: 80
      },
      {
        category: 'Follow-up',
        current: Math.floor(Math.random() * 20) + 75,
        previous: Math.floor(Math.random() * 20) + 70,
        benchmark: 85
      },
      {
        category: 'Satisfaction',
        current: Math.floor(Math.random() * 15) + 80,
        previous: Math.floor(Math.random() * 15) + 75,
        benchmark: 90
      },
      {
        category: 'Outcomes',
        current: Math.floor(Math.random() * 25) + 70,
        previous: Math.floor(Math.random() * 25) + 65,
        benchmark: 80
      },
    ];
    setPatientMetricsData(metricsData);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="pulse" message="Loading analytics dashboard..." />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View AI-powered insights and analytics reports for your practice
          </Typography>
        </Grid>
        <Grid item>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
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
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAnalytics}
            >
              New Analysis
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Data Visualization Charts */}
      {!loading && !error && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Patient Risk Trend */}
          <Grid item xs={12} lg={8}>
            <LineChart
              title="Patient Risk Trend"
              subtitle="Distribution of patient risk levels over time"
              data={patientRiskData}
              lines={[
                { dataKey: 'highRisk', name: 'High Risk', color: '#f44336' },
                { dataKey: 'mediumRisk', name: 'Medium Risk', color: '#ff9800' },
                { dataKey: 'lowRisk', name: 'Low Risk', color: '#4caf50' }
              ]}
              xAxisDataKey="date"
              height={350}
              showBrush={true}
            />
          </Grid>
          
          {/* Diagnosis Distribution */}
          <Grid item xs={12} lg={4}>
            <PieChart
              title="Diagnosis Distribution"
              subtitle="Most common diagnoses in your practice"
              data={diagnosisDistributionData}
              dataKey="value"
              nameKey="name"
              height={350}
              donut={true}
            />
          </Grid>
          
          {/* Referral Statistics */}
          <Grid item xs={12} md={6}>
            <BarChart
              title="Referral Statistics by Specialty"
              subtitle="Completed vs pending referrals"
              data={referralData}
              bars={[
                { dataKey: 'completed', name: 'Completed', color: '#4caf50' },
                { dataKey: 'pending', name: 'Pending', color: '#ff9800' }
              ]}
              xAxisDataKey="name"
              height={350}
              layout="vertical"
              stacked={false}
            />
          </Grid>
          
          {/* Token Activity */}
          <Grid item xs={12} md={6}>
            <LineChart
              title="Token Activity"
              subtitle="Tokens earned and spent over time"
              data={tokenActivityData}
              lines={[
                { dataKey: 'earned', name: 'Earned', color: '#4caf50' },
                { dataKey: 'spent', name: 'Spent', color: '#f44336' }
              ]}
              xAxisDataKey="date"
              height={350}
            />
          </Grid>
          
          {/* Patient Metrics */}
          <Grid item xs={12}>
            <RadarChart
              title="Patient Care Metrics"
              subtitle="Current period vs previous period and benchmark"
              data={patientMetricsData}
              variables={[
                { dataKey: 'current', name: 'Current Period', color: '#2196f3' },
                { dataKey: 'previous', name: 'Previous Period', color: '#9e9e9e' },
                { dataKey: 'benchmark', name: 'Benchmark', color: '#4caf50' }
              ]}
              categoryKey="category"
              height={400}
            />
          </Grid>
        </Grid>
      )}
      
      {/* Enhanced Analytics Section */}
      <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>
        AI-Powered Analytics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Natural Language Summary */}
        <Grid item xs={12}>
          <NaturalLanguageSummary 
            summary={nlSummary} 
            loading={summaryLoading} 
            timeframe={timeRange === 'week' ? 'This Week' : timeRange === 'month' ? 'This Month' : timeRange === 'quarter' ? 'This Quarter' : 'This Year'} 
          />
        </Grid>
        
        {/* Predictive Alerts */}
        <Grid item xs={12} md={6}>
          <PredictiveAlerts 
            alerts={predictiveAlerts} 
            loading={alertsLoading} 
            onViewDetails={handleViewAlertDetails} 
          />
        </Grid>
        
        {/* Provider Benchmarking */}
        <Grid item xs={12} md={6}>
          <ProviderBenchmarking 
            metrics={benchmarkingData} 
            loading={benchmarkingLoading} 
          />
        </Grid>
      </Grid>
      
      {/* Key Insights Section */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Key Insights
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {insights.length > 0 ? (
          insights.map((insight) => (
            <Grid item xs={12} md={6} key={insight.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="card-hover">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ mr: 2 }}>
                      {getAnalyticsTypeIcon(insight.source)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div">
                        {insight.title}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        {getSeverityChip(insight.severity)}
                      </Box>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Source: {insight.source}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {insight.description}
                  </Typography>
                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Recommendations:
                      </Typography>
                      <List dense disablePadding>
                        {insight.recommendations.map((rec, index) => (
                          <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <InsightsIcon fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={rec} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
                <Box sx={{ flexGrow: 1 }} />
                <Divider />
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => handleViewReport(insight.sourceId)}
                  >
                    View Full Report
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">
              No insights available yet. Run some analytics to generate insights.
            </Alert>
          </Grid>
        )}
      </Grid>
      
      {/* Analytics Reports Section */}
      <Paper sx={{ mb: 3, mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
            <Tab label="All Reports" id="analytics-tab-0" aria-controls="analytics-tabpanel-0" />
            <Tab label="Completed" id="analytics-tab-1" aria-controls="analytics-tabpanel-1" />
            <Tab label="In Progress" id="analytics-tab-2" aria-controls="analytics-tabpanel-2" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <AnalyticsReportsList 
            reports={filteredReports} 
            handleViewReport={handleViewReport} 
            getStatusChip={getStatusChip}
            getAnalyticsTypeIcon={getAnalyticsTypeIcon}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <AnalyticsReportsList 
            reports={filteredReports} 
            handleViewReport={handleViewReport} 
            getStatusChip={getStatusChip}
            getAnalyticsTypeIcon={getAnalyticsTypeIcon}
            formatDate={formatDate}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <AnalyticsReportsList 
            reports={filteredReports} 
            handleViewReport={handleViewReport} 
            getStatusChip={getStatusChip}
            getAnalyticsTypeIcon={getAnalyticsTypeIcon}
            formatDate={formatDate}
          />
        </TabPanel>
      </Paper>
      
      {/* Alert Details Dialog */}
      <Dialog
        open={alertDetailsOpen}
        onClose={handleCloseAlertDetails}
        maxWidth="md"
        fullWidth
      >
        {selectedAlert && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  {selectedAlert.title}
                </Typography>
                <Chip 
                  label={selectedAlert.severity} 
                  color={selectedAlert.severity === 'High' ? 'error' : selectedAlert.severity === 'Medium' ? 'warning' : 'info'} 
                  size="small" 
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {selectedAlert.timeframe}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedAlert.description}
              </Typography>
              
              {selectedAlert.patients && selectedAlert.patients.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Affected Patients
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ ...tableContainerSx, mt: 2 }}>
                    <Table size="small" sx={tableSx}>
                      <TableHead>
                        <TableRow sx={tableHeadRowSx}>
                          <EllipsisHeaderCell label="Patient ID" sx={{ width: '25%' }} />
                          <EllipsisHeaderCell label="Name" sx={{ width: '35%' }} />
                          <EllipsisHeaderCell label="Risk Score" sx={{ width: '20%' }} />
                          <EllipsisHeaderCell label="Last Visit" sx={{ width: '20%' }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedAlert.patients.map((patient) => (
                          <TableRow key={patient.id} hover sx={tableBodyRowSx}>
                            <TableCell sx={{ width: '25%' }}><EllipsisCell value={patient.id} /></TableCell>
                            <TableCell sx={{ width: '35%' }}><EllipsisCell value={patient.name} /></TableCell>
                            <TableCell sx={{ width: '20%' }}>
                              <Chip
                                label={`${(patient.risk * 100).toFixed(0)}%`}
                                color={patient.risk > 0.8 ? 'error' : patient.risk > 0.6 ? 'warning' : 'info'}
                                size="small"
                                sx={compactChipSx}
                              />
                            </TableCell>
                            <TableCell sx={{ width: '20%' }}>{new Date(patient.lastVisit).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
              
              {selectedAlert.data && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Trend Data
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Current
                        </Typography>
                        <Typography variant="h4">
                          {selectedAlert.data.current}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Previous
                        </Typography>
                        <Typography variant="h4">
                          {selectedAlert.data.previous}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: selectedAlert.data.percentageChange > 0 ? '#e8f5e9' : '#ffebee' }}>
                        <Typography variant="body2" color="text.secondary">
                          Change
                        </Typography>
                        <Typography variant="h4" color={selectedAlert.data.percentageChange > 0 ? 'success.main' : 'error.main'}>
                          {selectedAlert.data.percentageChange > 0 ? '+' : ''}{selectedAlert.data.percentageChange}%
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseAlertDetails}>Close</Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  const reportId = selectedAlert.sourceId;
                  handleCloseAlertDetails();
                  if (reportId) {
                    handleViewReport(reportId);
                  } else {
                    setActionSnackbar('This alert has no linked analytics report to open.');
                  }
                }}
              >
                Take Action
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={Boolean(actionSnackbar)}
        autoHideDuration={4000}
        onClose={() => setActionSnackbar('')}
        message={actionSnackbar}
      />
    </Container>
  );
}

// Separate component for the analytics reports list
function AnalyticsReportsList({ 
  reports, 
  handleViewReport, 
  getStatusChip, 
  getAnalyticsTypeIcon,
  formatDate
}) {
  if (reports.length === 0) {
    return (
      <Alert severity="info">
        No reports found in this category.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {reports.map((report) => (
        <Grid item xs={12} md={6} key={report.id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="card-hover">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2 }}>
                  {getAnalyticsTypeIcon(report.type)}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div">
                    {report.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    {getStatusChip(report.status)}
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      Created: {formatDate(report.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {report.description}
              </Typography>
              {report.status === 'completed' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2">
                    Confidence Score: {(report.confidenceScore * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2">
                    Tokens Earned: {report.tokenReward}
                  </Typography>
                </Box>
              )}
            </CardContent>
            <Box sx={{ flexGrow: 1 }} />
            <Divider />
            <CardActions>
              <Button 
                size="small" 
                onClick={() => handleViewReport(report.id)}
                disabled={report.status === 'pending'}
              >
                View Report
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
