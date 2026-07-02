import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button, Paper, TextField } from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts';
import { ModernLoadingIndicator } from '../../components/common';

// Prevents React 18 StrictMode from firing the validation call twice, same
// guard used by VerifyEmail.js — module-level state survives StrictMode's
// unmount/remount but resets on a real page load.
const validationInFlight = new Set();

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyResetToken, resetPassword } = useAuth();
  const token = searchParams.get('token');

  // checking (validating token) | form (valid, show password fields) | success | invalid
  const [status, setStatus] = useState('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigateTimerRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setErrorMessage('No reset token found in the link. Please use the link from your email.');
      return;
    }

    if (validationInFlight.has(token)) return;
    validationInFlight.add(token);

    verifyResetToken(token)
      .then(() => {
        validationInFlight.delete(token);
        setStatus('form');
      })
      .catch(err => {
        validationInFlight.delete(token);
        setStatus('invalid');
        setErrorMessage(err.message || 'This reset link is invalid or has expired.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => () => clearTimeout(navigateTimerRef.current), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      setStatus('success');
      navigateTimerRef.current = setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      // The token could expire in the gap between validation and submission —
      // fall back to the same invalid-link screen rather than a generic form error.
      setStatus('invalid');
      setErrorMessage(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 3 }}>
      <Paper elevation={3} sx={{ p: 5, maxWidth: 440, width: '100%', textAlign: 'center', borderRadius: 3 }}>

        {status === 'checking' && (
          <>
            <CircularProgress size={56} sx={{ mb: 3 }} />
            <Typography variant="h6">Checking your reset link&hellip;</Typography>
            <Typography variant="body2" color="text.secondary" mt={1}>This will only take a moment.</Typography>
          </>
        )}

        {status === 'invalid' && (
          <>
            <Box sx={{ bgcolor: 'error.50', borderRadius: '50%', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <ErrorIcon sx={{ fontSize: 52, color: 'error.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} mb={1}>Link Not Valid</Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>{errorMessage}</Alert>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Reset links expire after 1 hour and can only be used once.
              If your link expired, request a new one from the sign-in page.
            </Typography>
            <Button component={RouterLink} to="/forgot-password" variant="contained">
              Request a New Link
            </Button>
          </>
        )}

        {status === 'form' && (
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ textAlign: 'left' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>Set a New Password</Typography>
              <Typography variant="body2" color="text.secondary">
                Choose a new password for your account
              </Typography>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
                {errorMessage}
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="New Password"
              name="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 1 }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="confirmPassword"
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Button type="submit" fullWidth variant="contained" size="large" disabled={isSubmitting}>
              {isSubmitting ? <ModernLoadingIndicator variant="button" size={24} color="inherit" /> : 'Reset Password'}
            </Button>
          </Box>
        )}

        {status === 'success' && (
          <>
            <Box sx={{ bgcolor: 'success.50', borderRadius: '50%', width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <CheckIcon sx={{ fontSize: 52, color: 'success.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} mb={1}>Password Reset!</Typography>
            <Typography color="text.secondary" mb={3}>Redirecting you to sign in&hellip;</Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<LockResetIcon />}
              onClick={() => {
                clearTimeout(navigateTimerRef.current);
                navigate('/login');
              }}
            >
              Sign In Now
            </Button>
          </>
        )}

      </Paper>
    </Box>
  );
}
