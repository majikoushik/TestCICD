import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, Chip,
  CircularProgress, Divider, Paper,
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import PersonIcon from '@mui/icons-material/Person';
import { prescribeProgram } from '../../services/dtxService';
import PatientSearchAutocomplete from '../common/PatientSearchAutocomplete';

const EVIDENCE_LABELS = {
  fda_cleared:    'FDA Cleared',
  fda_authorized: 'FDA Authorized',
  peer_reviewed:  'Peer Reviewed',
  evidence_based: 'Evidence Based',
  clinical_study: 'Clinical Study',
};

const EVIDENCE_COLORS = {
  fda_cleared:    'success',
  fda_authorized: 'success',
  peer_reviewed:  'primary',
  evidence_based: 'info',
  clinical_study: 'secondary',
};

export default function PrescribeDtxModal({ open, onClose, program, onSuccess, prefillReferralId }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [clinicalNotes, setClinicalNotes]     = useState('');
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');

  const patientName = selectedPatient
    ? (selectedPatient.name || `${selectedPatient.firstName || ''} ${selectedPatient.lastName || ''}`.trim())
    : '';

  const handlePatientChange = (_, patient) => {
    setSelectedPatient(patient);
    if (error) setError('');
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      setError('Please select a patient to prescribe this program.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await prescribeProgram({
        programId:       program._id,
        patientName,
        patientId:       selectedPatient.patientId   || undefined,
        patientEmail:    selectedPatient.contactInfo?.email  || selectedPatient.email  || undefined,
        patientPhone:    selectedPatient.contactInfo?.phone  || selectedPatient.phone  || undefined,
        clinicalNotes:   clinicalNotes.trim() || undefined,
        linkedReferralId: prefillReferralId   || undefined,
      });
      setSelectedPatient(null);
      setClinicalNotes('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setSelectedPatient(null);
    setClinicalNotes('');
    setError('');
    onClose();
  };

  if (!program) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalPharmacyIcon color="primary" />
          <Typography variant="h6">Prescribe DTx Program</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>

        {/* ── Program summary ─────────────────────────────────────────────── */}
        <Box sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{program.name}</Typography>
              <Typography variant="caption" color="text.secondary">{program.vendor}</Typography>
            </Box>
            <Chip
              label={EVIDENCE_LABELS[program.evidenceLevel] || program.evidenceLevel}
              color={EVIDENCE_COLORS[program.evidenceLevel] || 'default'}
              size="small"
            />
          </Box>
          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            {(program.conditions || []).slice(0, 3).map(c => (
              <Chip key={c} label={c} size="small" variant="outlined" />
            ))}
            {program.durationWeeks && (
              <Chip label={`${program.durationWeeks} weeks`} size="small" variant="outlined" color="info" />
            )}
          </Box>
        </Box>

        {prefillReferralId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This prescription will be linked to the open referral.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Patient search ───────────────────────────────────────────────── */}
        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">Patient Information</Typography>
        </Divider>

        <PatientSearchAutocomplete
          value={selectedPatient}
          onChange={handlePatientChange}
          required
          label="Search Patient"
          disabled={saving}
          size="small"
        />

        {/* Selected patient confirmation card */}
        {selectedPatient && (
          <Paper
            variant="outlined"
            sx={{ mt: 1.5, mb: 2, p: 1.5, borderRadius: 2, borderColor: 'success.light', bgcolor: 'success.50' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{
                width: 38, height: 38, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <PersonIcon fontSize="small" sx={{ color: '#fff' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                  <Typography variant="body2" fontWeight={700}>{patientName}</Typography>
                  {selectedPatient.patientId && (
                    <Chip label={selectedPatient.patientId} size="small" variant="outlined"
                      sx={{ height: 18, fontSize: '0.65rem', borderRadius: '4px' }} />
                  )}
                  {selectedPatient.gender && (
                    <Chip label={selectedPatient.gender} size="small"
                      sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'grey.100', borderRadius: '4px' }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2 }}>
                  {(selectedPatient.contactInfo?.email || selectedPatient.email) && (
                    <Typography variant="caption" color="text.secondary">
                      ✉ {selectedPatient.contactInfo?.email || selectedPatient.email}
                    </Typography>
                  )}
                  {(selectedPatient.contactInfo?.phone || selectedPatient.phone) && (
                    <Typography variant="caption" color="text.secondary">
                      📞 {selectedPatient.contactInfo?.phone || selectedPatient.phone}
                    </Typography>
                  )}
                  {selectedPatient.insuranceInfo?.provider && (
                    <Typography variant="caption" color="primary.main" fontWeight={500}>
                      🏥 {selectedPatient.insuranceInfo.provider}
                      {selectedPatient.insuranceInfo.policyNumber ? ` · ${selectedPatient.insuranceInfo.policyNumber}` : ''}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* ── Clinical notes ───────────────────────────────────────────────── */}
        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          label="Clinical Notes (optional)"
          placeholder="Reason for prescribing, special instructions, goals..."
          value={clinicalNotes}
          onChange={e => setClinicalNotes(e.target.value)}
          disabled={saving}
        />

        <Alert severity="success" icon={false} sx={{ mt: 2, fontSize: '0.8rem' }}>
          Completing this program will award <strong>+{program.tokenReward || 10} tokens</strong> to your account.
        </Alert>

      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !selectedPatient}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <LocalPharmacyIcon />}
        >
          {saving ? 'Prescribing…' : 'Prescribe Program'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
