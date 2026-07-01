import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as referralService from '../../services/referralService';
import { getPatientById } from '../../services/patientService';
import { ModernLoadingIndicator } from '../../components/common';
import PatientSearchAutocomplete from '../../components/common/PatientSearchAutocomplete';
import AIProviderSuggestions from '../../components/referral/AIProviderSuggestions';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Autocomplete,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const steps = ['Select Patient', 'Provider Information', 'Referral Details'];

export default function CreateReferral() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId') || null;
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [referralData, setReferralData] = useState({
    // Patient information
    patient: null,
    
    // Provider information
    receivingProvider: null,
    
    // Referral details
    reason: '',
    urgency: 'routine',
    notes: '',
    appointmentDate: '',
    attachedRecords: []
  });
  
  const [referralSpecialty, setReferralSpecialty] = useState('');

  // Data for dropdowns
  const [providers, setProviders] = useState([]);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState({
    providers: true,
    records: false
  });

  useEffect(() => {
    // Fetch providers
    const fetchProviders = async () => {
      try {
        setLoading(prev => ({ ...prev, providers: true }));
        const response = await referralService.getProviders();
        setProviders(response.data ? response.data : response);
      } catch (err) {
        console.error('Error fetching providers:', err);
        setError('Failed to load providers. Please try again later.');
      } finally {
        setLoading(prev => ({ ...prev, providers: false }));
      }
    };

    fetchProviders();
  }, []);

  // Pre-populate patient when coming from the Patients page (?patientId=) —
  // the user already picked a patient there, so don't make them search again.
  useEffect(() => {
    if (!preselectedPatientId) return;
    getPatientById(preselectedPatientId)
      .then((res) => {
        const patient = res?.data || res;
        if (patient) {
          setReferralData((prev) => ({ ...prev, patient }));
        }
      })
      .catch((err) => {
        console.error('Error pre-loading selected patient:', err);
      });
  }, [preselectedPatientId]);

  // Fetch patient records when patient is selected
  useEffect(() => {
    let isMounted = true;
    const fetchPatientRecords = async () => {
      if (!referralData.patient) return;

      try {
        setLoading(prev => ({ ...prev, records: true }));

        // In a real app, this would be an API call to fetch patient records
        // For this demo, we'll simulate the data

        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate patient records
        const mockRecords = [
          {
            id: `rec-${Math.random().toString(36).substring(2, 10)}`,
            recordType: 'Lab Results',
            date: new Date(2023, 5, 10).toISOString(),
            description: 'Complete Blood Count (CBC)'
          },
          {
            id: `rec-${Math.random().toString(36).substring(2, 10)}`,
            recordType: 'ECG Report',
            date: new Date(2023, 5, 15).toISOString(),
            description: 'Electrocardiogram'
          },
          {
            id: `rec-${Math.random().toString(36).substring(2, 10)}`,
            recordType: 'Imaging',
            date: new Date(2023, 4, 20).toISOString(),
            description: 'Chest X-Ray'
          },
          {
            id: `rec-${Math.random().toString(36).substring(2, 10)}`,
            recordType: 'Medical History',
            date: new Date(2023, 3, 5).toISOString(),
            description: 'Patient Medical History'
          }
        ];

        if (isMounted) {
          setPatientRecords(mockRecords);
        }
      } catch (err) {
        console.error('Error fetching patient records:', err);
      } finally {
        if (isMounted) {
          setLoading(prev => ({ ...prev, records: false }));
        }
      }
    };

    fetchPatientRecords();
    return () => { isMounted = false; };
  }, [referralData.patient]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReferralData({
      ...referralData,
      [name]: value
    });
  };

  const handlePatientChange = (event, newValue) => {
    setReferralData({
      ...referralData,
      patient: newValue,
      attachedRecords: [] // Reset attached records when patient changes
    });
  };

  const handleProviderChange = (event, newValue) => {
    setReferralData({
      ...referralData,
      receivingProvider: newValue
    });
  };

  const handleRecordsChange = (event, newValue) => {
    setReferralData({
      ...referralData,
      attachedRecords: newValue
    });
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0:
        // Validate patient selection
        return !!referralData.patient;
      case 1:
        // Validate provider selection
        return !!referralData.receivingProvider;
      case 2:
        // Validate referral details
        return !!referralData.reason;
      default:
        return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Map full objects to IDs expected by the backend
      const payload = {
        patientId: referralData.patient?._id || referralData.patient?.id,
        receivingProviderId: referralData.receivingProvider?._id || referralData.receivingProvider?.id,
        reason: referralData.reason,
        urgency: referralData.urgency,
        notes: referralData.notes,
        appointmentDate: referralData.appointmentDate,
        attachedRecords: referralData.attachedRecords,
      };
      const response = await referralService.createReferral(payload);
      
      console.log('Created referral:', response);
      
      // Show success message
      setSuccess(true);
      
      // Redirect to referrals list after a delay
      setTimeout(() => {
        navigate('/app/referrals');
      }, 2000);
    } catch (err) {
      console.error('Error creating referral:', err);
      setError('Failed to create referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Patient
            </Typography>
            <PatientSearchAutocomplete
              required
              value={referralData.patient}
              onChange={handlePatientChange}
              sx={{ mb: 3 }}
            />
            
            {referralData.patient && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Patient Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {referralData.patient.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Patient ID
                    </Typography>
                    <Typography variant="body1">
                      {referralData.patient.patientId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Date of Birth
                    </Typography>
                    <Typography variant="body1">
                      {new Date(referralData.patient.dateOfBirth || referralData.patient.birthDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Gender
                    </Typography>
                    <Typography variant="body1">
                      {referralData.patient.gender
                        ? referralData.patient.gender.charAt(0).toUpperCase() + referralData.patient.gender.slice(1)
                        : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Provider Information
            </Typography>
            <TextField
              label="Specialty Needed (for AI matching)"
              size="small"
              fullWidth
              value={referralSpecialty}
              onChange={(e) => setReferralSpecialty(e.target.value)}
              placeholder="e.g. Cardiology, Neurology, Orthopedics..."
              sx={{ mb: 2 }}
            />
            <AIProviderSuggestions
              specialty={referralSpecialty}
              patientInsurance={referralData.patient?.insurance || ''}
              patientCity={referralData.patient?.city || ''}
              patientState={referralData.patient?.state || ''}
              urgency={referralData.urgency}
              selectedProviderId={referralData.receivingProvider?._id}
              onSelectProvider={(match) => {
                setReferralData(prev => ({
                  ...prev,
                  receivingProvider: {
                    _id: match._id,
                    name: match.providerName,
                    specialty: match.specialty,
                    organization: match.organizationName || '',
                  }
                }));
              }}
            />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
              Or search all providers:
            </Typography>
            <Autocomplete
              options={providers}
              loading={loading.providers}
              getOptionLabel={(option) => `${option.name} (${option.specialty})`}
              value={referralData.receivingProvider}
              onChange={handleProviderChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Receiving Provider"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.providers ? <CircularProgress variant="button" color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.specialty} | {option.organization}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ mb: 3 }}
            />
            
            {referralData.receivingProvider && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Provider Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {referralData.receivingProvider.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Specialty
                    </Typography>
                    <Typography variant="body1">
                      {referralData.receivingProvider.specialty}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Organization
                    </Typography>
                    <Typography variant="body1">
                      {referralData.receivingProvider.organization}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Referral Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Reason for Referral"
                  name="reason"
                  value={referralData.reason}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel id="urgency-label">Urgency</InputLabel>
                  <Select
                    labelId="urgency-label"
                    id="urgency"
                    name="urgency"
                    value={referralData.urgency}
                    label="Urgency"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="routine">Routine</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Appointment Date (if known)"
                  name="appointmentDate"
                  type="date"
                  value={referralData.appointmentDate}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{ min: new Date().toISOString().split('T')[0] }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={4}
                  value={referralData.notes}
                  onChange={handleInputChange}
                  placeholder="Include any additional information relevant to this referral..."
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Attach Patient Records
                </Typography>
                <Autocomplete
                  multiple
                  options={patientRecords}
                  loading={loading.records}
                  getOptionLabel={(option) => `${option.recordType}: ${option.description}`}
                  value={referralData.attachedRecords}
                  onChange={handleRecordsChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Patient Records"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.records ? <ModernLoadingIndicator variant="button" color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={`${option.recordType}: ${option.description}`}
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{option.recordType}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description} | {new Date(option.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />
                <FormHelperText>
                  Select patient records to attach to this referral
                </FormHelperText>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Create Referral
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/referrals')}
          >
            Back to Referrals
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Referral created successfully! Redirecting...
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box component="form" onSubmit={handleSubmit}>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || isSubmitting}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  type="submit"
                  startIcon={<SaveIcon />}
                  disabled={isSubmitting || !validateStep()}
                >
                  {isSubmitting ? <ModernLoadingIndicator size={24} /> : 'Create Referral'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForwardIcon />}
                  disabled={!validateStep()}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
