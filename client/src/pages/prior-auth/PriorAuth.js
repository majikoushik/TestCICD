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
import { LinearProgress, Stack, Divider } from '@mui/material';
import { FlashOn as AutoIcon, FormatQuote as GuidelinesIcon, History as HistoryIcon, Autorenew as RenewIcon, Chat as NotesIcon, Send as SendIcon } from '@mui/icons-material';
import { ModernLoadingIndicator } from '../../components/common';
import { getPriorAuths, submitAppeal, getAppealDraft, getPAHistory, addPANote } from '../../services/priorAuthService';
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

const PA_ACTION_META = {
  PA_SUBMITTED:       { label: 'Submitted',            color: 'primary' },
  PA_AI_ANALYZED:     { label: 'AI Analysis Complete', color: 'info' },
  PA_AUTO_APPROVED:   { label: 'Auto-Approved by AI',  color: 'success' },
  PA_APPROVED:        { label: 'Approved',              color: 'success' },
  PA_DENIED:          { label: 'Denied',                color: 'error' },
  PA_APPEALED:        { label: 'Appeal Submitted',      color: 'warning' },
  PA_APPEAL_APPROVED: { label: 'Appeal Approved',       color: 'success' },
  PA_APPEAL_DENIED:   { label: 'Appeal Denied',         color: 'error' },
  PA_EXPIRED:         { label: 'Expired',               color: 'default' },
  PA_ESCALATED:       { label: 'Escalated to Admin',    color: 'error' },
};

function PATimeline({ history, loading }) {
  if (loading) return <LinearProgress sx={{ mt: 1 }} />;
  if (!history || history.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No audit history available.</Typography>;
  }
  return (
    <Box sx={{ mt: 1 }}>
      {history.map((entry, i) => {
        const meta = PA_ACTION_META[entry.action] || { label: entry.action, color: 'default' };
        const isLast = i === history.length - 1;
        return (
          <Box key={i} sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: `${meta.color}.main`, flexShrink: 0 }} />
              {!isLast && <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 0.25, minHeight: 16 }} />}
            </Box>
            <Box sx={{ pb: isLast ? 0 : 2 }}>
              <Chip label={meta.label} size="small" color={meta.color} variant="outlined" sx={{ mb: 0.25 }} />
              <Typography variant="caption" color="text.secondary" display="block">
                {new Date(entry.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

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
  const [draftLoading, setDraftLoading] = useState(false);
  const [appealDraft, setAppealDraft] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paHistory, setPaHistory] = useState([]);
  // Renewal
  const [renewalSource, setRenewalSource] = useState(null);
  const [renewOpen, setRenewOpen] = useState(false);
  // Notes
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

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

  const handleViewHistory = async () => {
    if (!selectedPA) return;
    setHistoryOpen(true);
    setPaHistory([]);
    try {
      setHistoryLoading(true);
      const res = await getPAHistory(selectedPA._id);
      setPaHistory(res.data || []);
    } catch {
      setError('Failed to load audit history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedPA || !newNote.trim()) return;
    try {
      setNoteLoading(true);
      const res = await addPANote(selectedPA._id, newNote.trim());
      setSelectedPA(prev => prev ? { ...prev, notes: res.data } : prev);
      setNewNote('');
    } catch {
      setError('Failed to add note.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleGetAppealDraft = async () => {
    if (!selectedPA) return;
    try {
      setDraftLoading(true);
      const res = await getAppealDraft(selectedPA._id);
      const draft = res.data;
      setAppealNotes(draft.body || '');
      setAppealDraft(draft);
    } catch {
      setError('Failed to generate appeal draft. You can write your own justification.');
    } finally {
      setDraftLoading(false);
    }
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          icon={STATUS_ICON[pa.status]}
                          label={pa.status}
                          size="small"
                          color={STATUS_COLOR[pa.status] || 'default'}
                        />
                        {pa.autoApproved && (
                          <Tooltip title="Auto-approved by AI">
                            <AutoIcon fontSize="small" color="success" />
                          </Tooltip>
                        )}
                      </Box>
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
                      {pa.status === 'Expired' && (
                        <Tooltip title="Request Renewal">
                          <IconButton size="small" color="secondary" onClick={() => { setRenewalSource(pa); setRenewOpen(true); }}>
                            <RenewIcon fontSize="small" />
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

      {/* Renewal Dialog — key forces remount when renewalSource changes */}
      <CreatePriorAuth
        key={renewalSource?._id || 'renewal'}
        open={renewOpen}
        onClose={() => { setRenewOpen(false); setRenewalSource(null); }}
        onCreated={() => { setRenewOpen(false); setRenewalSource(null); loadPAs(); }}
        renewalOf={renewalSource?._id}
        prefillForm={renewalSource ? {
          patientId:         renewalSource.patientId,
          patientName:       renewalSource.patientName,
          referralId:        renewalSource.referralId || '',
          targetProviderName:renewalSource.targetProviderName || '',
          serviceType:       renewalSource.serviceType,
          serviceCode:       renewalSource.serviceCode || '',
          urgency:           renewalSource.urgency || 'Routine',
          insurancePlan:     renewalSource.insurancePlan || '',
          memberId:          renewalSource.memberId || '',
          clinicalNotes:     renewalSource.clinicalNotes || '',
          diagnosisCodes:    renewalSource.diagnosisCodes || [],
        } : null}
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
              {/* Denial reason code */}
              {selectedPA.denialReasonCode && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ mt: 0.5 }}>
                    <strong>Denial Reason (CARC {selectedPA.denialReasonCode}):</strong> {selectedPA.denialReasonDescription}
                  </Alert>
                </Grid>
              )}
              {/* Approval window */}
              {selectedPA.approvedDate && (
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ mt: 0.5 }}>
                    <strong>Approved</strong> {new Date(selectedPA.approvedDate).toLocaleDateString()} →
                    Expires <strong>{selectedPA.expiryDate ? new Date(selectedPA.expiryDate).toLocaleDateString() : '—'}</strong>
                    {' '}({selectedPA.approvalDurationDays || 90}-day window)
                    {selectedPA.autoApproved && <Chip icon={<AutoIcon />} label="Auto-approved by AI" size="small" color="success" variant="outlined" sx={{ ml: 1 }} />}
                  </Alert>
                </Grid>
              )}
              {selectedPA.aiRecommendation && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(25,118,210,0.04)', borderColor: 'primary.light' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AIIcon color="primary" />
                      <Typography variant="subtitle2" color="primary.main">AI Analysis</Typography>
                      <Chip
                        label={selectedPA.aiRecommendation}
                        size="small"
                        color={selectedPA.aiRecommendation === 'Approve' ? 'success' : selectedPA.aiRecommendation === 'Deny' ? 'error' : 'warning'}
                      />
                      {selectedPA.aiConfidenceScore != null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={selectedPA.aiConfidenceScore}
                            color={selectedPA.aiConfidenceScore >= 75 ? 'success' : selectedPA.aiConfidenceScore >= 50 ? 'warning' : 'error'}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{selectedPA.aiConfidenceScore}%</Typography>
                        </Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{selectedPA.aiReasoning}</Typography>
                    {selectedPA.aiKeyFactors?.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Key Factors:</Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                          {selectedPA.aiKeyFactors.map((f, i) => <Chip key={i} label={f} size="small" variant="outlined" />)}
                        </Stack>
                      </Box>
                    )}
                    {selectedPA.aiGuidelinesCited?.length > 0 && (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <GuidelinesIcon fontSize="small" color="action" />
                          <Typography variant="caption" fontWeight={600} color="text.secondary">Guidelines Cited:</Typography>
                        </Box>
                        {selectedPA.aiGuidelinesCited.map((g, i) => (
                          <Typography key={i} variant="caption" display="block" color="text.secondary" sx={{ ml: 1.5 }}>• {g}</Typography>
                        ))}
                      </Box>
                    )}
                    {selectedPA.aiSuggestedAction && (
                      <Alert severity="info" sx={{ mt: 1 }} icon={false}>
                        <Typography variant="caption"><strong>AI Suggestion:</strong> {selectedPA.aiSuggestedAction}</Typography>
                      </Alert>
                    )}
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

              {/* Notes Thread */}
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <NotesIcon fontSize="small" color="action" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Clinical Notes Thread {selectedPA.notes?.length > 0 ? `(${selectedPA.notes.length})` : ''}
                  </Typography>
                </Box>
                {selectedPA.notes?.length > 0 ? (
                  <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                    {selectedPA.notes.map((note, i) => {
                      const isAdmin = ['admin', 'superadmin'].includes(note.authorRole);
                      return (
                        <Box key={i} sx={{ mb: i < selectedPA.notes.length - 1 ? 1.5 : 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{
                              maxWidth: '85%',
                              bgcolor: isAdmin ? 'rgba(76,175,80,0.06)' : 'rgba(25,118,210,0.06)',
                              border: '1px solid',
                              borderColor: isAdmin ? 'rgba(76,175,80,0.4)' : 'rgba(25,118,210,0.3)',
                              borderRadius: 1.5,
                              px: 1.5, py: 0.75,
                            }}>
                              <Typography variant="caption" fontWeight={600} color={isAdmin ? 'success.main' : 'primary.main'} display="block">
                                {note.authorEmail || note.authorRole} {isAdmin ? '(Admin)' : '(Provider)'}
                              </Typography>
                              <Typography variant="body2">{note.message}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(note.createdAt).toLocaleString()}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>No notes yet — start the conversation with the admin team.</Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add a clinical note or question for the admin team..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && newNote.trim()) { e.preventDefault(); handleAddNote(); } }}
                    multiline
                    maxRows={3}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!newNote.trim() || noteLoading}
                    onClick={handleAddNote}
                    sx={{ minWidth: 40, px: 1 }}
                  >
                    <SendIcon fontSize="small" />
                  </Button>
                </Box>
              </Grid>

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
          <Button startIcon={<HistoryIcon />} onClick={handleViewHistory} sx={{ mr: 'auto' }}>
            Audit Trail
          </Button>
          {selectedPA?.status === 'Denied' && (
            <Button color="warning" startIcon={<GavelIcon />} onClick={() => { setDetailDialogOpen(false); setAppealDialogOpen(true); }}>
              Appeal
            </Button>
          )}
          {selectedPA?.status === 'Expired' && (
            <Button color="secondary" startIcon={<RenewIcon />} onClick={() => { setDetailDialogOpen(false); setRenewalSource(selectedPA); setRenewOpen(true); }}>
              Renew
            </Button>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon fontSize="small" />
          Audit Trail — {selectedPA?.patientName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {selectedPA?.serviceType} · Submitted {selectedPA ? new Date(selectedPA.createdAt).toLocaleDateString() : ''}
          </Typography>
          <PATimeline history={paHistory} loading={historyLoading} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Appeal Dialog */}
      <Dialog open={appealDialogOpen} onClose={() => { setAppealDialogOpen(false); setAppealNotes(''); setAppealDraft(null); }} fullWidth maxWidth="sm">
        <DialogTitle>Submit Appeal</DialogTitle>
        <DialogContent>
          {selectedPA?.denialReasonCode && (
            <Alert severity="error" sx={{ mb: 2 }} icon={false}>
              <Typography variant="caption"><strong>Denial Reason (CARC {selectedPA.denialReasonCode}):</strong> {selectedPA.denialReasonDescription}</Typography>
            </Alert>
          )}
          {selectedPA?.appealCount >= 1 && (
            <Alert severity="warning" sx={{ mb: 2 }}>You have already submitted 1 appeal for this authorization. This is your final appeal opportunity.</Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Provide your clinical justification for appealing the denied prior authorization for <strong>{selectedPA?.patientName}</strong>.
          </DialogContentText>
          {appealDraft && (
            <Alert severity="info" sx={{ mb: 2 }}>
              AI draft loaded — review and edit before submitting.
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={7}
            label="Appeal Justification"
            value={appealNotes}
            onChange={(e) => setAppealNotes(e.target.value)}
            placeholder="Describe the clinical necessity and any additional supporting evidence..."
          />
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<AIIcon />}
            onClick={handleGetAppealDraft}
            disabled={draftLoading}
            sx={{ mr: 'auto' }}
          >
            {draftLoading ? 'Generating...' : 'AI Draft'}
          </Button>
          <Button onClick={() => { setAppealDialogOpen(false); setAppealNotes(''); setAppealDraft(null); }}>Cancel</Button>
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
