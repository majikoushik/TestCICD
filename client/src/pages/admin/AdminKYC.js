import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Grid, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, TablePagination, Chip, IconButton,
  TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tabs, Tab,
  Alert, Snackbar, Tooltip, Divider, Stack, Avatar, LinearProgress,
  Card, CardContent, Badge
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon, Visibility as ViewIcon,
  CheckCircle as ApproveIcon, Cancel as RejectIcon, Download as DownloadIcon,
  Schedule as PendingIcon, VerifiedUser as VerifiedIcon, Person as PersonIcon,
  Business as OrgIcon, Phone as PhoneIcon, LocationOn as LocationIcon,
  AssignmentInd as LicenseIcon, Close as CloseIcon, Email as EmailIcon,
} from '@mui/icons-material';
import axios from 'axios';

const _RAW = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_BASE = _RAW.replace(/\/api$/, '');
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}` });

const KYC_STATUS = {
  pending_email: { label: 'Pending Email', color: 'default' },
  pending_docs:  { label: 'Docs Required', color: 'warning' },
  under_review:  { label: 'Under Review',  color: 'info' },
  verified:      { label: 'Verified',      color: 'success' },
  rejected:      { label: 'Rejected',      color: 'error' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const initials = name => (name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const avatarColor = name => ['#1565c0','#2e7d32','#6a1b9a','#c62828','#0277bd'][(name || '').charCodeAt(0) % 5];

const STATUS_TABS = ['all', 'pending_docs', 'under_review', 'verified', 'rejected'];

function StatCard({ label, value, color, icon }) {
  return (
    <Paper elevation={1} sx={{ p: 2.5, textAlign: 'center' }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={800} color={color}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

export default function AdminKYC() {
  const [profiles, setProfiles] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pendingDocs: 0, underReview: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actioning, setActioning] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = STATUS_TABS[tabIndex];
      const params = status !== 'all' ? { status } : {};
      const { data } = await axios.get(`${API_BASE}/api/admin/kyc`, { params, headers: getHeaders() });
      if (data.success) {
        setProfiles(data.data || []);
        setMeta(data.meta || {});
      }
    } catch (e) {
      showSnack('Failed to load KYC data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tabIndex]);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (profileId, status) => {
    setActioning(true);
    try {
      await axios.patch(
        `${API_BASE}/api/admin/kyc/${profileId}`,
        { status, rejectionReason: status === 'rejected' ? rejectionReason : '' },
        { headers: getHeaders() }
      );
      showSnack(`Provider ${status === 'verified' ? 'approved' : 'rejected'} successfully.`);
      setDialogOpen(false);
      setRejectionReason('');
      load();
    } catch (e) {
      showSnack(e.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleDownloadDoc = (profileId) => {
    window.open(`${API_BASE}/api/admin/kyc/${profileId}/document?token=${localStorage.getItem('adminToken') || localStorage.getItem('token')}`, '_blank');
  };

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.user?.name || '').toLowerCase().includes(q) ||
      (p.user?.email || '').toLowerCase().includes(q) ||
      (p.npi || '').includes(q) ||
      (p.user?.organization || '').toLowerCase().includes(q)
    );
  });
  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="xl">
      <Box py={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight={700}>Provider KYC Verification</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Review and approve provider identity verification documents
            </Typography>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton></Tooltip>
        </Box>

        {/* Stats */}
        <Grid container spacing={2.5} mb={4}>
          {[
            { label: 'Total Providers', value: meta.total || profiles.length, color: 'text.primary', icon: <PersonIcon sx={{ fontSize: 32 }} /> },
            { label: 'Docs Required', value: meta.pendingDocs || 0, color: '#ed6c02', icon: <PendingIcon sx={{ fontSize: 32 }} /> },
            { label: 'Under Review', value: meta.underReview || 0, color: '#0288d1', icon: <VerifiedIcon sx={{ fontSize: 32 }} /> },
            { label: 'Verified', value: meta.verified || 0, color: '#2e7d32', icon: <ApproveIcon sx={{ fontSize: 32 }} /> },
            { label: 'Rejected', value: meta.rejected || 0, color: '#c62828', icon: <RejectIcon sx={{ fontSize: 32 }} /> },
          ].map((s, i) => (
            <Grid item xs={6} sm={4} md key={i}>
              <StatCard {...s} />
            </Grid>
          ))}
        </Grid>

        {/* Filters */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
            <Tabs
              value={tabIndex}
              onChange={(_, v) => { setTabIndex(v); setPage(0); }}
              sx={{ '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 600 } }}
            >
              {['All', 'Docs Required', 'Under Review', 'Verified', 'Rejected'].map(label => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
            <Box flex={1} />
            <TextField
              size="small" placeholder="Search name, email, NPI…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ width: 260 }}
            />
          </Box>
        </Paper>

        {loading ? (
          <Box py={8} textAlign="center"><Typography color="text.secondary">Loading…</Typography></Box>
        ) : filtered.length === 0 ? (
          <Box py={8} textAlign="center">
            <VerifiedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No providers match your filters.</Typography>
          </Box>
        ) : (
          <Paper elevation={1}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><strong>Provider</strong></TableCell>
                    <TableCell><strong>Organization</strong></TableCell>
                    <TableCell><strong>NPI</strong></TableCell>
                    <TableCell><strong>Specialty</strong></TableCell>
                    <TableCell><strong>License #</strong></TableCell>
                    <TableCell><strong>Submitted</strong></TableCell>
                    <TableCell><strong>KYC Status</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginated.map(p => {
                    const sta = KYC_STATUS[p.kycStatus] || KYC_STATUS.pending_docs;
                    const name = p.user?.name || 'Unknown';
                    const isReviewable = p.kycStatus === 'under_review';
                    return (
                      <TableRow key={p._id} hover onClick={() => { setSelected(p); setDialogOpen(true); }} sx={{ cursor: 'pointer', bgcolor: isReviewable ? 'info.50' : 'inherit' }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ bgcolor: avatarColor(name), width: 32, height: 32, fontSize: 12 }}>{initials(name)}</Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>{name}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160, display: 'block' }}>{p.user?.email}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 140 }}>{p.user?.organization || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" fontFamily="monospace">{p.npi || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>{p.specialty || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{p.licenseNumber || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{fmtDate(p.createdAt)}</Typography></TableCell>
                        <TableCell>
                          <Chip label={sta.label} color={sta.color} size="small" variant={p.kycStatus === 'under_review' ? 'filled' : 'outlined'} />
                        </TableCell>
                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                          <Stack direction="row" justifyContent="center">
                            <Tooltip title="View details">
                              <IconButton size="small" onClick={() => { setSelected(p); setDialogOpen(true); }}><ViewIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            {p.kycDocumentPath && (
                              <Tooltip title="Download document">
                                <IconButton size="small" onClick={() => handleDownloadDoc(p._id)}><DownloadIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            {isReviewable && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton size="small" color="success" onClick={() => handleDecision(p._id, 'verified')}><ApproveIcon fontSize="small" /></IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton size="small" color="error" onClick={() => { setSelected(p); setDialogOpen(true); }}><RejectIcon fontSize="small" /></IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[10, 25, 50]}
              onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
            />
          </Paper>
        )}
      </Box>

      {/* Detail/Decision Dialog */}
      {selected && (
        <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setRejectionReason(''); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 6 }}>
            <Avatar sx={{ bgcolor: avatarColor(selected.user?.name || ''), width: 40, height: 40 }}>
              {initials(selected.user?.name || '')}
            </Avatar>
            <Box flex={1}>
              <Typography fontWeight={700}>{selected.user?.name || 'Provider'}</Typography>
              <Typography variant="caption" color="text.secondary">{selected.user?.email}</Typography>
            </Box>
            <Chip label={KYC_STATUS[selected.kycStatus]?.label} color={KYC_STATUS[selected.kycStatus]?.color} size="small" />
            <IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2.5 }}>
            <Grid container spacing={2} mb={2}>
              {selected.npi && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <LicenseIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">NPI</Typography>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{selected.npi}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {selected.specialty && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Specialty</Typography>
                      <Typography variant="body2">{selected.specialty}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {selected.licenseNumber && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <LicenseIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">License Number</Typography>
                      <Typography variant="body2" fontWeight={600}>{selected.licenseNumber} {selected.licenseState && `(${selected.licenseState})`}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {selected.user?.organization && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <OrgIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Organization</Typography>
                      <Typography variant="body2">{selected.user.organization}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {selected.phone && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Phone</Typography>
                      <Typography variant="body2">{selected.phone}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              {(selected.address?.city || selected.address?.state) && (
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="center">
                    <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Location</Typography>
                      <Typography variant="body2">{[selected.address?.city, selected.address?.state].filter(Boolean).join(', ')}</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Document */}
            {selected.kycDocumentPath ? (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <DownloadIcon color="primary" />
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={600}>Verification Document</Typography>
                  <Typography variant="caption" color="text.secondary">{selected.kycDocumentOriginalName || 'document'}</Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => handleDownloadDoc(selected._id)}>Download</Button>
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>No document uploaded yet.</Alert>
            )}

            {/* Rejection reason (shown if already rejected or when rejecting) */}
            {selected.kycStatus === 'rejected' && selected.kycRejectionReason && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>Rejection reason:</strong> {selected.kycRejectionReason}
              </Alert>
            )}

            {selected.kycStatus === 'under_review' && (
              <TextField
                fullWidth multiline rows={2} label="Rejection reason (if rejecting)"
                value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why this provider is being rejected (optional but recommended)…"
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={() => { setDialogOpen(false); setRejectionReason(''); }}>Close</Button>
            <Box flex={1} />
            {selected.kycStatus === 'under_review' && (
              <>
                <Button variant="outlined" color="error" disabled={actioning}
                  onClick={() => handleDecision(selected._id, 'rejected')}
                  startIcon={<RejectIcon />}>
                  Reject
                </Button>
                <Button variant="contained" color="success" disabled={actioning}
                  onClick={() => handleDecision(selected._id, 'verified')}
                  startIcon={<ApproveIcon />}>
                  Approve
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}
