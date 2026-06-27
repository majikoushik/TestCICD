import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';
import { useAuth } from '../../contexts';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const { currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please use the link from your email.');
      return;
    }

    onboardingService.verifyEmail(token)
      .then(async () => {
        setStatus('success');

        if (currentUser) {
          // User is logged in — refresh context so onboardingStatus is current
          try { await refreshUser(); } catch (_) {}
          setTimeout(() => startTransition(() => navigate('/onboarding')), 2500);
        } else {
          // User is not logged in — send them to login with a verified flag
          setTimeout(() => startTransition(() => navigate('/login?verified=1')), 2500);
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Email Verified!</Typography>
            <Typography color="text.secondary" mb={3}>
              {currentUser
                ? 'Your email has been verified. Redirecting you to continue your setup…'
                : 'Your email has been verified. Redirecting you to sign in…'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => startTransition(() =>
                navigate(currentUser ? '/onboarding' : '/login?verified=1')
              )}
            >
              {currentUser ? 'Continue Setup' : 'Sign In'}
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Verification Failed</Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>{message}</Alert>
            <Button component={RouterLink} to="/login" variant="contained">
              Go to Sign In
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
