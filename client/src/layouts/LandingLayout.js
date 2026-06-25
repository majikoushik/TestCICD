import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingFooter from '../components/landing/LandingFooter';

/**
 * Landing page layout component
 * 
 * Provides the layout structure for the landing page and related public pages
 */
export default function LandingLayout() {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      <LandingNavbar />
      
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
      
      <LandingFooter />
    </Box>
  );
}
