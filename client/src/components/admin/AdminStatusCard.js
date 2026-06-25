import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { CheckCircle, Warning, Error } from '@mui/icons-material';

const AdminStatusCard = ({ title, status, details }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'online':
        return 'success';
      case 'warning':
      case 'degraded':
        return 'warning';
      case 'error':
      case 'offline':
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'online':
        return <CheckCircle fontSize="small" />;
      case 'warning':
      case 'degraded':
        return <Warning fontSize="small" />;
      case 'error':
      case 'offline':
      case 'critical':
        return <Error fontSize="small" />;
      default:
        return null;
    }
  };
  
  const statusColor = getStatusColor(status);
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          
          <Chip
            icon={getStatusIcon(status)}
            label={status}
            color={statusColor}
            size="small"
          />
        </Box>
        
        {details && details.length > 0 && (
          <Box>
            {details.map((detail, index) => (
              <Box 
                key={index} 
                display="flex" 
                justifyContent="space-between" 
                alignItems="center"
                mt={1}
              >
                <Typography variant="body2" color="textSecondary">
                  {detail.label}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {detail.value}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStatusCard;
