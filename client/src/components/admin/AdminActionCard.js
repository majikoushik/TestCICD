import React from 'react';
import { Card, CardContent, Typography, Box, IconButton } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';

const AdminActionCard = ({ title, description, icon, onClick, color }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box 
          display="flex" 
          flexDirection="column" 
          height="100%"
        >
          <Box 
            sx={{ 
              backgroundColor: color || '#f0f4f8', 
              borderRadius: '50%', 
              width: 50, 
              height: 50, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mb: 2,
              color: '#fff'
            }}
          >
            {icon}
          </Box>
          
          <Typography variant="h6" component="div" gutterBottom>
            {title}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2, flexGrow: 1 }}>
            {description}
          </Typography>
          
          <Box display="flex" justifyContent="flex-end">
            <IconButton size="small" sx={{ color: color || 'primary.main' }}>
              <ArrowForward fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminActionCard;
