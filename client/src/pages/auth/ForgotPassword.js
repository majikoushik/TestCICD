import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { forgotPassword, error, clearError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (error) {
      console.error('Password reset request error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your email to receive a password reset link
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}
      
      {submitted ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          If an account exists with this email, you will receive password reset instructions.
        </Alert>
      ) : (
        <>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ mb: 3 }}
          >
            {isSubmitting ? (
              <ModernLoadingIndicator variant="button" size={24} color="inherit" />
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </>
      )}
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          Remember your password?{' '}
          <Link component={RouterLink} to="/login" variant="body2">
            Back to Sign In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
