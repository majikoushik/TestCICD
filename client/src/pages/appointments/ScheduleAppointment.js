import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  FormHelperText,
  Autocomplete
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useNotification } from '../../contexts';
import { ModernLoadingIndicator } from '../../components/common';

export default function ScheduleAppointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotification();
  const queryParams = new URLSearchParams(location.search);
  const patientId = queryParams.get('patientId');
  
  const [loading, setLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(!!patientId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [providers, setProviders] = useState([]);
  const [appointmentTypes, setAppointmentTypes] = useState([
    { id: 'initial', name: 'Initial Consultation' },
    { id: 'followup', name: 'Follow-up Visit' },
    { id: 'procedure', name: 'Procedure' },
    { id: 'checkup', name: 'Routine Check-up' },
    { id: 'urgent', name: 'Urgent Care' }
  ]);
  
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    providerId: '',
    appointmentType: '',
    appointmentDate: null,
    duration: 30,
    notes: '',
    location: 'in-person'
  });
  
  const [formErrors, setFormErrors] = useState({
    patientId: '',
    providerId: '',
    appointmentType: '',
    appointmentDate: '',
    duration: '',
    notes: '',
    location: ''
  });
  
  // Fetch patient data if patientId is provided
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!patientId) {
        setPatientLoading(false);
        return;
      }
      
      try {
        setPatientLoading(true);
        
        // In a real app, this would be an API call to fetch patient data
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate patient data
        const mockPatient = {
          id: patientId,
          patientId: `PT-${patientId.replace('p-', '')}`,
          firstName: `John`,
          lastName: `Doe ${patientId.replace('p-', '')}`,
          dateOfBirth: new Date(1980, 5, 15).toISOString(),
          gender: 'male',
          contactNumber: '555-123-4567',
          email: `patient${patientId.replace('p-', '')}@example.com`,
          address: '123 Main St, Anytown, USA',
          insuranceProvider: 'HealthPlus',
          insuranceNumber: 'HP12345678',
          medicalHistory: 'No significant medical history',
          allergies: 'None',
          medications: 'None'
        };
        
        setPatient(mockPatient);
        setFormData(prev => ({ ...prev, patientId }));
        setPatientLoading(false);
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setError('Failed to load patient data. Please try again later.');
        setPatientLoading(false);
      }
    };
    
    fetchPatientData();
  }, [patientId]);
  
  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        
        // In a real app, this would be an API call to fetch providers
        // For this demo, we'll simulate the data
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Simulate provider data
        const mockProviders = Array.from({ length: 10 }, (_, i) => ({
          id: `prov-${i + 1}`,
          firstName: `Provider`,
          lastName: `${i + 1}`,
          specialty: ['Cardiology', 'Neurology', 'Dermatology', 'Pediatrics', 'Orthopedics'][i % 5],
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          availableTimeStart: '09:00',
          availableTimeEnd: '17:00'
        }));
        
        setProviders(mockProviders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching providers:', error);
        setError('Failed to load providers. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchProviders();
  }, []);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleDateChange = (newDate) => {
    setFormData(prev => ({ ...prev, appointmentDate: newDate }));
    
    // Clear error when date is selected
    if (formErrors.appointmentDate) {
      setFormErrors(prev => ({ ...prev, appointmentDate: '' }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
    let isValid = true;
    
    if (!formData.patientId) {
      errors.patientId = 'Patient is required';
      isValid = false;
    }
    
    if (!formData.providerId) {
      errors.providerId = 'Provider is required';
      isValid = false;
    }
    
    if (!formData.appointmentType) {
      errors.appointmentType = 'Appointment type is required';
      isValid = false;
    }
    
    if (!formData.appointmentDate) {
      errors.appointmentDate = 'Appointment date and time are required';
      isValid = false;
    } else {
      const now = new Date();
      if (formData.appointmentDate < now) {
        errors.appointmentDate = 'Appointment date must be in the future';
        isValid = false;
      }
    }
    
    if (!formData.duration || formData.duration < 15) {
      errors.duration = 'Duration must be at least 15 minutes';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // In a real app, this would be an API call to create the appointment
      // For this demo, we'll simulate the API call
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Format the data for submission
      const appointmentData = {
        ...formData,
        appointmentDate: formData.appointmentDate ? formData.appointmentDate.toISOString() : null,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : '',
        providerName: providers.find(p => p.id === formData.providerId)?.firstName + ' ' + 
                     providers.find(p => p.id === formData.providerId)?.lastName,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };
      
      console.log('Appointment created:', appointmentData);
      
      notifySuccess('Appointment scheduled successfully');
      
      // Navigate back to the patient detail page or appointments list
      if (patientId) {
        navigate(`/app/patients/${patientId}`);
      } else {
        navigate('/app/appointments');
      }
      
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      setError('Failed to schedule appointment. Please try again later.');
      notifyError('Failed to schedule appointment');
      setSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    if (patientId) {
      navigate(`/app/patients/${patientId}`);
    } else {
      navigate('/app/patients');
    }
  };
  
  if (loading || patientLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <ModernLoadingIndicator variant="circular" message="Loading appointment data..." />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Schedule Appointment
          </Typography>
          {patient && (
            <Typography variant="subtitle1" color="text.secondary">
              for {patient.firstName} {patient.lastName}
            </Typography>
          )}
        </Box>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {!patient && (
              <Grid item xs={12}>
                <Typography color="error">
                  No patient selected. Please select a patient from the patients list.
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/app/patients')}
                >
                  Go to Patients List
                </Button>
              </Grid>
            )}
            
            {patient && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Patient"
                    value={`${patient.firstName} ${patient.lastName}`}
                    disabled
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!formErrors.providerId}>
                    <InputLabel id="provider-label">Provider</InputLabel>
                    <Select
                      labelId="provider-label"
                      id="providerId"
                      name="providerId"
                      value={formData.providerId}
                      onChange={handleInputChange}
                      label="Provider"
                    >
                      {providers.map((provider) => (
                        <MenuItem key={provider.id} value={provider.id}>
                          {provider.firstName} {provider.lastName} ({provider.specialty})
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.providerId && (
                      <FormHelperText>{formErrors.providerId}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!formErrors.appointmentType}>
                    <InputLabel id="appointment-type-label">Appointment Type</InputLabel>
                    <Select
                      labelId="appointment-type-label"
                      id="appointmentType"
                      name="appointmentType"
                      value={formData.appointmentType}
                      onChange={handleInputChange}
                      label="Appointment Type"
                    >
                      {appointmentTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {type.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.appointmentType && (
                      <FormHelperText>{formErrors.appointmentType}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={!!formErrors.location}>
                    <InputLabel id="location-label">Location</InputLabel>
                    <Select
                      labelId="location-label"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      label="Location"
                    >
                      <MenuItem value="in-person">In-Person</MenuItem>
                      <MenuItem value="telehealth">Telehealth</MenuItem>
                    </Select>
                    {formErrors.location && (
                      <FormHelperText>{formErrors.location}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Appointment Date & Time"
                      value={formData.appointmentDate}
                      onChange={handleDateChange}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          fullWidth 
                          error={!!formErrors.appointmentDate}
                          helperText={formErrors.appointmentDate}
                        />
                      )}
                      minDate={new Date()}
                      minutesStep={5}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Duration (minutes)"
                    name="duration"
                    type="number"
                    value={formData.duration}
                    onChange={handleInputChange}
                    inputProps={{ min: 15, step: 5 }}
                    error={!!formErrors.duration}
                    helperText={formErrors.duration}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    multiline
                    rows={4}
                    value={formData.notes}
                    onChange={handleInputChange}
                    error={!!formErrors.notes}
                    helperText={formErrors.notes}
                  />
                </Grid>
                
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={submitting}
                    startIcon={submitting ? <ModernLoadingIndicator variant="circular" size="small" /> : null}
                  >
                    {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
