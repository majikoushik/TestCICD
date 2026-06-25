import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchPatientById, 
  clearCurrentPatient,
  selectCurrentPatient, 
  selectPatientsLoading, 
  selectPatientsError 
} from '../../redux/slices/patientsSlice';
import { createConsentRecord } from '../../services/patientService';
import { ModernLoadingIndicator } from '../../components/common';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Tabs,
  Tab,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Assignment as AssignmentIcon,
  LocalHospital as MedicalIcon,
  Warning as WarningIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
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

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get state from Redux store using selectors
  const patient = useSelector(selectCurrentPatient);
  const loading = useSelector(selectPatientsLoading);
  const error = useSelector(selectPatientsError);
  
  // Local UI state
  const [tabValue, setTabValue] = useState(0);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [accessLevel, setAccessLevel] = useState('limited');

  useEffect(() => {
    // Fetch patient details using Redux thunk
    dispatch(fetchPatientById(id));
    
    // Cleanup function to clear current patient when component unmounts
    return () => {
      dispatch(clearCurrentPatient());
    };
  }, [dispatch, id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditPatient = () => {
    // Navigate to the edit patient page
    navigate(`/app/patients/edit/${id}`);
  };

  const handleOpenConsentDialog = () => {
    setConsentDialogOpen(true);
  };

  const handleCloseConsentDialog = () => {
    setConsentDialogOpen(false);
    setSelectedProvider('');
    setAccessLevel('limited');
  };

  const handleGrantConsent = async () => {
    try {
      // Create a new consent record
      const newConsent = {
        providerId: Math.random().toString(36).substring(2, 15),
        providerName: selectedProvider,
        organization: 'Sample Organization',
        accessLevel: accessLevel,
        dataElements: accessLevel === 'full' ? ['all'] : 
                     accessLevel === 'partial' ? ['demographics', 'medications'] : ['demographics'],
        consentDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        blockchainTransactionId: `tx_${Math.random().toString(36).substring(2, 15)}`
      };
      
      // Call the patientService to save the consent
      await createConsentRecord(id, newConsent);
      
      // After creating consent, refresh patient data to get updated consent records
      dispatch(fetchPatientById(id));
      
      // Close dialog and reset form
      setConsentDialogOpen(false);
      setSelectedProvider('');
      setAccessLevel('limited');
    } catch (error) {
      console.error('Error granting consent:', error);
      // Handle error (could show an error message)
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Get risk level based on risk score
  const getRiskLevel = (score) => {
    if (score >= 70) {
      return { level: 'High', color: 'error' };
    } else if (score >= 30) {
      return { level: 'Medium', color: 'warning' };
    } else {
      return { level: 'Low', color: 'success' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <ModernLoadingIndicator variant="dots" message="Loading patient details..." />
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
          onClick={() => navigate('/app/patients')}
        >
          Back to Patients
        </Button>
      </Container>
    );
  }

  if (!patient) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="warning">Patient not found</Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/app/patients')}
        >
          Back to Patients
        </Button>
      </Container>
    );
  }

  const riskInfo = getRiskLevel(patient.riskScore);
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '';
  const phone = patient.contactInfo ? patient.contactInfo.phone : '';
  const email = patient.contactInfo ? patient.contactInfo.email : '';
  const address = patient.contactInfo ? patient.contactInfo.address : '';
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Patient Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/app/patients')}
          sx={{ mb: 2 }}
        >
          Back to Patients
        </Button>
      </Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', mr: 2 }}>
                <PersonIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1">
                  {patient.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  ID: {patient.patientId} | {calculateAge(patient.birthDate)} years | {gender}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
            <Box>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                sx={{ mr: 1 }}
                onClick={handleEditPatient}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleOpenConsentDialog}
              >
                Grant Access
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Primary Provider
              </Typography>
              <Typography variant="body1">
                {patient.primaryProvider}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Date of Birth
              </Typography>
              <Typography variant="body1">
                {formatDate(patient.birthDate)}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Contact
              </Typography>
              <Typography variant="body1">
                {phone}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Risk Level
              </Typography>
              <Chip
                label={riskInfo.level}
                color={riskInfo.color}
                size="small"
                icon={riskInfo.level === 'High' ? <WarningIcon /> : undefined}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Patient Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="patient tabs">
            <Tab label="Overview" id="patient-tab-0" aria-controls="patient-tabpanel-0" />
            <Tab label="Medical History" id="patient-tab-1" aria-controls="patient-tabpanel-1" />
            <Tab label="Medications" id="patient-tab-2" aria-controls="patient-tabpanel-2" />
            <Tab label="Consent Records" id="patient-tab-3" aria-controls="patient-tabpanel-3" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Patient Information
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {patient.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Patient ID
                    </Typography>
                    <Typography variant="body1">
                      {patient.patientId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {phone}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">
                      {address}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              
              <Typography variant="h6" gutterBottom>
                Insurance Information
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Insurance Provider
                    </Typography>
                    <Typography variant="body1">
                      {patient.insuranceInfo?.provider}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Policy Number
                    </Typography>
                    <Typography variant="body1">
                      {patient.insuranceInfo?.policyNumber}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Group Number
                    </Typography>
                    <Typography variant="body1">
                      {patient.insuranceInfo?.groupNumber}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Recent Visits
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                {patient.recentVisits?.map((visit, index) => (
                  <Box key={index} sx={{ mb: index < patient.recentVisits.length - 1 ? 2 : 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {formatDate(visit.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {visit.provider}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {visit.reason}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {visit.notes}
                    </Typography>
                    {index < patient.recentVisits.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </Box>
                ))}
              </Paper>
              
              <Typography variant="h6" gutterBottom>
                Allergies
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {patient.allergies?.length > 0 ? (
                  <List dense>
                    {patient.allergies?.map((allergy, index) => (
                      <ListItem key={index} disablePadding>
                        <ListItemText
                          primary={allergy.allergen}
                          secondary={`${allergy.reaction} (${allergy.severity})`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No known allergies
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Medical History Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Medical Conditions
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            {patient.medicalHistory?.length > 0 ? (
              patient.medicalHistory?.map((condition, index) => (
                <Box key={index} sx={{ mb: index < patient.medicalHistory.length - 1 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      {condition.condition}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Diagnosed: {formatDate(condition.diagnosedDate)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {condition.notes}
                  </Typography>
                  {index < patient.medicalHistory.length - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No medical conditions recorded
              </Typography>
            )}
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => alert('Add medical condition functionality would be implemented here')}
            >
              Add Condition
            </Button>
          </Box>
        </TabPanel>
        
        {/* Medications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Current Medications
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            {patient.medications?.length > 0 ? (
              patient.medications?.map((medication, index) => (
                <Box key={index} sx={{ mb: index < patient.medications.length - 1 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      {medication.name} {medication.dosage}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => alert('Edit medication functionality would be implemented here')}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2">
                    {medication.frequency}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Started: {formatDate(medication.startDate)}
                  </Typography>
                  {index < patient.medications.length - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No medications recorded
              </Typography>
            )}
          </Paper>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => alert('Add medication functionality would be implemented here')}
            >
              Add Medication
            </Button>
          </Box>
        </TabPanel>
        
        {/* Consent Records Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/app/patients')}
                sx={{ mr: 2 }}
              >
                Back to Patients
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" component="h1">
                {patient.name}
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditPatient}
              >
                Edit Patient
              </Button>
            </Box>
          </Box>
          
          <Paper variant="outlined" sx={{ p: 2 }}>
            {patient.consentRecords?.length > 0 ? (
              patient.consentRecords?.map((consent, index) => (
                <Box key={index} sx={{ mb: index < patient.consentRecords.length - 1 ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1">
                      {consent.providerName}
                    </Typography>
                    <Chip
                      label={consent.accessLevel.charAt(0).toUpperCase() + consent.accessLevel.slice(1)}
                      color={
                        consent.accessLevel === 'full' ? 'success' :
                        consent.accessLevel === 'partial' ? 'primary' : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {consent.organization}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Granted: {formatDate(consent.consentDate)} | Expires: {formatDate(consent.expiryDate)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => alert('Revoke consent functionality would be implemented here')}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" component="div" sx={{ mt: 1, fontFamily: 'monospace' }}>
                    Transaction: {consent.blockchainTransactionId}
                  </Typography>
                  {index < patient.consentRecords.length - 1 && (
                    <Divider sx={{ my: 1 }} />
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No consent records found
              </Typography>
            )}
          </Paper>
        </TabPanel>
      </Paper>
      
      {/* Consent Dialog */}
      <Dialog open={consentDialogOpen} onClose={handleCloseConsentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Grant Access to Patient Data</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              margin="dense"
              label="Provider Name"
              fullWidth
              variant="outlined"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              margin="dense"
              label="Access Level"
              fullWidth
              variant="outlined"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="limited">Limited</option>
              <option value="partial">Partial</option>
              <option value="full">Full</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConsentDialog}>Cancel</Button>
          <Button 
            onClick={handleGrantConsent} 
            variant="contained" 
            disabled={!selectedProvider}
          >
            Grant Access
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
