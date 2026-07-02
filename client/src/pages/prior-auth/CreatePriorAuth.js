import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Chip, Alert, Stepper, Step, StepLabel, Divider,
  Avatar, IconButton, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Description as DescriptionIcon, Send as SendIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { createPriorAuth } from '../../services/priorAuthService';
import PatientSearchAutocomplete from '../../components/common/PatientSearchAutocomplete';

const STEPS = ['Patient & Service', 'Clinical Details', 'Review & Submit'];

const COMMON_SERVICES = [
  'MRI Scan', 'CT Scan', 'PET Scan', 'X-Ray', 'Ultrasound',
  'Physical Therapy', 'Occupational Therapy', 'Speech Therapy',
  'Specialist Consultation', 'Surgical Procedure', 'Lab Testing',
  'Home Health Services', 'Durable Medical Equipment', 'Mental Health Services',
  'Infusion Therapy', 'Cardiac Catheterization', 'Colonoscopy', 'Biopsy'
];

const INSURANCE_PLANS = [
  'Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealth', 'Humana',
  'Kaiser Permanente', 'Medicare', 'Medicaid', 'Anthem', 'Centene'
];

export default function CreatePriorAuth({ open, onClose, onCreated, prefillReferralId, prefillPatient, prefillForm, renewalOf }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const buildInitialPatient = () => {
    if (prefillForm) return { _id: prefillForm.patientId, patientId: prefillForm.patientId, name: prefillForm.patientName };
    return prefillPatient || null;
  };
  const buildInitialForm = () => {
    if (prefillForm) return { ...prefillForm, referralId: prefillReferralId || prefillForm.referralId || '' };
    return {
      patientId: prefillPatient?.patientId || '',
      patientName: prefillPatient?.name || '',
      referralId: prefillReferralId || '',
      targetProviderName: '',
      serviceType: '',
      serviceCode: '',
      urgency: 'Routine',
      insurancePlan: prefillPatient?.insuranceInfo?.provider || '',
      memberId: prefillPatient?.insuranceInfo?.policyNumber || '',
      clinicalNotes: '',
      diagnosisCodes: [],
    };
  };

  const [selectedPatient, setSelectedPatient] = useState(buildInitialPatient);
  const [form, setForm] = useState(buildInitialForm);
  const [newDxCode, setNewDxCode] = useState('');
  const [newDxDesc, setNewDxDesc] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handlePatientChange = (_, patient) => {
    if (patient) {
      const name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      setSelectedPatient(patient);
      setForm(f => ({
        ...f,
        patientId: patient.patientId || patient._id || '',
        patientName: name,
        insurancePlan: f.insurancePlan || patient.insuranceInfo?.provider || '',
        memberId: f.memberId || patient.insuranceInfo?.policyNumber || ''
      }));
    } else {
      setSelectedPatient(null);
      setForm(f => ({ ...f, patientId: '', patientName: '' }));
    }
  };

  const addDiagnosis = () => {
    if (!newDxCode.trim()) return;
    setForm(f => ({
      ...f,
      diagnosisCodes: [...f.diagnosisCodes, { code: newDxCode.trim(), description: newDxDesc.trim() }]
    }));
    setNewDxCode('');
    setNewDxDesc('');
  };

  const removeDiagnosis = (i) =>
    setForm(f => ({ ...f, diagnosisCodes: f.diagnosisCodes.filter((_, idx) => idx !== i) }));

  const canNext = () => {
    if (step === 0) return !!selectedPatient && !!form.serviceType;
    if (step === 1) return form.clinicalNotes.trim().length >= 20;
    return true;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await createPriorAuth(form);
      setForm(buildInitialForm());
      setSelectedPatient(buildInitialPatient());
      setStep(0);
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to submit prior authorization request.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setStep(0); setError(null); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle component="div">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
            <AssignmentTurnedInIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {renewalOf ? `Renew Prior Authorization` : 'New Prior Authorization Request'}
          </Typography>
          <IconButton onClick={handleClose} size="small" aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {renewalOf && (
          <Alert severity="info" sx={{ mt: 1, py: 0.5 }} icon={false}>
            Renewal of PA #{String(renewalOf).slice(-8).toUpperCase()} — clinical notes are pre-filled from the expired request. Update as needed.
          </Alert>
        )}
        <Stepper activeStep={step} sx={{ mt: 2 }}>
          {STEPS.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">Patient</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <PatientSearchAutocomplete
                required
                value={selectedPatient}
                onChange={handlePatientChange}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="overline" color="text.secondary">Service Details</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Service Type</InputLabel>
                <Select value={form.serviceType} label="Service Type" onChange={set('serviceType')}>
                  {COMMON_SERVICES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="CPT Code (optional)" value={form.serviceCode}
                onChange={set('serviceCode')} placeholder="e.g. 71046" />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Urgency</InputLabel>
                <Select value={form.urgency} label="Urgency" onChange={set('urgency')}>
                  <MenuItem value="Routine">Routine</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                  <MenuItem value="Emergent">Emergent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Target Provider (optional)" value={form.targetProviderName}
                onChange={set('targetProviderName')} />
            </Grid>

            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="overline" color="text.secondary">Insurance</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Insurance Plan</InputLabel>
                <Select value={form.insurancePlan} label="Insurance Plan" onChange={set('insurancePlan')}>
                  <MenuItem value="">Not specified</MenuItem>
                  {INSURANCE_PLANS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Member ID (optional)" value={form.memberId}
                onChange={set('memberId')} />
            </Grid>
            {form.referralId && (
              <Grid item xs={12}>
                <Alert severity="info">Linked to Referral ID: {form.referralId}</Alert>
              </Grid>
            )}
          </Grid>
        )}

        {step === 1 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="overline" color="text.secondary">Clinical Justification</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth required multiline rows={5}
                label="Clinical Notes (min 20 characters)"
                value={form.clinicalNotes}
                onChange={set('clinicalNotes')}
                placeholder="Describe the medical necessity, patient history, and clinical justification..."
                helperText={
                  form.clinicalNotes.length < 20
                    ? `${20 - form.clinicalNotes.length} more characters required`
                    : 'Clinical notes look good'
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                      <DescriptionIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography variant="overline" color="text.secondary">Diagnosis Codes (ICD-10)</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <TextField size="small" label="ICD-10 Code" value={newDxCode}
                  onChange={e => setNewDxCode(e.target.value)} placeholder="e.g. M54.5"
                  sx={{ width: 150 }} />
                <TextField size="small" label="Description" value={newDxDesc}
                  onChange={e => setNewDxDesc(e.target.value)} placeholder="e.g. Low back pain"
                  sx={{ flexGrow: 1 }} />
                <Button variant="outlined" size="small" startIcon={<AddIcon />}
                  onClick={addDiagnosis} disabled={!newDxCode.trim()}>Add</Button>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {form.diagnosisCodes.map((d, i) => (
                  <Chip key={i}
                    label={`${d.code}${d.description ? ': ' + d.description : ''}`}
                    onDelete={() => removeDiagnosis(i)} deleteIcon={<DeleteIcon />}
                    size="small" variant="outlined" />
                ))}
              </Box>
            </Grid>
          </Grid>
        )}

        {step === 2 && (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Review Your Request</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
              <Typography>{form.patientName}</Typography>
              <Typography variant="caption" color="text.secondary">{form.patientId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Service</Typography>
              <Typography>{form.serviceType} {form.serviceCode ? `(CPT: ${form.serviceCode})` : ''}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Urgency</Typography>
              <Chip label={form.urgency} size="small"
                color={form.urgency === 'Emergent' ? 'error' : form.urgency === 'Urgent' ? 'warning' : 'default'} />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" color="text.secondary">Insurance</Typography>
              <Typography>{form.insurancePlan || 'Not specified'}{form.memberId ? ` · ${form.memberId}` : ''}</Typography>
            </Grid>
            {form.diagnosisCodes.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Diagnosis Codes</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {form.diagnosisCodes.map((d, i) => (
                    <Chip key={i} label={`${d.code}: ${d.description}`} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Clinical Notes</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{form.clinicalNotes}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                After submission, our AI system will automatically analyze this request and provide
                a recommendation. You will be notified of the final decision.
              </Alert>
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        {step < 2
          ? <Button variant="contained" endIcon={<NavigateNextIcon />} disabled={!canNext()} onClick={() => setStep(s => s + 1)}>Next</Button>
          : <Button variant="contained" color="primary" startIcon={loading ? undefined : <SendIcon />} disabled={loading} onClick={handleSubmit}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
        }
      </DialogActions>
    </Dialog>
  );
}
