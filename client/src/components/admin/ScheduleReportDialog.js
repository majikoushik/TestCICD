import React, { useState, useEffect } from 'react';
import { ModernLoadingIndicator } from '../common'; 
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Autocomplete
} from '@mui/material';
import { Email as EmailIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import { adminAnalyticsService } from '../../services';

const ScheduleReportDialog = ({ open, onClose, report = null, onSave }) => {
  const isEditMode = Boolean(report);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'weekly',
    reportType: 'provider_performance',
    recipients: [],
    includeCharts: true,
    includeSummary: true,
    includeRawData: false,
    startDate: new Date().toISOString().split('T')[0]
  });
  const [emailInput, setEmailInput] = useState('');
  const [availableEmails, setAvailableEmails] = useState([]);

  useEffect(() => {
    // Load available admin emails
    const fetchAdminEmails = async () => {
      try {
        const response = await adminAnalyticsService.getAdminEmails();
        if (response.success) {
          setAvailableEmails(response.data);
        }
      } catch (err) {
        console.error('Error fetching admin emails:', err);
      }
    };

    fetchAdminEmails();

    // If editing, populate form with report data
    if (report) {
      setFormData({
        name: report.name || '',
        description: report.description || '',
        frequency: report.frequency || 'weekly',
        reportType: report.reportType || 'provider_performance',
        recipients: report.recipients || [],
        includeCharts: report.includeCharts !== undefined ? report.includeCharts : true,
        includeSummary: report.includeSummary !== undefined ? report.includeSummary : true,
        includeRawData: report.includeRawData !== undefined ? report.includeRawData : false,
        startDate: report.startDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [report]);

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddEmail = () => {
    if (emailInput && emailInput.includes('@') && !formData.recipients.includes(emailInput)) {
      setFormData(prev => ({
        ...prev,
        recipients: [...prev.recipients, emailInput]
      }));
      setEmailInput('');
    }
  };

  const handleDeleteEmail = (emailToDelete) => {
    setFormData(prev => ({
      ...prev,
      recipients: prev.recipients.filter(email => email !== emailToDelete)
    }));
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name) {
      setError('Report name is required');
      return;
    }
    
    if (formData.recipients.length === 0) {
      setError('At least one recipient is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      
      if (isEditMode) {
        response = await adminAnalyticsService.updateScheduledReport(report.id, formData);
      } else {
        response = await adminAnalyticsService.createScheduledReport(formData);
      }

      if (response.success) {
        onSave(response.data);
        onClose();
      } else {
        setError(response.error || 'Failed to save scheduled report');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving the report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Scheduled Report' : 'Schedule New Report'}
      </DialogTitle>
      
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              name="name"
              label="Report Name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              margin="dense"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Report Type</InputLabel>
              <Select
                name="reportType"
                value={formData.reportType}
                onChange={handleChange}
                label="Report Type"
              >
                <MenuItem value="provider_performance">Provider Performance</MenuItem>
                <MenuItem value="referral_conversion">Referral Conversion</MenuItem>
                <MenuItem value="token_economy">Token Economy</MenuItem>
                <MenuItem value="ai_analytics">AI Analytics</MenuItem>
                <MenuItem value="comprehensive">Comprehensive Report</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="dense">
              <InputLabel>Frequency</InputLabel>
              <Select
                name="frequency"
                value={formData.frequency}
                onChange={handleChange}
                label="Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              name="startDate"
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              margin="dense"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Recipients
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Autocomplete
                freeSolo
                options={availableEmails.filter(email => !formData.recipients.includes(email))}
                inputValue={emailInput}
                onInputChange={(event, newValue) => setEmailInput(newValue)}
                sx={{ flexGrow: 1, mr: 1 }}
                renderInput={(params) => (
                  <TextField {...params} label="Add Email" size="small" />
                )}
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleAddEmail}
                startIcon={<EmailIcon />}
                disabled={!emailInput || !emailInput.includes('@')}
              >
                Add
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.recipients.map(email => (
                <Chip
                  key={email}
                  label={email}
                  onDelete={() => handleDeleteEmail(email)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Report Content
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox
                  name="includeCharts"
                  checked={formData.includeCharts}
                  onChange={handleChange}
                />
              }
              label="Include Charts and Visualizations"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  name="includeSummary"
                  checked={formData.includeSummary}
                  onChange={handleChange}
                />
              }
              label="Include Executive Summary"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  name="includeRawData"
                  checked={formData.includeRawData}
                  onChange={handleChange}
                />
              }
              label="Include Raw Data (CSV)"
            />
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary" 
          disabled={loading}
          startIcon={loading ? <ModernLoadingIndicator variant="button" size={20} /> : <ScheduleIcon />}
        >
          {isEditMode ? 'Update Report' : 'Schedule Report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleReportDialog;
