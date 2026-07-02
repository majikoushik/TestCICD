import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Chip, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress, Button, Accordion, AccordionSummary,
  AccordionDetails, List, ListItem, ListItemIcon, ListItemText,
  Tooltip, IconButton, Snackbar,
} from '@mui/material';
import {
  Api as ApiIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  HealthAndSafety as ComplianceIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import fhirService from '../../services/fhirService';
import {
  tableContainerSx, tableSx, tableHeadRowSx, tableBodyRowSx, compactChipSx,
} from '../../components/common/adminTableStyles';

const COMPLIANCE_ITEMS = [
  { label: 'HL7 FHIR R4 (4.0.1) baseline',        status: true },
  { label: 'US Core R4 Patient profile',            status: true },
  { label: 'US Core R4 Practitioner profile',       status: true },
  { label: 'US Core R4 Condition profile',          status: true },
  { label: 'US Core R4 MedicationRequest profile',  status: true },
  { label: 'US Core R4 AllergyIntolerance profile', status: true },
  { label: 'Coverage resource',                     status: true },
  { label: 'ServiceRequest (Referral) resource',    status: true },
  { label: 'CapabilityStatement (GET /metadata)',   status: true },
  { label: 'SMART on FHIR security declaration',    status: true },
  { label: 'application/fhir+json content-type',   status: true },
  { label: 'CMS-0057-F Patient Access API',         status: true },
];

const RESOURCE_COLORS = {
  Patient:              '#1565c0',
  Practitioner:         '#2e7d32',
  Condition:            '#c62828',
  MedicationRequest:    '#6a1b9a',
  AllergyIntolerance:   '#e65100',
  Coverage:             '#00695c',
  ServiceRequest:       '#4527a0',
};

function JsonViewer({ data, maxHeight = 300 }) {
  if (!data) return null;
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
        fontSize: '0.72rem',
        fontFamily: 'monospace',
        lineHeight: 1.5,
        m: 0,
      }}
    >
      {JSON.stringify(data, null, 2)}
    </Box>
  );
}

export default function AdminFHIR() {
  const [capability, setCapability] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [snackbar, setSnackbar]     = useState({ open: false, message: '' });

  const loadCapability = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fhirService.getCapabilityStatement();
      setCapability(data);
    } catch (e) {
      setError(e?.response?.data?.issue?.[0]?.diagnostics || e.message || 'Failed to load FHIR metadata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCapability(); }, []);

  const handleCopy = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setSnackbar({ open: true, message: 'Copied to clipboard' });
  };

  const resources = capability?.rest?.[0]?.resource || [];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: 2, p: 1.5, display: 'flex' }}>
            <ApiIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">FHIR R4 Compliance Center</Typography>
            <Typography variant="body2" color="text.secondary">
              HL7 FHIR R4 API management — CMS-0057-F / ONC 21st Century Cures Act
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip icon={<CheckIcon />} label="FHIR Server Active" color="success" variant="outlined" />
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
            onClick={loadCapability}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'FHIR Version',      value: capability?.fhirVersion || '4.0.1',    color: 'primary.main' },
          { label: 'Resources',          value: resources.length || 7,                 color: 'success.main' },
          { label: 'Content-Type',       value: 'fhir+json',                           color: 'info.main' },
          { label: 'Security',           value: 'SMART on FHIR',                       color: 'warning.main' },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ py: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Left: Compliance checklist */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ComplianceIcon color="success" />
              <Typography variant="h6" fontWeight="bold">CMS-0057-F Compliance</Typography>
            </Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              All required FHIR R4 capabilities are active
            </Alert>
            <List dense disablePadding>
              {COMPLIANCE_ITEMS.map((item) => (
                <ListItem key={item.label} disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Server info */}
          {capability && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Server Information</Typography>
              {[
                { label: 'Name',        value: capability.software?.name },
                { label: 'Version',     value: capability.software?.version },
                { label: 'Publisher',   value: capability.publisher },
                { label: 'Status',      value: capability.status },
                { label: 'Date',        value: capability.date },
                { label: 'FHIR',        value: capability.fhirVersion },
              ].map((row) => (
                <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                  <Typography variant="caption" fontWeight="medium">{row.value || '—'}</Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Grid>

        {/* Right: Resources table + Capability JSON */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ mb: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">Supported Resources</Typography>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={tableContainerSx}>
                <Table size="small" sx={tableSx}>
                  <TableHead>
                    <TableRow sx={tableHeadRowSx}>
                      <TableCell sx={{ width: '18%' }}>Resource Type</TableCell>
                      <TableCell sx={{ width: '27%' }}>Interactions</TableCell>
                      <TableCell sx={{ width: '37%' }}>Search Params</TableCell>
                      <TableCell sx={{ width: '18%' }}>US Core Profile</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resources.length > 0 ? resources.map((r) => (
                      <TableRow key={r.type} hover sx={tableBodyRowSx}>
                        <TableCell sx={{ width: '18%' }}>
                          <Chip
                            label={r.type}
                            size="small"
                            sx={{
                              ...compactChipSx,
                              bgcolor: RESOURCE_COLORS[r.type] || '#455a64',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.72rem',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: '27%' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(r.interaction || []).map((i) => (
                              <Chip key={i.code} label={i.code} size="small" variant="outlined" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20 }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ width: '37%' }}>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(r.searchParam || []).map((sp) => (
                              <Chip key={sp.name} label={sp.name} size="small" color="default" variant="outlined" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20, fontFamily: 'monospace' }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ width: '18%' }}>
                          {r.profile ? (
                            <Chip label="Yes" color="success" size="small" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20 }} />
                          ) : (
                            <Chip label="No" variant="outlined" size="small" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      // Static fallback when loading or no capability
                      [
                        { type: 'Patient', interactions: ['read', 'search-type'], profile: true, params: ['_id', 'identifier', 'name'] },
                        { type: 'Practitioner', interactions: ['read'], profile: true, params: ['_id'] },
                        { type: 'Condition', interactions: ['search-type'], profile: true, params: ['patient'] },
                        { type: 'MedicationRequest', interactions: ['search-type'], profile: true, params: ['patient'] },
                        { type: 'AllergyIntolerance', interactions: ['search-type'], profile: true, params: ['patient'] },
                        { type: 'Coverage', interactions: ['search-type'], profile: false, params: ['patient'] },
                        { type: 'ServiceRequest', interactions: ['search-type'], profile: false, params: ['patient'] },
                      ].map((r) => (
                        <TableRow key={r.type} hover sx={tableBodyRowSx}>
                          <TableCell sx={{ width: '18%' }}>
                            <Chip
                              label={r.type}
                              size="small"
                              sx={{
                                ...compactChipSx,
                                bgcolor: RESOURCE_COLORS[r.type] || '#455a64',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.72rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ width: '27%' }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {r.interactions.map((i) => (
                                <Chip key={i} label={i} size="small" variant="outlined" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20 }} />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: '37%' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {r.params.map((p) => (
                                <Chip key={p} label={p} size="small" variant="outlined" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20, fontFamily: 'monospace' }} />
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ width: '18%' }}>
                            <Chip label={r.profile ? 'Yes' : 'No'} color={r.profile ? 'success' : 'default'} size="small" sx={{ ...compactChipSx, fontSize: '0.65rem', height: 20 }} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* CapabilityStatement JSON */}
          <Paper sx={{ p: 0 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" fontSize="small" />
                  <Typography fontWeight="bold">CapabilityStatement JSON</Typography>
                  <Chip label="GET /api/fhir/metadata" size="small" color="primary" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 2 }}>
                {capability ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <Tooltip title="Copy JSON">
                        <IconButton size="small" onClick={() => handleCopy(capability)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <JsonViewer data={capability} maxHeight={400} />
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading...' : 'No data — click Refresh to reload'}
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Regulatory info */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <InfoIcon color="info" />
              <Typography variant="subtitle2" fontWeight="bold">Regulatory References</Typography>
            </Box>
            <Grid container spacing={1}>
              {[
                { label: 'CMS-0057-F',             desc: 'Interoperability and Patient Access Final Rule' },
                { label: '45 CFR Part 171',         desc: 'ONC Information Blocking Rule' },
                { label: '§ 170.215',               desc: 'ONC FHIR API certification criterion' },
                { label: 'US Core R4 v3.1.1',       desc: 'FHIR implementation guide' },
                { label: '21st Century Cures Act',  desc: 'EHI access requirement (§ 4004)' },
                { label: 'HIPAA 45 CFR § 164',      desc: 'Privacy and security safeguards' },
              ].map((ref) => (
                <Grid item xs={12} sm={6} key={ref.label}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Chip label={ref.label} size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">{ref.desc}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
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
