import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  LinearProgress,
  Paper,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Mic,
  MicOff,
  AutoAwesome,
  CheckCircle,
  Close,
  Psychology,
  RecordVoiceOver,
} from '@mui/icons-material';

// Synthetic/demo mode mock data
const MOCK_TRANSCRIPT_LINES = [
  'Patient is a 58-year-old male presenting with chest pain and shortness of breath.',
  'Symptoms began approximately three days ago, worsening with exertion.',
  'Patient reports associated palpitations and occasional dizziness.',
  'Past medical history significant for hypertension and type 2 diabetes.',
  'Current medications include metformin 1000mg twice daily and lisinopril 10mg daily.',
  'Family history notable for coronary artery disease in father at age 62.',
  'No known drug allergies.',
  'Review of systems positive for fatigue and bilateral lower extremity edema.',
  'Vital signs: BP 148/92, HR 88, RR 18, O2 sat 96% on room air.',
  'Physical exam reveals irregular heart rhythm and mild pulmonary crackles at bases.',
];

const MOCK_AI_CONTENT = {
  clinicalSummary:
    '58-year-old male with hypertension and T2DM presenting with 3-day history of exertional chest pain, palpitations, and dyspnea. Physical examination reveals irregular rhythm and bibasilar crackles consistent with possible new-onset atrial fibrillation with early heart failure. Urgent cardiology evaluation warranted given clinical findings and risk factor burden.',
  suggestedSpecialty: 'Cardiology',
  urgencyClassification: 'Urgent',
  icd10Codes: [
    { code: 'I48.0', label: 'Paroxysmal atrial fibrillation' },
    { code: 'I50.9', label: 'Heart failure, unspecified' },
    { code: 'R07.9', label: 'Chest pain, unspecified' },
    { code: 'I10', label: 'Essential hypertension' },
    { code: 'E11.9', label: 'Type 2 diabetes mellitus without complications' },
  ],
  referralNoteDraft:
    'Dear Cardiology Colleague,\n\nI am referring this 58-year-old male patient for urgent evaluation of new-onset atrial fibrillation with signs of early heart failure. The patient presents with a 3-day history of chest pain, dyspnea on exertion, palpitations, and dizziness. Examination today demonstrates an irregular cardiac rhythm and bibasilar crackles.\n\nRelevant history includes hypertension (on lisinopril 10mg), type 2 diabetes (on metformin 1000mg BID), and a positive family history of CAD. Current vitals: BP 148/92, HR 88 (irregular), O2 sat 96% RA.\n\nPlease evaluate for AF management, assess LV function, and advise on anticoagulation. I have arranged for an EKG and BNP — results will be forwarded.\n\nThank you for your urgent consultation.',
};

const SESSION_STEPS = ['Idle', 'Recording', 'Processing', 'Complete'];

const STEP_INDEX = {
  idle: 0,
  recording: 1,
  processing: 2,
  complete: 3,
};

const URGENCY_COLORS = {
  Routine: 'success',
  Urgent: 'warning',
  Emergent: 'error',
};

function AmbientIntelligenceWidget({ onContentGenerated }) {
  const [open, setOpen] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [aiContent, setAiContent] = useState(null);
  const [editableNote, setEditableNote] = useState('');
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const transcriptIntervalRef = useRef(null);
  const transcriptLineIndexRef = useRef(0);
  const transcriptEndRef = useRef(null);

  const isSyntheticMode = !process.env.REACT_APP_AZURE_SPEECH_KEY;

  const resetSession = useCallback(() => {
    setSessionStatus('idle');
    setTranscript('');
    setAiContent(null);
    setEditableNote('');
    setError(null);
    setSessionId(null);
    transcriptLineIndexRef.current = 0;
    if (transcriptIntervalRef.current) {
      clearInterval(transcriptIntervalRef.current);
      transcriptIntervalRef.current = null;
    }
  }, []);

  const handleOpen = () => {
    resetSession();
    setOpen(true);
  };

  const handleClose = () => {
    resetSession();
    setOpen(false);
  };

  // Scroll transcript to bottom as lines are added
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
      }
    };
  }, []);

  const runSyntheticSession = useCallback(() => {
    setSessionStatus('recording');
    transcriptLineIndexRef.current = 0;

    // Add a mock transcript line every 600ms
    transcriptIntervalRef.current = setInterval(() => {
      const idx = transcriptLineIndexRef.current;
      if (idx < MOCK_TRANSCRIPT_LINES.length) {
        setTranscript((prev) =>
          prev ? prev + '\n' + MOCK_TRANSCRIPT_LINES[idx] : MOCK_TRANSCRIPT_LINES[idx]
        );
        transcriptLineIndexRef.current += 1;
      } else {
        // All lines added — move to processing
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
        setSessionStatus('processing');

        // Simulate AI processing delay
        setTimeout(() => {
          setAiContent(MOCK_AI_CONTENT);
          setEditableNote(MOCK_AI_CONTENT.referralNoteDraft);
          setSessionStatus('complete');
        }, 2000);
      }
    }, 600);
  }, []);

  const startProductionSession = useCallback(async () => {
    try {
      setSessionStatus('recording');
      const startRes = await fetch('/api/ambient-sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth:token')}`,
        },
      });

      if (!startRes.ok) {
        throw new Error('Failed to start ambient session');
      }

      const startData = await startRes.json();
      setSessionId(startData.sessionId);

      // Poll for transcript updates while recording
      // In a real implementation this would use a WebSocket or SSE stream
      // For now we show a placeholder and wait for user to trigger processing
      setTranscript('[Live transcription active — speak naturally...]');
    } catch (err) {
      setError(err.message || 'Failed to start session');
      setSessionStatus('idle');
    }
  }, []);

  const processProductionSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setSessionStatus('processing');
      const processRes = await fetch('/api/ambient-sessions/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth:token')}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!processRes.ok) {
        throw new Error('Failed to process ambient session');
      }

      const processData = await processRes.json();
      setAiContent(processData.content);
      setEditableNote(processData.content.referralNoteDraft);
      setSessionStatus('complete');
    } catch (err) {
      setError(err.message || 'Failed to process session');
      setSessionStatus('recording');
    }
  }, [sessionId]);

  const handleStartRecording = () => {
    setError(null);
    if (isSyntheticMode) {
      runSyntheticSession();
    } else {
      startProductionSession();
    }
  };

  const handleStopRecording = () => {
    if (isSyntheticMode) {
      // Force end of synthetic recording
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
      setSessionStatus('processing');
      setTimeout(() => {
        setAiContent(MOCK_AI_CONTENT);
        setEditableNote(MOCK_AI_CONTENT.referralNoteDraft);
        setSessionStatus('complete');
      }, 1500);
    } else {
      processProductionSession();
    }
  };

  const handleUseContent = () => {
    if (!aiContent) return;
    const finalContent = {
      clinicalSummary: aiContent.clinicalSummary,
      suggestedSpecialty: aiContent.suggestedSpecialty,
      urgencyClassification: aiContent.urgencyClassification,
      icd10Codes: aiContent.icd10Codes,
      referralNoteDraft: editableNote,
      transcript,
    };
    if (onContentGenerated) {
      onContentGenerated(finalContent);
    }
    setOpen(false);
    resetSession();
  };

  const activeStep = STEP_INDEX[sessionStatus] ?? 0;
  const isRecording = sessionStatus === 'recording';
  const isProcessing = sessionStatus === 'processing';
  const isComplete = sessionStatus === 'complete';

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="contained"
        color="secondary"
        startIcon={<Psychology />}
        onClick={handleOpen}
        sx={{
          background: 'linear-gradient(135deg, #6B2FD9 0%, #9C5CF7 100%)',
          color: '#fff',
          fontWeight: 600,
          borderRadius: 2,
          px: 2.5,
          py: 1,
          '&:hover': {
            background: 'linear-gradient(135deg, #5522BB 0%, #7B3DD4 100%)',
          },
        }}
      >
        Start Ambient Session
      </Button>

      {/* Main dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, minHeight: 500 } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            background: 'linear-gradient(135deg, #6B2FD9 0%, #9C5CF7 100%)',
            color: '#fff',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700}>
              Ambient AI Documentation
            </Typography>
            {isSyntheticMode && (
              <Chip
                label="Demo Mode"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
              />
            )}
          </Box>
          <IconButton onClick={handleClose} sx={{ color: '#fff' }} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 1 }}>
          {/* Session progress stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {SESSION_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Idle state */}
          {sessionStatus === 'idle' && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 5,
                gap: 2,
              }}
            >
              <RecordVoiceOver sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight={500}>
                Ready to capture your clinical encounter
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" maxWidth={420}>
                Click the microphone button below to begin. Speak naturally — the AI will
                transcribe, extract key clinical information, and draft your referral note.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<Mic />}
                onClick={handleStartRecording}
                sx={{
                  mt: 1,
                  borderRadius: 8,
                  px: 4,
                  background: 'linear-gradient(135deg, #6B2FD9 0%, #9C5CF7 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5522BB 0%, #7B3DD4 100%)',
                  },
                }}
              >
                Start Recording
              </Button>
            </Box>
          )}

          {/* Recording / Processing state */}
          {(isRecording || isProcessing) && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Status header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isRecording ? (
                  <>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: 'error.main',
                        animation: 'pulse 1.2s infinite',
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 1 },
                          '50%': { opacity: 0.3 },
                        },
                      }}
                    />
                    <Typography variant="subtitle1" fontWeight={600} color="error.main">
                      Recording in progress...
                    </Typography>
                  </>
                ) : (
                  <>
                    <CircularProgress size={16} thickness={5} />
                    <Typography variant="subtitle1" fontWeight={600} color="secondary.main">
                      AI processing transcript...
                    </Typography>
                  </>
                )}
              </Box>

              {isProcessing && <LinearProgress color="secondary" sx={{ borderRadius: 4 }} />}

              {/* Transcript area */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 180,
                  maxHeight: 260,
                  overflowY: 'auto',
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={0.5}
                  fontWeight={600}
                >
                  TRANSCRIPT
                </Typography>
                {transcript ? (
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: 'text.primary' }}
                  >
                    {transcript}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled" fontStyle="italic">
                    Waiting for speech...
                  </Typography>
                )}
                <div ref={transcriptEndRef} />
              </Paper>

              {/* Stop / process button */}
              {isRecording && (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<MicOff />}
                    onClick={handleStopRecording}
                    sx={{ borderRadius: 8, px: 3 }}
                  >
                    Stop &amp; Process
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Complete state — AI-generated content */}
          {isComplete && aiContent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Alert
                icon={<CheckCircle />}
                severity="success"
                sx={{ borderRadius: 2, fontWeight: 500 }}
              >
                AI documentation complete. Review and edit below before applying.
              </Alert>

              {/* Clinical Summary */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                  CLINICAL SUMMARY (SOAP)
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                  {aiContent.clinicalSummary}
                </Typography>
              </Paper>

              {/* Specialty + Urgency */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: '1 1 180px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                    SUGGESTED SPECIALTY
                  </Typography>
                  <Chip
                    icon={<Psychology sx={{ fontSize: 16 }} />}
                    label={aiContent.suggestedSpecialty}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: '1 1 180px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                    URGENCY CLASSIFICATION
                  </Typography>
                  <Chip
                    label={aiContent.urgencyClassification}
                    color={URGENCY_COLORS[aiContent.urgencyClassification] || 'default'}
                    sx={{ fontWeight: 600 }}
                  />
                </Paper>
              </Box>

              {/* ICD-10 Codes */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  SUGGESTED ICD-10 CODES
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {aiContent.icd10Codes.map((item) => (
                    <Chip
                      key={item.code}
                      label={`${item.code} — ${item.label}`}
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={{ fontWeight: 500 }}
                    />
                  ))}
                </Box>
              </Paper>

              {/* Referral Note Draft (editable) */}
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                  REFERRAL NOTE DRAFT (editable)
                </Typography>
                <TextField
                  multiline
                  minRows={6}
                  maxRows={12}
                  fullWidth
                  value={editableNote}
                  onChange={(e) => setEditableNote(e.target.value)}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 2, fontFamily: 'inherit', fontSize: '0.875rem' },
                  }}
                />
              </Box>

              {/* Transcript toggle (collapsible preview) */}
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                  SOURCE TRANSCRIPT
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ whiteSpace: 'pre-line', lineHeight: 1.7, color: 'text.secondary', fontFamily: 'monospace' }}
                >
                  {transcript}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={handleClose} startIcon={<Close />}>
            Discard
          </Button>

          {isComplete && aiContent && (
            <Button
              variant="contained"
              onClick={handleUseContent}
              startIcon={<AutoAwesome />}
              sx={{
                background: 'linear-gradient(135deg, #6B2FD9 0%, #9C5CF7 100%)',
                color: '#fff',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5522BB 0%, #7B3DD4 100%)',
                },
              }}
            >
              Use This Content
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AmbientIntelligenceWidget;
