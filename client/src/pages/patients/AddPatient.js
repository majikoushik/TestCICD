import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient } from '../../services/patientService';
import { ModernLoadingIndicator } from '../../components/common'; 
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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Person as PersonIcon,
  Event as EventIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  MedicalServices as MedicalServicesIcon,
  Medication as MedicationIcon,
  Warning as WarningIcon,
  LocalHospital as LocalHospitalIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';

const steps = ['Personal Information', 'Medical Information', 'Insurance Details'];

export default function AddPatient() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [patientData, setPatientData] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'male',
    contactInfo: { email: '', phone: '', address: '' },
    insuranceInfo: { provider: '', policyNumber: '', groupNumber: '' }
  });

  // Separate state for lists — keeps display updates instant and independent
  const [medicalHistoryItems, setMedicalHistoryItems] = useState([]);
  const [medicationItems, setMedicationItems] = useState([]);
  const [allergyItems, setAllergyItems] = useState([]);

  const [medicalCondition, setMedicalCondition] = useState({ condition: '', diagnosedDate: '', notes: '' });
  const [medication, setMedication] = useState({ name: '', dosage: '', frequency: '', startDate: '' });
  const [allergy, setAllergy] = useState({ allergen: '', reaction: '', severity: 'mild' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setPatientData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setPatientData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMedicalConditionChange = (e) => {
    const { name, value } = e.target;
    setMedicalCondition(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMedicalCondition = () => {
    if (medicalCondition.condition) {
      setMedicalHistoryItems(prev => [...prev, { ...medicalCondition }]);
      setMedicalCondition({ condition: '', diagnosedDate: '', notes: '' });
    }
  };

  const handleRemoveMedicalCondition = (index) => {
    setMedicalHistoryItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (e) => {
    const { name, value } = e.target;
    setMedication(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMedication = () => {
    if (medication.name) {
      setMedicationItems(prev => [...prev, { ...medication }]);
      setMedication({ name: '', dosage: '', frequency: '', startDate: '' });
    }
  };

  const handleRemoveMedication = (index) => {
    setMedicationItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAllergyChange = (e) => {
    const { name, value } = e.target;
    setAllergy(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAllergy = () => {
    if (allergy.allergen) {
      setAllergyItems(prev => [...prev, { ...allergy }]);
      setAllergy({ allergen: '', reaction: '', severity: 'mild' });
    }
  };

  const handleRemoveAllergy = (index) => {
    setAllergyItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0: {
        if (!patientData.name || !patientData.dateOfBirth || !patientData.contactInfo.phone) return false;
        const dob = new Date(patientData.dateOfBirth);
        const year = dob.getFullYear();
        return year >= 1900 && dob <= new Date();
      }
      case 1:
        // Medical information is optional
        return true;
      case 2:
        // Insurance information is optional
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      await createPatient({
        ...patientData,
        medicalHistory: medicalHistoryItems,
        medications: medicationItems,
        allergies: allergyItems,
      });
      
      // Show success message
      setSuccess(true);
      
      // Navigate to patients list after a delay
      setTimeout(() => {
        navigate('/app/patients');
      }, 2000);
    } catch (err) {
      console.error('Error creating patient:', err);
      setError('Failed to create patient. Please try again.');
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
              Personal Information
            </Typography>

            <Typography variant="overline" color="text.secondary">
              Basic Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={patientData.name}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Patient ID"
                  value="Auto-generated on save"
                  disabled
                  helperText="Unique ID is automatically created from the patient's name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={patientData.dateOfBirth}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{ min: '1900-01-01', max: new Date().toISOString().split('T')[0] }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EventIcon fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Gender</FormLabel>
                  <RadioGroup
                    row
                    name="gender"
                    value={patientData.gender}
                    onChange={handleInputChange}
                  >
                    <FormControlLabel value="male" control={<Radio />} label="Male" />
                    <FormControlLabel value="female" control={<Radio />} label="Female" />
                    <FormControlLabel value="other" control={<Radio />} label="Other" />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="overline" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
              Contact Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Email"
                  name="contactInfo.email"
                  type="email"
                  value={patientData.contactInfo.email}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Phone"
                  name="contactInfo.phone"
                  value={patientData.contactInfo.phone}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="contactInfo.address"
                  value={patientData.contactInfo.address}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mt: 1, alignSelf: 'flex-start' }}>
                        <LocationOnIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Medical Information
            </Typography>
            
            {/* Medical Conditions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
              <MedicalServicesIcon fontSize="small" color="action" />
              <Typography variant="overline" color="text.secondary">
                Medical Conditions
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Condition"
                  name="condition"
                  value={medicalCondition.condition}
                  onChange={handleMedicalConditionChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Diagnosed Date"
                  name="diagnosedDate"
                  type="date"
                  value={medicalCondition.diagnosedDate}
                  onChange={handleMedicalConditionChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{ min: '1900-01-01', max: new Date().toISOString().split('T')[0] }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  value={medicalCondition.notes}
                  onChange={handleMedicalConditionChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleAddMedicalCondition}
                  disabled={!medicalCondition.condition}
                >
                  Add Condition
                </Button>
              </Grid>
            </Grid>

            {medicalHistoryItems.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                {medicalHistoryItems.map((condition, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1">{condition.condition}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {condition.diagnosedDate && `Diagnosed: ${condition.diagnosedDate}`}{condition.notes && ` - ${condition.notes}`}
                      </Typography>
                    </Box>
                    <Button type="button" size="small" color="error" onClick={() => handleRemoveMedicalCondition(index)}>
                      Remove
                    </Button>
                  </Box>
                ))}
              </Paper>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            {/* Medications */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
              <MedicationIcon fontSize="small" color="action" />
              <Typography variant="overline" color="text.secondary">
                Medications
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Medication Name"
                  name="name"
                  value={medication.name}
                  onChange={handleMedicationChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Dosage"
                  name="dosage"
                  value={medication.dosage}
                  onChange={handleMedicationChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Frequency"
                  name="frequency"
                  value={medication.frequency}
                  onChange={handleMedicationChange}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={medication.startDate}
                  onChange={handleMedicationChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleAddMedication}
                  disabled={!medication.name}
                >
                  Add Medication
                </Button>
              </Grid>
            </Grid>

            {medicationItems.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                {medicationItems.map((med, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1">{med.name}{med.dosage && ` - ${med.dosage}`}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {med.frequency}{med.startDate && ` - Started: ${med.startDate}`}
                      </Typography>
                    </Box>
                    <Button type="button" size="small" color="error" onClick={() => handleRemoveMedication(index)}>
                      Remove
                    </Button>
                  </Box>
                ))}
              </Paper>
            )}
            
            <Divider sx={{ my: 3 }} />
            
            {/* Allergies */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3 }}>
              <WarningIcon fontSize="small" color="action" />
              <Typography variant="overline" color="text.secondary">
                Allergies
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Allergen"
                  name="allergen"
                  value={allergy.allergen}
                  onChange={handleAllergyChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Reaction"
                  name="reaction"
                  value={allergy.reaction}
                  onChange={handleAllergyChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Severity"
                  name="severity"
                  value={allergy.severity}
                  onChange={handleAllergyChange}
                >
                  <MenuItem value="mild">Mild</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="severe">Severe</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={handleAddAllergy}
                  disabled={!allergy.allergen}
                >
                  Add Allergy
                </Button>
              </Grid>
            </Grid>

            {allergyItems.length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                {allergyItems.map((item, index) => (
                  <Box key={index} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1">{item.allergen}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.reaction && `${item.reaction} - `}{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} severity
                      </Typography>
                    </Box>
                    <Button type="button" size="small" color="error" onClick={() => handleRemoveAllergy(index)}>
                      Remove
                    </Button>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Insurance Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Insurance Provider"
                  name="insuranceInfo.provider"
                  value={patientData.insuranceInfo.provider}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocalHospitalIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Policy Number"
                  name="insuranceInfo.policyNumber"
                  value={patientData.insuranceInfo.policyNumber}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Group Number"
                  name="insuranceInfo.groupNumber"
                  value={patientData.insuranceInfo.groupNumber}
                  onChange={handleInputChange}
                />
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
            Add New Patient
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/app/patients')}
          >
            Back to Patients
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Patient created successfully! Redirecting...
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box>
          {getStepContent(activeStep)}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              type="button"
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
                  onClick={handleSubmit}
                  startIcon={<SaveIcon />}
                  disabled={isSubmitting || !validateStep()}
                >
                  {isSubmitting ? <ModernLoadingIndicator size={24} /> : 'Save Patient'}
                </Button>
              ) : (
                <Button
                  type="button"
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
