import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Grid, Card, CardContent, LinearProgress,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as ApproveIcon,
  Cancel as DenyIcon,
  AutoAwesome as AIIcon,
  Gavel as GavelIcon,
  Assessment as StatsIcon,
  HourglassEmpty as PendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ModernLoadingIndicator } from '../../components/common';
import { adminGetPriorAuths, adminReviewPriorAuth, adminReviewAppeal, adminTriggerAI } from '../../services/priorAuthService';

const STATUS_COLOR = {
  Pending: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Denied: 'error',
  Appealing: 'secondary',
  Expired: 'default'
};

const PIE_COLORS = ['#ff9800', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#9e9e9e'];

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

export default function AdminPriorAuth() {
  const [pas, setPas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(15);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPA, setSelectedPA] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminGetPriorAuths({ status: filterStatus, search: searchQuery });
      setPas(res.data?.priorAuths || []);
      setStats(res.data?.stats || {});
    } catch {
      setError('Failed to load prior authorizations.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const displayed = pas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleReview = async () => {
    if (!selectedPA || !reviewDecision) return;
    try {
      setReviewLoading(true);
      const isAppeal = selectedPA.status === 'Appealing';
      if (isAppeal) {
        await adminReviewAppeal(selectedPA._id, reviewDecision, reviewNotes);
      } else {
        await adminReviewPriorAuth(selectedPA._id, reviewDecision, reviewNotes);
      }
      setReviewOpen(false);
      setReviewDecision('');
      setReviewNotes('');
      setSelectedPA(null);
      load();
    } catch {
      setError('Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAIAnalysis = async (pa) => {
    try {
      setAiLoading(true);
      const res = await adminTriggerAI(pa._id);
      setSelectedPA(prev => prev?._id === pa._id ? { ...prev, ...res.data.pa } : prev);
      load();
    } catch {
      setError('AI analysis failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  const pieData = Object.entries(stats).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

  const canReview = selectedPA && ['Pending', 'Under Review', 'Appealing'].includes(selectedPA.status);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Prior Authorization Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="View Statistics">
            <IconButton onClick={() => setStatsOpen(true)}><StatsIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Pending', key: 'Pending', color: 'warning', icon: <PendingIcon /> },
          { label: 'Under Review', key: 'Under Review', color: 'info', icon: <AIIcon /> },
          { label: 'Approved', key: 'Approved', color: 'success', icon: <ApproveIcon /> },
          { label: 'Denied', key: 'Denied', color: 'error', icon: <DenyIcon /> },
          { label: 'Appealing', key: 'Appealing', color: 'secondary', icon: <GavelIcon /> },
          { label: 'Expired', key: 'Expired', color: 'default', icon: <WarningIcon /> }
        ].map(({ label, key, color, icon }) => (
          <Grid item xs={6} sm={4} md={2} key={key}>
            <StatCard label={label} count={stats[key] || 0} color={color} icon={icon} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search patient, service, provider..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 0.5 }} /> }}
            sx={{ minWidth: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Under Review">Under Review</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Denied">Denied</MenuItem>
              <MenuItem value="Appealing">Appealing</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <ModernLoadingIndicator message="Loading prior authorizations..." />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Patient</strong></TableCell>
                  <TableCell><strong>Service</strong></TableCell>
                  <TableCell><strong>Provider</strong></TableCell>
                  <TableCell><strong>Urgency</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>AI Rec.</strong></TableCell>
                  <TableCell><strong>AI Conf.</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No prior authorizations found
                    </TableCell>
                  </TableRow>
                ) : displayed.map((pa) => (
                  <TableRow key={pa._id} hover>
                    <TableCell>{pa.patientName}</TableCell>
                    <TableCell>{pa.serviceType}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>{pa.requestingProviderName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={pa.urgency} size="small"
                        color={pa.urgency === 'Emergent' ? 'error' : pa.urgency === 'Urgent' ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={pa.status} size="small" color={STATUS_COLOR[pa.status] || 'default'} />
                    </TableCell>
                    <TableCell>
                      {pa.aiRecommendation ? (
                        <Chip label={pa.aiRecommendation} size="small" variant="outlined"
                          color={pa.aiRecommendation === 'Approve' ? 'success' : pa.aiRecommendation === 'Deny' ? 'error' : 'warning'} />
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      {pa.aiConfidenceScore != null ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pa.aiConfidenceScore}
                            sx={{ width: 50, height: 6, borderRadius: 3 }}
                            color={pa.aiConfidenceScore >= 75 ? 'success' : pa.aiConfidenceScore >= 50 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption">{pa.aiConfidenceScore}%</Typography>
                        </Box>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>{formatDate(pa.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" color="primary" onClick={() => { setSelectedPA(pa); setDetailOpen(true); }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canReview && pa._id === selectedPA?._id ? null : (['Pending', 'Under Review', 'Appealing'].includes(pa.status)) && (
                        <Tooltip title="Review / Decide">
                          <IconButton size="small" color="success" onClick={() => { setSelectedPA(pa); setReviewDecision(''); setReviewNotes(''); setReviewOpen(true); }}>
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!pa.aiRecommendation && (
                        <Tooltip title="Run AI Analysis">
                          <IconButton size="small" color="info" disabled={aiLoading} onClick={() => handleAIAnalysis(pa)}>
                            <AIIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pas.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPageOptions={[15]}
          />
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Prior Authorization Details</DialogTitle>
        <DialogContent dividers>
          {selectedPA && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Patient</Typography><Typography>{selectedPA.patientName} (ID: {selectedPA.patientId})</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Requesting Provider</Typography><Typography>{selectedPA.requestingProviderName}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Service</Typography><Typography>{selectedPA.serviceType} {selectedPA.serviceCode ? `(CPT: ${selectedPA.serviceCode})` : ''}</Typography></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Status</Typography><Chip label={selectedPA.status} color={STATUS_COLOR[selectedPA.status] || 'default'} size="small" /></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Urgency</Typography><Chip label={selectedPA.urgency} size="small" color={selectedPA.urgency === 'Emergent' ? 'error' : selectedPA.urgency === 'Urgent' ? 'warning' : 'default'} /></Grid>
              <Grid item xs={12} md={6}><Typography variant="subtitle2" color="text.secondary">Insurance</Typography><Typography>{selectedPA.insurancePlan || 'Not specified'} {selectedPA.memberId ? `(Member: ${selectedPA.memberId})` : ''}</Typography></Grid>
              {selectedPA.diagnosisCodes?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Diagnosis Codes</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {selectedPA.diagnosisCodes.map((d, i) => <Chip key={i} label={`${d.code}: ${d.description}`} size="small" variant="outlined" />)}
                  </Box>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Clinical Notes</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">{selectedPA.clinicalNotes}</Typography>
                </Paper>
              </Grid>
              {selectedPA.aiRecommendation && (
                <Grid item xs={12}>
                  <Divider />
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'primary.50' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AIIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle2" color="primary">AI Analysis</Typography>
                      <Chip label={selectedPA.aiRecommendation} size="small"
                        color={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'} />
                      {selectedPA.aiConfidenceScore != null && (
                        <Typography variant="caption">Confidence: {selectedPA.aiConfidenceScore}%</Typography>
                      )}
                    </Box>
                    <Typography variant="body2">{selectedPA.aiReasoning}</Typography>
                    {selectedPA.aiAnalyzedAt && (
                      <Typography variant="caption" color="text.secondary">Analyzed: {formatDate(selectedPA.aiAnalyzedAt)}</Typography>
                    )}
                  </Paper>
                </Grid>
              )}
              {selectedPA.reviewerNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reviewer Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5 }}><Typography variant="body2">{selectedPA.reviewerNotes}</Typography></Paper>
                </Grid>
              )}
              {selectedPA.appealNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ color: 'warning.main' }}>Appeal Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, borderColor: 'warning.main' }}><Typography variant="body2">{selectedPA.appealNotes}</Typography></Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPA && ['Pending', 'Under Review', 'Appealing'].includes(selectedPA.status) && (
            <Button variant="contained" color="primary" onClick={() => { setDetailOpen(false); setReviewDecision(''); setReviewNotes(''); setReviewOpen(true); }}>
              Review & Decide
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedPA?.status === 'Appealing' ? 'Review Appeal' : 'Review Prior Authorization'}
        </DialogTitle>
        <DialogContent>
          {selectedPA && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Patient: <strong>{selectedPA.patientName}</strong> | Service: <strong>{selectedPA.serviceType}</strong>
              </Typography>
              {selectedPA.aiRecommendation && (
                <Alert severity={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                  <strong>AI Recommendation: {selectedPA.aiRecommendation}</strong> (Confidence: {selectedPA.aiConfidenceScore}%)
                  <Typography variant="body2">{selectedPA.aiReasoning}</Typography>
                </Alert>
              )}
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <InputLabel>Decision</InputLabel>
                <Select value={reviewDecision} label="Decision" onChange={(e) => setReviewDecision(e.target.value)}>
                  <MenuItem value="Approved">Approve</MenuItem>
                  <MenuItem value="Denied">Deny</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reviewer Notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide justification for your decision..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={reviewDecision === 'Approved' ? 'success' : reviewDecision === 'Denied' ? 'error' : 'primary'}
            disabled={!reviewDecision || reviewLoading}
            onClick={handleReview}
          >
            {reviewLoading ? 'Saving...' : reviewDecision === 'Approved' ? 'Approve' : reviewDecision === 'Denied' ? 'Deny' : 'Submit Decision'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsOpen} onClose={() => setStatsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Prior Authorization Statistics</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle1" gutterBottom>Status Distribution</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map((entry, index) => <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={7}>
              <Typography variant="subtitle1" gutterBottom>Count by Status</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={Object.entries(stats).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#2196f3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
