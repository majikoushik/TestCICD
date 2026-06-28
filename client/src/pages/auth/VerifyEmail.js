import React, { useEffect, useState, useTransition, useRef } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon, MarkEmailRead as EmailReadIcon } from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';
import { useAuth } from '../../contexts';

// Prevents React 18 StrictMode from firing the verification API call twice.
// Module-level state survives StrictMode unmount/remount but resets on real page load.
const verificationInFlight = new Set();

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const navigateTimerRef = useRef(null);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please use the link from your email.');
      return;
    }

    // Guard: if this token is already being verified in this page session, skip the duplicate call.
    if (verificationInFlight.has(token)) return;
    verificationInFlight.add(token);

    onboardingService.verifyEmail(token)
      .then(async () => {
        verificationInFlight.delete(token);
        setStatus('success');

        if (currentUser) {
          try { await refreshUser(); } catch (_) {}
          navigateTimerRef.current = setTimeout(
            () => startTransition(() => navigate('/onboarding')),
            2000
          );
        } else {
          navigateTimerRef.current = setTimeout(
            () => startTransition(() => navigate('/login?verified=1')),
            2000
          );
        }
      })
      .catch(err => {
        verificationInFlight.delete(token);
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired or already been used.');
      });

    return () => {
      clearTimeout(navigateTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const destination = currentUser ? '/onboarding' : '/login?verified=1';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 3 }}>
      <Paper elevation={3} sx={{ p: 5, maxWidth: 440, width: '100%', textAlign: 'center', borderRadius: 3 }}>

        {status === 'loading' && (
          <>
            <CircularProgress size={56} sx={{ mb: 3 }} />
            <Typography variant="h6">Verifying your email&hellip;</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>This will only take a moment.</Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Box sx={{ bgcolor: 'success.50', borderRadius: '50%', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CheckIcon sx={{ fontSize: 52, color: 'success.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} mb={1}>Email Verified!</Typography>
            <Typography color="text.secondary" mb={3}>
              {currentUser
                ? 'Your email is confirmed. Continuing to your setup…'
                : 'Your email is confirmed. Redirecting you to sign in…'}
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<EmailReadIcon />}
              onClick={() => {
                clearTimeout(navigateTimerRef.current);
                startTransition(() => navigate(destination));
              }}
            >
              {currentUser ? 'Continue Setup' : 'Sign In Now'}
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Box sx={{ bgcolor: 'error.50', borderRadius: '50%', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <ErrorIcon sx={{ fontSize: 52, color: 'error.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} mb={1}>Link Not Valid</Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>{message}</Alert>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Verification links expire after 24 hours and can only be used once.
              If your link expired, sign in and request a new one.
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained">
              Go to Sign In
            </Button>
          </>
        )}

      </Paper>
    </Box>
  );
}
