import React, { useState, useEffect } from 'react';
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
  Grid,
  Typography,
  Box,
  Chip,
  FormHelperText,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Mock data for providers
const providers = [
  { id: 'provider-1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@hospital.org', department: 'Cardiology' },
  { id: 'provider-2', name: 'Dr. Michael Chen', email: 'michael.chen@hospital.org', department: 'Neurology' },
  { id: 'provider-3', name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@hospital.org', department: 'Oncology' },
  { id: 'provider-4', name: 'Dr. James Wilson', email: 'james.wilson@hospital.org', department: 'Internal Medicine' },
  { id: 'provider-5', name: 'Dr. Lisa Thompson', email: 'lisa.thompson@hospital.org', department: 'Pediatrics' },
  { id: 'provider-6', name: 'Dr. Robert Davis', email: 'robert.davis@hospital.org', department: 'Surgery' }
];

// Mock data for scheduled reports
const initialScheduledReports = [
  {
    id: 'schedule-1',
    reportId: 'ai-report-1',
    reportTitle: 'Patient Readmission Risk Analysis',
    recipients: [providers[0], providers[3]],
    frequency: 'weekly',
    nextDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lastDelivery: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 'schedule-2',
    reportId: 'ai-report-2',
    reportTitle: 'Diagnostic Accuracy Assessment',
    recipients: [providers[1], providers[2], providers[5]],
    frequency: 'monthly',
    nextDelivery: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    lastDelivery: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    status: 'active'
  },
  {
    id: 'schedule-3',
    reportId: 'ai-report-5',
    reportTitle: 'Patient Outcome Prediction',
    recipients: [providers[4]],
    frequency: 'daily',
    nextDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    lastDelivery: new Date(Date.now()),
    status: 'paused'
  }
];

const AIReportScheduler = ({ open, onClose, reportId, reportTitle }) => {
  const [scheduledReports, setScheduledReports] = useState(initialScheduledReports);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [formError, setFormError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    recipients: [],
    frequency: 'weekly',
    nextDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'active'
  });
  
  // Reset form when dialog opens or closes
  useEffect(() => {
    if (open) {
      setShowAddForm(false);
      setEditingScheduleId(null);
      setFormError('');
      setFormData({
        recipients: [],
        frequency: 'weekly',
        nextDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active'
      });
    }
  }, [open]);
  
  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Validate form
    if (formData.recipients.length === 0) {
      setFormError('Please select at least one recipient');
      return;
    }
    
    if (editingScheduleId) {
      // Update existing schedule
      const updatedReports = scheduledReports.map(report => {
        if (report.id === editingScheduleId) {
          return {
            ...report,
            recipients: formData.recipients,
            frequency: formData.frequency,
            nextDelivery: formData.nextDelivery,
            status: formData.status
          };
        }
        return report;
      });
      
      setScheduledReports(updatedReports);
      setEditingScheduleId(null);
    } else {
      // Create new schedule
      const newSchedule = {
        id: `schedule-${Date.now()}`,
        reportId: reportId || 'ai-report-1',
        reportTitle: reportTitle || 'AI Report',
        recipients: formData.recipients,
        frequency: formData.frequency,
        nextDelivery: formData.nextDelivery,
        lastDelivery: null,
        status: formData.status
      };
      
      setScheduledReports([...scheduledReports, newSchedule]);
    }
    
    // Reset form
    setShowAddForm(false);
    setFormData({
      recipients: [],
      frequency: 'weekly',
      nextDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active'
    });
    setFormError('');
  };
  
  // Handle edit schedule
  const handleEditSchedule = (scheduleId) => {
    const schedule = scheduledReports.find(report => report.id === scheduleId);
    if (schedule) {
      setFormData({
        recipients: schedule.recipients,
        frequency: schedule.frequency,
        nextDelivery: schedule.nextDelivery,
        status: schedule.status
      });
      setEditingScheduleId(scheduleId);
      setShowAddForm(true);
      setFormError('');
    }
  };
  
  // Handle delete schedule
  const handleDeleteSchedule = (scheduleId) => {
    const updatedReports = scheduledReports.filter(report => report.id !== scheduleId);
    setScheduledReports(updatedReports);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ScheduleIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            AI Report Scheduling
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {reportId && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1">
              Report: {reportTitle || reportId}
            </Typography>
          </Box>
        )}
        
        {!showAddForm ? (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Scheduled Reports</Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => setShowAddForm(true)}
              >
                Add Schedule
              </Button>
            </Box>
            
            {scheduledReports.length === 0 ? (
              <Alert severity="info">
                No scheduled reports found. Click "Add Schedule" to create one.
              </Alert>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Report</TableCell>
                      <TableCell>Recipients</TableCell>
                      <TableCell>Frequency</TableCell>
                      <TableCell>Next Delivery</TableCell>
                      <TableCell>Last Delivery</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {scheduledReports.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.reportTitle}</TableCell>
                        <TableCell>
                          {schedule.recipients.length > 2 ? (
                            <>
                              <Chip 
                                label={schedule.recipients[0].name} 
                                size="small" 
                                sx={{ mr: 0.5, mb: 0.5 }} 
                              />
                              <Chip 
                                label={`+${schedule.recipients.length - 1} more`} 
                                size="small" 
                                variant="outlined"
                              />
                            </>
                          ) : (
                            schedule.recipients.map(recipient => (
                              <Chip 
                                key={recipient.id}
                                label={recipient.name} 
                                size="small" 
                                sx={{ mr: 0.5, mb: 0.5 }} 
                              />
                            ))
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={schedule.frequency} 
                            color={
                              schedule.frequency === 'daily' ? 'error' : 
                              schedule.frequency === 'weekly' ? 'primary' : 
                              schedule.frequency === 'monthly' ? 'success' : 
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDate(schedule.nextDelivery)}</TableCell>
                        <TableCell>{formatDate(schedule.lastDelivery)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={schedule.status} 
                            color={schedule.status === 'active' ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleEditSchedule(schedule.id)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {editingScheduleId ? 'Edit Schedule' : 'New Schedule'}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  id="recipients"
                  options={providers}
                  getOptionLabel={(option) => `${option.name} (${option.department})`}
                  value={formData.recipients}
                  onChange={(event, newValue) => {
                    handleInputChange('recipients', newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Recipients"
                      placeholder="Select providers"
                      error={formError && formData.recipients.length === 0}
                      helperText={formError && formData.recipients.length === 0 ? formError : ''}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option.name}
                        {...getTagProps({ index })}
                        size="small"
                      />
                    ))
                  }
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel id="frequency-label">Frequency</InputLabel>
                  <Select
                    labelId="frequency-label"
                    id="frequency"
                    value={formData.frequency}
                    label="Frequency"
                    onChange={(e) => handleInputChange('frequency', e.target.value)}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                  </Select>
                  <FormHelperText>
                    How often the report should be delivered
                  </FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Next Delivery Date"
                    value={formData.nextDelivery}
                    onChange={(newValue) => {
                      handleInputChange('nextDelivery', newValue);
                    }}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDate={new Date()}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="paused">Paused</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingScheduleId(null);
                  setFormError('');
                }}
                sx={{ mr: 1 }}
              >
                Cancel
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSubmit}
              >
                {editingScheduleId ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIReportScheduler;
