import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, updatePatient } from '../../services/patientService';
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
  IconButton
} from '@mui/material';
import { 
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config';
import { authStorage } from '../../utils/storageUtils';

const steps = ['Personal Information', 'Medical Information', 'Insurance Details'];

export default function EditPatient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [patientData, setPatientData] = useState({
    // Personal Information
    patientId: '',
    name: '',
    dateOfBirth: '',
    gender: 'male',
    contactInfo: {
      email: '',
      phone: '',
      address: ''
    },
    
    // Medical Information
    medicalHistory: [],
    medications: [],
    allergies: [],
    
    // Insurance Information
    insuranceInfo: {
      provider: '',
      policyNumber: '',
      groupNumber: ''
    }
  });

  // For managing medical history, medications, and allergies
  const [medicalCondition, setMedicalCondition] = useState({
    condition: '',
    diagnosedDate: '',
    notes: ''
  });
  
  const [medication, setMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    startDate: ''
  });
  
  const [allergy, setAllergy] = useState({
    allergen: '',
    reaction: '',
    severity: 'mild'
  });

  // Fetch patient data on component mount
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        
        // Get patient data using the patientService
        const patient = await getPatientById(id);
        
        // Format date of birth for input field
        if (patient.dateOfBirth) {
          const date = new Date(patient.dateOfBirth);
          patient.dateOfBirth = date.toISOString().split('T')[0];
        }

        // Format dates for medical history and medications
        if (patient.medicalHistory && patient.medicalHistory.length > 0) {
          patient.medicalHistory = patient.medicalHistory.map(item => ({
            ...item,
            diagnosedDate: item.diagnosedDate ? new Date(item.diagnosedDate).toISOString().split('T')[0] : ''
          }));
        }

        if (patient.medications && patient.medications.length > 0) {
          patient.medications = patient.medications.map(item => ({
            ...item,
            startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
            endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : ''
          }));
        }

        setPatientData(patient);
      } catch (err) {
        console.error('Error fetching patient:', err);
        setError('Failed to fetch patient data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatient();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setPatientData({
        ...patientData,
        [parent]: {
          ...patientData[parent],
          [child]: value
        }
      });
    } else {
      setPatientData({
        ...patientData,
        [name]: value
      });
    }
  };

  const handleMedicalConditionChange = (e) => {
    const { name, value } = e.target;
    setMedicalCondition({
      ...medicalCondition,
      [name]: value
    });
  };

  const handleAddMedicalCondition = () => {
    if (medicalCondition.condition && medicalCondition.diagnosedDate) {
      setPatientData({
        ...patientData,
        medicalHistory: [...patientData.medicalHistory, { ...medicalCondition }]
      });
      setMedicalCondition({
        condition: '',
        diagnosedDate: '',
        notes: ''
      });
    }
  };

  const handleRemoveMedicalCondition = (index) => {
    const updatedHistory = [...patientData.medicalHistory];
    updatedHistory.splice(index, 1);
    setPatientData({
      ...patientData,
      medicalHistory: updatedHistory
    });
  };

  const handleMedicationChange = (e) => {
    const { name, value } = e.target;
    setMedication({
      ...medication,
      [name]: value
    });
  };

  const handleAddMedication = () => {
    if (medication.name && medication.dosage && medication.frequency) {
      setPatientData({
        ...patientData,
        medications: [...patientData.medications, { ...medication }]
      });
      setMedication({
        name: '',
        dosage: '',
        frequency: '',
        startDate: ''
      });
    }
  };

  const handleRemoveMedication = (index) => {
    const updatedMedications = [...patientData.medications];
    updatedMedications.splice(index, 1);
    setPatientData({
      ...patientData,
      medications: updatedMedications
    });
  };

  const handleAllergyChange = (e) => {
    const { name, value } = e.target;
    setAllergy({
      ...allergy,
      [name]: value
    });
  };

  const handleAddAllergy = () => {
    if (allergy.allergen && allergy.reaction) {
      setPatientData({
        ...patientData,
        allergies: [...patientData.allergies, { ...allergy }]
      });
      setAllergy({
        allergen: '',
        reaction: '',
        severity: 'mild'
      });
    }
  };

  const handleRemoveAllergy = (index) => {
    const updatedAllergies = [...patientData.allergies];
    updatedAllergies.splice(index, 1);
    setPatientData({
      ...patientData,
      allergies: updatedAllergies
    });
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const validateStep = () => {
    switch (activeStep) {
      case 0:
        return patientData.patientId && patientData.name && patientData.dateOfBirth && patientData.gender;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      
      // Update patient using the patientService
      await updatePatient(id, patientData);
      
      // Show success message
      setSuccess(true);
      
      // Redirect to patient details after a short delay
      setTimeout(() => {
        navigate(`/app/patients/${id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error updating patient:', err);
      setError('Failed to update patient. Please try again.');
      setSuccess(false);
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
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Patient ID"
                  name="patientId"
                  value={patientData.patientId}
                  onChange={handleInputChange}
                  disabled // Patient ID should not be editable
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="name"
                  value={patientData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={patientData.dateOfBirth}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  required
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
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Contact Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="contactInfo.email"
                  value={patientData.contactInfo?.email || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="contactInfo.phone"
                  value={patientData.contactInfo?.phone || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="contactInfo.address"
                  value={patientData.contactInfo?.address || ''}
                  onChange={handleInputChange}
                  multiline
                  rows={2}
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
            
            {/* Medical History */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Medical History
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Condition"
                    name="condition"
                    value={medicalCondition.condition}
                    onChange={handleMedicalConditionChange}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
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
                <Grid item xs={12} sm={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddMedicalCondition}
                    disabled={!medicalCondition.condition || !medicalCondition.diagnosedDate}
                    sx={{ height: '100%', minWidth: '100%' }}
                  >
                    <AddIcon />
                  </Button>
                </Grid>
              </Grid>
              
              <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
                {patientData.medicalHistory && patientData.medicalHistory.length > 0 ? (
                  patientData.medicalHistory.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">
                          {item.condition}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Diagnosed: {item.diagnosedDate} {item.notes && `- ${item.notes}`}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMedicalCondition(index)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No medical history recorded
                  </Typography>
                )}
              </Paper>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Medications */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom>
                Medications
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Medication Name"
                    name="name"
                    value={medication.name}
                    onChange={handleMedicationChange}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField
                    fullWidth
                    label="Dosage"
                    name="dosage"
                    value={medication.dosage}
                    onChange={handleMedicationChange}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
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
                <Grid item xs={12} sm={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddMedication}
                    disabled={!medication.name || !medication.dosage || !medication.frequency}
                    sx={{ height: '100%', minWidth: '100%' }}
                  >
                    <AddIcon />
                  </Button>
                </Grid>
              </Grid>
              
              <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
                {patientData.medications && patientData.medications.length > 0 ? (
                  patientData.medications.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">
                          {item.name} - {item.dosage}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.frequency} {item.startDate && `- Started: ${item.startDate}`}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMedication(index)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No medications recorded
                  </Typography>
                )}
              </Paper>
            </Box>
            
            <Divider sx={{ my: 3 }} />
            
            {/* Allergies */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Allergies
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Allergen"
                    name="allergen"
                    value={allergy.allergen}
                    onChange={handleAllergyChange}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Reaction"
                    name="reaction"
                    value={allergy.reaction}
                    onChange={handleAllergyChange}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    fullWidth
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
                <Grid item xs={12} sm={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddAllergy}
                    disabled={!allergy.allergen || !allergy.reaction}
                    sx={{ height: '100%', minWidth: '100%' }}
                  >
                    <AddIcon />
                  </Button>
                </Grid>
              </Grid>
              
              <Paper variant="outlined" sx={{ mt: 2, p: 2, maxHeight: 200, overflow: 'auto' }}>
                {patientData.allergies && patientData.allergies.length > 0 ? (
                  patientData.allergies.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">
                          {item.allergen}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.reaction} - {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} severity
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveAllergy(index)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No allergies recorded
                  </Typography>
                )}
              </Paper>
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Insurance Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Insurance Provider"
                  name="insuranceInfo.provider"
                  value={patientData.insuranceInfo?.provider || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Policy Number"
                  name="insuranceInfo.policyNumber"
                  value={patientData.insuranceInfo?.policyNumber || ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Group Number"
                  name="insuranceInfo.groupNumber"
                  value={patientData.insuranceInfo?.groupNumber || ''}
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
           <ModernLoadingIndicator message="Loading alerts..." />
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Edit Patient
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/app/patients/${id}`)}
          >
            Back to Patient
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Patient updated successfully! Redirecting...
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
                  {isSubmitting ? <ModernLoadingIndicator size={24} /> : 'Update Patient'}
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
