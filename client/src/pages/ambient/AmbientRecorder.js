import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as AIIcon,
  Assignment as NoteIcon,
  Visibility as ViewIcon,
  Send as SendIcon
} from '@mui/icons-material';
import ambientSessionService from '../../services/ambientSessionService';
import PatientSearchAutocomplete from '../../components/common/PatientSearchAutocomplete';

const STEPS = ['Patient & Setup', 'Record & Transcribe', 'Review & Approve'];

const URGENCY_COLOR = {
  routine: 'info',
  urgent: 'warning',
  emergent: 'error'
};

const STATUS_COLOR = {
  pending: 'warning',
  processing: 'info',
  completed: 'success',
  approved: 'success',
  rejected: 'error',
  failed: 'error'
};

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

export default function AmbientRecorder() {
  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // Form state (Step 0)
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientDOB: '',
    patientInsurance: '',
    chiefComplaint: ''
  });

  // Recording state (Step 1)
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Session result (Step 2)
  const [currentSession, setCurrentSession] = useState(null);
  const [editedNote, setEditedNote] = useState('');
  const [editedSummary, setEditedSummary] = useState('');
  const [editedUrgency, setEditedUrgency] = useState('routine');
  const [editedUrgencyReason, setEditedUrgencyReason] = useState('');

  // Tab 1 — My Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [viewSession, setViewSession] = useState(null);

  // Server-side (Azure Speech) transcription state — best-effort, never blocks the flow
  const [serverTranscribing, setServerTranscribing] = useState(false);

  // Refs
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Speech recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      setError('Speech recognition error: ' + event.error);
      stopRecording();
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // Load sessions when switching to Tab 1
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await ambientSessionService.getSessions({ page: sessionsPage + 1, limit: rowsPerPage });
      const data = res.data || res;
      setSessions(data.sessions || data || []);
      setSessionsTotal(data.total || (data.sessions ? data.sessions.length : (data.length || 0)));
    } catch (err) {
      setSessionsError('Failed to load sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionsPage, rowsPerPage]);

  useEffect(() => {
    if (activeTab === 1) {
      loadSessions();
    }
  }, [activeTab, loadSessions]);

  const handleFormChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleStartRecording = () => {
    if (recognitionRef.current && speechSupported) {
      finalTranscriptRef.current = transcript;
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
      } catch (e) { /* already started */ }
    }
    setIsRecording(true);

    // Best-effort: also capture raw audio so the server can run it through
    // Azure Speech for a (usually more accurate) final transcript once
    // recording stops. If the browser/mic isn't available, the Web Speech
    // API transcript above is still the source of truth — nothing else
    // in the flow depends on this succeeding.
    if (navigator.mediaDevices && window.MediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          audioChunksRef.current = [];
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current = recorder;
          recorder.start();
        })
        .catch(() => { /* mic denied/unavailable — Web Speech transcript still works */ });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsRecording(false);
    setInterimTranscript('');

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      const mimeType = recorder.mimeType || 'audio/webm';
      recorder.onstop = async () => {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (!chunks.length) return;

        const blob = new Blob(chunks, { type: mimeType });
        setServerTranscribing(true);
        try {
          const res = await ambientSessionService.transcribeAudio(blob, `recording.${mimeType.split('/')[1]?.split(';')[0] || 'webm'}`);
          const data = res?.data || res;
          // Only override when Azure Speech was actually configured and
          // returned real text — otherwise keep the Web Speech transcript.
          if (data && !data.stub && data.transcript) {
            finalTranscriptRef.current = data.transcript;
            setTranscript(data.transcript);
          }
        } catch (err) {
          // Non-fatal — the browser transcript already covers this session.
          console.error('Server-side transcription failed, keeping Web Speech transcript:', err);
        } finally {
          setServerTranscribing(false);
        }
      };
      try { recorder.stop(); } catch (e) { /* already stopped */ }
    }
  };

  const handleSubmitForAnalysis = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await ambientSessionService.createSession({
        patientId: form.patientId,
        patientName: form.patientName,
        patientDOB: form.patientDOB,
        patientInsurance: form.patientInsurance,
        chiefComplaint: form.chiefComplaint,
        audioTranscript: transcript,
        recordingDuration: elapsedSeconds
      });
      const session = res.data?.session || res.data || res;
      setCurrentSession(session);
      setEditedNote(session.referralNoteDraft || '');
      setEditedSummary(session.clinicalSummary || '');
      setEditedUrgency(session.urgencyClassification || 'routine');
      setEditedUrgencyReason(session.urgencyReason || '');
      setActiveStep(2);
    } catch (err) {
      setError('Failed to submit for AI analysis. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!currentSession) return;
    setSubmitting(true);
    setError(null);
    try {
      await ambientSessionService.reviewSession(currentSession._id, {
        action: 'approve',
        approvedNote: editedNote,
        urgencyClassification: editedUrgency
      });
      setSuccess('Session approved! The referral note has been saved.');
    } catch (err) {
      setError('Failed to approve session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentSession) return;
    setSubmitting(true);
    setError(null);
    try {
      await ambientSessionService.reviewSession(currentSession._id, { action: 'reject' });
      setSuccess('Session rejected.');
    } catch (err) {
      setError('Failed to reject session.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    stopRecording();
    setActiveStep(0);
    setSelectedPatient(null);
    setForm({ patientId: '', patientName: '', patientDOB: '', patientInsurance: '', chiefComplaint: '' });
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    setElapsedSeconds(0);
    setCurrentSession(null);
    setEditedNote('');
    setEditedSummary('');
    setEditedUrgency('routine');
    setEditedUrgencyReason('');
    setError(null);
    setSuccess(null);
  };

  const handlePatientSelect = (_, patient) => {
    if (patient) {
      const name = patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
      const dob = patient.dateOfBirth || patient.birthDate || '';
      const insurance = patient.insuranceInfo?.provider || '';
      setSelectedPatient(patient);
      setForm(prev => ({
        ...prev,
        patientId: patient.patientId || patient._id || '',
        patientName: name,
        patientDOB: dob ? new Date(dob).toISOString().split('T')[0] : '',
        patientInsurance: prev.patientInsurance || insurance
      }));
    } else {
      setSelectedPatient(null);
      setForm(prev => ({ ...prev, patientId: '', patientName: '', patientDOB: '', patientInsurance: '' }));
    }
  };

  // ---- Step 0 ----
  const renderStep0 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Patient & Setup</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <PatientSearchAutocomplete
            required
            value={selectedPatient}
            onChange={handlePatientSelect}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Chief Complaint"
            value={form.chiefComplaint}
            onChange={handleFormChange('chiefComplaint')}
            multiline
            rows={3}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Patient Date of Birth"
            type="date"
            value={form.patientDOB}
            onChange={handleFormChange('patientDOB')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Patient Insurance"
            value={form.patientInsurance}
            onChange={handleFormChange('patientInsurance')}
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<MicIcon />}
          disabled={!form.chiefComplaint.trim() || !selectedPatient}
          onClick={() => setActiveStep(1)}
          size="large"
        >
          Start Recording
        </Button>
      </Box>
    </Box>
  );

  // ---- Step 1 ----
  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Record & Transcribe</Typography>

      {!speechSupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Speech recognition not supported in this browser. Please use Chrome. You can manually type the transcript below.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Recording indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {isRecording ? (
          <Chip
            label={`● REC ${formatDuration(elapsedSeconds)}`}
            color="error"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              px: 1,
              animation: 'pulse 1.2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }}
          />
        ) : (
          <Chip
            label={elapsedSeconds > 0 ? `Stopped — ${formatDuration(elapsedSeconds)} recorded` : 'Not recording'}
            color="default"
            sx={{ fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Live transcript display */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, minHeight: 80, bgcolor: 'grey.50', maxHeight: 160, overflowY: 'auto' }}
      >
        <Typography variant="body2" component="span">{transcript}</Typography>
        {interimTranscript && (
          <Typography variant="body2" component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {interimTranscript}
          </Typography>
        )}
        {!transcript && !interimTranscript && (
          <Typography variant="body2" color="text.disabled">Live transcript will appear here...</Typography>
        )}
      </Paper>

      {/* Editable transcript */}
      <TextField
        fullWidth
        multiline
        rows={6}
        label="Full Transcript (editable)"
        value={transcript}
        onChange={(e) => { setTranscript(e.target.value); finalTranscriptRef.current = e.target.value; }}
        sx={{ mb: 2 }}
        placeholder="Transcript will populate automatically while recording, or type manually here..."
      />

      {/* Recording controls */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {isRecording ? (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopRecording}
          >
            Stop Recording
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            startIcon={<MicIcon />}
            onClick={handleStartRecording}
            disabled={!speechSupported}
          >
            Start Recording
          </Button>
        )}

        <Button
          variant="contained"
          startIcon={(submitting || serverTranscribing) ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          disabled={transcript.length <= 10 || isRecording || submitting || serverTranscribing}
          onClick={handleSubmitForAnalysis}
          color="primary"
        >
          {submitting ? 'Analyzing...' : serverTranscribing ? 'Finalizing transcript...' : 'Submit for AI Analysis'}
        </Button>

        <Button variant="outlined" onClick={() => setActiveStep(0)}>
          Back
        </Button>
      </Box>

      {submitting && <LinearProgress sx={{ mt: 2 }} />}
    </Box>
  );

  // ---- Step 2 ----
  const renderStep2 = () => {
    if (!currentSession) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>Review & Approve</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
            <Box sx={{ mt: 1 }}>
              <Button size="small" variant="outlined" onClick={resetAll} startIcon={<MicIcon />}>
                Start New Recording
              </Button>
            </Box>
          </Alert>
        )}

        {/* Top chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          <Chip
            label={`Urgency: ${currentSession.urgencyClassification || 'routine'}`}
            color={URGENCY_COLOR[currentSession.urgencyClassification] || 'default'}
            icon={<AIIcon />}
          />
          {currentSession.recommendedSpecialty && (
            <Chip
              label={`Specialty: ${currentSession.recommendedSpecialty}`}
              color="primary"
              variant="outlined"
            />
          )}
          {(currentSession.icdCodes || []).map((code, i) => (
            <Chip key={i} label={code} size="small" variant="outlined" />
          ))}
        </Box>

        <Grid container spacing={3}>
          {/* Clinical Summary */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Clinical Summary</Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Review and edit the AI-generated clinical summary:"
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
            />
          </Grid>

          {/* Referral Note Draft */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Referral Note Draft</Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              label="Review and edit the AI-drafted referral note:"
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
            />
          </Grid>

          {/* Urgency Classification */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Urgency Classification</Typography>
            <FormControl fullWidth>
              <InputLabel>Urgency</InputLabel>
              <Select
                value={editedUrgency}
                label="Urgency"
                onChange={(e) => setEditedUrgency(e.target.value)}
              >
                <MenuItem value="routine">Routine</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
                <MenuItem value="emergent">Emergent</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Urgency Reason */}
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Urgency Reason</Typography>
            <TextField
              fullWidth
              label="Urgency Reason"
              value={editedUrgencyReason}
              onChange={(e) => setEditedUrgencyReason(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            disabled={submitting || !!success}
            onClick={handleApprove}
          >
            Approve & Submit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            disabled={submitting || !!success}
            onClick={handleReject}
          >
            Reject
          </Button>
          <Button variant="outlined" onClick={() => setActiveStep(1)} disabled={submitting || !!success}>
            Back
          </Button>
        </Box>

        {submitting && <LinearProgress sx={{ mt: 2 }} />}
      </Box>
    );
  };

  // ---- Tab 1 ----
  const renderSessionsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">My Ambient Sessions</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadSessions}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {sessionsError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSessionsError(null)}>{sessionsError}</Alert>
      )}

      {sessionsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Patient</strong></TableCell>
                  <TableCell><strong>Chief Complaint</strong></TableCell>
                  <TableCell><strong>Urgency</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Duration</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No sessions found
                    </TableCell>
                  </TableRow>
                ) : sessions.map((s) => (
                  <TableRow key={s._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{s.patientName}</Typography>
                      {s.patientId && (
                        <Typography variant="caption" color="text.secondary">ID: {s.patientId}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.chiefComplaint}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.urgencyClassification ? (
                        <Chip
                          label={s.urgencyClassification}
                          size="small"
                          color={URGENCY_COLOR[s.urgencyClassification] || 'default'}
                        />
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={s.status || 'pending'}
                        size="small"
                        color={STATUS_COLOR[s.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {s.recordingDuration != null ? formatDuration(s.recordingDuration) : '—'}
                    </TableCell>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Session">
                        <IconButton size="small" color="primary" onClick={() => setViewSession(s)}>
                          <ViewIcon fontSize="small" />
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
            count={sessionsTotal}
            rowsPerPage={rowsPerPage}
            page={sessionsPage}
            onPageChange={(e, p) => setSessionsPage(p)}
            rowsPerPageOptions={[10]}
          />
        </Paper>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewSession} onClose={() => setViewSession(null)} fullWidth maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Session Details</Typography>
            <IconButton onClick={() => setViewSession(null)}><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {viewSession && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Patient</Typography>
                <Typography>{viewSession.patientName} {viewSession.patientId ? `(ID: ${viewSession.patientId})` : ''}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Chief Complaint</Typography>
                <Typography>{viewSession.chiefComplaint}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                <Chip label={viewSession.status || 'pending'} size="small" color={STATUS_COLOR[viewSession.status] || 'default'} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Urgency</Typography>
                {viewSession.urgencyClassification ? (
                  <Chip label={viewSession.urgencyClassification} size="small" color={URGENCY_COLOR[viewSession.urgencyClassification] || 'default'} />
                ) : <Typography variant="body2">—</Typography>}
              </Grid>
              {viewSession.urgencyReason && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Urgency Reason</Typography>
                  <Typography variant="body2">{viewSession.urgencyReason}</Typography>
                </Grid>
              )}
              {viewSession.recommendedSpecialty && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Recommended Specialty</Typography>
                  <Typography variant="body2">{viewSession.recommendedSpecialty}</Typography>
                </Grid>
              )}
              {viewSession.recordingDuration != null && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Recording Duration</Typography>
                  <Typography variant="body2">{formatDuration(viewSession.recordingDuration)}</Typography>
                </Grid>
              )}
              {viewSession.audioTranscript && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Transcript</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50', maxHeight: 160, overflowY: 'auto' }}>
                    <Typography variant="body2">{viewSession.audioTranscript}</Typography>
                  </Paper>
                </Grid>
              )}
              {viewSession.clinicalSummary && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Clinical Summary</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{viewSession.clinicalSummary}</Typography>
                  </Paper>
                </Grid>
              )}
              {viewSession.referralNoteDraft && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Referral Note Draft</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50', maxHeight: 200, overflowY: 'auto' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewSession.referralNoteDraft}</Typography>
                  </Paper>
                </Grid>
              )}
              {(viewSession.icdCodes || []).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">ICD Codes</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {viewSession.icdCodes.map((code, i) => (
                      <Chip key={i} label={code} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}
              <Grid item xs={6} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                <Typography variant="body2">{formatDate(viewSession.createdAt)}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AIIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">Ambient Clinical Intelligence</Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={activeTab === 1 ? loadSessions : undefined}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tab toggle — matching prior-auth page style */}
      <Paper sx={{ p: 1, mb: 3, display: 'inline-flex', gap: 1, borderRadius: 2 }}>
        <Button
          variant={activeTab === 0 ? 'contained' : 'text'}
          onClick={() => setActiveTab(0)}
          startIcon={<MicIcon />}
        >
          New Recording
        </Button>
        <Button
          variant={activeTab === 1 ? 'contained' : 'text'}
          onClick={() => setActiveTab(1)}
          startIcon={<NoteIcon />}
        >
          My Sessions
        </Button>
      </Paper>

      {/* Tab 0 — New Recording */}
      {activeTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && renderStep0()}
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
        </Paper>
      )}

      {/* Tab 1 — My Sessions */}
      {activeTab === 1 && renderSessionsTab()}
    </Container>
  );
}
