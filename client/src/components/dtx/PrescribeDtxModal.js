import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, Chip,
  CircularProgress, Divider, Grid,
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import { prescribeProgram } from '../../services/dtxService';

const EVIDENCE_LABELS = {
  fda_cleared: 'FDA Cleared',
  fda_authorized: 'FDA Authorized',
  peer_reviewed: 'Peer Reviewed',
  evidence_based: 'Evidence Based',
  clinical_study: 'Clinical Study',
};

const EVIDENCE_COLORS = {
  fda_cleared: 'success',
  fda_authorized: 'success',
  peer_reviewed: 'primary',
  evidence_based: 'info',
  clinical_study: 'secondary',
};

export default function PrescribeDtxModal({ open, onClose, program, onSuccess, prefillReferralId }) {
  const [form, setForm] = useState({
    patientName: '',
    patientId: '',
    patientEmail: '',
    patientPhone: '',
    clinicalNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.patientName.trim()) {
      setError('Patient name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await prescribeProgram({
        programId: program._id,
        patientName: form.patientName.trim(),
        patientId: form.patientId.trim() || undefined,
        patientEmail: form.patientEmail.trim() || undefined,
        patientPhone: form.patientPhone.trim() || undefined,
        clinicalNotes: form.clinicalNotes.trim() || undefined,
        linkedReferralId: prefillReferralId || undefined,
      });
      setForm({ patientName: '', patientId: '', patientEmail: '', patientPhone: '', clinicalNotes: '' });
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
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
        {/* Program Summary */}
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

        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">Patient Information</Typography>
        </Divider>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              size="small"
              label="Patient Full Name"
              value={form.patientName}
              onChange={handleChange('patientName')}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Patient ID (MRN)"
              value={form.patientId}
              onChange={handleChange('patientId')}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Patient Email"
              type="email"
              value={form.patientEmail}
              onChange={handleChange('patientEmail')}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              label="Patient Phone"
              value={form.patientPhone}
              onChange={handleChange('patientPhone')}
              disabled={saving}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={3}
              label="Clinical Notes (optional)"
              placeholder="Reason for prescribing, special instructions, goals..."
              value={form.clinicalNotes}
              onChange={handleChange('clinicalNotes')}
              disabled={saving}
            />
          </Grid>
        </Grid>

        <Alert severity="success" icon={false} sx={{ mt: 2, fontSize: '0.8rem' }}>
          Completing this program will award <strong>+{program.tokenReward || 10} tokens</strong> to your account.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !form.patientName.trim()}
          startIcon={saving ? <CircularProgress size={16} /> : <LocalPharmacyIcon />}
        >
          {saving ? 'Prescribing…' : 'Prescribe Program'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
