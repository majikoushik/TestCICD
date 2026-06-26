import React, { useEffect, useState, useTransition } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button, Paper } from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import onboardingService from '../../services/onboardingService';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
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
      .then(() => {
        setStatus('success');
        // Update stored user if present
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          stored.emailVerified = true;
          stored.onboardingStatus = 'pending_docs';
          localStorage.setItem('user', JSON.stringify(stored));
        } catch (_) {}
        setTimeout(() => startTransition(() => navigate('/onboarding')), 2500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [token]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 3 }}>
      <Paper elevation={3} sx={{ p: 5, maxWidth: 440, width: '100%', textAlign: 'center', borderRadius: 3 }}>
        {status === 'loading' && (
          <>
            <CircularProgress size={56} sx={{ mb: 3 }} />
            <Typography variant="h6">Verifying your email&hellip;</Typography>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} mb={1}>Email Verified!</Typography>
            <Typography color="text.secondary" mb={3}>
              Your email has been verified. Redirecting you to continue your onboarding&hellip;
            </Typography>
            <Button variant="contained" onClick={() => startTransition(() => navigate('/onboarding'))}>
              Continue Onboarding
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
