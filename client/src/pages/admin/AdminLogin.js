import React, { useState, useEffect } from 'react';
import { ModernLoadingIndicator } from '../../components/common';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { adminLogin } from '../../services/adminAuthService';
import { isAuthenticated, hasRole } from '../../utils/authUtils';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated() && hasRole('admin')) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call admin login service
      const response = await adminLogin({
        email,
        password
      });

      if (response.success) {
        // Redirect to admin dashboard
        navigate('/admin');
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          py: 4
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              mb: 3
            }}
          >            
            <Box
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                borderRadius: '50%',
                p: 1,
                mb: 2
              }}
            >
              <AdminIcon fontSize="large" />
            </Box>
            <Typography component="h1" variant="h4" fontWeight="bold">
              Admin Login
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mt: 1 }}>
              ClinicTrust AI Platform Administration
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Admin Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="error"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <ModernLoadingIndicator size={5} color="inherit"/> : 'Sign In'}
            </Button>
          </Box>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button 
              color="primary" 
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Return to User Login
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          This area is restricted to authorized administrators only.
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminLogin;
