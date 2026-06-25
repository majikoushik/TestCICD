import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, LinearProgress, Divider, CircularProgress,
  IconButton, Tooltip
} from '@mui/material';
import {
  Psychology as AIIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
  Assignment as ReferralIcon,
  People as ProvidersIcon,
  Analytics as StatsIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { getStats, getSessions, getProviders, updateProvider } from '../../services/referralMatchingService';

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function safeNum(val, decimals = 1) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return decimals === 0 ? n.toFixed(0) : n.toFixed(decimals);
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={`${color}.main`}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminReferralMatching() {
  const [activeTab, setActiveTab] = useState(0);

  // --- analytics state ---
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  // --- sessions state ---
  const [sessions, setSessions] = useState([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- session detail dialog ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState(null);

  // --- providers state ---
  const [providers, setProviders] = useState([]);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState('');
  const [providerPage, setProviderPage] = useState(0);
  const [providerRowsPerPage, setProviderRowsPerPage] = useState(10);
  const [providerSearch, setProviderSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterState, setFilterState] = useState('');
  const [acceptingOnly, setAcceptingOnly] = useState(false);

  // --- edit dialog ---
  const [editOpen, setEditOpen] = useState(false);
  const [editProvider, setEditProvider] = useState(null);
  const [editForm, setEditForm] = useState({
    availabilityScore: '',
    isAcceptingReferrals: '',
    acceptedInsurance: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const res = await getStats();
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setStats(inner);
    } catch (err) {
      setStatsError(err?.response?.data?.message || err.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');
    try {
      const res = await getSessions({ page: page + 1, limit: rowsPerPage });
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setSessions(Array.isArray(inner.sessions) ? inner.sessions : Array.isArray(inner) ? inner : []);
      setSessionsTotal(inner.total ?? inner.count ?? 0);
    } catch (err) {
      setSessionsError(err?.response?.data?.message || err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, [page, rowsPerPage]);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    setProvidersError('');
    try {
      const res = await getProviders({
        specialty: filterSpecialty,
        state: filterState,
        page: providerPage + 1,
        limit: providerRowsPerPage,
        search: providerSearch,
        ...(acceptingOnly ? { isAcceptingReferrals: true } : {})
      });
      const payload = res?.data || res || {};
      const inner = payload.data || payload;
      setProviders(Array.isArray(inner.providers) ? inner.providers : Array.isArray(inner) ? inner : []);
      setProvidersTotal(inner.total ?? inner.count ?? 0);
    } catch (err) {
      setProvidersError(err?.response?.data?.message || err.message || 'Failed to load providers');
    } finally {
      setProvidersLoading(false);
    }
  }, [filterSpecialty, filterState, providerPage, providerRowsPerPage, providerSearch, acceptingOnly]);

  // --- effects ---
  useEffect(() => {
    if (activeTab === 0) {
      loadStats();
      loadSessions();
    }
  }, [activeTab, loadStats, loadSessions]);

  useEffect(() => {
    if (activeTab === 1) {
      loadProviders();
    }
  }, [activeTab, loadProviders]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  function handleTabChange(tab) {
    setActiveTab(tab);
  }

  function handleViewSession(session) {
    setDetailSession(session);
    setDetailOpen(true);
  }

  function handleEditProvider(provider) {
    setEditProvider(provider);
    setEditForm({
      availabilityScore: provider.availabilityScore ?? '',
      isAcceptingReferrals: provider.isAcceptingReferrals === true ? 'true' : 'false',
      acceptedInsurance: Array.isArray(provider.acceptedInsurance)
        ? provider.acceptedInsurance.join(', ')
        : provider.acceptedInsurance ?? ''
    });
    setEditError('');
    setEditOpen(true);
  }

  async function handleSaveProvider() {
    if (!editProvider) return;
    setEditLoading(true);
    setEditError('');
    try {
      const insuranceArr = editForm.acceptedInsurance
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await updateProvider(editProvider._id || editProvider.id, {
        availabilityScore: Number(editForm.availabilityScore),
        isAcceptingReferrals: editForm.isAcceptingReferrals === 'true',
        acceptedInsurance: insuranceArr
      });
      setEditOpen(false);
      loadProviders();
    } catch (err) {
      setEditError(err?.response?.data?.message || err.message || 'Failed to save provider');
    } finally {
      setEditLoading(false);
    }
  }

  // ============================================================================
  // SPECIALTY / STATE options derived from data
  // ============================================================================

  const specialtyOptions = React.useMemo(() => {
    const set = new Set();
    providers.forEach(p => { if (p.specialty) set.add(p.specialty); });
    return Array.from(set).sort();
  }, [providers]);

  const stateOptions = React.useMemo(() => {
    const set = new Set();
    providers.forEach(p => { if (p.state) set.add(p.state); });
    return Array.from(set).sort();
  }, [providers]);

  // ============================================================================
  // TOP SPECIALTIES derived from stats
  // ============================================================================

  const topSpecialties = stats?.topSpecialties ?? [];
  const maxSpecialtyCount = topSpecialties.length
    ? Math.max(...topSpecialties.map(s => s.count || 0))
    : 1;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>AI Referral Matching</Typography>
            <Typography variant="caption" color="text.secondary">
              Match analytics and provider profile management
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton
            onClick={() => { if (activeTab === 0) { loadStats(); loadSessions(); } else { loadProviders(); } }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tab buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          variant={activeTab === 0 ? 'contained' : 'outlined'}
          startIcon={<StatsIcon />}
          onClick={() => handleTabChange(0)}
        >
          Match Analytics
        </Button>
        <Button
          variant={activeTab === 1 ? 'contained' : 'outlined'}
          startIcon={<ProvidersIcon />}
          onClick={() => handleTabChange(1)}
        >
          Provider Profiles
        </Button>
      </Box>

      {/* ================================================================
          TAB 0: MATCH ANALYTICS
      ================================================================ */}
      {activeTab === 0 && (
        <Box>
          {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
          {sessionsError && <Alert severity="error" sx={{ mb: 2 }}>{sessionsError}</Alert>}

          {/* Stat Cards */}
          {statsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Total Match Sessions"
                  value={stats?.totalSessions ?? '—'}
                  color="primary"
                  icon={<ReferralIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Avg Top Score"
                  value={stats?.avgTopScore != null ? safeNum(stats.avgTopScore) : '—'}
                  color="success"
                  icon={<StarIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Selection Rate %"
                  value={stats?.selectionRate != null ? `${safeNum(stats.selectionRate)}%` : '—'}
                  color="info"
                  icon={<CheckIcon />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Active Providers"
                  value={stats?.activeProviders ?? '—'}
                  color="secondary"
                  icon={<ProvidersIcon />}
                />
              </Grid>
            </Grid>
          )}

          {/* Top Requested Specialties */}
          {topSpecialties.length > 0 && (
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>Top Requested Specialties</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {topSpecialties.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ minWidth: 160, fontWeight: 500 }}>
                      {item.specialty || item.name || `Specialty ${idx + 1}`}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={maxSpecialtyCount > 0 ? (item.count / maxSpecialtyCount) * 100 : 0}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Chip
                      label={item.count}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ minWidth: 48 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Recent Match Sessions Table */}
          <Paper variant="outlined">
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReferralIcon color="action" />
              <Typography variant="h6" fontWeight={600}>Recent Match Sessions</Typography>
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Provider</strong></TableCell>
                    <TableCell><strong>Specialty</strong></TableCell>
                    <TableCell><strong>Insurance</strong></TableCell>
                    <TableCell><strong>Top Score</strong></TableCell>
                    <TableCell><strong>Selected</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No match sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((s, idx) => (
                      <TableRow key={s._id || s.id || idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {s.providerName || s.provider?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={s.specialty || '—'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{s.insurance || s.insurancePlan || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {s.topScore != null ? safeNum(s.topScore) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {s.selectedProviderId != null ? (
                            <Chip label="Yes" size="small" color="success" />
                          ) : (
                            <Chip label="No" size="small" color="default" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(s.createdAt || s.date)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewSession(s)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sessionsTotal}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        </Box>
      )}

      {/* ================================================================
          TAB 1: PROVIDER PROFILES
      ================================================================ */}
      {activeTab === 1 && (
        <Box>
          {providersError && <Alert severity="error" sx={{ mb: 2 }}>{providersError}</Alert>}

          {/* Filter Bar */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search Providers"
                  value={providerSearch}
                  onChange={e => { setProviderSearch(e.target.value); setProviderPage(0); }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Specialty</InputLabel>
                  <Select
                    value={filterSpecialty}
                    label="Specialty"
                    onChange={e => { setFilterSpecialty(e.target.value); setProviderPage(0); }}
                  >
                    <MenuItem value="">All Specialties</MenuItem>
                    {specialtyOptions.map(sp => (
                      <MenuItem key={sp} value={sp}>{sp}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>State</InputLabel>
                  <Select
                    value={filterState}
                    label="State"
                    onChange={e => { setFilterState(e.target.value); setProviderPage(0); }}
                  >
                    <MenuItem value="">All States</MenuItem>
                    {stateOptions.map(st => (
                      <MenuItem key={st} value={st}>{st}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  fullWidth
                  variant={acceptingOnly ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => { setAcceptingOnly(v => !v); setProviderPage(0); }}
                >
                  {acceptingOnly ? 'Accepting Only' : 'All Availability'}
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Providers Table */}
          <Paper variant="outlined">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Provider</strong></TableCell>
                    <TableCell><strong>Specialty</strong></TableCell>
                    <TableCell><strong>Location</strong></TableCell>
                    <TableCell><strong>Acceptance Rate</strong></TableCell>
                    <TableCell><strong>Avg Response</strong></TableCell>
                    <TableCell><strong>Token Earned</strong></TableCell>
                    <TableCell><strong>Available</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providersLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : providers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No providers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    providers.map((p, idx) => {
                      const acceptRate = parseFloat(p.acceptanceRate ?? p.acceptRate ?? 0);
                      const location = [p.city, p.state].filter(Boolean).join(', ') || p.location || '—';
                      return (
                        <TableRow key={p._id || p.id || idx} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—'}
                            </Typography>
                            {p.npi && (
                              <Typography variant="caption" color="text.secondary">NPI: {p.npi}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={p.specialty || '—'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{location}</Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ flex: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(acceptRate, 100)}
                                  color="success"
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ minWidth: 36 }}>
                                {safeNum(acceptRate, 0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {p.avgResponseTime != null ? `${safeNum(p.avgResponseTime, 1)}h` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {p.tokenEarned != null ? p.tokenEarned : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {p.isAcceptingReferrals ? (
                              <Chip label="Yes" size="small" color="success" />
                            ) : (
                              <Chip label="No" size="small" color="error" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="View / Edit">
                              <IconButton size="small" onClick={() => handleEditProvider(p)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={providersTotal}
              page={providerPage}
              onPageChange={(_, p) => setProviderPage(p)}
              rowsPerPage={providerRowsPerPage}
              onRowsPerPageChange={e => { setProviderRowsPerPage(parseInt(e.target.value, 10)); setProviderPage(0); }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </Paper>
        </Box>
      )}

      {/* ================================================================
          SESSION DETAIL DIALOG
      ================================================================ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" />
          Match Session Details
        </DialogTitle>
        <DialogContent dividers>
          {detailSession && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Provider</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {detailSession.providerName || detailSession.provider?.name || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Specialty</Typography>
                  <Typography variant="body1">{detailSession.specialty || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Insurance</Typography>
                  <Typography variant="body1">{detailSession.insurance || detailSession.insurancePlan || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Top Score</Typography>
                  <Typography variant="body1" fontWeight={600} color="primary.main">
                    {detailSession.topScore != null ? safeNum(detailSession.topScore) : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Selected Provider ID</Typography>
                  <Typography variant="body2">{detailSession.selectedProviderId ?? 'Not selected'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{formatDate(detailSession.createdAt || detailSession.date)}</Typography>
                </Grid>
              </Grid>

              {Array.isArray(detailSession.suggestions) && detailSession.suggestions.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    AI Suggestions ({detailSession.suggestions.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Rank</strong></TableCell>
                          <TableCell><strong>Provider</strong></TableCell>
                          <TableCell><strong>Score</strong></TableCell>
                          <TableCell><strong>Reason</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailSession.suggestions.map((sug, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {sug.providerName || sug.provider?.name || sug.name || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600} color="primary.main">
                                {sug.score != null ? safeNum(sug.score) : '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {sug.reason || sug.rationale || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ================================================================
          EDIT PROVIDER DIALOG
      ================================================================ */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ProvidersIcon color="primary" />
          Edit Provider
          {editProvider && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              — {editProvider.name || `${editProvider.firstName || ''} ${editProvider.lastName || ''}`.trim()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Availability Score (0–100)"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={editForm.availabilityScore}
              onChange={e => setEditForm(f => ({ ...f, availabilityScore: e.target.value }))}
              fullWidth
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Accepting Referrals</InputLabel>
              <Select
                value={editForm.isAcceptingReferrals}
                label="Accepting Referrals"
                onChange={e => setEditForm(f => ({ ...f, isAcceptingReferrals: e.target.value }))}
              >
                <MenuItem value="true">Yes</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Accepted Insurance (comma-separated)"
              multiline
              minRows={3}
              value={editForm.acceptedInsurance}
              onChange={e => setEditForm(f => ({ ...f, acceptedInsurance: e.target.value }))}
              fullWidth
              size="small"
              placeholder="BlueCross, Aetna, United Healthcare"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editLoading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveProvider}
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} /> : null}
          >
            {editLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
