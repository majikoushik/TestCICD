import React, { useState, useEffect, useCallback } from 'react';
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
  FormHelperText,
  Divider,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  MedicalServices as ProviderIcon,
  EventNote as AppointmentTypeIcon,
  LocationOn as LocationIcon,
  Schedule as DurationIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotification } from '../../contexts';
import { ModernLoadingIndicator } from '../../components/common';
import PatientSearchAutocomplete from '../../components/common/PatientSearchAutocomplete';

export default function ScheduleAppointment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotification();
  const queryParams = new URLSearchParams(location.search);
  const preselectedPatientId = queryParams.get('patientId');

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [providers, setProviders] = useState([]);
  const [appointmentTypes] = useState([
    { id: 'initial', name: 'Initial Consultation' },
    { id: 'followup', name: 'Follow-up Visit' },
    { id: 'procedure', name: 'Procedure' },
    { id: 'checkup', name: 'Routine Check-up' },
    { id: 'urgent', name: 'Urgent Care' },
  ]);

  const [formData, setFormData] = useState({
    patientId: '',
    providerId: '',
    appointmentType: '',
    appointmentDate: null,
    duration: 30,
    notes: '',
    location: 'in-person',
  });

  const [formErrors, setFormErrors] = useState({
    patientId: '',
    providerId: '',
    appointmentType: '',
    appointmentDate: '',
    duration: '',
    notes: '',
    location: '',
  });

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockProviders = Array.from({ length: 10 }, (_, i) => ({
          id: `prov-${i + 1}`,
          firstName: `Provider`,
          lastName: `${i + 1}`,
          specialty: ['Cardiology', 'Neurology', 'Dermatology', 'Pediatrics', 'Orthopedics'][i % 5],
        }));
        setProviders(mockProviders);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load providers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const handlePatientChange = useCallback((_, newValue) => {
    setPatient(newValue);
    setFormData(prev => ({ ...prev, patientId: newValue?._id || newValue?.id || '' }));
    if (formErrors.patientId) {
      setFormErrors(prev => ({ ...prev, patientId: '' }));
    }
  }, [formErrors.patientId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({ ...prev, appointmentDate: newDate }));
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
    } else if (formData.appointmentDate < new Date()) {
      errors.appointmentDate = 'Appointment date must be in the future';
      isValid = false;
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
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const patientName = patient
        ? patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
        : '';
      const provider = providers.find(p => p.id === formData.providerId);

      const appointmentData = {
        ...formData,
        appointmentDate: formData.appointmentDate?.toISOString() ?? null,
        patientName,
        providerName: provider ? `${provider.firstName} ${provider.lastName}` : '',
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };

      console.log('Appointment created:', appointmentData);
      notifySuccess('Appointment scheduled successfully');

      const returnId = patient?._id || patient?.id || preselectedPatientId;
      navigate(returnId ? `/app/patients/${returnId}` : '/app/appointments');
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      setError('Failed to schedule appointment. Please try again later.');
      notifyError('Failed to schedule appointment');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    const returnId = patient?._id || patient?.id || preselectedPatientId;
    navigate(returnId ? `/app/patients/${returnId}` : '/app/patients');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <ModernLoadingIndicator variant="circular" message="Loading appointment data..." />
      </Box>
    );
  }

  const patientPhone = patient?.contactInfo?.phone || patient?.phone || patient?.contactNumber;
  const patientEmail = patient?.contactInfo?.email || patient?.email;

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
          <Typography variant="body2" color="text.secondary">
            Search and select a patient, then fill in the appointment details.
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>

            {/* Patient Search */}
            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">Patient</Typography>
              <Divider sx={{ mb: 1.5 }} />
              <PatientSearchAutocomplete
                required
                value={patient}
                onChange={handlePatientChange}
                label="Select Patient"
              />
              {formErrors.patientId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5, display: 'block' }}>
                  {formErrors.patientId}
                </Typography>
              )}
            </Grid>

            {/* Selected patient detail strip */}
            {patient && (
              <Grid item xs={12}>
                <Paper
                  variant="outlined"
                  sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: 'success.50', borderColor: 'success.light' }}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <PersonIcon fontSize="small" color="success" />
                      <Typography variant="body2" fontWeight={600}>
                        {patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()}
                      </Typography>
                      {patient.patientId && (
                        <Chip label={patient.patientId} size="small" variant="outlined" color="success"
                          sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    {patientPhone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">{patientPhone}</Typography>
                      </Box>
                    )}
                    {patientEmail && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">{patientEmail}</Typography>
                      </Box>
                    )}
                    {patient.gender && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <BadgeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {patient.gender}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Appointment Details */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="overline" color="text.secondary">Appointment Details</Typography>
              <Divider sx={{ mb: 1.5 }} />
            </Grid>

            {/* Provider */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.providerId}>
                <InputLabel id="provider-label">Provider</InputLabel>
                <Select
                  labelId="provider-label"
                  name="providerId"
                  value={formData.providerId}
                  onChange={handleInputChange}
                  label="Provider"
                  startAdornment={
                    <InputAdornment position="start">
                      <ProviderIcon fontSize="small" color="action" />
                    </InputAdornment>
                  }
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.firstName} {provider.lastName} ({provider.specialty})
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.providerId && <FormHelperText>{formErrors.providerId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Appointment Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.appointmentType}>
                <InputLabel id="appointment-type-label">Appointment Type</InputLabel>
                <Select
                  labelId="appointment-type-label"
                  name="appointmentType"
                  value={formData.appointmentType}
                  onChange={handleInputChange}
                  label="Appointment Type"
                  startAdornment={
                    <InputAdornment position="start">
                      <AppointmentTypeIcon fontSize="small" color="action" />
                    </InputAdornment>
                  }
                >
                  {appointmentTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.appointmentType && <FormHelperText>{formErrors.appointmentType}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!formErrors.location}>
                <InputLabel id="location-label">Location</InputLabel>
                <Select
                  labelId="location-label"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  label="Location"
                  startAdornment={
                    <InputAdornment position="start">
                      <LocationIcon fontSize="small" color="action" />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="in-person">In-Person</MenuItem>
                  <MenuItem value="telehealth">Telehealth</MenuItem>
                </Select>
                {formErrors.location && <FormHelperText>{formErrors.location}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Duration */}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DurationIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Date & Time */}
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

            {/* Notes */}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                      <NotesIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Actions */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={handleCancel} disabled={submitting}>
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

          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
