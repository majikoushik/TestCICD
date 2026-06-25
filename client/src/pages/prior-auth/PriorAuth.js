import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, Button,
  Chip, TextField, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  IconButton, Tooltip, Card, CardContent, Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Gavel as GavelIcon,
  AutoAwesome as AIIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { ModernLoadingIndicator } from '../../components/common';
import { getPriorAuths, submitAppeal } from '../../services/priorAuthService';
import CreatePriorAuth from './CreatePriorAuth';

const STATUS_COLOR = {
  Pending: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Denied: 'error',
  Appealing: 'secondary',
  Expired: 'default'
};

const STATUS_ICON = {
  Pending: <PendingIcon fontSize="small" />,
  'Under Review': <AIIcon fontSize="small" />,
  Approved: <CheckCircleIcon fontSize="small" />,
  Denied: <CancelIcon fontSize="small" />,
  Appealing: <GavelIcon fontSize="small" />,
  Expired: <WarningIcon fontSize="small" />
};

function SummaryCard({ label, count, color }) {
  return (
    <Card variant="outlined" sx={{ textAlign: 'center' }}>
      <CardContent sx={{ py: 1.5 }}>
        <Typography variant="h4" color={color + '.main'} fontWeight={700}>{count}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function PriorAuth() {
  const [pas, setPas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPA, setSelectedPA] = useState(null);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [appealNotes, setAppealNotes] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const loadPAs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPriorAuths({ status: filterStatus });
      setPas(res.data?.priorAuths || []);
    } catch (err) {
      setError('Failed to load prior authorizations.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadPAs(); }, [loadPAs]);

  const filtered = pas.filter(p =>
    !searchQuery ||
    p.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.serviceType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayed = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const counts = {
    Pending: pas.filter(p => p.status === 'Pending').length,
    'Under Review': pas.filter(p => p.status === 'Under Review').length,
    Approved: pas.filter(p => p.status === 'Approved').length,
    Denied: pas.filter(p => p.status === 'Denied').length,
    Appealing: pas.filter(p => p.status === 'Appealing').length
  };

  const handleAppeal = async () => {
    if (!selectedPA || !appealNotes.trim()) return;
    try {
      setAppealLoading(true);
      await submitAppeal(selectedPA._id, appealNotes);
      setAppealDialogOpen(false);
      setAppealNotes('');
      setSelectedPA(null);
      loadPAs();
    } catch {
      setError('Failed to submit appeal.');
    } finally {
      setAppealLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Prior Authorizations</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadPAs}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Request
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard label="Pending" count={counts.Pending} color="warning" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard label="Under Review" count={counts['Under Review']} color="info" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard label="Approved" count={counts.Approved} color="success" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard label="Denied" count={counts.Denied} color="error" />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <SummaryCard label="Appealing" count={counts.Appealing} color="secondary" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search patient or service..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 0.5 }} /> }}
            sx={{ minWidth: 250 }}
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
                  <TableCell><strong>Urgency</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>AI Rec.</strong></TableCell>
                  <TableCell><strong>Submitted</strong></TableCell>
                  <TableCell><strong>Expiry</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No prior authorizations found
                    </TableCell>
                  </TableRow>
                ) : displayed.map((pa) => (
                  <TableRow key={pa._id} hover>
                    <TableCell>{pa.patientName}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{pa.serviceType}</Typography>
                      {pa.serviceCode && <Typography variant="caption" color="text.secondary">CPT: {pa.serviceCode}</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pa.urgency}
                        size="small"
                        color={pa.urgency === 'Emergent' ? 'error' : pa.urgency === 'Urgent' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={STATUS_ICON[pa.status]}
                        label={pa.status}
                        size="small"
                        color={STATUS_COLOR[pa.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {pa.aiRecommendation ? (
                        <Chip
                          label={pa.aiRecommendation}
                          size="small"
                          variant="outlined"
                          color={pa.aiRecommendation === 'Approve' ? 'success' : pa.aiRecommendation === 'Deny' ? 'error' : 'warning'}
                          icon={<AIIcon />}
                        />
                      ) : <Typography variant="caption" color="text.secondary">Pending</Typography>}
                    </TableCell>
                    <TableCell>{formatDate(pa.createdAt)}</TableCell>
                    <TableCell>{pa.expiryDate ? formatDate(pa.expiryDate) : '—'}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" color="primary" onClick={() => { setSelectedPA(pa); setDetailDialogOpen(true); }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {pa.status === 'Denied' && (
                        <Tooltip title="Submit Appeal">
                          <IconButton size="small" color="warning" onClick={() => { setSelectedPA(pa); setAppealDialogOpen(true); }}>
                            <GavelIcon fontSize="small" />
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
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPageOptions={[10]}
          />
        </Paper>
      )}

      {/* Create PA Dialog */}
      <CreatePriorAuth
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); loadPAs(); }}
      />

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Prior Authorization Details</DialogTitle>
        <DialogContent dividers>
          {selectedPA && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                <Typography>{selectedPA.patientName} (ID: {selectedPA.patientId})</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Service Requested</Typography>
                <Typography>{selectedPA.serviceType} {selectedPA.serviceCode ? `(CPT: ${selectedPA.serviceCode})` : ''}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip label={selectedPA.status} color={STATUS_COLOR[selectedPA.status] || 'default'} size="small" />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Urgency</Typography>
                <Chip label={selectedPA.urgency} size="small"
                  color={selectedPA.urgency === 'Emergent' ? 'error' : selectedPA.urgency === 'Urgent' ? 'warning' : 'default'} />
              </Grid>
              {selectedPA.insurancePlan && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Insurance Plan</Typography>
                  <Typography>{selectedPA.insurancePlan} {selectedPA.memberId ? `(ID: ${selectedPA.memberId})` : ''}</Typography>
                </Grid>
              )}
              {selectedPA.diagnosisCodes?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Diagnosis Codes</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {selectedPA.diagnosisCodes.map((d, i) => (
                      <Chip key={i} label={`${d.code}: ${d.description}`} size="small" variant="outlined" />
                    ))}
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
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.200' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AIIcon color="primary" />
                      <Typography variant="subtitle2" color="primary">AI Analysis</Typography>
                      <Chip
                        label={selectedPA.aiRecommendation}
                        size="small"
                        color={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'}
                      />
                      {selectedPA.aiConfidenceScore != null && (
                        <Typography variant="caption" color="text.secondary">
                          Confidence: {selectedPA.aiConfidenceScore}%
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2">{selectedPA.aiReasoning}</Typography>
                  </Paper>
                </Grid>
              )}
              {selectedPA.reviewerNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reviewer Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5 }}>
                    <Typography variant="body2">{selectedPA.reviewerNotes}</Typography>
                  </Paper>
                </Grid>
              )}
              {selectedPA.appealNotes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Appeal Notes</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5 }}>
                    <Typography variant="body2">{selectedPA.appealNotes}</Typography>
                  </Paper>
                </Grid>
              )}
              <Grid item xs={6} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Submitted</Typography>
                <Typography variant="body2">{formatDate(selectedPA.createdAt)}</Typography>
              </Grid>
              {selectedPA.approvedDate && (
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Approved</Typography>
                  <Typography variant="body2">{formatDate(selectedPA.approvedDate)}</Typography>
                </Grid>
              )}
              {selectedPA.expiryDate && (
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Expires</Typography>
                  <Typography variant="body2">{formatDate(selectedPA.expiryDate)}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPA?.status === 'Denied' && (
            <Button color="warning" startIcon={<GavelIcon />} onClick={() => { setDetailDialogOpen(false); setAppealDialogOpen(true); }}>
              Appeal
            </Button>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={appealDialogOpen} onClose={() => setAppealDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Submit Appeal</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide your clinical justification for appealing the denied prior authorization for <strong>{selectedPA?.patientName}</strong>.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Appeal Justification"
            value={appealNotes}
            onChange={(e) => setAppealNotes(e.target.value)}
            placeholder="Describe the clinical necessity and any additional supporting evidence..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAppealDialogOpen(false); setAppealNotes(''); }}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!appealNotes.trim() || appealLoading}
            onClick={handleAppeal}
          >
            {appealLoading ? 'Submitting...' : 'Submit Appeal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
