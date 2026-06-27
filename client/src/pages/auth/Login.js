import React, { useTransition } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, useNotification } from '../../contexts';
import { useForm } from '../../hooks';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { ModernLoadingIndicator } from '../../components/common';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function Login() {
  const { login, error, clearError } = useAuth();
  const { notifySuccess } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailVerified = searchParams.get('verified') === '1';
  const [, startTransition] = useTransition();
  
  // Form validation rules
  const validationRules = {
    email: {
      required: true,
      email: true,
      requiredMessage: 'Email is required',
      emailMessage: 'Please enter a valid email address'
    },
    password: {
      required: true,
      minLength: 6,
      requiredMessage: 'Password is required',
      minLengthMessage: 'Password must be at least 6 characters'
    }
  };
  
  // Use form hook
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue
  } = useForm(
    { email: '', password: '', showPassword: false },
    validationRules,
    onSubmit
  );

  // Form submission handler
  async function onSubmit(formData) {
    try {
      await login(formData.email, formData.password);
      notifySuccess('Login successful');
      startTransition(() => navigate('/app/dashboard'));
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setFieldValue('showPassword', !values.showPassword);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to access your ClinicTrust AI account
        </Typography>
      </Box>
      
      {emailVerified && (
        <Alert severity="success" sx={{ mb: 3 }} icon={false}>
          ✅ Email verified! Sign in to continue your setup.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.email && Boolean(errors.email)}
        helperText={touched.email && errors.email}
        sx={{ mb: 2 }}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type={values.showPassword ? 'text' : 'password'}
        id="password"
        autoComplete="current-password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.password && Boolean(errors.password)}
        helperText={touched.password && errors.password}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={handleTogglePasswordVisibility}
                edge="end"
              >
                {values.showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Link component={RouterLink} to="/forgot-password" variant="body2">
          Forgot password?
        </Link>
      </Box>
      
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
          'Sign In'
        )}
      </Button>
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register" variant="body2">
            Sign up
          </Link>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Are you an administrator?{' '}
          <Link component={RouterLink} to="/admin/login" variant="body2">
            Admin Login
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
