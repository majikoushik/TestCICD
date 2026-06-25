import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Grid, Card, CardContent, LinearProgress,
  Divider, CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Mic as MicIcon,
  Psychology as AIIcon,
  CheckCircle as ApprovedIcon,
  HourglassEmpty as PendingIcon,
  Assignment as NoteIcon,
  Send as SubmittedIcon
} from '@mui/icons-material';
import { adminGetStats, adminGetSessions } from '../../services/ambientSessionService';

const URGENCY_COLOR = {
  routine: 'info',
  urgent: 'warning',
  emergent: 'error'
};

const STATUS_COLOR = {
  draft: 'default',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'error',
  submitted: 'primary'
};

function StatCard({ label, count, color, icon }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        <Box sx={{ color: color + '.main' }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color={color + '.main'}>{count}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : '—';
}

function TranscriptBox({ label, text }) {
  if (!text) return null;
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Box
        sx={{
          bgcolor: 'grey.100',
          p: 2,
          borderRadius: 1,
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          maxHeight: 150,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {text}
      </Box>
    </Box>
  );
}

export default function AdminAmbientSessions() {
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewSession, setViewSession] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, sessionsRes] = await Promise.all([
        adminGetStats(),
        adminGetSessions({
          status: filterStatus === 'all' ? undefined : filterStatus,
          urgency: filterUrgency === 'all' ? undefined : filterUrgency,
          search: searchQuery || undefined,
          page: page + 1,
          limit: rowsPerPage
        })
      ]);

      // Extract stats carefully
      const statsPayload = statsRes?.data || statsRes || {};
      const statsInner = statsPayload.stats ? statsPayload.stats : (statsPayload.data?.stats || statsPayload);
      setStats(statsInner || {});

      // Extract sessions carefully
      const res = sessionsRes;
      const payload = res?.data || res || {};
      const inner = payload.sessions ? payload : (payload.data || payload);
      setSessions(inner.sessions || []);
      setTotal(inner.total || inner.totalCount || (inner.sessions || []).length || 0);
    } catch {
      setError('Failed to load ambient sessions.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterUrgency, searchQuery, page, rowsPerPage]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleSearch = () => {
    setPage(0);
    loadSessions();
  };

  const totalSessions = stats.total || stats.totalSessions || stats.totalSent || 0;
  const totalApproved = stats.approved || stats.totalApproved || stats.totalDelivered || 0;
  const totalReviewing = stats.reviewing || stats.totalReviewing || stats.pending || 0;
  const totalSubmitted = stats.submitted || stats.totalSubmitted || 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MicIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h4" component="h1">Ambient Clinical Intelligence</Typography>
            <Typography variant="subtitle2" color="text.secondary">AI-Assisted Clinical Documentation</Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadSessions} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Total Sessions" count={totalSessions} color="primary" icon={<MicIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Approved" count={totalApproved} color="success" icon={<ApprovedIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Pending Review" count={totalReviewing} color="warning" icon={<PendingIcon />} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Submitted" count={totalSubmitted} color="info" icon={<SubmittedIcon />} />
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search patient or chief complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 0.5 }} /> }}
            sx={{ minWidth: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="reviewing">Reviewing</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="submitted">Submitted</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Urgency</InputLabel>
            <Select value={filterUrgency} label="Urgency" onChange={(e) => { setFilterUrgency(e.target.value); setPage(0); }}>
              <MenuItem value="all">All Urgencies</MenuItem>
              <MenuItem value="routine">Routine</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
              <MenuItem value="emergent">Emergent</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" size="small" startIcon={<SearchIcon />} onClick={handleSearch}>
            Search
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Main Table */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Patient</strong></TableCell>
                <TableCell><strong>Chief Complaint</strong></TableCell>
                <TableCell><strong>Provider</strong></TableCell>
                <TableCell><strong>Urgency</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Duration</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No ambient sessions found
                  </TableCell>
                </TableRow>
              ) : sessions.map((session) => (
                <TableRow key={session._id} hover>
                  <TableCell>{session.patientName}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                      {session.chiefComplaint || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {session.providerName || session.provider || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.urgency || 'routine'}
                      size="small"
                      color={URGENCY_COLOR[session.urgency] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.status || 'draft'}
                      size="small"
                      color={STATUS_COLOR[session.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>{formatDuration(session.recordingDuration || session.duration)}</TableCell>
                  <TableCell>{formatDate(session.createdAt)}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Session">
                      <IconButton size="small" color="primary" onClick={() => setViewSession(session)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPageOptions={[10]}
        />
      </Paper>

      {/* View Dialog */}
      <Dialog open={Boolean(viewSession)} onClose={() => setViewSession(null)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MicIcon color="primary" />
            <Typography variant="h6">
              {viewSession?.patientName} &mdash; Ambient Session
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewSession && (
            <Box>
              {/* Section 1: Session Info */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Session Info</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                  <Typography>{viewSession.patientName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Chief Complaint</Typography>
                  <Typography>{viewSession.chiefComplaint || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Provider</Typography>
                  <Typography>{viewSession.providerName || viewSession.provider || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Recording Duration</Typography>
                  <Typography>{formatDuration(viewSession.recordingDuration || viewSession.duration)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Urgency</Typography>
                  <Chip
                    label={viewSession.urgency || 'routine'}
                    size="small"
                    color={URGENCY_COLOR[viewSession.urgency] || 'default'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip
                    label={viewSession.status || 'draft'}
                    size="small"
                    color={STATUS_COLOR[viewSession.status] || 'default'}
                  />
                </Grid>
                {viewSession.icdCodes?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">ICD Codes</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {viewSession.icdCodes.map((code, i) => (
                        <Chip key={i} label={typeof code === 'object' ? `${code.code}: ${code.description}` : code} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
                {viewSession.recommendedSpecialty && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Recommended Specialty</Typography>
                    <Typography>{viewSession.recommendedSpecialty}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                  <Typography>{formatDate(viewSession.createdAt)}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Section 2: Audio Transcript */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Audio Transcript</Typography>
              <TranscriptBox label="Transcript" text={viewSession.audioTranscript} />

              <Divider sx={{ my: 2 }} />

              {/* Section 3: AI Clinical Summary */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AIIcon fontSize="small" color="primary" />
                  AI Clinical Summary
                </Box>
              </Typography>
              <TranscriptBox label="Clinical Summary" text={viewSession.clinicalSummary} />

              <Divider sx={{ my: 2 }} />

              {/* Section 4: Referral Note Draft */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <NoteIcon fontSize="small" color="action" />
                  Referral Note Draft
                </Box>
              </Typography>
              <TranscriptBox
                label="Referral Note"
                text={viewSession.approvedNote || viewSession.referralNoteDraft}
              />

              <Divider sx={{ my: 2 }} />

              {/* Section 5: Urgency Analysis */}
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Urgency Analysis</Typography>
              <Typography variant="body2" color="text.secondary">
                {viewSession.urgencyReason || '—'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
