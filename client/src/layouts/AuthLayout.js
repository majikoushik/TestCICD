import React from 'react';
import { Outlet, Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth, useThemeContext } from '../contexts';
import { LoadingSpinner, ThemeToggle } from '../components/common';
import { 
  Box, 
  Container, 
  Paper, 
  Grid, 
  Typography,
  useMediaQuery,
  IconButton,
  useTheme as useMuiTheme
} from '@mui/material';

export default function AuthLayout() {
  const { currentUser, loading } = useAuth();
  const { mode } = useThemeContext();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // If loading, show loading spinner
  if (loading) {
    return <LoadingSpinner fullPage message="Loading authentication..." />;
  }
  
  // If user is already authenticated, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: theme.palette.background.default,
        position: 'relative'
      }}
    >
      {/* Theme toggle in top right corner */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle variant="icon" />
      </Box>
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Grid container spacing={4} sx={{ height: '100%' }}>
          {/* Left side - Branding and info */}
          <Grid item xs={12} md={6} 
            sx={{ 
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              opacity: 0.95
            }}
          >
            <Box sx={{ p: 4 }}>
              <Box
                component={RouterLink}
                to="/"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  mb: 2
                }}
              >
                <Box
                  component="img"
                  src="/logo.svg"
                  alt="ClinicTrust AI Logo"
                  sx={{
                    height: 50,
                    mr: 2
                  }}
                />
                <Typography variant="h2" component="span" color="primary" fontWeight="bold">
                  ClinicTrust AI
                </Typography>
              </Box>
              <Typography variant="h5" gutterBottom color="text.secondary">
                Secure Healthcare Collaboration Platform
              </Typography>
              <Typography variant="body1" paragraph sx={{ maxWidth: '90%', mt: 2 }}>
                Connect with other healthcare providers, securely share patient data with consent, 
                and leverage AI-powered analytics to improve patient outcomes.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={2} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ mb: 1 }}>
                        <img 
                          src="/blockchain-icon.svg" 
                          alt="Blockchain" 
                          style={{ width: 48, height: 48 }}
                        />
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        Blockchain Security
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Smart contracts ensure secure and transparent data sharing
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={2} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ mb: 1 }}>
                        <img 
                          src="/ai-icon.svg" 
                          alt="AI Analytics" 
                          style={{ width: 48, height: 48 }}
                        />
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        AI Analytics
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Gain actionable insights from your healthcare data
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={2} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ mb: 1 }}>
                        <img 
                          src="/token-icon.svg" 
                          alt="Token Economy" 
                          style={{ width: 48, height: 48 }}
                        />
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        Token Economy
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Earn tokens for contributing to the healthcare network
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper 
                      elevation={2} 
                      sx={{ 
                        p: 2, 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        height: '100%',
                        borderRadius: 2
                      }}
                    >
                      <Box sx={{ mb: 1 }}>
                        <img 
                          src="/referral-icon.svg" 
                          alt="Smart Referrals" 
                          style={{ width: 48, height: 48 }}
                        />
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        Smart Referrals
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Streamline patient referrals and claims processing
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Grid>
          
          {/* Right side - Auth forms */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  width: '100%',
                  maxWidth: 480,
                  borderRadius: 2
                }}
              >
                {/* Auth form content will be rendered here */}
                <Outlet />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
