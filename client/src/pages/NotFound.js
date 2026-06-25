import React, { useTransition } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid
} from '@mui/material';
import {
  SentimentDissatisfied as SentimentDissatisfiedIcon,
  Home as HomeIcon
} from '@mui/icons-material';

export default function NotFound() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Paper
        sx={{
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          borderRadius: 2,
          boxShadow: 3
        }}
      >
        <SentimentDissatisfiedIcon sx={{ fontSize: 100, color: 'primary.main', mb: 3 }} />
        
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500 }}>
          The page you are looking for doesn't exist or has been moved.
          Please check the URL or navigate back to the dashboard.
        </Typography>
        
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 3 }}>
          <Grid item>
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  navigate('/app/dashboard');
                });
              }}
            >
              {isPending ? 'Navigating...' : 'Go to Dashboard'}
            </Button>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 6, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            If you believe this is an error, please contact support.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img 
            src="/logo.svg" 
            alt="ClinicTrust Logo" 
            style={{ height: 24 }} 
          />
          <Typography variant="body2" color="text.secondary">
            ClinicTrust AI Platform
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
