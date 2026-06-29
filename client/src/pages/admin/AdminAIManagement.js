import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import AIStatisticsDialog from '../../components/admin/AIStatisticsDialog';
import AIModelDetails from '../../components/admin/AIModelDetails';
import AIModelTrainingFeedback from '../../components/admin/AIModelTrainingFeedback';
import AIReportScheduler from '../../components/admin/AIReportScheduler';

// Services
import aiManagementService from '../../services/aiManagementService';
import { get, put, post } from '../../utils/apiUtils';

// Common components
import { ModernLoadingIndicator } from '../../components/common';

// Mock data for development
import { adminMockData } from '../../services/mockData';

const AdminAIManagement = () => {
  // State variables
  const [tabValue] = useState(0);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [openFeedbackDialog, setOpenFeedbackDialog] = useState(false);
  const [openThresholdDialog, setOpenThresholdDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openStatisticsDialog, setOpenStatisticsDialog] = useState(false);
  const [openModelDetailsDialog, setOpenModelDetailsDialog] = useState(false);
  const [openModelTrainingFeedbackDialog, setOpenModelTrainingFeedbackDialog] = useState(false);
  const [openReportSchedulerDialog, setOpenReportSchedulerDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [aiModels, setAiModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelFilters, setModelFilters] = useState({});
  
  // AI Statistics state
  const [aiStatistics, setAiStatistics] = useState(null);

  // AI Config state (persisted in MongoDB)
  const [aiConfigs, setAiConfigs] = useState([]);
  const [aiConfigEditValues, setAiConfigEditValues] = useState({});
  
  // Define columns for data grid
  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'type', headerName: 'Type', width: 130 },
    { field: 'status', headerName: 'Status', width: 100 },
    { field: 'accuracy', headerName: 'Accuracy', width: 130, valueFormatter: (params) => params.value ? `${(params.value * 100).toFixed(1)}%` : 'N/A' },
    { field: 'lastTrainingDate', headerName: 'Last Training', width: 150, valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A' },
    { field: 'dataPoints', headerName: 'Data Points', width: 130, valueFormatter: (params) => params.value ? params.value.toLocaleString() : '0' },
    { field: 'version', headerName: 'Version', width: 100 }
  ];
  
  // Thresholds state
  const [thresholds, setThresholds] = useState({
    readmissionRisk: 0.7,
    diagnosisConfidence: 0.85,
    treatmentRecommendation: 0.8
  });
  
  // Form states
  const [reviewForm, setReviewForm] = useState({ action: 'approved', comments: '' });
  const [feedbackForm, setFeedbackForm] = useState({ type: 'false_positive', comment: '' });
  const [scheduleForm, setScheduleForm] = useState({ 
    recipientId: '', 
    frequency: 'weekly', 
    nextDelivery: new Date().toISOString().split('T')[0]
  });

  // Fetch reports and AI models on component mount
  useEffect(() => {
    fetchReports();
    fetchAIModels();
  }, []);

  // Load AI configs from MongoDB on mount
  useEffect(() => {
    const loadAiConfigs = async () => {
      try {
        const resp = await get('/admin/ai-config');
        if (resp?.data) setAiConfigs(resp.data);
      } catch (e) { console.error('Failed to load AI configs', e); }
    };
    loadAiConfigs();
  }, []);

  // Fetch reports from API
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Check if we should use mock data or real API
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data
        setTimeout(() => {
          setReports(adminMockData.aiReports || []);
          setLoading(false);
        }, 500);
      } else {
        // Using real API
        const data = await aiManagementService.getReports();
        setReports(data?.data || data || []);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching AI reports:', err);
      setError('Failed to fetch AI reports. Please try again.');
      setLoading(false);
    }
  };

  // Handle opening review dialog
  const handleOpenReviewDialog = (report) => {
    setSelectedReport(report);
    setReviewForm({ action: 'approved', comments: '' });
    setOpenReviewDialog(true);
  };
  
  // Handle opening feedback dialog
  const handleOpenFeedbackDialog = (report) => {
    setSelectedReport(report);
    setFeedbackForm({ type: 'false_positive', comment: '' });
    setOpenFeedbackDialog(true);
  };
  
  // Handle opening threshold dialog
  const handleOpenThresholdDialog = (model = null) => {
    if (model) {
      // Set the selected model for model-specific thresholds
      setSelectedModel(model);
      
      // Initialize with model-specific thresholds if available
      if (model.thresholds) {
        setThresholds(model.thresholds);
      } else {
        // Fallback to default thresholds
        setThresholds({
          default: 0.7,
          highSensitivity: 0.5,
          highSpecificity: 0.85
        });
      }
    } else {
      // No model provided - using global thresholds
      setSelectedModel(null);
      
      // Initialize with default global thresholds
      setThresholds({
        default: 0.7,
        highSensitivity: 0.5,
        highSpecificity: 0.85
      });
    }
    
    setOpenThresholdDialog(true);
  };
  
  
  // Handle model training feedback submission
  const handleModelTrainingFeedbackSubmit = async (feedbackData) => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.submitModelTrainingFeedback(selectedModel.id, feedbackData);
      } else {
        // Simulate API delay with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Update the model's feedback count in the local state
        setAiModels(prevModels => 
          prevModels.map(model => 
            model.id === selectedModel.id 
              ? { ...model, feedbackCount: (model.feedbackCount || 0) + 1 }
              : model
          )
        );
      }
      
      setOpenModelTrainingFeedbackDialog(false);
      setSnackbar({
        open: true,
        message: `Training feedback for ${selectedModel.name} submitted successfully`,
        severity: 'success'
      });
      
      // Refresh the AI models list to reflect the updated feedback count
      fetchAIModels(modelFilters);
    } catch (err) {
      console.error('Error submitting model training feedback:', err);
      setSnackbar({
        open: true,
        message: `Failed to submit training feedback: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
  };
  
  // Handle opening model details dialog
  const handleOpenModelDetailsDialog = async (model) => {
    setSelectedModel(model);
    
    try {
      // Fetch detailed model metrics before opening the dialog
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API to get detailed metrics
        const detailedMetrics = await aiManagementService.getModelMetrics(model.id);
        setSelectedModel({ ...model, ...detailedMetrics });
      } else {
        // Generate mock detailed metrics
        setTimeout(() => {
          const mockMetrics = {
            performanceHistory: [
              { date: '2023-01', accuracy: 0.82, precision: 0.79, recall: 0.85 },
              { date: '2023-02', accuracy: 0.84, precision: 0.81, recall: 0.86 },
              { date: '2023-03', accuracy: 0.85, precision: 0.83, recall: 0.87 },
              { date: '2023-04', accuracy: 0.87, precision: 0.85, recall: 0.88 },
              { date: '2023-05', accuracy: model.accuracy, precision: model.metrics?.precision || 0.86, recall: model.metrics?.recall || 0.89 }
            ],
            confusionMatrix: {
              truePositives: Math.floor(model.dataPoints * 0.45),
              falsePositives: Math.floor(model.dataPoints * 0.05),
              trueNegatives: Math.floor(model.dataPoints * 0.42),
              falseNegatives: Math.floor(model.dataPoints * 0.08)
            },
            features: [
              { name: 'Age', importance: 0.12 },
              { name: 'Length of Stay', importance: 0.15 },
              { name: 'Previous Admissions', importance: 0.18 },
              { name: 'Comorbidity Count', importance: 0.21 },
              { name: 'Medication Count', importance: 0.09 },
              { name: 'Lab Results', importance: 0.14 },
              { name: 'Discharge Disposition', importance: 0.11 }
            ],
            inferenceTime: '120ms',
            trainingDataSize: model.dataPoints || 45000,
            validationDataSize: Math.floor((model.dataPoints || 45000) * 0.2)
          };
          
          setSelectedModel({ ...model, ...mockMetrics });
        }, 500);
      }
    } catch (err) {
      console.error('Error fetching model metrics:', err);
      setSnackbar({
        open: true,
        message: `Failed to fetch model metrics: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
    
    setOpenModelDetailsDialog(true);
  };
  
  // Handle opening model training feedback dialog
  const handleOpenModelTrainingFeedbackDialog = (model) => {
    setSelectedModel(model);
    setOpenModelTrainingFeedbackDialog(true);
  };
  
  // Handle review submission
  const handleReviewSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Update local state with mock data
        const updatedReports = reports.map(report => {
          if (report.id === selectedReport.id) {
            return { ...report, status: reviewForm.action };
          }
          return report;
        });
        
        setReports(updatedReports);
      } else {
        // Call the real API
        await aiManagementService.reviewReport(selectedReport.id, reviewForm);
        
        // Refresh reports to get updated data
        await fetchReports();
      }
      
      setOpenReviewDialog(false);
      setSnackbar({
        open: true,
        message: `Report ${reviewForm.action === 'approved' ? 'approved' : 'rejected'} successfully`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error submitting review:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit review. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.addFeedback(selectedReport.id, feedbackForm);
      }
      
      setOpenFeedbackDialog(false);
      setSnackbar({
        open: true,
        message: 'Feedback submitted successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit feedback. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Handle threshold update
  const handleThresholdUpdate = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API with model ID if available
        if (selectedModel) {
          await aiManagementService.updateModelThresholds(selectedModel.id, thresholds);
        } else {
          // Update global thresholds
          await aiManagementService.updateThresholds(thresholds);
        }
      } else {
        // Simulate API delay with mock data
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Persist thresholds to MongoDB via ai-config endpoint
      const prefix = selectedModel ? `model.${selectedModel.id}` : 'priorAuth';
      const configUpdates = Object.entries(thresholds).map(([key, value]) => ({
        key: `${prefix}.${key}`, value
      }));
      await post('/admin/ai-config/bulk', { configs: configUpdates });

      // Refresh ai-config state
      const resp = await get('/admin/ai-config');
      if (resp?.data) setAiConfigs(resp.data);

      setOpenThresholdDialog(false);

      // Refresh models to get updated thresholds
      fetchAIModels(modelFilters);

      setSnackbar({
        open: true,
        message: selectedModel
          ? `Thresholds for ${selectedModel.name} updated successfully`
          : 'Global AI thresholds updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error updating thresholds:', err);
      setSnackbar({
        open: true,
        message: `Failed to update thresholds: ${err.message || 'Please try again.'}`,
        severity: 'error'
      });
    }
  };

  // Handle saving a single AI config row inline
  const handleSaveAiConfigRow = async (configKey) => {
    try {
      const value = aiConfigEditValues[configKey];
      await put(`/admin/ai-config/${encodeURIComponent(configKey)}`, { value });
      const resp = await get('/admin/ai-config');
      if (resp?.data) setAiConfigs(resp.data);
      setAiConfigEditValues(prev => { const next = { ...prev }; delete next[configKey]; return next; });
      setSnackbar({ open: true, message: `Config "${configKey}" saved`, severity: 'success' });
    } catch (err) {
      console.error('Error saving AI config', err);
      setSnackbar({ open: true, message: `Failed to save config: ${err.message || 'Please try again.'}`, severity: 'error' });
    }
  };
  
  // Handle schedule submission
  const handleScheduleSubmit = async () => {
    try {
      if (process.env.REACT_APP_MOCK_API !== 'true') {
        // Call the real API
        await aiManagementService.scheduleReport(selectedReport.id, scheduleForm);
      }
      
      setOpenScheduleDialog(false);
      setSnackbar({
        open: true,
        message: 'Report scheduled successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error scheduling report:', err);
      setSnackbar({
        open: true,
        message: 'Failed to schedule report. Please try again.',
        severity: 'error'
      });
    }
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Fetch AI models with optional filters
  const fetchAIModels = async (filters = {}) => {
    setModelLoading(true);
    try {
      // Check if we should use mock data or real API
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data - create some mock models
        setTimeout(() => {
          const mockModels = [
            {
              id: 'model-1',
              name: 'Readmission Risk Predictor',
              type: 'classification',
              version: '2.3.1',
              accuracy: 0.89,
              lastUpdated: new Date().toISOString(),
              status: 'active',
              dataPoints: 125000,
              lastTrainingDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 42,
              metrics: {
                precision: 0.86,
                recall: 0.91,
                f1Score: 0.88,
                auc: 0.92
              },
              thresholds: {
                default: 0.7,
                highSensitivity: 0.5,
                highSpecificity: 0.85
              }
            },
            {
              id: 'model-2',
              name: 'Diagnosis Assistant',
              type: 'nlp',
              version: '1.7.0',
              accuracy: 0.92,
              lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              dataPoints: 87500,
              lastTrainingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 28,
              metrics: {
                precision: 0.89,
                recall: 0.94,
                f1Score: 0.91,
                auc: 0.95
              },
              thresholds: {
                default: 0.65,
                highSensitivity: 0.45,
                highSpecificity: 0.80,
                nlpConfidence: 0.7
              }
            },
            {
              id: 'model-3',
              name: 'Treatment Recommendation Engine',
              type: 'recommendation',
              version: '3.1.2',
              accuracy: 0.87,
              lastUpdated: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'training',
              dataPoints: 103000,
              lastTrainingDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 35,
              metrics: {
                precision: 0.84,
                recall: 0.89,
                f1Score: 0.86,
                auc: 0.90
              },
              thresholds: {
                default: 0.72,
                highSensitivity: 0.55,
                highSpecificity: 0.88
              }
            },
            {
              id: 'model-4',
              name: 'Patient Risk Stratification',
              type: 'classification',
              version: '1.2.5',
              accuracy: 0.84,
              lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'inactive',
              dataPoints: 75000,
              lastTrainingDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 19,
              metrics: {
                precision: 0.81,
                recall: 0.87,
                f1Score: 0.84,
                auc: 0.88
              },
              thresholds: {
                default: 0.68,
                highSensitivity: 0.50,
                highSpecificity: 0.82
              }
            },
            {
              id: 'model-5',
              name: 'Medication Interaction Analyzer',
              type: 'classification',
              version: '2.0.4',
              accuracy: 0.93,
              lastUpdated: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'active',
              dataPoints: 215000,
              lastTrainingDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
              feedbackCount: 23,
              metrics: {
                precision: 0.94,
                recall: 0.92,
                f1Score: 0.93,
                auc: 0.96
              },
              thresholds: {
                default: 0.75,
                highSensitivity: 0.60,
                highSpecificity: 0.90
              }
            }
          ];
          
          // Apply any filters if provided
          let filteredModels = [...mockModels];
          if (filters.type) {
            filteredModels = filteredModels.filter(model => model.type === filters.type);
          }
          if (filters.status) {
            filteredModels = filteredModels.filter(model => model.status === filters.status);
          }
          
          setAiModels(filteredModels);
          setModelLoading(false);
        }, 500);
      } else {
        // Using real API with filters
        const data = await aiManagementService.getAIModels(filters);
        const modelsArray = data?.data || data;
        if (Array.isArray(modelsArray)) {
          setAiModels(modelsArray);
        } else {
          console.error('Invalid AI models data format:', data);
          setAiModels([]);
          setSnackbar({
            open: true,
            message: 'Received invalid AI models data format',
            severity: 'warning'
          });
        }
        setModelLoading(false);
      }
    } catch (err) {
      console.error('Error fetching AI models:', err);
      setAiModels([]);
      setSnackbar({
        open: true,
        message: `Failed to fetch AI models: ${err.message || 'Unknown error'}`,
        severity: 'error'
      });
      setModelLoading(false);
    }
  };

  // Fetch AI statistics
  const fetchAIStatistics = async () => {
    try {
      // Check if we should use mock data or real API
      if (process.env.REACT_APP_MOCK_API === 'true') {
        // Using mock data
        setTimeout(() => {
          setAiStatistics(adminMockData.aiStatistics || {});
        }, 500);
      } else {
        // Using real API
        const data = await aiManagementService.getAIStatistics();
        setAiStatistics(data?.data || data || {});
      }
    } catch (err) {
      console.error('Error fetching AI statistics:', err);
      setSnackbar({
        open: true,
        message: 'Failed to fetch AI statistics',
        severity: 'error'
      });
    }
  };

  // Handle opening statistics dialog
  const handleOpenStatisticsDialog = () => {
    fetchAIStatistics();
    setOpenStatisticsDialog(true);
  };

  // Handle model training feedback submission
  // const handleModelTrainingFeedbackSubmit = async (feedbackData) => {
  //   try {
  //     // In a real implementation, this would call an API
  //     if (process.env.REACT_APP_MOCK_API !== 'true') {
  //       await aiManagementService.submitModelTrainingFeedback(selectedModel.id, feedbackData);
  //     } else {
  //       // Simulate API delay with mock data
  //       await new Promise(resolve => setTimeout(resolve, 800));
  //     }

  //     setSnackbar({
  //       open: true,
  //       message: 'Training feedback submitted successfully',
  //       severity: 'success'
  //     });

  //     // Refresh AI models to get updated data
  //     fetchAIModels();
      
  //     setOpenModelTrainingFeedbackDialog(false);
  //   } catch (err) {
  //     console.error('Error submitting model training feedback:', err);
  //     setSnackbar({
  //       open: true,
  //       message: 'Failed to submit training feedback',
  //       severity: 'error'
  //     });
  //   }
  // };

  // ... (rest of the code remains the same)

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          AI Management
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<InsightsIcon />}
            onClick={handleOpenStatisticsDialog}
          >
            AI Statistics
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <ModernLoadingIndicator message="Loading alerts..." />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : (
        <Paper sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={reports.filter(report => {
              if (tabValue === 0) return true;
              if (tabValue === 1) return report.status === 'pending_review';
              if (tabValue === 2) return report.status === 'approved';
              if (tabValue === 3) return report.status === 'rejected';
              return true;
            })}
            getRowId={(row) => row._id || row.id}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
            checkboxSelection
            disableSelectionOnClick
          />
        </Paper>
      )}
      
      {/* AI Models Section */}
      <Box sx={{ mt: 6, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            AI Models
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchAIModels()}
              sx={{ mr: 1 }}
            >
              Refresh Models
            </Button>
          </Box>
        </Box>
        
        {/* Filters for AI Models */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Model Type</InputLabel>
              <Select
                value={modelFilters?.type || ''}
                label="Model Type"
                onChange={(e) => {
                  setModelFilters({...modelFilters, type: e.target.value});
                  fetchAIModels({...modelFilters, type: e.target.value});
                }}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="classification">Classification</MenuItem>
                <MenuItem value="nlp">NLP</MenuItem>
                <MenuItem value="recommendation">Recommendation</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={modelFilters?.status || ''}
                label="Status"
                onChange={(e) => {
                  setModelFilters({...modelFilters, status: e.target.value});
                  fetchAIModels({...modelFilters, status: e.target.value});
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {modelLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            <ModernLoadingIndicator message="Loading alerts..." />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {aiModels.map((model) => (
              <Grid item xs={12} md={6} lg={4} key={model.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h3">
                        {model.name}
                      </Typography>
                      <Chip 
                        label={model.status} 
                        size="small" 
                        color={
                          model.status === 'active' ? 'success' : 
                          model.status === 'training' ? 'warning' : 
                          'error'
                        }
                      />
                    </Box>
                    
                    <Typography color="text.secondary" gutterBottom>
                      {model.type.charAt(0).toUpperCase() + model.type.slice(1)} Model • v{model.version}
                    </Typography>
                    
                    <Grid container spacing={1} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {(model.accuracy * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Data Points
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {model.dataPoints?.toLocaleString() || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Training
                        </Typography>
                        <Typography variant="body1">
                          {model.lastTrainingDate ? new Date(model.lastTrainingDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Feedback Count
                        </Typography>
                        <Typography variant="body1">
                          {model.feedbackCount || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<InsightsIcon />}
                      onClick={() => handleOpenModelDetailsDialog(model)}
                    >
                      Details
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<PsychologyIcon />}
                      onClick={() => handleOpenModelTrainingFeedbackDialog(model)}
                    >
                      Feedback
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<SettingsIcon />}
                      onClick={() => handleOpenThresholdDialog(model)}
                    >
                      Thresholds
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
            
            {aiModels.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No AI models found matching the selected filters.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Box>
      
      {/* Detail Dialog */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        fullWidth
        maxWidth="md"
      >
        {selectedReport && (
          <>
            <DialogTitle>
              {selectedReport.title}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Type: {selectedReport.type}</Typography>
                  <Typography variant="subtitle1">Status: 
                    <Chip 
                      label={selectedReport.status} 
                      color={
                        selectedReport.status === 'approved' ? 'success' : 
                        selectedReport.status === 'rejected' ? 'error' : 
                        selectedReport.status === 'pending_review' ? 'warning' : 
                        'default'
                      }
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="subtitle1">
                    Confidence Score: {(selectedReport.confidenceScore * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1">Created: {new Date(selectedReport.createdAt).toLocaleDateString()}</Typography>
                  <Typography variant="subtitle1">Last Updated: {new Date(selectedReport.updatedAt).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Description</Typography>
                  <Typography variant="body1">{selectedReport.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6">Data</Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <pre>{JSON.stringify(selectedReport.data, null, 2)}</pre>
                  </Paper>
                </Grid>
                {selectedReport.feedback && selectedReport.feedback.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="h6">Feedback</Typography>
                    {selectedReport.feedback.map((item, index) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Chip 
                          label={item.type} 
                          color={
                            item.type === 'false_positive' ? 'error' : 
                            item.type === 'false_negative' ? 'warning' : 
                            item.type === 'accurate' ? 'success' : 
                            'default'
                          }
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" component="span">
                          {item.comment}
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenReviewDialog(selectedReport);
                }}
                disabled={selectedReport.status === 'approved' || selectedReport.status === 'rejected'}
              >
                Review
              </Button>
              <Button 
                variant="outlined" 
                color="secondary"
                onClick={() => {
                  setOpenDetailDialog(false);
                  handleOpenFeedbackDialog(selectedReport);
                }}
              >
                Provide Feedback
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Review Dialog */}
      <Dialog
        open={openReviewDialog}
        onClose={() => setOpenReviewDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Review AI Report
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Title: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Type: {selectedReport.type}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={reviewForm.action}
                  onChange={(e) => setReviewForm({ ...reviewForm, action: e.target.value })}
                  label="Action"
                >
                  <MenuItem value="approved">Approve</MenuItem>
                  <MenuItem value="rejected">Reject</MenuItem>
                  <MenuItem value="published">Approve & Publish</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Comments"
                multiline
                rows={4}
                fullWidth
                value={reviewForm.comments}
                onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleReviewSubmit}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Feedback Dialog */}
      <Dialog
        open={openFeedbackDialog}
        onClose={() => setOpenFeedbackDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Provide Feedback
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Title: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Type: {selectedReport.type}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Feedback Type</InputLabel>
                <Select
                  value={feedbackForm.type}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                  label="Feedback Type"
                >
                  <MenuItem value="false_positive">False Positive</MenuItem>
                  <MenuItem value="false_negative">False Negative</MenuItem>
                  <MenuItem value="accurate">Accurate</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Comments"
                multiline
                rows={4}
                fullWidth
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFeedbackDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleFeedbackSubmit}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Threshold Dialog */}
      <Dialog
        open={openThresholdDialog}
        onClose={() => setOpenThresholdDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {selectedModel ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Adjust Thresholds: {selectedModel.name}
            </Box>
          ) : (
            'Adjust Global AI Thresholds'
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedModel ? (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Adjust the threshold values for this AI model. These settings will override global thresholds for this specific model.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.paper' }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Model Type:</Typography>
                      <Typography variant="body1">{selectedModel.type}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Current Accuracy:</Typography>
                      <Typography variant="body1">{(selectedModel.accuracy * 100).toFixed(1)}%</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Adjust the global threshold values for all AI predictions. Higher values increase precision but may reduce recall. Model-specific thresholds will override these values.
              </Typography>
            )}
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Readmission Risk Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.readmissionRisk}
                    onChange={(e) => setThresholds({ ...thresholds, readmissionRisk: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.readmissionRisk * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.readmissionRisk < 0.5 ? 'Low threshold may result in more false positives' : 
                   thresholds.readmissionRisk > 0.8 ? 'High threshold may miss at-risk patients' : 
                   'Balanced threshold for risk detection'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Diagnosis Confidence Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.diagnosisConfidence}
                    onChange={(e) => setThresholds({ ...thresholds, diagnosisConfidence: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.diagnosisConfidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.diagnosisConfidence < 0.7 ? 'Low threshold may suggest less reliable diagnoses' : 
                   thresholds.diagnosisConfidence > 0.9 ? 'High threshold may limit diagnostic suggestions' : 
                   'Balanced threshold for diagnostic confidence'}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Treatment Recommendation Threshold</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    type="range"
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                    value={thresholds.treatmentRecommendation}
                    onChange={(e) => setThresholds({ ...thresholds, treatmentRecommendation: parseFloat(e.target.value) })}
                    sx={{ flexGrow: 1, mr: 2 }}
                  />
                  <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                    {(thresholds.treatmentRecommendation * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {thresholds.treatmentRecommendation < 0.7 ? 'Low threshold may suggest more experimental treatments' : 
                   thresholds.treatmentRecommendation > 0.9 ? 'High threshold limits to only well-established treatments' : 
                   'Balanced threshold for treatment recommendations'}
                </Typography>
              </Grid>
              
              {selectedModel?.type === 'classification' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Classification Threshold</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      type="range"
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      value={thresholds.classification || 0.75}
                      onChange={(e) => setThresholds({ ...thresholds, classification: parseFloat(e.target.value) })}
                      sx={{ flexGrow: 1, mr: 2 }}
                    />
                    <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                      {((thresholds.classification || 0.75) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              {selectedModel?.type === 'nlp' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">NLP Confidence Threshold</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      type="range"
                      inputProps={{ min: 0, max: 1, step: 0.01 }}
                      value={thresholds.nlpConfidence || 0.7}
                      onChange={(e) => setThresholds({ ...thresholds, nlpConfidence: parseFloat(e.target.value) })}
                      sx={{ flexGrow: 1, mr: 2 }}
                    />
                    <Typography variant="body1" sx={{ minWidth: '50px', fontWeight: 'bold' }}>
                      {((thresholds.nlpConfidence || 0.7) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenThresholdDialog(false)}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleThresholdUpdate}
            startIcon={<SaveIcon />}
          >
            Save Thresholds
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Schedule Dialog */}
      <Dialog
        open={openScheduleDialog}
        onClose={() => setOpenScheduleDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Schedule Automated Report
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Report: {selectedReport.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3 }}>
                Schedule this report to be automatically sent to providers
              </Typography>
              
              <TextField
                label="Recipient ID"
                fullWidth
                margin="normal"
                value={scheduleForm.recipientId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recipientId: e.target.value })}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Next Delivery Date"
                type="date"
                fullWidth
                margin="normal"
                value={scheduleForm.nextDelivery}
                onChange={(e) => setScheduleForm({ ...scheduleForm, nextDelivery: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenScheduleDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleScheduleSubmit}
          >
            Schedule Report
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* AI Statistics Dialog */}
      <AIStatisticsDialog 
        open={openStatisticsDialog} 
        onClose={() => setOpenStatisticsDialog(false)} 
        statistics={aiStatistics} 
      />
      
      {/* AI Model Details Dialog */}
      <Dialog
        open={openModelDetailsDialog}
        onClose={() => setOpenModelDetailsDialog(false)}
        fullWidth
        maxWidth="lg"
        aria-labelledby="model-details-dialog-title"
      >
        <DialogTitle id="model-details-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InsightsIcon sx={{ mr: 1 }} />
              {selectedModel?.name} Details
            </Box>
            <IconButton onClick={() => setOpenModelDetailsDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedModel ? (
            <AIModelDetails
              modelId={selectedModel.id}
              modelName={selectedModel.name}
              modelType={selectedModel.type}
              model={selectedModel}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <ModernLoadingIndicator message="Loading alerts..." />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenModelDetailsDialog(false)}
            startIcon={<CloseIcon />}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<PsychologyIcon />}
            onClick={() => {
              setOpenModelDetailsDialog(false);
              handleOpenModelTrainingFeedbackDialog(selectedModel);
            }}
          >
            Provide Training Feedback
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* AI Model Training Feedback Dialog */}
      <AIModelTrainingFeedback
        open={openModelTrainingFeedbackDialog}
        onClose={() => setOpenModelTrainingFeedbackDialog(false)}
        modelId={selectedModel?.id}
        modelName={selectedModel?.name}
        onSubmitFeedback={handleModelTrainingFeedbackSubmit}
      />
      
      {/* Enhanced Report Scheduler Dialog */}
      <AIReportScheduler
        open={openReportSchedulerDialog}
        onClose={() => setOpenReportSchedulerDialog(false)}
        reportId={selectedReport?.id}
        reportTitle={selectedReport?.title}
      />
      
      {/* AI Models Section */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            AI Models
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={() => fetchAIModels()}
            disabled={modelLoading}
          >
            Refresh Models
          </Button>
        </Box>
        
        {/* Filters */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Typography variant="subtitle2">Filter Models:</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Model Type</InputLabel>
                <Select
                  value={modelFilters?.type || ''}
                  label="Model Type"
                  onChange={(e) => {
                    setModelFilters({...modelFilters, type: e.target.value});
                    fetchAIModels({...modelFilters, type: e.target.value});
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="classification">Classification</MenuItem>
                  <MenuItem value="nlp">NLP</MenuItem>
                  <MenuItem value="recommendation">Recommendation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={modelFilters?.status || ''}
                  label="Status"
                  onChange={(e) => {
                    setModelFilters({...modelFilters, status: e.target.value});
                    fetchAIModels({...modelFilters, status: e.target.value});
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => {
                  setModelFilters({});
                  fetchAIModels({});
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {modelLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <ModernLoadingIndicator message="Loading alerts..." />
          </Box>
        ) : aiModels.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1" color="text.secondary">
              No AI models found matching the current filters.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {aiModels.map((model) => (
              <Grid item xs={12} md={6} lg={4} key={model.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {model.name}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={model.status} 
                        color={
                          model.status === 'active' ? 'success' : 
                          model.status === 'training' ? 'info' : 'default'
                        }
                      />
                    </Box>
                    
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Type: {model.type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Version: {model.version}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy: {(model.accuracy * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Data Points: {model.dataPoints ? model.dataPoints.toLocaleString() : '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Training: {new Date(model.lastTrainingDate).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Feedback Count: {model.feedbackCount}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      startIcon={<InsightsIcon />}
                      onClick={() => handleOpenModelDetailsDialog(model)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="small" 
                      color="secondary"
                      startIcon={<PsychologyIcon />}
                      onClick={() => handleOpenModelTrainingFeedbackDialog(model)}
                    >
                      Training Feedback
                    </Button>
                    <Button 
                      size="small" 
                      color="primary"
                      startIcon={<SettingsIcon />}
                      onClick={() => handleOpenThresholdDialog(model)}
                    >
                      Thresholds
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
      
      {/* AI Configuration Section */}
      <Paper sx={{ mt: 4, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">AI Configuration</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={async () => {
              try {
                const resp = await get('/admin/ai-config');
                if (resp?.data) setAiConfigs(resp.data);
              } catch (e) { console.error('Failed to refresh AI configs', e); }
            }}
          >
            Refresh
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {aiConfigs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No AI configuration entries found.
          </Typography>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: '2px solid', borderColor: 'divider' }}>
                {['Key', 'Value', 'Description', 'Actions'].map(col => (
                  <Box component="th" key={col} sx={{ p: 1.5, textAlign: 'left' }}>
                    <Typography variant="subtitle2">{col}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {aiConfigs.map((cfg) => {
                const isEditing = aiConfigEditValues.hasOwnProperty(cfg.key);
                return (
                  <Box component="tr" key={cfg.key} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box component="td" sx={{ p: 1.5 }}>
                      <Typography variant="body2" fontFamily="monospace">{cfg.key}</Typography>
                    </Box>
                    <Box component="td" sx={{ p: 1.5, minWidth: 160 }}>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={aiConfigEditValues[cfg.key]}
                          onChange={(e) => setAiConfigEditValues(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                          sx={{ width: '100%' }}
                        />
                      ) : (
                        <Typography variant="body2">{String(cfg.value)}</Typography>
                      )}
                    </Box>
                    <Box component="td" sx={{ p: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">{cfg.description || '—'}</Typography>
                    </Box>
                    <Box component="td" sx={{ p: 1.5 }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => handleSaveAiConfigRow(cfg.key)}>
                            Save
                          </Button>
                          <Button size="small" startIcon={<CancelIcon />} onClick={() => setAiConfigEditValues(prev => { const next = { ...prev }; delete next[cfg.key]; return next; })}>
                            Cancel
                          </Button>
                        </Box>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={() => setAiConfigEditValues(prev => ({ ...prev, [cfg.key]: cfg.value }))}>
                          Edit
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminAIManagement;
