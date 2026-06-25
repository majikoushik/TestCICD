import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Button, Chip, Tab, Tabs,
  Alert, CircularProgress, IconButton, Tooltip, Select, MenuItem,
  FormControl, InputLabel, Accordion, AccordionSummary, AccordionDetails,
  Divider, Card, CardContent, Snackbar,
} from '@mui/material';
import {
  Api as ApiIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Code as CodeIcon,
  Person as PersonIcon,
  Medication as MedIcon,
  Vaccines as AllergyIcon,
  HealthAndSafety as InsuranceIcon,
  Assignment as ReferralIcon,
  LocalHospital as ConditionIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectAllPatients, fetchPatients } from '../../redux/slices/patientsSlice';
import { useDispatch } from 'react-redux';
import fhirService from '../../services/fhirService';

// ── JSON viewer ───────────────────────────────────────────────────────────────

function JsonViewer({ data, maxHeight = 400 }) {
  if (!data) return null;
  const text = JSON.stringify(data, null, 2);
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        overflowY: 'auto',
        overflowX: 'auto',
        maxHeight,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        lineHeight: 1.5,
        m: 0,
        '& .fhir-key':   { color: '#9c27b0' },
        '& .fhir-str':   { color: '#2e7d32' },
        '& .fhir-num':   { color: '#1565c0' },
        '& .fhir-bool':  { color: '#e65100' },
        '& .fhir-null':  { color: '#757575' },
      }}
    >
      {text}
    </Box>
  );
}

// ── Resource tab panel ────────────────────────────────────────────────────────

const RESOURCE_TABS = [
  { label: 'Patient',           key: 'patient',         icon: <PersonIcon fontSize="small" /> },
  { label: 'Conditions',        key: 'conditions',      icon: <ConditionIcon fontSize="small" /> },
  { label: 'Medications',       key: 'medications',     icon: <MedIcon fontSize="small" /> },
  { label: 'Allergies',         key: 'allergies',       icon: <AllergyIcon fontSize="small" /> },
  { label: 'Coverage',          key: 'coverage',        icon: <InsuranceIcon fontSize="small" /> },
  { label: 'Referrals (SR)',    key: 'serviceRequests', icon: <ReferralIcon fontSize="small" /> },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function FHIRExplorer() {
  const dispatch = useDispatch();
  const patients = useSelector(selectAllPatients);

  const [capabilityStmt, setCapabilityStmt] = useState(null);
  const [capabilityLoading, setCapabilityLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [resourceTab, setResourceTab] = useState(0);
  const [fhirData, setFhirData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Load patients list and capability statement on mount
  useEffect(() => {
    dispatch(fetchPatients());
    loadCapabilityStatement();
  }, [dispatch]);

  const loadCapabilityStatement = async () => {
    setCapabilityLoading(true);
    try {
      const data = await fhirService.getCapabilityStatement();
      setCapabilityStmt(data);
    } catch (e) {
      console.error('FHIR metadata error:', e);
    } finally {
      setCapabilityLoading(false);
    }
  };

  const fetchResource = useCallback(async (key, fetchFn) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: null }));
    try {
      const data = await fetchFn();
      setFhirData((prev) => ({ ...prev, [key]: data }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, [key]: e?.response?.data?.issue?.[0]?.diagnostics || e.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  const loadPatientResources = useCallback(async (patientId) => {
    if (!patientId) return;
    setFhirData({});
    setErrors({});
    const tasks = [
      { key: 'patient',         fn: () => fhirService.getFHIRPatient(patientId) },
      { key: 'conditions',      fn: () => fhirService.getFHIRConditions(patientId) },
      { key: 'medications',     fn: () => fhirService.getFHIRMedications(patientId) },
      { key: 'allergies',       fn: () => fhirService.getFHIRAllergies(patientId) },
      { key: 'coverage',        fn: () => fhirService.getFHIRCoverage(patientId) },
      { key: 'serviceRequests', fn: () => fhirService.getFHIRServiceRequests(patientId) },
    ];
    await Promise.all(tasks.map(({ key, fn }) => fetchResource(key, fn)));
  }, [fetchResource]);

  const handlePatientChange = (e) => {
    const pid = e.target.value;
    setSelectedPatientId(pid);
    loadPatientResources(pid);
    setResourceTab(0);
  };

  const handleRefresh = () => {
    if (selectedPatientId) loadPatientResources(selectedPatientId);
  };

  const handleCopy = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setSnackbar({ open: true, message: 'Copied to clipboard' });
  };

  const activeKey  = RESOURCE_TABS[resourceTab]?.key;
  const activeData = fhirData[activeKey];
  const isLoading  = loading[activeKey];
  const hasError   = errors[activeKey];

  const totalResources = Object.values(fhirData).reduce((sum, d) => {
    if (!d) return sum;
    if (d.resourceType === 'Bundle') return sum + (d.total || 0);
    return sum + 1;
  }, 0);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, p: 1.5, display: 'flex' }}>
            <ApiIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">FHIR R4 API Explorer</Typography>
            <Typography variant="body2" color="text.secondary">
              HL7 FHIR R4 (4.0.1) — ONC 21st Century Cures Act / CMS-0057-F Compliant
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip icon={<CheckIcon />} label="FHIR R4 Active" color="success" variant="outlined" size="small" />
          <Chip label="US Core Profiles" color="primary" variant="outlined" size="small" />
        </Box>
      </Box>

      {/* Compliance banner */}
      <Alert severity="info" icon={<ApiIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>CMS-0057-F Interoperability Rule:</strong> This FHIR R4 server exposes Electronic Health Information (EHI) via
          standardised HL7 FHIR R4 APIs as required by CMS for patient access. Resources follow US Core R4 profiles.
          Endpoint: <code style={{ fontFamily: 'monospace' }}>/api/fhir</code>
        </Typography>
      </Alert>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'FHIR Version',      value: '4.0.1',        color: 'primary.main' },
          { label: 'Supported Resources', value: '7',           color: 'success.main' },
          { label: 'US Core Profile',   value: 'R4 v3.1.1',    color: 'info.main' },
          { label: 'Resources Loaded',  value: totalResources,  color: 'secondary.main' },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card variant="outlined">
              <CardContent sx={{ py: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Left panel — CapabilityStatement */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 0 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" fontSize="small" />
                  <Typography fontWeight="bold">Capability Statement</Typography>
                  {capabilityLoading && <CircularProgress size={14} />}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {capabilityStmt ? (
                  <>
                    <Box sx={{ px: 2, pb: 1 }}>
                      {(capabilityStmt.rest?.[0]?.resource || []).map((r) => (
                        <Box key={r.type} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight="medium">{r.type}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {(r.interaction || []).map((i) => (
                              <Chip key={i.code} label={i.code} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                            ))}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Full JSON</Typography>
                        <Tooltip title="Copy">
                          <IconButton size="small" onClick={() => handleCopy(capabilityStmt)}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <JsonViewer data={capabilityStmt} maxHeight={200} />
                    </Box>
                  </>
                ) : (
                  <Box sx={{ p: 2 }}>
                    <Button size="small" variant="outlined" onClick={loadCapabilityStatement} disabled={capabilityLoading}>
                      Load Metadata
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Endpoint reference */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Endpoints</Typography>
            {[
              { method: 'GET', path: '/api/fhir/metadata', auth: false },
              { method: 'GET', path: '/api/fhir/Patient', auth: true },
              { method: 'GET', path: '/api/fhir/Patient/:id', auth: true },
              { method: 'GET', path: '/api/fhir/Practitioner/:id', auth: true },
              { method: 'GET', path: '/api/fhir/Condition?patient=', auth: true },
              { method: 'GET', path: '/api/fhir/MedicationRequest?patient=', auth: true },
              { method: 'GET', path: '/api/fhir/AllergyIntolerance?patient=', auth: true },
              { method: 'GET', path: '/api/fhir/Coverage?patient=', auth: true },
              { method: 'GET', path: '/api/fhir/ServiceRequest?patient=', auth: true },
            ].map((ep) => (
              <Box key={ep.path} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Chip label={ep.method} size="small" color="primary" sx={{ fontSize: '0.65rem', height: 18, minWidth: 36 }} />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ep.path}
                </Typography>
                {!ep.auth && <Chip label="public" size="small" color="success" sx={{ fontSize: '0.6rem', height: 16 }} />}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Right panel — Resource explorer */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Patient selector */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Select Patient</InputLabel>
                <Select value={selectedPatientId} label="Select Patient" onChange={handlePatientChange}>
                  {patients.map((p) => (
                    <MenuItem key={p.patientId || p._id} value={p.patientId || p._id}>
                      {p.name} — {p.patientId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title="Reload all resources">
                <span>
                  <IconButton onClick={handleRefresh} disabled={!selectedPatientId}>
                    <RefreshIcon />
                  </IconButton>
                </span>
              </Tooltip>
              {totalResources > 0 && (
                <Chip label={`${totalResources} resources`} color="primary" size="small" />
              )}
            </Box>

            {!selectedPatientId ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <ApiIcon sx={{ fontSize: 56, opacity: 0.3, mb: 2 }} />
                <Typography variant="body1">Select a patient to explore their FHIR R4 resources</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Each resource follows the corresponding US Core R4 profile
                </Typography>
              </Box>
            ) : (
              <>
                {/* Resource tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs
                    value={resourceTab}
                    onChange={(_, v) => setResourceTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {RESOURCE_TABS.map((tab, idx) => (
                      <Tab
                        key={tab.key}
                        icon={tab.icon}
                        iconPosition="start"
                        label={tab.label}
                        id={`fhir-tab-${idx}`}
                        sx={{ minHeight: 48, py: 0 }}
                      />
                    ))}
                  </Tabs>
                </Box>

                {/* Resource content */}
                {isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : hasError ? (
                  <Alert severity="error">{hasError}</Alert>
                ) : activeData ? (
                  <Box>
                    {/* Resource header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={activeData.resourceType}
                          color="primary"
                          size="small"
                        />
                        {activeData.resourceType === 'Bundle' && (
                          <Chip
                            label={`${activeData.total} entries`}
                            variant="outlined"
                            size="small"
                          />
                        )}
                        <Chip
                          label="FHIR R4"
                          variant="outlined"
                          size="small"
                          color="success"
                        />
                      </Box>
                      <Tooltip title="Copy JSON">
                        <IconButton size="small" onClick={() => handleCopy(activeData)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Summary cards for bundles */}
                    {activeData.resourceType === 'Bundle' && activeData.entry?.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Grid container spacing={1}>
                          {activeData.entry.map((entry, idx) => {
                            const r = entry.resource;
                            if (!r) return null;
                            const summary = (() => {
                              switch (r.resourceType) {
                                case 'Condition':       return r.code?.text || 'Condition';
                                case 'MedicationRequest': return r.medicationCodeableConcept?.text || 'Medication';
                                case 'AllergyIntolerance': return r.code?.text || 'Allergen';
                                case 'Coverage':        return r.payor?.[0]?.display || 'Coverage';
                                case 'ServiceRequest':  return r.code?.text || 'Referral';
                                default: return r.id;
                              }
                            })();
                            return (
                              <Grid item xs={12} sm={6} key={idx}>
                                <Paper variant="outlined" sx={{ p: 1.5 }}>
                                  <Typography variant="body2" fontWeight="medium">{summary}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    {r.resourceType}/{r.id}
                                  </Typography>
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                      </Box>
                    )}

                    <JsonViewer data={activeData} maxHeight={420} />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <Typography variant="body2">No data loaded yet</Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}
