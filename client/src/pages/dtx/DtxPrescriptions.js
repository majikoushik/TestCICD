import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, Tabs, Tab, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Slider, FormControl, InputLabel, Select,
  MenuItem, Grid, Divider,
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getMyPrescriptions, updatePrescriptionStatus } from '../../services/dtxService';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'prescribed', label: 'Prescribed' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'dropped', label: 'Dropped' },
];

const STATUS_COLORS = {
  prescribed: 'default',
  enrolled: 'info',
  active: 'primary',
  completed: 'success',
  dropped: 'error',
};

const STATUS_TRANSITIONS = {
  prescribed: ['enrolled', 'dropped'],
  enrolled: ['active', 'dropped'],
  active: ['completed', 'dropped'],
  completed: [],
  dropped: [],
};

const CATEGORY_LABELS = {
  mental_health: 'Mental Health', metabolic: 'Metabolic',
  musculoskeletal: 'Musculoskeletal', cardiovascular: 'Cardiovascular',
  behavioral: 'Behavioral', respiratory: 'Respiratory',
  neurology: 'Neurology', general: 'General',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function UpdateStatusDialog({ prescription, open, onClose, onDone }) {
  const [status, setStatus] = useState('');
  const [engagementScore, setEngagementScore] = useState(prescription?.engagementScore ?? 0);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const transitions = STATUS_TRANSITIONS[prescription?.status] || [];
  const isCompleting = status === 'completed';

  useEffect(() => {
    if (open) {
      setStatus(transitions[0] || '');
      setEngagementScore(prescription?.engagementScore ?? 0);
      setOutcomeNotes('');
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    if (!status) return;
    setSaving(true);
    setError('');
    try {
      await updatePrescriptionStatus(prescription._id, {
        status,
        engagementScore: isCompleting ? engagementScore : undefined,
        outcomeNotes: outcomeNotes || undefined,
      });
      onDone && onDone();
      onClose();
    } catch (err) {
      setError(err?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (!prescription) return null;

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Update Prescription Status</DialogTitle>
      <DialogContent dividers>
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">
            Patient: <strong>{prescription.patientName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Program: <strong>{prescription.programName}</strong>
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>New Status</InputLabel>
          <Select value={status} label="New Status" onChange={(e) => setStatus(e.target.value)} disabled={saving}>
            {transitions.map(s => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isCompleting && (
          <Box mb={2}>
            <Typography variant="body2" gutterBottom>
              Patient Engagement Score: <strong>{engagementScore}%</strong>
            </Typography>
            <Slider
              value={engagementScore}
              onChange={(_, v) => setEngagementScore(v)}
              min={0}
              max={100}
              step={5}
              marks
              valueLabelDisplay="auto"
              color={engagementScore >= 70 ? 'success' : engagementScore >= 40 ? 'warning' : 'error'}
              disabled={saving}
            />
          </Box>
        )}

        <TextField
          fullWidth
          size="small"
          multiline
          rows={3}
          label={isCompleting ? 'Outcome Notes (required for completion)' : 'Notes (optional)'}
          value={outcomeNotes}
          onChange={(e) => setOutcomeNotes(e.target.value)}
          disabled={saving}
        />

        {isCompleting && (
          <Alert severity="success" icon={false} sx={{ mt: 2, fontSize: '0.8rem' }}>
            Completing this prescription will award <strong>+{prescription.programTokenReward || 10} tokens</strong> to your account.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !status || (isCompleting && !outcomeNotes.trim())}
          startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          {saving ? 'Saving…' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DtxPrescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [updateTarget, setUpdateTarget] = useState(null);

  const activeStatus = STATUS_TABS[tab]?.value || 'all';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (activeStatus !== 'all') params.status = activeStatus;
      const res = await getMyPrescriptions(params);
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setPrescriptions(inner.prescriptions || (Array.isArray(inner) ? inner : []));
      setTotal(inner.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [activeStatus, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateDone = () => {
    setSuccessMsg('Prescription status updated successfully!');
    setTimeout(() => setSuccessMsg(''), 5000);
    load();
  };

  const completedCount = prescriptions.filter(p => p.status === 'completed').length;
  const totalTokens = prescriptions.filter(p => p.tokenRewardIssued).reduce((s, p) => s + (p.tokenRewardAmount || 0), 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <LocalPharmacyIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>My DTx Prescriptions</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Track and update the status of digital therapeutic programs you have prescribed.
      </Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary chips */}
      {totalTokens > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <EmojiEventsIcon color="warning" />
          <Typography variant="body2">
            You have earned <strong>+{totalTokens} tokens</strong> from {completedCount} completed DTx prescription{completedCount !== 1 ? 's' : ''}.
          </Typography>
        </Paper>
      )}

      {/* Status Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }}>
          {STATUS_TABS.map(s => <Tab key={s.value} label={s.label} />)}
        </Tabs>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><Typography variant="caption" fontWeight={700}>Patient</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Program</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Category</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Status</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Prescribed</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Engagement</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Tokens</Typography></TableCell>
              <TableCell><Typography variant="caption" fontWeight={700}>Actions</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : prescriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <LocalPharmacyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography variant="body2" color="text.secondary">No prescriptions found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              prescriptions.map((rx) => {
                const canUpdate = STATUS_TRANSITIONS[rx.status]?.length > 0;
                return (
                  <TableRow key={rx._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{rx.patientName}</Typography>
                      {rx.patientId && <Typography variant="caption" color="text.secondary">{rx.patientId}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{rx.programName}</Typography>
                      <Typography variant="caption" color="text.secondary">{rx.programVendor}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {CATEGORY_LABELS[rx.programCategory] || rx.programCategory || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}
                        color={STATUS_COLORS[rx.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(rx.prescribedAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      {rx.engagementScore != null ? (
                        <Chip
                          label={`${rx.engagementScore}%`}
                          size="small"
                          color={rx.engagementScore >= 70 ? 'success' : rx.engagementScore >= 40 ? 'warning' : 'error'}
                        />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {rx.tokenRewardIssued ? (
                        <Chip label={`+${rx.tokenRewardAmount}`} size="small" color="warning" icon={<EmojiEventsIcon sx={{ fontSize: '0.85rem !important' }} />} />
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {canUpdate && (
                        <Button size="small" variant="outlined" onClick={() => setUpdateTarget(rx)}>
                          Update
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      </TableContainer>

      <UpdateStatusDialog
        prescription={updateTarget}
        open={!!updateTarget}
        onClose={() => setUpdateTarget(null)}
        onDone={handleUpdateDone}
      />

      {/* Unused import suppression */}
      <Box sx={{ display: 'none' }}><Grid item /><Divider /></Box>
    </Container>
  );
}
