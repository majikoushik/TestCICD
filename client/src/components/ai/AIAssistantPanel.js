import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Fade,
  Divider,
  CircularProgress,
  Fab,
  Drawer,
  useTheme,
  useMediaQuery,
  Collapse,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  SmartToy as RobotIcon,
  Send as SendIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Person as PersonIcon,
  FiberManualRecord as BulletIcon,
  VerifiedUser as HighConfidenceIcon,
  RemoveCircleOutline as MediumConfidenceIcon,
  Warning as LowConfidenceIcon,
  CheckCircle as CopiedIcon,
} from '@mui/icons-material';
import { post } from '../../utils/apiUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  'Should I refer this patient to cardiology?',
  "What's the typical prior auth criteria for MRI?",
  'Explain this risk score',
  'Draft a referral justification',
];

const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === 'true' || process.env.NODE_ENV === 'development';

// ---------------------------------------------------------------------------
// Mock AI response engine
// ---------------------------------------------------------------------------

const MOCK_RESPONSES = {
  cardiology: {
    answer:
      'Based on general clinical guidelines, cardiology referral is typically indicated when a patient presents with unexplained chest pain, new onset heart failure, complex arrhythmias, significant valvular disease, or when primary care management has been optimized without adequate response. If your patient has an elevated risk score (>=3 on HEART scale) or an abnormal ECG, expedited referral is warranted. Consider whether the presentation is acute — in that case, direct ED evaluation may be more appropriate than an outpatient referral.',
    confidence: 'high',
    suggestedActions: [
      'Review current ECG and compare to baseline if available',
      'Order BNP or NT-proBNP if heart failure is suspected',
      'Document HEART score or Wells criteria in the referral note',
      'Confirm insurance coverage / prior auth requirements before scheduling',
    ],
  },
  mri: {
    answer:
      'Prior authorization criteria for MRI vary by payer, but the most common clinical requirements include: (1) documented failure of conservative therapy for at least 4–6 weeks (e.g., physical therapy, NSAIDs for musculoskeletal complaints), (2) presence of red-flag symptoms such as unexplained weight loss, night pain, neurological deficits, or history of malignancy, (3) inconclusive or abnormal findings on prior imaging (X-ray, CT), and (4) clinical documentation linking the MRI to a specific diagnosis code. Ensure your order includes the relevant ICD-10 code and a brief clinical narrative. Many payers also require that the ordering physician be the treating physician.',
    confidence: 'high',
    suggestedActions: [
      'Attach documentation of prior conservative therapy with dates',
      'Include ICD-10 diagnosis code on order',
      'Add brief clinical narrative supporting medical necessity',
      'Call payer utilization management if urgent — expedited review is often available',
    ],
  },
  risk: {
    answer:
      'Risk scores in clinical practice quantify a patient\'s probability of a specific adverse outcome (e.g., HEART score for MACE, CHA₂DS₂-VASc for stroke in AF, CHADS for heart failure). A higher score indicates higher risk and may trigger escalated care pathways, specialist referral, or earlier intervention. The score presented combines multiple validated risk factors — each component contributes independently. You should interpret the composite score in the clinical context of this individual patient rather than as a sole determinant of treatment.',
    confidence: 'medium',
    suggestedActions: [
      'Review individual score components to identify modifiable risk factors',
      'Compare score trend over time if prior assessments are available',
      'Document score in clinical notes to support referral or treatment decisions',
      'Discuss score implications with the patient using plain language',
    ],
  },
  referral: {
    answer:
      'Here is a template for a referral justification letter you can adapt:\n\n"Patient [NAME], [AGE]yo [SEX], presents with [CHIEF COMPLAINT] for [DURATION]. Relevant history includes [KEY HISTORY]. Current medications: [MED LIST]. Diagnostic workup to date: [LABS/IMAGING]. Despite [CONSERVATIVE TREATMENT], the patient continues to experience [SYMPTOMS]. I am referring this patient to [SPECIALTY] for [SPECIFIC EVALUATION/PROCEDURE] to [CLINICAL GOAL]. Urgency: [routine/urgent/emergent].\n\nThank you for your evaluation."',
    confidence: 'high',
    suggestedActions: [
      'Replace all bracketed placeholders with patient-specific information',
      'Attach relevant labs, imaging reports, and prior notes',
      'Confirm referral destination accepts this patient\'s insurance',
      'Set a follow-up reminder to confirm appointment was made',
    ],
  },
  default: {
    answer:
      'I can help with clinical decision support questions, prior authorization guidance, risk score interpretation, and referral documentation. Please provide more detail about the clinical situation so I can give you more targeted assistance. For urgent clinical situations, please consult with a senior colleague or follow your institution\'s escalation protocols.',
    confidence: 'medium',
    suggestedActions: [
      'Provide more specific clinical context for a tailored response',
      'Use the suggested quick questions below for common queries',
      'Consult clinical guidelines or your institution\'s pathways for definitive guidance',
    ],
  },
};

function getMockResponse(question) {
  const q = question.toLowerCase();
  if (q.includes('cardiology') || q.includes('refer') || q.includes('heart')) {
    return MOCK_RESPONSES.cardiology;
  }
  if (q.includes('mri') || q.includes('prior auth') || q.includes('authorization')) {
    return MOCK_RESPONSES.mri;
  }
  if (q.includes('risk score') || q.includes('risk') || q.includes('explain')) {
    return MOCK_RESPONSES.risk;
  }
  if (q.includes('referral justification') || q.includes('draft') || q.includes('justification')) {
    return MOCK_RESPONSES.referral;
  }
  return MOCK_RESPONSES.default;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ confidence }) {
  const configs = {
    high: { color: 'success', icon: <HighConfidenceIcon sx={{ fontSize: 14 }} />, label: 'High confidence' },
    medium: { color: 'warning', icon: <MediumConfidenceIcon sx={{ fontSize: 14 }} />, label: 'Medium confidence' },
    low: { color: 'error', icon: <LowConfidenceIcon sx={{ fontSize: 14 }} />, label: 'Low confidence' },
  };
  const cfg = configs[confidence] || configs.medium;
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      color={cfg.color}
      size="small"
      variant="outlined"
      sx={{ fontSize: '0.68rem', height: 22 }}
    />
  );
}

function AIMessageBubble({ message }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null

  const handleCopy = () => {
    navigator.clipboard.writeText(message.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (value) => {
    setFeedback(value);
    // In production this would POST feedback to the API
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
      {/* Robot avatar */}
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: theme.palette.primary.main,
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        <RobotIcon sx={{ fontSize: 18 }} />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Bubble */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            bgcolor:
              theme.palette.mode === 'dark'
                ? theme.palette.grey[800]
                : theme.palette.grey[100],
            borderRadius: '4px 12px 12px 12px',
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {message.answer}
          </Typography>

          {/* Suggested actions */}
          {message.suggestedActions && message.suggestedActions.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Suggested actions
              </Typography>
              <List dense disablePadding>
                {message.suggestedActions.map((action, i) => (
                  <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <BulletIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={action}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Disclaimer */}
          <Alert
            severity="info"
            icon={false}
            sx={{
              mt: 1.5,
              py: 0.25,
              px: 1,
              fontSize: '0.68rem',
              '& .MuiAlert-message': { py: 0 },
            }}
          >
            AI assistance only — clinical judgment required
          </Alert>
        </Paper>

        {/* Meta row: confidence + actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mt: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {message.confidence && <ConfidenceBadge confidence={message.confidence} />}

          <Box sx={{ flex: 1 }} />

          {/* Copy button */}
          <Tooltip title={copied ? 'Copied!' : 'Copy response'}>
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.5 }}>
              {copied ? (
                <CopiedIcon sx={{ fontSize: 16, color: 'success.main' }} />
              ) : (
                <CopyIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Feedback */}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            Helpful?
          </Typography>
          <Tooltip title="Yes, helpful">
            <IconButton
              size="small"
              onClick={() => handleFeedback('up')}
              sx={{ p: 0.5, color: feedback === 'up' ? 'success.main' : 'text.secondary' }}
            >
              <ThumbUpIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Not helpful">
            <IconButton
              size="small"
              onClick={() => handleFeedback('down')}
              sx={{ p: 0.5, color: feedback === 'down' ? 'error.main' : 'text.secondary' }}
            >
              <ThumbDownIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}

function UserMessageBubble({ message }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main, flexShrink: 0, mt: 0.5 }}>
        <PersonIcon sx={{ fontSize: 18 }} />
      </Avatar>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          borderRadius: '12px 4px 12px 12px',
          maxWidth: '80%',
        }}
      >
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          {message.text}
        </Typography>
      </Paper>
    </Box>
  );
}

function TypingIndicator() {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
      <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main, flexShrink: 0 }}>
        <RobotIcon sx={{ fontSize: 18 }} />
      </Avatar>
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 1,
          bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
          borderRadius: '4px 12px 12px 12px',
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          gap: 0.5,
          alignItems: 'center',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'aiTypingBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes aiTypingBounce': {
                '0%, 80%, 100%': { transform: 'scale(0.8)', opacity: 0.5 },
                '40%': { transform: 'scale(1.2)', opacity: 1 },
              },
            }}
          />
        ))}
      </Paper>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main panel content (shared between Drawer + inline)
// ---------------------------------------------------------------------------

function PanelContent({ onClose, patientContext, referralContext }) {
  const theme = useTheme();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (questionText) => {
      const text = (questionText || inputValue).trim();
      if (!text || isLoading) return;

      setInputValue('');
      setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text }]);
      setIsLoading(true);

      try {
        let aiResponse;

        if (DEMO_MODE) {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 1500));
          aiResponse = getMockResponse(text);
        } else {
          const payload = {
            question: text,
            context: {
              ...(patientContext ? { patient: patientContext } : {}),
              ...(referralContext ? { referral: referralContext } : {}),
            },
          };
          const data = await post('/ai/clinical-insight', payload);
          aiResponse = {
            answer: data.answer || data.response || 'No response received.',
            confidence: data.confidence || 'medium',
            suggestedActions: data.suggestedActions || data.suggested_actions || [],
          };
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'ai',
            answer: aiResponse.answer,
            confidence: aiResponse.confidence,
            suggestedActions: aiResponse.suggestedActions,
          },
        ]);
      } catch (err) {
        console.error('AI assistant error:', err);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'ai',
            answer:
              'I was unable to process your request at this time. Please try again, or consult clinical resources directly.',
            confidence: 'low',
            suggestedActions: ['Retry your question', 'Consult UpToDate or clinical guidelines directly'],
          },
        ]);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [inputValue, isLoading, patientContext, referralContext]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          flexShrink: 0,
        }}
      >
        <RobotIcon sx={{ mr: 1, fontSize: 22 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
            Clinical AI Assistant
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {DEMO_MODE ? 'Demo mode — synthetic responses' : 'Powered by ClinicTrust AI'}
          </Typography>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'inherit', ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Context chips */}
      {(patientContext || referralContext) && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            flexShrink: 0,
            bgcolor:
              theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
          }}
        >
          {patientContext?.name && (
            <Chip
              label={`Patient: ${patientContext.name}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          {referralContext?.specialty && (
            <Chip
              label={`Referral: ${referralContext.specialty}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
        </Box>
      )}

      {/* Messages area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: 1.5,
              py: 3,
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: theme.palette.primary.light,
                color: theme.palette.primary.main,
              }}
            >
              <RobotIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
              Ask a clinical question
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260 }}>
              Get AI-powered guidance on referrals, prior auth, risk scores, and documentation.
            </Typography>
          </Box>
        )}

        {/* Render messages */}
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserMessageBubble key={msg.id} message={msg} />
          ) : (
            <AIMessageBubble key={msg.id} message={msg} />
          )
        )}

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested questions */}
      <Collapse in={messages.length === 0 && !isLoading}>
        <Divider />
        <Box sx={{ px: 2, pt: 1.5, pb: 1, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Quick questions
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Chip
                key={q}
                label={q}
                size="small"
                variant="outlined"
                clickable
                onClick={() => sendMessage(q)}
                sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </Collapse>

      {/* Input area */}
      <Divider />
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Ask a clinical question…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              fontSize: '0.85rem',
            },
          }}
        />
        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={() => sendMessage()}
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                width: 40,
                height: 40,
                flexShrink: 0,
              }}
            >
              {isLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SendIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

/**
 * AIAssistantPanel
 *
 * Conversational AI assistant panel for clinical providers.
 *
 * @param {boolean}  open            - Whether the panel is open
 * @param {function} onClose         - Callback to close the panel
 * @param {object}   patientContext  - Optional current patient data
 * @param {object}   referralContext - Optional current referral draft data
 */
export default function AIAssistantPanel({ open, onClose, patientContext, referralContext }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Floating button shown when collapsed
  if (!open) {
    return (
      <Fade in>
        <Fab
          color="primary"
          aria-label="Open AI assistant"
          onClick={onClose} // parent should toggle open state — onClose used as toggle
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: theme.zIndex.speedDial,
            boxShadow: theme.shadows[8],
          }}
        >
          <Tooltip title="Clinical AI Assistant" placement="left">
            <RobotIcon />
          </Tooltip>
        </Fab>
      </Fade>
    );
  }

  // On mobile use a full-height bottom drawer; on desktop use a side drawer
  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            height: '85vh',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
          },
        }}
      >
        <PanelContent
          onClose={onClose}
          patientContext={patientContext}
          referralContext={referralContext}
        />
      </Drawer>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      variant="persistent"
      PaperProps={{
        sx: {
          width: 400,
          maxWidth: '95vw',
          borderLeft: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <PanelContent
        onClose={onClose}
        patientContext={patientContext}
        referralContext={referralContext}
      />
    </Drawer>
  );
}
