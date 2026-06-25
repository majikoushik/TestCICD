import React, { useTransition } from 'react';
import { Box, Button, Container, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Error as ErrorIcon } from '@mui/icons-material';

/**
 * NotFound Component
 * 
 * Displays a 404 error page when a route is not found
 */
export default function NotFound() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();
  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 5, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
        
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        
        <Typography variant="h4" component="h2" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 500, mb: 4 }}>
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </Typography>
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            disabled={isPending} 
            onClick={() => {
              startTransition(() => {
                navigate('/app/dashboard');
              });
            }}
          >
            {isPending ? 'Navigating...' : 'Go to Dashboard'}
          </Button>
          
          <Button 
            variant="outlined"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                navigate('/app/analytics');
              });
            }}
          >
            {isPending ? 'Navigating...' : 'Go to Analytics'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
