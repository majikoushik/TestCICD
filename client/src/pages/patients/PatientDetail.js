import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPatientById,
  clearCurrentPatient,
  selectCurrentPatient,
  selectPatientDetailLoading,
  selectPatientsError
} from '../../redux/slices/patientsSlice';
import { createConsentRecord, exportPatientEHI } from '../../services/patientService';
import fhirService from '../../services/fhirService';
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
  TextField,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Api as ApiIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';

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
  const loading = useSelector(selectPatientDetailLoading);
  const error = useSelector(selectPatientsError);
  
  // Local UI state
  const [tabValue, setTabValue] = useState(0);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [accessLevel, setAccessLevel] = useState('limited');
  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // FHIR state
  const [fhirData, setFhirData] = useState(null);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [fhirError, setFhirError] = useState(null);

  useEffect(() => {
    // Fetch patient details using Redux thunk
    dispatch(fetchPatientById(id));
    
    // Cleanup function to clear current patient when component unmounts
    return () => {
      dispatch(clearCurrentPatient());
    };
  }, [dispatch, id]);

  const handleExportEHI = async () => {
    setExportLoading(true);
    try {
      const result = await exportPatientEHI(id);
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ehi-export-${patient.patientId || id}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setSnackbar({ open: true, message: 'EHI export downloaded successfully (ONC compliant)', severity: 'success' });
    } catch (err) {
      const msg = err?.response?.status === 403
        ? 'Access denied: only the primary provider or admin can export EHI'
        : 'Export failed. Please try again.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setExportLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    if (newValue === 4 && !fhirData && patient) {
      loadFHIRRecord();
    }
  };

  const loadFHIRRecord = async () => {
    if (!patient) return;
    const pid = patient.patientId || id;
    setFhirLoading(true);
    setFhirError(null);
    try {
      const bundle = await fhirService.getPatientFHIRBundle(pid);
      setFhirData(bundle);
    } catch (e) {
      setFhirError(e?.response?.data?.issue?.[0]?.diagnostics || e.message || 'Failed to load FHIR data');
    } finally {
      setFhirLoading(false);
    }
  };

  const handleCopyFHIR = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setSnackbar({ open: true, message: 'FHIR JSON copied to clipboard', severity: 'success' });
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
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const year = birthDate.getFullYear();
    if (isNaN(year) || year < 1900 || birthDate > today) return 'Invalid date';
    let age = today.getFullYear() - year;
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
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
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', mr: 2 }}>
                <PersonIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1">
                  {patient.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  ID: {patient.patientId} | {calculateAge(patient.dateOfBirth || patient.birthDate)} years | {gender}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center' }}>
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
                sx={{ mr: 1 }}
              >
                Grant Access
              </Button>
              <Button
                variant="outlined"                
                startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleExportEHI}
                disabled={exportLoading}
                title="Export full Electronic Health Information (ONC 21st Century Cures Act)"
              >
                Export EHI
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
                {patient.primaryProviderName || patient.primaryProvider}
              </Typography>
              {(patient.primaryProviderSpecialty || patient.primaryProviderOrganization) && (
                <Typography variant="body2" color="text.secondary">
                  {[patient.primaryProviderSpecialty, patient.primaryProviderOrganization].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Date of Birth
              </Typography>
              <Typography variant="body1">
                {formatDate(patient.dateOfBirth || patient.birthDate)}
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
            <Tab
              label="FHIR R4 Record"
              id="patient-tab-4"
              aria-controls="patient-tabpanel-4"
              icon={<ApiIcon fontSize="small" />}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
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

        {/* FHIR R4 Record Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ApiIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">FHIR R4 Patient Record</Typography>
              <Chip label="HL7 FHIR R4" color="primary" size="small" />
              <Chip label="US Core Profiles" color="success" size="small" variant="outlined" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Reload FHIR data">
                <span>
                  <IconButton size="small" onClick={loadFHIRRecord} disabled={fhirLoading}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Patient data exposed as HL7 FHIR R4 resources per <strong>CMS-0057-F Interoperability Rule</strong>.
              Each resource follows US Core R4 profiles. Endpoint: <code style={{ fontFamily: 'monospace' }}>/api/fhir/Patient/{patient?.patientId || id}</code>
            </Typography>
          </Alert>

          {fhirLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {fhirError && (
            <Alert severity="error" sx={{ mb: 2 }}>{fhirError}</Alert>
          )}

          {!fhirData && !fhirLoading && !fhirError && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ApiIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                FHIR R4 resources not yet loaded
              </Typography>
              <Button variant="outlined" startIcon={<ApiIcon />} onClick={loadFHIRRecord} sx={{ mt: 1 }}>
                Load FHIR Record
              </Button>
            </Box>
          )}

          {fhirData && !fhirLoading && (
            <Grid container spacing={2}>
              {[
                { key: 'patient',         label: 'Patient',               resourceType: 'Patient',              isSingle: true },
                { key: 'conditions',      label: 'Conditions',            resourceType: 'Condition',            isSingle: false },
                { key: 'medications',     label: 'Medications',           resourceType: 'MedicationRequest',    isSingle: false },
                { key: 'allergies',       label: 'Allergy Intolerances',  resourceType: 'AllergyIntolerance',   isSingle: false },
                { key: 'coverage',        label: 'Coverage',              resourceType: 'Coverage',             isSingle: false },
                { key: 'serviceRequests', label: 'Service Requests',      resourceType: 'ServiceRequest',       isSingle: false },
              ].map(({ key, label, resourceType, isSingle }) => {
                const data = fhirData[key];
                const count = isSingle ? 1 : (data?.total ?? 0);
                return (
                  <Grid item xs={12} sm={6} key={key}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon fontSize="small" color="success" />
                          <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Chip label={resourceType} size="small" color="primary" sx={{ fontSize: '0.65rem', height: 20 }} />
                          {!isSingle && <Chip label={`${count} entries`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                          <Tooltip title="Copy JSON">
                            <IconButton size="small" onClick={() => handleCopyFHIR(data)}>
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box
                        component="pre"
                        sx={{
                          bgcolor: 'grey.50',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          p: 1.5,
                          overflowY: 'auto',
                          overflowX: 'auto',
                          maxHeight: 200,
                          fontSize: '0.7rem',
                          fontFamily: 'monospace',
                          lineHeight: 1.4,
                          m: 0,
                        }}
                      >
                        {data ? JSON.stringify(data, null, 2) : 'No data'}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* EHI Export Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

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
