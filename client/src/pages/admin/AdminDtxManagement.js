import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, Tabs, Tab, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  Grid, Card, CardContent, LinearProgress, Switch, FormControlLabel, Divider,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AssessmentIcon from '@mui/icons-material/Assessment';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import {
  adminGetStats, adminGetPrograms, adminCreateProgram,
  adminUpdateProgram, adminGetPrescriptions,
} from '../../services/dtxService';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'metabolic', label: 'Metabolic' },
  { value: 'musculoskeletal', label: 'Musculoskeletal' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'general', label: 'General' },
];

const EVIDENCE_OPTIONS = [
  { value: 'fda_cleared', label: 'FDA Cleared' },
  { value: 'fda_authorized', label: 'FDA Authorized' },
  { value: 'peer_reviewed', label: 'Peer Reviewed' },
  { value: 'evidence_based', label: 'Evidence Based' },
  { value: 'clinical_study', label: 'Clinical Study' },
];

const FORMAT_OPTIONS = [
  { value: 'app', label: 'Mobile App' },
  { value: 'web', label: 'Web Platform' },
  { value: 'both', label: 'App + Web' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'hybrid', label: 'Hybrid' },
];

const STATUS_COLORS = {
  prescribed: 'default', enrolled: 'info', active: 'primary',
  completed: 'success', dropped: 'error',
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

function StatCard({ label, value, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={`${color}.main`}>{value ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM = {
  name: '', vendor: '', category: 'mental_health', description: '',
  conditions: '', evidenceLevel: 'evidence_based', durationWeeks: '',
  deliveryFormat: 'app', contentTypes: '', highlights: '',
  contraindications: '', tokenReward: 10, integrationUrl: '',
};

function ProgramFormDialog({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            ...EMPTY_FORM, ...initial,
            conditions: (initial.conditions || []).join(', '),
            contentTypes: (initial.contentTypes || []).join(', '),
            highlights: (initial.highlights || []).join('\n'),
            contraindications: (initial.contraindications || []).join(', '),
          }
        : EMPTY_FORM
      );
      setError('');
    }
  }, [open, initial]);

  const field = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const toArray = (str) => str.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!form.name || !form.vendor || !form.description) {
      setError('Name, vendor, and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
        tokenReward: Number(form.tokenReward) || 10,
        conditions: toArray(form.conditions),
        contentTypes: toArray(form.contentTypes),
        highlights: toArray(form.highlights),
        contraindications: toArray(form.contraindications),
      };
      if (initial?._id) {
        await adminUpdateProgram(initial._id, payload);
      } else {
        await adminCreateProgram(payload);
      }
      onSaved && onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
      <DialogTitle>{initial?._id ? 'Edit Program' : 'Add New DTx Program'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth required size="small" label="Program Name" value={form.name} onChange={field('name')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth required size="small" label="Vendor" value={form.vendor} onChange={field('vendor')} disabled={saving} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth required size="small" multiline rows={2} label="Description" value={form.description} onChange={field('description')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={form.category} label="Category" onChange={field('category')} disabled={saving}>
                {CATEGORY_OPTIONS.filter(c => c.value !== 'all').map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Evidence Level</InputLabel>
              <Select value={form.evidenceLevel} label="Evidence Level" onChange={field('evidenceLevel')} disabled={saving}>
                {EVIDENCE_OPTIONS.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Delivery Format</InputLabel>
              <Select value={form.deliveryFormat} label="Delivery Format" onChange={field('deliveryFormat')} disabled={saving}>
                {FORMAT_OPTIONS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Duration (weeks)" value={form.durationWeeks} onChange={field('durationWeeks')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Token Reward" value={form.tokenReward} onChange={field('tokenReward')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Integration URL" value={form.integrationUrl} onChange={field('integrationUrl')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" multiline rows={2} label="Conditions (comma-separated)" placeholder="Type 2 Diabetes, Pre-diabetes" value={form.conditions} onChange={field('conditions')} disabled={saving} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" multiline rows={2} label="Content Types (comma-separated)" placeholder="CBT, Coaching, Nutrition" value={form.contentTypes} onChange={field('contentTypes')} disabled={saving} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" multiline rows={3} label="Highlights (one per line)" placeholder="Clinically proven outcomes&#10;24/7 digital access" value={form.highlights} onChange={field('highlights')} disabled={saving} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Contraindications (comma-separated)" value={form.contraindications} onChange={field('contraindications')} disabled={saving} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : null}>
          {saving ? 'Saving…' : initial?._id ? 'Save Changes' : 'Add Program'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminDtxManagement() {
  const [tab, setTab] = useState(0);

  // stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // programs
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  // prescriptions
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxTotal, setRxTotal] = useState(0);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxStatusFilter, setRxStatusFilter] = useState('all');
  const [rxPage, setRxPage] = useState(0);
  const [rxRowsPerPage, setRxRowsPerPage] = useState(15);

  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminGetStats();
      const payload = res?.data || res || {};
      setStats(payload.data || payload);
    } catch (err) {
      console.error('Failed to load DTx stats', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const params = {};
      if (programFilter !== 'all') params.category = programFilter;
      if (!showInactive) params.isActive = 'true';
      const res = await adminGetPrograms(params);
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setPrograms(inner.programs || (Array.isArray(inner) ? inner : []));
    } catch (err) {
      setError(err?.message || 'Failed to load programs');
    } finally {
      setProgramsLoading(false);
    }
  }, [programFilter, showInactive]);

  const loadPrescriptions = useCallback(async () => {
    setRxLoading(true);
    try {
      const params = { page: rxPage + 1, limit: rxRowsPerPage };
      if (rxStatusFilter !== 'all') params.status = rxStatusFilter;
      const res = await adminGetPrescriptions(params);
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setPrescriptions(inner.prescriptions || (Array.isArray(inner) ? inner : []));
      setRxTotal(inner.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load prescriptions');
    } finally {
      setRxLoading(false);
    }
  }, [rxStatusFilter, rxPage, rxRowsPerPage]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 0) loadPrograms(); }, [tab, loadPrograms]);
  useEffect(() => { if (tab === 1) loadPrescriptions(); }, [tab, loadPrescriptions]);

  const handleDeactivate = async (program) => {
    try {
      await adminUpdateProgram(program._id, { isActive: !program.isActive });
      setSuccessMsg(`Program ${program.isActive ? 'deactivated' : 'reactivated'} successfully.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadPrograms();
    } catch (err) {
      setError(err?.message || 'Failed to update program');
    }
  };

  const handleFormSaved = () => {
    setSuccessMsg('Program saved successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
    loadPrograms();
    loadStats();
  };

  const handleRefresh = () => {
    loadStats();
    if (tab === 0) loadPrograms();
    if (tab === 1) loadPrescriptions();
  };

  const topPrograms = stats?.topPrograms || [];
  const byCategory = stats?.byCategory || [];
  const maxCatCount = byCategory.reduce((m, b) => Math.max(m, b.count || 0), 1);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <StorefrontIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>DTx Marketplace Management</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>Refresh</Button>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats Row */}
      {statsLoading ? <LinearProgress sx={{ mb: 2 }} /> : stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Active Programs" value={stats.totalPrograms} color="primary" icon={<StorefrontIcon />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Total Prescriptions" value={stats.totalPrescriptions} color="info" icon={<LocalPharmacyIcon />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Completion Rate" value={stats.completionRate != null ? stats.completionRate + '%' : '—'} color="success" icon={<AssessmentIcon />} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Tokens Awarded" value={stats.tokensAwarded != null ? '+' + stats.tokensAwarded : '—'} color="warning" icon={<EmojiEventsIcon />} />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Program Catalog" icon={<StorefrontIcon />} iconPosition="start" />
          <Tab label="All Prescriptions" icon={<LocalPharmacyIcon />} iconPosition="start" />
          <Tab label="Analytics" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── TAB 0: Program Catalog ── */}
      {tab === 0 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
            <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Category</InputLabel>
                <Select value={programFilter} label="Category" onChange={(e) => setProgramFilter(e.target.value)}>
                  {CATEGORY_OPTIONS.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} size="small" />}
                label={<Typography variant="caption">Show Inactive</Typography>}
              />
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditTarget(null); setFormOpen(true); }}
            >
              Add Program
            </Button>
          </Box>

          {programsLoading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><Typography variant="caption" fontWeight={700}>Program</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Category</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Evidence</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Duration</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Prescribed</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Token Reward</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Status</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Actions</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.length === 0 && !programsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No programs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((prog) => (
                    <TableRow key={prog._id} hover sx={{ opacity: prog.isActive ? 1 : 0.5 }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{prog.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{prog.vendor}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={CATEGORY_LABELS[prog.category] || prog.category} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {EVIDENCE_OPTIONS.find(e => e.value === prog.evidenceLevel)?.label || prog.evidenceLevel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{prog.durationWeeks ? prog.durationWeeks + 'w' : '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>{prog.prescriptionCount ?? 0}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={`+${prog.tokenReward || 10}`} size="small" color="warning" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={prog.isActive ? 'Active' : 'Inactive'}
                          color={prog.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5}>
                          <Button size="small" startIcon={<EditIcon />} onClick={() => { setEditTarget(prog); setFormOpen(true); }}>
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color={prog.isActive ? 'error' : 'success'}
                            startIcon={<BlockIcon />}
                            onClick={() => handleDeactivate(prog)}
                          >
                            {prog.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 1: All Prescriptions ── */}
      {tab === 1 && (
        <Box>
          <Box display="flex" gap={2} mb={2} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Status</InputLabel>
              <Select value={rxStatusFilter} label="Status" onChange={(e) => { setRxStatusFilter(e.target.value); setRxPage(0); }}>
                {['all', 'prescribed', 'enrolled', 'active', 'completed', 'dropped'].map(s => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                    {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {rxLoading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><Typography variant="caption" fontWeight={700}>Patient</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Program</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Provider</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Status</Typography></TableCell>
                  <TableCell><Typography variant="caption" fontWeight={700}>Prescribed</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Engagement</Typography></TableCell>
                  <TableCell align="right"><Typography variant="caption" fontWeight={700}>Tokens</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prescriptions.length === 0 && !rxLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No prescriptions found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  prescriptions.map((rx) => (
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
                        <Typography variant="body2">{rx.providerName || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={rx.status.charAt(0).toUpperCase() + rx.status.slice(1)} color={STATUS_COLORS[rx.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(rx.prescribedAt)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {rx.engagementScore != null ? (
                          <Chip label={`${rx.engagementScore}%`} size="small" color={rx.engagementScore >= 70 ? 'success' : rx.engagementScore >= 40 ? 'warning' : 'error'} />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {rx.tokenRewardIssued ? (
                          <Chip label={`+${rx.tokenRewardAmount}`} size="small" color="warning" />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={rxTotal}
              page={rxPage}
              rowsPerPage={rxRowsPerPage}
              onPageChange={(_, p) => setRxPage(p)}
              onRowsPerPageChange={(e) => { setRxRowsPerPage(parseInt(e.target.value, 10)); setRxPage(0); }}
              rowsPerPageOptions={[10, 15, 25, 50]}
            />
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 2: Analytics ── */}
      {tab === 2 && (
        <Box>
          {statsLoading && <LinearProgress sx={{ mb: 2 }} />}
          {stats && (
            <Grid container spacing={3}>
              {/* Prescriptions by Category */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AssessmentIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700}>Prescriptions by Category</Typography>
                  </Box>
                  {byCategory.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No data</Typography>
                  ) : byCategory.map(b => (
                    <Box key={b._id} mb={1.5}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2">{CATEGORY_LABELS[b._id] || b._id}</Typography>
                        <Typography variant="body2" fontWeight={600}>{b.count}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(b.count / maxCatCount) * 100}
                        sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover' }}
                      />
                    </Box>
                  ))}
                </Paper>
              </Grid>

              {/* Top Programs */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <StorefrontIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700}>Top Programs by Prescriptions</Typography>
                  </Box>
                  {topPrograms.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No data</Typography>
                  ) : topPrograms.map((p, i) => (
                    <Box key={p._id} display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={`#${i + 1}`} size="small" color="primary" />
                        <Typography variant="body2">{p.programName || '—'}</Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight={600}>{p.count} Rx</Typography>
                        {p.avgEngagement != null && (
                          <Typography variant="caption" color="text.secondary">
                            Avg {Math.round(p.avgEngagement)}% engagement
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Paper>
              </Grid>

              {/* Prescription Status Breakdown */}
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LocalPharmacyIcon color="secondary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700}>Status Breakdown</Typography>
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={1.5}>
                    {(stats.byStatus || []).map(s => (
                      <Box key={s._id} textAlign="center">
                        <Chip
                          label={`${s._id}: ${s.count}`}
                          color={STATUS_COLORS[s._id] || 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" gap={4} flexWrap="wrap">
                    <Box>
                      <Typography variant="caption" color="text.secondary">Completion Rate</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {stats.completionRate ?? '—'}%
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Tokens Awarded</Typography>
                      <Typography variant="h5" fontWeight={700} color="warning.main">
                        +{stats.tokensAwarded ?? 0}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      <ProgramFormDialog
        open={formOpen}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={handleFormSaved}
      />
    </Container>
  );
}
