import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ModernLoadingIndicator } from '../../components/common'; 
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

// Import components
import AnalyticsOverview from './components/AnalyticsOverview';
import AnalyticsResults from './components/AnalyticsResults';
import AnalyticsInsights from './components/AnalyticsInsights';
import AnalyticsDataSources from './components/AnalyticsDataSources';
import ShareAnalyticsDialog from './components/ShareAnalyticsDialog';

// Import analytics dashboards
import { PatientRiskDashboard, TokenAnalyticsDashboard, ReferralAnalyticsDashboard } from '../../components/analytics';

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AnalyticsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('month');
  
  // Sample data for visualizations
  const [patientData, setPatientData] = useState(null);
  const [riskFactors, setRiskFactors] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [tokenData, setTokenData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // Handle time range change
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch analytics details
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate sample data for visualizations based on analytics type
        generateSampleData();
        
        // Simulate analytics data
        const mockAnalytics = {
          id,
          name: 'Patient Risk Analysis',
          type: 'patientRisk',
          description: 'Analysis of high-risk patients based on medical history and recent visits',
          creator: {
            id: 'user-1',
            name: 'Dr. Sarah Johnson',
            organization: 'City Medical Center'
          },
          status: 'completed',
          createdAt: new Date(2023, 6, 15).toISOString(),
          completedAt: new Date(2023, 6, 15).toISOString(),
          confidenceScore: 0.87,
          modelVersion: '1.0.0',
          parameters: {
            riskThreshold: 70,
            includeFactors: true,
            conditionFocus: 'all'
          },
          dataUsed: [
            {
              source: 'Patient Records',
              type: 'patient',
              recordCount: 250,
              dateRange: {
                start: new Date(2023, 0, 1).toISOString(),
                end: new Date(2023, 5, 30).toISOString()
              },
              anonymized: true
            },
            {
              source: 'Appointment Data',
              type: 'appointment',
              recordCount: 1250,
              dateRange: {
                start: new Date(2023, 0, 1).toISOString(),
                end: new Date(2023, 5, 30).toISOString()
              },
              anonymized: true
            },
            {
              source: 'Medication Records',
              type: 'medication',
              recordCount: 780,
              dateRange: {
                start: new Date(2023, 0, 1).toISOString(),
                end: new Date(2023, 5, 30).toISOString()
              },
              anonymized: true
            }
          ],
          results: {
            summary: 'Analysis of patient risk factors shows several high-risk patients requiring immediate attention.',
            data: {
              highRiskCount: 12,
              mediumRiskCount: 45,
              lowRiskCount: 143,
              riskFactors: [
                { factor: 'Age > 65', weight: 0.25 },
                { factor: 'Diabetes', weight: 0.35 },
                { factor: 'Hypertension', weight: 0.3 },
                { factor: 'Smoking', weight: 0.2 },
                { factor: 'Obesity', weight: 0.15 }
              ]
            },
            visualizations: [
              {
                type: 'pieChart',
                title: 'Patient Risk Distribution',
                description: 'Distribution of patients by risk category',
                config: {
                  labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                  data: [12, 45, 143],
                  colors: ['#ff6384', '#ffcd56', '#4bc0c0']
                }
              },
              {
                type: 'barChart',
                title: 'Risk Factors Prevalence',
                description: 'Prevalence of risk factors in patient population',
                config: {
                  labels: ['Age > 65', 'Diabetes', 'Hypertension', 'Smoking', 'Obesity'],
                  data: [0.35, 0.28, 0.42, 0.18, 0.25]
                }
              }
            ]
          },
          insights: [
            {
              title: 'High-Risk Patients Requiring Attention',
              description: 'Several patients have been flagged as high risk due to multiple chronic conditions and medication non-adherence.',
              severity: 'high',
              actionable: true,
              recommendations: [
                'Schedule follow-up appointments for high-risk patients',
                'Review medication adherence strategies',
                'Consider care coordination services'
              ]
            },
            {
              title: 'Preventive Care Opportunity',
              description: 'Medium-risk patients would benefit from preventive care interventions to avoid progression to high risk.',
              severity: 'medium',
              actionable: true,
              recommendations: [
                'Implement preventive care reminders',
                'Conduct health education sessions',
                'Monitor risk factors regularly'
              ]
            },
            {
              title: 'Diabetes Management Focus',
              description: 'Diabetes is the most prevalent risk factor among high-risk patients.',
              severity: 'medium',
              actionable: true,
              recommendations: [
                'Review diabetes management protocols',
                'Ensure regular A1C testing',
                'Consider diabetes education program'
              ]
            }
          ],
          tokenReward: {
            amount: 15,
            transactionId: 'tx_a1b2c3d4e5f6',
            status: 'processed'
          },
          sharedWith: [
            {
              user: {
                id: 'user-2',
                name: 'Dr. Robert Chen',
                organization: 'City Medical Center'
              },
              sharedAt: new Date(2023, 6, 16).toISOString(),
              accessLevel: 'view'
            }
          ],
          blockchainReference: {
            transactionId: 'tx_g7h8i9j0k1l2',
            timestamp: new Date(2023, 6, 15).toISOString(),
            hash: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t'
          }
        };
        
        setAnalytics(mockAnalytics);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleShareDialogOpen = () => {
    setShareDialogOpen(true);
  };

  const handleShareDialogClose = () => {
    setShareDialogOpen(false);
  };

  const handleShareAnalytics = async (userId, accessLevel) => {
    try {
      // In a real app, this would call an API to share the analytics
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the analytics object with the new shared user
      const newSharedUser = {
        user: {
          id: userId,
          name: 'Dr. New User', // In a real app, we would get the user's name from the API
          organization: 'Partner Hospital' // In a real app, we would get the user's organization from the API
        },
        sharedAt: new Date().toISOString(),
        accessLevel
      };
      
      setAnalytics(prev => ({
        ...prev,
        sharedWith: [...prev.sharedWith, newSharedUser]
      }));
      
      handleShareDialogClose();
    } catch (err) {
      console.error('Error sharing analytics:', err);
      // Handle error
    }
  };

  // Get status chip for analytics
  const getStatusChip = (status) => {
    switch (status) {
      case 'pending':
        return <Chip icon={<ScheduleIcon />} label="Pending" color="default" />;
      case 'processing':
        return <Chip icon={<ScheduleIcon />} label="Processing" color="primary" />;
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Completed" color="success" />;
      case 'failed':
        return <Chip icon={<WarningIcon />} label="Failed" color="error" />;
      default:
        return <Chip label={status} />;
    }
  };

  // Generate sample data for visualizations
  const generateSampleData = () => {
    // Generate patient data
    setPatientData({
      id: 'P-' + Math.floor(Math.random() * 10000),
      name: 'John Doe',
      age: 65,
      gender: 'Male',
      avatar: null
    });
    
    // Generate risk factors
    const factors = [
      { id: 'RF1', name: 'Hypertension', category: 'Clinical', impact: 8, previousImpact: 7 },
      { id: 'RF2', name: 'Diabetes Type 2', category: 'Clinical', impact: 7, previousImpact: 7 },
      { id: 'RF3', name: 'Smoking', category: 'Behavioral', impact: 9, previousImpact: 9 },
      { id: 'RF4', name: 'Obesity', category: 'Clinical', impact: 6, previousImpact: 5 },
      { id: 'RF5', name: 'Missed Appointments', category: 'Behavioral', impact: 5, previousImpact: 6 },
      { id: 'RF6', name: 'Medication Non-compliance', category: 'Behavioral', impact: 7, previousImpact: 8 },
      { id: 'RF7', name: 'Family History', category: 'Social', impact: 4, previousImpact: 4 }
    ];
    setRiskFactors(factors);
    
    // Generate medical history
    const history = [
      { id: 'MH1', type: 'diagnosis', description: 'Diagnosed with Hypertension', date: '2022-05-15', notes: 'BP 160/95' },
      { id: 'MH2', type: 'medication', description: 'Started Lisinopril 10mg', date: '2022-05-20', notes: 'Once daily' },
      { id: 'MH3', type: 'visit', description: 'Follow-up appointment', date: '2022-06-10', notes: 'BP improved to 145/85' },
      { id: 'MH4', type: 'lab', description: 'Comprehensive Metabolic Panel', date: '2022-06-10', notes: 'Within normal limits' },
      { id: 'MH5', type: 'diagnosis', description: 'Diagnosed with Type 2 Diabetes', date: '2022-07-22', notes: 'HbA1c 7.8%' },
      { id: 'MH6', type: 'medication', description: 'Started Metformin 500mg', date: '2022-07-25', notes: 'Twice daily with meals' }
    ];
    setMedicalHistory(history);
    
    // Generate token data
    setTokenData({
      balance: Math.floor(Math.random() * 1000) + 500,
      earned: Math.floor(Math.random() * 2000) + 1000,
      spent: Math.floor(Math.random() * 1000) + 200
    });
    
    // Generate transactions
    const trans = [
      { id: 'T1', type: 'earned', description: 'Data sharing reward', amount: 25, date: '2023-07-15', entity: 'Research Network' },
      { id: 'T2', type: 'earned', description: 'Referral completion', amount: 15, date: '2023-07-10', entity: 'Dr. Smith' },
      { id: 'T3', type: 'spent', description: 'Premium analytics access', amount: 50, date: '2023-07-05', entity: 'Analytics Platform' },
      { id: 'T4', type: 'transfer_in', description: 'Network distribution', amount: 100, date: '2023-06-30', entity: 'Healthcare Network' },
      { id: 'T5', type: 'transfer_out', description: 'Sent to colleague', amount: 30, date: '2023-06-25', entity: 'Dr. Johnson' }
    ];
    setTransactions(trans);
    
    // Generate referrals
    const refs = [
      { id: 'R1', patientName: 'John Doe', specialty: 'Cardiology', status: 'Completed', date: '2023-07-01' },
      { id: 'R2', patientName: 'Jane Smith', specialty: 'Neurology', status: 'In Progress', date: '2023-07-10' },
      { id: 'R3', patientName: 'Robert Johnson', specialty: 'Orthopedics', status: 'Completed', date: '2023-06-15' },
      { id: 'R4', patientName: 'Mary Williams', specialty: 'Dermatology', status: 'Pending', date: '2023-07-18' },
      { id: 'R5', patientName: 'Michael Brown', specialty: 'Cardiology', status: 'Completed', date: '2023-06-22' }
    ];
    setReferrals(refs);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
         <ModernLoadingIndicator message="Loading alerts..." />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/app/analytics')}
        >
          Back to Analytics
        </Button>
      </Container>
    );
  }

  if (!analytics) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Analytics report not found</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/app/analytics')}
        >
          Back to Analytics
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Analytics Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/analytics')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Analytics Report
        </Typography>
      </Box>
      
      {/* Analytics Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5">
              {analytics.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography variant="body1" sx={{ mr: 2 }}>
                Status: {getStatusChip(analytics.status)}
              </Typography>
              <Typography variant="body1">
                Confidence: {(analytics.confidenceScore * 100).toFixed(0)}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {analytics.description}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Box>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShareDialogOpen}
                sx={{ mr: 1 }}
              >
                Share
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Download
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Created By
            </Typography>
            <Typography variant="body1">
              {analytics.creator.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {analytics.creator.organization}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Created Date
            </Typography>
            <Typography variant="body1">
              {formatDate(analytics.createdAt)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Completed Date
            </Typography>
            <Typography variant="body1">
              {formatDate(analytics.completedAt)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Model Version
            </Typography>
            <Typography variant="body1">
              {analytics.modelVersion}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Tokens Earned
            </Typography>
            <Typography variant="body1">
              {analytics.tokenReward ? analytics.tokenReward.amount : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Blockchain Transaction
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {analytics.blockchainReference ? analytics.blockchainReference.transactionId : 'N/A'}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Analytics Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
            <Tab label="Overview" id="analytics-tab-0" aria-controls="analytics-tabpanel-0" />
            <Tab label="Results" id="analytics-tab-1" aria-controls="analytics-tabpanel-1" />
            <Tab label="Insights" id="analytics-tab-2" aria-controls="analytics-tabpanel-2" />
            <Tab label="Data Sources" id="analytics-tab-3" aria-controls="analytics-tabpanel-3" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl size="small" sx={{ width: 150 }}>
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
          
          {analytics.type === 'patientRisk' && (
            <PatientRiskDashboard 
              patient={patientData}
              riskFactors={riskFactors}
              medicalHistory={medicalHistory}
              loading={false}
            />
          )}
          
          {analytics.type !== 'patientRisk' && (
            <AnalyticsOverview analytics={analytics} />
          )}
        </TabPanel>
        
        {/* Results Tab */}
        <TabPanel value={tabValue} index={1}>
          {analytics.type === 'financialMetrics' ? (
            <TokenAnalyticsDashboard
              tokenData={tokenData}
              transactions={transactions}
              loading={false}
            />
          ) : analytics.type === 'operationalEfficiency' ? (
            <ReferralAnalyticsDashboard
              referrals={referrals}
              loading={false}
            />
          ) : (
            <AnalyticsResults results={analytics.results} />
          )}
        </TabPanel>
        
        {/* Insights Tab */}
        <TabPanel value={tabValue} index={2}>
          <AnalyticsInsights insights={analytics.insights} />
        </TabPanel>
        
        {/* Data Sources Tab */}
        <TabPanel value={tabValue} index={3}>
          <AnalyticsDataSources dataSources={analytics.dataUsed} />
        </TabPanel>
      </Paper>
      
      {/* Share Dialog */}
      <ShareAnalyticsDialog
        open={shareDialogOpen}
        onClose={handleShareDialogClose}
        onShare={handleShareAnalytics}
        sharedWith={analytics.sharedWith}
      />
    </Container>
  );
}
