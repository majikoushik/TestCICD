import React, { useState, useEffect } from 'react';
import ScheduleReportDialog from '../../components/admin/ScheduleReportDialog';
import {
  Container, Grid, Typography, Box, Paper, Card, CardContent, CardHeader,
  Button, IconButton, Menu, MenuItem, Tabs, Tab, Divider, TextField,
  FormControl, InputLabel, Select, Chip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import { 
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  BiotechOutlined as AIIcon,
  Storage as BlockchainIcon,
  Notifications as NotificationsIcon,
  FileDownload as DownloadIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { adminAnalyticsService } from '../../services';
import generatePDF from '../../utils/pdfExport';

const AdminDashboard = () => {
  // State for analytics data
  const [providerPerformance, setProviderPerformance] = useState([]);
  const [referralConversion, setReferralConversion] = useState([]);
  const [tokenEconomy, setTokenEconomy] = useState([]);
  const [aiAnalytics, setAIAnalytics] = useState(null);
  const [scheduledReports, setScheduledReports] = useState([]);
  
  // Period selection state
  const [tokenPeriod, setTokenPeriod] = useState('last6months');
  const [aiPeriod, setAIPeriod] = useState('last6months');
  
  // Schedule report dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Loading and error states
  const [loading, setLoading] = useState({
    providers: true,
    referrals: true,
    tokens: true,
    ai: true,
    reports: true
  });
  const [error, setError] = useState({
    providers: null,
    referrals: null,
    tokens: null,
    ai: null,
    reports: null
  });
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Fetch provider performance data
  const fetchProviderPerformance = async () => {
    setLoading(prev => ({ ...prev, providers: true }));
    try {
      const response = await adminAnalyticsService.getProviderPerformance();
      if (response.success) {
        setProviderPerformance(response.data);
        setError(prev => ({ ...prev, providers: null }));
      } else {
        setError(prev => ({ ...prev, providers: response.error || 'Failed to fetch provider data' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, providers: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, providers: false }));
    }
  };
  
  // Fetch referral conversion data
  const fetchReferralConversion = async () => {
    setLoading(prev => ({ ...prev, referrals: true }));
    try {
      const response = await adminAnalyticsService.getReferralConversionRates();
      if (response.success) {
        setReferralConversion(response.data);
        setError(prev => ({ ...prev, referrals: null }));
      } else {
        setError(prev => ({ ...prev, referrals: response.error || 'Failed to fetch referral data' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, referrals: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, referrals: false }));
    }
  };
  
  // Fetch token economy data
  const fetchTokenEconomy = async (period = tokenPeriod) => {
    setLoading(prev => ({ ...prev, tokens: true }));
    try {
      const response = await adminAnalyticsService.getTokenEconomyTrends(period);
      if (response.success) {
        setTokenEconomy(response.data);
        setError(prev => ({ ...prev, tokens: null }));
      } else {
        setError(prev => ({ ...prev, tokens: response.error || 'Failed to fetch token economy data' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, tokens: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, tokens: false }));
    }
  };
  
  // Fetch AI analytics data
  const fetchAIAnalytics = async () => {
    setLoading(prev => ({ ...prev, ai: true }));
    try {
      const response = await adminAnalyticsService.getAIAnalytics();
      if (response.success) {
        setAIAnalytics(response.data);
        setError(prev => ({ ...prev, ai: null }));
      } else {
        setError(prev => ({ ...prev, ai: response.error || 'Failed to fetch AI analytics data' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, ai: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, ai: false }));
    }
  };
  
  // Fetch scheduled reports
  const fetchScheduledReports = async () => {
    setLoading(prev => ({ ...prev, reports: true }));
    try {
      const response = await adminAnalyticsService.getScheduledReports();
      if (response.success) {
        setScheduledReports(response.data);
        setError(prev => ({ ...prev, reports: null }));
      } else {
        setError(prev => ({ ...prev, reports: response.error || 'Failed to fetch scheduled reports' }));
      }
    } catch (err) {
      setError(prev => ({ ...prev, reports: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, reports: false }));
    }
  };
  
  // Handle schedule report button click
  const handleScheduleReport = () => {
    setSelectedReport(null);
    setScheduleDialogOpen(true);
  };
  
  // Handle edit report
  const handleEditReport = (report) => {
    setSelectedReport(report);
    setScheduleDialogOpen(true);
  };
  
  // Handle delete report
  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this scheduled report?')) {
      try {
        const response = await adminAnalyticsService.deleteScheduledReport(reportId);
        if (response.success) {
          setScheduledReports(prev => prev.filter(report => report.id !== reportId));
        } else {
          alert(response.error || 'Failed to delete report');
        }
      } catch (err) {
        alert(err.message || 'An error occurred while deleting the report');
      }
    }
  };

  // Export report as PDF
  const handleExportPDF = async () => {
    try {
      let reportType, data;
      
      // Get the appropriate data based on active tab
      switch (activeTab) {
        case 0: // Provider Performance
          reportType = 'provider_performance';
          data = providerPerformance;
          break;
        case 1: // Referral Conversion
          reportType = 'referral_conversion';
          data = referralConversion;
          break;
        case 2: // Token Economy
          reportType = 'token_economy';
          data = tokenEconomy;
          break;
        case 3: // AI Analytics
          reportType = 'ai_analytics';
          data = aiAnalytics;
          break;
        default:
          reportType = 'provider_performance';
          data = providerPerformance;
      }
      
      // Check if we have data to export
      if (!data || (Array.isArray(data) && data.length === 0)) {
        alert('No data available to export');
        return;
      }
      
      // Generate PDF document
      const doc = generatePDF(reportType, data, {
        title: `${reportType.replace('_', ' ').toUpperCase()} REPORT`,
        subtitle: `Generated on ${new Date().toLocaleDateString()}`
      });
      
      // Save the PDF
      doc.save(`vibehealth_${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Alternatively, use the API service if preferred
      // const response = await adminAnalyticsService.exportReport({
      //   format: 'pdf',
      //   reportType: reportType
      // });
      // 
      // if (response.success && response.fileUrl) {
      //   window.open(response.fileUrl, '_blank');
      // } else {
      //   alert(response.error || 'Failed to export report');
      // }
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert(err.message || 'An error occurred while exporting the report');
    }
  };

  // Handle save report from dialog
  const handleSaveReport = (savedReport) => {
    if (selectedReport) {
      // Update existing report
      setScheduledReports(prev => 
        prev.map(report => report.id === savedReport.id ? savedReport : report)
      );
    } else {
      // Add new report
      setScheduledReports(prev => [...prev, savedReport]);
    }
  };
  
  useEffect(() => {
    fetchProviderPerformance();
    fetchReferralConversion();
    fetchTokenEconomy();
    fetchAIAnalytics();
    fetchScheduledReports();
  }, []);
  
  // Effect to refetch token data when period changes
  useEffect(() => {
    fetchTokenEconomy(tokenPeriod);
  }, [tokenPeriod]);

  // Render provider performance chart
  const renderProviderPerformanceChart = () => {
    if (loading.providers) {
      return <ModernLoadingIndicator variant="dots" message="Loading provider performance data..." />;
    }
    
    if (error.providers) {
      return <Alert severity="error">{error.providers}</Alert>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={providerPerformance}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="referrals" fill="#8884d8" name="Total Referrals" />
          <Bar dataKey="acceptanceRate" fill="#82ca9d" name="Acceptance Rate (%)" />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  // Render referral conversion chart
  const renderReferralConversionChart = () => {
    if (loading.referrals) {
      return <ModernLoadingIndicator variant="dots" message="Loading referral conversion data..." />;
    }
    
    if (error.referrals) {
      return <Alert severity="error">{error.referrals}</Alert>;
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={referralConversion}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Referrals Sent" />
          <Line type="monotone" dataKey="accepted" stroke="#82ca9d" name="Referrals Accepted" />
          <Line type="monotone" dataKey="completed" stroke="#ffc658" name="Referrals Completed" />
        </LineChart>
      </ResponsiveContainer>
    );
  };
  
  // Export report handler
  const handleExportReport = async (reportType, format) => {
    try {
      const response = await adminAnalyticsService.exportReport(reportType, format);
      if (response.success && response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      } else {
        alert(`Export successful: ${response.message}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export report. Please try again.');
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Admin Dashboard
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />}
            sx={{ mr: 2 }}
            onClick={() => handleExportReport('dashboard', 'pdf')}
          >
            Export PDF
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<ScheduleIcon />}
            onClick={handleScheduleReport}
          >
            Schedule Report
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Provider Performance" />
          <Tab label="Referral Conversion" />
          <Tab label="Token Economy" />
          <Tab label="AI Analytics" />
          <Tab label="Scheduled Reports" />
        </Tabs>
        
        {/* Provider Performance Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Provider Performance Metrics</Typography>
              <IconButton onClick={fetchProviderPerformance}>
                <RefreshIcon />
              </IconButton>
            </Box>
            {renderProviderPerformanceChart()}
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom>Top Performing Providers</Typography>
              <Grid container spacing={3}>
                {!loading.providers && providerPerformance.slice(0, 3).map((provider) => (
                  <Grid item xs={12} md={4} key={provider.id}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="h6">{provider.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Referrals: {provider.referrals}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Acceptance Rate: {(provider.acceptanceRate * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Avg Response Time: {provider.avgResponseTime} hours
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}
        
        {/* Referral Conversion Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Referral Conversion Rates</Typography>
              <IconButton onClick={fetchReferralConversion}>
                <RefreshIcon />
              </IconButton>
            </Box>
            {renderReferralConversionChart()}
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle1" gutterBottom>Conversion Metrics</Typography>
              <Grid container spacing={3}>
                {!loading.referrals && (
                  <>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#f0f7ff', textAlign: 'center' }}>
                        <Typography variant="h6">Acceptance Rate</Typography>
                        <Typography variant="h4" color="primary">
                          {referralConversion.length > 0 ? 
                            ((referralConversion.reduce((sum, item) => sum + item.accepted, 0) / 
                              referralConversion.reduce((sum, item) => sum + item.sent, 0)) * 100).toFixed(1) + '%' : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#f0fff7', textAlign: 'center' }}>
                        <Typography variant="h6">Completion Rate</Typography>
                        <Typography variant="h4" color="success.main">
                          {referralConversion.length > 0 ? 
                            ((referralConversion.reduce((sum, item) => sum + item.completed, 0) / 
                              referralConversion.reduce((sum, item) => sum + item.accepted, 0)) * 100).toFixed(1) + '%' : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#fff7f0', textAlign: 'center' }}>
                        <Typography variant="h6">Overall Conversion</Typography>
                        <Typography variant="h4" color="warning.main">
                          {referralConversion.length > 0 ? 
                            ((referralConversion.reduce((sum, item) => sum + item.completed, 0) / 
                              referralConversion.reduce((sum, item) => sum + item.sent, 0)) * 100).toFixed(1) + '%' : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </Box>
        )}
        
        {/* Token Economy Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Token Economy Trends</Typography>
              <Box>
                <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={tokenPeriod}
                    label="Time Period"
                    onChange={(e) => setTokenPeriod(e.target.value)}
                  >
                    <MenuItem value="last3months">Last 3 Months</MenuItem>
                    <MenuItem value="last6months">Last 6 Months</MenuItem>
                    <MenuItem value="lastyear">Last Year</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => fetchTokenEconomy(tokenPeriod)}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
            
            {loading.tokens ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <ModernLoadingIndicator variant="pulse" message="Loading token economy data..." />
              </Box>
            ) : error.tokens ? (
              <Alert severity="error" sx={{ mb: 3 }}>{error.tokens}</Alert>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tokenEconomy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="issued" stroke="#8884d8" name="Tokens Issued" />
                    <Line type="monotone" dataKey="redeemed" stroke="#82ca9d" name="Tokens Redeemed" />
                    <Line type="monotone" dataKey="circulation" stroke="#ffc658" name="Tokens in Circulation" />
                  </LineChart>
                </ResponsiveContainer>
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>Token Economy Metrics</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#f5f0ff', textAlign: 'center' }}>
                        <Typography variant="h6">Total Tokens Issued</Typography>
                        <Typography variant="h4" color="primary">
                          {tokenEconomy.length > 0 ? 
                            tokenEconomy.reduce((sum, item) => sum + item.issued, 0).toLocaleString() : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#f0fff7', textAlign: 'center' }}>
                        <Typography variant="h6">Total Tokens Redeemed</Typography>
                        <Typography variant="h4" color="success.main">
                          {tokenEconomy.length > 0 ? 
                            tokenEconomy.reduce((sum, item) => sum + item.redeemed, 0).toLocaleString() : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: '#fff7f0', textAlign: 'center' }}>
                        <Typography variant="h6">Current Circulation</Typography>
                        <Typography variant="h4" color="warning.main">
                          {tokenEconomy.length > 0 ? 
                            tokenEconomy[tokenEconomy.length - 1].circulation.toLocaleString() : 
                            'N/A'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </Box>
        )}
        
        {/* AI Analytics Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">AI Analytics Usage & Accuracy</Typography>
              <IconButton onClick={fetchAIAnalytics}>
                <RefreshIcon />
              </IconButton>
            </Box>
            
            {loading.ai ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <ModernLoadingIndicator variant="pulse" message="Loading AI analytics data..." />
              </Box>
            ) : error.ai ? (
              <Alert severity="error" sx={{ mb: 3 }}>{error.ai}</Alert>
            ) : aiAnalytics ? (
              <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: '#f0f7ff', textAlign: 'center' }}>
                      <Typography variant="h6">Risk Assessment Accuracy</Typography>
                      <Typography variant="h4" color="primary">
                        {(aiAnalytics.accuracy.riskAssessment * 100).toFixed(1)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: '#f0fff7', textAlign: 'center' }}>
                      <Typography variant="h6">Summary Generation Accuracy</Typography>
                      <Typography variant="h4" color="success.main">
                        {(aiAnalytics.accuracy.summaryGeneration * 100).toFixed(1)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, bgcolor: '#fff7f0', textAlign: 'center' }}>
                      <Typography variant="h6">Recommendation Accuracy</Typography>
                      <Typography variant="h4" color="warning.main">
                        {(aiAnalytics.accuracy.recommendationEngine * 100).toFixed(1)}%
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" gutterBottom>AI Usage Trends</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={aiAnalytics.usage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="riskAssessment" fill="#8884d8" name="Risk Assessment" />
                    <Bar dataKey="summaryGeneration" fill="#82ca9d" name="Summary Generation" />
                    <Bar dataKey="recommendationEngine" fill="#ffc658" name="Recommendation Engine" />
                  </BarChart>
                </ResponsiveContainer>
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" gutterBottom>AI Feedback Metrics</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: '#fff0f0', textAlign: 'center' }}>
                        <Typography variant="h6">False Positives</Typography>
                        <Typography variant="h4" color="error.main">
                          {aiAnalytics.falsePositives}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2, bgcolor: '#f0f0ff', textAlign: 'center' }}>
                        <Typography variant="h6">False Negatives</Typography>
                        <Typography variant="h4" color="info.main">
                          {aiAnalytics.falseNegatives}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                
                <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>AI Improvement Rate</Typography>
                  <Typography variant="body1">
                    The AI models are showing an improvement rate of {(aiAnalytics.improvementRate * 100).toFixed(1)}% 
                    based on continuous learning from provider feedback and corrections.
                  </Typography>
                </Box>
              </>
            ) : (
              <Typography variant="body1" color="textSecondary">
                No AI analytics data available.
              </Typography>
            )}
          </Box>
        )}
        
        {/* Scheduled Reports Tab */}
        {activeTab === 4 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Scheduled Reports</Typography>
              <Box>
                <Button 
                  variant="contained" 
                  startIcon={<EmailIcon />}
                  onClick={handleScheduleReport}
                  size="small"
                  sx={{ mr: 2 }}
                >
                  Schedule New Report
                </Button>
                <IconButton onClick={fetchScheduledReports}>
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Box>
            
            {loading.reports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <ModernLoadingIndicator variant="pulse" message="Loading scheduled reports..." />
              </Box>
            ) : error.reports ? (
              <Alert severity="error" sx={{ mb: 3 }}>{error.reports}</Alert>
            ) : scheduledReports.length > 0 ? (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report Name</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Recipients</TableCell>
                      <TableCell>Last Sent</TableCell>
                      <TableCell>Next Scheduled</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scheduledReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={report.frequency.charAt(0).toUpperCase() + report.frequency.slice(1)} 
                            color={report.frequency === 'weekly' ? 'primary' : 
                                  report.frequency === 'monthly' ? 'secondary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{report.recipients.join(', ')}</TableCell>
                        <TableCell>{new Date(report.lastSent).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(report.nextScheduled).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleEditReport(report)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteReport(report.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1" color="textSecondary">
                No scheduled reports found. Create your first scheduled report to get started.
              </Typography>
            )}
          </Box>
        )}
      </Paper>
      
      {/* Schedule Report Dialog */}
      <ScheduleReportDialog 
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        report={selectedReport}
        onSave={handleSaveReport}
      />
    </Container>
  );
};

export default AdminDashboard;
